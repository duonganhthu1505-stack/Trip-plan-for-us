/**
 * Utility functions for compressing, converting, and handling images as Base64.
 */

/**
 * Converts a File or Blob into a compressed Base64 JPEG data URL.
 * Cover images are kept comfortably below Firestore's 1 MiB document limit so
 * an edited cover can actually be persisted instead of being replaced by the
 * previous remote value on the next realtime sync.
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

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể tải hình ảnh.'));

      img.onload = () => {
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

          // A TripInfo document also contains text fields, so leave generous
          // headroom under Firestore's 1 MiB per-document hard limit.
          const MAX_COVER_KB = 600;
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
            if (getBase64SizeKB(result) <= MAX_COVER_KB) {
              resolve(result);
              return;
            }

            // Reduce both dimensions and JPEG quality until the payload is safe.
            currentWidth *= 0.85;
            currentHeight *= 0.85;
            currentQuality = Math.max(0.5, currentQuality - 0.07);
          }

          if (result && getBase64SizeKB(result) <= MAX_COVER_KB) {
            resolve(result);
          } else {
            reject(new Error('Ảnh quá lớn để đồng bộ. Vui lòng chọn ảnh khác.'));
          }
        } catch (err) {
          console.warn('Canvas resize failed:', err);
          reject(new Error('Không thể tối ưu ảnh bìa.'));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Calculates approximate size in KB of a Base64 string.
 */
export function getBase64SizeKB(base64Str: string): number {
  if (!base64Str) return 0;
  const padding = base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0;
  const commaIndex = base64Str.indexOf(',');
  const base64Len = base64Str.length - (commaIndex + 1);
  const bytes = (base64Len * 3) / 4 - padding;
  return Math.round(bytes / 1024);
}
