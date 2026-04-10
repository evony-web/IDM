'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IDM_LOGO_URL } from '@/lib/cdn';
import ShareButton from '@/components/esports/ShareButton';
import {
  Trophy,
  Users,
  Calendar,
  Coins,
  Swords,
  Shield,
  ChevronRight,
  ChevronLeft,
  Crown,
  Star,
  Zap,
  Info,
  Heart,
  ArrowRight,
  Award,
  X,
} from 'lucide-react';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface LandingPageProps {
  onEnterDivision: (division: 'male' | 'female') => void;
  onAdminLogin: () => void;
  onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void;
  preloadedData?: LandingData | null;
}

interface TopPlayer {
  id?: string;
  rank: number;
  name: string;
  avatar: string | null;
  points: number;
  tier: string;
  isMVP?: boolean;
  mvpScore?: number;
  gender: 'male' | 'female';
}

interface TournamentInfo {
  name: string;
  status: string;
  week: number;
  prizePool: number;
  participants: number;
}

interface DivisionData {
  topPlayers: TopPlayer[];
  tournament: TournamentInfo | null;
  totalPlayers: number;
  totalDonation: number;
}

interface ClubData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  memberCount: number;
  totalPoints: number;
}

interface MatchResult {
  id: string;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number;
  scoreB: number;
  winnerName: string | null;
  mvpName: string | null;
  mvpAvatar: string | null;
  division: string;
  round: number;
  matchNumber: number;
  completedAt: string;
}

interface AchievementItem {
  id: string;
  type: string;
  name: string;
  icon: string;
  userName: string;
  userAvatar: string | null;
  userGender: string;
  earnedAt: string;
}

interface LandingData {
  male: DivisionData;
  female: DivisionData;
  totalDonation: number;
  totalSawer: number;
  clubs: ClubData[];
  bannerMaleUrl: string | null;
  bannerFemaleUrl: string | null;
  recentMatches: MatchResult[];
  liveMatches: MatchResult[];
  liveMatchCount: number;
  recentAchievements: AchievementItem[];
}

/* ────────────────────────────────────────────
   Animation Variants
   ──────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const statusLabels: Record<string, string> = {
  registration: 'Pendaftaran',
  team_generation: 'Pembuatan Tim',
  bracket_generation: 'Pembuatan Bracket',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
};

const statusColors: Record<string, string> = {
  registration: '#F59E0B',
  team_generation: '#F59E0B',
  bracket_generation: '#F59E0B',
  ongoing: '#73FF00',
  completed: '#94A3B8',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Baru saja';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
  return `${Math.floor(seconds / 86400)} hari lalu`;
}

/* ────────────────────────────────────────────
   Skeleton Loader
   ──────────────────────────────────────────── */

function LandingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 md:py-16">
      {/* Hero skeleton */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-white/5 animate-pulse" />
        <div className="w-48 h-8 mt-6 rounded-lg bg-white/5 animate-pulse" />
        <div className="w-36 h-4 mt-3 rounded bg-white/5 animate-pulse" />
        <div className="w-64 h-3 mt-2 rounded bg-white/5 animate-pulse" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-7xl mb-12">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 w-full max-w-7xl">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-[480px] rounded-3xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Stat Card
   ──────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative flex items-center gap-3 px-4 py-3 rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, rgba(${color},0.08) 0%, rgba(${color},0.02) 100%)`,
        border: `1px solid rgba(${color},0.12)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, rgba(${color},0.20) 0%, rgba(${color},0.08) 100%)`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color: `rgb(${color})` }} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-white/40 tracking-wide uppercase truncate">
          {label}
        </p>
        <p className="text-sm font-bold text-white/90 truncate">{value}</p>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Player Row
   ──────────────────────────────────────────── */

function PlayerRow({
  player,
  accent,
  onPlayerClick,
}: {
  player: TopPlayer;
  accent: string;
  onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-1.5 px-2 rounded-xl transition-all duration-150 ${player.id ? 'cursor-pointer active:scale-[0.97] hover:bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
      onClick={player.id && onPlayerClick ? () => { onPlayerClick(player.id, player.gender); } : undefined}
      style={{ touchAction: 'manipulation', animationDelay: `${player.rank * 50}ms`, animation: 'fadeInRow 0.3s ease forwards', opacity: 0 }}
    >
      {/* Rank Badge */}
      <div
        className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black flex-shrink-0"
        style={{
          background:
            player.rank === 1
              ? 'linear-gradient(135deg, #FFD700, #FFA500)'
              : player.rank === 2
                ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                : player.rank === 3
                  ? 'linear-gradient(135deg, #CD7F32, #B87333)'
                  : `rgba(${accent},0.10)`,
          color: player.rank <= 3 ? '#000' : `rgb(${accent})`,
        }}
      >
        {player.rank <= 3 ? (
          <Crown className="w-3.5 h-3.5" strokeWidth={2.5} />
        ) : (
          player.rank
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{
          background: player.avatar
            ? `url(${player.avatar}) center/cover`
            : `linear-gradient(135deg, rgba(${accent},0.25), rgba(${accent},0.08))`,
          border: player.isMVP
            ? `1.5px solid #FFD700`
            : `1.5px solid rgba(${accent},0.20)`,
        }}
      >
        {!player.avatar && (
          <span className="text-[11px] font-bold" style={{ color: `rgb(${accent})` }}>
            {player.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name + Tier */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-white/85 truncate">{player.name}</p>
          {player.isMVP && (
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: 'rgba(255,215,0,0.15)',
                color: '#FFD700',
                border: '1px solid rgba(255,215,0,0.25)',
              }}
            >
              MVP
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/35">Tier {player.tier}</p>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p
          className="text-[13px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #ffd700, #ffec8b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {player.points.toLocaleString()}
        </p>
        <p className="text-[9px] text-white/30">pts</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Division Card
   ──────────────────────────────────────────── */

function DivisionCard({
  division,
  data,
  onEnter,
  onPlayerClick,
}: {
  division: 'male' | 'female';
  data: DivisionData;
  onEnter: () => void;
  onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void;
}) {
  const isMale = division === 'male';
  const accent = isMale ? '115,255,0' : '56,189,248';
  const accentHex = isMale ? '#73FF00' : '#38BDF8';
  const accentHex2 = isMale ? '#5FD400' : '#0EA5E9';
  const label = isMale ? 'MALE DIVISION' : 'FEMALE DIVISION';
  const Icon = isMale ? Swords : Shield;

  return (
    <motion.div
      variants={cardVariants}
      className="relative rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid rgba(${accent},0.12)`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      whileHover={{ scale: 1.015, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Top gradient accent bar */}
      <div
        className="h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${accent},0.5), transparent)`,
        }}
      />

      {/* Corner glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, rgba(${accent},0.08) 0%, transparent 70%)`,
        }}
      />

      <div className="relative p-5 md:p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, rgba(${accent},0.20) 0%, rgba(${accent},0.06) 100%)`,
                border: `1px solid rgba(${accent},0.18)`,
              }}
            >
              <Icon className="w-[18px] h-[18px]" style={{ color: accentHex }} strokeWidth={2} />
            </div>
            <div>
              <h3
                className="text-[13px] font-bold tracking-wider uppercase"
                style={{
                  background: `linear-gradient(135deg, ${accentHex}, ${accentHex2})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {label}
              </h3>
              <p className="text-[11px] text-white/35 mt-0.5">{data.totalPlayers} pemain terdaftar</p>
            </div>
          </div>

          {/* Status badge */}
          {data.tournament && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{
                background: `${statusColors[data.tournament.status]}15`,
                border: `1px solid ${statusColors[data.tournament.status]}30`,
                color: statusColors[data.tournament.status],
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: statusColors[data.tournament.status],
                  boxShadow: `0 0 6px ${statusColors[data.tournament.status]}50`,
                }}
              />
              {statusLabels[data.tournament.status] || data.tournament.status}
            </div>
          )}
        </div>

        {/* Tournament Info */}
        {data.tournament ? (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background: `linear-gradient(135deg, rgba(${accent},0.06) 0%, rgba(${accent},0.02) 100%)`,
              border: `1px solid rgba(${accent},0.08)`,
            }}
          >
            <p className="text-[14px] font-bold text-white/90 mb-2">{data.tournament.name}</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wider">Minggu</p>
                <p className="text-[13px] font-bold text-white/80 flex items-center gap-1">
                  <Calendar className="w-3 h-3" style={{ color: accentHex }} />
                  {data.tournament.week}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wider">Peserta</p>
                <p className="text-[13px] font-bold text-white/80 flex items-center gap-1">
                  <Users className="w-3 h-3" style={{ color: accentHex }} />
                  {data.tournament.participants}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wider">Prize Pool</p>
                <p
                  className="text-[13px] font-bold flex items-center gap-1"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700, #ffec8b)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  <Coins className="w-3 h-3" style={{ WebkitTextFillColor: '#ffd700' }} />
                  {formatRupiah(data.tournament.prizePool)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-4 mb-4 text-center"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p className="text-[12px] text-white/30">Belum ada turnamen aktif</p>
          </div>
        )}

        {/* Top Players */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5" style={{ color: '#FFD700' }} />
              <p className="text-[11px] font-semibold text-white/45 tracking-wide uppercase">
                Top Players
              </p>
            </div>
            <span className="text-[10px] text-white/25">Top 5</span>
          </div>
          <div className="space-y-0.5">
            {data.topPlayers.slice(0, 5).map((player) => (
              <PlayerRow key={player.rank} player={player} accent={accent} onPlayerClick={onPlayerClick} />
            ))}
          </div>
        </div>

        {/* Enter Button */}
        <motion.button
          onClick={onEnter}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[13px] tracking-wide uppercase cursor-pointer outline-none"
          style={{
            background: `linear-gradient(135deg, rgba(${accent},0.18) 0%, rgba(${accent},0.08) 100%)`,
            border: `1.5px solid rgba(${accent},0.25)`,
            color: accentHex,
          }}
          whileHover={{
            background: `linear-gradient(135deg, rgba(${accent},0.25) 0%, rgba(${accent},0.12) 100%)`,
            border: `1.5px solid rgba(${accent},0.35)`,
          }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Zap className="w-4 h-4" />
          MASUK DIVISI
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Leaderboard (Combined Male + Female)
   ──────────────────────────────────────────── */

function TopPlayersSection({ data, onPlayerClick }: { data: LandingData; onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void }) {
  const [showAll, setShowAll] = useState(false);
  const VISIBLE_COUNT = 11;

  // Merge both divisions, sort by points descending, re-rank
  const allPlayers = [...data.male.topPlayers, ...data.female.topPlayers]
    .sort((a, b) => b.points - a.points)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const visiblePlayers = allPlayers.slice(0, VISIBLE_COUNT);
  const hiddenPlayers = allPlayers.slice(VISIBLE_COUNT);
  const hasMore = hiddenPlayers.length > 0;

  return (
    <motion.div variants={itemVariants} className="w-full max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4" style={{ color: '#FFD700' }} />
          <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Leaderboard Preview</h2>
          <span className="text-[11px] text-white/25 ml-1">{allPlayers.length} pemain</span>
        </div>
      </div>

      {/* Leaderboard Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,215,0,0.08)',
        }}
      >
        {/* Player Rows - Top 11 */}
        <div className="px-2 py-2">
          {allPlayers.length > 0 ? (
            <PlayerList players={visiblePlayers} startDelay={0} onPlayerClick={onPlayerClick} />
          ) : (
            <div className="px-4 py-8 text-center">
              <Users className="w-8 h-8 text-white/15 mx-auto mb-2" />
              <p className="text-[12px] text-white/25">Belum ada pemain terdaftar</p>
            </div>
          )}
        </div>

        {/* CTA Lihat Semua */}
        {hasMore && (
          <div className="px-4 pb-2">
            <motion.button
              onClick={() => setShowAll(prev => !prev)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold tracking-wide cursor-pointer transition-colors"
              style={{
                background: 'rgba(255,215,0,0.06)',
                border: '1px solid rgba(255,215,0,0.12)',
                color: '#FFD700',
              }}
              whileHover={{
                background: 'rgba(255,215,0,0.10)',
                borderColor: 'rgba(255,215,0,0.20)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              {showAll ? (
                <>
                  <ChevronRight className="w-3.5 h-3.5 rotate-[-90deg]" />
                  Sembunyikan
                </>
              ) : (
                <>
                  Lihat Semua Pemain
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Expanded Rows - Remaining players */}
        <AnimatePresence>
          {showAll && hasMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-2">
                <PlayerList players={hiddenPlayers} startDelay={VISIBLE_COUNT * 0.03} onPlayerClick={onPlayerClick} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Reusable player list renderer ── */
function PlayerList({ players, startDelay, onPlayerClick }: { players: TopPlayer[]; startDelay: number; onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void }) {
  return (
    <>
      {players.map((player) => {
        const isMale = player.gender === 'male';
        const accent = isMale ? '115,255,0' : '56,189,248';
        return (
          <div
            key={`${player.gender}-${player.rank}`}
            className={`flex items-center gap-3 py-1.5 px-2 rounded-xl transition-all duration-150 ${player.id ? 'cursor-pointer active:scale-[0.97] hover:bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
            onClick={player.id && onPlayerClick ? () => { onPlayerClick(player.id, player.gender); } : undefined}
            style={{ touchAction: 'manipulation', animationDelay: `${Math.min(startDelay + player.rank * 30, 1200)}ms`, animation: 'fadeInRow 0.3s ease forwards', opacity: 0 }}
          >
            {/* Rank Badge */}
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black flex-shrink-0"
              style={{
                background:
                  player.rank === 1
                    ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                    : player.rank === 2
                      ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                      : player.rank === 3
                        ? 'linear-gradient(135deg, #CD7F32, #B87333)'
                        : `rgba(${accent},0.10)`,
                color: player.rank <= 3 ? '#000' : `rgb(${accent})`,
              }}
            >
              {player.rank <= 3 ? (
                <Crown className="w-3.5 h-3.5" strokeWidth={2.5} />
              ) : (
                player.rank
              )}
            </div>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{
                background: player.avatar
                  ? `url(${player.avatar}) center/cover`
                  : `linear-gradient(135deg, rgba(${accent},0.25), rgba(${accent},0.08))`,
                border: player.isMVP
                  ? `1.5px solid #FFD700`
                  : `1.5px solid rgba(${accent},0.20)`,
              }}
            >
              {!player.avatar && (
                <span className="text-[11px] font-bold" style={{ color: `rgb(${accent})` }}>
                  {player.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name + Tier + Gender Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold truncate" style={{ color: isMale ? '#73FF00' : '#38BDF8' }}>{player.name}</p>
                {player.isMVP && (
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: 'rgba(255,215,0,0.15)',
                      color: '#FFD700',
                      border: '1px solid rgba(255,215,0,0.25)',
                    }}
                  >
                    MVP
                  </span>
                )}
                {/* Gender badge */}
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)',
                    color: isMale ? '#73FF00' : '#38BDF8',
                    border: `1px solid ${isMale ? 'rgba(115,255,0,0.18)' : 'rgba(56,189,248,0.18)'}`,
                  }}
                >
                  {isMale ? 'M' : 'F'}
                </span>
              </div>
              <p className="text-[10px] text-white/35">Tier {player.tier}</p>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <p
                className="text-[13px] font-bold"
                style={{
                  background: 'linear-gradient(135deg, #ffd700, #ffec8b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {player.points.toLocaleString()}
              </p>
              <p className="text-[9px] text-white/30">pts</p>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── Inline keyframes for player row fade-in ── */
const playerRowKeyframes = `
@keyframes fadeInRow {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
`;

/* ────────────────────────────────────────────
   Clubs Carousel Section
   ──────────────────────────────────────────── */

function ClubsCarousel({ clubs }: { clubs: ClubData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollButtons, { passive: true });
      window.addEventListener('resize', updateScrollButtons);
    }
    return () => {
      el?.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [clubs]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardEl = el.querySelector('[data-club-card]') as HTMLElement | null;
    const cardWidth = cardEl?.offsetWidth || 180;
    const gap = 16;
    const visible = Math.floor(el.clientWidth / (cardWidth + gap));
    const scrollAmount = (cardWidth + gap) * Math.max(1, Math.floor(visible * 0.7));
    el.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (clubs.length === 0) return null;

  return (
    <motion.div variants={itemVariants} className="w-full max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: '#38BDF8' }} />
          <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Club Terdaftar</h2>
          <span className="text-[11px] text-white/25 ml-1">{clubs.length} club</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default transition-opacity"
            style={{
              background: canScrollLeft ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid rgba(255,255,255,${canScrollLeft ? '0.08' : '0.03'})`,
            }}
            whileHover={canScrollLeft ? { scale: 1.08 } : {}}
            whileTap={canScrollLeft ? { scale: 0.92 } : {}}
          >
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </motion.button>
          <motion.button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default transition-opacity"
            style={{
              background: canScrollRight ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid rgba(255,255,255,${canScrollRight ? '0.08' : '0.03'})`,
            }}
            whileHover={canScrollRight ? { scale: 1.08 } : {}}
            whileTap={canScrollRight ? { scale: 0.92 } : {}}
          >
            <ChevronRight className="w-4 h-4 text-white/60" />
          </motion.button>
        </div>
      </div>

      {/* Scrollable container - hidden scrollbar */}
      <div
        ref={scrollRef}
        data-club-scroll=""
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`[data-club-scroll]::-webkit-scrollbar{display:none}`}</style>
        {clubs.map((club, idx) => (
          <motion.div
            key={club.id}
            data-club-card=""
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className={`relative flex-shrink-0 w-[calc(50%-12px)] sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(16.667%-13px)] overflow-hidden ${club.name === 'GYMSHARK' ? 'rounded-2xl' : 'rounded-2xl'}`}
            style={{
              background: club.name === 'GYMSHARK'
                ? 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: club.name === 'GYMSHARK'
                ? 'none'
                : '1px solid rgba(255,255,255,0.06)',
            }}
            whileHover={{
              y: -3,
              transition: { type: 'spring', stiffness: 400, damping: 25 },
            }}
          >
            {club.name === 'GYMSHARK' && (
              <svg className="absolute inset-[-2px] w-[calc(100%+4px)] h-[calc(100%+4px)] pointer-events-none" style={{ zIndex: 0 }} viewBox="0 0 200 200" preserveAspectRatio="none" fill="none">
                <defs>
                  <linearGradient id="gymNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#73FF00" />
                    <stop offset="50%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#73FF00" />
                  </linearGradient>
                  <filter id="gymNeonGlow">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect x="1" y="1" width="198" height="198" rx="16" ry="16" stroke="url(#gymNeonGrad)" strokeWidth="1" strokeDasharray="275 325" strokeLinecap="round" filter="url(#gymNeonGlow)">
                  <animate attributeName="stroke-dashoffset" from="0" to="-600" dur="3s" repeatCount="indefinite" />
                </rect>
              </svg>
            )}
            {/* Club Logo Area */}
            <div
              className="relative w-full aspect-square flex items-center justify-center overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(115,255,0,0.03) 100%)',
              }}
            >
              {club.logoUrl ? (
                <img
                  src={club.logoUrl}
                  alt={club.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-[80%] h-[80%] rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(115,255,0,0.08) 100%)',
                    border: '1px solid rgba(56,189,248,0.12)',
                  }}
                >
                  <span
                    className="text-3xl md:text-4xl font-black"
                    style={{
                      background: 'linear-gradient(135deg, #38BDF8, #73FF00)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {club.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Rank badge top-right */}
              <div
                className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    idx === 0
                      ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                      : idx === 1
                        ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                        : idx === 2
                          ? 'linear-gradient(135deg, #CD7F32, #B87333)'
                          : 'rgba(255,255,255,0.06)',
                  color: idx <= 2 ? '#000' : 'rgba(255,255,255,0.35)',
                }}
              >
                <span className="text-[10px] font-bold">{idx + 1}</span>
              </div>
            </div>

            {/* Club Info */}
            <div className="p-3">
              <p className="text-[13px] font-bold text-white/85 truncate">{club.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-white/30" />
                  <span className="text-[11px] text-white/40">{club.memberCount} anggota</span>
                </div>
                <span
                  className="text-[11px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700, #ffec8b)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {club.totalPoints.toLocaleString()} pts
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Quick Info Section
   ──────────────────────────────────────────── */

function QuickInfoSection() {
  const infoItems = [
    {
      icon: Info,
      title: 'Cara Daftar',
      description: 'Pergi ke halaman Tournament di divisi pilihanmu, isi formulir pendaftaran dengan data diri yang valid. Tunggu approval dari admin.',
      color: '115,255,0',
    },
    {
      icon: Calendar,
      title: 'Jadwal Turnamen',
      description: 'Turnamen diadakan setiap minggu. Jadwal dan detail mode akan diumumkan melalui dashboard masing-masing divisi.',
      color: '56,189,248',
    },
    {
      icon: Heart,
      title: 'Donasi & Sawer',
      description: 'Dukung turnamen dengan donasi atau sawer ke pemain favoritmu! Semua donasi akan masuk ke prize pool.',
      color: '244,114,182',
    },
  ];

  return (
    <motion.div variants={itemVariants} className="w-full max-w-7xl">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4" style={{ color: '#FFD700' }} />
        <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Informasi</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {infoItems.map((item, idx) => (
          <motion.div
            key={idx}
            className="rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, rgba(${item.color},0.05) 0%, rgba(${item.color},0.01) 100%)`,
              border: `1px solid rgba(${item.color},0.08)`,
            }}
            whileHover={{
              borderColor: `rgba(${item.color},0.15)`,
              y: -2,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{
                background: `linear-gradient(135deg, rgba(${item.color},0.15) 0%, rgba(${item.color},0.05) 100%)`,
              }}
            >
              <item.icon className="w-4 h-4" style={{ color: `rgb(${item.color})` }} strokeWidth={2} />
            </div>
            <h3 className="text-[13px] font-bold text-white/80 mb-1.5">{item.title}</h3>
            <p className="text-[11px] text-white/35 leading-relaxed">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Recent Matches Section
   ──────────────────────────────────────────── */

function RecentMatchesSection({ data }: { data: LandingData }) {
  const matches = data.recentMatches.slice(0, 6);
  const { liveMatchCount } = data;

  return (
    <motion.div variants={itemVariants} className="w-full max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: '#FFD700' }} />
          <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Hasil Pertandingan Terbaru</h2>
        </div>
        {liveMatchCount > 0 && (
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.20)',
              color: '#EF4444',
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            🔴 {liveMatchCount} Pertandingan Sedang Berlangsung
          </motion.div>
        )}
      </div>

      {matches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {matches.map((match, idx) => {
            const isMale = match.division === 'male';
            const accent = isMale ? '115,255,0' : '56,189,248';
            const accentHex = isMale ? '#73FF00' : '#38BDF8';
            const teamAWon = match.scoreA > match.scoreB;
            const teamBWon = match.scoreB > match.scoreA;

            return (
              <motion.div
                key={match.id}
                variants={cardVariants}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                  border: `1px solid rgba(${accent},0.08)`,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
                whileHover={{
                  borderColor: `rgba(${accent},0.16)`,
                  y: -2,
                  transition: { type: 'spring', stiffness: 400, damping: 25 },
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Top gradient accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(${accent},0.3), transparent)`,
                  }}
                />

                {/* Division badge + Round info */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase"
                    style={{
                      background: isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)',
                      color: isMale ? '#73FF00' : '#38BDF8',
                      border: `1px solid ${isMale ? 'rgba(115,255,0,0.18)' : 'rgba(56,189,248,0.18)'}`,
                    }}
                  >
                    {isMale ? 'M' : 'F'} Division
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/25">
                      R{match.round} · #{match.matchNumber}
                    </span>
                    <ShareButton
                      compact
                      text={`🏆 ${match.teamAName || 'Team A'} ${match.scoreA} - ${match.scoreB} ${match.teamBName || 'Team B'} | IDOL META TARKAM`}
                      matchData={{
                        teamAName: match.teamAName || 'Team A',
                        teamBName: match.teamBName || 'Team B',
                        scoreA: match.scoreA,
                        scoreB: match.scoreB,
                        winnerName: match.winnerName || undefined,
                      }}
                    />
                  </div>
                </div>

                {/* Teams + Score */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {/* Team A */}
                  <div className="flex-1 min-w-0 text-right">
                    <p
                      className={`text-[12px] font-bold truncate ${teamAWon ? '' : 'text-white/60'}`}
                      style={teamAWon ? { color: accentHex } : {}}
                    >
                      {match.teamAName || 'Team A'}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-[18px] font-black tabular-nums"
                      style={teamAWon ? { color: accentHex } : { color: 'rgba(255,255,255,0.35)' }}
                    >
                      {match.scoreA}
                    </span>
                    <span className="text-[12px] text-white/20 font-medium">-</span>
                    <span
                      className="text-[18px] font-black tabular-nums"
                      style={teamBWon ? { color: accentHex } : { color: 'rgba(255,255,255,0.35)' }}
                    >
                      {match.scoreB}
                    </span>
                  </div>

                  {/* Team B */}
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      className={`text-[12px] font-bold truncate ${teamBWon ? '' : 'text-white/60'}`}
                      style={teamBWon ? { color: accentHex } : {}}
                    >
                      {match.teamBName || 'Team B'}
                    </p>
                  </div>
                </div>

                {/* Winner badge */}
                {match.winnerName && (
                  <div className="flex items-center justify-center mb-2">
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                      style={{
                        background: 'rgba(34,197,94,0.10)',
                        color: '#22C55E',
                        border: '1px solid rgba(34,197,94,0.18)',
                      }}
                    >
                      <Trophy className="w-3 h-3" />
                      {match.winnerName}
                    </span>
                  </div>
                )}

                {/* MVP info */}
                {match.mvpName && (
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-1.5">
                      {match.mvpAvatar ? (
                        <div
                          className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0"
                          style={{
                            background: `url(${match.mvpAvatar}) center/cover`,
                            border: '1px solid rgba(255,215,0,0.3)',
                          }}
                        />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: 'rgba(255,215,0,0.10)',
                            border: '1px solid rgba(255,215,0,0.2)',
                          }}
                        >
                          <Star className="w-3 h-3 text-yellow-500" />
                        </div>
                      )}
                      <span className="text-[10px] text-yellow-500/70 font-semibold">
                        MVP: {match.mvpName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Time ago */}
                <div className="mt-2 text-center">
                  <span className="text-[9px] text-white/20">{timeAgo(match.completedAt)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Swords className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-[13px] font-semibold text-white/30 mb-1">Belum ada pertandingan selesai</p>
          <p className="text-[11px] text-white/18">Pertandingan akan muncul setelah turnamen dimulai</p>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Achievement Showcase Section
   ──────────────────────────────────────────── */

function AchievementShowcaseSection({ achievements }: { achievements: AchievementItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div variants={itemVariants} className="w-full max-w-7xl">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-4 h-4" style={{ color: '#FFD700' }} />
        <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Pencapaian Terbaru</h2>
        {achievements.length > 0 && (
          <span className="text-[11px] text-white/25 ml-1">{achievements.length} pencapaian</span>
        )}
      </div>

      {achievements.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`[data-achievement-scroll]::-webkit-scrollbar{display:none}`}</style>
          <div data-achievement-scroll="" className="contents">
            {achievements.slice(0, 8).map((achievement, idx) => {
              const isMale = achievement.userGender === 'male';
              const accent = isMale ? '115,255,0' : '56,189,248';
              const accentHex = isMale ? '#73FF00' : '#38BDF8';

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-shrink-0 w-[200px] sm:w-[220px] rounded-2xl p-3 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                    border: `1px solid rgba(${accent},0.08)`,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                  whileHover={{
                    borderColor: `rgba(${accent},0.16)`,
                    y: -2,
                    transition: { type: 'spring', stiffness: 400, damping: 25 },
                  }}
                >
                  {/* Top gradient accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, transparent, rgba(${accent},0.3), transparent)`,
                    }}
                  />

                  {/* Icon + Achievement Name */}
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{
                        background: `linear-gradient(135deg, rgba(${accent},0.15) 0%, rgba(${accent},0.05) 100%)`,
                        border: `1px solid rgba(${accent},0.12)`,
                      }}
                    >
                      {achievement.icon || '🏆'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-white/80 truncate leading-tight">{achievement.name}</p>
                      <p className="text-[9px] text-white/25 mt-0.5">{timeAgo(achievement.earnedAt)}</p>
                    </div>
                  </div>

                  {/* User info */}
                  <div className="flex items-center gap-2 mt-auto">
                    {achievement.userAvatar ? (
                      <div
                        className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                        style={{
                          background: `url(${achievement.userAvatar}) center/cover`,
                          border: `1px solid rgba(${accent},0.20)`,
                        }}
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, rgba(${accent},0.25), rgba(${accent},0.08))`,
                          border: `1px solid rgba(${accent},0.15)`,
                        }}
                      >
                        <span className="text-[9px] font-bold" style={{ color: accentHex }}>
                          {achievement.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: accentHex }}>
                        {achievement.userName}
                      </p>
                    </div>
                    {/* Gender badge */}
                    <span
                      className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)',
                        color: isMale ? '#73FF00' : '#38BDF8',
                        border: `1px solid ${isMale ? 'rgba(115,255,0,0.18)' : 'rgba(56,189,248,0.18)'}`,
                      }}
                    >
                      {isMale ? 'M' : 'F'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{
              background: 'rgba(255,215,0,0.06)',
              border: '1px solid rgba(255,215,0,0.10)',
            }}
          >
            <Award className="w-6 h-6 text-yellow-500/30" />
          </div>
          <p className="text-[13px] font-semibold text-white/30 mb-1">Belum ada pencapaian</p>
          <p className="text-[11px] text-white/18">Pencapaian akan tercatat saat pemain mencapai milestone</p>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   Splash Loading Screen
   ════════════════════════════════════════════ */

function SplashLoadingScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#050507' }}
    >
      {/* Diamond pattern background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Multi-color glows */}
      <div className="absolute w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(115,255,0,0.05) 0%, transparent 60%)', top: '10%', left: '20%' }} />
      <div className="absolute w-[350px] h-[350px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 60%)', bottom: '15%', right: '10%' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.03) 0%, transparent 60%)', top: '40%', left: '50%', transform: 'translateX(-50%)' }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="relative"
      >
        <motion.div
          className="absolute inset-0 rounded-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.10) 0%, transparent 70%)', transform: 'scale(2.2)' }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <img
          src={IDM_LOGO_URL}
          alt="IDM Logo"
          className="relative w-32 h-32 md:w-40 md:h-40"
          loading="eager"
        />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 text-[26px] md:text-[36px] font-black tracking-tight text-center"
        style={{
          background: 'linear-gradient(135deg, #73FF00 0%, #FFD700 45%, #38BDF8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        IDOL META
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="text-[12px] md:text-[14px] font-semibold tracking-[0.2em] uppercase mt-2"
        style={{ color: 'rgba(255,255,255,0.40)' }}
      >
        TARKAM Fan Made Edition
      </motion.p>

      {/* Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.2 }}
        className="mt-10 flex flex-col items-center"
      >
        <div className="relative w-10 h-10">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: '2px solid transparent', borderTopColor: '#FFD700', borderRightColor: 'rgba(255,215,0,0.3)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-1.5 rounded-full"
            style={{ border: '1.5px solid transparent', borderBottomColor: '#73FF00', borderLeftColor: 'rgba(115,255,0,0.2)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFD700' }} />
          </motion.div>
        </div>
        <motion.p
          className="mt-4 text-[11px] tracking-wider text-white/40"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          Loading...
        </motion.p>
      </motion.div>

      {/* Borneo Pride */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="absolute bottom-8 flex flex-col items-center"
      >
        <motion.p
          className="text-[11px] md:text-[12px] font-bold tracking-[0.15em] uppercase"
          style={{
            background: 'linear-gradient(135deg, #ffd700 0%, #ffec8b 50%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✦ Borneo Pride ✦
        </motion.p>
        <span className="mt-1 text-[9px] tracking-widest text-white/30">© 2026</span>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   LandingPage — Main Component
   ════════════════════════════════════════════ */

// Fallback data for when database is unavailable (e.g. Vercel without DB)
const FALLBACK_DATA: LandingData = {
  male: {
    topPlayers: [],
    tournament: null,
    totalPlayers: 0,
    totalDonation: 0,
  },
  female: {
    topPlayers: [],
    tournament: null,
    totalPlayers: 0,
    totalDonation: 0,
  },
  totalDonation: 0,
  totalSawer: 0,
  clubs: [],
  bannerMaleUrl: null,
  bannerFemaleUrl: null,
  recentMatches: [],
  liveMatches: [],
  liveMatchCount: 0,
  recentAchievements: [],
};

export function LandingPage({ onEnterDivision, onAdminLogin, onPlayerClick, preloadedData }: LandingPageProps) {
  const [data, setData] = useState<LandingData | null>(preloadedData ?? null);
  const [loading, setLoading] = useState(!preloadedData);

  const handlePlayerClick = onPlayerClick;

  useEffect(() => {
    if (preloadedData) return; // Already have data, skip fetch
    async function fetchLanding() {
      try {
        const res = await fetch('/api/landing');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setData(json.data);
        }
      } catch {
        // silent - use fallback data
      } finally {
        setLoading(false);
      }
    }
    fetchLanding();
  }, [preloadedData]);


  // Use fallback data when API fails (no database on Vercel, etc.)
  const activeData = data || FALLBACK_DATA;
  if (loading) return <LandingSkeleton />;

  const totalPlayers = activeData.male.totalPlayers + activeData.female.totalPlayers;
  const totalTournaments =
    (activeData.male.tournament ? 1 : 0) + (activeData.female.tournament ? 1 : 0);
  const totalPrizePool =
    (activeData.male.tournament?.prizePool || 0) + (activeData.female.tournament?.prizePool || 0);

  return (
    <>
    <style>{playerRowKeyframes}</style>
    <div className="h-full relative overflow-y-auto overflow-x-hidden">
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: '#050507' }} />
        {/* Green glow (Male) */}
        <div
          className="absolute -top-20 left-1/4 w-[500px] h-[500px]"
          style={{
            background: 'radial-gradient(circle, rgba(115,255,0,0.04) 0%, transparent 60%)',
          }}
        />
        {/* Blue glow (Female) */}
        <div
          className="absolute top-[20%] right-0 w-[500px] h-[500px]"
          style={{
            background: 'radial-gradient(circle, rgba(56,189,248,0.035) 0%, transparent 60%)',
          }}
        />
        {/* Gold glow (center bottom) */}
        <div
          className="absolute bottom-[10%] left-1/3 w-[400px] h-[400px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.02) 0%, transparent 60%)',
          }}
        />
        {/* Diamond pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Content ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center px-4 sm:px-6 lg:px-8 pt-3 pb-8 md:pt-4 md:pb-12 min-h-screen"
      >
        {/* ═══ HERO BANNER — Dual MVP ═══ */}
        {(() => {
          const maleMvpPlayer = activeData.male.topPlayers.find(p => p.isMVP);
          const femaleMvpPlayer = activeData.female.topPlayers.find(p => p.isMVP);
          const hasBannerImage = activeData.bannerMaleUrl || activeData.bannerFemaleUrl;
          const hasMvpPlayer = maleMvpPlayer || femaleMvpPlayer;
          const hasAnyMvp = hasBannerImage || hasMvpPlayer;

          return (
          <motion.div
            variants={itemVariants}
            className="w-full max-w-7xl mt-8 md:mt-10 mb-8 md:mb-10"
          >
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full overflow-visible"
              style={{
                borderRadius: '20px',
              }}
            >
              {/* ── Neon running border (SVG trace around outer perimeter) ── */}
              <svg
                className="absolute pointer-events-none"
                style={{ inset: '-4px', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', zIndex: 10 }}
                viewBox="0 0 1200 500"
                preserveAspectRatio="none"
                fill="none"
              >
                <defs>
                  <linearGradient id="neonGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#73FF00" stopOpacity="0" />
                    <stop offset="20%" stopColor="#73FF00" />
                    <stop offset="50%" stopColor="#38BDF8" />
                    <stop offset="80%" stopColor="#FFD700" />
                    <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                  </linearGradient>
                  <filter id="neonGlow1">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur1" />
                    <feMerge>
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Subtle background track */}
                <rect x="2" y="2" width="1196" height="496" rx="20" ry="20"
                  stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                {/* Static neon glow border */}
                <rect x="2" y="2" width="1196" height="496" rx="20" ry="20"
                  stroke="url(#neonGrad1)" strokeWidth="1.5"
                  filter="url(#neonGlow1)"
                />
              </svg>

              {/* ── Inner content (dark bg covers center) ── */}
              <div
                className="relative w-full overflow-hidden"
                style={{
                  borderRadius: '20px',
                  boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/7] md:aspect-[16/7.5]">
                <div className="w-full h-full grid grid-cols-2">
                  {/* Male MVP — Left */}
                  <div className="relative w-full h-full flex flex-col items-center justify-end gap-2 sm:gap-3 overflow-hidden">
                    {activeData.bannerMaleUrl ? (
                      <>
                        {/* Banner image background */}
                        <img
                          src={activeData.bannerMaleUrl}
                          alt="Male MVP"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Gradient overlay */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(to top, rgba(5,5,7,0.85) 0%, rgba(5,5,7,0.40) 50%, rgba(5,5,7,0.50) 100%)',
                          }}
                        />
                      </>
                    ) : (
                      <>
                        {/* Subtle green radial glow */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `
                              radial-gradient(ellipse 60% 50% at 50% 40%, rgba(115,255,0,0.04) 0%, transparent 100%),
                              linear-gradient(135deg, rgba(5,5,7,0.95) 0%, rgba(10,12,8,0.90) 50%, rgba(5,5,7,0.95) 100%)
                            `,
                          }}
                        />
                        {/* Decorative ring */}
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            width: '120px', height: '120px',
                            borderRadius: '50%',
                            border: '1px solid rgba(115,255,0,0.08)',
                            boxShadow: '0 0 40px rgba(115,255,0,0.03), inset 0 0 40px rgba(115,255,0,0.02)',
                          }}
                        />
                      </>
                    )}
                    {/* MVP Player Info or Empty State */}
                    {maleMvpPlayer ? (
                      <motion.div
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-0 left-0 right-0 z-10 px-3 sm:px-4 pb-2.5 sm:pb-3"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 mx-auto max-w-[180px] sm:max-w-[240px] md:max-w-[260px] p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl" style={{ background: 'rgba(5,5,7,0.55)', border: '1px solid rgba(115,255,0,0.10)', backdropFilter: 'blur(12px)' }}>
                          {/* MVP Avatar — compact */}
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center overflow-hidden"
                              style={{
                                background: maleMvpPlayer.avatar
                                  ? 'none'
                                  : 'linear-gradient(135deg, rgba(115,255,0,0.30), rgba(115,255,0,0.08))',
                                border: '2px solid rgba(255,215,0,0.5)',
                                boxShadow: '0 0 16px rgba(255,215,0,0.12)',
                              }}
                            >
                              {maleMvpPlayer.avatar ? (
                                <img src={maleMvpPlayer.avatar} alt={maleMvpPlayer.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm sm:text-lg md:text-xl font-black text-[#73FF00]">{maleMvpPlayer.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            {/* Crown badge */}
                            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', boxShadow: '0 1px 6px rgba(255,215,0,0.4)' }}>
                              <Crown className="w-2 h-2 sm:w-3 sm:h-3 text-black" strokeWidth={2.5} />
                            </div>
                          </div>
                          {/* MVP Name & Division */}
                          <div className="min-w-0">
                            <p className="text-[12px] sm:text-[13px] md:text-[15px] font-bold text-white/90 tracking-tight truncate">{maleMvpPlayer.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[9px] sm:text-[10px] md:text-[11px] text-[#73FF00]/70 font-semibold tracking-wider uppercase">Male MVP</p>
                              {maleMvpPlayer.mvpScore != null && maleMvpPlayer.mvpScore > 0 && (
                                <span className="flex-shrink-0 text-[9px] sm:text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.25)' }}>Skor {maleMvpPlayer.mvpScore.toLocaleString('id-ID')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        {/* Empty state */}
                        <motion.img
                          src={IDM_LOGO_URL}
                          alt="IDM"
                          className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain opacity-60"
                          animate={{
                            filter: [
                              'brightness(1) saturate(1)',
                              'brightness(1.2) saturate(1.1)',
                              'brightness(1) saturate(1)',
                            ],
                          }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <div className="relative z-10 text-center">
                          <p className="text-[12px] sm:text-[14px] tracking-[0.25em] uppercase text-[#73FF00]/50 font-semibold">
                            Male Division
                          </p>
                          <p className="text-[18px] sm:text-[22px] md:text-[26px] font-bold text-white/80 mt-0.5 tracking-tight">
                            MVP Banner
                          </p>
                        </div>
                        <div className="relative z-10 mt-1">
                          <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#73FF00]/20" />
                        </div>
                      </>
                    )}
                    {/* Bottom left badge — only when no MVP player set */}
                    {!maleMvpPlayer && (
                      <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md z-10" style={{ background: 'rgba(115,255,0,0.08)', border: '1px solid rgba(115,255,0,0.12)', backdropFilter: 'blur(8px)' }}>
                        <span className="text-[11px] font-bold text-[#73FF00]/60 tracking-wider uppercase">Male MVP</span>
                      </div>
                    )}
                  </div>

                  {/* Female MVP — Right */}
                  <div className="relative w-full h-full flex flex-col items-center justify-end gap-2 sm:gap-3 overflow-hidden">
                    {activeData.bannerFemaleUrl ? (
                      <>
                        {/* Banner image background */}
                        <img
                          src={activeData.bannerFemaleUrl}
                          alt="Female MVP"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Gradient overlay */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(to top, rgba(5,5,7,0.85) 0%, rgba(5,5,7,0.40) 50%, rgba(5,5,7,0.50) 100%)',
                          }}
                        />
                      </>
                    ) : (
                      <>
                        {/* Subtle blue radial glow */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `
                              radial-gradient(ellipse 60% 50% at 50% 40%, rgba(56,189,248,0.04) 0%, transparent 100%),
                              linear-gradient(225deg, rgba(5,5,7,0.95) 0%, rgba(8,10,15,0.90) 50%, rgba(5,5,7,0.95) 100%)
                            `,
                          }}
                        />
                        {/* Decorative ring */}
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            width: '120px', height: '120px',
                            borderRadius: '50%',
                            border: '1px solid rgba(56,189,248,0.08)',
                            boxShadow: '0 0 40px rgba(56,189,248,0.03), inset 0 0 40px rgba(56,189,248,0.02)',
                          }}
                        />
                      </>
                    )}
                    {/* MVP Player Info or Empty State */}
                    {femaleMvpPlayer ? (
                      <motion.div
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-0 left-0 right-0 z-10 px-3 sm:px-4 pb-2.5 sm:pb-3"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 mx-auto max-w-[180px] sm:max-w-[240px] md:max-w-[260px] p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl" style={{ background: 'rgba(5,5,7,0.55)', border: '1px solid rgba(56,189,248,0.10)', backdropFilter: 'blur(12px)' }}>
                          {/* MVP Avatar — compact */}
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center overflow-hidden"
                              style={{
                                background: femaleMvpPlayer.avatar
                                  ? 'none'
                                  : 'linear-gradient(135deg, rgba(56,189,248,0.30), rgba(56,189,248,0.08))',
                                border: '2px solid rgba(255,215,0,0.5)',
                                boxShadow: '0 0 16px rgba(255,215,0,0.12)',
                              }}
                            >
                              {femaleMvpPlayer.avatar ? (
                                <img src={femaleMvpPlayer.avatar} alt={femaleMvpPlayer.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm sm:text-lg md:text-xl font-black text-[#38BDF8]">{femaleMvpPlayer.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            {/* Crown badge */}
                            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', boxShadow: '0 1px 6px rgba(255,215,0,0.4)' }}>
                              <Crown className="w-2 h-2 sm:w-3 sm:h-3 text-black" strokeWidth={2.5} />
                            </div>
                          </div>
                          {/* MVP Name & Division */}
                          <div className="min-w-0">
                            <p className="text-[12px] sm:text-[13px] md:text-[15px] font-bold text-white/90 tracking-tight truncate">{femaleMvpPlayer.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[9px] sm:text-[10px] md:text-[11px] text-[#38BDF8]/70 font-semibold tracking-wider uppercase">Female MVP</p>
                              {femaleMvpPlayer.mvpScore != null && femaleMvpPlayer.mvpScore > 0 && (
                                <span className="flex-shrink-0 text-[9px] sm:text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.25)' }}>Skor {femaleMvpPlayer.mvpScore.toLocaleString('id-ID')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        {/* Empty state */}
                        <motion.img
                          src={IDM_LOGO_URL}
                          alt="IDM"
                          className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain opacity-60"
                          animate={{
                            filter: [
                              'brightness(1) saturate(1)',
                              'brightness(1.2) saturate(1.1)',
                              'brightness(1) saturate(1)',
                            ],
                          }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                        />
                        <div className="relative z-10 text-center">
                          <p className="text-[12px] sm:text-[14px] tracking-[0.25em] uppercase text-[#38BDF8]/50 font-semibold">
                            Female Division
                          </p>
                          <p className="text-[18px] sm:text-[22px] md:text-[26px] font-bold text-white/80 mt-0.5 tracking-tight">
                            MVP Banner
                          </p>
                        </div>
                        <div className="relative z-10 mt-1">
                          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#38BDF8]/20" />
                        </div>
                      </>
                    )}
                    {/* Bottom right badge — only when no MVP player set */}
                    {!femaleMvpPlayer && (
                      <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md z-10" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.12)', backdropFilter: 'blur(8px)' }}>
                        <span className="text-[11px] font-bold text-[#38BDF8]/60 tracking-wider uppercase">Female MVP</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center divider line */}
                <div
                  className="absolute top-[10%] bottom-[10%] left-1/2 -translate-x-1/2 w-px pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, rgba(255,215,0,0.25) 30%, rgba(255,215,0,0.35) 50%, rgba(255,215,0,0.25) 70%, transparent)',
                  }}
                />

                {/* ── Thin accent border ── */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: '20px',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                  }}
                />
                {/* Bottom glow line */}
                <div
                  className="absolute bottom-0 left-[10%] right-[10%] h-px pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, rgba(115,255,0,0.20), rgba(255,215,0,0.15) 50%, rgba(56,189,248,0.20))',
                  }}
                />
                {/* Top subtle gold glow line */}
                <div
                  className="absolute top-0 left-[15%] right-[15%] h-px pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.12) 50%, transparent)',
                  }}
                />
              </div>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}

        {/* ═══ STATS BAR ═══ */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-7xl mb-10 md:mb-14"
        >
          <StatCard
            icon={Users}
            label="Total Pemain"
            value={totalPlayers.toString()}
            color="115,255,0"
          />
          <StatCard
            icon={Trophy}
            label="Turnamen Aktif"
            value={`${totalTournaments} / 2`}
            color="56,189,248"
          />
          <StatCard
            icon={Coins}
            label="Total Prize Pool"
            value={formatRupiah(totalPrizePool)}
            color="255,215,0"
          />
          <StatCard
            icon={Heart}
            label="Total Donasi"
            value={formatRupiah(activeData.totalDonation + activeData.totalSawer)}
            color="244,114,182"
          />
        </motion.div>

        {/* ═══ DIVISION CARDS ═══ */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 w-full max-w-7xl mb-10 md:mb-14"
        >
          <DivisionCard
            division="male"
            data={activeData.male}
            onEnter={() => onEnterDivision('male')}
            onPlayerClick={handlePlayerClick}
          />
          <DivisionCard
            division="female"
            data={activeData.female}
            onEnter={() => onEnterDivision('female')}
            onPlayerClick={handlePlayerClick}
          />
        </motion.div>

        {/* ═══ CLUBS CAROUSEL ═══ */}
        <div className="w-full max-w-7xl mb-10 md:mb-14">
          <ClubsCarousel clubs={activeData.clubs} />
        </div>

        {/* ═══ RECENT MATCHES SECTION ═══ */}
        <div className="w-full max-w-7xl mb-10 md:mb-14">
          <RecentMatchesSection data={activeData} />
        </div>

        {/* ═══ TOP PLAYERS SECTION ═══ */}
        <TopPlayersSection data={activeData} onPlayerClick={handlePlayerClick} />

        {/* ═══ ACHIEVEMENT SHOWCASE SECTION ═══ */}
        <div className="w-full max-w-7xl mt-10 md:mt-14 mb-10 md:mb-14">
          <AchievementShowcaseSection achievements={activeData.recentAchievements} />
        </div>

        {/* ═══ QUICK INFO SECTION ═══ */}
        <div className="w-full max-w-7xl mt-10 md:mt-14 mb-10 md:mb-14">
          <QuickInfoSection />
        </div>

        {/* ═══ FOOTER ═══ */}
        <motion.footer
          variants={itemVariants}
          className="mt-auto pt-8 flex flex-col items-center gap-3"
        >
          <p className="text-[11px] text-white/20 hover:text-white/40 transition-colors cursor-pointer tracking-wide"
            onClick={onAdminLogin}
          >
            Admin
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-white/10" />
            <p className="text-[10px] text-white/20 tracking-wider">
              © 2026 IDOL META — Borneo Pride
            </p>
            <div className="h-px w-6 bg-white/10" />
          </div>
        </motion.footer>
      </motion.div>
    </div>

    {/* ═══ ADMIN FAB — Floating Action Button ═══ */}
    <motion.button
      onClick={onAdminLogin}
      className="fixed z-50 flex items-center justify-center cursor-pointer outline-none"
      style={{
        right: 16,
        bottom: 24,
        width: 48,
        height: 48,
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(255,215,0,0.20)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,215,0,0.08), 0 0 30px rgba(255,215,0,0.06)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 1.5 }}
      whileHover={{
        scale: 1.08,
        boxShadow: '0 6px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.15), 0 0 40px rgba(255,215,0,0.10)',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.22) 0%, rgba(255,215,0,0.08) 100%)',
      }}
      whileTap={{ scale: 0.92 }}
    >
      {/* Pulsing glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: '0 0 12px rgba(255,215,0,0.15)',
        }}
        animate={{
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Shield
        className="w-5 h-5 relative z-10"
        style={{ color: '#FFD700' }}
        strokeWidth={2}
      />
    </motion.button>
    </>
  );
}
