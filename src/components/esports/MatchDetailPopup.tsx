'use client';

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  X,
  Star,
  Trophy,
  Clock,
  Swords,
  Check,
  Crown,
  MapPin,
} from 'lucide-react';
import { useCallback, useMemo } from 'react';

/* ================================================================
   Match Interface (mirrors Bracket.tsx)
   ================================================================ */

interface MatchTeam {
  id: string;
  name: string;
  seed?: number;
  members: { user: { id?: string; name: string; tier: string; avatar?: string } }[];
}

interface MatchDetailPopupMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamA: MatchTeam | null;
  teamB: MatchTeam | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  mvpId?: string | null;
  status: string;
  bracket: string;
  completedAt?: string | null;
}

interface MatchDetailPopupProps {
  match: MatchDetailPopupMatch;
  division: 'male' | 'female';
  isOpen: boolean;
  onClose: () => void;
  tournamentName?: string;
}

/* ================================================================
   Color Palette (mirrors Bracket.tsx)
   ================================================================ */

const COLORS = {
  male: {
    accent: '#60A5FA',
    accentLight: '#93C5FD',
    accentDim: 'rgba(96,165,250,0.12)',
    accentGlow: 'rgba(96,165,250,0.08)',
    accentText: '#60A5FA',
    bg: 'rgba(96,165,250,0.06)',
    border: 'rgba(96,165,250,0.15)',
    line: 'rgba(96, 165, 250, 0.3)',
    lineFaint: 'rgba(96, 165, 250, 0.12)',
  },
  female: {
    accent: '#F472B6',
    accentLight: '#F9A8D4',
    accentDim: 'rgba(244,114,182,0.12)',
    accentGlow: 'rgba(244,114,182,0.08)',
    accentText: '#F472B6',
    bg: 'rgba(244,114,182,0.06)',
    border: 'rgba(244,114,182,0.15)',
    line: 'rgba(244, 114, 182, 0.3)',
    lineFaint: 'rgba(244, 114, 182, 0.12)',
  },
};

function getC(division: 'male' | 'female') {
  return COLORS[division];
}

/* ================================================================
   Helpers
   ================================================================ */

function getTierClass(tier: string): string {
  if (tier === 'S') return 'tier-s';
  if (tier === 'A') return 'tier-a';
  return 'tier-b';
}

function getTeamTier(team: MatchTeam | null): string {
  return team?.members?.[0]?.user?.tier || 'B';
}

function getTeamAvatar(team: MatchTeam | null): string | null {
  return team?.members?.[0]?.user?.avatar || null;
}

function getBracketLabel(bracket: string): string {
  switch (bracket) {
    case 'winners': return 'Winner Bracket';
    case 'losers': return 'Loser Bracket';
    case 'grand_final': return 'Grand Final';
    default: return bracket;
  }
}

/* ================================================================
   Main Component
   ================================================================ */

export function MatchDetailPopup({ match, division, isOpen, onClose, tournamentName }: MatchDetailPopupProps) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  const c = getC(division);
  const isWinnerA = match.winnerId === match.teamA?.id;
  const isWinnerB = match.winnerId === match.teamB?.id;

  // Collect all players
  const allPlayers = useMemo(() => {
    const players: Array<{ userId: string; userName: string; teamName: string; teamId: string; avatar?: string; tier: string }> = [];
    if (match.teamA) {
      for (const m of match.teamA.members) {
        if (m.user.id) {
          players.push({ userId: m.user.id, userName: m.user.name, teamName: match.teamA!.name, teamId: match.teamA!.id, avatar: m.user.avatar, tier: m.user.tier });
        }
      }
    }
    if (match.teamB) {
      for (const m of match.teamB.members) {
        if (m.user.id) {
          players.push({ userId: m.user.id, userName: m.user.name, teamName: match.teamB!.name, teamId: match.teamB!.id, avatar: m.user.avatar, tier: m.user.tier });
        }
      }
    }
    return players;
  }, [match.teamA, match.teamB]);

  const mvpPlayer = match.mvpId ? allPlayers.find(p => p.userId === match.mvpId) : null;

  const handleDragEnd = useCallback((_: never, info: PanInfo) => {
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onClose();
    }
  }, [onClose]);

  // Format date
  const formattedDate = match.completedAt
    ? new Date(match.completedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const totalGames = (match.scoreA ?? 0) + (match.scoreB ?? 0);
  const scoreAPercent = totalGames > 0 ? ((match.scoreA ?? 0) / totalGames) * 100 : 50;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="match-detail-popup"
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
            className="relative glass rounded-t-[32px] sm:rounded-[24px] w-full max-h-[85vh] lg:max-w-lg mx-auto overflow-hidden flex flex-col"
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
            {/* Drag Handle + Close */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-[5px] rounded-full bg-white/20 shadow-sm shadow-white/10 mx-auto absolute left-1/2 -translate-x-1/2 top-4" />
              <div className="w-8" /> {/* spacer */}
              <motion.button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4 text-white/60" />
              </motion.button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto overscroll-contain px-6 pb-8 pt-2">
              {/* ── Match Header ── */}
              <motion.div
                className="text-center mb-6"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  {/* Bracket type badge */}
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg"
                    style={{
                      background: match.bracket === 'losers' ? 'rgba(239,68,68,0.1)' :
                        match.bracket === 'grand_final' ? 'rgba(212,201,31,0.1)' :
                        c.accentDim,
                      color: match.bracket === 'losers' ? 'rgba(248,113,113,0.9)' :
                        match.bracket === 'grand_final' ? 'rgba(192,132,252,0.9)' :
                        c.accentText,
                    }}
                  >
                    {getBracketLabel(match.bracket)}
                  </span>
                  <span className="text-[10px] font-medium text-white/25">
                    Ronde {match.round}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white/90 tracking-tight">
                  Pertandingan #{match.matchNumber}
                </h2>
                {tournamentName && (
                  <p className="text-[11px] text-white/35 mt-1 flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {tournamentName}
                  </p>
                )}
              </motion.div>

              {/* ── Score Divider ── */}
              <motion.div
                className="flex items-center justify-center gap-4 mb-5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
              >
                <span
                  className={`text-3xl font-black tabular-nums ${isWinnerA ? '' : 'opacity-40'}`}
                  style={{ color: isWinnerA ? c.accentText : 'rgba(255,255,255,0.5)' }}
                >
                  {match.scoreA ?? 0}
                </span>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: c.accentDim, border: `1px solid ${c.border}` }}
                  >
                    <Swords className="w-4 h-4" style={{ color: c.accentText, opacity: 0.6 }} />
                  </div>
                </div>
                <span
                  className={`text-3xl font-black tabular-nums ${isWinnerB ? '' : 'opacity-40'}`}
                  style={{ color: isWinnerB ? c.accentText : 'rgba(255,255,255,0.5)' }}
                >
                  {match.scoreB ?? 0}
                </span>
              </motion.div>

              {/* ── Score Progress Bar ── */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="flex h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    className="h-full rounded-l-full"
                    style={{ background: `linear-gradient(90deg, ${c.accent}, ${c.accentLight})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${scoreAPercent}%` }}
                    transition={{ delay: 0.4, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  />
                  <motion.div
                    className="h-full rounded-r-full"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - scoreAPercent}%` }}
                    transition={{ delay: 0.4, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px] font-medium" style={{ color: isWinnerA ? c.accentText : 'rgba(255,255,255,0.25)' }}>
                    {match.scoreA ?? 0} game
                  </span>
                  <span className="text-[9px] font-medium" style={{ color: isWinnerB ? c.accentText : 'rgba(255,255,255,0.25)' }}>
                    {match.scoreB ?? 0} game
                  </span>
                </div>
              </motion.div>

              {/* ── Team Cards ── */}
              <div className="space-y-3 mb-6">
                {/* Team A */}
                <TeamDetailCard
                  team={match.teamA}
                  score={match.scoreA}
                  isWinner={isWinnerA}
                  division={division}
                  allPlayers={allPlayers.filter(p => p.teamId === match.teamA?.id)}
                  mvpId={match.mvpId}
                  side="A"
                  delay={0.25}
                />

                {/* Team B */}
                <TeamDetailCard
                  team={match.teamB}
                  score={match.scoreB}
                  isWinner={isWinnerB}
                  division={division}
                  allPlayers={allPlayers.filter(p => p.teamId === match.teamB?.id)}
                  mvpId={match.mvpId}
                  side="B"
                  delay={0.3}
                />
              </div>

              {/* ── MVP Section ── */}
              {mvpPlayer && (
                <motion.div
                  className="rounded-2xl p-4 mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
                    border: '1px solid rgba(245,158,11,0.15)',
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
                        boxShadow: '0 0 12px rgba(245,158,11,0.15)',
                      }}
                    >
                      <Star className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/60">
                        Most Valuable Player
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {mvpPlayer.avatar ? (
                            <img src={mvpPlayer.avatar} alt={mvpPlayer.userName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-white/70">{mvpPlayer.userName.charAt(0)}</span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-white/85 truncate">{mvpPlayer.userName}</p>
                        <span className={`tier-badge ${getTierClass(mvpPlayer.tier)} scale-90`}>{mvpPlayer.tier}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Match Date ── */}
              {formattedDate && (
                <motion.div
                  className="flex items-center justify-center gap-2 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.3 }}
                >
                  <Clock className="w-3.5 h-3.5 text-white/25" />
                  <span className="text-[11px] font-medium text-white/35">
                    Selesai pada {formattedDate}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   Team Detail Card
   ================================================================ */

function TeamDetailCard({
  team,
  score,
  isWinner,
  division,
  allPlayers,
  mvpId,
  side,
  delay,
}: {
  team: MatchTeam | null;
  score: number | null;
  isWinner: boolean;
  division: 'male' | 'female';
  allPlayers: Array<{ userId: string; userName: string; teamName: string; teamId: string; avatar?: string; tier: string }>;
  mvpId?: string | null;
  side: 'A' | 'B';
  delay: number;
}) {
  const c = getC(division);
  const tier = getTeamTier(team);
  const avatar = getTeamAvatar(team);

  return (
    <motion.div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: isWinner
          ? `linear-gradient(135deg, ${c.accentDim}, rgba(255,255,255,0.02))`
          : 'rgba(255,255,255,0.02)',
        border: isWinner ? `1px solid ${c.border}` : '1px solid rgba(255,255,255,0.04)',
      }}
      initial={{ opacity: 0, x: side === 'A' ? -12 : 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Result badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className={`relative flex-shrink-0 ${isWinner ? (division === 'male' ? 'avatar-ring-gold' : 'avatar-ring-pink') : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt={team?.name || ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-white/50">?</span>
              )}
            </div>
          </div>
          <div>
            <p className={`text-sm font-bold ${isWinner ? 'text-white/90' : 'text-white/40 line-through'}`}>
              {team?.name || 'TBD'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {team?.seed && (
                <span className="text-[10px] font-bold text-white/20 tabular-nums">
                  Seed #{team.seed}
                </span>
              )}
              <span className={`tier-badge ${getTierClass(tier)} scale-90`}>{tier}</span>
            </div>
          </div>
        </div>

        {/* WIN/LOSS Badge */}
        {isWinner ? (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
            style={{
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
            }}
          >
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Menang</span>
          </div>
        ) : team && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
            style={{
              background: 'rgba(248, 113, 113, 0.08)',
              border: '1px solid rgba(248, 113, 113, 0.12)',
            }}
          >
            <X className="w-3 h-3 text-red-400/60" />
            <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider">Kalah</span>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium text-white/25 uppercase tracking-wider">Skor</span>
        <span
          className="text-xl font-black tabular-nums"
          style={{ color: isWinner ? c.accentText : 'rgba(255,255,255,0.2)' }}
        >
          {score ?? 0}
        </span>
      </div>

      {/* Players */}
      {team && allPlayers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allPlayers.map((player) => (
            <div
              key={player.userId}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{
                background: isWinner ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {player.avatar ? (
                  <img src={player.avatar} alt={player.userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-bold text-white/70">{player.userName.charAt(0)}</span>
                )}
              </div>
              <span className="text-[10px] font-medium" style={{ color: isWinner ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)' }}>
                {player.userName}
              </span>
              <span className={`tier-badge ${getTierClass(player.tier)} scale-90`}>{player.tier}</span>
              {mvpId === player.userId && <Star className="w-3 h-3 text-amber-400" />}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default MatchDetailPopup;
