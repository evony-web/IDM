import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dagoryri5';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_AUTH_CONFIGURED = !!(API_KEY && API_SECRET);

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  folder: string;
  filename: string;
  display_name: string;
}

async function fetchCloudinaryResources(prefix: string): Promise<CloudinaryResource[]> {
  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
  const allResources: CloudinaryResource[] = [];
  let nextCursor: string | null = null;

  do {
    let url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?prefix=${prefix}&max_results=500&type=upload`;
    if (nextCursor) {
      url += `&next_cursor=${encodeURIComponent(nextCursor)}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloudinary API error: ${res.status} - ${text}`);
    }

    const data = await res.json();
    const resources: CloudinaryResource[] = (data.resources || []).map((r: Record<string, unknown>) => ({
      public_id: r.public_id as string,
      secure_url: r.secure_url as string,
      url: r.url as string,
      width: r.width as number,
      height: r.height as number,
      format: r.format as string,
      bytes: r.bytes as number,
      created_at: r.created_at as string,
      folder: (r.public_id as string).split('/').slice(0, -1).join('/'),
      filename: (r.public_id as string).split('/').pop() || '',
      display_name: (r.public_id as string).split('/').pop()?.replace(/\.[^/.]+$/, '') || '',
    }));

    allResources.push(...resources);
    nextCursor = data.next_cursor || null;
  } while (nextCursor);

  return allResources;
}

export async function GET(request: Request) {
  const adminCheck = await requireAdmin(request as NextRequest);
  if (adminCheck) return adminCheck;

  try {
    if (!CLOUDINARY_AUTH_CONFIGURED) {
      return NextResponse.json(
        { success: false, error: 'Cloudinary not configured. Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET.' },
        { status: 503 },
      );
    }

    // Fetch Cloudinary images for all three folders in parallel
    const [avatars, logos, banners] = await Promise.all([
      fetchCloudinaryResources('idm/avatars').catch((e) => {
        console.error('[Cloudinary Restore] Failed to fetch avatars:', e);
        return [] as CloudinaryResource[];
      }),
      fetchCloudinaryResources('idm/logos').catch((e) => {
        console.error('[Cloudinary Restore] Failed to fetch logos:', e);
        return [] as CloudinaryResource[];
      }),
      fetchCloudinaryResources('idm/banners').catch((e) => {
        console.error('[Cloudinary Restore] Failed to fetch banners:', e);
        return [] as CloudinaryResource[];
      }),
    ]);

    // Fetch male players and clubs from DB
    const [malePlayers, clubs] = await Promise.all([
      db.user.findMany({
        where: { gender: 'male' },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          tier: true,
          points: true,
        },
        orderBy: [{ points: 'desc' }, { name: 'asc' }],
      }),
      db.club.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        avatars,
        logos,
        banners,
        malePlayers,
        clubs,
      },
    });
  } catch (error) {
    console.error('[Cloudinary Restore] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Cloudinary resources' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin(request as NextRequest);
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    const { type, userId, clubId, cloudinaryUrl, settingKey } = body as {
      type: 'avatar' | 'logo' | 'banner';
      userId?: string;
      clubId?: string;
      cloudinaryUrl?: string;
      settingKey?: string;
    };

    if (!type || !cloudinaryUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, cloudinaryUrl' },
        { status: 400 },
      );
    }

    if (type === 'avatar') {
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'userId is required for avatar update' },
          { status: 400 },
        );
      }

      const user = await db.user.update({
        where: { id: userId },
        data: { avatar: cloudinaryUrl },
        select: { id: true, name: true, avatar: true },
      });

      return NextResponse.json({
        success: true,
        message: `Avatar updated for ${user.name}`,
        data: user,
      });
    }

    if (type === 'logo') {
      if (!clubId) {
        return NextResponse.json(
          { success: false, error: 'clubId is required for logo update' },
          { status: 400 },
        );
      }

      const club = await db.club.update({
        where: { id: clubId },
        data: { logoUrl: cloudinaryUrl },
        select: { id: true, name: true, logoUrl: true },
      });

      return NextResponse.json({
        success: true,
        message: `Logo updated for ${club.name}`,
        data: club,
      });
    }

    if (type === 'banner') {
      if (!settingKey) {
        return NextResponse.json(
          { success: false, error: 'settingKey is required for banner update' },
          { status: 400 },
        );
      }

      const validKeys = ['banner_male_url', 'banner_female_url'];
      if (!validKeys.includes(settingKey)) {
        return NextResponse.json(
          { success: false, error: `Invalid settingKey. Must be one of: ${validKeys.join(', ')}` },
          { status: 400 },
        );
      }

      const setting = await db.settings.upsert({
        where: { key: settingKey },
        create: {
          key: settingKey,
          value: cloudinaryUrl,
          description: settingKey === 'banner_male_url'
            ? 'Male division MVP banner image URL'
            : 'Female division MVP banner image URL',
        },
        update: { value: cloudinaryUrl },
      });

      return NextResponse.json({
        success: true,
        message: `Banner ${settingKey} updated`,
        data: setting,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown type: ${type}` },
      { status: 400 },
    );
  } catch (error) {
    console.error('[Cloudinary Restore] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update resource' },
      { status: 500 },
    );
  }
}
