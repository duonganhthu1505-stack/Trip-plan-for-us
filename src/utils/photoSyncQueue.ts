import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  cacheNotePhotosLocal,
  getCachedNotePhotosLocal,
  deleteNotePhotosLocal,
  saveQueueItemLocal,
  getPendingQueueLocal,
  removeQueueItemLocal,
  PendingQueueItem
} from './indexedDbHelper';
import {
  isQuotaExhaustedError,
  getIsGlobalQuotaExhausted,
  setIsGlobalQuotaExhausted
} from './firestoreService';
import {
  getStoredDriveToken,
  requestGoogleDriveToken,
  getOrCreateTripFolder,
  uploadPhotoToDrive
} from './googleDriveService';

export { isQuotaExhaustedError };

export function getIsQuotaExhausted(): boolean {
  return getIsGlobalQuotaExhausted();
}

export function setIsQuotaExhausted(val: boolean): void {
  setIsGlobalQuotaExhausted(val);
}

const MAX_CHUNK_CHARS = 320_000;

export interface PhotoSyncState {
  isSyncing: boolean;
  progressPercent: number; // 0 - 100
  uploadedPhotos: number;
  totalPhotos: number;
  currentNoteId: string;
  currentNoteTitle: string;
  statusMessage: string;
  isComplete: boolean;
  error: string | null;
  storageTarget: 'drive' | 'firebase' | 'local';
}

type SyncListener = (state: PhotoSyncState) => void;

let currentState: PhotoSyncState = {
  isSyncing: false,
  progressPercent: 0,
  uploadedPhotos: 0,
  totalPhotos: 0,
  currentNoteId: '',
  currentNoteTitle: '',
  statusMessage: '',
  isComplete: false,
  error: null,
  storageTarget: 'drive'
};

const listeners = new Set<SyncListener>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn({ ...currentState });
    } catch (e) {
      console.error('Error in photo sync listener:', e);
    }
  });
}

export function subscribePhotoSync(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

export function getPhotoSyncState(): PhotoSyncState {
  return { ...currentState };
}

let isQueueRunning = false;

// Cache map of tripId -> driveFolderId
const tripFolderCache = new Map<string, string>();

/**
 * Slice Base64 string for Firestore fallback
 */
function sliceBase64IntoChunks(base64Str: string, chunkSize = MAX_CHUNK_CHARS): string[] {
  if (base64Str.length <= chunkSize) {
    return [base64Str];
  }
  const chunks: string[] = [];
  let offset = 0;
  while (offset < base64Str.length) {
    chunks.push(base64Str.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }
  return chunks;
}

/**
 * Upload single photo to Firestore as fallback when Drive is not available
 */
async function uploadSinglePhotoToFirestore(
  tripId: string,
  noteId: string,
  photoIndex: number,
  base64Str: string
): Promise<void> {
  const chunks = sliceBase64IntoChunks(base64Str, MAX_CHUNK_CHARS);
  const totalChunks = chunks.length;

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const chunkData = chunks[chunkIdx];
    const docId = `p_${photoIndex}_c_${chunkIdx}`;
    const photoDocRef = doc(db, 'trips', tripId, 'notes', noteId, 'photos', docId);

    try {
      await setDoc(photoDocRef, {
        id: docId,
        tripId,
        noteId,
        photoIndex,
        chunkIndex: chunkIdx,
        totalChunks,
        data: chunkData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      if (isQuotaExhaustedError(err)) {
        throw err;
      }
      if (err?.message?.includes('exceeds maximum size') || err?.message?.includes('maximum allowed size')) {
        const subPieces = sliceBase64IntoChunks(chunkData, 150_000);
        for (let subIdx = 0; subIdx < subPieces.length; subIdx++) {
          const subDocId = `p_${photoIndex}_c_${chunkIdx}_sub_${subIdx}`;
          const subDocRef = doc(db, 'trips', tripId, 'notes', noteId, 'photos', subDocId);
          await setDoc(subDocRef, {
            id: subDocId,
            tripId,
            noteId,
            photoIndex,
            chunkIndex: chunkIdx * 100 + subIdx,
            totalChunks: totalChunks * 100,
            data: subPieces[subIdx],
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } else {
        throw err;
      }
    }
  }
}

/**
 * Main queue runner: First tries Google Drive (direct high-speed upload to subfolder per trip).
 * If Drive is unauthenticated or fails, falls back gracefully to Firestore chunks.
 */
async function processQueue() {
  if (isQueueRunning) return;
  isQueueRunning = true;

  try {
    const queue = await getPendingQueueLocal();
    if (queue.length === 0) {
      if (currentState.isSyncing) {
        currentState = {
          ...currentState,
          isSyncing: false,
          progressPercent: 100,
          isComplete: true,
          statusMessage: 'Đã hoàn tất đồng bộ tất cả ảnh lên Google Drive!'
        };
        notifyListeners();

        setTimeout(() => {
          if (!currentState.isSyncing) {
            currentState = {
              ...currentState,
              isComplete: false,
              statusMessage: ''
            };
            notifyListeners();
          }
        }, 4000);
      }
      isQueueRunning = false;
      return;
    }

    // Check if Google Drive OAuth token is ready
    let driveToken = getStoredDriveToken();

    for (const item of queue) {
      const { noteId, tripId, noteTitle, images } = item;
      const totalPhotos = images.length;

      currentState = {
        isSyncing: true,
        progressPercent: totalPhotos > 0 ? Math.round((item.uploadedPhotos / totalPhotos) * 100) : 100,
        uploadedPhotos: item.uploadedPhotos || 0,
        totalPhotos,
        currentNoteId: noteId,
        currentNoteTitle: noteTitle || 'Ghi chú',
        statusMessage: driveToken 
          ? `Đang đẩy ảnh HD lên Google Drive: ${item.uploadedPhotos || 0}/${totalPhotos}`
          : `Đang đồng bộ ảnh: ${item.uploadedPhotos || 0}/${totalPhotos}`,
        isComplete: false,
        error: null,
        storageTarget: driveToken ? 'drive' : 'firebase'
      };
      notifyListeners();

      // If we have a Drive token, locate or create the trip subfolder in Google Drive
      let tripFolderId: string | null = null;
      if (driveToken) {
        try {
          if (tripFolderCache.has(tripId)) {
            tripFolderId = tripFolderCache.get(tripId)!;
          } else {
            tripFolderId = await getOrCreateTripFolder(driveToken, noteTitle || 'Chuyến đi', tripId);
            tripFolderCache.set(tripId, tripFolderId);
          }
        } catch (folderErr: any) {
          console.warn('Could not create/find Drive folder, will retry or fallback:', folderErr);
          if (folderErr.message === 'UNAUTHORIZED_TOKEN') {
            driveToken = null;
          }
        }
      }

      let currentIndex = item.uploadedPhotos || 0;
      let consecutiveErrors = 0;

      while (currentIndex < totalPhotos) {
        try {
          const currentPhoto = images[currentIndex];

          if (driveToken && tripFolderId) {
            // Upload to Google Drive
            // If already a remote URL (https://lh3.googleusercontent.com...), skip re-uploading
            if (typeof currentPhoto === 'string' && currentPhoto.startsWith('http')) {
              currentIndex++;
            } else {
              const fileName = `photo_${tripId}_${noteId}_${currentIndex + 1}_${Date.now()}.jpg`;
              const drivePhoto = await uploadPhotoToDrive(driveToken, tripFolderId, currentPhoto, fileName);
              
              // Replace base64 in the images array with the fast direct Google Drive CDN URL
              images[currentIndex] = drivePhoto.directImageUrl;
              await cacheNotePhotosLocal(noteId, tripId, images);

              currentIndex++;
            }
          } else {
            // Fallback to Firestore subcollection if Drive token is not available
            if (getIsGlobalQuotaExhausted()) {
              console.warn('Firestore daily quota is exhausted and Drive token not provided.');
              break;
            }
            await uploadSinglePhotoToFirestore(tripId, noteId, currentIndex, currentPhoto);
            currentIndex++;
          }

          consecutiveErrors = 0;
          item.uploadedPhotos = currentIndex;
          item.status = currentIndex >= totalPhotos ? 'completed' : 'syncing';
          await saveQueueItemLocal(item);

          const percent = Math.min(100, Math.round((currentIndex / totalPhotos) * 100));
          currentState = {
            isSyncing: true,
            progressPercent: percent,
            uploadedPhotos: currentIndex,
            totalPhotos,
            currentNoteId: noteId,
            currentNoteTitle: noteTitle || 'Ghi chú',
            statusMessage: driveToken
              ? `Đang đẩy ảnh HD lên Google Drive: ${currentIndex}/${totalPhotos} (${percent}%)`
              : `Đang đẩy ảnh lên Firebase: ${currentIndex}/${totalPhotos} (${percent}%)`,
            isComplete: false,
            error: null,
            storageTarget: driveToken ? 'drive' : 'firebase'
          };
          notifyListeners();

          // Short pause
          await new Promise((res) => setTimeout(res, 150));
        } catch (err: any) {
          if (isQuotaExhaustedError(err)) {
            setIsGlobalQuotaExhausted(true);
            break;
          }

          consecutiveErrors++;
          console.error(`Error uploading photo ${currentIndex}:`, err);
          if (consecutiveErrors >= 3) {
            break;
          }
          await new Promise((res) => setTimeout(res, 1000));
        }
      }

      if (currentIndex >= totalPhotos) {
        await removeQueueItemLocal(noteId);
      }
    }

    const remaining = await getPendingQueueLocal();
    if (remaining.length === 0) {
      currentState = {
        ...currentState,
        isSyncing: false,
        progressPercent: 100,
        isComplete: true,
        statusMessage: 'Đã hoàn tất đồng bộ toàn bộ ảnh!'
      };
      notifyListeners();
    }
  } catch (globalErr: any) {
    console.error('Queue processing error:', globalErr);
  } finally {
    isQueueRunning = false;
  }
}

/**
 * Enqueue a note's photos for sync.
 * Also checks if Google Drive can be used right away.
 */
export async function enqueueNotePhotosForSync(
  tripId: string,
  noteId: string,
  noteTitle: string,
  images: string[]
): Promise<void> {
  await cacheNotePhotosLocal(noteId, tripId, images);

  if (images.length === 0) {
    await removeQueueItemLocal(noteId);
    await deleteAllPhotosForNote(tripId, noteId);
    return;
  }

  const queueItem: PendingQueueItem = {
    noteId,
    tripId,
    noteTitle,
    images,
    status: 'pending',
    totalPhotos: images.length,
    uploadedPhotos: 0,
    addedAt: Date.now()
  };

  await saveQueueItemLocal(queueItem);

  const driveToken = getStoredDriveToken();

  currentState = {
    isSyncing: true,
    progressPercent: 0,
    uploadedPhotos: 0,
    totalPhotos: images.length,
    currentNoteId: noteId,
    currentNoteTitle: noteTitle,
    statusMessage: driveToken
      ? `Đang kết nối Google Drive để đẩy ${images.length} ảnh...`
      : `Đang chuẩn bị đẩy ${images.length} ảnh...`,
    isComplete: false,
    error: null,
    storageTarget: driveToken ? 'drive' : 'firebase'
  };
  notifyListeners();

  processQueue();
}

/**
 * Fetch and assemble note photos from Local IndexedDB or Firestore.
 */
export async function fetchNotePhotosFromFirestore(
  tripId: string,
  noteId: string
): Promise<string[]> {
  try {
    const cached = await getCachedNotePhotosLocal(noteId);
    if (cached && cached.length > 0) {
      return cached;
    }

    const photosCollRef = collection(db, 'trips', tripId, 'notes', noteId, 'photos');
    const snap = await getDocs(photosCollRef);

    if (snap.empty) {
      return [];
    }

    interface ChunkDoc {
      photoIndex: number;
      chunkIndex: number;
      totalChunks: number;
      data: string;
    }

    const rawDocs: ChunkDoc[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      if (typeof data.photoIndex === 'number' && typeof data.data === 'string') {
        rawDocs.push({
          photoIndex: data.photoIndex,
          chunkIndex: data.chunkIndex || 0,
          totalChunks: data.totalChunks || 1,
          data: data.data
        });
      }
    });

    const photoMap = new Map<number, ChunkDoc[]>();
    rawDocs.forEach((c) => {
      if (!photoMap.has(c.photoIndex)) {
        photoMap.set(c.photoIndex, []);
      }
      photoMap.get(c.photoIndex)!.push(c);
    });

    const assembledPhotos: string[] = [];
    const sortedIndices = Array.from(photoMap.keys()).sort((a, b) => a - b);

    for (const pIdx of sortedIndices) {
      const chunks = photoMap.get(pIdx)!;
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      const fullBase64 = chunks.map((c) => c.data).join('');
      assembledPhotos.push(fullBase64);
    }

    if (assembledPhotos.length > 0) {
      await cacheNotePhotosLocal(noteId, tripId, assembledPhotos);
    }

    return assembledPhotos;
  } catch (err) {
    console.warn(`Could not fetch photos for note ${noteId}:`, err);
    return [];
  }
}

/**
 * Delete all photos for a note
 */
export async function deleteAllPhotosForNote(tripId: string, noteId: string): Promise<void> {
  try {
    await deleteNotePhotosLocal(noteId);
    await removeQueueItemLocal(noteId);

    const photosCollRef = collection(db, 'trips', tripId, 'notes', noteId, 'photos');
    const snap = await getDocs(photosCollRef);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn(`Error deleting photos for note ${noteId}:`, err);
  }
}

/**
 * Resume any interrupted sync queue
 */
export async function resumePendingSyncQueue(): Promise<void> {
  const queue = await getPendingQueueLocal();
  if (queue.length > 0) {
    processQueue();
  }
}

/**
 * Manually retry failed sync
 */
export function retryFailedSyncQueue(): void {
  setIsGlobalQuotaExhausted(false);
  currentState = {
    ...currentState,
    error: null,
    statusMessage: 'Đang kết nối lại...'
  };
  notifyListeners();
  processQueue();
}

/**
 * Authorize or re-authorize Google Drive on demand
 */
export async function connectGoogleDriveStorage(userHint?: string): Promise<boolean> {
  try {
    const token = await requestGoogleDriveToken(firebaseConfig.oAuthClientId, userHint);
    if (token) {
      currentState = {
        ...currentState,
        storageTarget: 'drive',
        statusMessage: 'Đã kết nối Google Drive thành công!'
      };
      notifyListeners();
      processQueue();
      return true;
    }
  } catch (err: any) {
    console.error('Connect Google Drive error:', err);
  }
  return false;
}
