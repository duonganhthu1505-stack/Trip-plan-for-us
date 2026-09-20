/** Utility functions for compressing and handling images. */

/**
 * Converts images to compressed JPEG Base64.
 * Trip covers use a fast 900px / 0.60 path with at most two encodes.
 * Journal/note callers keep their existing Base64 behavior.
 */
export async function fileToBase64(
  file: File,
  maxWidth: number = 1000,
  maxHeight: number = 1000,
  quality: number = 0.75,
  targetKb: number = 600
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Tệp không phải là hình ảnh hợp lệ.'));
      return;
    }

    // Only the existing TripForm cover call uses the fast cover path.
    // Journal/note images keep their existing compression behavior below.
    const isTripCover = maxWidth === 1400 && maxHeight === 900 && quality === 0.82;
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể tải hình ảnh.'));

      img.onload = () => {
        try {
          if (isTripCover) {
            const maxDimension = 900;
            const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
            const width = Math.max(1, Math.round(img.width * ratio));
            const height = Math.max(1, Math.round(img.height * ratio));
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Không thể xử lý ảnh trên thiết bị này.'));
              return;
            }

            const encode = (w: number, h: number, q: number) => {
              canvas.width = w;
              canvas.height = h;
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.clearRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              return canvas.toDataURL('image/jpeg', q);
            };

            // Fast path: most phone photos finish in this single encode.
            let result = encode(width, height, 0.60);
            if (getBase64SizeKB(result) <= 150) {
              resolve(result);
              return;
            }

            // One fallback only: smaller dimensions + stronger compression.
            const fallbackRatio = Math.min(1, 720 / Math.max(width, height));
            result = encode(
              Math.max(1, Math.round(width * fallbackRatio)),
              Math.max(1, Math.round(height * fallbackRatio)),
              0.50
            );

            if (getBase64SizeKB(result) <= 150) {
              resolve(result);
            } else {
              reject(new Error('Ảnh quá lớn để đồng bộ. Vui lòng chọn ảnh khác.'));
            }
            return;
          }

          // Existing generic Base64 path used by journal/note and other images.
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

          let currentQuality = Math.min(quality, 0.92);
          let currentWidth = width;
          let currentHeight = height;
          let result = '';

          for (let attempt = 0; attempt < 14; attempt += 1) {
            canvas.width = Math.max(1, Math.round(currentWidth));
            canvas.height = Math.max(1, Math.round(currentHeight));
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            result = canvas.toDataURL('image/jpeg', currentQuality);
            if (getBase64SizeKB(result) <= targetKb) {
              resolve(result);
              return;
            }

            if (currentQuality > 0.42) {
              currentQuality = Math.max(0.42, currentQuality - 0.07);
            } else {
              currentWidth *= 0.85;
              currentHeight *= 0.85;
            }
          }

          if (result && getBase64SizeKB(result) <= targetKb) {
            resolve(result);
          } else {
            reject(new Error('Ảnh quá lớn để đồng bộ. Vui lòng chọn ảnh khác.'));
          }
        } catch (err) {
          console.warn('Image processing failed:', err);
          reject(new Error('Không thể tối ưu hình ảnh.'));
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

/**
 * A small preview copy of an already-encoded photo, used by the journal grids.
 *
 * Only the preview is resized — the original data URL is never touched, so the
 * photo the user opens full-screen keeps every pixel that was uploaded. The
 * preview exists so both phones can show a photo wall without downloading
 * hundreds of megabytes.
 */
export function makeThumbnail(dataUrl: string, maxDim = 200, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof document === 'undefined') {
      resolve('');
      return;
    }
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const longest = Math.max(img.width || 1, img.height || 1);
          const scale = Math.min(1, maxDim / longest);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
          canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = dataUrl;
    } catch {
      resolve('');
    }
  });
}
