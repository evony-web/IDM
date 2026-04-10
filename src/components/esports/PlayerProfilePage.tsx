'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  Crown,
  Star,
  Award,
  Flame,
  Building2,
  Users,
  Swords,
  MapPin,
  CalendarDays,
  Hash,
  Activity,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   INTERFACES (DO NOT CHANGE)
   ═══════════════════════════════════════════════════════════════ */

interface PlayerStats {
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  averageScore: number;
  mvpCount: number;
  championCount: number;
}

interface RecentMatch {
  id: string;
  tournamentName: string;
  result: 'win' | 'loss';
  score: string;
  date: string;
  opponentName: string;
  mvpName?: string;
  bracket: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

interface ClubInfo {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  city: string | null;
  isMVP: boolean;
  mvpScore: number;
  createdAt: string;
  club: ClubInfo | null;
  stats: PlayerStats;
  recentMatches: RecentMatch[];
  achievements: Achievement[];
}

interface PlayerProfilePageProps {
  playerId: string;
  division: 'male' | 'female';
  onBack: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   TIER CONFIGURATION (expanded with C & D tiers)
   ═══════════════════════════════════════════════════════════════ */

const tierConfig: Record<string, {
  label: string;
  glowColor: string;
  badgeBg: string;
  textColor: string;
}> = {
  S: {
    label: 'Profesional',
    glowColor: 'rgba(255, 214, 10, 0.35)',
    badgeBg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    textColor: '#FFD700',
  },
  A: {
    label: 'Lanjutan',
    glowColor: 'rgba(200, 200, 210, 0.25)',
    badgeBg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
    textColor: '#C0C0C0',
  },
  B: {
    label: 'Pemula',
    glowColor: 'rgba(255, 140, 50, 0.25)',
    badgeBg: 'linear-gradient(135deg, #FF8C00 0%, #CD7F32 100%)',
    textColor: '#FF8C00',
  },
  C: {
    label: 'Rookie',
    glowColor: 'rgba(100, 180, 100, 0.20)',
    badgeBg: 'linear-gradient(135deg, #6B8E23 0%, #556B2F 100%)',
    textColor: '#8FBC8F',
  },
  D: {
    label: 'Trainee',
    glowColor: 'rgba(120, 120, 140, 0.18)',
    badgeBg: 'linear-gradient(135deg, #708090 0%, #4A5568 100%)',
    textColor: '#94A3B8',
  },
};

/* ═══════════════════════════════════════════════════════════════
   ANIMATION VARIANTS (simplified)
   ═══════════════════════════════════════════════════════════════ */

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */

function LoadingSkeleton() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: '#12141a' }}>
      {/* Header bar skeleton */}
      <div className="h-12 flex items-center px-4 gap-3" style={{ background: '#1a1d26' }}>
        <div className="w-8 h-8 rounded-lg bg-white/[0.05] animate-pulse" />
        <div className="w-32 h-5 rounded bg-white/[0.05] animate-pulse" />
      </div>

      {/* Avatar + name skeleton */}
      <div className="flex flex-col items-center py-8 px-4">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white/[0.04] animate-pulse mb-4" />
        <div className="w-40 h-7 rounded-lg bg-white/[0.05] animate-pulse mb-2" />
        <div className="w-24 h-4 rounded bg-white/[0.04] animate-pulse" />
      </div>

      {/* Section skeletons */}
      <div className="px-4 max-w-lg mx-auto space-y-6 pb-12">
        {/* Info section skeleton */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d26' }}>
          <div className="h-9 w-full bg-white/[0.03] animate-pulse" />
          <div className="px-4 py-3 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="w-20 h-3.5 rounded bg-white/[0.04] animate-pulse" />
                <div className="w-24 h-3.5 rounded bg-white/[0.06] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d26' }}>
          <div className="h-9 w-full bg-white/[0.03] animate-pulse" />
          <div className="grid grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3 text-center" style={{ background: '#1a1d26' }}>
                <div className="w-10 h-5 rounded bg-white/[0.06] animate-pulse mx-auto mb-1.5" />
                <div className="w-12 h-3 rounded bg-white/[0.04] animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Achievements skeleton */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d26' }}>
          <div className="h-9 w-full bg-white/[0.03] animate-pulse" />
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        </div>

        {/* Match history skeleton */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d26' }}>
          <div className="h-9 w-full bg-white/[0.03] animate-pulse" />
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEADER (Liquipedia-style)
   ═══════════════════════════════════════════════════════════════ */

function SectionHeader({
  title,
  accentColor,
  icon: Icon,
}: {
  title: string;
  accentColor: string;
  icon: React.ElementType;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold uppercase tracking-wider"
      style={{
        background: `linear-gradient(90deg, ${accentColor}18 0%, transparent 100%)`,
        borderBottom: `2px solid ${accentColor}30`,
        color: accentColor,
      }}
    >
      <Icon className="w-4 h-4" />
      {title}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════ */

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="px-4 py-8 text-center" style={{ background: '#15171f' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <Icon className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.15)' }} />
      </div>
      <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.30)' }}>{title}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.15)' }}>{subtitle}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function PlayerProfilePage({ playerId, division, onBack }: PlayerProfilePageProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMale = division === 'male';
  const accentColor = isMale ? '#73FF00' : '#38BDF8';
  const accentColorRGB = isMale ? '115, 255, 0' : '56, 189, 248';
  const bgColor = '#12141a';
  const cardBg = '#1a1d26';
  const cardBgAlt = '#15171f';

  /* ── Fetch profile data (unchanged) ── */
  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/users/profile?userId=${playerId}`);
        if (cancelled) return;
        if (!res.ok) {
          setError('Pemain tidak ditemukan');
          setIsLoading(false);
          return;
        }
        const json = await res.json();
        if (json.success && json.profile && !cancelled) {
          setProfile(json.profile);
        } else if (!cancelled) {
          setError('Gagal memuat profil pemain');
        }
      } catch {
        if (!cancelled) setError('Gagal memuat profil pemain');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [playerId]);

  /* ── Escape key handler (unchanged) ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack]);

  /* ── Derived data ── */
  const tier = profile ? (tierConfig[profile.tier] || tierConfig.B) : tierConfig.B;

  /* ── Error state ── */
  if (error) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
          style={{ background: bgColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Users className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.20)' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'rgba(255,255,255,0.60)' }}>Pemain Tidak Ditemukan</h2>
          <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.30)' }}>{error}</p>
          <motion.button
            onClick={onBack}
            className="px-6 py-3 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-colors"
            style={{
              color: 'rgba(255,255,255,0.60)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
        style={{ background: bgColor }}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {/* ═══════════════════════════════════════════════
            HEADER BAR (Liquipedia-style)
            ═══════════════════════════════════════════════ */}
        <header
          className="flex items-center px-4 h-12 flex-shrink-0 z-20"
          style={{
            background: `linear-gradient(90deg, ${accentColor}22 0%, ${cardBg} 40%)`,
            borderBottom: `2px solid ${accentColor}40`,
          }}
        >
          <motion.button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.70)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <h1
            className="ml-3 text-[13px] font-bold uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            Player Profile
          </h1>
          {/* Division badge on right */}
          <span
            className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide"
            style={{
              background: `${accentColor}15`,
              color: accentColor,
              border: `1px solid ${accentColor}25`,
            }}
          >
            {isMale ? 'Putra' : 'Putri'}
          </span>
        </header>

        {/* ═══════════════════════════════════════════════
            SCROLLABLE CONTENT
            ═══════════════════════════════════════════════ */}
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain profile-page-scroll">
          {isLoading ? (
            <LoadingSkeleton />
          ) : profile ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="min-h-full"
            >
              {/* ═══════════════════════════════════════════
                  HERO SECTION — Avatar + Name
                  ═══════════════════════════════════════════ */}
              <motion.section
                className="relative flex flex-col items-center py-8 px-4 overflow-hidden"
                variants={staggerItem}
              >
                {/* Background subtle glow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at center top, rgba(${accentColorRGB}, 0.06) 0%, transparent 60%)`,
                  }}
                />

                {/* Avatar — Large circle with double accent border */}
                <div className="relative mb-5">
                  {/* Outer glow ring */}
                  <div
                    className="absolute -inset-4 rounded-full blur-xl"
                    style={{
                      background: `radial-gradient(circle, rgba(${accentColorRGB}, 0.20) 0%, rgba(${accentColorRGB}, 0.04) 50%, transparent 75%)`,
                    }}
                  />
                  {/* Outer decorative ring */}
                  <div
                    className="absolute -inset-2.5 rounded-full"
                    style={{
                      border: `3px solid rgba(${accentColorRGB},0.25)`,
                      boxShadow: `0 0 20px rgba(${accentColorRGB},0.08)`,
                    }}
                  />
                  {/* Inner avatar circle */}
                  <div
                    className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full p-[3px]"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, rgba(${accentColorRGB}, 0.3) 50%, ${accentColor} 100%)`,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                      style={{ background: '#0f1117', border: '2px solid rgba(0,0,0,0.4)' }}
                    >
                      {profile.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl sm:text-6xl font-black" style={{ color: `${accentColor}88` }}>
                          {profile.name[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tier badge — bottom-right corner */}
                  <div
                    className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-black shadow-lg"
                    style={{
                      background: tier.badgeBg,
                      boxShadow: `0 2px 12px ${tier.glowColor}`,
                      border: '2.5px solid rgba(0,0,0,0.3)',
                      color: '#fff',
                    }}
                  >
                    {profile.tier}
                  </div>

                  {/* MVP flame — top-right corner */}
                  {profile.isMVP && (
                    <div
                      className="absolute -top-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
                        boxShadow: '0 2px 10px rgba(255, 215, 0, 0.40)',
                        border: '2.5px solid rgba(0,0,0,0.25)',
                      }}
                    >
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Player Name */}
                <h2
                  className="text-2xl sm:text-3xl font-black tracking-tight text-center leading-tight"
                  style={{ color: 'rgba(255,255,255,0.92)' }}
                >
                  {profile.name}
                </h2>

                {/* Tier label + Points row */}
                <div className="flex items-center gap-2.5 mt-2.5">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide"
                    style={{
                      background: `${accentColor}18`,
                      color: accentColor,
                      border: `1px solid ${accentColor}25`,
                    }}
                  >
                    <Star className="w-3 h-3" />
                    {tier.label}
                  </span>
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: `${accentColor}99` }}
                  >
                    {profile.points.toLocaleString()} pts
                  </span>
                </div>

                {/* Club row */}
                {profile.club && (
                  <div
                    className="flex items-center gap-2 mt-2.5 px-3 py-1.5 rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {profile.club.logoUrl ? (
                      <img
                        src={profile.club.logoUrl}
                        alt={profile.club.name}
                        className="w-5 h-5 rounded object-cover"
                      />
                    ) : (
                      <Building2 className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.40)' }} />
                    )}
                    <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.60)' }}>
                      {profile.club.name}
                    </span>
                  </div>
                )}

                {/* MVP label */}
                {profile.isMVP && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Flame className="w-4 h-4" style={{ color: '#F59E0B' }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#F59E0B' }}>
                      MVP &middot; {profile.mvpScore.toLocaleString()} pts
                    </span>
                  </div>
                )}
              </motion.section>

              {/* ═══════════════════════════════════════════
                  PLAYER INFORMATION
                  ═══════════════════════════════════════════ */}
              <motion.section className="mx-4 sm:mx-auto sm:max-w-lg mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }} variants={staggerItem}>
                <SectionHeader title="Player Information" accentColor={accentColor} icon={Users} />

                <div style={{ background: cardBg }}>
                  {/* Name */}
                  <InfoRow
                    label="Name"
                    accentColor={accentColor}
                    value={
                      <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {profile.name}
                      </span>
                    }
                  />
                  {/* Division */}
                  <InfoRow
                    label="Division"
                    accentColor={accentColor}
                    value={
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                        <span className="font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>
                          {isMale ? 'Putra' : 'Putri'}
                        </span>
                      </span>
                    }
                  />
                  {/* Tier */}
                  <InfoRow
                    label="Tier"
                    accentColor={accentColor}
                    value={
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-5 h-5 rounded text-center text-[11px] font-black leading-5"
                          style={{ background: tier.badgeBg, color: '#fff' }}
                        >
                          {profile.tier}
                        </span>
                        <span className="font-medium" style={{ color: tier.textColor }}>
                          {tier.label}
                        </span>
                      </span>
                    }
                  />
                  {/* Club */}
                  <InfoRow
                    label="Club"
                    accentColor={accentColor}
                    value={
                      profile.club ? (
                        <span className="flex items-center gap-1.5">
                          {profile.club.logoUrl ? (
                            <img src={profile.club.logoUrl} alt={profile.club.name} className="w-4 h-4 rounded object-cover" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.40)' }} />
                          )}
                          <span className="font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>
                            {profile.club.name}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                      )
                    }
                  />
                  {/* Status */}
                  <InfoRow
                    label="Status"
                    accentColor={accentColor}
                    value={
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'pulse 2s infinite' }} />
                        <span className="font-medium text-emerald-400">Active</span>
                      </span>
                    }
                  />
                  {/* City */}
                  <InfoRow
                    label="Kota"
                    accentColor={accentColor}
                    value={
                      profile.city ? (
                        <span className="flex items-center gap-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>
                          <MapPin className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                          {profile.city}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                      )
                    }
                  />
                  {/* Joined */}
                  <InfoRow
                    label="Joined"
                    accentColor={accentColor}
                    value={
                      <span className="flex items-center gap-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        <CalendarDays className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
                        {new Date(profile.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    }
                  />
                  {/* Total Points */}
                  <InfoRow
                    label="Total Points"
                    accentColor={accentColor}
                    isLast
                    value={
                      <span className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        <span className="font-bold" style={{ color: accentColor }}>
                          {profile.points.toLocaleString()}
                        </span>
                      </span>
                    }
                  />
                </div>
              </motion.section>

              {/* ═══════════════════════════════════════════
                  STATISTICS
                  ═══════════════════════════════════════════ */}
              <motion.section className="mx-4 sm:mx-auto sm:max-w-lg mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }} variants={staggerItem}>
                <SectionHeader title="Statistics" accentColor={accentColor} icon={Activity} />

                <div style={{ background: cardBg }}>
                  <div className="grid grid-cols-3 sm:grid-cols-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <StatCell label="Points" value={profile.points.toLocaleString()} color={accentColor} isBorderRight />
                    <StatCell label="Wins" value={profile.stats.wins.toString()} color="#34D399" isBorderRight />
                    <StatCell label="Losses" value={profile.stats.losses.toString()} color="#FF453A" isBorderRight smHide />
                    <StatCell label="Win Rate" value={`${profile.stats.winRate}%`} color="#FBBF24" isBorderRight smHide />
                    <StatCell label="MVPs" value={profile.stats.mvpCount.toString()} color="#F59E0B" />
                  </div>
                  {/* Mobile: show remaining 2 stats in second row */}
                  <div className="grid grid-cols-2 sm:hidden">
                    <StatCell label="Win Rate" value={`${profile.stats.winRate}%`} color="#FBBF24" isBorderRight />
                    <StatCell label="MVPs" value={profile.stats.mvpCount.toString()} color="#F59E0B" />
                  </div>
                </div>
              </motion.section>

              {/* ═══════════════════════════════════════════
                  ACHIEVEMENTS
                  ═══════════════════════════════════════════ */}
              <motion.section className="mx-4 sm:mx-auto sm:max-w-lg mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }} variants={staggerItem}>
                <SectionHeader
                  title="Achievements"
                  accentColor={accentColor}
                  icon={Award}
                />

                {profile.achievements.length > 0 ? (
                  <div style={{ background: cardBgAlt }}>
                    {profile.achievements.map((achievement, idx) => (
                      <motion.div
                        key={achievement.id}
                        className="flex items-center gap-3 px-4 py-3 transition-colors"
                        style={{
                          borderBottom: idx < profile.achievements.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                        }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                      >
                        <span className="text-lg flex-shrink-0">{achievement.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                            {achievement.name}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                            {achievement.description}
                          </p>
                        </div>
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.18)' }}>
                          {achievement.earnedAt}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Award}
                    title="Belum ada pencapaian"
                    subtitle="Pemain ini belum memiliki pencapaian"
                  />
                )}
              </motion.section>

              {/* ═══════════════════════════════════════════
                  MATCH HISTORY
                  ═══════════════════════════════════════════ */}
              <motion.section className="mx-4 sm:mx-auto sm:max-w-lg mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }} variants={staggerItem}>
                <SectionHeader
                  title="Match History"
                  accentColor={accentColor}
                  icon={Swords}
                />

                {profile.recentMatches.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto" style={{ background: cardBgAlt }}>
                    {profile.recentMatches.map((match, idx) => {
                      const isWin = match.result === 'win';
                      return (
                        <motion.div
                          key={match.id}
                          className="flex items-center gap-3 px-4 py-3 transition-colors"
                          style={{
                            borderBottom: idx < profile.recentMatches.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                            borderLeft: `3px solid ${isWin ? '#34D399' : '#FF453A'}`,
                          }}
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                        >
                          {/* W/L badge */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[12px] font-black"
                            style={{
                              background: isWin ? 'rgba(52,211,153,0.12)' : 'rgba(255,69,58,0.12)',
                              color: isWin ? '#34D399' : '#FF453A',
                            }}
                          >
                            {isWin ? 'W' : 'L'}
                          </div>

                          {/* Match details */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.70)' }}>
                              vs {match.opponentName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                {match.tournamentName}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.10)' }}>&middot;</span>
                              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'rgba(255,255,255,0.20)' }}>
                                {match.date}
                              </span>
                            </div>
                            {/* Bracket + MVP row */}
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.18)' }}>
                                {match.bracket === 'winners' ? 'Winners' : 'Losers'}
                              </span>
                              {match.mvpName && (
                                <span className="text-[9px] font-semibold flex items-center gap-0.5" style={{ color: 'rgba(251,191,36,0.50)' }}>
                                  <Star className="w-2.5 h-2.5" />
                                  MVP: {match.mvpName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-[14px] font-bold" style={{ color: isWin ? '#34D399' : '#FF453A' }}>
                              {match.score}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Swords}
                    title="Belum ada pertandingan"
                    subtitle="Pemain ini belum memiliki riwayat pertandingan"
                  />
                )}
              </motion.section>

              {/* ═══════════════════════════════════════════
                  FOOTER BRAND
                  ═══════════════════════════════════════════ */}
              <motion.footer className="text-center py-8 pb-12" variants={staggerItem}>
                <p
                  className="text-[11px] font-bold tracking-[0.15em] uppercase"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFEC8B 50%, #FFD700 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  IDOL META &middot; TARKAM
                </p>
                <p className="text-[9px] tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
                  &copy; 2026 IDOL META &mdash; Fan Made Edition
                </p>
              </motion.footer>
            </motion.div>
          ) : null}
        </div>

        {/* ═══════════════════════════════════════════════
            GLOBAL STYLES
            ═══════════════════════════════════════════════ */}
        <style jsx global>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }

          .profile-page-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .profile-page-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .profile-page-scroll::-webkit-scrollbar-thumb {
            background: rgba(${accentColorRGB}, 0.15);
            border-radius: 10px;
          }
          .profile-page-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(${accentColorRGB}, 0.30);
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INFO ROW (Liquipedia-style label:value)
   ═══════════════════════════════════════════════════════════════ */

function InfoRow({
  label,
  accentColor,
  value,
  isLast,
}: {
  label: string;
  accentColor: string;
  value: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{
        borderBottom: isLast ? undefined : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: `${accentColor}88` }}>
        {label}
      </span>
      <div className="text-[13px] text-right ml-3">{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STAT CELL (for statistics grid)
   ═══════════════════════════════════════════════════════════════ */

function StatCell({
  label,
  value,
  color,
  isBorderRight,
  smHide,
}: {
  label: string;
  value: string;
  color: string;
  isBorderRight?: boolean;
  smHide?: boolean;
}) {
  return (
    <div
      className={`py-3 px-2 text-center ${smHide ? 'hidden sm:block' : ''}`}
      style={{
        borderRight: isBorderRight ? '1px solid rgba(255,255,255,0.04)' : undefined,
      }}
    >
      <p className="text-[18px] sm:text-[20px] font-black leading-none" style={{ color }}>
        {value}
      </p>
      <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {label}
      </p>
    </div>
  );
}
