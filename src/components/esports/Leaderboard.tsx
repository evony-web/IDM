'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Medal,
  Trophy,
  Crown,
  TrendingUp,
  Star,
  ChevronUp,
  Search,
  Users,
  Gamepad2,
  Swords,
  Target,
  Flame,
  Zap,
  BarChart3,
} from 'lucide-react';
import { useMemo, useState, useCallback, useEffect } from 'react';

/* ================================================================
   Interfaces — preserved from parent component
   ================================================================ */

interface SeasonPoint {
  season: number;
  points: number;
}

interface Player {
  id: string;
  name: string;
  email?: string;
  gender?: string;
  tier: string;
  points: number;
  avatar: string | null;
  rank: number;
  wins: number;
  losses: number;
  seasonPoints?: SeasonPoint[];
}

interface LeaderboardProps {
  division: 'male' | 'female';
  players: Player[];
  currentUserId?: string;
  onPlayerClick?: (playerId: string) => void;
}

/* ================================================================
   ELO Interfaces
   ================================================================ */

interface EloPlayer {
  id: string;
  name: string;
  avatar: string | null;
  eloRating: number;
  eloTier: string;
  winStreak: number;
  bestStreak: number;
  points: number;
  wins: number;
  losses: number;
  gender?: string;
}

/* ================================================================
   ELO Tier Colors & Helpers
   ================================================================ */

const ELO_TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
  Master: '#FF6B6B',
  Grandmaster: '#FF4500',
};

const ELO_TIER_BG: Record<string, string> = {
  Bronze: 'bg-orange-800/20 text-orange-400 border-orange-600/30',
  Silver: 'bg-gray-400/10 text-gray-300 border-gray-400/20',
  Gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Platinum: 'bg-gray-200/10 text-gray-200 border-gray-300/20',
  Diamond: 'bg-cyan-300/10 text-cyan-300 border-cyan-300/20',
  Master: 'bg-red-400/10 text-red-400 border-red-400/20',
  Grandmaster: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

function getEloTierIcon(tier: string): string {
  switch (tier) {
    case 'Bronze': return '🥉';
    case 'Silver': return '🥈';
    case 'Gold': return '🥇';
    case 'Platinum': return '💎';
    case 'Diamond': return '💠';
    case 'Master': return '🔥';
    case 'Grandmaster': return '👑';
    default: return '🏅';
  }
}

/* ================================================================
   Animation Variants
   ================================================================ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const podiumVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.2 + i * 0.12,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const statsVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.05 + i * 0.06,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

/* ================================================================
   Helpers
   ================================================================ */

function getTierClass(tier: string): string {
  if (tier === 'S') return 'tier-s';
  if (tier === 'A') return 'tier-a';
  return 'tier-b';
}

function getAccent(division: 'male' | 'female') {
  return division === 'male'
    ? { text: 'text-[#73FF00]', bg: 'bg-[#73FF00]', ring: 'avatar-ring-gold', gradient: 'gradient-gold' }
    : { text: 'text-[#38BDF8]', bg: 'bg-[#0EA5E9]', ring: 'avatar-ring-pink', gradient: 'gradient-pink' };
}

/* ================================================================
   Podium Player Card — Ultra Premium with Optimized Card System
   Uses: .card-pro for top 3 (shimmer only on hover)
         .card-gold-enhanced for rank #1 (VIP treatment)
   ================================================================ */

function PodiumCard({
  player,
  rank,
  division,
  cardHeight,
  isCenter,
  onPlayerClick,
}: {
  player: Player | undefined;
  rank: number;
  division: 'male' | 'female';
  cardHeight: number;
  isCenter: boolean;
  onPlayerClick?: (playerId: string) => void;
}) {
  const accent = getAccent(division);
  const tierClass = player ? getTierClass(player.tier) : 'tier-b';
  const avatarSizeClass = rank === 1
    ? 'w-[76px] h-[76px] lg:w-24 lg:h-24'
    : rank === 2
      ? 'w-[60px] h-[60px] lg:w-20 lg:h-20'
      : 'w-[52px] h-[52px] lg:w-16 lg:h-16';

  const cardHeightClass = rank === 1
    ? 'h-[140px] lg:h-48'
    : rank === 2
      ? 'h-[110px] lg:h-40'
      : 'h-[95px] lg:h-36';

  const cardOuterClass = rank === 1
    ? 'card-gold-enhanced card-corner-accent'
    : 'card-pro';

  const rankBadgeGradient =
    rank === 1
      ? division === 'male'
        ? 'from-[#73FF00] via-[#8CFF33] to-[#5FD400]'
        : 'from-[#38BDF8] via-[#7DD3FC] to-[#0EA5E9]'
      : rank === 2
        ? 'from-gray-100 via-gray-200 to-gray-400'
        : 'from-orange-300 via-amber-400 to-orange-500';

  const rankBadgeText =
    rank === 1
      ? 'text-black'
      : rank === 2
        ? 'text-gray-800'
        : 'text-orange-950';

  return (
    <motion.div
      custom={rank - 1}
      variants={podiumVariants}
      className={`flex flex-col items-center flex-1 ${player && onPlayerClick ? 'cursor-pointer' : ''}`}
      style={{ perspective: '1000px' }}
      onClick={() => player && onPlayerClick?.(player.id)}
      whileHover={player && onPlayerClick ? { scale: 1.03 } : {}}
      whileTap={player && onPlayerClick ? { scale: 0.97 } : {}}
    >
      {/* Floating icon above avatar */}
      <div className="mb-2 sm:mb-3 relative" style={{ height: rank === 1 ? 30 : 24 }}>
        {rank === 1 ? (
          <div
            className="animate-float"
            style={{
              filter: division === 'male'
                ? 'drop-shadow(0 0 16px rgba(115,255,0,0.6))'
                : 'drop-shadow(0 0 16px rgba(244,114,182,0.6))',
            }}
          >
            <Crown className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${accent.text}`} />
          </div>
        ) : (
          <div>
            <Medal className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 mx-auto ${rank === 2 ? 'text-gray-300' : 'text-orange-400'}`}
              style={{ filter: rank === 2
                ? 'drop-shadow(0 0 8px rgba(209,213,219,0.4))'
                : 'drop-shadow(0 0 8px rgba(251,146,60,0.4))'
              }}
            />
          </div>
        )}
      </div>

      {/* Avatar with ring */}
      <div
        className={accent.ring}
      >
        <div
          className={`rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden ${avatarSizeClass}`}
        >
          {player?.avatar ? (
            <img src={player.avatar} alt={player.name} loading="lazy" className="w-full h-full object-cover object-top" />
          ) : (
            <span
              className={`font-bold text-white/70 ${rank === 1 ? 'text-2xl lg:text-4xl' : rank === 2 ? 'text-xl lg:text-3xl' : 'text-lg lg:text-2xl'}`}
            >
              {player?.name?.charAt(0) || '?'}
            </span>
          )}
        </div>
      </div>

      {/* Podium Card Body */}
      <div
        className={`${cardOuterClass} rounded-2xl w-full mt-3 flex flex-col items-center justify-end text-center overflow-hidden ${cardHeightClass}`}
        style={{
          transform: isCenter ? 'rotateX(2deg)' : 'rotateX(1deg)',
          transformOrigin: 'bottom center',
        }}
      >
        <div className="relative z-10 px-3 pb-4 pt-3 w-full">
          <p
            className={`font-bold text-white/90 truncate w-full tracking-tight ${
              rank === 1 ? 'text-sm sm:text-base lg:text-lg' : 'text-xs sm:text-sm lg:text-base'
            }`}
          >
            {player?.name || '---'}
          </p>

          <span className={`tier-badge ${tierClass} mt-1.5 inline-block`}>
            {player?.tier || 'B'}
          </span>

          <p
            className={`font-black mt-2 tabular-nums ${rank === 1 ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-base sm:text-lg lg:text-2xl'} ${accent.gradient}`}
          >
            {player?.points?.toLocaleString() || 0}
            <span className="text-[10px] font-semibold text-white/40 ml-1">PTS</span>
          </p>

          {player && (
            <div className="flex items-center justify-center gap-2.5 mt-2">
              <span className="text-[11px] font-semibold text-white/50 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {player.wins}W
              </span>
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[11px] font-semibold text-white/30 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {player.losses}L
              </span>
            </div>
          )}

          {player?.seasonPoints && player.seasonPoints.length > 0 && (
            <div className="mt-1.5 space-y-0.5 flex flex-col items-center">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                style={{
                  background: 'rgba(255,215,0,0.10)',
                  border: '1px solid rgba(255,215,0,0.15)',
                }}
              >
                <Trophy className="w-2.5 h-2.5" style={{ color: '#FFD700' }} />
                <span className="text-[8px] font-bold" style={{ color: '#FFD700' }}>
                  {player.seasonPoints.reduce((sum, sp) => sum + sp.points, 0).toLocaleString()} total
                </span>
              </div>
              <div className="flex items-center gap-0.5 justify-center flex-wrap">
                {player.seasonPoints.map((sp) => (
                  <span
                    key={sp.season}
                    className="text-[7px] font-semibold px-1 py-[1px] rounded"
                    style={{
                      background: division === 'male' ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)',
                      color: division === 'male' ? 'rgba(115,255,0,0.5)' : 'rgba(56,189,248,0.5)',
                    }}
                  >
                    S{sp.season}:{sp.points}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            className={`mx-auto mt-2.5 w-8 h-8 lg:w-11 lg:h-11 rounded-full flex items-center justify-center font-black text-xs lg:text-sm bg-gradient-to-br ${rankBadgeGradient} ${rankBadgeText}`}
            style={{
              boxShadow:
                rank === 1
                  ? division === 'male'
                    ? '0 3px 16px rgba(115,255,0,0.5)'
                    : '0 3px 16px rgba(244,114,182,0.5)'
                  : '0 2px 10px rgba(0,0,0,0.4)',
            }}
          >
            {rank}
          </div>
        </div>

        {isCenter && (
          <div className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                background: division === 'male'
                  ? 'linear-gradient(180deg, transparent, rgba(115,255,0,0.05))'
                  : 'linear-gradient(180deg, transparent, rgba(244,114,182,0.05))',
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Player Row (rank 4+) — Performance Optimized
   ================================================================ */

function PlayerRow({
  player,
  rank,
  division,
  isCurrentUser,
  index,
  onPlayerClick,
}: {
  player: Player;
  rank: number;
  division: 'male' | 'female';
  isCurrentUser: boolean;
  index: number;
  onPlayerClick?: (playerId: string) => void;
}) {
  const accent = getAccent(division);
  const tierClass = getTierClass(player.tier);

  const rankBadgeClass =
    rank <= 3
      ? `bg-gradient-to-br ${
          rank === 1
            ? division === 'male'
              ? 'from-[#73FF00] to-[#5FD400]'
              : 'from-[#38BDF8] to-[#0EA5E9]'
            : rank === 2
              ? 'from-gray-200 to-gray-400'
              : 'from-orange-300 to-orange-500'
        } text-white font-black`
      : 'bg-white/[0.06] text-white/40 font-semibold';

  return (
    <motion.div
      variants={itemVariants}
      className={`card-float card-accent-line card-inner-glow px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3.5 lg:py-4 ${
        isCurrentUser
          ? division === 'male'
            ? '!border-[#73FF00]/30 !bg-[#73FF00]/[0.08]'
            : '!border-[#38BDF8]/30 !bg-[#38BDF8]/[0.08]'
          : ''
      } ${onPlayerClick ? 'cursor-pointer' : ''}`}
      onClick={() => onPlayerClick?.(player.id)}
      whileHover={onPlayerClick ? { scale: 1.015 } : {}}
      whileTap={onPlayerClick ? { scale: 0.985 } : {}}
    >
      <div className="flex items-center gap-2.5 sm:gap-3.5 lg:gap-4">
        <div
          className={`w-7 h-7 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center text-[11px] lg:text-sm ${rankBadgeClass}`}
          style={
            rank > 3
              ? { boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }
              : {
                  boxShadow:
                    rank === 1
                      ? division === 'male'
                        ? '0 2px 10px rgba(255,214,10,0.4)'
                        : '0 2px 10px rgba(56, 189, 248,0.4)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                }
          }
        >
          {rank}
        </div>

        <div className={accent.ring}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
            {player.avatar ? (
              <img src={player.avatar} alt={player.name} loading="lazy" className="w-full h-full object-cover object-top" />
            ) : (
              <span className="text-xs font-bold text-white/70">{player.name.charAt(0)}</span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] sm:text-sm font-semibold text-white/90 truncate tracking-tight">
              {player.name}
              {isCurrentUser && (
                <span className="text-[10px] font-semibold text-white/30 ml-1.5">(Anda)</span>
              )}
            </p>
            <span className={`tier-badge ${tierClass}`}>{player.tier}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-white/35 font-medium flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
              {player.wins}W
            </span>
            <span className="text-[11px] text-white/35 font-medium flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-red-400/50" />
              {player.losses}L
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-sm tabular-nums ${accent.gradient}`}>
            {player.points.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/35 font-medium mt-0.5">poin</p>
          {player.seasonPoints && player.seasonPoints.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              <div
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{
                  background: 'rgba(255,215,0,0.10)',
                  border: '1px solid rgba(255,215,0,0.15)',
                }}
              >
                <Trophy className="w-2.5 h-2.5" style={{ color: '#FFD700' }} />
                <span className="text-[9px] font-bold" style={{ color: '#FFD700' }}>
                  {player.seasonPoints.reduce((sum, sp) => sum + sp.points, 0).toLocaleString()} total
                </span>
              </div>
              <div className="flex items-center gap-0.5 justify-end flex-wrap">
                {player.seasonPoints.map((sp) => (
                  <span
                    key={sp.season}
                    className="text-[7px] font-semibold px-1 py-[1px] rounded"
                    style={{
                      background: division === 'male' ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)',
                      color: division === 'male' ? 'rgba(115,255,0,0.6)' : 'rgba(56,189,248,0.6)',
                    }}
                  >
                    S{sp.season}:{sp.points}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Stats Summary Card
   ================================================================ */

function StatCard({
  icon,
  value,
  label,
  division,
  index,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  division: 'male' | 'female';
  index: number;
}) {
  const accent = getAccent(division);
  return (
    <motion.div
      custom={index}
      variants={statsVariants}
      className="card-float card-accent-line p-2.5 sm:p-3 lg:p-6 flex items-center gap-2.5 sm:gap-3 lg:gap-6"
    >
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center ${
          division === 'male' ? 'bg-[#73FF00]/[0.08]' : 'bg-[#0EA5E9]/[0.08]'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className={`text-sm sm:text-base font-bold tabular-nums ${accent.gradient}`}>{value}</p>
        <p className="text-[10px] text-white/30 font-medium tracking-wide uppercase">{label}</p>
      </div>
    </motion.div>
  );
}

/* ================================================================
   ELO Player Row Component
   ================================================================ */

function EloPlayerRow({
  player,
  rank,
  division,
  isCurrentUser,
  onPlayerClick,
}: {
  player: EloPlayer;
  rank: number;
  division: 'male' | 'female';
  isCurrentUser: boolean;
  onPlayerClick?: (playerId: string) => void;
}) {
  const accent = getAccent(division);
  const tierColor = ELO_TIER_COLORS[player.eloTier] || '#666';
  const tierBg = ELO_TIER_BG[player.eloTier] || 'bg-white/10 text-white/50 border-white/10';
  const tierIcon = getEloTierIcon(player.eloTier);
  const hasStreak = player.winStreak >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors ${
        isCurrentUser
          ? division === 'male'
            ? '!border-[#73FF00]/30 !bg-[#73FF00]/[0.08]'
            : '!border-[#38BDF8]/30 !bg-[#38BDF8]/[0.08]'
          : ''
      } ${onPlayerClick ? 'cursor-pointer' : ''}`}
      onClick={() => onPlayerClick?.(player.id)}
      whileHover={onPlayerClick ? { scale: 1.01 } : {}}
      whileTap={onPlayerClick ? { scale: 0.98 } : {}}
    >
      {/* Rank */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        rank <= 3
          ? `bg-gradient-to-br ${
              rank === 1
                ? division === 'male'
                  ? 'from-[#73FF00] to-[#5FD400] text-black'
                  : 'from-[#38BDF8] to-[#0EA5E9] text-white'
                : rank === 2
                  ? 'from-gray-200 to-gray-400 text-gray-800'
                  : 'from-orange-300 to-orange-500 text-orange-950'
            }`
          : 'bg-white/[0.06] text-white/40'
      }`}>
        {rank}
      </div>

      {/* Avatar with tier ring */}
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ring-2"
          style={{ '--tw-ring-color': tierColor } as React.CSSProperties}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
            {player.avatar ? (
              <img src={player.avatar} alt={player.name} loading="lazy" className="w-full h-full object-cover object-top" />
            ) : (
              <span className="text-sm font-bold text-white/70">{player.name.charAt(0)}</span>
            )}
          </div>
        </div>
        {/* ELO rating mini badge */}
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black border border-[#12141a]"
          style={{ background: tierColor, color: player.eloTier === 'Gold' || player.eloTier === 'Platinum' || player.eloTier === 'Diamond' ? '#000' : '#fff' }}
        >
          {player.eloRating >= 1000 ? `${Math.floor(player.eloRating / 1000)}k` : player.eloRating}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] sm:text-sm font-semibold text-white/90 truncate tracking-tight">
            {player.name}
            {isCurrentUser && (
              <span className="text-[10px] font-semibold text-white/30 ml-1.5">(Anda)</span>
            )}
          </p>
          {/* Win streak fire */}
          {hasStreak && (
            <div className="flex items-center gap-0.5 text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">{player.winStreak}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {/* ELO tier badge */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${tierBg}`}>
            {tierIcon} {player.eloTier}
          </span>
          {/* W/L */}
          <span className="text-[11px] text-white/35 font-medium flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
            {player.wins}W
          </span>
          <span className="text-[11px] text-white/35 font-medium flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-red-400/50" />
            {player.losses}L
          </span>
        </div>
      </div>

      {/* ELO Rating — prominently displayed */}
      <div className="text-right flex-shrink-0">
        <p className={`font-black text-base tabular-nums ${accent.gradient}`}>
          {player.eloRating}
        </p>
        <p className="text-[10px] text-white/35 font-medium mt-0.5">ELO</p>
        {player.bestStreak > 0 && (
          <p className="text-[9px] text-orange-400/50 font-medium mt-0.5 flex items-center justify-end gap-0.5">
            <Zap className="w-2.5 h-2.5" /> {player.bestStreak} best
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Main Leaderboard Component
   ================================================================ */

export function Leaderboard({ division, players, currentUserId, onPlayerClick }: LeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMode, setActiveMode] = useState<'poin' | 'elo'>('poin');
  const [eloPlayers, setEloPlayers] = useState<EloPlayer[]>([]);
  const [eloLoading, setEloLoading] = useState(false);
  const [eloSearchQuery, setEloSearchQuery] = useState('');

  // Fetch ELO data when ELO tab is selected
  useEffect(() => {
    if (activeMode !== 'elo') return;
    let cancelled = false;
    const loadElo = async () => {
      setEloLoading(true);
      try {
        const res = await fetch(`/api/elo?division=${division}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.leaderboard) {
            if (!cancelled) setEloPlayers(data.leaderboard);
          }
        }
      } catch { /* silent */ }
      if (!cancelled) setEloLoading(false);
    };
    loadElo();
    return () => { cancelled = true; };
  }, [activeMode, division]);

  const filteredEloPlayers = useMemo(() => {
    if (!eloSearchQuery.trim()) return eloPlayers;
    const q = eloSearchQuery.toLowerCase().trim();
    return eloPlayers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.eloTier.toLowerCase().includes(q)
    );
  }, [eloPlayers, eloSearchQuery]);

  const { topThree, restPlayers } = useMemo(() => ({
    topThree: players.slice(0, 3),
    restPlayers: players.slice(3),
  }), [players]);

  const filteredRest = useMemo(() => {
    if (!searchQuery.trim()) return restPlayers;
    const q = searchQuery.toLowerCase().trim();
    return restPlayers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.tier.toLowerCase().includes(q)
    );
  }, [restPlayers, searchQuery]);

  const totalMatches = useMemo(
    () => players.reduce((sum, p) => sum + p.wins + p.losses, 0),
    [players]
  );
  const totalPoints = useMemo(
    () => players.reduce((sum, p) => sum + p.points, 0),
    [players]
  );
  const avgPoints = players.length > 0 ? Math.round(totalPoints / players.length) : 0;

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const accent = getAccent(division);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* =============================================
          Hero Header — with Tab Toggle
          ============================================= */}
      <motion.div
        className="card-pro card-corner-accent rounded-2xl lg:rounded-3xl p-4 lg:p-6"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Ambient glow orb */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[70px] pointer-events-none"
          style={{
            background: division === 'male'
              ? 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(56, 189, 248,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                division === 'male' ? 'bg-[#73FF00]/15' : 'bg-[#0EA5E9]/15'
              }`}
            >
              {activeMode === 'elo' ? (
                <Zap className={`w-7 h-7 ${accent.text}`} />
              ) : (
                <Trophy className={`w-7 h-7 ${accent.text}`} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-white/90 tracking-tight">
                {activeMode === 'elo' ? 'Peringkat ELO' : 'Papan Peringkat'}
              </h2>
              <p className="text-[13px] text-white/40 font-medium mt-0.5">
                {activeMode === 'elo'
                  ? `${eloPlayers.length} pemain dengan rating ELO`
                  : `${players.length} pemain diperingkat musim ini`
                }
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              Tab Toggle: Poin | ELO
              ═══════════════════════════════════════ */}
          <div
            className="relative flex rounded-xl overflow-hidden flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              onClick={() => setActiveMode('poin')}
              className={`relative z-10 px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'poin'
                  ? `bg-gradient-to-r ${
                      division === 'male'
                        ? 'from-[#73FF00] to-[#5FD400] text-black'
                        : 'from-[#38BDF8] to-[#0EA5E9] text-white'
                    } rounded-lg`
                  : 'text-white/45 hover:text-white/60'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline">Poin</span>
            </button>
            <button
              onClick={() => setActiveMode('elo')}
              className={`relative z-10 px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'elo'
                  ? `bg-gradient-to-r ${
                      division === 'male'
                        ? 'from-[#73FF00] to-[#5FD400] text-black'
                        : 'from-[#38BDF8] to-[#0EA5E9] text-white'
                    } rounded-lg`
                  : 'text-white/45 hover:text-white/60'
              }`}
            >
              <Zap className="w-3 h-3" />
              ELO
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════
          ELO MODE
          ═══════════════════════════════════════════════════════════════ */}
      {activeMode === 'elo' && (
        <div className="space-y-4">
          {/* ELO Stats */}
          {eloPlayers.length > 0 && (
            <motion.div
              className="grid grid-cols-3 gap-2 lg:gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <StatCard
                icon={<Users className={`w-5 h-5 ${accent.text}`} />}
                value={eloPlayers.length}
                label="Pemain"
                division={division}
                index={0}
              />
              <StatCard
                icon={<Zap className={`w-5 h-5 ${accent.text}`} />}
                value={eloPlayers.length > 0 ? Math.round(eloPlayers.reduce((s, p) => s + p.eloRating, 0) / eloPlayers.length) : 0}
                label="Rata-rata ELO"
                division={division}
                index={1}
              />
              <StatCard
                icon={<Flame className={`w-5 h-5 ${accent.text}`} />}
                value={eloPlayers.filter(p => p.winStreak >= 3).length}
                label="On Fire"
                division={division}
                index={2}
              />
            </motion.div>
          )}

          {/* ELO Tier Distribution */}
          {eloPlayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex items-center gap-2 flex-wrap px-1"
            >
              {Object.entries(ELO_TIER_COLORS).map(([tier, color]) => {
                const count = eloPlayers.filter(p => p.eloTier === tier).length;
                if (count === 0) return null;
                const tierBg = ELO_TIER_BG[tier] || 'bg-white/10 text-white/50 border-white/10';
                return (
                  <div
                    key={tier}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${tierBg}`}
                  >
                    <span>{getEloTierIcon(tier)}</span>
                    <span>{tier}</span>
                    <span className="opacity-60">({count})</span>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ELO Search */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="card-float card-accent-line flex items-center gap-3 px-4 py-3">
              <Search className={`w-4.5 h-4.5 ${accent.text} opacity-50 flex-shrink-0`} />
              <input
                type="text"
                placeholder="Cari pemain ELO..."
                value={eloSearchQuery}
                onChange={e => setEloSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-white/40 font-medium w-full tracking-tight"
              />
              {eloSearchQuery && (
                <button
                  onClick={() => setEloSearchQuery('')}
                  className="text-[10px] font-semibold text-white/30 px-2 py-1 rounded-lg bg-white/[0.06] flex-shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>

          {/* ELO Loading */}
          {eloLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-white/5 rounded-xl" />
              ))}
            </div>
          )}

          {/* ELO Player List */}
          {!eloLoading && filteredEloPlayers.length > 0 && (
            <div
              className="space-y-2 max-h-[600px] overflow-y-auto pr-0.5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: division === 'male' ? 'rgba(115,255,0,0.12) transparent' : 'rgba(56,189,248,0.12) transparent' }}
            >
              <AnimatePresence mode="popLayout">
                {filteredEloPlayers.map((player, index) => (
                  <EloPlayerRow
                    key={player.id}
                    player={player}
                    rank={index + 1}
                    division={division}
                    isCurrentUser={currentUserId === player.id}
                    onPlayerClick={onPlayerClick}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ELO empty state */}
          {!eloLoading && filteredEloPlayers.length === 0 && (
            <motion.div
              className="card-float card-accent-line p-8 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Zap className={`w-10 h-10 mx-auto mb-3 ${accent.text} opacity-20`} />
              <p className="text-sm font-medium text-white/35">
                {eloSearchQuery ? `Tidak ada hasil untuk "${eloSearchQuery}"` : 'Belum ada data ELO'}
              </p>
              <p className="text-xs text-white/25 mt-1">
                {eloSearchQuery ? 'Coba kata kunci lain' : 'Bermain di turnamen untuk mendapat rating ELO'}
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          POINTS MODE — Original Leaderboard Content
          ═══════════════════════════════════════════════════════════════ */}
      {activeMode === 'poin' && (
      <>
      {/* =============================================
          Stats Summary Row
          ============================================= */}
      {players.length > 0 && (
        <motion.div
          className="grid grid-cols-3 gap-2 lg:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <StatCard
            icon={<Users className={`w-5 h-5 ${accent.text}`} />}
            value={players.length}
            label="Pemain"
            division={division}
            index={0}
          />
          <StatCard
            icon={<Gamepad2 className={`w-5 h-5 ${accent.text}`} />}
            value={totalMatches}
            label="Pertandingan"
            division={division}
            index={1}
          />
          <StatCard
            icon={<Target className={`w-5 h-5 ${accent.text}`} />}
            value={avgPoints.toLocaleString()}
            label="Rata-rata PTS"
            division={division}
            index={2}
          />
        </motion.div>
      )}

      {/* =============================================
          Top 3 Podium
          ============================================= */}
      {topThree.length > 0 && (
        <motion.div
          className="card-pro rounded-2xl lg:rounded-3xl p-3 sm:p-5 lg:p-8 pt-4 sm:pt-7 lg:pt-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-end justify-center gap-1.5 sm:gap-3 lg:gap-8">
            <div className="flex-1 max-w-[90px] sm:max-w-[130px] lg:max-w-[180px]">
              <PodiumCard
                player={topThree[1]}
                rank={2}
                division={division}
                cardHeight={110}
                isCenter={false}
                onPlayerClick={onPlayerClick}
              />
            </div>

            <div className="flex-1 max-w-[100px] sm:max-w-[140px] lg:max-w-[200px]">
              <PodiumCard
                player={topThree[0]}
                rank={1}
                division={division}
                cardHeight={140}
                isCenter={true}
                onPlayerClick={onPlayerClick}
              />
            </div>

            <div className="flex-1 max-w-[90px] sm:max-w-[130px] lg:max-w-[180px]">
              <PodiumCard
                player={topThree[2]}
                rank={3}
                division={division}
                cardHeight={95}
                isCenter={false}
                onPlayerClick={onPlayerClick}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Visual bridge */}
      {topThree.length > 0 && restPlayers.length > 0 && (
        <motion.div
          className="flex items-center gap-3 px-2"
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <span className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.2em]">
            Semua Peringkat
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </motion.div>
      )}

      {/* =============================================
          Search Bar
          ============================================= */}
      {restPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <div className="card-float card-accent-line flex items-center gap-3 px-4 py-3">
            <Search className={`w-4.5 h-4.5 ${accent.text} opacity-50 flex-shrink-0`} />
            <input
              type="text"
              placeholder="Cari pemain..."
              value={searchQuery}
              onChange={handleSearch}
              className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-white/40 font-medium w-full tracking-tight"
            />
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-semibold text-white/30 px-2 py-1 rounded-lg bg-white/[0.06] flex-shrink-0"
              >
                Clear
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* =============================================
          Rest of Leaderboard
          ============================================= */}
      {filteredRest.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2 max-h-[600px] overflow-y-auto pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: division === 'male' ? 'rgba(115,255,0,0.12) transparent' : 'rgba(56,189,248,0.12) transparent' }}
        >
          <div className="hidden lg:flex items-center gap-4 px-6 py-3">
            <div className="w-10 h-10" />
            <div className="w-11 h-11" />
            <div className="flex-1 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Pemain</div>
            <div className="text-right w-24 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Poin</div>
          </div>
          <AnimatePresence mode="popLayout">
            {filteredRest.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={player.rank}
                division={division}
                isCurrentUser={currentUserId === player.id}
                index={index}
                onPlayerClick={onPlayerClick}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Search no results */}
      {searchQuery.trim() && filteredRest.length === 0 && restPlayers.length > 0 && (
        <motion.div
          className="card-float card-accent-line p-6 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Search className={`w-8 h-8 mx-auto mb-2 ${accent.text} opacity-30`} />
          <p className="text-sm font-medium text-white/35">Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;</p>
        </motion.div>
      )}

      {/* Empty state */}
      {players.length === 0 && (
        <motion.div
          className="card-float card-accent-line rounded-2xl p-10 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Medal className={`w-14 h-14 mx-auto mb-4 ${accent.text} opacity-25`} />
          </motion.div>
          <p className="text-sm font-semibold text-white/40">Belum ada peringkat</p>
          <p className="text-xs text-white/40 mt-1.5">Bermain di turnamen untuk naik peringkat</p>
        </motion.div>
      )}

      {/* =============================================
          Grand Final Qualification Notice
          ============================================= */}
      <motion.div
        className={`rounded-2xl p-4 ${
          division === 'male'
            ? 'bg-gradient-to-r from-[#73FF00]/[0.06] via-[#5FD400]/[0.03] to-transparent border border-[#73FF00]/10'
            : 'bg-gradient-to-r from-[#0EA5E9]/[0.06] via-[#38BDF8]/[0.03] to-transparent border border-[#0EA5E9]/10'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              division === 'male' ? 'bg-[#73FF00]/10' : 'bg-[#0EA5E9]/10'
            }`}
          >
            <ChevronUp className={`w-5 h-5 ${accent.text}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white/90 tracking-tight">Kualifikasi Grand Final</p>
            <p className="text-xs text-white/35 mt-0.5">12 pemain teratas lolos ke Grand Final</p>
          </div>
          <div>
            <Star className={`w-5 h-5 ${accent.text} opacity-40`} />
          </div>
        </div>
      </motion.div>

      </>)}
    </div>
  );
}
