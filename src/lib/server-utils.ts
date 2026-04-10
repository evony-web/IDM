import { v2 as cloudinary } from 'cloudinary';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { IDM_LOGO_URL } from '@/lib/cdn';

// Cloud CDN constants
export const CDN = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dagoryri5',
  get baseUrl() {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload`;
  },
  /** IDM Logo — WebP optimized via Cloudinary */
  logoUrl: IDM_LOGO_URL,
  /** Generate a Cloudinary URL with auto WebP + quality */
  url(publicId: string, opts: { w?: number; h?: number; crop?: string; q?: string } = {}) {
    const parts = ['q_auto,f_webp'];
    if (opts.w && opts.h) parts.push(`w_${opts.w},h_${opts.h},c_${opts.crop || 'fill'}`);
    else if (opts.w) parts.push(`w_${opts.w},c_limit`);
    return `${this.baseUrl}/${parts.join(',')}/${publicId}`;
  },
} as const;

// Initialize Cloudinary
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
    secure: true,
  });
} catch {
  // Not configured, that's fine
}

/**
 * Upload a base64 data URL to Cloudinary with WebP conversion & resizing.
 * Returns the optimized CDN URL or null on failure.
 */
export async function uploadBase64ToCloudinary(
  base64DataUrl: string,
  folder: string = 'idm',
  options?: { maxWidth?: number; maxHeight?: number; quality?: string },
): Promise<{ url: string; publicId: string } | null> {
  try {
    const transformations: Record<string, unknown>[] = [];

    if (options?.maxWidth || options?.maxHeight) {
      transformations.push({
        width: options.maxWidth || undefined,
        height: options.maxHeight || undefined,
        crop: 'limit' as const,
      });
    }

    transformations.push({
      quality: options?.quality || 'auto:good',
      fetch_format: 'webp',
    });

    const result = await cloudinary.uploader.upload(base64DataUrl, {
      folder,
      transformation: transformations,
      resource_type: 'image',
      overwrite: true,
      invalidate: true,
    });

    // Generate CDN URL with transformations for consistent WebP delivery
    const cdnUrl = cloudinary.url(result.public_id, {
      secure: true,
      transformation: transformations,
    });

    return { url: cdnUrl, publicId: result.public_id };
  } catch {
    return null;
  }
}

/**
 * Delete a Cloudinary image by public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload a Buffer to Cloudinary (raw upload, no transformations).
 */
export async function uploadToCloudinary(buffer: Buffer, folder: string = 'idm'): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(
      `data:application/octet-stream;base64,${buffer.toString('base64')}`,
      { folder, resource_type: 'auto' },
    );
    return result.secure_url;
  } catch {
    return null;
  }
}

export function getCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  } catch {
    return null;
  }
}

export async function saveUploadFile(buffer: Buffer, filename: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'upload');
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);
  return `/upload/${filename}`;
}
