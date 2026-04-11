import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

// GET all video highlights (admin)
export async function GET(request: Request) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const highlights = await db.videoHighlight.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: highlights });
  } catch (error) {
    console.error('[VideoHighlights] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch video highlights', detail: String(error) }, { status: 500 });
  }
}

// POST create a new video highlight
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    const { title, youtubeUrl, division, sortOrder } = body as {
      title: string;
      youtubeUrl: string;
      division?: string;
      sortOrder?: number;
    };

    if (!title || !youtubeUrl) {
      return NextResponse.json({ success: false, error: 'Title and YouTube URL are required' }, { status: 400 });
    }

    // Extract YouTube video ID
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const highlight = await db.videoHighlight.create({
      data: {
        title,
        youtubeUrl,
        division: division || 'all',
        sortOrder: sortOrder ?? 0,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: highlight });
  } catch (error) {
    console.error('[VideoHighlights] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create video highlight', detail: String(error) }, { status: 500 });
  }
}

// PUT update a video highlight
export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    const { id, title, youtubeUrl, division, sortOrder, isActive } = body as {
      id: string;
      title?: string;
      youtubeUrl?: string;
      division?: string;
      sortOrder?: number;
      isActive?: boolean;
    };

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    if (youtubeUrl) {
      const videoId = extractYouTubeId(youtubeUrl);
      if (!videoId) {
        return NextResponse.json({ success: false, error: 'Invalid YouTube URL' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;
    if (division !== undefined) updateData.division = division;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const highlight = await db.videoHighlight.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: highlight });
  } catch (error) {
    console.error('[VideoHighlights] PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update video highlight', detail: String(error) }, { status: 500 });
  }
}

// DELETE a video highlight
export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await db.videoHighlight.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Video highlight deleted' });
  } catch (error) {
    console.error('[VideoHighlights] DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete video highlight', detail: String(error) }, { status: 500 });
  }
}

// Helper: Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
