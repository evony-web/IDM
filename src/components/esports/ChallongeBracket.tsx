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
      {/* Seed */}
      <span className="text-[9px] font-bold w-4 text-center tabular-nums" style={{ color: isWinner ? c.accentText : 'rgba(255,255,255,0.20)' }}>
        {team.seed || '-'}
      </span>
      {/* Avatar */}
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
      {/* Name + Tier */}
      <div className="flex-1 min-w-0">
        <p className={`truncate text-[11px] font-semibold ${isLoser ? 'line-through' : ''}`} style={{ color: isWinner ? '#fff' : 'rgba(255,255,255,0.70)' }}>
          {team.name}
        </p>
      </div>
      <span className={`tier-badge ${getTierClass(tier)} scale-75 origin-right`}>{tier}</span>
      {/* Score */}
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
}: {
  match: Match;
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  isFinal: boolean;
  bracketLabel?: string;
  isAdmin?: boolean;
  fullWidth?: boolean;
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

  // Determine card border style
  const getBorderStyle = (): React.CSSProperties => {
    if (isEditing) return { borderColor: c.liveBorder, boxShadow: `0 0 20px ${c.liveBorder}` };
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
          ${isGrandFinal ? 'ring-1' : ''}`}
        style={{
          width: fullWidth ? '100%' : 220,
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
        {/* Pulsing admin indicator */}
        {canAdminEdit && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none z-0"
            animate={{ boxShadow: [`0 0 0 0 ${c.accentGlow}`, `0 0 0 4px ${c.accentDim}`, `0 0 0 0 ${c.accentGlow}`] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        )}

        {/* Card Header */}
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
            {isEditing && (
              <div className="flex items-center gap-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                <span className="text-[7px] font-bold uppercase tracking-wider text-red-400">LIVE</span>
              </div>
            )}
            {isCompleted && !isEditing && (
              <span className="text-[7px] font-bold uppercase tracking-wider text-white/20 bg-white/5 px-1.5 py-0.5 rounded">FT</span>
            )}
            {isPending && !isEditing && (
              <span className="text-[7px] font-bold uppercase tracking-wider text-white/15">VS</span>
            )}
          </div>
        </div>

        {/* Card Body */}
        {isEditing ? (
          <div className="py-1">
            <ChallongeEditTeamRow team={teamA} score={editScoreA} setScore={setEditScoreA} division={division} />
            <div className="mx-3 my-0.5 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <ChallongeEditTeamRow team={teamB} score={editScoreB} setScore={setEditScoreB} division={division} />

            {/* MVP Selection */}
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

            {/* Save Button */}
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

            {/* Admin quick action */}
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

      {/* Match Detail Popup */}
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

        // Cubic bezier: exit right from x1,y1 → enter left at x2,y2
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

        // Vertical cubic bezier for mobile
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

  // Compute connectors after layout
  useEffect(() => {
    const computeConnectors = () => {
      const newConnectors: ConnectorData[] = [];
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      // For each pair of adjacent rounds, connect match pairs
      for (let ri = 0; ri < sortedKeys.length - 1; ri++) {
        const currentRound = sortedKeys[ri];
        const nextRound = sortedKeys[ri + 1];
        const currentMatches = rounds[currentRound];
        const nextMatches = rounds[nextRound];

        // Each pair of matches in current round feeds into one match in next round
        for (let mi = 0; mi < nextMatches.length; mi++) {
          const nextMatch = nextMatches[mi];
          const nextCard = cardRefs.current.get(nextMatch.id);
          if (!nextCard) continue;

          const nextRect = nextCard.getBoundingClientRect();
          const nextY = nextRect.top + nextRect.height / 2 - containerRect.top;
          const nextX = nextRect.left - containerRect.left;

          // The two source matches that feed into this match
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

    // Wait for layout to settle
    const rafId = requestAnimationFrame(() => {
      computeConnectors();
    });

    // Recompute on resize
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(computeConnectors);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [sortedKeys, rounds, maxRound]);

  // Layout constants
  const CARD_WIDTH = 220;
  const CARD_GAP_X = 80; // horizontal gap between rounds
  const ROUND_PADDING = 16;

  // Calculate vertical spacing per round
  const getRoundHeight = (roundKey: number) => {
    const matchCount = rounds[roundKey]?.length || 1;
    return matchCount;
  };

  // Calculate the maximum height needed
  const maxMatchesInRound = Math.max(...sortedKeys.map(k => rounds[k]?.length || 0), 1);
  const estimatedCardHeight = 80; // approximate card height
  const cardGapY = 16;
  const totalHeight = maxMatchesInRound * (estimatedCardHeight + cardGapY) + 60;

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: totalHeight }}>
      {/* SVG Connectors Layer */}
      <BracketSVGConnectors connectors={connectors} division={division} />

      {/* Rounds Layer */}
      <motion.div
        className="flex"
        style={{ gap: CARD_GAP_X }}
        variants={bracketContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {sortedKeys.map((roundKey) => {
          const roundMatches = rounds[roundKey];
          const roundLabel = getRoundLabel(roundKey, maxRound, bracketFilter ? getBracketLabel(bracketFilter) : undefined);

          return (
            <div key={roundKey} className="flex flex-col flex-shrink-0" style={{ width: CARD_WIDTH }}>
              {/* Round Label */}
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

              {/* Match Cards — distributed vertically */}
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

  // Compute connectors for mobile (vertical layout)
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
      {/* SVG Connectors */}
      <MobileBracketSVGConnectors connectors={connectors} division={division} />

      {/* Rounds stacked vertically */}
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
              {/* Round Label */}
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

              {/* Match Cards — full width grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roundMatches.map((match) => (
                  <div
                    key={match.id}
                    ref={(el) => { if (el) cardRefs.current.set(match.id, el); }}
                  >
                    <ChallongeMatchCard
                      match={match}
                      division={division}
                      onUpdateScore={onUpdateScore}
                      isFinal={isFinal(roundKey)}
                      bracketLabel={bracketFilter ? undefined : getBracketLabel(match.bracket)}
                      isAdmin={isAdmin}
                      fullWidth={true}
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
   Round Robin Grid View
   ================================================================ */

function RoundRobinView({
  matches,
  division,
  onUpdateScore,
  isAdmin,
}: {
  matches: Match[];
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  isAdmin?: boolean;
}) {
  const c = getC(division);
  const { rounds, sortedKeys } = useMemo(() => groupByRound(matches), [matches]);

  // Compute standings
  const standings = useMemo(() => {
    const teamStats: Record<string, { id: string; name: string; seed?: number; w: number; l: number; d: number; pts: number; scoreFor: number; scoreAgainst: number }> = {};

    // Initialize all teams
    matches.forEach(m => {
      if (m.teamA && !teamStats[m.teamA.id]) {
        teamStats[m.teamA.id] = { id: m.teamA.id, name: m.teamA.name, seed: m.teamA.seed, w: 0, l: 0, d: 0, pts: 0, scoreFor: 0, scoreAgainst: 0 };
      }
      if (m.teamB && !teamStats[m.teamB.id]) {
        teamStats[m.teamB.id] = { id: m.teamB.id, name: m.teamB.name, seed: m.teamB.seed, w: 0, l: 0, d: 0, pts: 0, scoreFor: 0, scoreAgainst: 0 };
      }
    });

    // Calculate stats from completed matches
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
        a.w += 1; a.pts += 3;
        b.l += 1;
      } else if (m.scoreA < m.scoreB) {
        b.w += 1; b.pts += 3;
        a.l += 1;
      } else {
        a.d += 1; a.pts += 1;
        b.d += 1; b.pts += 1;
      }
    });

    return Object.values(teamStats).sort((a, b) => b.pts - a.pts || (b.scoreFor - b.scoreAgainst) - (a.scoreFor - a.scoreAgainst));
  }, [matches]);

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
          <table className="w-full text-[11px]" role="table" aria-label="Round Robin Standings">
            <thead>
              <tr className="text-white/25 uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Team</th>
                <th className="px-3 py-2 text-center font-medium">W</th>
                <th className="px-3 py-2 text-center font-medium">L</th>
                <th className="px-3 py-2 text-center font-medium">D</th>
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
                      <span className="font-semibold text-white/80 truncate">{team.name}</span>
                      {team.seed && <span className="text-[8px] text-white/15">({team.seed})</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-white/60">{team.w}</td>
                  <td className="px-3 py-2 text-center font-bold text-white/40">{team.l}</td>
                  <td className="px-3 py-2 text-center font-bold text-white/40">{team.d}</td>
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
              {/* Round Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
                  Round {roundKey}
                </span>
                <span className="text-[9px] font-medium tabular-nums text-white/15">
                  {completedCount}/{roundMatches.length}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>

              {/* Match Grid */}
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
   Main Export — ChallongeBracket
   ================================================================ */

export function ChallongeBracket({ division, matches, isAdmin, onUpdateScore, bracketType, mvpUser }: BracketProps) {
  const c = getC(division);
  const isMobile = useIsMobile();

  // Determine bracket type
  const isRoundRobin = bracketType === 'round_robin';
  const isDoubleElim = bracketType === 'double_elimination';
  const isSwiss = bracketType === 'swiss';

  // Separate matches by bracket type for double elimination
  const winnersMatches = useMemo(() => matches.filter(m => m.bracket === 'winners'), [matches]);
  const losersMatches = useMemo(() => matches.filter(m => m.bracket === 'losers'), [matches]);
  const grandFinalMatches = useMemo(() => matches.filter(m => m.bracket === 'grand_final'), [matches]);

  // Single elimination — all matches are one bracket
  const singleElimMatches = useMemo(() => {
    if (isDoubleElim) return [];
    return matches;
  }, [matches, isDoubleElim]);

  // MVP display
  const mvpDisplay = mvpUser ? (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
        border: '1px solid rgba(245,158,11,0.15)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
        <Star className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-400/60">Tournament MVP</p>
        <p className="text-sm font-bold text-white/85">{mvpUser.name}</p>
        {mvpUser.mvpScore !== undefined && (
          <p className="text-[10px] text-white/30">{mvpUser.mvpScore} pts</p>
        )}
      </div>
    </motion.div>
  ) : null;

  // Empty state
  if (!matches || matches.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: c.accentDim }}>
          <Trophy className="w-7 h-7" style={{ color: c.accentText, opacity: 0.5 }} />
        </div>
        <p className="text-sm font-semibold text-white/40">No matches yet</p>
        <p className="text-[11px] text-white/20 mt-1">Bracket will appear when matches are generated</p>
      </motion.div>
    );
  }

  // Round Robin / Swiss view
  if (isRoundRobin || isSwiss) {
    return (
      <div className="w-full" style={{ background: c.bg }}>
        {mvpDisplay}
        <RoundRobinView
          matches={matches}
          division={division}
          onUpdateScore={onUpdateScore}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  // Double Elimination — separate sections
  if (isDoubleElim) {
    return (
      <div className="w-full" style={{ background: c.bg }}>
        {mvpDisplay}

        {/* Winners Bracket */}
        {winnersMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: c.accent }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText }}>
                Winners Bracket
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
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
        )}

        {/* Losers Bracket */}
        {losersMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-red-400/70">
                Losers Bracket
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
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
        )}

        {/* Grand Final */}
        {grandFinalMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-yellow-500/70" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-yellow-500/80">
                Grand Final
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(234,179,8,0.15)' }} />
            </div>
            <div className="flex justify-center">
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
      </div>
    );
  }

  // Single Elimination — full horizontal bracket
  return (
    <div className="w-full" style={{ background: c.bg }}>
      {mvpDisplay}

      {isMobile ? (
        <div className="overflow-x-auto -mx-4 px-4">
          <MobileBracket
            matches={singleElimMatches}
            division={division}
            onUpdateScore={onUpdateScore}
            isAdmin={isAdmin}
          />
        </div>
      ) : (
        <ZoomPanWrapper className="rounded-xl border border-white/[0.04]" style={{ maxHeight: 700 }}>
          <div className="p-6">
            <DesktopBracket
              matches={singleElimMatches}
              division={division}
              onUpdateScore={onUpdateScore}
              isAdmin={isAdmin}
            />
          </div>
        </ZoomPanWrapper>
      )}
    </div>
  );
}

export default ChallongeBracket;
