import { uploadTripCover } from './coverStorage';

/** Utility functions for compressing and handling images. */

/**
 * Converts images to compressed Base64 by default.
 * The trip-cover call currently uses 1400x900 / 0.82; only that call is uploaded
 * to Firebase Storage and returns a download URL. Journal/note images keep the
 * existing Base64 behavior unchanged.
 */
export async function fileToBase64(
  file: File,
  maxWidth: number = 1000,
  maxHeight: number = 1000,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Tệp không phải là hình ảnh hợp lệ.'));
      return;
    }

    const isTripCover = maxWidth === 1400 && maxHeight === 900 && quality === 0.82;
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể tải hình ảnh.'));

      img.onload = async () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Không thể xử lý ảnh trên thiết bị này.'));
            return;
          }

          const maxKb = isTripCover ? 600 : 600;
          let currentQuality = Math.min(quality, 0.78);
          let currentWidth = width;
          let currentHeight = height;
          let result = '';

          for (let attempt = 0; attempt < 8; attempt += 1) {
            canvas.width = Math.max(1, Math.round(currentWidth));
            canvas.height = Math.max(1, Math.round(currentHeight));
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            result = canvas.toDataURL('image/jpeg', currentQuality);
            if (getBase64SizeKB(result) <= maxKb) {
              resolve(isTripCover ? await uploadTripCover(result) : result);
              return;
            }

            currentWidth *= 0.85;
            currentHeight *= 0.85;
            currentQuality = Math.max(0.5, currentQuality - 0.07);
          }

          if (result && getBase64SizeKB(result) <= maxKb) {
            resolve(isTripCover ? await uploadTripCover(result) : result);
          } else {
            reject(new Error('Ảnh quá lớn để đồng bộ. Vui lòng chọn ảnh khác.'));
          }
        } catch (err) {
          console.warn('Image processing/upload failed:', err);
          reject(new Error(isTripCover ? 'Không thể tải ảnh bìa lên đám mây.' : 'Không thể tối ưu hình ảnh.'));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/** Calculates approximate size in KB of a Base64 string. */
export function getBase64SizeKB(base64Str: string): number {
  if (!base64Str) return 0;
  const padding = base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0;
  const commaIndex = base64Str.indexOf(',');
  const base64Len = base64Str.length - (commaIndex + 1);
  const bytes = (base64Len * 3) / 4 - padding;
  return Math.round(bytes / 1024);
}
