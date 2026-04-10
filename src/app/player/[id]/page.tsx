import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import PublicPlayerProfile from '@/components/esports/PublicPlayerProfile';

/* ── Static metadata ── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        name: true,
        tier: true,
        gender: true,
        points: true,
        avatar: true,
        club: { select: { name: true } },
      },
    });

    if (!user) {
      return {
        title: 'Pemain Tidak Ditemukan | IDOL META',
        description: 'Pemain dengan ID ini tidak ditemukan di platform IDOL META.',
      };
    }

    const title = `${user.name} | Profil Pemain | IDOL META`;
    const description = `Profil pemain ${user.name} - Tier ${user.tier}, ${user.points.toLocaleString()} poin${user.club ? `, Anggota ${user.club.name}` : ''}. Lihat statistik dan riwayat pertandingan di IDOL META Tournament.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        images: user.avatar ? [{ url: user.avatar, width: 200, height: 200, alt: user.name }] : undefined,
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  } catch {
    return {
      title: 'Profil Pemain | IDOL META',
      description: 'Lihat profil dan statistik pemain di platform IDOL META Tournament.',
    };
  }
}

/* ── Page Component ── */
export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Quick validation: check if user exists
  try {
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      notFound();
    }
  } catch {
    notFound();
  }

  return <PublicPlayerProfile playerId={id} />;
}
