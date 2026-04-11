'use client';

import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trophy,
  Medal,
  Star,
  TrendingUp,
  Gamepad2,
  Crown,
  Flame,
  Building2,
  Calendar,
  Swords,
  Shield,
  Clock,
  User,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* ── Interfaces ── */
interface ClubInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  mvpCount: number;
  championCount: number;
}

interface RecentMatch {
  id: string;
  tournamentName: string;
  result: 'win' | 'loss';
  score: string;
  opponent: string;
  date: string;
  bracket: string;
  round: number;
}

interface RankingInfo {
  wins: number;
  losses: number;
  rank: number | null;
  points: number;
}

interface PlayerData {
  id: string;
  name: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  city: string | null;
  isMVP: boolean;
  mvpScore: number;
  club: ClubInfo | null;
  ranking: RankingInfo;
  stats: PlayerStats;
  recentMatches: RecentMatch[];
  createdAt: string;
}

interface Achievement {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  earnedAt: string | null;
}

interface AchievementCategory {
  key: string;
  label: string;
  icon: string;
}

interface AchievementsData {
  success: boolean;
  player: { id: string; name: string };
  achievements: Achievement[];
  byCategory: Record<string, Achievement[]>;
  allAchievements: Achievement[];
  categories: AchievementCategory[];
  stats: {
    totalEarned: number;
    totalPossible: number;
    completionPercent: number;
  };
}

/* ── Tier Config ── */
const tierConfig: Record<string, { label: string; badgeClass: string; gradient: string; glowColor: string }> = {
  S: {
    label: 'Profesional',
    badgeClass: 'tier-s',
    gradient: 'from-amber-400 to-amber-600',
    glowColor: 'rgba(255,214,10,0.25)',
  },
  A: {
    label: 'Lanjutan',
    badgeClass: 'tier-a',
    gradient: 'from-gray-300 to-gray-500',
    glowColor: 'rgba(200,200,210,0.15)',
  },
  B: {
    label: 'Pemula',
    badgeClass: 'tier-b',
    gradient: 'from-orange-400 to-orange-600',
    glowColor: 'rgba(255,140,50,0.15)',
  },
};

/* ── Animation Variants ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ── iOS-style info row ── */
function InfoRow({ label, value, isLast }: { label: string; value: React.ReactNode; isLast?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3.5 ${isLast ? '' : 'border-b border-white/[0.04]'}`}>
      <span className="text-[13px] text-white/35 font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-white/70">{value}</span>
    </div>
  );
}

/* ── Main Component ── */
export default function PublicPlayerProfile({ playerId }: { playerId: string }) {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievementsData, setAchievementsData] = useState<AchievementsData | null>(null);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  useEffect(() => {
    if (!playerId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/players/${playerId}`);
        if (cancelled) return;

        if (!res.ok) {
          setError('Pemain tidak ditemukan');
          setIsLoading(false);
          return;
        }

        const json = await res.json();
        if (json.success && json.player && !cancelled) {
          setPlayer(json.player);
        } else if (!cancelled) {
          setError('Pemain tidak ditemukan');
        }
      } catch {
        if (!cancelled) {
          setError('Gagal memuat profil pemain');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Fetch achievements in parallel
    (async () => {
      try {
        const res = await fetch(`/api/players/${playerId}/achievements`);
        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && !cancelled) {
            setAchievementsData(json);
          }
        }
      } catch {
        // Silently fail — achievements are supplementary
      } finally {
        if (!cancelled) setIsLoadingAchievements(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  // Apply theme based on player gender
  useEffect(() => {
    if (!player) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'theme-light-fury', 'dark-fury-pink', 'theme-light-fury-male');
    root.removeAttribute('data-theme');
    root.classList.add('dark');
    if (player.gender === 'female') {
      root.setAttribute('data-theme', 'dark-female');
    } else {
      root.setAttribute('data-theme', 'dark-male');
    }
    return () => {
      // Reset to default dark-male when leaving
      root.setAttribute('data-theme', 'dark-male');
    };
  }, [player]);

  if (isLoading) return null; // loading.tsx handles this

  if (error || !player) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0a0f0d' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
            <User className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-lg font-bold text-white/60 mb-2">Pemain Tidak Ditemukan</h2>
          <p className="text-[13px] text-white/30 mb-6">{error || 'ID pemain tidak valid'}</p>
          <button
            onClick={() => router.back()}
            className="glass-subtle px-6 py-3 rounded-2xl text-[13px] font-semibold text-white/60 hover:text-white/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </span>
          </button>
        </motion.div>
      </div>
    );
  }

  const isMale = player.gender === 'male';
  const tier = tierConfig[player.tier] || tierConfig.B;
  const accentColor = isMale ? '#73FF00' : '#38BDF8';
  const accentColorMuted = isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)';

  return (
    <div className="min-h-screen relative" style={{ background: isMale ? '#0a0f0d' : '#0d0a10' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Diamond pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Accent glow top */}
        <div
          className="absolute -top-40 left-1/3 w-[500px] h-[500px]"
          style={{
            background: `radial-gradient(circle, ${isMale ? 'rgba(115,255,0,0.04)' : 'rgba(56,189,248,0.04)'} 0%, transparent 60%)`,
          }}
        />
        {/* Accent glow bottom-right */}
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px]"
          style={{
            background: `radial-gradient(circle, ${isMale ? 'rgba(115,255,0,0.03)' : 'rgba(56,189,248,0.03)'} 0%, transparent 60%)`,
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Back Button ── */}
        <motion.div variants={itemVariants} className="pt-6 pb-4">
          <motion.button
            onClick={() => router.back()}
            className="glass-subtle rounded-2xl px-4 py-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </motion.button>
        </motion.div>

        {/* ── Header: Avatar + Name + Tier ── */}
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center pb-8">
          {/* Avatar with Premium Ring + Gradient Glow */}
          <div className="relative mb-5">
            {/* Gradient glow behind avatar */}
            <div
              className="absolute -inset-4 rounded-full blur-xl opacity-60"
              style={{
                background: isMale
                  ? 'radial-gradient(circle, rgba(115,255,0,0.3) 0%, rgba(115,255,0,0.05) 60%, transparent 80%)'
                  : 'radial-gradient(circle, rgba(56,189,248,0.3) 0%, rgba(56,189,248,0.05) 60%, transparent 80%)',
              }}
            />
            <div className={`relative ${isMale ? 'avatar-ring-gold' : 'avatar-ring-pink'}`}>
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] flex items-center justify-center overflow-hidden">
                {player.avatar ? (
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="text-4xl font-bold text-white/70">
                    {player.name[0]}
                  </span>
                )}
              </div>
            </div>
            {/* Tier badge — Prominent */}
            <motion.div
              className={`absolute -bottom-2 -right-2 w-11 h-11 rounded-full flex items-center justify-center text-sm font-black bg-gradient-to-br ${tier.gradient} shadow-lg`}
              style={{
                boxShadow: `0 2px 12px ${tier.glowColor}`,
                border: '2px solid rgba(0,0,0,0.3)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
            >
              {player.tier}
            </motion.div>
          </div>

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight leading-tight">
            {player.name}
          </h1>

          {/* Tier label + points */}
          <div className="flex items-center gap-2.5 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide ${tier.badgeClass}`}
            >
              <Star className="w-3 h-3" />
              {tier.label}
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: `${accentColor}99` }}
            >
              {player.points.toLocaleString()} pts
            </span>
          </div>

          {/* Club Badge */}
          {player.club && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-xl glass-subtle"
            >
              {player.club.logoUrl ? (
                <img
                  src={player.club.logoUrl}
                  alt={player.club.name}
                  className="w-5 h-5 rounded-full object-cover object-top"
                />
              ) : (
                <Building2 className="w-4 h-4 text-white/40" />
              )}
              <span className="text-[12px] font-semibold text-white/60">{player.club.name}</span>
            </motion.div>
          )}

          {/* MVP Badge */}
          {player.isMVP && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
              className="flex items-center gap-1.5 mt-2"
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                MVP &middot; {player.mvpScore.toLocaleString()} pts
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* ── Stats Cards: 2-column (mobile) / 3-column (tablet+) ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">
          <div className="glass-subtle rounded-2xl p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accentColorMuted }}
            >
              <Trophy className="w-[18px] h-[18px]" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-lg font-bold text-white/90 leading-none">{player.stats.wins}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Menang</p>
            </div>
          </div>
          <div className="glass-subtle rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Medal className="w-[18px] h-[18px] text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white/90 leading-none">{player.stats.losses}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Kalah</p>
            </div>
          </div>
          <div className="glass-subtle rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white/90 leading-none">{player.stats.winRate}%</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Win Rate</p>
            </div>
          </div>
          <div className="glass-subtle rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-[18px] h-[18px] text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white/90 leading-none">{player.stats.mvpCount}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">MVPs</p>
            </div>
          </div>
          <div className="glass-subtle rounded-2xl p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accentColorMuted }}
            >
              <Swords className="w-[18px] h-[18px]" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-lg font-bold text-white/90 leading-none">{player.stats.totalMatches}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Total Match</p>
            </div>
          </div>
          <div className="glass-subtle rounded-2xl p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accentColorMuted }}
            >
              <Shield className="w-[18px] h-[18px]" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-lg font-bold text-white/90 leading-none">{player.stats.championCount}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Juara</p>
            </div>
          </div>
        </motion.div>

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-7" />

        {/* ── Info Section ── */}
        <motion.div variants={itemVariants} className="glass-subtle rounded-2xl px-5 mb-7">
          <InfoRow
            label="Divisi"
            value={
              <span className="capitalize flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: isMale ? '#73FF00' : '#38BDF8' }}
                />
                {isMale ? 'Putra' : 'Putri'}
              </span>
            }
          />
          <InfoRow
            label="Tier"
            value={
              <span className={`bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent font-bold`}>
                {player.tier} Tier
              </span>
            }
          />
          {player.city && <InfoRow label="Kota" value={player.city} />}
          {player.ranking.rank && (
            <InfoRow
              label="Ranking"
              value={
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  #{player.ranking.rank}
                </span>
              }
            />
          )}
          <InfoRow
            label="Bergabung Sejak"
            value={new Date(player.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          />
          <InfoRow
            label="Total Poin"
            value={
              <span className="font-bold" style={{ color: accentColor }}>
                {player.points.toLocaleString()}
              </span>
            }
            isLast
          />
        </motion.div>

        {/* ── Achievements / Badges Section ── */}
        <motion.div variants={itemVariants} className="mb-7">
          <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-white/30" />
            Pencapaian
            {achievementsData && (
              <span
                className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: accentColorMuted, color: accentColor }}
              >
                {achievementsData.stats.totalEarned}/{achievementsData.stats.totalPossible}
              </span>
            )}
          </h3>

          {isLoadingAchievements ? (
            <div className="glass-subtle rounded-2xl px-4 py-10 text-center">
              <div className="w-6 h-6 border-2 border-white/10 border-t-white/30 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-white/25 font-medium">Memuat pencapaian…</p>
            </div>
          ) : achievementsData ? (
            <div className="space-y-5">
              {/* Completion Progress Bar */}
              <div className="glass-subtle rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[12px] font-semibold text-white/50">Kemajuan Pencapaian</span>
                  <span className="text-[13px] font-bold" style={{ color: accentColor }}>
                    {achievementsData.stats.completionPercent}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${achievementsData.stats.completionPercent}%` }}
                    transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
                  />
                </div>
                <p className="text-[11px] text-white/20 mt-2">
                  {achievementsData.stats.totalEarned} dari {achievementsData.stats.totalPossible} pencapaian telah diraih
                </p>
              </div>

              {/* Grouped by Category */}
              {achievementsData.categories.map((cat, catIdx) => {
                const catAchievements = achievementsData.byCategory[cat.key] || [];
                if (catAchievements.length === 0) return null;

                return (
                  <motion.div
                    key={cat.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + catIdx * 0.06, duration: 0.4 }}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[14px]">{cat.icon}</span>
                      <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.12em]">
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-white/15 font-medium">
                        {catAchievements.filter((a) => a.earned).length}/{catAchievements.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {catAchievements.map((ach, achIdx) => (
                        <motion.div
                          key={ach.type}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: ach.earned ? 1 : 0.4, scale: 1 }}
                          transition={{
                            delay: 0.35 + catIdx * 0.06 + achIdx * 0.04,
                            duration: 0.35,
                            ease: [0.25, 0.46, 0.45, 0.94],
                          }}
                          className={
                            `relative glass-subtle rounded-2xl p-3 text-center transition-all duration-200 ${
                              ach.earned
                                ? ''
                                : 'opacity-30 grayscale'
                            }`
                          }
                          title={ach.earned ? `${ach.name}: ${ach.description}` : `${ach.name}: Terkunci`}
                        >
                          {/* Earned glow effect */}
                          {ach.earned && (
                            <div
                              className="absolute inset-0 rounded-2xl opacity-[0.08]"
                              style={{
                                background: `radial-gradient(circle at center, ${accentColor}, transparent 70%)`,
                              }}
                            />
                          )}
                          {/* Icon */}
                          <div className="relative z-10">
                            <div className="relative inline-flex items-center justify-center w-10 h-10 mb-2">
                              <span className="text-xl leading-none">{ach.earned ? ach.icon : '🔒'}</span>
                              {ach.earned && (
                                <motion.div
                                  className="absolute inset-0 rounded-full"
                                  style={{ background: accentColorMuted }}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.5 + catIdx * 0.06 + achIdx * 0.04, type: 'spring', stiffness: 300 }}
                                />
                              )}
                            </div>
                            <p
                              className={`text-[11px] font-semibold leading-tight ${
                                ach.earned ? 'text-white/70' : 'text-white/30'
                              }`}
                            >
                              {ach.name}
                            </p>
                            {ach.earned && ach.earnedAt && (
                              <p className="text-[9px] text-white/15 mt-1 font-medium">
                                {new Date(ach.earnedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : null}
        </motion.div>

        {/* ── Recent Matches ── */}
        {player.recentMatches.length > 0 ? (
          <motion.div variants={itemVariants} className="mb-7">
            <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <Gamepad2 className="w-3.5 h-3.5 text-white/30" />
              Pertandingan Terakhir
            </h3>
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
              {player.recentMatches.map((match, mIdx) => (
                <motion.div
                  key={match.id}
                  className={`glass-subtle rounded-2xl px-4 py-3.5 transition-all duration-200 ${
                    match.result === 'win'
                      ? 'border-l-[3px] border-l-emerald-500/60'
                      : 'border-l-[3px] border-l-red-500/60'
                  }`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + mIdx * 0.05 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          match.result === 'win' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}
                      >
                        {match.result === 'win' ? (
                          <Trophy className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Medal className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white/70 truncate">
                          vs {match.opponent}
                        </p>
                        <p className="text-[11px] text-white/25 mt-0.5 font-medium flex items-center gap-1.5">
                          <span className="truncate">{match.tournamentName}</span>
                          <span className="text-white/10 flex-shrink-0">·</span>
                          <span className="flex-shrink-0">{match.date}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p
                        className={`text-[13px] font-bold ${
                          match.result === 'win' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {match.result === 'win' ? 'MENANG' : 'KALAH'}
                      </p>
                      <p className="text-[11px] text-white/25 font-medium">{match.score}</p>
                    </div>
                  </div>
                  {/* Bracket & Round info */}
                  <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-white/20 font-medium">
                      <Swords className="w-2.5 h-2.5" />
                      {match.bracket === 'winners' ? 'Winners' : 'Losers'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-white/20 font-medium">
                      <Clock className="w-2.5 h-2.5" />
                      Round {match.round}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="mb-7">
            <div className="glass-subtle rounded-2xl px-4 py-10 text-center">
              <Gamepad2 className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-[13px] text-white/25 font-medium">Belum ada pertandingan</p>
              <p className="text-[11px] text-white/15 mt-1">Pemain ini belum memiliki riwayat pertandingan</p>
            </div>
          </motion.div>
        )}

        {/* ── Footer branding ── */}
        <motion.div variants={itemVariants} className="text-center pt-4 pb-6">
          <p className="text-[11px] font-bold tracking-[0.15em] uppercase"
            style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #ffec8b 50%, #ffd700 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            IDOL META &middot; TARKAM
          </p>
          <p className="text-[9px] tracking-widest text-white/20 mt-1">
            Fan Made Edition &copy; 2026
          </p>
        </motion.div>
      </motion.div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${accentColor}22;
          border-radius: 100px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${accentColor}44;
        }
      `}</style>
    </div>
  );
}
