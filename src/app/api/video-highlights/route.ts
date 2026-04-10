import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division') || 'all';

    const highlights = await db.videoHighlight.findMany({
      where: {
        isActive: true,
        ...(division !== 'all' ? {
          OR: [{ division }, { division: 'all' }],
        } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: highlights });
  } catch {
    return NextResponse.json({ success: false, data: [] });
  }
}
