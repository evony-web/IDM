import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { uploadBase64ToCloudinary } from '@/lib/server-utils';

// POST /api/generate-avatar — generate one character avatar
export async function POST(request: NextRequest) {
  try {
    const { slug, prompt } = await request.json();

    if (!slug || !prompt) {
      return NextResponse.json({ error: 'slug and prompt required' }, { status: 400 });
    }

    // Check if already has a Cloudinary URL in DB
    const existing = await db.character.findUnique({ where: { slug } });
    if (existing?.imageUrl?.includes('cloudinary.com')) {
      return NextResponse.json({ success: true, message: 'Already uploaded to Cloudinary', slug, imageUrl: existing.imageUrl });
    }

    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    });

    const imageBase64 = response.data[0].base64;
    const dataUrl = `data:image/png;base64,${imageBase64}`;

    // Upload to Cloudinary CDN instead of local filesystem
    const cloudinaryResult = await uploadBase64ToCloudinary(dataUrl, 'idm/characters', {
      maxWidth: 512,
      maxHeight: 512,
      quality: 'auto:good',
    });

    let imageUrl: string;
    if (cloudinaryResult) {
      imageUrl = cloudinaryResult.url;
    } else {
      // Cloudinary upload failed — return error instead of storing base64 in DB
      console.error('[Generate Avatar] Cloudinary upload failed — cannot store base64 in DB');
      return NextResponse.json({
        error: 'Avatar generated but CDN upload failed. Please try again.',
      }, { status: 503 });
    }

    await db.character.update({
      where: { slug },
      data: { imageUrl },
    });

    return NextResponse.json({
      success: true,
      slug,
      imageUrl,
      isCdn: !!cloudinaryResult,
      message: `Generated and uploaded ${slug}`,
    });
  } catch (error: any) {
    console.error('[GENERATE AVATAR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/generate-avatar — list character generation status
export async function GET() {
  try {
    const characters = await db.character.findMany({
      select: { slug: true, imageUrl: true, gender: true },
    });

    const total = characters.length;
    const uploadedToCdn = characters.filter(c => c.imageUrl?.includes('cloudinary.com')).length;
    const notUploaded = characters.filter(c => !c.imageUrl?.includes('cloudinary.com')).length;
    const maleCount = characters.filter(c => c.gender === 'male').length;
    const femaleCount = characters.filter(c => c.gender === 'female').length;

    return NextResponse.json({
      total,
      uploadedToCdn,
      notUploaded,
      male: maleCount,
      female: femaleCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
