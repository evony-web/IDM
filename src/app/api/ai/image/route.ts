import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { uploadBase64ToCloudinary } from '@/lib/server-utils';

// Supported image sizes
const SUPPORTED_SIZES = [
  '1024x1024',  // Square
  '768x1344',   // Portrait
  '1344x768',   // Landscape
  '1440x720',   // Wide landscape
];

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '1024x1024', filename } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!SUPPORTED_SIZES.includes(size)) {
      return NextResponse.json({
        error: `Invalid size. Supported sizes: ${SUPPORTED_SIZES.join(', ')}`
      }, { status: 400 });
    }

    // Initialize ZAI
    const zai = await ZAI.create();

    // Generate image
    const response = await zai.images.generations.create({
      prompt: prompt,
      size: size
    });

    const imageBase64 = response.data[0].base64;
    if (!imageBase64) {
      throw new Error('No image data received');
    }

    // Upload to Cloudinary CDN instead of local filesystem
    const dataUrl = `data:image/png;base64,${imageBase64}`;
    const cloudinaryResult = await uploadBase64ToCloudinary(dataUrl, 'idm/generated', {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 'auto:good',
    });

    if (!cloudinaryResult) {
      // Cloudinary upload failed — return error instead of base64 fallback
      console.error('[AI Image] Cloudinary upload failed — cannot store image locally');
      return NextResponse.json({
        success: false,
        error: 'Image generated but CDN upload failed. Please try again.',
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      imageUrl: cloudinaryResult.url,
      publicId: cloudinaryResult.publicId,
      prompt: prompt,
      size: size,
      isCdn: true,
    });

  } catch (error) {
    console.error('Image Generation Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate image. Please try again.'
    }, { status: 500 });
  }
}
