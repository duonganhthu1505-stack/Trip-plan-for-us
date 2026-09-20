/**
 * Journal photos on screen.
 *
 * A note document only carries the photo ids and a small preview of each photo;
 * the original lives in its own document (the `photos` subcollection) so it can
 * keep its full quality without hitting Firestore's 1 MiB per-document limit.
 */

import { JournalNote } from '../types';

export interface NotePhoto {
  /** Cloud photo id — empty when this photo has not reached the cloud yet. */
  id: string;
  /** Small copy used in the grids. */
  thumb: string;
  /** Original picture — only present on the device that added it. */
  full: string;
}

/** Everything this note has, in order, whatever mix of local/cloud it holds. */
export function notePhotos(note: JournalNote): NotePhoto[] {
  const images = Array.isArray(note.images) ? note.images : [];
  const ids = Array.isArray(note.photoIds) ? note.photoIds : [];
  const thumbs = Array.isArray(note.photoThumbs) ? note.photoThumbs : [];
  const count = Math.max(images.length, ids.length, thumbs.length);

  const photos: NotePhoto[] = [];
  for (let index = 0; index < count; index++) {
    const full = images[index] || '';
    const thumb = thumbs[index] || full;
    const id = ids[index] || '';
    if (!full && !thumb) continue;
    photos.push({ id, thumb, full });
  }
  return photos;
}

export function notePhotoCount(note: JournalNote): number {
  return notePhotos(note).length;
}

export function noteHasPhotos(note: JournalNote): boolean {
  return notePhotoCount(note) > 0;
}

/** What the grids draw: the small copy when we have one, else the original. */
export function photoPreview(photo: NotePhoto): string {
  return photo.thumb || photo.full;
}

/** Originals already downloaded on this device, so a second look is instant. */
const fullPhotoCache = new Map<string, string>();

export function cachedPhotoFull(id: string): string {
  return fullPhotoCache.get(id) || '';
}

export function rememberPhotoFull(id: string, dataUrl: string): void {
  if (!id || !dataUrl) return;
  // Keep the cache small — a handful of originals is plenty for browsing.
  if (fullPhotoCache.size > 24) {
    const oldest = fullPhotoCache.keys().next().value;
    if (oldest) fullPhotoCache.delete(oldest);
  }
  fullPhotoCache.set(id, dataUrl);
}

export function forgetPhotoFull(id: string): void {
  fullPhotoCache.delete(id);
}
