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
  uploadPhotoToDrive,
  uploadMultiplePhotosToDriveParallel
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
 * Main queue runner: Uses multi-threaded parallel streams for Google Drive upload.
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
        progressPercent: totalPhotos > 0 ? Math.round(((item.uploadedPhotos || 0) / totalPhotos) * 100) : 100,
        uploadedPhotos: item.uploadedPhotos || 0,
        totalPhotos,
        currentNoteId: noteId,
        currentNoteTitle: noteTitle || 'Ghi chú',
        statusMessage: driveToken 
          ? `Đang tải song song lên Google Drive: ${item.uploadedPhotos || 0}/${totalPhotos}`
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

      if (driveToken && tripFolderId) {
        // Collect photos that need to be uploaded to Drive
        const pendingUploads: { base64: string; name: string; originalIndex: number }[] = [];
        
        for (let i = 0; i < totalPhotos; i++) {
          const photo = images[i];
          if (typeof photo === 'string' && !photo.startsWith('http')) {
            pendingUploads.push({
              base64: photo,
              name: `photo_${tripId}_${noteId}_${i + 1}_${Date.now()}.jpg`,
              originalIndex: i
            });
          }
        }

        if (pendingUploads.length > 0) {
          let uploadedSoFar = totalPhotos - pendingUploads.length;

          try {
            await uploadMultiplePhotosToDriveParallel(
              driveToken,
              tripFolderId,
              pendingUploads,
              4, // 4 concurrent streams for ultra-fast upload
              async (originalIndex, directUrl, completedCount, totalCount) => {
                images[originalIndex] = directUrl;
                await cacheNotePhotosLocal(noteId, tripId, images);
                
                uploadedSoFar = (totalPhotos - pendingUploads.length) + completedCount;
                item.uploadedPhotos = uploadedSoFar;
                item.status = uploadedSoFar >= totalPhotos ? 'completed' : 'syncing';
                await saveQueueItemLocal(item);

                const percent = Math.min(100, Math.round((uploadedSoFar / totalPhotos) * 100));
                currentState = {
                  isSyncing: true,
                  progressPercent: percent,
                  uploadedPhotos: uploadedSoFar,
                  totalPhotos,
                  currentNoteId: noteId,
                  currentNoteTitle: noteTitle || 'Ghi chú',
                  statusMessage: `Đang tải song song lên Google Drive (4 luồng): ${uploadedSoFar}/${totalPhotos} (${percent}%)`,
                  isComplete: false,
                  error: null,
                  storageTarget: 'drive'
                };
                notifyListeners();
              }
            );
          } catch (uploadErr: any) {
            console.error('Parallel Drive upload error:', uploadErr);
          }
        }

        // Check if all images have become remote URLs
        const allUploaded = images.every(img => typeof img === 'string' && img.startsWith('http'));
        if (allUploaded) {
          try {
            const noteRef = doc(db, 'trips', tripId, 'notes', noteId);
            await setDoc(noteRef, { 
              images: images, 
              hasChunkedPhotos: false 
            }, { merge: true });
          } catch (e) {
            console.warn('Failed to update Firestore note with Drive URLs:', e);
          }
          await removeQueueItemLocal(noteId);
        }
      } else {
        // Fallback sequentially to Firestore if Drive is unauthenticated
        let currentIndex = item.uploadedPhotos || 0;
        let consecutiveErrors = 0;

        while (currentIndex < totalPhotos) {
          try {
            const currentPhoto = images[currentIndex];
            if (getIsGlobalQuotaExhausted()) {
              console.warn('Firestore daily quota is exhausted and Drive token not provided.');
              break;
            }
            await uploadSinglePhotoToFirestore(tripId, noteId, currentIndex, currentPhoto);
            currentIndex++;

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
              statusMessage: `Đang đẩy ảnh lên Firebase: ${currentIndex}/${totalPhotos} (${percent}%)`,
              isComplete: false,
              error: null,
              storageTarget: 'firebase'
            };
            notifyListeners();
            await new Promise((res) => setTimeout(res, 100));
          } catch (err: any) {
            if (isQuotaExhaustedError(err)) {
              setIsGlobalQuotaExhausted(true);
              break;
            }
            consecutiveErrors++;
            if (consecutiveErrors >= 3) break;
            await new Promise((res) => setTimeout(res, 1000));
          }
        }

        if (currentIndex >= totalPhotos) {
          await removeQueueItemLocal(noteId);
        }
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
      ? `Đang mở 4 luồng song song đẩy ${images.length} ảnh lên Google Drive...`
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
    const oAuthClientId = (firebaseConfig as any).oAuthClientId || (firebaseConfig as any).clientId;
    const token = await requestGoogleDriveToken(oAuthClientId, userHint);
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
