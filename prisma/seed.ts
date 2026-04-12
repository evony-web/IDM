import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── App Settings ──
  const settings = [
    { key: 'app_name', value: 'IDOL META', description: 'Application name' },
    { key: 'app_subtitle', value: 'Esports Tournament Platform', description: 'Application subtitle' },
    { key: 'app_tagline', value: 'Turnamen Esports #1 Indonesia', description: 'App tagline' },
    { key: 'app_copyright_year', value: '2025', description: 'Copyright year' },
    { key: 'app_copyright_holder', value: 'IDOL META', description: 'Copyright holder' },
    { key: 'landing_rules', value: JSON.stringify({
      title: 'Rules',
      items: [
        'Wajib menggunakan akun yang terdaftar di platform.',
        'Peserta wajib hadir 15 menit sebelum turnamen dimulai.',
        'Penggunaan cheat/exploit akan mengakibatkan diskualifikasi.',
        'Keputusan admin bersifat final dan tidak dapat diganggu gugat.',
        'Turnamen menggunakan sistem single elimination.',
      ],
    }), description: 'Landing page rules section' },
    { key: 'landing_tournament_info', value: JSON.stringify({
      title: 'Tentang Turnamen',
      description: 'IDOL META adalah platform turnamen esports yang mengadakan kompetisi mingguan untuk pemain dari berbagai tingkat kemampuan. Bergabunglah dengan komunitas kami dan buktikan kemampuanmu!',
      features: [
        { icon: 'Trophy', label: 'Hadiah Mingguan', value: 'Prize pool dari donasi & sawer' },
        { icon: 'Users', label: 'Komunitas Aktif', value: 'Bergabung dengan club dan bertanding' },
        { icon: 'Zap', label: 'ELO Rating', value: 'Sistem ranking berbasis kemampuan' },
      ],
    }), description: 'Landing page tournament info section' },
    { key: 'quick_info_items', value: JSON.stringify([
      { icon: 'Info', title: 'Cara Daftar', description: 'Daftar melalui platform, pilih divisi, dan ikuti turnamen mingguan.', color: '115,255,0' },
      { icon: 'Calendar', title: 'Jadwal Turnamen', description: 'Turnamen mingguan setiap weekend. Cek jadwal di halaman utama.', color: '56,189,248' },
      { icon: 'Heart', title: 'Donasi & Sawer', description: 'Dukung prize pool dengan donasi atau sawer pemain favoritmu.', color: '244,114,182' },
    ]), description: 'Landing page quick info cards' },
    { key: 'payment_settings', value: JSON.stringify({
      bankName: '',
      bankCode: '',
      bankNumber: '',
      bankHolder: '',
      gopayNumber: '',
      gopayHolder: '',
      ovoNumber: '',
      ovoHolder: '',
      danaNumber: '',
      danaHolder: '',
      qrisLabel: '',
      qrisImage: '',
      activeMethods: ['qris', 'bank_transfer', 'ewallet'],
    }), description: 'Payment settings' },
  ];

  for (const setting of settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
    console.log(`  ✓ Setting: ${setting.key}`);
  }

  // ── Super Admin ──
  const adminEmail = 'admin@idolmeta.id';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        role: 'super_admin',
        isAdmin: true,
        adminPass: 'idm2024',
        permissions: JSON.stringify({
          tournament: true, players: true, bracket: true, scores: true,
          prize: true, donations: true, full_reset: true, manage_admins: true,
        }),
        gender: 'male',
        tier: 'S',
      },
    });
    console.log('  ✓ Super Admin created');
  } else {
    console.log('  ✓ Super Admin already exists');
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
