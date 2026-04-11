'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Trophy,
  Star,
  Flame,
  Sparkles,
  Swords,
  Medal,
  Zap,
  Calendar,
  Shield,
  ChevronRight,
  Users,
  Play,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lock,
  Save,
} from 'lucide-react';
import { useMemo, useState, useCallback, useEffect } from 'react';

/* ================================================================
   Interfaces
   ================================================================ */

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
}

interface MVPUser {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  mvpScore: number;
}

interface TeamMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    tier: string;
    points: number;
    avatar: string | null;
  };
}

interface GFTeam {
  id: string;
  name: string;
  seed: number;
  isEliminated: boolean;
  members: TeamMember[];
}

interface GFMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  mvpId: string | null;
  status: string;
  bracket: string;
  teamA?: GFTeam | null;
  teamB?: GFTeam | null;
  winner?: { id: string; name: string } | null;
  mvp?: { id: string; name: string; avatar: string | null } | null;
}

interface GrandFinalData {
  id: string;
  name: string;
  type: string;
  status: string;
  division: string;
  teams: GFTeam[];
  matches: GFMatch[];
}

interface QualifiedPlayer {
  id: string;
  name: string;
  points: number;
  tier: string;
  avatar: string | null;
}

interface GrandFinalProps {
  division: 'male' | 'female';
  topPlayers: Player[];
  prizePool: number;
  weekNumber: number;
  mvpUser: MVPUser | null;
  isAdminAuthenticated: boolean;
  grandFinalData: GrandFinalData | null;
  qualifiedPlayers: QualifiedPlayer[];
  onSetupGrandFinal: (prizePoolValue?: number) => void;
  onDeleteGrandFinal: () => void;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  onRefresh: () => void;
  isSettingUp?: boolean;
  isDeleting?: boolean;
  isUpdatingScore?: boolean;
  gfPrizePool?: number;
  onGfPrizePoolChange?: (value: number) => void;
  theme?: 'dark' | 'light';
}

/* ================================================================
   Animation Variants
   ================================================================ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const heroTextVariants = {
  hidden: { opacity: 0, y: 8, letterSpacing: '0.3em' },
  visible: {
    opacity: 1,
    y: 0,
    letterSpacing: '0.02em',
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ================================================================
   Helpers
   ================================================================ */

const TEAM_COLORS = [
  { bg: 'from-orange-500 to-red-500', text: 'text-orange-400', border: 'border-orange-500/20', ring: 'ring-orange-500/30', bgSubtle: 'bg-orange-500/10', badge: 'bg-orange-400/15 text-orange-400' },
  { bg: 'from-emerald-500 to-teal-500', text: 'text-emerald-400', border: 'border-emerald-500/20', ring: 'ring-emerald-500/30', bgSubtle: 'bg-emerald-500/10', badge: 'bg-emerald-400/15 text-emerald-400' },
  { bg: 'from-purple-500 to-violet-500', text: 'text-purple-400', border: 'border-purple-500/20', ring: 'ring-purple-500/30', bgSubtle: 'bg-purple-500/10', badge: 'bg-purple-400/15 text-purple-400' },
  { bg: 'from-[#0EA5E9] to-[#38BDF8]', text: 'text-[#38BDF8]', border: 'border-[#0EA5E9]/20', ring: 'ring-[#38BDF8]/30', bgSubtle: 'bg-[#0EA5E9]/10', badge: 'bg-[#38BDF8]/15 text-[#38BDF8]' },
];

function getAccent(division: 'male' | 'female') {
  return division === 'male'
    ? { text: 'text-[#73FF00]', ring: 'avatar-ring-gold', gradient: 'gradient-gold' }
    : { text: 'text-[#38BDF8]', ring: 'avatar-ring-pink', gradient: 'gradient-pink' };
}

function getTierClass(tier: string): string {
  if (tier === 'S') return 'tier-s';
  if (tier === 'A') return 'tier-a';
  return 'tier-b';
}

/* ================================================================
   Team Card Component
   ================================================================ */

function TeamCard({
  team,
  colorIndex,
  isWinner,
  isEliminated,
  division,
  matchResult,
  theme = 'dark',
}: {
  team: GFTeam;
  colorIndex: number;
  isWinner?: boolean;
  isEliminated?: boolean;
  division: 'male' | 'female';
  matchResult?: 'win' | 'loss' | null;
  theme?: 'dark' | 'light';
}) {
  const color = TEAM_COLORS[colorIndex % 4];
  const accent = getAccent(division);
  const isLight = false; // Dark mode only

  return (
    <motion.div
      variants={itemVariants}
      className={`glass rounded-2xl overflow-hidden relative ${
        isWinner ? `ring-1 ${color.ring}` : ''
      } ${isEliminated ? 'opacity-60' : ''}`}
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.25 }}
    >
      {/* Team Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${color.bg} opacity-90`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{team.name}</p>
              <p className="text-[10px] text-white/60 font-medium">Seed #{team.seed}</p>
            </div>
          </div>
          {isWinner && (
            <Crown className="w-5 h-5 text-yellow-200" />
          )}
          {matchResult === 'win' && !isWinner && (
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-400/20 px-2 py-0.5 rounded-full">MENANG</span>
          )}
          {matchResult === 'loss' && (
            <span className="text-[10px] font-bold text-red-300 bg-red-400/20 px-2 py-0.5 rounded-full">KALAH</span>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="p-3 space-y-2">
        {team.members.map((member, idx) => (
          <div key={member.id} className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${isLight ? 'bg-gradient-to-br from-slate-200 to-slate-300' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
              {member.user.avatar ? (
                <img src={member.user.avatar} alt={member.user.name} loading="lazy" className="w-full h-full object-cover object-top" />
              ) : (
                <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-white/70'}`}>{member.user.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`text-xs font-semibold truncate ${isLight ? 'text-slate-800' : 'text-white/90'}`}>{member.user.name}</p>
                {member.role === 'captain' && (
                  <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`tier-badge ${getTierClass(member.user.tier)}`} style={{ fontSize: '9px', padding: '0 5px' }}>{member.user.tier}</span>
                <span className={`text-[10px] font-medium tabular-nums ${isLight ? 'text-slate-500' : 'text-white/30'}`}>{member.user.points.toLocaleString()} pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Match Card Component (for Grand Final Bracket)
   ================================================================ */

function GFMatchCard({
  match,
  allTeams,
  semiLabel,
  isAdmin,
  onUpdateScore,
  isUpdating,
  theme = 'dark',
}: {
  match: GFMatch;
  allTeams: GFTeam[];
  semiLabel: string;
  isAdmin: boolean;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  isUpdating: boolean;
  theme?: 'dark' | 'light';
}) {
  const teamA = match.teamA || allTeams.find(t => t.id === match.teamAId);
  const teamB = match.teamB || allTeams.find(t => t.id === match.teamBId);
  const teamAColorIdx = teamA ? teamA.seed - 1 : 0;
  const teamBColorIdx = teamB ? teamB.seed - 1 : 0;
  const colorA = TEAM_COLORS[teamAColorIdx % 4];
  const colorB = TEAM_COLORS[teamBColorIdx % 4];
  const isLight = false; // Dark mode only

  const [scoreA, setScoreA] = useState<string>(match.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState<string>(match.scoreB?.toString() || '');
  const [mvpSearch, setMvpSearch] = useState('');
  const [selectedMvpId, setSelectedMvpId] = useState<string | null>(match.mvpId || null);

  const isCompleted = match.status === 'completed';

  // Collect all players from both teams for MVP selection
  const allPlayers = useMemo(() => {
    const players: Array<{ userId: string; userName: string; teamName: string }> = [];
    if (teamA) {
      for (const m of teamA.members) {
        players.push({ userId: m.user.id, userName: m.user.name, teamName: teamA.name });
      }
    }
    if (teamB) {
      for (const m of teamB.members) {
        players.push({ userId: m.user.id, userName: m.user.name, teamName: teamB.name });
      }
    }
    return players;
  }, [teamA, teamB]);

  const filteredMvps = mvpSearch
    ? allPlayers.filter(p => p.userName.toLowerCase().includes(mvpSearch.toLowerCase()))
    : allPlayers;

  const [showMvp, setShowMvp] = useState(false);

  const handleSubmitScore = useCallback(() => {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b)) return;
    if (a === b) return; // no draw
    onUpdateScore(match.id, a, b, selectedMvpId || undefined);
  }, [scoreA, scoreB, match.id, onUpdateScore, selectedMvpId]);

  const winnerA = isCompleted && match.winnerId === teamA?.id;
  const winnerB = isCompleted && match.winnerId === teamB?.id;

  return (
    <motion.div
      variants={itemVariants}
      className={`glass rounded-2xl overflow-hidden relative ${isCompleted ? 'opacity-90' : ''}`}
    >
      {/* Match Label */}
      <div className={`px-4 py-2 ${isLight ? 'bg-slate-100' : 'bg-white/[0.03]'} border-b ${isLight ? 'border-slate-200' : 'border-white/[0.05]'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold tracking-[0.15em] uppercase ${isLight ? 'text-slate-500' : 'text-white/40'}`}>{semiLabel}</span>
          {isCompleted && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/15 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Selesai
            </span>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Team A */}
        <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${winnerA ? `${colorA.bgSubtle} ring-1 ${colorA.ring}` : isLight ? 'bg-slate-100' : 'bg-white/[0.02]'}`}>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorA.bg} flex items-center justify-center flex-shrink-0 ${!winnerA && isCompleted ? 'opacity-40' : ''}`}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold truncate ${winnerA ? (isLight ? 'text-slate-800' : 'text-white') : (isLight ? 'text-slate-700' : 'text-white/70')}`}>{teamA?.name || 'TBD'}</p>
            {teamA && (
              <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/30'}`}>{teamA.members.map(m => m.user.name).join(', ')}</p>
            )}
          </div>
          {isAdmin && !isCompleted && (
            <input
              type="number"
              value={scoreA}
              onChange={e => setScoreA(e.target.value)}
              placeholder="0"
              className={`w-14 rounded-lg px-2.5 py-1.5 text-center text-sm font-bold focus:outline-none transition-colors tabular-nums ${isLight ? 'bg-white border border-slate-200 text-slate-800 focus:border-slate-400' : 'bg-white/5 border border-white/10 text-white/90 focus:border-white/25'}`}
              min="0"
            />
          )}
          {isCompleted && (
            <span className={`text-lg font-black tabular-nums ${winnerA ? colorA.text : (isLight ? 'text-slate-400' : 'text-white/30')}`}>
              {match.scoreA ?? 0}
            </span>
          )}
        </div>

        {/* VS Divider */}
        <div className="flex items-center gap-2 px-1">
          <div className={`flex-1 h-px ${isLight ? 'bg-slate-200' : 'bg-white/[0.06]'}`} />
          <span className={`text-[10px] font-black tracking-[0.2em] ${isLight ? 'text-slate-400' : 'text-white/20'}`}>VS</span>
          <div className={`flex-1 h-px ${isLight ? 'bg-slate-200' : 'bg-white/[0.06]'}`} />
        </div>

        {/* Team B */}
        <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${winnerB ? `${colorB.bgSubtle} ring-1 ${colorB.ring}` : isLight ? 'bg-slate-100' : 'bg-white/[0.02]'}`}>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorB.bg} flex items-center justify-center flex-shrink-0 ${!winnerB && isCompleted ? 'opacity-40' : ''}`}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold truncate ${winnerB ? (isLight ? 'text-slate-800' : 'text-white') : (isLight ? 'text-slate-700' : 'text-white/70')}`}>{teamB?.name || 'TBD'}</p>
            {teamB && (
              <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/30'}`}>{teamB.members.map(m => m.user.name).join(', ')}</p>
            )}
          </div>
          {isAdmin && !isCompleted && (
            <input
              type="number"
              value={scoreB}
              onChange={e => setScoreB(e.target.value)}
              placeholder="0"
              className={`w-14 rounded-lg px-2.5 py-1.5 text-center text-sm font-bold focus:outline-none transition-colors tabular-nums ${isLight ? 'bg-white border border-slate-200 text-slate-800 focus:border-slate-400' : 'bg-white/5 border border-white/10 text-white/90 focus:border-white/25'}`}
              min="0"
            />
          )}
          {isCompleted && (
            <span className={`text-lg font-black tabular-nums ${winnerB ? colorB.text : (isLight ? 'text-slate-400' : 'text-white/30')}`}>
              {match.scoreB ?? 0}
            </span>
          )}
        </div>

        {/* MVP - Display prominently after match completion */}
        {isCompleted && match.mvp && (
          <div className="mx-3 mb-3 mt-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">Most Valuable Player</p>
                <p className={`text-[13px] font-bold truncate ${isLight ? 'text-slate-800' : 'text-white/90'}`}>{match.mvp.name}</p>
              </div>
              {match.mvp.avatar && (
                <img src={match.mvp.avatar} alt={match.mvp.name} loading="lazy" className="w-8 h-8 rounded-full object-cover object-top border-2 border-amber-400/30" />
              )}
            </div>
          </div>
        )}

        {/* Admin: Submit Score */}
        {isAdmin && !isCompleted && teamA && teamB && (
          <div className="space-y-2 pt-1">
            {/* MVP Selection */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMvp(!showMvp)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${selectedMvpId ? 'bg-amber-400/10 border border-amber-400/20' : isLight ? 'bg-slate-100 border border-slate-200' : 'bg-white/[0.03] border border-white/[0.06]'}`}
              >
                <div className="flex items-center gap-2">
                  <Star className={`w-3.5 h-3.5 ${selectedMvpId ? 'text-amber-400' : (isLight ? 'text-slate-400' : 'text-white/30')}`} />
                  <span className={`text-[11px] font-medium ${selectedMvpId ? 'text-amber-400' : (isLight ? 'text-slate-500' : 'text-white/40')}`}>
                    {selectedMvpId ? allPlayers.find(p => p.userId === selectedMvpId)?.userName || 'Pilih MVP' : 'Pilih MVP (opsional)'}
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {showMvp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`absolute z-20 top-full left-0 right-0 mt-1 glass rounded-xl overflow-hidden ${isLight ? 'border border-slate-200' : 'border border-white/10'}`}
                  >
                    <div className="p-1.5">
                      <input
                        type="text"
                        value={mvpSearch}
                        onChange={e => setMvpSearch(e.target.value)}
                        placeholder="Cari pemain..."
                        className={`w-full rounded-lg px-2.5 py-1.5 text-[11px] placeholder:text-slate-400 focus:outline-none ${isLight ? 'bg-white border border-slate-200 text-slate-800' : 'bg-white/5 border border-white/[0.06] text-white/90 placeholder:text-white/20'}`}
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {filteredMvps.map(player => (
                        <button
                          key={player.userId}
                          type="button"
                          onClick={() => {
                            setSelectedMvpId(player.userId);
                            setMvpSearch(player.userName);
                            setShowMvp(false);
                          }}
                          className={`w-full text-left px-3 py-2 transition-colors ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.05]'}`}
                        >
                          <p className={`text-[11px] font-medium ${isLight ? 'text-slate-700' : 'text-white/80'}`}>{player.userName}</p>
                          <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-white/25'}`}>{player.teamName}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={handleSubmitScore}
              disabled={isUpdating || !scoreA || !scoreB || scoreA === scoreB}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[12px] font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:from-emerald-400 hover:to-teal-400 transition-all"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Simpan Skor
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Point Distribution Card
   ================================================================ */

function PointCard({
  icon,
  label,
  points,
  division,
  index,
  theme = 'dark',
}: {
  icon: React.ReactNode;
  label: string;
  points: string;
  division: 'male' | 'female';
  index: number;
  theme?: 'dark' | 'light';
}) {
  const accent = getAccent(division);
  const isLight = false; // Dark mode only
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      className="glass rounded-2xl p-3 sm:p-4 text-center card-3d relative overflow-hidden"
    >
      <div className="relative z-10">
        <div className="mb-2 flex justify-center">{icon}</div>
        <p className={`text-lg sm:text-xl font-black tabular-nums ${accent.gradient}`}>{points}</p>
        <p className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/30'}`}>{label}</p>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Main GrandFinal Component
   ================================================================ */

export function GrandFinal({
  division,
  topPlayers,
  prizePool,
  weekNumber,
  mvpUser,
  isAdminAuthenticated,
  grandFinalData,
  qualifiedPlayers,
  onSetupGrandFinal,
  onDeleteGrandFinal,
  onUpdateScore,
  onRefresh,
  isSettingUp = false,
  isDeleting = false,
  isUpdatingScore = false,
  gfPrizePool = 0,
  onGfPrizePoolChange,
  theme = 'dark',
}: GrandFinalProps) {
  const accent = getAccent(division);
  const accentGradient = division === 'male'
    ? 'from-[#73FF00] via-[#8CFF33] to-[#5FD400]'
    : 'from-[#38BDF8] via-[#7DD3FC] to-[#0EA5E9]';
  const isMale = division === 'male';
  const isLight = false; // Dark mode only

  // Local state for prize pool input
  const [localPrizePool, setLocalPrizePool] = useState<string>(gfPrizePool.toString());

  // Handle prize pool input change
  const handlePrizePoolChange = useCallback((value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setLocalPrizePool(numericValue);
    const numValue = parseInt(numericValue) || 0;
    onGfPrizePoolChange?.(numValue);
  }, [onGfPrizePoolChange]);

  // Determine Grand Final status
  const isGFActive = grandFinalData && grandFinalData.status !== 'completed';
  const isGFCompleted = grandFinalData && grandFinalData.status === 'completed';
  const hasEnoughPlayers = qualifiedPlayers.length >= 12;

  // Get semifinal and final matches
  const semiMatches = grandFinalData?.matches.filter(m => m.round === 1) || [];
  const finalMatch = grandFinalData?.matches.find(m => m.round === 2) || null;
  const allTeams = grandFinalData?.teams || [];

  // Find champion
  const champion = grandFinalData
    ? (grandFinalData.status === 'completed' && finalMatch?.winnerId)
      ? allTeams.find(t => t.id === finalMatch.winnerId)
      : null
    : null;

  // Determine eliminated teams
  const eliminatedTeamIds = useMemo(() => {
    if (!grandFinalData) return new Set<string>();
    const ids = new Set<string>();
    for (const match of grandFinalData.matches) {
      if (match.status === 'completed' && match.winnerId && match.round === 1) {
        const loserId = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
        if (loserId) ids.add(loserId);
      }
    }
    return ids;
  }, [grandFinalData]);

  // 🐉 Dragon Riders Gradient - Green to Blue for Grand Final
  const dragonRidersGradient = 'from-[#73FF00] via-[#5FD400] to-[#38BDF8]';

  return (
    <div className="space-y-5">
      {/* =============================================
          Hero Header - Dragon Riders Theme
          ============================================= */}
      <motion.div
        className="relative overflow-hidden rounded-3xl p-4 sm:p-5 md:p-7 lg:p-8 card-dragon-riders"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Dragon Riders dual glow orbs - Night Fury (green) + Light Fury (blue) */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(115,255,0,0.15) 0%, transparent 50%, rgba(56,189,248,0.10) 70%, transparent 100%)',
          }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-[60px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 50%, rgba(115,255,0,0.08) 70%, transparent 100%)',
          }}
        />

        <div className="relative z-10 lg:flex lg:items-center lg:gap-8">
          {/* Trophy + Title */}
          <motion.div
            className="flex items-center gap-4 mb-6 lg:mb-0 lg:shrink-0"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Dragon Riders Trophy - Gradient Green to Blue */}
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center bg-gradient-to-br ${dragonRidersGradient}`}
              style={{
                boxShadow: '0 6px 32px rgba(115,255,0,0.25), 0 6px 32px rgba(56,189,248,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-black trophy-dragon-glow" />
            </div>

            <div>
              <motion.h2
                className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-none text-dragon-riders dragon-text-glow"
                variants={heroTextVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                GRAND FINAL
              </motion.h2>
              <div className="flex items-center gap-2 mt-1.5">
                <Calendar className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
                <span className={`text-[12px] font-semibold ${isLight ? 'text-slate-600' : 'text-white/40'}`}>4 Tim / 12 Pemain</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/[0.08] text-white/40'}`}>
                  Kejuaraan Musim
                </span>
              </div>
            </div>
          </motion.div>

          {/* Status / Prize Pool - Dragon Riders Gradient */}
          <motion.div
            className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-center relative overflow-hidden lg:flex-1 ${
              isGFCompleted ? 'bg-emerald-500/[0.12] border border-emerald-500/20' :
              isGFActive ? 'bg-gradient-to-br from-[#73FF00]/[0.08] to-[#38BDF8]/[0.06] border border-[#73FF00]/15' :
              'bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06]'
            }`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative z-10">
              {isGFCompleted && champion ? (
                <>
                  <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-emerald-400/60 mb-2">
                    JUARA GRAND FINAL
                  </p>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <Crown className="w-8 h-8 text-[#73FF00] mx-auto mb-2" />
                    <p className={`text-xl sm:text-2xl lg:text-3xl font-black ${TEAM_COLORS[(champion.seed - 1) % 4].text}`}>
                      {champion.name}
                    </p>
                    <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-white/30'}`}>
                      {champion.members.map(m => m.user.name).join(' · ')}
                    </p>
                  </motion.div>
                  {/* MVP of Grand Final Match */}
                  {finalMatch?.mvp && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 flex items-center justify-center gap-2"
                    >
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                        <Star className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">MVP Match</span>
                        <span className={`text-[12px] font-bold ${isLight ? 'text-slate-800' : 'text-white/90'}`}>{finalMatch.mvp.name}</span>
                      </div>
                    </motion.div>
                  )}
                  {/* Global MVP (from Kelola MVP) */}
                  {mvpUser && !finalMatch?.mvp && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 flex items-center justify-center gap-2"
                    >
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                        <Star className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">MVP</span>
                        <span className={`text-[12px] font-bold ${isLight ? 'text-slate-800' : 'text-white/90'}`}>{mvpUser.name}</span>
                        {mvpUser.mvpScore > 0 && (
                          <span className="text-[10px] text-amber-400/60">({mvpUser.mvpScore.toLocaleString('id-ID')} pts)</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </>
              ) : isGFActive ? (
                <>
                  {/* Show prize pool when Grand Final is active */}
                  <p className={`text-[11px] tracking-[0.25em] uppercase font-bold mb-2 ${isLight ? 'text-slate-500' : 'text-white/30'}`}>
                    Total Hadiah
                  </p>
                  <motion.p
                    className="text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums text-dragon-riders dragon-text-glow"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                  >
                    Rp {(grandFinalData?.prizePool || prizePool).toLocaleString('id-ID')}
                  </motion.p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#73FF00] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF8]" />
                    </div>
                    <p className="text-[11px] tracking-[0.15em] uppercase font-bold text-dragon-riders">
                      SEDANG BERJALAN
                    </p>
                  </div>
                  <p className={`text-[11px] font-medium mt-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                    Semi {semiMatches.filter(m => m.status === 'completed').length}/2 · {finalMatch?.status === 'completed' ? 'Final Selesai' : 'Final Menunggu'}
                  </p>
                </>
              ) : (
                <>
                  <p className={`text-[11px] tracking-[0.25em] uppercase font-bold mb-3 ${isLight ? 'text-slate-500' : 'text-white/30'}`}>
                    Hadiah Juara
                  </p>
                  <motion.p
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tabular-nums text-dragon-riders dragon-text-glow"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.45, type: 'spring', stiffness: 180, damping: 14 }}
                  >
                    Rp {prizePool.toLocaleString('id-ID')}
                  </motion.p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className={`w-8 h-px ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />
                    <p className={`text-[10px] font-semibold uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Total Hadiah</p>
                    <div className={`w-8 h-px ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* =============================================
          Admin Controls
          ============================================= */}
      {isAdminAuthenticated && !isGFActive && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-2.5 px-1 mb-3">
            <Lock className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
            <span className={`text-[11px] font-bold tracking-[0.1em] uppercase ${isLight ? 'text-slate-500' : 'text-white/30'}`}>Admin Controls</span>
          </div>

          {/* Prize Pool Input for Grand Final */}
          <div className="mb-3 space-y-2">
            <label className={`text-[11px] tracking-[0.15em] uppercase font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
              <Trophy className="w-3 h-3" /> Prize Pool Grand Final
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={localPrizePool}
                  onChange={(e) => handlePrizePoolChange(e.target.value)}
                  placeholder="Contoh: 1000000"
                  className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] focus:outline-none transition-colors ${isLight ? 'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-slate-400' : 'bg-white/5 border border-white/8 text-white/90 placeholder:text-white/20 focus:border-white/20'}`}
                />
              </div>
              <button
                type="button"
                onClick={() => onGfPrizePoolChange?.(parseInt(localPrizePool) || 0)}
                className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
                  parseInt(localPrizePool) > 0
                    ? isMale
                      ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20'
                      : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                Simpan
              </button>
            </div>
            {localPrizePool && parseInt(localPrizePool) > 0 && (
              <p className={`text-[10px] flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-white/30'}`}>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Total Hadiah: Rp {parseInt(localPrizePool).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => onSetupGrandFinal(parseInt(localPrizePool) || 0)}
              disabled={!hasEnoughPlayers || isSettingUp}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#73FF00] to-[#5FD400] text-black text-[12px] font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#8CFF33] hover:to-[#73FF00] transition-all"
            >
              {isSettingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {hasEnoughPlayers
                ? 'Mulai Grand Final (12 Pemain → 4 Tim)'
                : `Butuh 12 Pemain (${qualifiedPlayers.length}/12)`
              }
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[12px] font-semibold transition-colors ${isLight ? 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/[0.08]'}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </motion.div>
      )}

      {/* Admin: Delete GF (if active) */}
      {isAdminAuthenticated && isGFActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-2.5"
        >
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[11px] font-semibold hover:bg-white/[0.08] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={onDeleteGrandFinal}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold hover:bg-red-500/15 transition-colors disabled:opacity-30"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset Grand Final
          </button>
        </motion.div>
      )}

      {/* =============================================
          4-Team Bracket + Rosters (when active)
          ============================================= */}
      <AnimatePresence mode="wait">
        {(isGFActive || isGFCompleted) && grandFinalData ? (
          <motion.div
            key="bracket"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* Semifinals Header */}
            <div className="flex items-center gap-2.5 px-1">
              <Swords className={`w-4.5 h-4.5 ${accent.text}`} />
              <h3 className={`text-[14px] font-bold tracking-tight ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Bracket Pertandingan</h3>
            </div>

            {/* Semifinal 1 */}
            {semiMatches[0] && (
              <GFMatchCard
                match={semiMatches[0]}
                allTeams={allTeams}
                semiLabel={`Semifinal 1`}
                isAdmin={isAdminAuthenticated}
                onUpdateScore={onUpdateScore}
                isUpdating={isUpdatingScore}
                theme={theme}
              />
            )}

            {/* Semifinal 2 */}
            {semiMatches[1] && (
              <GFMatchCard
                match={semiMatches[1]}
                allTeams={allTeams}
                semiLabel={`Semifinal 2`}
                isAdmin={isAdminAuthenticated}
                onUpdateScore={onUpdateScore}
                isUpdating={isUpdatingScore}
                theme={theme}
              />
            )}

            {/* Arrow connecting semis to final */}
            {!isGFCompleted && semiMatches.every(m => m.status === 'completed') && finalMatch && (
              <motion.div
                className="flex items-center justify-center gap-2 py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className={`h-px flex-1 ${isLight ? 'bg-gradient-to-r from-transparent via-slate-300 to-transparent' : 'bg-gradient-to-r from-transparent via-white/10 to-transparent'}`} />
                <ArrowRight className={`w-4 h-4 ${accent.text} animate-pulse`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Menuju Final</span>
                <ArrowRight className={`w-4 h-4 ${accent.text} animate-pulse`} />
                <div className={`h-px flex-1 ${isLight ? 'bg-gradient-to-r from-transparent via-slate-300 to-transparent' : 'bg-gradient-to-r from-transparent via-white/10 to-transparent'}`} />
              </motion.div>
            )}

            {/* Final Match */}
            {finalMatch && (
              <div className="relative">
                {isGFCompleted && (
                  <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-[#73FF00]/20 via-[#8CFF33]/10 to-[#73FF00]/20 blur-sm -z-10" />
                )}
                <GFMatchCard
                  match={finalMatch}
                  allTeams={allTeams}
                  semiLabel={isGFCompleted ? 'FINAL — Selesai' : 'FINAL'}
                  isAdmin={isAdminAuthenticated}
                  onUpdateScore={onUpdateScore}
                  isUpdating={isUpdatingScore}
                  theme={theme}
                />
              </div>
            )}

            {/* Team Rosters Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2.5 px-1 mb-3.5">
                <Users className={`w-4.5 h-4.5 ${accent.text}`} />
                <h3 className={`text-[14px] font-bold tracking-tight ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Tim Grand Final</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/[0.06] text-white/30'}`}>
                  4 Tim · 12 Pemain
                </span>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {allTeams.map((team) => {
                  const isTeamWinner = champion?.id === team.id;
                  const isTeamEliminated = eliminatedTeamIds.has(team.id);

                  // Determine match result for this team
                  let matchResult: 'win' | 'loss' | null = null;
                  if (isTeamWinner) matchResult = null;
                  else if (isTeamEliminated) matchResult = 'loss';
                  else {
                    // Check if team won a semi
                    for (const semi of semiMatches) {
                      if (semi.status === 'completed' && semi.winnerId === team.id) matchResult = 'win';
                    }
                  }

                  return (
                    <TeamCard
                      key={team.id}
                      team={team}
                      colorIndex={team.seed - 1}
                      isWinner={isTeamWinner}
                      isEliminated={isTeamEliminated}
                      division={division}
                      matchResult={matchResult}
                      theme={theme}
                    />
                  );
                })}
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          /* =============================================
              Pre-Grand Final: Qualified Players Preview
              ============================================= */
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Status Badge */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-subtle">
                <div className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${division === 'male' ? 'bg-[#73FF00]' : 'bg-[#38BDF8]'} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${division === 'male' ? 'bg-[#73FF00]' : 'bg-[#38BDF8]'}`} />
                </div>
                <span className={`text-[11px] font-bold tracking-[0.12em] uppercase ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                  {hasEnoughPlayers
                    ? 'SIAP UNTUK GRAND FINAL'
                    : `${Math.max(0, 12 - qualifiedPlayers.length)} LAGI UNTUK LOLOS`}
                </span>
              </div>
            </motion.div>

            {/* Qualified Players Grid */}
            <div>
              <div className="flex items-center gap-2.5 px-1 mb-3.5">
                <Sparkles className={`w-4.5 h-4.5 ${accent.text}`} />
                <h3 className={`text-[14px] font-bold tracking-tight ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Pemain yang Lolos</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isLight ? 'bg-slate-200 text-slate-500' : 'bg-white/[0.06] text-white/30'}`}>
                  Top {qualifiedPlayers.length}/12
                </span>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5"
              >
                {qualifiedPlayers.map((player, index) => (
                  <motion.div
                    key={player.id}
                    variants={itemVariants}
                    className="glass rounded-2xl p-3 card-3d"
                    whileHover={{ scale: 1.03, y: -4 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={accent.ring}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${isLight ? 'bg-gradient-to-br from-slate-200 to-slate-300' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
                          {player.avatar ? (
                            <img src={player.avatar} alt={player.name} loading="lazy" className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-white/70'}`}>{player.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${isLight ? 'text-slate-800' : 'text-white/90'}`}>{player.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`tier-badge ${getTierClass(player.tier)}`} style={{ fontSize: '9px', padding: '0 4px' }}>{player.tier}</span>
                          <span className={`text-[10px] tabular-nums ${isLight ? 'text-slate-500' : 'text-white/30'}`}>{player.points.toLocaleString()} pts</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Snake Draft Preview */}
            {hasEnoughPlayers && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass rounded-2xl p-4 sm:p-5"
              >
                <div className="flex items-center gap-2.5 mb-3 px-0.5">
                  <Users className={`w-4 h-4 ${accent.text}`} />
                  <h3 className="text-[13px] font-bold text-white/80 tracking-tight">Preview Pembagian Tim</h3>
                  <span className="text-[10px] text-white/25 font-medium">(Snake Draft)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map(teamIdx => {
                    const color = TEAM_COLORS[teamIdx];
                    // Snake draft: round1 [0,1,2,3] round2 [3,2,1,0] round3 [0,1,2,3]
                    const indices: number[] = [];
                    for (let round = 0; round < 3; round++) {
                      if (round % 2 === 0) {
                        indices.push(teamIdx + round * 4);
                      } else {
                        indices.push((3 - teamIdx) + round * 4);
                      }
                    }
                    const teamPlayers = indices.filter(i => i < qualifiedPlayers.length).map(i => qualifiedPlayers[i]);

                    return (
                      <div key={teamIdx} className={`rounded-xl p-2.5 ${color.bgSubtle} border ${color.border}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${color.bg} flex items-center justify-center`}>
                            <Shield className="w-3 h-3 text-white" />
                          </div>
                          <span className={`text-[11px] font-bold ${color.text}`}>{['Alpha', 'Beta', 'Gamma', 'Delta'][teamIdx]}</span>
                        </div>
                        <div className="space-y-1.5">
                          {teamPlayers.map((p, i) => (
                            <div key={p.id} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white/50 tabular-nums w-3">#{indices[i] + 1}</span>
                              <span className="text-[10px] text-white/70 font-medium truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =============================================
          Point Distribution
          ============================================= */}
      <motion.div
        className="glass rounded-2xl p-4 sm:p-5"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="flex items-center gap-2.5 mb-4 px-0.5">
          <Star className={`w-4 h-4 ${accent.text}`} />
          <h3 className="text-[14px] font-bold text-white/90 tracking-tight">Distribusi Poin</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <PointCard
            icon={
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#73FF00]/20 to-[#5FD400]/20">
                <Crown className="w-6 h-6 text-[#73FF00]" />
              </div>
            }
            label="Juara"
            points="+500"
            division={division}
            index={0}
          />
          <PointCard
            icon={
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-200/15 to-gray-400/15">
                <Medal className="w-6 h-6 text-gray-300" />
              </div>
            }
            label="Runner-up"
            points="+350"
            division={division}
            index={1}
          />
          <PointCard
            icon={
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-400/15 to-orange-600/15">
                <Medal className="w-6 h-6 text-orange-400" />
              </div>
            }
            label="Peringkat 3"
            points="+200"
            division={division}
            index={2}
          />
          <PointCard
            icon={
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#73FF00]/15 to-[#5FD400]/15">
                <Zap className="w-6 h-6 text-blue-300" />
              </div>
            }
            label="MVP"
            points="+25"
            division={division}
            index={3}
          />
        </div>
      </motion.div>

      {/* =============================================
          Info Banner
          ============================================= */}
      <motion.div
        className={`rounded-2xl p-4.5 relative overflow-hidden ${
          division === 'male'
            ? 'bg-gradient-to-r from-[#73FF00]/[0.08] via-[#5FD400]/[0.03] to-transparent border border-[#73FF00]/[0.08]'
            : 'bg-gradient-to-r from-[#0EA5E9]/[0.08] via-[#38BDF8]/[0.03] to-transparent border border-[#0EA5E9]/[0.08]'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <div className="flex items-center gap-4 relative z-10">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              division === 'male' ? 'bg-[#73FF00]/10' : 'bg-[#0EA5E9]/10'
            }`}
          >
            <Flame className={`w-5 h-5 ${accent.text}`} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-white/90 tracking-tight">4 Tim · 12 Pemain · 3 Pertandingan</p>
            <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">
              {isGFActive
                ? 'Semifinal dan Final sedang berlangsung'
                : isGFCompleted
                  ? 'Grand Final telah selesai! Selamat untuk para pemenang'
                  : 'Top 12 pemain akan dibagi menjadi 4 tim, bertanding di Semifinal dan Final'
              }
            </p>
          </div>
          <ChevronRight className={`w-4 h-4 ${accent.text} opacity-30 flex-shrink-0`} />
        </div>
      </motion.div>
    </div>
  );
}

export default GrandFinal;
