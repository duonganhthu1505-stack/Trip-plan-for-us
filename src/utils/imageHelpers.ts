/**
 * Utility functions for compressing, converting, and handling images as Base64.
 */

/**
 * Converts a File or Blob into a compressed Base64 JPEG data URL.
 * Automatically resizes image to max dimensions to keep Firestore document size lean (<200KB per photo).
 */
export async function fileToBase64(
  file: File,
  maxWidth: number = 1000,
  maxHeight: number = 1000,
  quality: number = 0.75
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

          // Calculate new dimensions while keeping aspect ratio
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

          // Optional smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to Base64 JPEG
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
 * Calculates approximate size in KB of a Base64 string.
 */
export function getBase64SizeKB(base64Str: string): number {
  if (!base64Str) return 0;
  const padding = base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0;
  const base64Len = base64Str.length - (base64Str.indexOf(',') + 1);
  const bytes = (base64Len * 3) / 4 - padding;
  return Math.round(bytes / 1024);
}
