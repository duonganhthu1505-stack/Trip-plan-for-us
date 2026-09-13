import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
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

export { isQuotaExhaustedError };

export function getIsQuotaExhausted(): boolean {
  return getIsGlobalQuotaExhausted();
}

export function setIsQuotaExhausted(val: boolean): void {
  setIsGlobalQuotaExhausted(val);
}

/**
 * Maximum character length per Firestore document chunk (~320 KB).
 * Standard Firestore document limit is 1,048,576 bytes (1 MB).
 * 320 KB leaves generous headroom for document metadata and field overhead.
 */
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
  error: null
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

/**
 * Slices a large Base64 string into safe chunks (~320KB each).
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
 * Upload a single photo (which may be 1 or multiple chunks if large) to Firestore.
 */
async function uploadSinglePhotoWithChunks(
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
      // If Firestore daily write quota is exhausted, throw immediately to stop queue
      if (isQuotaExhaustedError(err)) {
        throw err;
      }

      // If Firestore reports payload too large for a single document (> 1MB), slice into smaller 150KB pieces
      if (err?.message?.includes('exceeds maximum size') || err?.message?.includes('maximum allowed size') || (err?.code === 'invalid-argument' && String(err?.message).includes('size'))) {
        console.warn(`Doc ${docId} exceeded 1MB limit, slicing into smaller sub-chunks...`);
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
 * Uploads up to 2 photos in a batch step, falling back to 1-by-1 if combined size approaches 1MB.
 */
async function uploadBatchPhotos(
  tripId: string,
  noteId: string,
  startIndex: number,
  photos: string[]
): Promise<number> {
  const photo1 = photos[startIndex];
  const photo2 = startIndex + 1 < photos.length ? photos[startIndex + 1] : null;

  // Check combined size of the 2 photos
  const size1 = photo1 ? photo1.length : 0;
  const size2 = photo2 ? photo2.length : 0;
  const combinedSize = size1 + size2;

  // If combined size is large (> 650,000 chars ~ 650 KB) or any photo is chunked,
  // push 1 photo per turn ("đổi thành một ảnh một lượt") to guarantee safety.
  if (photo2 && combinedSize < 650_000 && size1 < MAX_CHUNK_CHARS && size2 < MAX_CHUNK_CHARS) {
    // Upload 2 photos in parallel
    await Promise.all([
      uploadSinglePhotoWithChunks(tripId, noteId, startIndex, photo1),
      uploadSinglePhotoWithChunks(tripId, noteId, startIndex + 1, photo2)
    ]);
    return 2;
  } else {
    // Upload 1 photo only
    await uploadSinglePhotoWithChunks(tripId, noteId, startIndex, photo1);
    return 1;
  }
}

/**
 * Main queue runner: iterates through pending upload items.
 * Processes 2 photos at a time until completed, then cleans up browser queue.
 */
async function processQueue() {
  if (isQueueRunning) return;
  if (getIsGlobalQuotaExhausted()) {
    console.warn('Firebase daily free write quota is currently exhausted. Queue remains safe in IndexedDB.');
    return;
  }
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
          statusMessage: 'Đã hoàn tất đồng bộ tất cả ảnh lên Firebase!'
        };
        notifyListeners();

        // Auto dismiss complete state after 4 seconds
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
        statusMessage: `Đang đồng bộ ảnh HD: ${item.uploadedPhotos || 0}/${totalPhotos} ảnh (2 ảnh/lượt)`,
        isComplete: false,
        error: null
      };
      notifyListeners();

      let currentIndex = item.uploadedPhotos || 0;
      let consecutiveErrors = 0;

      while (currentIndex < totalPhotos) {
        try {
          const uploadedInThisStep = await uploadBatchPhotos(
            tripId,
            noteId,
            currentIndex,
            images
          );

          currentIndex += uploadedInThisStep;
          consecutiveErrors = 0; // Reset error counter on success

          // Update progress in memory and browser storage
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
            statusMessage: `Đang đẩy ảnh HD lên Firebase: ${currentIndex}/${totalPhotos} (${percent}%)`,
            isComplete: false,
            error: null
          };
          notifyListeners();

          // Short pause between batches (250ms) to ensure smooth browser rendering and network balance
          await new Promise((res) => setTimeout(res, 250));
        } catch (err: any) {
          if (isQuotaExhaustedError(err)) {
            console.warn('Firebase daily write quota reached during photo upload. Queue halted; photos safely stored in IndexedDB.');
            setIsGlobalQuotaExhausted(true);
            currentState = {
              isSyncing: false,
              progressPercent: Math.min(100, Math.round((currentIndex / totalPhotos) * 100)),
              uploadedPhotos: currentIndex,
              totalPhotos,
              currentNoteId: noteId,
              currentNoteTitle: noteTitle || 'Ghi chú',
              statusMessage: 'Lưu trên máy (Hạn mức Firebase hôm nay đã đầy)',
              isComplete: false,
              error: 'Đám mây Firebase đã đạt giới hạn ghi miễn phí hôm nay (20,000 lượt). Ảnh đã được lưu an toàn 100% trên thiết bị của bạn!'
            };
            notifyListeners();
            isQueueRunning = false;
            return;
          }

          consecutiveErrors++;
          console.error(`Error uploading photo batch for note ${noteId} at index ${currentIndex} (attempt ${consecutiveErrors}):`, err);

          if (consecutiveErrors >= 3) {
            currentState = {
              ...currentState,
              isSyncing: false,
              error: `Tạm dừng đồng bộ: ${err?.message || 'Lỗi mạng'}. Bạn có thể bấm Thử lại.`
            };
            notifyListeners();
            isQueueRunning = false;
            return;
          }

          currentState.error = `Lỗi khi tải ảnh: ${err?.message || 'Vui lòng kiểm tra mạng'}`;
          notifyListeners();
          // Exponential wait before retry
          await new Promise((res) => setTimeout(res, 1500 * consecutiveErrors));
        }
      }

      // "Đẩy xong hết, đồng bộ xong hết rồi thì mới xóa cái dữ liệu ở trình duyệt."
      await removeQueueItemLocal(noteId);

      // Also ensure parent note doc has metadata updated
      try {
        const noteDocRef = doc(db, 'trips', tripId, 'notes', noteId);
        await setDoc(noteDocRef, {
          hasChunkedPhotos: true,
          photoCount: totalPhotos,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Could not update note metadata flag:', err);
      }
    }

    currentState = {
      isSyncing: false,
      progressPercent: 100,
      uploadedPhotos: currentState.totalPhotos,
      totalPhotos: currentState.totalPhotos,
      currentNoteId: '',
      currentNoteTitle: '',
      statusMessage: '✅ Đã đồng bộ toàn bộ ảnh HD lên Firebase thành công!',
      isComplete: true,
      error: null
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

  } catch (globalErr: any) {
    console.error('Queue processing error:', globalErr);
    currentState = {
      ...currentState,
      isSyncing: false,
      error: globalErr?.message || 'Có lỗi khi đồng bộ ảnh'
    };
    notifyListeners();
  } finally {
    isQueueRunning = false;
  }
}

/**
 * Enqueue a note's photos for background batch upload.
 * First saves locally in IndexedDB, then triggers background upload.
 */
export async function enqueueNotePhotosForSync(
  tripId: string,
  noteId: string,
  noteTitle: string,
  images: string[]
): Promise<void> {
  // 1. Immediately cache full photos in browser memory (IndexedDB)
  await cacheNotePhotosLocal(noteId, tripId, images);

  if (images.length === 0) {
    // Clean up queue and remote subcollection if user removed all photos
    await removeQueueItemLocal(noteId);
    await deleteAllPhotosForNote(tripId, noteId);
    return;
  }

  // 2. Add to local browser upload queue
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

  currentState = {
    isSyncing: true,
    progressPercent: 0,
    uploadedPhotos: 0,
    totalPhotos: images.length,
    currentNoteId: noteId,
    currentNoteTitle: noteTitle,
    statusMessage: `Đang chuẩn bị đẩy ${images.length} ảnh HD lên Firebase...`,
    isComplete: false,
    error: null
  };
  notifyListeners();

  // 3. Trigger queue processor
  processQueue();
}

/**
 * Fetch and assemble all photos for a note from Firestore subcollection.
 * Recombines any sliced chunks in numerical order.
 */
export async function fetchNotePhotosFromFirestore(
  tripId: string,
  noteId: string
): Promise<string[]> {
  try {
    // 1. Check local IndexedDB cache first
    const cached = await getCachedNotePhotosLocal(noteId);
    if (cached && cached.length > 0) {
      return cached;
    }

    // 2. Fetch from Firestore subcollection /trips/{tripId}/notes/{noteId}/photos
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

    // Group by photoIndex
    const photoMap = new Map<number, ChunkDoc[]>();
    rawDocs.forEach((c) => {
      if (!photoMap.has(c.photoIndex)) {
        photoMap.set(c.photoIndex, []);
      }
      photoMap.get(c.photoIndex)!.push(c);
    });

    // Reconstruct each photo string by sorting chunks
    const assembledPhotos: string[] = [];
    const sortedIndices = Array.from(photoMap.keys()).sort((a, b) => a - b);

    for (const pIdx of sortedIndices) {
      const chunks = photoMap.get(pIdx)!;
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      const fullBase64 = chunks.map((c) => c.data).join('');
      assembledPhotos.push(fullBase64);
    }

    // Cache into local browser IndexedDB
    if (assembledPhotos.length > 0) {
      await cacheNotePhotosLocal(noteId, tripId, assembledPhotos);
    }

    return assembledPhotos;
  } catch (err) {
    console.warn(`Could not fetch photos subcollection for note ${noteId}:`, err);
    return [];
  }
}

/**
 * Delete all photos in the subcollection when a note is deleted.
 */
export async function deleteAllPhotosForNote(tripId: string, noteId: string): Promise<void> {
  try {
    // Delete local cache
    await deleteNotePhotosLocal(noteId);
    await removeQueueItemLocal(noteId);

    // Delete Firestore subcollection docs
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
 * Resume any interrupted sync queues on app startup
 */
export async function resumePendingSyncQueue(): Promise<void> {
  const queue = await getPendingQueueLocal();
  if (queue.length > 0) {
    processQueue();
  }
}

/**
 * Manually retry failed sync queue items
 */
export function retryFailedSyncQueue(): void {
  setIsGlobalQuotaExhausted(false);
  currentState = {
    ...currentState,
    error: null,
    statusMessage: 'Đang thử kết nối lại...'
  };
  notifyListeners();
  processQueue();
}

