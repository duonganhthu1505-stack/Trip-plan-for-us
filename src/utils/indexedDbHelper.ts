/**
 * IndexedDB helper for high-capacity local browser storage.
 * Bypasses 5MB localStorage limits, allowing users to cache dozens of HD photos locally
 * before and during background sync to Firebase.
 */

const DB_NAME = 'OurTravelPlannerPhotosDB';
const DB_VERSION = 1;
const STORE_PHOTOS = 'note_photos';
const STORE_QUEUE = 'upload_queue';

export interface PendingQueueItem {
  noteId: string;
  tripId: string;
  noteTitle: string;
  images: string[];
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  totalPhotos: number;
  uploadedPhotos: number;
  addedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'noteId' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'noteId' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });

  return dbPromise;
}

/**
 * Cache note photos locally in IndexedDB
 */
export async function cacheNotePhotosLocal(noteId: string, tripId: string, images: string[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, 'readwrite');
      const store = tx.objectStore(STORE_PHOTOS);
      const req = store.put({
        noteId,
        tripId,
        images,
        updatedAt: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB cacheNotePhotosLocal warning:', err);
  }
}

/**
 * Get note photos cached in local browser IndexedDB
 */
export async function getCachedNotePhotosLocal(noteId: string): Promise<string[] | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PHOTOS, 'readonly');
      const store = tx.objectStore(STORE_PHOTOS);
      const req = store.get(noteId);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.images)) {
          resolve(req.result.images);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Delete note photos from local cache
 */
export async function deleteNotePhotosLocal(noteId: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PHOTOS, 'readwrite');
      const store = tx.objectStore(STORE_PHOTOS);
      const req = store.delete(noteId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

/**
 * Add or update an item in the upload queue in browser storage
 */
export async function saveQueueItemLocal(item: PendingQueueItem): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveQueueItemLocal warning:', err);
  }
}

/**
 * Get all pending upload items from local browser queue
 */
export async function getPendingQueueLocal(): Promise<PendingQueueItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Delete item from upload queue once all photos are pushed and synced to Firebase
 */
export async function removeQueueItemLocal(noteId: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.delete(noteId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}
