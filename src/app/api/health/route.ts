import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Health Check API
 * Used by Vercel/Railway for monitoring
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`;

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      responseTime: `${Date.now() - startTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const response = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - startTime}ms`,
    };

    return NextResponse.json(response, { status: 503 });
  }
}
