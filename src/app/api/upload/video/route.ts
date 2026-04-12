import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const CLOUDINARY_CONFIGURED =
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Video upload to Cloudinary for CDN caching
// Used for loading screen background video
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB for videos
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

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
    const folder = (formData.get('folder') as string) || 'idm/videos';
    const publicId = (formData.get('public_id') as string) || 'idm/videos/loading';

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Gunakan MP4, WebM, atau OGG' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 20MB' },
        { status: 400 }
      );
    }

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary as video resource
    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      public_id: publicId,
      resource_type: 'video',
      overwrite: true,
      invalidate: true,
    });

    // Generate optimized video URL
    const videoUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      secure: true,
      format: 'mp4',
    });

    return NextResponse.json({
      success: true,
      url: videoUrl,
      originalUrl: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format,
      size: result.bytes,
      provider: 'cloudinary',
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengupload video';
    return NextResponse.json(
      { error: `Upload gagal: ${errorMessage}` },
      { status: 500 }
    );
  }
}
