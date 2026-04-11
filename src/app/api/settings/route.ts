// App Settings API — Dynamic configuration from database
// Replaces all hardcoded brand strings, payment settings, etc.
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Default settings used when no DB record exists
// These are FALLBACKS only — admin can override all via Settings panel
const DEFAULT_SETTINGS: Record<string, string> = {
  // Brand
  app_name: 'IDOL META',
  app_subtitle: 'TARKAM Fan Made Edition',
  app_tagline: 'Borneo Pride',
  app_copyright_year: new Date().getFullYear().toString(),
  app_copyright_holder: 'IDOL META',
  app_description: 'Premium esports tournament platform. Weekly tournaments, bracket systems, leaderboard, dan competitive gaming experience.',
  app_share_text: 'IDOL META — TARKAM Fan Made Tournament',

  // Logo & Images
  logo_url: process.env.NEXT_PUBLIC_LOGO_URL || 'https://res.cloudinary.com/dagoryri5/image/upload/q_auto,f_webp/idm/static/idm-logo.png',
  banner_male_url: '',
  banner_female_url: '',

  // Theme
  default_theme: 'dark',

  // Payment defaults
  bank_name: '',
  bank_code: '',
  bank_number: '',
  bank_holder: '',
  gopay_number: '',
  gopay_holder: '',
  ovo_number: '',
  ovo_holder: '',
  dana_number: '',
  dana_holder: '',
  qris_label: '',
  qris_image: '',
  active_payment_methods: '["qris","bank_transfer","ewallet"]',

  // Tournament defaults
  default_mode: 'GR Arena 3vs3',
  default_bpm: '130',
  default_lokasi: '',
  default_bracket_type: 'single_elimination',
  tournament_name_template_male: 'IDOL META - Week {week}',
  tournament_name_template_female: 'IDOL META - Week {week}',

  // Bot URLs (not returned to public)
  whatsapp_bot_url: process.env.WHATSAPP_BOT_URL || '',
  discord_bot_url: process.env.DISCORD_BOT_URL || '',

  // AI
  ai_system_prompt: 'You are an AI Tournament Assistant for an esports tournament platform. Help users with tournament info, player stats, and match results. Be friendly and concise.',

  // OG Image
  og_base_url: process.env.NEXTAUTH_URL || '',

  // Season tracking
  current_season: '1',
};

// GET /api/settings — Public: returns non-sensitive settings for client
export async function GET() {
  try {
    if (!db?.settings) {
      return NextResponse.json({
        success: true,
        settings: getPublicSettings(DEFAULT_SETTINGS),
      });
    }

    const allSettings = await db.settings.findMany();
    const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));

    // Merge: DB values override defaults, env overrides DB for sensitive keys
    const merged = { ...DEFAULT_SETTINGS, ...settingsMap };

    // Env vars always take precedence for security-sensitive items
    if (process.env.NEXT_PUBLIC_LOGO_URL) merged.logo_url = process.env.NEXT_PUBLIC_LOGO_URL;
    if (process.env.WHATSAPP_BOT_URL) merged.whatsapp_bot_url = process.env.WHATSAPP_BOT_URL;
    if (process.env.DISCORD_BOT_URL) merged.discord_bot_url = process.env.DISCORD_BOT_URL;
    if (process.env.NEXTAUTH_URL) merged.og_base_url = process.env.NEXTAUTH_URL;

    return NextResponse.json({
      success: true,
      settings: getPublicSettings(merged),
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[Settings API] Error:', error);
    return NextResponse.json({
      success: true,
      settings: getPublicSettings(DEFAULT_SETTINGS),
    });
  }
}

// PUT /api/settings — Admin: update settings
export async function PUT(request: Request) {
  try {
    if (!db?.settings) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 503 });
    }

    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid settings data' }, { status: 400 });
    }

    // Validate current_season is a positive integer if provided
    if (settings.current_season !== undefined) {
      const seasonNum = parseInt(settings.current_season, 10);
      if (isNaN(seasonNum) || seasonNum < 1) {
        return NextResponse.json({ success: false, error: 'current_season must be a positive integer' }, { status: 400 });
      }
    }

    // Upsert each setting
    const upserts = Object.entries(settings).map(([key, value]) =>
      db.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );

    await Promise.all(upserts);

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('[Settings API] PUT Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}

// Filter out sensitive settings for public API
function getPublicSettings(all: Record<string, string>): Record<string, string> {
  const sensitive = ['whatsapp_bot_url', 'discord_bot_url', 'ai_system_prompt', 'og_base_url'];
  // current_season is public (needed for leaderboard)
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(all)) {
    if (!sensitive.includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}
