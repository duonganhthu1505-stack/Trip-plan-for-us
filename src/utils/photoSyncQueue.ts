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
const COMPLETE_BADGE_MS = 3000;

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
let isQueueRunning = false;
let completionTimer: ReturnType<typeof setTimeout> | null = null;

// Cache map of tripId -> driveFolderId
const tripFolderCache = new Map<string, string>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn({ ...currentState });
    } catch (e) {
      console.error('Error in photo sync listener:', e);
    }
  });
}

function updateState(next: Partial<PhotoSyncState>) {
  currentState = { ...currentState, ...next };
  notifyListeners();
}

function isRemotePhoto(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function countRemotePhotos(images: string[]): number {
  return images.filter(isRemotePhoto).length;
}

function clampUploadedCount(value: number, total: number): number {
  return Math.max(0, Math.min(total, Number.isFinite(value) ? value : 0));
}

function calcPercent(uploaded: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((uploaded / total) * 100)));
}

function showCompleteState(
  totalPhotos: number,
  noteId: string,
  noteTitle: string,
  storageTarget: PhotoSyncState['storageTarget']
) {
  if (completionTimer) clearTimeout(completionTimer);

  currentState = {
    ...currentState,
    isSyncing: false,
    progressPercent: 100,
    uploadedPhotos: totalPhotos,
    totalPhotos,
    currentNoteId: noteId,
    currentNoteTitle: noteTitle || 'Ghi chú',
    statusMessage: totalPhotos > 0 ? `Đã lưu ${totalPhotos} ảnh` : 'Đã hoàn tất',
    isComplete: true,
    error: null,
    storageTarget
  };
  notifyListeners();

  completionTimer = setTimeout(() => {
    if (!currentState.isSyncing && !currentState.error) {
      currentState = {
        ...currentState,
        isComplete: false,
        statusMessage: ''
      };
      notifyListeners();
    }
  }, COMPLETE_BADGE_MS);
}

function showFailedState(
  message: string,
  uploadedPhotos: number,
  totalPhotos: number,
  noteId: string,
  noteTitle: string,
  storageTarget: PhotoSyncState['storageTarget']
) {
  updateState({
    isSyncing: false,
    progressPercent: calcPercent(uploadedPhotos, totalPhotos),
    uploadedPhotos,
    totalPhotos,
    currentNoteId: noteId,
    currentNoteTitle: noteTitle || 'Ghi chú',
    statusMessage: message,
    isComplete: false,
    error: message,
    storageTarget
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

/**
 * Slice Base64 string for Firestore fallback.
 */
function sliceBase64IntoChunks(base64Str: string, chunkSize = MAX_CHUNK_CHARS): string[] {
  if (base64Str.length <= chunkSize) return [base64Str];

  const chunks: string[] = [];
  let offset = 0;
  while (offset < base64Str.length) {
    chunks.push(base64Str.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }
  return chunks;
}

/**
 * Upload one photo to Firestore as a fallback when Drive is unavailable.
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
      if (isQuotaExhaustedError(err)) throw err;

      if (
        err?.message?.includes('exceeds maximum size') ||
        err?.message?.includes('maximum allowed size')
      ) {
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

async function persistDriveUrls(
  tripId: string,
  noteId: string,
  images: string[]
): Promise<void> {
  try {
    const noteRef = doc(db, 'trips', tripId, 'notes', noteId);
    await setDoc(noteRef, {
      images,
      hasChunkedPhotos: false,
      photoCount: images.length
    }, { merge: true });
  } catch (e) {
    // The Drive upload itself is already complete. Do not leave the UI spinning
    // just because this metadata write failed; the queue can be rebuilt later.
    console.warn('Failed to update Firestore note with Drive URLs:', e);
  }
}

/**
 * Main queue runner.
 *
 * Important behaviour:
 * - Progress is recovered from the actual image values (remote URLs) instead of
 *   trusting a stale uploadedPhotos counter.
 * - A failed upload stops the spinner and exposes a retry state.
 * - Existing remote images are never re-uploaded as Base64.
 */
async function processQueue() {
  if (isQueueRunning) return;
  isQueueRunning = true;

  try {
    const queue = await getPendingQueueLocal();

    if (queue.length === 0) {
      if (currentState.isSyncing) {
        showCompleteState(
          currentState.totalPhotos,
          currentState.currentNoteId,
          currentState.currentNoteTitle,
          currentState.storageTarget
        );
      }
      return;
    }

    let driveToken = getStoredDriveToken();
    let encounteredError = false;

    for (const item of queue) {
      const { noteId, tripId, noteTitle } = item;
      const images = Array.isArray(item.images) ? [...item.images] : [];
      const totalPhotos = images.length;

      if (totalPhotos === 0) {
        await removeQueueItemLocal(noteId);
        continue;
      }

      // Recover progress from what is actually persisted in the queue.
      // This fixes the 0/40 bug after reload or after an interrupted Drive upload.
      const remoteCount = countRemotePhotos(images);
      let uploadedPhotos = clampUploadedCount(
        Math.max(item.uploadedPhotos || 0, remoteCount),
        totalPhotos
      );

      if (item.uploadedPhotos !== uploadedPhotos || item.totalPhotos !== totalPhotos) {
        item.uploadedPhotos = uploadedPhotos;
        item.totalPhotos = totalPhotos;
        item.images = images;
        item.status = uploadedPhotos >= totalPhotos ? 'completed' : 'syncing';
        await saveQueueItemLocal(item);
      }

      // If every image is already a remote URL, the previous upload succeeded.
      // Clean the stale queue item instead of showing 0% forever.
      if (remoteCount === totalPhotos) {
        await cacheNotePhotosLocal(noteId, tripId, images);
        await persistDriveUrls(tripId, noteId, images);
        await removeQueueItemLocal(noteId);
        showCompleteState(totalPhotos, noteId, noteTitle || 'Ghi chú', 'drive');
        continue;
      }

      updateState({
        isSyncing: true,
        progressPercent: calcPercent(uploadedPhotos, totalPhotos),
        uploadedPhotos,
        totalPhotos,
        currentNoteId: noteId,
        currentNoteTitle: noteTitle || 'Ghi chú',
        statusMessage: driveToken
          ? `Đang tải ${uploadedPhotos}/${totalPhotos} ảnh`
          : `Đang đồng bộ ${uploadedPhotos}/${totalPhotos} ảnh`,
        isComplete: false,
        error: null,
        storageTarget: driveToken ? 'drive' : 'firebase'
      });

      let tripFolderId: string | null = null;
      if (driveToken) {
        try {
          if (tripFolderCache.has(tripId)) {
            tripFolderId = tripFolderCache.get(tripId)!;
          } else {
            tripFolderId = await getOrCreateTripFolder(
              driveToken,
              noteTitle || 'Chuyến đi',
              tripId
            );
            tripFolderCache.set(tripId, tripFolderId);
          }
        } catch (folderErr: any) {
          console.warn('Could not create/find Drive folder:', folderErr);
          if (folderErr?.message === 'UNAUTHORIZED_TOKEN') {
            driveToken = null;
          } else {
            item.status = 'failed';
            await saveQueueItemLocal(item);
            showFailedState(
              'Không thể kết nối thư mục Google Drive. Nhấn Thử lại.',
              uploadedPhotos,
              totalPhotos,
              noteId,
              noteTitle || 'Ghi chú',
              'drive'
            );
            encounteredError = true;
            continue;
          }
        }
      }

      if (driveToken && tripFolderId) {
        const pendingUploads: { base64: string; name: string; originalIndex: number }[] = [];

        for (let i = 0; i < totalPhotos; i++) {
          const photo = images[i];
          if (typeof photo === 'string' && !isRemotePhoto(photo)) {
            pendingUploads.push({
              base64: photo,
              name: `photo_${tripId}_${noteId}_${i + 1}_${Date.now()}.jpg`,
              originalIndex: i
            });
          }
        }

        if (pendingUploads.length > 0) {
          try {
            await uploadMultiplePhotosToDriveParallel(
              driveToken,
              tripFolderId,
              pendingUploads,
              4,
              async (originalIndex, directUrl) => {
                images[originalIndex] = directUrl;
                await cacheNotePhotosLocal(noteId, tripId, images);

                // Count the actual remote URLs after every completed upload.
                // This is robust even when uploads finish out of order.
                uploadedPhotos = countRemotePhotos(images);
                item.images = [...images];
                item.uploadedPhotos = uploadedPhotos;
                item.totalPhotos = totalPhotos;
                item.status = uploadedPhotos >= totalPhotos ? 'completed' : 'syncing';
                await saveQueueItemLocal(item);

                const percent = calcPercent(uploadedPhotos, totalPhotos);
                updateState({
                  isSyncing: true,
                  progressPercent: percent,
                  uploadedPhotos,
                  totalPhotos,
                  currentNoteId: noteId,
                  currentNoteTitle: noteTitle || 'Ghi chú',
                  statusMessage: `Đang tải ${uploadedPhotos}/${totalPhotos} ảnh`,
                  isComplete: false,
                  error: null,
                  storageTarget: 'drive'
                });
              }
            );
          } catch (uploadErr: any) {
            console.error('Parallel Drive upload error:', uploadErr);

            uploadedPhotos = countRemotePhotos(images);
            item.images = [...images];
            item.uploadedPhotos = uploadedPhotos;
            item.totalPhotos = totalPhotos;
            item.status = 'failed';
            await cacheNotePhotosLocal(noteId, tripId, images);
            await saveQueueItemLocal(item);

            const message = uploadErr?.message === 'UNAUTHORIZED_TOKEN'
              ? 'Phiên Google Drive đã hết hạn. Kết nối lại Drive rồi nhấn Thử lại.'
              : 'Tải ảnh chưa hoàn tất. Nhấn Thử lại để tiếp tục.';

            showFailedState(
              message,
              uploadedPhotos,
              totalPhotos,
              noteId,
              noteTitle || 'Ghi chú',
              'drive'
            );
            encounteredError = true;
            continue;
          }
        }

        const finalRemoteCount = countRemotePhotos(images);
        if (finalRemoteCount === totalPhotos) {
          await cacheNotePhotosLocal(noteId, tripId, images);
          await persistDriveUrls(tripId, noteId, images);
          await removeQueueItemLocal(noteId);
          showCompleteState(totalPhotos, noteId, noteTitle || 'Ghi chú', 'drive');
        } else {
          item.images = [...images];
          item.uploadedPhotos = finalRemoteCount;
          item.status = 'failed';
          await saveQueueItemLocal(item);
          showFailedState(
            'Tải ảnh chưa hoàn tất. Nhấn Thử lại để tiếp tục.',
            finalRemoteCount,
            totalPhotos,
            noteId,
            noteTitle || 'Ghi chú',
            'drive'
          );
          encounteredError = true;
        }
      } else {
        // Firestore fallback. Remote Drive URLs count as already completed and
        // are skipped instead of being incorrectly written as Base64 chunks.
        let completedCount = 0;
        let consecutiveErrors = 0;
        let failedMessage: string | null = null;

        for (let index = 0; index < totalPhotos; index++) {
          const currentPhoto = images[index];

          if (isRemotePhoto(currentPhoto)) {
            completedCount++;
            continue;
          }

          if (getIsGlobalQuotaExhausted()) {
            failedMessage = 'Firebase đã hết hạn mức hôm nay. Kết nối Google Drive rồi thử lại.';
            break;
          }

          try {
            await uploadSinglePhotoToFirestore(tripId, noteId, index, currentPhoto);
            completedCount++;
            consecutiveErrors = 0;

            item.uploadedPhotos = completedCount;
            item.totalPhotos = totalPhotos;
            item.status = completedCount >= totalPhotos ? 'completed' : 'syncing';
            await saveQueueItemLocal(item);

            updateState({
              isSyncing: true,
              progressPercent: calcPercent(completedCount, totalPhotos),
              uploadedPhotos: completedCount,
              totalPhotos,
              currentNoteId: noteId,
              currentNoteTitle: noteTitle || 'Ghi chú',
              statusMessage: `Đang tải ${completedCount}/${totalPhotos} ảnh`,
              isComplete: false,
              error: null,
              storageTarget: 'firebase'
            });

            await new Promise((res) => setTimeout(res, 100));
          } catch (err: any) {
            if (isQuotaExhaustedError(err)) {
              setIsGlobalQuotaExhausted(true);
              failedMessage = 'Firebase đã hết hạn mức hôm nay. Kết nối Google Drive rồi thử lại.';
              break;
            }

            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
              failedMessage = 'Không thể tải một số ảnh. Nhấn Thử lại để tiếp tục.';
              break;
            }
            await new Promise((res) => setTimeout(res, 1000));
            index--;
          }
        }

        if (completedCount >= totalPhotos) {
          await removeQueueItemLocal(noteId);
          showCompleteState(totalPhotos, noteId, noteTitle || 'Ghi chú', 'firebase');
        } else {
          item.uploadedPhotos = completedCount;
          item.totalPhotos = totalPhotos;
          item.status = 'failed';
          await saveQueueItemLocal(item);
          showFailedState(
            failedMessage || 'Tải ảnh chưa hoàn tất. Nhấn Thử lại để tiếp tục.',
            completedCount,
            totalPhotos,
            noteId,
            noteTitle || 'Ghi chú',
            'firebase'
          );
          encounteredError = true;
        }
      }
    }

    const remaining = await getPendingQueueLocal();
    if (remaining.length === 0 && !encounteredError) {
      if (!currentState.isComplete) {
        showCompleteState(
          currentState.totalPhotos,
          currentState.currentNoteId,
          currentState.currentNoteTitle,
          currentState.storageTarget
        );
      }
    }
  } catch (globalErr: any) {
    console.error('Queue processing error:', globalErr);
    showFailedState(
      'Có lỗi khi đồng bộ ảnh. Nhấn Thử lại.',
      currentState.uploadedPhotos,
      currentState.totalPhotos,
      currentState.currentNoteId,
      currentState.currentNoteTitle,
      currentState.storageTarget
    );
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

  const totalPhotos = images.length;
  const alreadyRemote = countRemotePhotos(images);

  // Editing a note whose photos are already on Drive must not reset the UI to 0%.
  if (alreadyRemote === totalPhotos) {
    await removeQueueItemLocal(noteId);
    showCompleteState(totalPhotos, noteId, noteTitle, 'drive');
    return;
  }

  const queueItem: PendingQueueItem = {
    noteId,
    tripId,
    noteTitle,
    images: [...images],
    status: 'pending',
    totalPhotos,
    uploadedPhotos: alreadyRemote,
    addedAt: Date.now()
  };

  await saveQueueItemLocal(queueItem);

  const driveToken = getStoredDriveToken();
  updateState({
    isSyncing: true,
    progressPercent: calcPercent(alreadyRemote, totalPhotos),
    uploadedPhotos: alreadyRemote,
    totalPhotos,
    currentNoteId: noteId,
    currentNoteTitle: noteTitle,
    statusMessage: `Đang tải ${alreadyRemote}/${totalPhotos} ảnh`,
    isComplete: false,
    error: null,
    storageTarget: driveToken ? 'drive' : 'firebase'
  });

  void processQueue();
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
    if (cached && cached.length > 0) return cached;

    const photosCollRef = collection(db, 'trips', tripId, 'notes', noteId, 'photos');
    const snap = await getDocs(photosCollRef);
    if (snap.empty) return [];

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
      if (!photoMap.has(c.photoIndex)) photoMap.set(c.photoIndex, []);
      photoMap.get(c.photoIndex)!.push(c);
    });

    const assembledPhotos: string[] = [];
    const sortedIndices = Array.from(photoMap.keys()).sort((a, b) => a - b);

    for (const pIdx of sortedIndices) {
      const chunks = photoMap.get(pIdx)!;
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      assembledPhotos.push(chunks.map((c) => c.data).join(''));
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
 * Delete all photos for a note.
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
 * Resume any interrupted sync queue.
 */
export async function resumePendingSyncQueue(): Promise<void> {
  const queue = await getPendingQueueLocal();
  if (queue.length > 0) {
    void processQueue();
  }
}

/**
 * Manually retry failed sync.
 */
export function retryFailedSyncQueue(): void {
  setIsGlobalQuotaExhausted(false);
  updateState({
    isSyncing: true,
    error: null,
    isComplete: false,
    statusMessage: 'Đang thử lại...'
  });
  void processQueue();
}

/**
 * Authorize or re-authorize Google Drive on demand.
 */
export async function connectGoogleDriveStorage(userHint?: string): Promise<boolean> {
  try {
    const oAuthClientId = (firebaseConfig as any).oAuthClientId || (firebaseConfig as any).clientId;
    const token = await requestGoogleDriveToken(oAuthClientId, userHint);
    if (token) {
      updateState({
        storageTarget: 'drive',
        error: null,
        statusMessage: 'Đã kết nối Google Drive thành công!'
      });
      void processQueue();
      return true;
    }
  } catch (err: any) {
    console.error('Connect Google Drive error:', err);
    showFailedState(
      err?.message || 'Không thể kết nối Google Drive.',
      currentState.uploadedPhotos,
      currentState.totalPhotos,
      currentState.currentNoteId,
      currentState.currentNoteTitle,
      'drive'
    );
  }
  return false;
}
