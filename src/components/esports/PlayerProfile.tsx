'use client';

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  X,
  Trophy,
  Medal,
  Star,
  TrendingUp,
  Calendar,
  Gamepad2,
  Crown,
  ChevronRight,
  Swords,
  UserPlus,
  Award,
  Flame,
  Building2,
  Users,
  Clock,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

/* ── Interfaces ── */
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
  slug: string;
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
  createdAt: string;
  city: string | null;
  isMVP: boolean;
  mvpScore: number;
  club: ClubInfo | null;
  stats: PlayerStats;
  recentMatches: RecentMatch[];
  achievements: Achievement[];
}

// Basic player shape from page.tsx
interface BasicPlayer {
  id: string;
  name: string;
  email: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  createdAt: string;
}

interface PlayerProfileModalProps {
  player: (BasicPlayer & {
    stats?: PlayerStats;
    recentMatches?: RecentMatch[];
    achievements?: Achievement[];
  }) | null;
  division: 'male' | 'female';
  onClose: () => void;
}

/* ── Tier helpers ── */
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

/* ── Loading Skeleton ── */
function ProfileSkeleton() {
  return (
    <div className="px-6 pb-8 pt-2 space-y-5">
      {/* Avatar skeleton */}
      <div className="flex flex-col items-center text-center pb-7">
        <div className="w-[88px] h-[88px] rounded-full bg-white/[0.06] animate-pulse" />
        <div className="w-32 h-5 mt-4 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="w-24 h-3 mt-2 rounded bg-white/[0.04] animate-pulse" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-subtle rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="w-8 h-4 rounded bg-white/[0.06] animate-pulse" />
              <div className="w-12 h-2 rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      {/* Info skeleton */}
      <div className="glass-subtle rounded-2xl px-5 space-y-4 py-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="w-20 h-3 rounded bg-white/[0.04] animate-pulse" />
            <div className="w-16 h-3 rounded bg-white/[0.06] animate-pulse" />
          </div>
        ))}
      </div>
      {/* Matches skeleton */}
      <div className="space-y-2.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-subtle rounded-2xl px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] animate-pulse" />
              <div className="space-y-1.5">
                <div className="w-28 h-3 rounded bg-white/[0.06] animate-pulse" />
                <div className="w-16 h-2 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="w-14 h-3 rounded bg-white/[0.06] animate-pulse" />
              <div className="w-10 h-2 rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
export function PlayerProfileModal({ player, division, onClose }: PlayerProfileModalProps) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);
  const isMale = division === 'male';

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Fetch richer profile data from API
  useEffect(() => {
    if (!player?.id) return;

    let cancelled = false;
    setIsLoadingProfile(true);

    (async () => {
      try {
        const res = await fetch(`/api/users/profile?userId=${player.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && !cancelled) {
            setProfileData(json.profile);
          }
        }
      } catch {
        // Silent fail - use basic data
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [player?.id]);

  // Merge basic player data with API data
  const displayPlayer: ProfileData = profileData || {
    id: player?.id || '',
    name: player?.name || '',
    email: player?.email || '',
    gender: player?.gender || 'male',
    tier: player?.tier || 'B',
    points: player?.points || 0,
    avatar: player?.avatar || null,
    createdAt: player?.createdAt || new Date().toISOString(),
    city: null,
    isMVP: false,
    mvpScore: 0,
    club: null,
    stats: player?.stats || { wins: 0, losses: 0, totalMatches: 0, winRate: 0, averageScore: 0, mvpCount: 0, championCount: 0 },
    recentMatches: player?.recentMatches || [],
    achievements: player?.achievements || [],
  };

  const tier = tierConfig[displayPlayer.tier] || tierConfig.B;

  function handleDragEnd(_: never, info: PanInfo) {
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onClose();
    }
  }

  if (!player) return null;

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          key="player-profile-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ opacity }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="relative glass rounded-t-[32px] sm:rounded-[24px] w-full max-h-[92vh] lg:max-w-2xl mx-auto overflow-hidden flex flex-col"
            style={{ y }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            {/* Premium Drag Handle */}
            <div className="flex justify-center pt-4 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-[5px] rounded-full bg-white/20 shadow-sm shadow-white/10" />
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto overscroll-contain px-6 pb-8 pt-2">
              {isLoadingProfile ? (
                <ProfileSkeleton />
              ) : (
                <>
                  {/* ── Header: Avatar + Name + Tier ── */}
                  <motion.div
                    className="flex flex-col items-center text-center pb-7"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    {/* Avatar with Premium Ring + Gradient Glow */}
                    <div className="relative mb-5">
                      {/* Gradient glow behind avatar */}
                      <div
                        className="absolute -inset-3 rounded-full blur-xl opacity-60"
                        style={{
                          background: isMale
                            ? 'radial-gradient(circle, rgba(115,255,0,0.3) 0%, rgba(115,255,0,0.05) 60%, transparent 80%)'
                            : 'radial-gradient(circle, rgba(244,114,182,0.3) 0%, rgba(244,114,182,0.05) 60%, transparent 80%)',
                        }}
                      />
                      <div className={`relative ${isMale ? 'avatar-ring-gold' : 'avatar-ring-pink'}`}>
                        <div className="w-[88px] h-[88px] lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] flex items-center justify-center overflow-hidden">
                          {displayPlayer.avatar ? (
                            <img
                              src={displayPlayer.avatar}
                              alt={displayPlayer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-white/70">
                              {displayPlayer.name[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Tier badge — Prominent */}
                      <motion.div
                        className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black bg-gradient-to-br ${tier.gradient} shadow-lg`}
                        style={{
                          boxShadow: `0 2px 12px ${tier.glowColor}`,
                          border: '2px solid rgba(0,0,0,0.3)',
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        {displayPlayer.tier}
                      </motion.div>
                    </div>

                    {/* Name */}
                    <h2 className="text-[22px] font-bold text-white/90 tracking-tight leading-tight lg:text-2xl">
                      {displayPlayer.name}
                    </h2>

                    {/* Tier label + points */}
                    <div className="flex items-center gap-2.5 mt-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide ${tier.badgeClass}`}
                      >
                        <Star className="w-3 h-3" />
                        {tier.label}
                      </span>
                      <span className={`text-[13px] font-semibold ${isMale ? 'text-[#73FF00]/60' : 'text-[#38BDF8]/60'}`}>
                        {displayPlayer.points.toLocaleString()} pts
                      </span>
                    </div>

                    {/* Club Badge */}
                    {displayPlayer.club && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.3 }}
                        className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-xl glass-subtle"
                      >
                        {displayPlayer.club.logoUrl ? (
                          <img
                            src={displayPlayer.club.logoUrl}
                            alt={displayPlayer.club.name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-4 h-4 text-white/40" />
                        )}
                        <span className="text-[12px] font-semibold text-white/60">{displayPlayer.club.name}</span>
                      </motion.div>
                    )}

                    {/* MVP Badge */}
                    {displayPlayer.isMVP && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                        className="flex items-center gap-1.5 mt-2"
                      >
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                          MVP &middot; {displayPlayer.mvpScore.toLocaleString()} pts
                        </span>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* ── Stats Cards: Clean 2-column grid ── */}
                  <motion.div
                    className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <div className="glass-subtle rounded-2xl p-4 lg:p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-[18px] h-[18px] text-amber-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white/90 leading-none">{displayPlayer.stats.wins}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Menang</p>
                      </div>
                    </div>
                    <div className="glass-subtle rounded-2xl p-4 lg:p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center flex-shrink-0">
                        <Medal className="w-[18px] h-[18px] text-gray-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white/90 leading-none">{displayPlayer.stats.losses}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Kalah</p>
                      </div>
                    </div>
                    <div className="glass-subtle rounded-2xl p-4 lg:p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-[18px] h-[18px] text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white/90 leading-none">{displayPlayer.stats.winRate}%</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Win Rate</p>
                      </div>
                    </div>
                    <div className="glass-subtle rounded-2xl p-4 lg:p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-[18px] h-[18px] text-amber-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white/90 leading-none">{displayPlayer.stats.mvpCount}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">MVPs</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* ── Divider ── */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-6" />

                  {/* ── Info Section: iOS-style list rows ── */}
                  <motion.div
                    className="glass-subtle rounded-2xl px-5 mb-7"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <InfoRow
                      label="Divisi"
                      value={<span className="capitalize">{displayPlayer.gender}</span>}
                    />
                    <InfoRow
                      label="Tier"
                      value={
                        <span className={`bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent font-bold`}>
                          {displayPlayer.tier} Tier
                        </span>
                      }
                    />
                    {displayPlayer.city && (
                      <InfoRow
                        label="Kota"
                        value={displayPlayer.city}
                      />
                    )}
                    <InfoRow
                      label="Bergabung Sejak"
                      value={new Date(displayPlayer.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    />
                    <InfoRow
                      label="Total Poin"
                      value={
                        <span className={`font-bold ${isMale ? 'text-[#73FF00]' : 'text-[#38BDF8]'}`}>
                          {displayPlayer.points.toLocaleString()}
                        </span>
                      }
                      isLast
                    />
                  </motion.div>

                  {/* ── Achievements ── */}
                  {displayPlayer.achievements.length > 0 && (
                    <motion.div
                      className="mb-7"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.4 }}
                    >
                      <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        Pencapaian
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5">
                        {displayPlayer.achievements.map((achievement, aIdx) => (
                          <motion.div
                            key={achievement.id}
                            className="glass-subtle rounded-xl px-3.5 py-3 flex items-start gap-2.5 cursor-pointer"
                            whileHover={{ scale: 1.04, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + aIdx * 0.05 }}
                            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                          >
                            <span className="text-[16px] flex-shrink-0 mt-0.5">{achievement.icon}</span>
                            <div className="min-w-0">
                              <span className="text-[13px] text-white/70 font-medium block truncate">{achievement.name}</span>
                              <span className="text-[10px] text-white/25 font-medium">{achievement.description}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ── Recent Matches ── */}
                  {displayPlayer.recentMatches.length > 0 && (
                    <motion.div
                      className="mb-7"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    >
                      <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                        <Gamepad2 className="w-3.5 h-3.5 text-white/30" />
                        Pertandingan Terakhir
                      </h3>
                      <div className="space-y-2.5">
                        {displayPlayer.recentMatches.map((match, mIdx) => (
                          <motion.div
                            key={match.id}
                            className={`glass-subtle rounded-2xl px-4 py-3.5 transition-all duration-200 ${
                              match.result === 'win'
                                ? 'border-l-[3px] border-l-emerald-500/60'
                                : 'border-l-[3px] border-l-red-500/60'
                            }`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 + mIdx * 0.05 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  match.result === 'win' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                                }`}>
                                  {match.result === 'win'
                                    ? <Trophy className="w-4 h-4 text-emerald-400" />
                                    : <X className="w-4 h-4 text-red-400" />
                                  }
                                </div>
                                <div>
                                  <p className="text-[13px] font-semibold text-white/70">vs {match.opponentName}</p>
                                  <p className="text-[11px] text-white/25 mt-0.5 font-medium flex items-center gap-1.5">
                                    <span>{match.tournamentName}</span>
                                    <span className="text-white/10">·</span>
                                    <span>{match.date}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
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
                            {/* MVP info if this player was MVP */}
                            {match.mvpName && match.result === 'win' && (
                              <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center gap-1.5">
                                <Star className="w-3 h-3 text-amber-400/60" />
                                <span className="text-[10px] text-amber-400/60 font-medium">
                                  MVP: {match.mvpName}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ── No matches state ── */}
                  {displayPlayer.recentMatches.length === 0 && (
                    <motion.div
                      className="mb-7"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    >
                      <div className="glass-subtle rounded-2xl px-4 py-8 text-center">
                        <Gamepad2 className="w-8 h-8 text-white/15 mx-auto mb-2" />
                        <p className="text-[12px] text-white/25 font-medium">Belum ada pertandingan</p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Action Buttons ── */}
                  <motion.div
                    className="grid grid-cols-2 gap-3 pt-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    <motion.button
                      className={`btn-ios py-4 flex items-center justify-center gap-2 text-sm font-semibold ${
                        isMale ? 'btn-gold' : 'btn-pink'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Swords className="w-4 h-4" />
                      Tantang
                    </motion.button>
                    <motion.button
                      className="btn-ios py-4 flex items-center justify-center gap-2 text-sm font-semibold glass text-white/70 hover:text-white/90"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <UserPlus className="w-4 h-4" />
                      Ikuti
                    </motion.button>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PlayerProfileModal;
