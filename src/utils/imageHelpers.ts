/**
 * Utility functions for compressing, converting, and handling images as Base64.
 */

/**
 * Converts a File or Blob into a high-definition Base64 JPEG data URL.
 * Preserves high resolution (up to Full HD 1920px) and crisp quality (~90%)
 * without aggressive lossy compression, as requested for HD photos.
 */
export async function fileToBase64(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.90
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('Tệp không phải là hình ảnh hợp lệ.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw base64 if image decoding fails
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Không thể tải hình ảnh.'));
        }
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Only scale down if larger than Full HD (1920x1920) to prevent browser memory exhaustion
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback if canvas 2d context unavailable
            resolve(reader.result as string);
            return;
          }

          // Smooth high quality rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to crisp HD Base64 JPEG
          const base64Data = canvas.toDataURL('image/jpeg', quality);
          resolve(base64Data);
        } catch (err) {
          console.warn('Canvas resize failed, fallback to raw base64:', err);
          resolve(reader.result as string);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Recompresses an existing Base64 data URL to a leaner size (~20KB - 28KB).
 */
export async function recompressBase64Image(
  base64Str: string,
  maxWidth: number = 600,
  maxHeight: number = 600,
  quality: number = 0.52,
  targetMaxKB: number = 28
): Promise<string> {
  // If already under target size, keep it
  if (getBase64SizeKB(base64Str) <= targetMaxKB) {
    return base64Str;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(base64Str);
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64Str);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let compressed = canvas.toDataURL('image/jpeg', quality);
        let sizeKB = getBase64SizeKB(compressed);

        if (sizeKB > targetMaxKB) {
          compressed = canvas.toDataURL('image/jpeg', Math.max(0.35, quality * 0.72));
          sizeKB = getBase64SizeKB(compressed);

          if (sizeKB > targetMaxKB) {
            const subW = Math.round(width * 0.8);
            const subH = Math.round(height * 0.8);
            const subCanvas = document.createElement('canvas');
            subCanvas.width = subW;
            subCanvas.height = subH;
            const subCtx = subCanvas.getContext('2d');
            if (subCtx) {
              subCtx.imageSmoothingEnabled = true;
              subCtx.drawImage(img, 0, 0, subW, subH);
              compressed = subCanvas.toDataURL('image/jpeg', 0.42);
            }
          }
        }

        resolve(compressed);
      } catch {
        resolve(base64Str);
      }
    };
    img.src = base64Str;
  });
}

/**
 * Calculates approximate size in KB of a Base64 string.
 */
export function getBase64SizeKB(base64Str: string): number {
  if (!base64Str) return 0;
  const padding = base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0;
  const base64Len = base64Str.length - (base64Str.indexOf(',') + 1);
  const bytes = (base64Len * 3) / 4 - padding;
  return Math.round(bytes / 1024);
}
