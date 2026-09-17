import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { storage } from '../firebase';

/** Upload only trip cover images to Firebase Storage and return the persistent URL.
 * Journal/note images intentionally do not use this helper and remain base64.
 */
export async function uploadTripCover(tripId: string, dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;

  const path = `trip-covers/${tripId}/cover.jpg`;
  const coverRef = ref(storage, path);
  await uploadString(coverRef, dataUrl, 'data_url', {
    contentType: 'image/jpeg',
    cacheControl: 'public,max-age=3600'
  });
  return getDownloadURL(coverRef);
}
