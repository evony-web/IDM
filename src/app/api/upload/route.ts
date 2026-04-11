import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (graceful — missing env vars won't crash the module)
const CLOUDINARY_CONFIGURED =
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn('[Upload] Cloudinary not configured — CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing');
}

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Upload folders in Cloudinary
const FOLDER_MAP: Record<string, string> = {
  avatars: 'idm/avatars',
  logos: 'idm/logos',
  proof: 'idm/proof',
  qris: 'idm/qris',
};

// Transformations for different types (applied on upload)
const TRANSFORMATIONS: Record<string, object> = {
  avatars: { width: 512, height: 512, crop: 'limit', quality: 'auto:good' },
  logos: { width: 512, height: 512, crop: 'limit', quality: 'auto:best' },
  proof: { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' },
  qris: { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
};

export async function POST(request: NextRequest) {
  try {
    if (!CLOUDINARY_CONFIGURED) {
      return NextResponse.json(
        { error: 'Upload service not configured. Missing Cloudinary environment variables.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'avatars';

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5MB' },
        { status: 400 }
      );
    }

    // Get folder and transformation settings
    const folder = FOLDER_MAP[type] || FOLDER_MAP.avatars;
    const transformation = TRANSFORMATIONS[type] || TRANSFORMATIONS.avatars;

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    // Note: We upload original, then serve WebP via URL transformation
    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      transformation: [transformation, { fetch_format: 'webp' }],
      resource_type: 'image',
      overwrite: true,
      invalidate: true,
    });

    // Generate WebP URL explicitly
    // Cloudinary serves WebP via URL transformation
    const webpUrl = cloudinary.url(result.public_id, {
      secure: true,
      transformation: [transformation, { fetch_format: 'webp' }],
    });

    // Return WebP URL
    return NextResponse.json({
      success: true,
      url: webpUrl,
      originalUrl: result.secure_url,
      publicId: result.public_id,
      filename: result.public_id.split('/').pop(),
      width: result.width,
      height: result.height,
      format: 'webp',
      size: result.bytes,
      provider: 'cloudinary',
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengupload file';
    return NextResponse.json(
      { error: `Upload gagal: ${errorMessage}` },
      { status: 500 }
    );
  }
}
