import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { uploadBase64ToCloudinary, deleteFromCloudinary } from '@/lib/server-utils';

const BANNER_KEYS = {
  male: 'banner_male_url',
  female: 'banner_female_url',
} as const;

export async function GET(request: Request) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const settings = await db.settings.findMany({
      where: { key: { in: Object.values(BANNER_KEYS) } },
    });

    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    return NextResponse.json({
      success: true,
      data: {
        bannerMaleUrl: settingsMap[BANNER_KEYS.male] || null,
        bannerFemaleUrl: settingsMap[BANNER_KEYS.female] || null,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch banner settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    const { bannerMaleUrl, bannerFemaleUrl } = body as {
      bannerMaleUrl?: string | null;
      bannerFemaleUrl?: string | null;
    };

    // Helper: if value is base64, upload to Cloudinary and return CDN URL
    const processBanner = async (
      value: string | null | undefined,
      key: string,
    ): Promise<string | null> => {
      if (value === undefined) return undefined as unknown as string | null;
      if (value === null) return null;

      // If it's already a Cloudinary URL, return as-is
      if (value.startsWith('https://res.cloudinary.com')) return value;

      // If it's a base64 data URL, upload to Cloudinary
      if (value.startsWith('data:image/')) {
        const folder = key === BANNER_KEYS.male ? 'idm/banners/male' : 'idm/banners/female';
        const result = await uploadBase64ToCloudinary(value, folder, {
          maxWidth: 1600,
          maxHeight: 800,
          quality: 'auto:good',
        });
        if (result) return result.url;
        // Cloudinary upload failed — return null rather than storing base64
        console.warn(`[Banner] Cloudinary upload failed for ${key} — storing null`);
        return null;
      }

      return value;
    };

    const updates: Promise<unknown>[] = [];

    if (bannerMaleUrl !== undefined) {
      const processed = await processBanner(bannerMaleUrl, BANNER_KEYS.male);
      if (processed === null) {
        updates.push(
          db.settings.deleteMany({ where: { key: BANNER_KEYS.male } }).catch(() => {}),
        );
      } else if (processed) {
        updates.push(
          db.settings.upsert({
            where: { key: BANNER_KEYS.male },
            create: { key: BANNER_KEYS.male, value: processed, description: 'Male division MVP banner image URL' },
            update: { value: processed },
          }),
        );
      }
    }

    if (bannerFemaleUrl !== undefined) {
      const processed = await processBanner(bannerFemaleUrl, BANNER_KEYS.female);
      if (processed === null) {
        updates.push(
          db.settings.deleteMany({ where: { key: BANNER_KEYS.female } }).catch(() => {}),
        );
      } else if (processed) {
        updates.push(
          db.settings.upsert({
            where: { key: BANNER_KEYS.female },
            create: { key: BANNER_KEYS.female, value: processed, description: 'Female division MVP banner image URL' },
            update: { value: processed },
          }),
        );
      }
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, message: 'Banner settings updated' });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update banner settings' }, { status: 500 });
  }
}
