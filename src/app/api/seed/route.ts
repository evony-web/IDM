import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to seed database',
    instructions: 'Run: curl -X POST http://localhost:3000/api/seed',
  });
}

// ═══ CLUBS ═══
const clubs = [
  'SOUTHERN', 'PARANOID', 'MAXIMOUS', 'SALVADOR', 'EUPHORIC',
  'ALQA', 'RESTART', 'MYSTERY', 'GYMSHARK', 'SECRETS',
  'ARNBE', 'JASMINE', 'YAKUZA', 'CROWN', 'QUEEN',
  'PSALM', 'TOGETHER', 'ORPHIC', 'AVENUE', 'SENSEI',
  'ORPIC', 'RNB', 'PLAT R',
];

// ═══ FEMALE PLAYERS ═══
const femaleParticipants = [
  { nickname: 'Indy', club: 'MAXIMOUS', total: 275 },
  { nickname: 'skylin', club: 'EUPHORIC', total: 194 },
  { nickname: 'cheeyaqq', club: 'SECRETS', total: 110 },
  { nickname: 'Vion', club: 'QUEEN', total: 200 },
  { nickname: 'Veronicc', club: 'PARANOID', total: 225 },
  { nickname: 'Liz', club: 'SOUTHERN', total: 155 },
  { nickname: 'Afrona', club: 'SOUTHERN', total: 83 },
  { nickname: 'Elvareca', club: 'EUPHORIC', total: 188 },
  { nickname: 'weywey', club: 'RNB', total: 157 },
  { nickname: 'cami', club: 'MAXIMOUS', total: 90 },
  { nickname: 'mishelle', club: 'PARANOID', total: 0 },
  { nickname: 'kacee', club: 'MAXIMOUS', total: 178 },
  { nickname: 'irazz', club: 'PARANOID', total: 130 },
  { nickname: 'ciki_w', club: 'TOGETHER', total: 80 },
  { nickname: 'reptil', club: 'SOUTHERN', total: 470 },
  { nickname: 'meatry', club: 'YAKUZA', total: 201 },
  { nickname: 'AiTan', club: 'PARANOID', total: 495 },
  { nickname: 'arcalya', club: 'SOUTHERN', total: 240 },
  { nickname: 's_melin', club: 'PLAT R', total: 54 },
  { nickname: 'yoonabi', club: 'PARANOID', total: 37 },
  { nickname: 'Eive', club: 'PSALM', total: 0 },
  { nickname: 'damncil', club: 'EUPHORIC', total: 37 },
  { nickname: 'dysa', club: 'RESTART', total: 305 },
  { nickname: 'yaaay', club: 'YAKUZA', total: 67 },
  { nickname: 'moy', club: 'YAKUZA', total: 90 },
  { nickname: 'EVONY', club: 'GYMSHARK', total: 40 },
];

// ═══ MALE PLAYERS ═══
const maleParticipants = [
  { nickname: 'cepz', club: 'SALVADOR', total: 0 },
  { nickname: 'Afroki', club: 'SOUTHERN', total: 421 },
  { nickname: 'Airuen', club: 'AVENUE', total: 450 },
  { nickname: 'Life', club: 'SALVADOR', total: 118 },
  { nickname: 'Armors', club: 'SOUTHERN', total: 363 },
  { nickname: 'Bambang', club: 'MAXIMOUS', total: 153 },
  { nickname: 'ziafu', club: 'MYSTERY', total: 400 },
  { nickname: 'afi', club: 'MAXIMOUS', total: 100 },
  { nickname: 'Kageno', club: 'AVENUE', total: 117 },
  { nickname: 'janskie', club: 'SOUTHERN', total: 245 },
  { nickname: 'zico', club: 'EUPHORIC', total: 125 },
  { nickname: 'Vriskey_', club: 'EUPHORIC', total: 66 },
  { nickname: 'astro', club: 'MAXIMOUS', total: 37 },
  { nickname: 'ipinnn', club: 'GYMSHARK', total: 233 },
  { nickname: 'sheraid', club: 'MAXIMOUS', total: 54 },
  { nickname: 'yay', club: 'MAXIMOUS', total: 319 },
  { nickname: 'Oura', club: 'SALVADOR', total: 287 },
  { nickname: 'Jave', club: 'RESTART', total: 200 },
  { nickname: 'zmz', club: 'ALQA', total: 390 },
  { nickname: 'Georgie', club: 'ALQA', total: 84 },
  { nickname: 'Chrollo', club: 'EUPHORIC', total: 138 },
  { nickname: 'Vankless', club: 'SOUTHERN', total: 305 },
  { nickname: 'Dylee', club: 'SENSEI', total: 120 },
  { nickname: 'Earth', club: 'MAXIMOUS', total: 130 },
  { nickname: 'chikoo', club: 'SENSEI', total: 69 },
  { nickname: 'fyy', club: 'GYMSHARK', total: 100 },
  { nickname: 'montiel', club: 'PARANOID', total: 75 },
  { nickname: 'marimo', club: 'SECRETS', total: 242 },
  { nickname: 'tonsky', club: 'MAXIMOUS', total: 100 },
  { nickname: 'Ren', club: 'MAXIMOUS', total: 67 },
  { nickname: 'RIVALDO', club: 'EUPHORIC', total: 186 },
  { nickname: 'jugger', club: 'GYMSHARK', total: 66 },
  { nickname: 'WHYSON', club: 'RESTART', total: 199 },
  { nickname: 'DUUL', club: 'PARANOID', total: 0 },
  { nickname: 'ZORO', club: 'PARANOID', total: 0 },
  { nickname: 'VICKY', club: 'MAXIMOUS', total: 80 },
  { nickname: 'CARAOSEL', club: 'ORPIC', total: 87 },
  { nickname: 'KIERAN', club: 'MAXIMOUS', total: 0 },
  { nickname: 'RONALD', club: 'MAXIMOUS', total: 0 },
  { nickname: 'KIRA', club: 'SOUTHERN', total: 0 },
  { nickname: 'XIAOPEI', club: 'CROWN', total: 0 },
  { nickname: 'ZABYER', club: 'JASMINE', total: 0 },
  { nickname: 'VBBOY', club: 'AVENUE', total: 0 },
  { nickname: 'justice', club: 'EUPHORIC', total: 133 },
  { nickname: 'TAZOS', club: 'GYMSHARK', total: 106 },
];

function getTier(total: number): string {
  if (total >= 400) return 'S';
  if (total >= 200) return 'A';
  return 'B';
}

export async function POST() {
  const startTime = Date.now();

  try {
    console.log('🌱 Starting comprehensive seed...');

    // ── Clear all data ──
    const tables = [
      () => db.playerMatchStat.deleteMany(),
      () => db.teamMember.deleteMany(),
      () => db.match.deleteMany(),
      () => db.team.deleteMany(),
      () => db.registration.deleteMany(),
      () => db.sawer.deleteMany(),
      () => db.donation.deleteMany(),
      () => db.ranking.deleteMany(),
      () => db.character.deleteMany(),
      () => db.activityLog.deleteMany(),
      () => db.botLog.deleteMany(),
      () => db.user.deleteMany(),
      () => db.tournament.deleteMany(),
      () => db.club.deleteMany(),
      () => db.settings.deleteMany(),
      () => db.whatsAppSettings.deleteMany(),
    ];

    for (const del of tables) {
      try { await del(); } catch { /* ignore */ }
    }
    console.log('  ✓ Cleared all data');

    // ── Create clubs ──
    const clubIds = Object.fromEntries(clubs.map(c => [c, uuidv4()]));
    await db.club.createMany({
      data: clubs.map(name => ({
        id: clubIds[name],
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        updatedAt: new Date(),
      })),
    });
    console.log(`  ✓ Created ${clubs.length} clubs`);

    // ── Create admin ──
    const adminId = uuidv4();
    const adminHash = createHash('sha256').update('tazevsta').digest('hex');
    await db.user.create({
      data: {
        id: adminId,
        name: 'tazos',
        email: 'superadmin@idm.local',
        gender: 'male',
        tier: 'S',
        points: 0,
        role: 'super_admin',
        adminPass: adminHash,
        permissions: JSON.stringify({
          tournament: true, players: true, bracket: true, scores: true,
          prize: true, donations: true, full_reset: true, manage_admins: true,
        }),
        isAdmin: true,
      },
    });
    console.log('  ✓ Created admin (tazos / tazevsta)');

    // ── Create female users ──
    const femaleUsers = femaleParticipants.map(p => ({
      id: uuidv4(),
      name: p.nickname,
      email: `${p.nickname.toLowerCase()}@idm.local`,
      gender: 'female' as const,
      tier: getTier(p.total),
      points: p.total,
      clubId: clubIds[p.club] || null,
      avatar: null,
      phone: `+62${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    }));

    await db.user.createMany({ data: femaleUsers });
    console.log(`  ✓ Created ${femaleUsers.length} female players`);

    // ── Create male users ──
    const maleUsers = maleParticipants.map(p => ({
      id: uuidv4(),
      name: p.nickname,
      email: `${p.nickname.toLowerCase()}@idm.local`,
      gender: 'male' as const,
      tier: getTier(p.total),
      points: p.total,
      clubId: clubIds[p.club] || null,
      avatar: null,
      phone: `+62${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    }));

    await db.user.createMany({ data: maleUsers });
    console.log(`  ✓ Created ${maleUsers.length} male players`);

    // ── Create WhatsApp settings ──
    await db.whatsAppSettings.create({
      data: {
        id: uuidv4(),
        provider: 'baileys',
        isActive: true,
        baileysEnabled: true,
        connectionStatus: 'disconnected',
        updatedAt: new Date(),
      },
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Seed completed in ${elapsed}ms!`);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      elapsed: `${elapsed}ms`,
      stats: {
        admin: 1,
        clubs: clubs.length,
        femalePlayers: femaleUsers.length,
        malePlayers: maleUsers.length,
        totalPlayers: femaleUsers.length + maleUsers.length,
      },
      adminCredentials: { username: 'tazos', password: 'tazevsta' },
    });
  } catch (error) {
    console.error('Error seeding:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
