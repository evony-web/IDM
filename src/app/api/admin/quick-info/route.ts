import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const QUICK_INFO_KEY = 'quick_info_items';

// Default QuickInfo items (used if no settings exist yet)
const DEFAULT_ITEMS = [
  {
    icon: 'Info',
    title: 'Cara Daftar',
    description: 'Pergi ke halaman Tournament di divisi pilihanmu, isi formulir pendaftaran dengan data diri yang valid. Tunggu approval dari admin.',
    color: '115,255,0',
  },
  {
    icon: 'Calendar',
    title: 'Jadwal Turnamen',
    description: 'Turnamen diadakan setiap minggu. Jadwal dan detail mode akan diumumkan melalui dashboard masing-masing divisi.',
    color: '56,189,248',
  },
  {
    icon: 'Heart',
    title: 'Donasi & Sawer',
    description: 'Dukung turnamen dengan donasi atau sawer ke pemain favoritmu! Semua donasi akan masuk ke prize pool.',
    color: '244,114,182',
  },
];

interface QuickInfoItem {
  icon: string;
  title: string;
  description: string;
  color: string;
}

// GET - Fetch QuickInfo items (public, no admin required)
export async function GET() {
  try {
    const setting = await db.settings.findUnique({
      where: { key: QUICK_INFO_KEY },
    });

    if (!setting) {
      return NextResponse.json({ success: true, items: DEFAULT_ITEMS });
    }

    const items: QuickInfoItem[] = JSON.parse(setting.value);
    return NextResponse.json({ success: true, items });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quick info' },
      { status: 500 }
    );
  }
}

// PUT - Update QuickInfo items (admin only)
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { items } = body as { items: QuickInfoItem[] };

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Items must be an array' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.title || !item.description) {
        return NextResponse.json(
          { success: false, error: 'Each item must have title and description' },
          { status: 400 }
        );
      }
      // Default values
      if (!item.icon) item.icon = 'Info';
      if (!item.color) item.color = '115,255,0';
    }

    const value = JSON.stringify(items);

    await db.settings.upsert({
      where: { key: QUICK_INFO_KEY },
      create: { key: QUICK_INFO_KEY, value, description: 'Quick info items for landing page bottom section' },
      update: { value },
    });

    return NextResponse.json({ success: true, message: 'Quick info updated', items });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update quick info' },
      { status: 500 }
    );
  }
}
