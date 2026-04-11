import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Debug-DB endpoint — DEV ONLY. Blocked in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const results: Record<string, unknown> = {};

  try {
    const userCount = await db.user.count();
    const clubCount = await db.club.count();
    const tournamentCount = await db.tournament.count();
    results.connection = 'OK';
    results.userCount = userCount;
    results.tables = {
      users: userCount,
      clubs: clubCount,
      tournaments: tournamentCount,
    };
  } catch (error) {
    results.connection = 'FAILED';
    results.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results, { status: 200 });
}
