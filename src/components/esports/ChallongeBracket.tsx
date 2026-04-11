'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Swords,
  Minus,
  Plus,
  Check,
  Play,
  Lock,
  Star,
  Zap,
  Crown,
  BarChart3,
  Shield,
  AlertTriangle,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useMemo, useState, useEffect, useRef } from 'react';
import { ZoomPanWrapper } from '@/components/ui/zoom-pan-wrapper';
import { MatchDetailPopup } from '@/components/esports/MatchDetailPopup';

/* ================================================================
   Interfaces
   ================================================================ */

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  teamAId?: string | null;
  teamBId?: string | null;
  teamA: {
    id: string;
    name: string;
    seed?: number;
    members: { user: { id?: string; name: string; tier: string; avatar?: string } }[];
  } | null;
  teamB: {
    id: string;
    name: string;
    seed?: number;
    members: { user: { id?: string; name: string; tier: string; avatar?: string } }[];
  } | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  mvpId?: string | null;
  status: string;
  bracket: string;
  completedAt?: string | null;
}

interface BracketProps {
  division: 'male' | 'female';
  matches: Match[];
  isAdmin?: boolean;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  bracketType?: string | null;
  mvpUser?: { id: string; name: string; avatar: string | null; tier: string; points: number; mvpScore?: number } | null;
}

/* ================================================================
   Design Tokens — Challonge Bracket Style
   ================================================================ */

const CHALLONGE_COLORS = {
  male: {
    accent: '#73FF00',
    accentLight: '#A5FF55',
    accentDim: 'rgba(115,255,0,0.10)',
    accentBorder: 'rgba(115,255,0,0.25)',
    accentText: '#73FF00',
    accentLine: 'rgba(115,255,0,0.30)',
    accentGlow: 'rgba(115,255,0,0.15)',
    bg: '#0B0B0F',
    cardBg: 'rgba(255,255,255,0.03)',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardBorderWinner: 'rgba(115,255,0,0.35)',
    losersBorder: 'rgba(239,68,68,0.25)',
    grandBorder: 'rgba(234,179,8,0.50)',
    grandGlow: 'rgba(234,179,8,0.15)',
    liveBorder: 'rgba(239,68,68,0.70)',
  },
  female: {
    accent: '#38BDF8',
    accentLight: '#7DD3FC',
    accentDim: 'rgba(56,189,248,0.10)',
    accentBorder: 'rgba(56,189,248,0.25)',
    accentText: '#38BDF8',
    accentLine: 'rgba(56,189,248,0.30)',
    accentGlow: 'rgba(56,189,248,0.15)',
    bg: '#0B0B0F',
    cardBg: 'rgba(255,255,255,0.03)',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardBorderWinner: 'rgba(56,189,248,0.35)',
    losersBorder: 'rgba(239,68,68,0.25)',
    grandBorder: 'rgba(234,179,8,0.50)',
    grandGlow: 'rgba(234,179,8,0.15)',
    liveBorder: 'rgba(239,68,68,0.70)',
  },
};

function getC(division: 'male' | 'female') {
  return CHALLONGE_COLORS[division];
}

/* ================================================================
   Helpers
   ================================================================ */

function getRoundLabel(round: number, totalRounds: number, bracketLabel?: string): string {
  const prefix = bracketLabel ? `${bracketLabel} ` : '';
  if (totalRounds <= 1) return `${prefix}Final`;
  if (round === totalRounds) return `${prefix}Final`;
  if (round === totalRounds - 1) return `${prefix}Semi Final`;
  if (round === totalRounds - 2) return `${prefix}Quarter Final`;
  return `${prefix}Round ${round}`;
}

function getTierClass(tier: string): string {
  if (tier === 'S') return 'tier-s';
  if (tier === 'A') return 'tier-a';
  return 'tier-b';
}

function getTeamTier(team: Match['teamA']): string {
  return team?.members?.[0]?.user?.tier || 'B';
}

function getTeamAvatar(team: Match['teamA']): string | null {
  return team?.members?.[0]?.user?.avatar || null;
}

function groupByRound(matches: Match[]): { rounds: Record<number, Match[]>; sortedKeys: number[]; maxRound: number } {
  const grouped: Record<number, Match[]> = {};
  matches.forEach((m) => {
    if (!grouped[m.round]) grouped[m.round] = [];
    grouped[m.round].push(m);
  });
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.matchNumber - b.matchNumber));
  const keys = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const max = Math.max(...keys, 0);
  return { rounds: grouped, sortedKeys: keys, maxRound: max };
}

function getBracketLabel(bracket: string): string {
  switch (bracket) {
    case 'winners': return 'Winners';
    case 'losers': return 'Losers';
    case 'grand_final': return 'Grand Final';
    default: return bracket;
  }
}

/* ================================================================
   Animation Variants
   ================================================================ */

const bracketContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const matchCardVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

const roundLabelVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

/* ================================================================
   Challonge Team Row — Display row (standalone component)
   ================================================================ */

function ChallongeTeamRow({ team, score, isWinner, isLoser, division }: {
  team: Match['teamA']; score: number | null; isWinner: boolean; isLoser: boolean; division: 'male' | 'female';
}) {
  const c = getC(division);
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2" style={{ opacity: 0.3 }}>
        <div className="w-6 h-6 rounded-full border border-dashed border-white/10 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white/20">?</span>
        </div>
        <span className="flex-1 text-[11px] font-medium text-white/20 italic truncate">TBD</span>
        <span className="text-sm font-bold tabular-nums text-white/15">-</span>
      </div>
    );
  }

  const avatar = getTeamAvatar(team);
  const tier = getTeamTier(team);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 transition-colors"
      style={{ opacity: isLoser ? 0.35 : 1, background: isWinner ? c.accentDim : 'transparent' }}
    >
      <span className="text-[9px] font-bold w-4 text-center tabular-nums" style={{ color: isWinner ? c.accentText : 'rgba(255,255,255,0.20)' }}>
        {team.seed || '-'}
      </span>
      <div className="relative flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={team.name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] font-bold text-white/50">{team.name.charAt(0)}</span>
          )}
        </div>
        {isWinner && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
            style={{ background: c.accent }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Check className="w-2 h-2 text-black" />
          </motion.div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`truncate text-[11px] font-semibold ${isLoser ? 'line-through' : ''}`} style={{ color: isWinner ? '#fff' : 'rgba(255,255,255,0.70)' }}>
          {team.name}
        </p>
      </div>
      <span className={`tier-badge ${getTierClass(tier)} scale-75 origin-right`}>{tier}</span>
      <span className="text-sm font-black tabular-nums min-w-[20px] text-center" style={{ color: score !== null ? (isWinner ? c.accentText : 'rgba(255,255,255,0.30)') : 'rgba(255,255,255,0.10)' }}>
        {score !== null ? score : '-'}
      </span>
    </div>
  );
}

/* ================================================================
   Challonge Edit Team Row — Editing row (standalone component)
   ================================================================ */

function ChallongeEditTeamRow({ team, score, setScore, division }: {
  team: Match['teamA']; score: number; setScore: (v: number) => void; division: 'male' | 'female';
}) {
  const c = getC(division);
  if (!team) return null;
  const avatar = getTeamAvatar(team);
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="text-[9px] font-bold w-4 text-center tabular-nums text-white/20">
        {team.seed || '-'}
      </span>
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden">
        {avatar ? (
          <img src={avatar} alt={team.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[9px] font-bold text-white/50">{team.name.charAt(0)}</span>
        )}
      </div>
      <span className="flex-1 text-[11px] font-semibold text-white/80 truncate">{team.name}</span>
      <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: c.accentDim, border: `1px solid ${c.accentBorder}` }}>
        <button onClick={() => setScore(Math.max(0, score - 1))} className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center">
          <Minus className="w-2.5 h-2.5 text-white/40" />
        </button>
        <span className="w-6 text-center text-base font-black tabular-nums" style={{ color: c.accentText }}>{score}</span>
        <button onClick={() => setScore(score + 1)} className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center">
          <Plus className="w-2.5 h-2.5 text-white/40" />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   Challonge Match Card — Compact horizontal layout
   ================================================================ */

function ChallongeMatchCard({
  match,
  division,
  onUpdateScore,
  isFinal,
  bracketLabel,
  isAdmin,
  fullWidth = false,
  cardWidth = 220,
}: {
  match: Match;
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  isFinal: boolean;
  bracketLabel?: string;
  isAdmin?: boolean;
  fullWidth?: boolean;
  cardWidth?: number;
}) {
  const c = getC(division);
  const teamA = match.teamA;
  const teamB = match.teamB;
  const isWinnerA = match.winnerId === teamA?.id;
  const isWinnerB = match.winnerId === teamB?.id;
  const isLoserA = match.status === 'completed' && match.winnerId && match.winnerId !== teamA?.id && !!teamA;
  const isLoserB = match.status === 'completed' && match.winnerId && match.winnerId !== teamB?.id && !!teamB;
  const isCompleted = match.status === 'completed';
  const isPending = match.status === 'pending';
  const hasBothTeams = !!teamA && !!teamB;
  const isGrandFinal = match.bracket === 'grand_final';
  const isLosers = match.bracket === 'losers';
  const isLive = match.status === 'ongoing' || match.status === 'live';

  const [editScoreA, setEditScoreA] = useState(match.scoreA ?? 0);
  const [editScoreB, setEditScoreB] = useState(match.scoreB ?? 0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMvpId, setSelectedMvpId] = useState<string | null>(match.mvpId || null);
  const [showMvpDropdown, setShowMvpDropdown] = useState(false);
  const [mvpSearch, setMvpSearch] = useState('');
  const [showDetailPopup, setShowDetailPopup] = useState(false);

  const allPlayers = useMemo(() => {
    const players: Array<{ userId: string; userName: string; teamName: string }> = [];
    if (teamA) {
      for (const m of teamA.members) {
        if (m.user.id) players.push({ userId: m.user.id, userName: m.user.name, teamName: teamA.name });
      }
    }
    if (teamB) {
      for (const m of teamB.members) {
        if (m.user.id) players.push({ userId: m.user.id, userName: m.user.name, teamName: teamB.name });
      }
    }
    return players;
  }, [teamA, teamB]);

  const filteredMvps = mvpSearch
    ? allPlayers.filter(p => p.userName.toLowerCase().includes(mvpSearch.toLowerCase()))
    : allPlayers;

  const mvpCandidates = useMemo(() => {
    if (!isCompleted || !match.winnerId) return allPlayers;
    const winningTeam = match.winnerId === teamA?.id ? teamA : match.winnerId === teamB?.id ? teamB : null;
    if (!winningTeam) return allPlayers;
    return winningTeam.members.map(m => ({ userId: m.user.id, userName: m.user.name, teamName: winningTeam.name }));
  }, [isCompleted, match.winnerId, teamA, teamB, allPlayers]);

  const handleStartMatch = () => {
    setIsEditing(true);
    if (!match.teamAId && match.teamBId) {
      setEditScoreA(0);
      setEditScoreB(1);
    } else if (match.teamAId && !match.teamBId) {
      setEditScoreA(1);
      setEditScoreB(0);
    } else {
      setEditScoreA(match.scoreA ?? 0);
      setEditScoreB(match.scoreB ?? 0);
    }
    setSelectedMvpId(match.mvpId || null);
  };

  const handleSave = async () => {
    if (editScoreA === editScoreB) return;
    setIsSaving(true);
    await onUpdateScore(match.id, editScoreA, editScoreB, selectedMvpId || undefined);
    setIsEditing(false);
    setIsSaving(false);
  };

  const canAdminEdit = isAdmin && isPending && hasBothTeams && !isEditing && !isCompleted;
  const canAdminBye = isAdmin && isPending && !hasBothTeams && (teamA || teamB) && !isEditing;

  const handleCardClick = () => {
    if (canAdminEdit || canAdminBye) {
      handleStartMatch();
    } else if (isCompleted && !isAdmin) {
      setShowDetailPopup(true);
    }
  };

  const getBorderStyle = (): React.CSSProperties => {
    if (isEditing) return { borderColor: c.liveBorder, boxShadow: `0 0 20px ${c.liveBorder}` };
    if (isLive) return { borderColor: c.liveBorder, boxShadow: `0 0 12px ${c.liveBorder}` };
    if (isGrandFinal) return { borderColor: c.grandBorder, boxShadow: `0 0 15px ${c.grandGlow}` };
    if (isLosers) return { borderColor: c.losersBorder };
    if (isCompleted && (isWinnerA || isWinnerB)) return { borderColor: c.cardBorderWinner };
    if (canAdminEdit || canAdminBye) return { borderColor: c.accentBorder, boxShadow: `0 0 12px ${c.accentGlow}` };
    return { borderColor: c.cardBorder };
  };

  return (
    <>
      <motion.div
        variants={matchCardVariants}
        whileHover={!isEditing && !isCompleted ? { scale: 1.02, transition: { duration: 0.15 } } : undefined}
        whileTap={canAdminEdit || canAdminBye ? { scale: 0.98 } : undefined}
        onClick={handleCardClick}
        className={`relative overflow-hidden rounded-xl border backdrop-blur-sm transition-colors
          ${(canAdminEdit || canAdminBye || (isCompleted && !isAdmin)) ? 'cursor-pointer' : ''}
          ${isEditing ? 'ring-2 ring-red-500/50' : ''}
          ${isLive ? 'ring-2 ring-red-500/30' : ''}
          ${isGrandFinal ? 'ring-1' : ''}`}
        style={{
          width: fullWidth ? '100%' : cardWidth,
          background: isGrandFinal
            ? `linear-gradient(135deg, ${c.cardBg}, rgba(234,179,8,0.04))`
            : c.cardBg,
          ...getBorderStyle(),
        }}
        role="button"
        tabIndex={0}
        aria-label={`Match ${match.matchNumber}: ${teamA?.name || 'TBD'} vs ${teamB?.name || 'TBD'}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
      >
        {canAdminEdit && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none z-0"
            animate={{ boxShadow: [`0 0 0 0 ${c.accentGlow}`, `0 0 0 4px ${c.accentDim}`, `0 0 0 0 ${c.accentGlow}`] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        )}

        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-1.5">
            {bracketLabel && (
              <span
                className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: isLosers ? 'rgba(239,68,68,0.08)' : isGrandFinal ? 'rgba(234,179,8,0.10)' : c.accentDim,
                  color: isLosers ? 'rgba(248,113,113,0.8)' : isGrandFinal ? 'rgba(234,179,8,0.9)' : c.accentText,
                }}
              >
                {bracketLabel}
              </span>
            )}
            <span className="text-[8px] font-medium uppercase tracking-wider text-white/20">
              #{match.matchNumber}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {(isEditing || isLive) && (
              <div className="flex items-center gap-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                <span className="text-[7px] font-bold uppercase tracking-wider text-red-400">LIVE</span>
              </div>
            )}
            {isCompleted && !isEditing && !isLive && (
              <span className="text-[7px] font-bold uppercase tracking-wider text-white/20 bg-white/5 px-1.5 py-0.5 rounded">FT</span>
            )}
            {isPending && !isEditing && !isLive && (
              <span className="text-[7px] font-bold uppercase tracking-wider text-white/15">VS</span>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="py-1">
            <ChallongeEditTeamRow team={teamA} score={editScoreA} setScore={setEditScoreA} division={division} />
            <div className="mx-3 my-0.5 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <ChallongeEditTeamRow team={teamB} score={editScoreB} setScore={setEditScoreB} division={division} />

            {mvpCandidates.length > 0 && (
              <div className="relative px-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMvpDropdown(!showMvpDropdown)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-colors ${selectedMvpId ? 'bg-amber-400/10 border border-amber-400/20' : 'bg-white/[0.03] border border-white/[0.06]'}`}
                >
                  <Star className={`w-3 h-3 ${selectedMvpId ? 'text-amber-400' : 'text-white/20'}`} />
                  <span className={`text-[9px] font-medium ${selectedMvpId ? 'text-amber-400' : 'text-white/30'}`}>
                    {selectedMvpId ? allPlayers.find(p => p.userId === selectedMvpId)?.userName || 'MVP' : 'MVP (optional)'}
                  </span>
                </button>
                <AnimatePresence>
                  {showMvpDropdown && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="absolute z-30 top-full left-3 right-3 mt-1 rounded-lg overflow-hidden bg-gray-900 border border-white/10"
                    >
                      <div className="p-1">
                        <input
                          type="text"
                          value={mvpSearch}
                          onChange={e => setMvpSearch(e.target.value)}
                          placeholder="Search..."
                          className="w-full rounded px-2 py-1 text-[9px] bg-white/5 border border-white/[0.06] text-white/80 placeholder:text-white/20 focus:outline-none"
                        />
                      </div>
                      <div className="max-h-24 overflow-y-auto">
                        {filteredMvps.map(player => (
                          <button
                            key={player.userId}
                            type="button"
                            onClick={() => { setSelectedMvpId(player.userId); setMvpSearch(''); setShowMvpDropdown(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-white/5 transition-colors"
                          >
                            <p className="text-[9px] font-medium text-white/70">{player.userName}</p>
                            <p className="text-[8px] text-white/25">{player.teamName}</p>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="px-3 pt-2 pb-2">
              <motion.button
                onClick={handleSave}
                disabled={editScoreA === editScoreB || isSaving}
                className="w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5"
                style={editScoreA === editScoreB || isSaving
                  ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.15)' }
                  : { background: c.accent, color: '#000' }
                }
                whileTap={editScoreA !== editScoreB ? { scale: 0.97 } : undefined}
              >
                {isSaving ? (
                  <motion.div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.6 }} />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                {editScoreA === editScoreB ? 'No draws' : 'Save'}
              </motion.button>
            </div>
          </div>
        ) : (
          <div>
            <ChallongeTeamRow team={teamA} score={match.scoreA} isWinner={isWinnerA} isLoser={isLoserA} division={division} />
            <div className="mx-3 h-px" style={{ background: isCompleted ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)' }} />
            <ChallongeTeamRow team={teamB} score={match.scoreB} isWinner={isWinnerB} isLoser={isLoserB} division={division} />

            {isAdmin && isPending && hasBothTeams && !isEditing && (
              <div className="px-3 pb-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartMatch(); }}
                  className="w-full py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  style={{ background: c.accentDim, color: c.accentText, border: `1px solid ${c.accentBorder}` }}
                >
                  <Play className="w-3 h-3" />
                  Start Match
                </button>
              </div>
            )}
            {isAdmin && isPending && !hasBothTeams && (teamA || teamB) && !isEditing && (
              <div className="px-3 pb-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartMatch(); }}
                  className="w-full py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1.5 opacity-60"
                  style={{ background: c.accentDim, color: c.accentText, border: `1px solid ${c.accentBorder}` }}
                >
                  <Zap className="w-3 h-3" />
                  Bye — Advance
                </button>
              </div>
            )}
            {isAdmin && isPending && !teamA && !teamB && (
              <div className="flex items-center justify-center gap-1 py-2 opacity-30">
                <Lock className="w-2.5 h-2.5" />
                <span className="text-[8px] font-medium text-white/30">Waiting</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <MatchDetailPopup
        match={match}
        division={division}
        isOpen={showDetailPopup}
        onClose={() => setShowDetailPopup(false)}
      />
    </>
  );
}

/* ================================================================
   SVG Connectors — Cubic bezier paths between rounds
   ================================================================ */

interface ConnectorData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isLosers: boolean;
  isGrandFinal: boolean;
}

function BracketSVGConnectors({ connectors, division }: { connectors: ConnectorData[]; division: 'male' | 'female' }) {
  const c = getC(division);

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }} aria-hidden="true">
      {connectors.map((conn, i) => {
        const midX = (conn.x1 + conn.x2) / 2;
        const lineColor = conn.isGrandFinal
          ? 'rgba(234,179,8,0.25)'
          : conn.isLosers
            ? 'rgba(239,68,68,0.15)'
            : c.accentLine;

        const d = `M ${conn.x1} ${conn.y1} C ${midX} ${conn.y1}, ${midX} ${conn.y2}, ${conn.x2} ${conn.y2}`;

        return (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.5}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: i * 0.03, ease: [0.4, 0, 0.2, 1] }}
          />
        );
      })}
    </svg>
  );
}

/* ================================================================
   Mobile SVG Connectors — Vertical connectors
   ================================================================ */

function MobileBracketSVGConnectors({ connectors, division }: { connectors: ConnectorData[]; division: 'male' | 'female' }) {
  const c = getC(division);

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }} aria-hidden="true">
      {connectors.map((conn, i) => {
        const midY = (conn.y1 + conn.y2) / 2;
        const lineColor = conn.isGrandFinal
          ? 'rgba(234,179,8,0.25)'
          : conn.isLosers
            ? 'rgba(239,68,68,0.15)'
            : c.accentLine;

        const d = `M ${conn.x1} ${conn.y1} C ${conn.x1} ${midY}, ${conn.x2} ${midY}, ${conn.x2} ${conn.y2}`;

        return (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.5}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.02, ease: [0.4, 0, 0.2, 1] }}
          />
        );
      })}
    </svg>
  );
}

/* ================================================================
   Desktop Horizontal Bracket Layout
   ================================================================ */

function DesktopBracket({
  matches,
  division,
  onUpdateScore,
  isAdmin,
  bracketFilter,
}: {
  matches: Match[];
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  isAdmin?: boolean;
  bracketFilter?: string;
}) {
  const c = getC(division);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [connectors, setConnectors] = useState<ConnectorData[]>([]);

  const filteredMatches = bracketFilter
    ? matches.filter(m => m.bracket === bracketFilter)
    : matches;

  const { rounds, sortedKeys, maxRound } = useMemo(() => groupByRound(filteredMatches), [filteredMatches]);
  const isFinal = (roundNum: number) => roundNum === maxRound;

  useEffect(() => {
    const computeConnectors = () => {
      const newConnectors: ConnectorData[] = [];
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      for (let ri = 0; ri < sortedKeys.length - 1; ri++) {
        const currentRound = sortedKeys[ri];
        const nextRound = sortedKeys[ri + 1];
        const currentMatches = rounds[currentRound];
        const nextMatches = rounds[nextRound];

        for (let mi = 0; mi < nextMatches.length; mi++) {
          const nextMatch = nextMatches[mi];
          const nextCard = cardRefs.current.get(nextMatch.id);
          if (!nextCard) continue;

          const nextRect = nextCard.getBoundingClientRect();
          const nextY = nextRect.top + nextRect.height / 2 - containerRect.top;
          const nextX = nextRect.left - containerRect.left;

          const sourceA = currentMatches[mi * 2];
          const sourceB = currentMatches[mi * 2 + 1];

          for (const source of [sourceA, sourceB]) {
            if (!source) continue;
            const sourceCard = cardRefs.current.get(source.id);
            if (!sourceCard) continue;

            const sourceRect = sourceCard.getBoundingClientRect();
            const sourceY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
            const sourceX = sourceRect.right - containerRect.left;

            newConnectors.push({
              x1: sourceX,
              y1: sourceY,
              x2: nextX,
              y2: nextY,
              isLosers: source.bracket === 'losers',
              isGrandFinal: source.bracket === 'grand_final' || nextMatch.bracket === 'grand_final',
            });
          }
        }
      }

      setConnectors(newConnectors);
    };

    const rafId = requestAnimationFrame(() => {
      computeConnectors();
    });

    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        requestAnimationFrame(computeConnectors);
      }, 150);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [sortedKeys, rounds, maxRound]);

  const [layoutDims, setLayoutDims] = useState({ cardWidth: 220, cardGapX: 80 });

  useEffect(() => {
    const updateDims = () => {
      const w = window.innerWidth;
      const isTablet = w < 1024;
      setLayoutDims(prev => {
        const newWidth = isTablet ? 180 : 220;
        const newGap = isTablet ? 40 : 80;
        if (prev.cardWidth === newWidth && prev.cardGapX === newGap) return prev;
        return { cardWidth: newWidth, cardGapX: newGap };
      });
    };
    updateDims();
    let dimTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(dimTimer);
      dimTimer = setTimeout(updateDims, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(dimTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const maxMatchesInRound = Math.max(...sortedKeys.map(k => rounds[k]?.length || 0), 1);
  const estimatedCardHeight = 80;
  const cardGapY = 16;
  const totalHeight = maxMatchesInRound * (estimatedCardHeight + cardGapY) + 60;

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: totalHeight }}>
      <BracketSVGConnectors connectors={connectors} division={division} />

      <motion.div
        className="flex"
        style={{ gap: layoutDims.cardGapX }}
        variants={bracketContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {sortedKeys.map((roundKey) => {
          const roundMatches = rounds[roundKey];
          const roundLabel = getRoundLabel(roundKey, maxRound, bracketFilter ? getBracketLabel(bracketFilter) : undefined);

          return (
            <div key={roundKey} className="flex flex-col flex-shrink-0" style={{ width: layoutDims.cardWidth }}>
              <motion.div
                variants={roundLabelVariants}
                className="flex items-center justify-between px-2 py-2 mb-2"
                style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    color: isFinal(roundKey)
                      ? 'rgba(234,179,8,0.8)'
                      : c.accentText,
                  }}
                >
                  {roundLabel}
                </span>
                <span className="text-[8px] font-medium tabular-nums text-white/15">
                  {roundMatches.filter(m => m.status === 'completed').length}/{roundMatches.length}
                </span>
              </motion.div>

              <div className="flex flex-col justify-around flex-1" style={{ gap: cardGapY }}>
                {roundMatches.map((match) => (
                  <div
                    key={match.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(match.id, el);
                    }}
                  >
                    <ChallongeMatchCard
                      match={match}
                      division={division}
                      onUpdateScore={onUpdateScore}
                      isFinal={isFinal(roundKey)}
                      bracketLabel={bracketFilter ? undefined : getBracketLabel(match.bracket)}
                      isAdmin={isAdmin}
                      cardWidth={layoutDims.cardWidth}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ================================================================
   Mobile Vertical Bracket Layout
   ================================================================ */

function MobileBracket({
  matches,
  division,
  onUpdateScore,
  isAdmin,
  bracketFilter,
}: {
  matches: Match[];
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  isAdmin?: boolean;
  bracketFilter?: string;
}) {
  const c = getC(division);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [connectors, setConnectors] = useState<ConnectorData[]>([]);

  const filteredMatches = bracketFilter
    ? matches.filter(m => m.bracket === bracketFilter)
    : matches;

  const { rounds, sortedKeys, maxRound } = useMemo(() => groupByRound(filteredMatches), [filteredMatches]);
  const isFinal = (roundNum: number) => roundNum === maxRound;

  useEffect(() => {
    const computeConnectors = () => {
      const newConnectors: ConnectorData[] = [];
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      for (let ri = 0; ri < sortedKeys.length - 1; ri++) {
        const currentRound = sortedKeys[ri];
        const nextRound = sortedKeys[ri + 1];
        const currentMatches = rounds[currentRound];
        const nextMatches = rounds[nextRound];

        for (let mi = 0; mi < nextMatches.length; mi++) {
          const nextMatch = nextMatches[mi];
          const nextCard = cardRefs.current.get(nextMatch.id);
          if (!nextCard) continue;

          const nextRect = nextCard.getBoundingClientRect();
          const nextX = nextRect.left + nextRect.width / 2 - containerRect.left;
          const nextY = nextRect.top - containerRect.top;

          const sourceA = currentMatches[mi * 2];
          const sourceB = currentMatches[mi * 2 + 1];

          for (const source of [sourceA, sourceB]) {
            if (!source) continue;
            const sourceCard = cardRefs.current.get(source.id);
            if (!sourceCard) continue;

            const sourceRect = sourceCard.getBoundingClientRect();
            const sourceX = sourceRect.left + sourceRect.width / 2 - containerRect.left;
            const sourceY = sourceRect.bottom - containerRect.top;

            newConnectors.push({
              x1: sourceX,
              y1: sourceY,
              x2: nextX,
              y2: nextY,
              isLosers: source.bracket === 'losers',
              isGrandFinal: source.bracket === 'grand_final' || nextMatch.bracket === 'grand_final',
            });
          }
        }
      }

      setConnectors(newConnectors);
    };

    const rafId = requestAnimationFrame(computeConnectors);
    const observer = new ResizeObserver(() => requestAnimationFrame(computeConnectors));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { cancelAnimationFrame(rafId); observer.disconnect(); };
  }, [sortedKeys, rounds, maxRound]);

  return (
    <div ref={containerRef} className="relative">
      <MobileBracketSVGConnectors connectors={connectors} division={division} />

      <motion.div
        className="flex flex-col gap-6"
        variants={bracketContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {sortedKeys.map((roundKey) => {
          const roundMatches = rounds[roundKey];
          const roundLabel = getRoundLabel(roundKey, maxRound, bracketFilter ? getBracketLabel(bracketFilter) : undefined);

          return (
            <div key={roundKey} className="flex flex-col">
              <motion.div
                variants={roundLabelVariants}
                className="flex items-center gap-2 px-1 mb-3"
              >
                <div className="flex items-center gap-2">
                  {isFinal(roundKey) && <Crown className="w-3.5 h-3.5 text-yellow-500/70" />}
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: isFinal(roundKey) ? 'rgba(234,179,8,0.8)' : c.accentText }}
                  >
                    {roundLabel}
                  </span>
                </div>
                <span className="text-[9px] font-medium tabular-nums text-white/15">
                  {roundMatches.filter(m => m.status === 'completed').length}/{roundMatches.length}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roundMatches.map((match) => (
                  <ChallongeMatchCard
                    key={match.id}
                    match={match}
                    division={division}
                    onUpdateScore={onUpdateScore}
                    isFinal={isFinal(roundKey)}
                    bracketLabel={bracketFilter ? undefined : getBracketLabel(match.bracket)}
                    isAdmin={isAdmin}
                    fullWidth={true}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ================================================================
   Round Robin View
   ================================================================ */

function RoundRobinView({
  matches,
  division,
  onUpdateScore,
  isAdmin,
  isSwiss = false,
}: {
  matches: Match[];
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  isAdmin?: boolean;
  isSwiss?: boolean;
}) {
  const c = getC(division);
  const { rounds, sortedKeys } = useMemo(() => groupByRound(matches), [matches]);

  const standings = useMemo(() => {
    const teamStats: Record<string, { id: string; name: string; avatar: string | null; seed?: number; w: number; l: number; d: number; pts: number; scoreFor: number; scoreAgainst: number }> = {};

    matches.forEach(m => {
      if (m.teamA && !teamStats[m.teamA.id]) {
        teamStats[m.teamA.id] = { id: m.teamA.id, name: m.teamA.name, avatar: getTeamAvatar(m.teamA), seed: m.teamA.seed, w: 0, l: 0, d: 0, pts: 0, scoreFor: 0, scoreAgainst: 0 };
      }
      if (m.teamB && !teamStats[m.teamB.id]) {
        teamStats[m.teamB.id] = { id: m.teamB.id, name: m.teamB.name, avatar: getTeamAvatar(m.teamB), seed: m.teamB.seed, w: 0, l: 0, d: 0, pts: 0, scoreFor: 0, scoreAgainst: 0 };
      }
    });

    matches.forEach(m => {
      if (m.status !== 'completed' || m.scoreA === null || m.scoreB === null) return;
      const a = teamStats[m.teamA?.id || ''];
      const b = teamStats[m.teamB?.id || ''];
      if (!a || !b) return;

      a.scoreFor += m.scoreA;
      a.scoreAgainst += m.scoreB;
      b.scoreFor += m.scoreB;
      b.scoreAgainst += m.scoreA;

      if (m.scoreA > m.scoreB) {
        a.w += 1; a.pts += isSwiss ? 1 : 3;
        b.l += 1;
      } else if (m.scoreA < m.scoreB) {
        b.w += 1; b.pts += isSwiss ? 1 : 3;
        a.l += 1;
      } else {
        a.d += 1; a.pts += isSwiss ? 0 : 1;
        b.d += 1; b.pts += isSwiss ? 0 : 1;
      }
    });

    return Object.values(teamStats).sort((a, b) => b.pts - a.pts || (b.scoreFor - b.scoreAgainst) - (a.scoreFor - a.scoreAgainst));
  }, [matches, isSwiss]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Standings Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.cardBorder }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <BarChart3 className="w-4 h-4" style={{ color: c.accentText }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText }}>
            Standings
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]" role="table" aria-label={`${isSwiss ? 'Swiss' : 'Round Robin'} Standings`}>
            <thead>
              <tr className="text-white/25 uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Team</th>
                <th className="px-3 py-2 text-center font-medium">W</th>
                <th className="px-3 py-2 text-center font-medium">L</th>
                {!isSwiss && <th className="px-3 py-2 text-center font-medium">D</th>}
                <th className="px-3 py-2 text-center font-medium">Pts</th>
                <th className="px-3 py-2 text-center font-medium">Diff</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => (
                <motion.tr
                  key={team.id}
                  className="border-t border-white/[0.03]"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.25 }}
                  style={{ background: idx < 3 ? c.accentDim : 'transparent' }}
                >
                  <td className="px-3 py-2">
                    <span className="font-bold" style={{
                      color: idx === 0 ? 'rgba(234,179,8,0.9)' : idx === 1 ? 'rgba(192,192,192,0.8)' : idx === 2 ? 'rgba(205,127,50,0.7)' : 'rgba(255,255,255,0.25)',
                    }}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {team.avatar ? (
                        <img src={team.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white/50">{team.name.charAt(0)}</span>
                        </div>
                      )}
                      <span className="font-semibold text-white/80 truncate">{team.name}</span>
                      {team.seed && <span className="text-[8px] text-white/15">({team.seed})</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-white/60">{team.w}</td>
                  <td className="px-3 py-2 text-center font-bold text-white/40">{team.l}</td>
                  {!isSwiss && <td className="px-3 py-2 text-center font-bold text-white/40">{team.d}</td>}
                  <td className="px-3 py-2 text-center font-black" style={{ color: c.accentText }}>{team.pts}</td>
                  <td className="px-3 py-2 text-center font-bold" style={{ color: (team.scoreFor - team.scoreAgainst) > 0 ? 'rgba(52,211,153,0.7)' : (team.scoreFor - team.scoreAgainst) < 0 ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.25)' }}>
                    {team.scoreFor - team.scoreAgainst > 0 ? '+' : ''}{team.scoreFor - team.scoreAgainst}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matches by Round */}
      <div className="space-y-6">
        {sortedKeys.map((roundKey) => {
          const roundMatches = rounds[roundKey];
          const completedCount = roundMatches.filter(m => m.status === 'completed').length;

          return (
            <motion.div
              key={roundKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
                  Round {roundKey}
                </span>
                <span className="text-[9px] font-medium tabular-nums text-white/15">
                  {completedCount}/{roundMatches.length}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roundMatches.map((match) => (
                  <ChallongeMatchCard
                    key={match.id}
                    match={match}
                    division={division}
                    onUpdateScore={onUpdateScore}
                    isFinal={false}
                    isAdmin={isAdmin}
                    fullWidth={true}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Bracket Progress Bar
   ================================================================ */

function BracketProgressBar({ matches, division }: { matches: Match[]; division: 'male' | 'female' }) {
  const c = getC(division);
  const total = matches.length;
  const completed = matches.filter(m => m.status === 'completed').length;
  const live = matches.filter(m => m.status === 'ongoing' || m.status === 'live').length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" style={{ color: c.accentText }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText }}>
            Bracket Progress
          </span>
        </div>
        <div className="flex items-center gap-2">
          {live > 0 && (
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[9px] font-bold text-red-400">{live} live</span>
            </div>
          )}
          <span className="text-[10px] font-medium tabular-nums text-white/30">
            {completed}/{total} matches
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: c.accent }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

/* ================================================================
   Responsive Hook
   ================================================================ */

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}

/* ================================================================
   Mobile Round Connector (from Classic, adapted to Challonge colors)
   ================================================================ */

function MobileRoundConnector({ division, label }: { division: 'male' | 'female'; label?: string }) {
  const c = getC(division);
  return (
    <div className="flex lg:hidden items-center gap-2 py-2 px-3">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c.accentLine}, ${c.accentText})` }} />
      <div
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full flex-shrink-0"
        style={{
          background: c.cardBg,
          border: `1px solid ${c.accentBorder}`,
          boxShadow: `0 0 8px ${c.accentGlow}`,
        }}
      >
        <ChevronDown className="w-2.5 h-2.5" style={{ color: c.accentText, opacity: 0.6 }} />
        {label && (
          <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText, opacity: 0.6 }}>
            {label}
          </span>
        )}
      </div>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c.accentText}, ${c.accentLine})` }} />
    </div>
  );
}

/* ================================================================
   Section Title Card (from Classic, adapted to Challonge colors)
   ================================================================ */

function SectionTitleCard({ icon: Icon, title, subtitle, division }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  division: 'male' | 'female';
}) {
  const c = getC(division);
  return (
    <motion.div
      className={`rounded-xl lg:rounded-2xl p-3.5 lg:p-6 ${division === 'male' ? 'card-gold' : 'card-pink'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="relative z-10 flex items-center gap-3 lg:gap-6">
        <div className="w-9 h-9 lg:w-14 lg:h-14 rounded-lg lg:rounded-2xl flex items-center justify-center" style={{ background: c.accentDim }}>
          <Icon className="w-4.5 h-4.5 lg:w-7 lg:h-7" style={{ color: c.accentText }} />
        </div>
        <div>
          <h2 className="text-base lg:text-xl font-bold text-white/90 tracking-tight">{title}</h2>
          <p className="text-[11px] lg:text-[13px] text-white/40 font-medium">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Bracket Section Header (from Classic, adapted to Challonge colors)
   ================================================================ */

function BracketSectionHeader({ icon: Icon, title, subtitle, division, color }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  division: 'male' | 'female';
  color: 'gold' | 'red' | 'purple' | 'default';
}) {
  const c = getC(division);

  const sectionClass = color === 'gold'
    ? 'bracket-section-upper'
    : color === 'red'
      ? 'bracket-section-lower'
      : color === 'purple'
        ? 'bracket-section-grand'
        : '';

  const iconBg = color === 'gold'
    ? c.accentDim
    : color === 'red'
      ? 'rgba(239,68,68,0.1)'
      : color === 'purple'
        ? 'rgba(234,179,8,0.1)'
        : 'rgba(255,255,255,0.05)';

  const iconColor = color === 'gold'
    ? c.accentText
    : color === 'red'
      ? 'rgba(248,113,113,0.7)'
      : color === 'purple'
        ? 'rgba(192,132,252,0.7)'
        : 'rgba(255,255,255,0.4)';

  return (
    <div
      className={`rounded-xl p-4 ${sectionClass || 'bg-white/[0.02]'}`}
      style={{
        background: sectionClass ? undefined : 'rgba(255,255,255,0.02)',
        border: sectionClass ? undefined : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white/90 tracking-tight">{title}</h3>
          <p className="text-[10px] text-white/35 font-medium">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MPL Champion Slot (from Classic, adapted to Challonge colors)
   ================================================================ */

function MPLChampionSlot({ winnerTeam, division, mvpUser }: {
  winnerTeam: Match['teamA'] | null;
  division: 'male' | 'female';
  mvpUser?: BracketProps['mvpUser'];
}) {
  const c = getC(division);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <MobileRoundConnector division={division} label="Champion" />

      <div className="flex items-center gap-2 mb-2 px-0.5">
        <span
          className="text-[11px] font-bold tracking-[0.2em] uppercase"
          style={{ color: c.accentText, opacity: 0.7 }}
        >
          JUARA
        </span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c.accentLine}, transparent)` }} />
      </div>

      <div
        className="rounded-2xl p-3.5 lg:p-10 flex flex-col items-center justify-center min-h-[130px] lg:min-h-[280px] relative overflow-hidden"
        style={{
          background: c.cardBg,
          border: `1px solid ${c.accentBorder}`,
          boxShadow: `0 0 20px ${c.accentGlow}`,
        }}
      >
        {/* Star particles */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: [
              'radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              'radial-gradient(1px 1px at 85% 75%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              `radial-gradient(1.5px 1.5px at 50% 50%, ${c.accentGlow} 50%, transparent 100%)`,
              'radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              'radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            ].join(', '),
          }}
        />

        {winnerTeam ? (
          <div className="relative z-10 text-center">
            <div className="mb-3">
              <div className="relative inline-block">
                <Crown
                  className="w-10 h-10 lg:w-16 lg:h-16 mx-auto"
                  style={{
                    color: c.accentText,
                    filter: `drop-shadow(0 0 20px ${c.accentGlow})`,
                  }}
                />
                <div className="absolute -inset-3 rounded-full blur-xl opacity-20" style={{ background: c.accent }} />
              </div>
            </div>
            <div className="mx-auto w-fit">
              <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden mx-auto">
                {getTeamAvatar(winnerTeam) ? (
                  <img src={getTeamAvatar(winnerTeam)!} alt={winnerTeam.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-white/70">{winnerTeam.name.charAt(0)}</span>
                )}
              </div>
            </div>
            <p className="text-base lg:text-2xl font-extrabold text-white/90 mt-3 tracking-tight">{winnerTeam.name}</p>
            <div
              className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full"
              style={{ background: c.accentDim, border: `1px solid ${c.accentBorder}` }}
            >
              <Crown className="w-3 h-3" style={{ color: c.accentText }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText }}>
                JUARA TURNAMEN
              </span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 text-center">
            <div className="mb-3">
              <Crown className="w-10 h-10 lg:w-16 lg:h-16 mx-auto text-white/15" />
            </div>
            <p className="text-sm lg:text-base text-white/30 font-medium mt-3">Menunggu Juara</p>
            <p className="text-xs text-white/15 mt-1">Selesaikan final untuk menobatkan pemenang</p>
          </div>
        )}
      </div>

      {/* MVP Card */}
      {mvpUser && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <MobileRoundConnector division={division} label="MVP" />
          <div
            className="rounded-2xl p-4 lg:p-6"
            style={{
              background: c.accentDim,
              border: `1px solid ${c.accentBorder}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <Crown
                  className="w-7 h-7 lg:w-10 lg:h-10"
                  style={{
                    color: c.accentText,
                    filter: `drop-shadow(0 0 10px ${c.accentGlow})`,
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                  Most Valuable Player
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {mvpUser.avatar ? (
                      <img src={mvpUser.avatar} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-xs font-bold text-white/70">{mvpUser.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/90 truncate">{mvpUser.name}</p>
                    {mvpUser.mvpScore && mvpUser.mvpScore > 0 && (
                      <p className="text-[10px] text-amber-400/60">Skor: {mvpUser.mvpScore.toLocaleString('id-ID')}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-black tabular-nums" style={{ color: c.accentText }}>
                  {mvpUser.points}
                </p>
                <p className="text-[9px] text-white/40 font-medium">points</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ================================================================
   Group Standings (from Classic, adapted to Challonge colors)
   ================================================================ */

interface StandingRow {
  teamId: string;
  teamName: string;
  avatar: string | null;
  tier: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
}

function computeGroupStandings(groupMatches: Match[]): StandingRow[] {
  const teamMap = new Map<string, StandingRow>();

  for (const match of groupMatches) {
    if (match.teamAId && !teamMap.has(match.teamAId)) {
      teamMap.set(match.teamAId, {
        teamId: match.teamAId,
        teamName: match.teamA?.name || 'TBD',
        avatar: getTeamAvatar(match.teamA),
        tier: getTeamTier(match.teamA),
        wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
      });
    }
    if (match.teamBId && !teamMap.has(match.teamBId)) {
      teamMap.set(match.teamBId, {
        teamId: match.teamBId,
        teamName: match.teamB?.name || 'TBD',
        avatar: getTeamAvatar(match.teamB),
        tier: getTeamTier(match.teamB),
        wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
      });
    }

    if (match.status === 'completed' && match.winnerId && match.teamAId && match.teamBId) {
      const sA = match.scoreA ?? 0;
      const sB = match.scoreB ?? 0;
      const a = teamMap.get(match.teamAId)!;
      const b = teamMap.get(match.teamBId)!;

      a.pointsFor += sA; a.pointsAgainst += sB;
      b.pointsFor += sB; b.pointsAgainst += sA;

      if (match.winnerId === match.teamAId) { a.wins++; b.losses++; }
      else { b.wins++; a.losses++; }
    }
  }

  for (const s of teamMap.values()) s.pointDiff = s.pointsFor - s.pointsAgainst;

  return Array.from(teamMap.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return 0;
  });
}

function GroupStandingsTable({ standings, division, groupName }: {
  standings: StandingRow[];
  division: 'male' | 'female';
  groupName: string;
}) {
  const c = getC(division);
  const qualifiedCount = Math.min(2, standings.length);

  return (
    <motion.div
      variants={matchCardVariants}
      className="rounded-xl overflow-hidden border backdrop-blur-sm"
      style={{ background: c.cardBg, borderColor: c.cardBorder }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: c.accentDim }}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: c.accentText }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText }}>{groupName}</span>
        </div>
        <span className="text-[9px] text-white/25 font-medium">Top {qualifiedCount} Lolos</span>
      </div>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-[24px_1fr_40px_40px_48px] gap-1 text-[10px] font-bold uppercase tracking-wider text-white/25 px-2 py-2 border-b border-white/[0.04]">
          <span>#</span>
          <span>Tim</span>
          <span className="text-center">M</span>
          <span className="text-center">+/-</span>
          <span className="text-center">Pts</span>
        </div>
        <div className="space-y-0.5 mt-1">
          {standings.map((s, idx) => {
            const isQualified = idx < qualifiedCount;
            return (
              <div
                key={s.teamId}
                className="grid grid-cols-[24px_1fr_40px_40px_48px] gap-1 items-center px-2 py-2 rounded-lg transition-colors"
                style={{
                  background: isQualified ? c.accentDim : 'rgba(255,255,255,0.02)',
                }}
              >
                <span
                  className="text-[11px] font-black tabular-nums"
                  style={{ color: isQualified ? c.accentText : 'rgba(255,255,255,0.2)' }}
                >
                  {idx + 1}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0"
                  >
                    {s.avatar ? (
                      <img src={s.avatar} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-[9px] font-bold text-white/60">{s.teamName.charAt(0)}</span>
                    )}
                  </div>
                  <span
                    className="truncate text-[12px] font-semibold"
                    style={{ color: isQualified ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}
                  >
                    {s.teamName}
                  </span>
                  {isQualified && <Check className="w-3 h-3 flex-shrink-0 text-emerald-400/60" />}
                </div>
                <span className="text-[11px] font-medium text-white/40 tabular-nums text-center">
                  {s.wins}-{s.losses}
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums text-center"
                  style={{
                    color: s.pointDiff > 0 ? 'rgba(52,211,153,0.7)' : s.pointDiff < 0 ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.25)',
                  }}
                >
                  {s.pointDiff > 0 ? '+' : ''}{s.pointDiff}
                </span>
                <span className="text-[11px] font-semibold text-white/50 tabular-nums text-center">
                  {s.pointsFor}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Main Export — ChallongeBracket
   ================================================================ */

export function ChallongeBracket({ division, matches, isAdmin, onUpdateScore, bracketType, mvpUser }: BracketProps) {
  const c = getC(division);
  const isMobile = useIsMobile();

  /* ─── Bracket Data Detection ──────────────────────────────── */
  const isDoubleElimination = bracketType === 'double' || bracketType === 'double_elimination';

  const bracketData = useMemo(() => {
    if (!matches || matches.length === 0) return null;

    // Round Robin / Swiss detection
    if (bracketType === 'round_robin' || bracketType === 'swiss') {
      const { rounds, sortedKeys, maxRound } = groupByRound(matches);
      return { mode: bracketType as 'round_robin' | 'swiss', rounds, sortedKeys, maxRound };
    }

    const wrMatches = matches.filter((m) => m.bracket === 'winners');
    const lbMatches = matches.filter((m) => m.bracket === 'losers');
    const gfMatches = matches.filter((m) => m.bracket === 'grand_final');
    const groupMatches = matches.filter((m) => m.bracket === 'group');
    const playoffMatches = matches.filter((m) => m.bracket === 'playoff');

    if (!isDoubleElimination && groupMatches.length === 0 && playoffMatches.length === 0) {
      const { rounds, sortedKeys, maxRound } = groupByRound(wrMatches);
      return { mode: 'single' as const, rounds, sortedKeys, maxRound };
    }

    if (groupMatches.length > 0 || playoffMatches.length > 0) {
      const groups = groupByRound(groupMatches);
      const playoffs = groupByRound(playoffMatches);
      return { mode: 'group' as const, groups, playoffs };
    }

    if (isDoubleElimination) {
      const wr = groupByRound(wrMatches);
      const lb = groupByRound(lbMatches);
      const gf = groupByRound(gfMatches);

      let championTeam: Match['teamA'] | null = null;
      if (gf.rounds[1]?.[0]?.status === 'completed') {
        const gfMatch = gf.rounds[1][0];
        championTeam = gfMatch.winnerId === gfMatch.teamA?.id ? gfMatch.teamA : gfMatch.teamB;
      }

      return { mode: 'double' as const, wr, lb, gf, championTeam };
    }

    const all = groupByRound(matches);
    return { mode: 'single' as const, ...all };
  }, [matches, isDoubleElimination, bracketType]);

  /* ─── Progress ───────────────────────────────────────────── */
  const totalMatches = matches?.length ?? 0;
  const completedMatches = matches?.filter((m) => m.status === 'completed').length ?? 0;
  const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  /* ─── RR/Swiss Standings (pre-computed) ───────────────────── */
  const isRoundRobinOrSwiss = bracketData?.mode === 'round_robin' || bracketData?.mode === 'swiss';
  const isRRMode = bracketData?.mode === 'round_robin';

  const rrSwissStandings = useMemo(() => {
    if (!isRoundRobinOrSwiss) return [];
    const teamMap = new Map<string, { id: string; name: string; avatar: string | null; seed: number; w: number; l: number; d: number; pts: number; played: number; scoreFor: number; scoreAgainst: number }>();

    matches.forEach((m) => {
      if (m.status !== 'completed' || m.scoreA === null || m.scoreB === null) return;
      const sA = m.scoreA;
      const sB = m.scoreB;

      [m.teamA, m.teamB].forEach((team, idx) => {
        if (!team) return;
        if (!teamMap.has(team.id)) {
          teamMap.set(team.id, { id: team.id, name: team.name, avatar: getTeamAvatar(team), seed: team.seed || 0, w: 0, l: 0, d: 0, pts: 0, played: 0, scoreFor: 0, scoreAgainst: 0 });
        }
        const entry = teamMap.get(team.id)!;
        entry.played++;
        const isA = idx === 0;
        const myScore = isA ? sA : sB;
        const oppScore = isA ? sB : sA;
        entry.scoreFor += myScore;
        entry.scoreAgainst += oppScore;

        if (isRRMode) {
          if (myScore > oppScore) { entry.w++; entry.pts += 3; }
          else if (myScore < oppScore) { entry.l++; }
          else { entry.d++; entry.pts += 1; }
        } else {
          if (myScore > oppScore) { entry.w++; entry.pts += 1; }
          else { entry.l++; }
        }
      });
    });

    return Array.from(teamMap.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const diffA = a.scoreFor - a.scoreAgainst;
      const diffB = b.scoreFor - b.scoreAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.scoreFor - a.scoreFor;
    }).map((t, i) => ({ ...t, rank: i + 1 }));
  }, [matches, isRoundRobinOrSwiss, isRRMode]);

  /* ─── Empty State ────────────────────────────────────────── */
  if (!matches || matches.length === 0) {
    return (
      <div className="bracket-cosmic-bg rounded-2xl p-2.5 lg:p-6 space-y-3 lg:space-y-5">
        <SectionTitleCard icon={Swords} title="Bracket Turnamen" subtitle="Eliminasi Langsung" division={division} />
        <motion.div
          className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border backdrop-blur-sm"
          style={{ background: c.cardBg, borderColor: c.cardBorder }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: c.accentDim }}>
            <Trophy className="w-7 h-7" style={{ color: c.accentText, opacity: 0.5 }} />
          </div>
          <p className="text-sm font-semibold text-white/40">No matches yet</p>
          <p className="text-[11px] text-white/20 mt-1">Bracket will appear when matches are generated</p>
        </motion.div>
      </div>
    );
  }

  /* ─── Single Elimination ─────────────────────────────────── */
  if (bracketData && bracketData.mode === 'single') {
    const { rounds, sortedKeys, maxRound } = bracketData;

    const winnerMatch = sortedKeys.length > 0
      ? (rounds?.[maxRound] || []).find((m) => m.status === 'completed')
      : null;
    const winnerTeam = winnerMatch
      ? winnerMatch.winnerId === winnerMatch.teamA?.id ? winnerMatch.teamA : winnerMatch.teamB
      : null;

    return (
      <div className="bracket-cosmic-bg rounded-2xl p-2.5 lg:p-6 space-y-3 lg:space-y-5">
        <SectionTitleCard icon={Swords} title="Bracket Turnamen" subtitle="Eliminasi Langsung" division={division} />

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-center gap-3 px-1"
        >
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: c.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: c.accentText }}>
            {completedMatches}/{totalMatches}
          </span>
        </motion.div>

        {/* Bracket Layout */}
        {isMobile ? (
          <div className="overflow-x-auto -mx-4 px-4">
            <MobileBracket
              matches={matches}
              division={division}
              onUpdateScore={onUpdateScore}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          <ZoomPanWrapper className="rounded-xl border border-white/[0.04]" style={{ maxHeight: 700 }}>
            <div className="p-6">
              <DesktopBracket
                matches={matches}
                division={division}
                onUpdateScore={onUpdateScore}
                isAdmin={isAdmin}
              />
            </div>
          </ZoomPanWrapper>
        )}

        <MPLChampionSlot winnerTeam={winnerTeam} division={division} mvpUser={mvpUser} />
      </div>
    );
  }

  /* ─── Double Elimination ─────────────────────────────────── */
  if (bracketData && bracketData.mode === 'double') {
    const { wr, lb, gf, championTeam } = bracketData;
    const winnersMatches = matches.filter(m => m.bracket === 'winners');
    const losersMatches = matches.filter(m => m.bracket === 'losers');
    const grandFinalMatches = matches.filter(m => m.bracket === 'grand_final');

    return (
      <div className="bracket-cosmic-bg rounded-2xl p-2.5 lg:p-6 space-y-3 lg:space-y-5">
        <SectionTitleCard icon={Swords} title="Bracket Turnamen" subtitle="Double Elimination" division={division} />

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-center gap-3 px-1"
        >
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: c.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: c.accentText }}>
            {completedMatches}/{totalMatches}
          </span>
        </motion.div>

        {/* Winners Bracket */}
        {winnersMatches.length > 0 && (
          <div>
            <BracketSectionHeader icon={Trophy} title="WINNERS BRACKET" subtitle="Kalah sekali → turun ke Losers" division={division} color="gold" />
            <div className="mt-3">
              {isMobile ? (
                <div className="overflow-x-auto -mx-4 px-4">
                  <MobileBracket
                    matches={winnersMatches}
                    division={division}
                    onUpdateScore={onUpdateScore}
                    isAdmin={isAdmin}
                    bracketFilter="winners"
                  />
                </div>
              ) : (
                <ZoomPanWrapper className="rounded-xl border border-white/[0.04]" style={{ maxHeight: 600 }}>
                  <div className="p-6">
                    <DesktopBracket
                      matches={winnersMatches}
                      division={division}
                      onUpdateScore={onUpdateScore}
                      isAdmin={isAdmin}
                      bracketFilter="winners"
                    />
                  </div>
                </ZoomPanWrapper>
              )}
            </div>
          </div>
        )}

        {/* Losers Bracket */}
        {losersMatches.length > 0 && (
          <div>
            <BracketSectionHeader icon={AlertTriangle} title="LOSERS BRACKET" subtitle="Kalah dua kali = eliminasi" division={division} color="red" />
            <div className="mt-3">
              {isMobile ? (
                <div className="overflow-x-auto -mx-4 px-4">
                  <MobileBracket
                    matches={losersMatches}
                    division={division}
                    onUpdateScore={onUpdateScore}
                    isAdmin={isAdmin}
                    bracketFilter="losers"
                  />
                </div>
              ) : (
                <ZoomPanWrapper className="rounded-xl border border-red-500/10" style={{ maxHeight: 600 }}>
                  <div className="p-6">
                    <DesktopBracket
                      matches={losersMatches}
                      division={division}
                      onUpdateScore={onUpdateScore}
                      isAdmin={isAdmin}
                      bracketFilter="losers"
                    />
                  </div>
                </ZoomPanWrapper>
              )}
            </div>
          </div>
        )}

        {/* Grand Final */}
        {grandFinalMatches.length > 0 && (
          <div>
            <BracketSectionHeader icon={Crown} title="GRAND FINAL" subtitle="WB Champion vs LB Champion" division={division} color="purple" />
            <MobileRoundConnector division={division} label="Grand Final" />
            <div className="flex justify-center mt-3">
              <div className="space-y-3 max-w-sm w-full">
                {grandFinalMatches.map((match) => (
                  <ChallongeMatchCard
                    key={match.id}
                    match={match}
                    division={division}
                    onUpdateScore={onUpdateScore}
                    isFinal={true}
                    bracketLabel="Grand Final"
                    isAdmin={isAdmin}
                    fullWidth={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <MPLChampionSlot winnerTeam={championTeam} division={division} mvpUser={mvpUser} />
      </div>
    );
  }

  /* ─── Group + Playoff ────────────────────────────────────── */
  if (bracketData && bracketData.mode === 'group') {
    const groupMatches = matches.filter(m => m.bracket === 'group');
    const playoffMatches = matches.filter(m => m.bracket === 'playoff');

    // Find playoff champion
    const { rounds: playoffRounds, sortedKeys: playoffKeys, maxRound: playoffMax } = groupByRound(playoffMatches);
    const playoffFinalMatch = playoffMax ? (playoffRounds[playoffMax] || []).find((m) => m.status === 'completed') : null;
    const playoffChampion = playoffFinalMatch
      ? playoffFinalMatch.winnerId === playoffFinalMatch.teamA?.id ? playoffFinalMatch.teamA : playoffFinalMatch.teamB
      : null;

    return (
      <div className="bracket-cosmic-bg rounded-2xl p-2.5 lg:p-6 space-y-3 lg:space-y-5">
        <SectionTitleCard icon={Trophy} title="Bracket Turnamen" subtitle="Babak Grup + Playoff" division={division} />

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-center gap-3 px-1"
        >
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: c.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: c.accentText }}>
            {completedMatches}/{totalMatches}
          </span>
        </motion.div>

        {/* Group Stage */}
        {bracketData.groups.sortedKeys.length > 0 && (
          <>
            <BracketSectionHeader icon={Shield} title="BABAK PENYISIHAN" subtitle="Round-robin dalam grup" division={division} color="default" />

            {/* Group matches */}
            <div className="space-y-3">
              {bracketData.groups.sortedKeys.map((roundNum) => {
                const groupRoundMatches = bracketData.groups.rounds[roundNum] || [];
                return (
                  <div key={roundNum} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groupRoundMatches.map((match: Match) => (
                      <ChallongeMatchCard
                        key={match.id}
                        match={match}
                        division={division}
                        onUpdateScore={onUpdateScore}
                        isFinal={false}
                        bracketLabel="GRUP"
                        isAdmin={isAdmin}
                        fullWidth={true}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Group Standings */}
            {bracketData.groups.sortedKeys.map((roundNum) => {
              const groupRoundMatches = bracketData.groups.rounds[roundNum] || [];
              const hasCompletedMatch = groupRoundMatches.some((m: Match) => m.status === 'completed');
              if (!hasCompletedMatch) return null;
              const standings = computeGroupStandings(groupRoundMatches);
              return (
                <GroupStandingsTable
                  key={roundNum}
                  standings={standings}
                  division={division}
                  groupName={`Grup ${roundNum}`}
                />
              );
            })}
          </>
        )}

        {/* Playoff */}
        {bracketData.playoffs.sortedKeys.length > 0 && (
          <>
            <BracketSectionHeader icon={Zap} title="PLAYOFF" subtitle="Eliminasi langsung" division={division} color="gold" />
            <MobileRoundConnector division={division} label="Playoff" />
            <div className="mt-3">
              {isMobile ? (
                <div className="overflow-x-auto -mx-4 px-4">
                  <MobileBracket
                    matches={playoffMatches}
                    division={division}
                    onUpdateScore={onUpdateScore}
                    isAdmin={isAdmin}
                    bracketFilter="playoff"
                  />
                </div>
              ) : (
                <ZoomPanWrapper className="rounded-xl border border-white/[0.04]" style={{ maxHeight: 600 }}>
                  <div className="p-6">
                    <DesktopBracket
                      matches={playoffMatches}
                      division={division}
                      onUpdateScore={onUpdateScore}
                      isAdmin={isAdmin}
                      bracketFilter="playoff"
                    />
                  </div>
                </ZoomPanWrapper>
              )}
            </div>
          </>
        )}

        <MPLChampionSlot winnerTeam={playoffChampion} division={division} mvpUser={mvpUser} />
      </div>
    );
  }

  /* ─── Round Robin / Swiss ────────────────────────────────── */
  if (bracketData && (bracketData.mode === 'round_robin' || bracketData.mode === 'swiss')) {
    const isSwiss = bracketData.mode === 'swiss';

    return (
      <div className="bracket-cosmic-bg rounded-2xl p-2.5 lg:p-6 space-y-3 lg:space-y-5">
        <SectionTitleCard
          icon={isSwiss ? Trophy : Users}
          title="Bracket Turnamen"
          subtitle={isSwiss ? 'Swiss System' : 'Round Robin'}
          division={division}
        />

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-center gap-3 px-1"
        >
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: c.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: c.accentText }}>
            {completedMatches}/{totalMatches}
          </span>
        </motion.div>

        {/* Enhanced Standings */}
        {rrSwissStandings.length > 0 && (
          <div className="rounded-xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.cardBorder }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: c.accentDim }}>
              <BarChart3 className="w-4 h-4" style={{ color: c.accentText }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText }}>
                {isSwiss ? 'Swiss' : 'Round Robin'} Standings
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" role="table" aria-label={`${isSwiss ? 'Swiss' : 'Round Robin'} Standings`}>
                <thead>
                  <tr className="text-white/25 uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Team</th>
                    <th className="px-3 py-2 text-center font-medium">P</th>
                    <th className="px-3 py-2 text-center font-medium">W</th>
                    <th className="px-3 py-2 text-center font-medium">L</th>
                    {!isSwiss && <th className="px-3 py-2 text-center font-medium">D</th>}
                    <th className="px-3 py-2 text-center font-medium">Pts</th>
                    <th className="px-3 py-2 text-center font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {rrSwissStandings.map((team: { rank: number; id: string; name: string; avatar: string | null; played: number; w: number; l: number; d: number; pts: number; scoreFor: number; scoreAgainst: number }) => (
                    <motion.tr
                      key={team.id}
                      className="border-t border-white/[0.03]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: team.rank * 0.03, duration: 0.25 }}
                      style={{ background: team.rank <= 3 ? c.accentDim : 'transparent' }}
                    >
                      <td className="px-3 py-2">
                        <span className="font-bold" style={{
                          color: team.rank === 1 ? 'rgba(234,179,8,0.9)' : team.rank === 2 ? 'rgba(192,192,192,0.8)' : team.rank === 3 ? 'rgba(205,127,50,0.7)' : 'rgba(255,255,255,0.25)',
                        }}>
                          {team.rank}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {team.avatar ? (
                            <img src={team.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-white/50">{team.name.charAt(0)}</span>
                            </div>
                          )}
                          <span className="font-semibold text-white/80 truncate">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-white/40">{team.played}</td>
                      <td className="px-3 py-2 text-center font-bold text-white/60">{team.w}</td>
                      <td className="px-3 py-2 text-center font-bold text-white/40">{team.l}</td>
                      {!isSwiss && <td className="px-3 py-2 text-center font-bold text-white/40">{team.d}</td>}
                      <td className="px-3 py-2 text-center font-black" style={{ color: c.accentText }}>{team.pts}</td>
                      <td className="px-3 py-2 text-center font-bold" style={{ color: (team.scoreFor - team.scoreAgainst) > 0 ? 'rgba(52,211,153,0.7)' : (team.scoreFor - team.scoreAgainst) < 0 ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.25)' }}>
                        {team.scoreFor - team.scoreAgainst > 0 ? '+' : ''}{team.scoreFor - team.scoreAgainst}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Match Grid by Round */}
        <RoundRobinView
          matches={matches}
          division={division}
          onUpdateScore={onUpdateScore}
          isAdmin={isAdmin}
          isSwiss={isSwiss}
        />
      </div>
    );
  }

  /* ─── Fallback (should not reach here) ───────────────────── */
  return null;
}

export default ChallongeBracket;
