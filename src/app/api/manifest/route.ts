// Dynamic PWA Manifest API — generates manifest.json from database settings
// Falls back to env vars, then to generic defaults
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_LOGO_URL } from '@/lib/server-utils';

// Theme color mapping
const THEME_COLORS: Record<string, string> = {
  light: '#ffffff',
  dark: '#0B0B0F',
};

// Fallback defaults (used when DB is empty and env vars are unset)
const DEFAULTS = {
  app_name: process.env.NEXT_PUBLIC_APP_NAME || 'Esports Tournament Platform',
  app_description:
    'Premium esports tournament platform. Weekly tournaments, bracket systems, leaderboard, dan competitive gaming experience.',
  logo_url:
    process.env.NEXT_PUBLIC_LOGO_URL ||
    DEFAULT_LOGO_URL,
  default_theme: 'dark',
};

export async function GET() {
  try {
    // Resolve settings: DB → env → defaults
    let appName = DEFAULTS.app_name;
    let appDescription = DEFAULTS.app_description;
    let logoUrl = DEFAULTS.logo_url;
    let defaultTheme = DEFAULTS.default_theme;

    if (db?.settings) {
      try {
        const allSettings = await db.settings.findMany();
        const settingsMap = Object.fromEntries(
          allSettings.map((s) => [s.key, s.value])
        );

        if (settingsMap.app_name) appName = settingsMap.app_name;
        if (settingsMap.app_description)
          appDescription = settingsMap.app_description;
        if (settingsMap.logo_url) logoUrl = settingsMap.logo_url;
        if (settingsMap.default_theme) defaultTheme = settingsMap.default_theme;
      } catch (dbError) {
        console.error('[Manifest API] DB read error, using defaults:', dbError);
      }
    }

    // Env vars override DB for logo (security-sensitive like settings API)
    if (process.env.NEXT_PUBLIC_APP_NAME)
      appName = process.env.NEXT_PUBLIC_APP_NAME;
    if (process.env.NEXT_PUBLIC_LOGO_URL)
      logoUrl = process.env.NEXT_PUBLIC_LOGO_URL;

    // Derive values
    const shortName = appName.slice(0, 12);
    const themeColor = THEME_COLORS[defaultTheme] || THEME_COLORS.dark;

    const manifest = {
      name: appName,
      short_name: shortName,
      description: appDescription,
      start_url: '/',
      display: 'standalone' as const,
      background_color: '#050507',
      theme_color: themeColor,
      orientation: 'portrait-primary' as const,
      icons: [
        {
          src: logoUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['sports', 'entertainment', 'games'],
      shortcuts: [
        {
          name: 'Male Division',
          short_name: 'Male',
          url: '/?division=male',
          icons: [{ src: logoUrl, sizes: '192x192' }],
        },
        {
          name: 'Female Division',
          short_name: 'Female',
          url: '/?division=female',
          icons: [{ src: logoUrl, sizes: '192x192' }],
        },
      ],
    };

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[Manifest API] Error:', error);

    // Last-resort fallback — minimal valid manifest
    const fallback = {
      name: DEFAULTS.app_name,
      short_name: DEFAULTS.app_name.slice(0, 12),
      description: DEFAULTS.app_description,
      start_url: '/',
      display: 'standalone' as const,
      background_color: '#050507',
      theme_color: '#0B0B0F',
      orientation: 'portrait-primary' as const,
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['sports', 'entertainment', 'games'],
      shortcuts: [],
    };

    return new NextResponse(JSON.stringify(fallback, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
}
