import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

// Keys stored in Settings table
const RULES_KEY = 'landing_rules';
const TOURNAMENT_INFO_KEY = 'landing_tournament_info';

// Default content
const DEFAULT_RULES = {
  title: 'Rules',
  items: [
    'Wajib menggunakan akun yang terdaftar di platform.',
    'Peserta wajib hadir 15 menit sebelum turnamen dimulai.',
    'Penggunaan cheat/exploit akan mengakibatkan diskualifikasi.',
    'Keputusan admin bersifat final dan tidak dapat diganggu gugat.',
    'Turnamen menggunakan sistem single elimination.',
  ],
};

const DEFAULT_TOURNAMENT_INFO = {
  title: 'Tentang Turnamen',
  description: 'IDOL META adalah platform turnamen esports yang mengadakan kompetisi mingguan untuk pemain dari berbagai tingkat kemampuan. Bergabunglah dengan komunitas kami dan buktikan kemampuanmu!',
  features: [
    { icon: 'Trophy', label: 'Hadiah Mingguan', value: 'Prize pool dari donasi & sawer' },
    { icon: 'Users', label: 'Komunitas Aktif', value: 'Bergabung dengan club dan bertanding' },
    { icon: 'Zap', label: 'ELO Rating', value: 'Sistem ranking berbasis kemampuan' },
  ],
};

// GET - Fetch landing content (public, no admin required)
export async function GET() {
  try {
    const [rulesSetting, infoSetting] = await Promise.all([
      db.settings.findUnique({ where: { key: RULES_KEY } }),
      db.settings.findUnique({ where: { key: TOURNAMENT_INFO_KEY } }),
    ]);

    const rules = rulesSetting ? JSON.parse(rulesSetting.value) : DEFAULT_RULES;
    const tournamentInfo = infoSetting ? JSON.parse(infoSetting.value) : DEFAULT_TOURNAMENT_INFO;

    return NextResponse.json({ success: true, rules, tournamentInfo });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch landing content' },
      { status: 500 }
    );
  }
}

// PUT - Update landing content (admin only)
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { rules, tournamentInfo } = body as {
      rules?: { title: string; items: string[] };
      tournamentInfo?: {
        title: string;
        description: string;
        features: Array<{ icon: string; label: string; value: string }>;
      };
    };

    const updates: Promise<unknown>[] = [];

    if (rules) {
      if (!rules.title || !Array.isArray(rules.items)) {
        return NextResponse.json(
          { success: false, error: 'Rules must have title and items array' },
          { status: 400 }
        );
      }
      const value = JSON.stringify(rules);
      updates.push(
        db.settings.upsert({
          where: { key: RULES_KEY },
          create: { key: RULES_KEY, value, description: 'Landing page rules section' },
          update: { value },
        })
      );
    }

    if (tournamentInfo) {
      if (!tournamentInfo.title || !tournamentInfo.description) {
        return NextResponse.json(
          { success: false, error: 'Tournament info must have title and description' },
          { status: 400 }
        );
      }
      const value = JSON.stringify(tournamentInfo);
      updates.push(
        db.settings.upsert({
          where: { key: TOURNAMENT_INFO_KEY },
          create: { key: TOURNAMENT_INFO_KEY, value, description: 'Landing page tournament info section' },
          update: { value },
        })
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No content provided to update' },
        { status: 400 }
      );
    }

    await Promise.all(updates);
    return NextResponse.json({ success: true, message: 'Landing content updated' });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update landing content' },
      { status: 500 }
    );
  }
}
