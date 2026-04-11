/**
 * Image compression utility for client-side use.
 * Compresses images before converting to base64 to stay within
 * Vercel serverless limits (4.5MB body) and database size constraints.
 */

/**
 * Compress an image file using canvas API.
 * Resizes to maxWidth and compresses as JPEG.
 * 
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 512 for avatars)
 * @param quality - JPEG quality 0-1 (default: 0.75)
 * @param maxBase64Size - Max base64 string size in bytes (default: 500KB)
 * @returns Base64 data URL string
 */
export async function compressImageToBase64(
  file: File,
  maxWidth: number = 400,
  quality: number = 0.5,
  maxBase64Size: number = 200 * 1024  // 200KB max for Vercel safety (well under 500KB limit)
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Try converting with requested quality
        let base64 = canvas.toDataURL('image/jpeg', quality);

        // If still too large, progressively reduce quality
        if (base64.length > maxBase64Size) {
          base64 = canvas.toDataURL('image/jpeg', 0.5);
        }
        if (base64.length > maxBase64Size) {
          base64 = canvas.toDataURL('image/jpeg', 0.3);
        }
        // If STILL too large, resize smaller
        if (base64.length > maxBase64Size) {
          const canvas2 = document.createElement('canvas');
          const smallerWidth = 256;
          const smallerHeight = Math.round((img.height * smallerWidth) / img.width);
          canvas2.width = smallerWidth;
          canvas2.height = smallerHeight;
          const ctx2 = canvas2.getContext('2d');
          if (ctx2) {
            ctx2.drawImage(img, 0, 0, smallerWidth, smallerHeight);
            base64 = canvas2.toDataURL('image/jpeg', 0.5);
          }
        }

        // Cleanup
        URL.revokeObjectURL(img.src);
        resolve(base64);
      } catch (err) {
        URL.revokeObjectURL(img.src);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert file to base64 without compression (for proof images etc.)
 * Still enforces a reasonable size limit.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
