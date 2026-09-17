import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { storage } from '../firebase';

/** Upload only trip cover images to Firebase Storage and return the persistent URL.
 * Journal/note images intentionally do not use this helper and remain base64.
 */
export async function uploadTripCover(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;

  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const coverRef = ref(storage, `trip-covers/${uniqueId}.jpg`);
  await uploadString(coverRef, dataUrl, 'data_url', {
    contentType: 'image/jpeg',
    cacheControl: 'public,max-age=3600'
  });
  return getDownloadURL(coverRef);
}
