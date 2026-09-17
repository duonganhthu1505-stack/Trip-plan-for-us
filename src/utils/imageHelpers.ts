/** Utility functions for compressing and handling images. */

/**
 * Converts images to compressed JPEG Base64.
 * The existing TripForm cover call is detected and constrained to 1200px / 150 KB.
 * Journal/note callers keep their existing Base64 behavior and default size target.
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

    // Keep the journal/note path unchanged; only the existing trip-cover call
    // (1400, 900, 0.82) gets the stricter Firestore-friendly compression.
    const isTripCover = maxWidth === 1400 && maxHeight === 900 && quality === 0.82;
    const effectiveMaxWidth = isTripCover ? 1200 : maxWidth;
    const effectiveMaxHeight = isTripCover ? 1200 : maxHeight;
    const effectiveQuality = isTripCover ? 0.70 : quality;
    const effectiveTargetKb = isTripCover ? 150 : targetKb;

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể tải hình ảnh.'));

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > effectiveMaxWidth || height > effectiveMaxHeight) {
            const ratio = Math.min(effectiveMaxWidth / width, effectiveMaxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Không thể xử lý ảnh trên thiết bị này.'));
            return;
          }

          let currentQuality = Math.min(effectiveQuality, 0.92);
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
            if (getBase64SizeKB(result) <= effectiveTargetKb) {
              resolve(result);
              return;
            }

            // Reduce JPEG quality first; if still too large, reduce dimensions.
            if (currentQuality > 0.42) {
              currentQuality = Math.max(0.42, currentQuality - 0.07);
            } else {
              currentWidth *= 0.85;
              currentHeight *= 0.85;
            }
          }

          if (result && getBase64SizeKB(result) <= effectiveTargetKb) {
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
