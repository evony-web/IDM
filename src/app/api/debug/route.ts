import { NextResponse } from 'next/server';

/**
 * Debug endpoint — DEV ONLY. Blocked in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const databaseUrl = process.env.DATABASE_URL || '';

  const maskUrl = (url: string) => {
    if (!url) return 'not set';
    try {
      const parsed = new URL(url);
      parsed.password = '***';
      return parsed.toString().substring(0, 60) + '...';
    } catch {
      return url.substring(0, 30) + '...';
    }
  };

  const info = {
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      hasDatabaseUrl: !!databaseUrl,
      databaseUrlFormat: databaseUrl.startsWith('file:') ? 'SQLite file' : databaseUrl.startsWith('postgres') ? 'PostgreSQL' : databaseUrl ? 'Unknown' : 'not set',
      databaseUrlMasked: maskUrl(databaseUrl),
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1 as test`;

    return NextResponse.json({
      ...info,
      database: {
        connected: true,
        message: 'Database connection successful',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      ...info,
      database: {
        connected: false,
        error: errorMessage,
      },
    }, { status: 500 });
  }
}
