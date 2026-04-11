'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Star,
  Crown,
  Zap,
  Swords,
  Target,
  Users,
  ChevronDown,
  Info,
  X,
  TrendingUp,
  Award,
} from 'lucide-react';

interface PointBreakdownModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  division: 'male' | 'female';
  tournamentId?: string | null;
  prizePool?: number;
  prizeChampion?: number;
  prizeRunnerUp?: number;
  prizeThird?: number;
  prizeMvp?: number;
}

interface PointData {
  match: {
    participation: number;
    win: number;
    mvpBonus: number;
  };
  tournament: {
    champion: number;
    runnerUp: number;
    third: number;
    mvp: number;
    participation: number;
  };
  meta: {
    hasPrize: boolean;
    avgMembersPerTeam: number;
    prizeChampion: number;
    prizeRunnerUp: number;
    prizeThird: number;
    prizeMvp: number;
    isPrizeBased: boolean;
    fallbackPoints: {
      champion: number;
      runnerUp: number;
      third: number;
      mvp: number;
      participation: number;
    };
  };
}

export function PointBreakdownModal({
  isOpen,
  onOpenChange,
  division,
  tournamentId,
  prizePool = 0,
  prizeChampion,
  prizeRunnerUp,
  prizeThird,
  prizeMvp,
}: PointBreakdownModalProps) {
  const isMale = division === 'male';
  const [points, setPoints] = useState<PointData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'match' | 'tournament' | 'example'>('match');

  // Accent colors based on division
  const accentColor = isMale ? '#73FF00' : '#38BDF8';
  const accentText = isMale ? 'text-[#73FF00]' : 'text-[#38BDF8]';
  const accentBg = isMale ? 'bg-[#73FF00]/10' : 'bg-[#38BDF8]/10';
  const accentBorder = isMale ? 'border-[#73FF00]/15' : 'border-[#38BDF8]/15';

  // Fetch point breakdown from API
  useEffect(() => {
    if (!isOpen || !tournamentId) return;
    let cancelled = false;
    let loadingTimeout: ReturnType<typeof setTimeout>;
    loadingTimeout = setTimeout(() => setLoading(true), 0);
    fetch(`/api/tournaments/points?tournamentId=${tournamentId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.success) {
          setPoints(data.pointBreakdown);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(loadingTimeout); };
  }, [isOpen, tournamentId]);

  // Fallback values if no API data
  const matchPts = points?.match ?? { participation: 1, win: 2, mvpBonus: 0 };
  const tournamentPts = points?.tournament ?? { champion: 100, runnerUp: 70, third: 50, mvp: 30, participation: 10 };
  const isPrizeBased = points?.meta?.isPrizeBased ?? false;
  const avgMembers = points?.meta?.avgMembersPerTeam ?? 3;
  const fallbackPts = points?.meta?.fallbackPoints ?? { champion: 100, runnerUp: 70, third: 50, mvp: 30, participation: 10 };

  const formatCurrency = (amount: number) => {
    return 'Rp ' + amount.toLocaleString('id-ID');
  };

  const formatPrize = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}jt`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
    return String(val);
  };

  // Calculate example points for a player
  const examplePlayer = {
    name: 'Contoh Pemain',
    matchesPlayed: 4,
    wins: 3,
    isChampion: true,
    isMVP: false,
  };

  const exampleCalculation = {
    matchParticipation: examplePlayer.matchesPlayed * matchPts.participation,
    matchWins: examplePlayer.wins * matchPts.win,
    tournamentChampion: tournamentPts.champion,
    total: examplePlayer.matchesPlayed * matchPts.participation + examplePlayer.wins * matchPts.win + tournamentPts.champion,
  };

  // Match point cards data
  const matchPointCards = [
    {
      key: 'participation',
      label: 'Partisipasi',
      subtitle: 'Main di match',
      points: matchPts.participation,
      icon: Users,
      color: 'rgba(148,163,184,0.6)',
      bgColor: 'rgba(148,163,184,0.08)',
      borderColor: 'rgba(148,163,184,0.12)',
      description: 'Setiap pemain yang bermain di pertandingan mendapat poin ini',
    },
    {
      key: 'win',
      label: 'Menang',
      subtitle: 'Tim menang',
      points: matchPts.win,
      icon: Swords,
      color: accentColor,
      bgColor: isMale ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)',
      borderColor: isMale ? 'rgba(115,255,0,0.15)' : 'rgba(56,189,248,0.15)',
      description: 'Poin tambahan untuk anggota tim yang menang (di atas partisipasi)',
      highlight: true,
    },
    {
      key: 'mvpBonus',
      label: 'MVP Match',
      subtitle: 'Bonus MVP',
      points: matchPts.mvpBonus,
      icon: Zap,
      color: 'rgba(251,191,36,0.6)',
      bgColor: 'rgba(251,191,36,0.06)',
      borderColor: 'rgba(251,191,36,0.10)',
      description: 'MVP per match TIDAK mendapat poin match — poin MVP hanya dari finalisasi turnamen',
      dimmed: true,
    },
  ];

  // Tournament finalization point cards
  const tournamentPointCards = [
    {
      key: 'champion',
      label: 'Juara 1',
      subtitle: 'Champion',
      points: tournamentPts.champion,
      fallback: fallbackPts.champion,
      prize: points?.meta?.prizeChampion ?? prizeChampion ?? 0,
      icon: Crown,
      color: '#FBBF24',
      bgColor: 'rgba(251,191,36,0.08)',
      borderColor: 'rgba(251,191,36,0.15)',
      gradient: 'from-yellow-400 via-amber-400 to-yellow-500',
    },
    {
      key: 'runnerUp',
      label: 'Juara 2',
      subtitle: 'Runner-up',
      points: tournamentPts.runnerUp,
      fallback: fallbackPts.runnerUp,
      prize: points?.meta?.prizeRunnerUp ?? prizeRunnerUp ?? 0,
      icon: Medal,
      color: '#94A3B8',
      bgColor: 'rgba(148,163,184,0.06)',
      borderColor: 'rgba(148,163,184,0.12)',
      gradient: 'from-gray-300 via-gray-400 to-gray-500',
    },
    {
      key: 'third',
      label: 'Juara 3',
      subtitle: '3rd Place',
      points: tournamentPts.third,
      fallback: fallbackPts.third,
      prize: points?.meta?.prizeThird ?? prizeThird ?? 0,
      icon: Medal,
      color: '#F97316',
      bgColor: 'rgba(249,115,22,0.06)',
      borderColor: 'rgba(249,115,22,0.12)',
      gradient: 'from-orange-400 via-orange-500 to-orange-600',
    },
    {
      key: 'mvp',
      label: 'MVP Turnamen',
      subtitle: 'Most Valuable Player',
      points: tournamentPts.mvp,
      fallback: fallbackPts.mvp,
      prize: points?.meta?.prizeMvp ?? prizeMvp ?? 0,
      icon: Star,
      color: '#FBBF24',
      bgColor: 'rgba(251,191,36,0.06)',
      borderColor: 'rgba(251,191,36,0.12)',
      gradient: 'from-amber-400 via-amber-500 to-orange-500',
    },
    {
      key: 'participation',
      label: 'Partisipasi',
      subtitle: 'Peserta Turnamen',
      points: tournamentPts.participation,
      fallback: fallbackPts.participation,
      prize: 0,
      icon: Users,
      color: 'rgba(148,163,184,0.5)',
      bgColor: 'rgba(148,163,184,0.04)',
      borderColor: 'rgba(148,163,184,0.08)',
      gradient: 'from-slate-400 via-slate-500 to-slate-600',
    },
  ];

  const sectionTabs = [
    { key: 'match' as const, label: 'Per Match', icon: Swords },
    { key: 'tournament' as const, label: 'Finalisasi', icon: Trophy },
    { key: 'example' as const, label: 'Contoh', icon: TrendingUp },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="point-breakdown-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="relative rounded-t-[32px] sm:rounded-[24px] w-full max-w-md lg:max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(180deg, rgba(18,18,22,0.98) 0%, rgba(10,10,14,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onOpenChange(false);
              }
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-4 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-[5px] rounded-full bg-white/20 shadow-sm shadow-white/10" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 pt-1 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${accentBg} flex items-center justify-center border ${accentBorder}`}>
                    <Target className={`w-[18px] h-[18px] ${accentText}`} />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-white/90 tracking-tight leading-tight">Sistem Poin</h2>
                    <p className="text-[11px] text-white/30 mt-0.5 font-medium">
                      Breakdown poin turnamen
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              {/* Prize-based indicator */}
              {isPrizeBased && (
                <motion.div
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.02) 100%)',
                    border: '1px solid rgba(251,191,36,0.12)',
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-amber-400/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-amber-400/80">
                      Poin Berdasarkan Hadiah
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      Poin dihitung dari Rp hadiah / anggota tim / 1000. Rata-rata {avgMembers} anggota/tim.
                    </p>
                  </div>
                </motion.div>
              )}

              {!isPrizeBased && (
                <motion.div
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center flex-shrink-0`}>
                    <Info className={`w-4 h-4 ${accentText} opacity-60`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-bold ${accentText} opacity-80`}>
                      Poin Default
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      Belum ada hadiah ditetapkan. Menggunakan poin default.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Section Tabs */}
              <div className="flex items-center gap-1.5 mt-4 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {sectionTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeSection === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveSection(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                        isActive
                          ? `${accentText} ${accentBg}`
                          : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8">
              <AnimatePresence mode="wait">
                {/* ═══════════════════════════════════════════════════
                    PER MATCH POINTS SECTION
                    ═══════════════════════════════════════════════════ */}
                {activeSection === 'match' && (
                  <motion.div
                    key="match-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Swords className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">
                        Poin Per Pertandingan
                      </span>
                    </div>

                    {/* Match point cards */}
                    {matchPointCards.map((card, index) => {
                      const Icon = card.icon;
                      return (
                        <motion.div
                          key={card.key}
                          className="rounded-2xl p-4 relative overflow-hidden"
                          style={{
                            background: card.bgColor,
                            border: `1px solid ${card.borderColor}`,
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.07, duration: 0.4 }}
                        >
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{
                                background: `${card.color}15`,
                                border: `1px solid ${card.color}25`,
                              }}
                            >
                              <Icon className="w-5 h-5" style={{ color: card.color }} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[14px] font-bold text-white/90">{card.label}</p>
                                <span className="text-[9px] text-white/25 font-medium uppercase">{card.subtitle}</span>
                                {card.highlight && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase" style={{ background: `${accentColor}15`, color: accentColor }}>
                                    Utama
                                  </span>
                                )}
                                {card.dimmed && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase bg-white/[0.04] text-white/20">
                                    0 pts
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-white/25 mt-0.5 leading-relaxed">
                                {card.description}
                              </p>
                            </div>

                            {/* Points */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-[20px] font-black tabular-nums" style={{ color: card.dimmed ? 'rgba(255,255,255,0.15)' : card.color }}>
                                +{card.points}
                              </p>
                              <p className="text-[9px] text-white/20 font-medium">poin</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Cumulative note */}
                    <motion.div
                      className="rounded-xl p-3.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex items-start gap-2.5">
                        <Info className="w-3.5 h-3.5 text-white/15 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-white/25 leading-relaxed">
                            <span className="font-bold text-white/40">Poin kumulatif</span> — setiap match yang dimainkan, poin ditambahkan terus.
                          </p>
                          <p className="text-[10px] text-white/25 leading-relaxed">
                            Contoh: Main 4 match, menang 3 → <span className="font-bold text-white/40">{4}x{matchPts.participation} + {3}x{matchPts.win} = {4 * matchPts.participation + 3 * matchPts.win} poin match</span>
                          </p>
                          <p className="text-[10px] text-amber-400/40 leading-relaxed">
                            MVP match TIDAK mendapat poin partisipasi/menang — poin MVP hanya dari finalisasi turnamen.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════
                    TOURNAMENT FINALIZATION POINTS SECTION
                    ═══════════════════════════════════════════════════ */}
                {activeSection === 'tournament' && (
                  <motion.div
                    key="tournament-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">
                        Poin Finalisasi Turnamen
                      </span>
                    </div>

                    {/* Tournament point cards */}
                    {tournamentPointCards.map((card, index) => {
                      const Icon = card.icon;
                      const isUsingPrize = isPrizeBased && card.prize > 0;
                      const pointDiffersFromFallback = card.points !== card.fallback;

                      return (
                        <motion.div
                          key={card.key}
                          className="rounded-2xl p-4 relative overflow-hidden"
                          style={{
                            background: card.bgColor,
                            border: `1px solid ${card.borderColor}`,
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.07, duration: 0.4 }}
                        >
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${card.color}25, ${card.color}10)`,
                                border: `1px solid ${card.color}20`,
                                boxShadow: index === 0 ? `0 2px 12px ${card.color}15` : 'none',
                              }}
                            >
                              <Icon className="w-5 h-5" style={{ color: card.color }} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[14px] font-bold text-white/90">{card.label}</p>
                                <span className="text-[9px] text-white/20 font-medium uppercase">{card.subtitle}</span>
                                {pointDiffersFromFallback && isUsingPrize && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase" style={{ background: `${accentColor}12`, color: accentColor }}>
                                    Prize
                                  </span>
                                )}
                              </div>
                              {isUsingPrize && (
                                <p className="text-[10px] text-white/25 mt-0.5">
                                  {formatCurrency(card.prize)} / {card.key === 'mvp' ? '1' : avgMembers} anggota / 1000
                                </p>
                              )}
                              {!isUsingPrize && card.key !== 'participation' && (
                                <p className="text-[10px] text-white/20 mt-0.5">
                                  Default (belum ada hadiah)
                                </p>
                              )}
                              {card.key === 'participation' && (
                                <p className="text-[10px] text-white/20 mt-0.5">
                                  Untuk peserta yang bukan juara/runner-up/juara 3/MVP
                                </p>
                              )}
                            </div>

                            {/* Points */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-[20px] font-black tabular-nums" style={{ color: card.color }}>
                                +{card.points}
                              </p>
                              <p className="text-[9px] text-white/20 font-medium">poin</p>
                              {pointDiffersFromFallback && (
                                <p className="text-[8px] text-white/15 line-through tabular-nums mt-0.5">
                                  +{card.fallback}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Visual bar showing relative magnitude */}
                          {index < 4 && (
                            <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${card.color}, ${card.color}80)` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (card.points / tournamentPts.champion) * 100)}%` }}
                                transition={{ delay: 0.3 + index * 0.1, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                              />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Formula explanation */}
                    <motion.div
                      className="rounded-xl p-3.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-start gap-2.5">
                        <Info className="w-3.5 h-3.5 text-white/15 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-white/25 leading-relaxed">
                            {isPrizeBased ? (
                              <>
                                <span className="font-bold text-white/40">Formula:</span> Poin = Rp Hadiah / Jumlah Anggota Tim / 1000.
                                Dibulatkan ke bawah.
                              </>
                            ) : (
                              <>
                                Menggunakan <span className="font-bold text-white/40">poin default</span> karena belum ada hadiah yang ditetapkan.
                                Setelah admin mengatur hadiah, poin akan otomatis dihitung berdasarkan prize pool.
                              </>
                            )}
                          </p>
                          <p className="text-[10px] text-white/25 leading-relaxed">
                            Poin finalisasi ditambahkan <span className="font-bold text-white/40">sekali saja</span> saat turnamen selesai (difinalisasi admin).
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════
                    EXAMPLE CALCULATION SECTION
                    ═══════════════════════════════════════════════════ */}
                {activeSection === 'example' && (
                  <motion.div
                    key="example-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">
                        Contoh Perhitungan
                      </span>
                    </div>

                    {/* Example scenario card */}
                    <motion.div
                      className="rounded-2xl p-4"
                      style={{
                        background: isMale ? 'rgba(115,255,0,0.04)' : 'rgba(56,189,248,0.04)',
                        border: `1px solid ${isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)'}`,
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center border ${accentBorder}`}>
                          <Users className={`w-4 h-4 ${accentText}`} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white/90">Pemain Juara (Anggota Tim)</p>
                          <p className="text-[10px] text-white/30">Main 4 match, menang 3, tim jadi Juara 1</p>
                        </div>
                      </div>

                      {/* Calculation breakdown */}
                      <div className="space-y-2">
                        {/* Match participation */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-slate-400/60" />
                            <span className="text-[11px] text-white/60">Partisipasi Match</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/30 tabular-nums">4 x {matchPts.participation}</span>
                            <span className="text-[12px] font-bold text-white/50 tabular-nums">= +{exampleCalculation.matchParticipation}</span>
                          </div>
                        </div>

                        {/* Match wins */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: isMale ? 'rgba(115,255,0,0.05)' : 'rgba(56,189,248,0.05)' }}>
                          <div className="flex items-center gap-2">
                            <Swords className={`w-3.5 h-3.5 ${accentText} opacity-60`} />
                            <span className="text-[11px] text-white/60">Menang Match</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/30 tabular-nums">3 x {matchPts.win}</span>
                            <span className={`text-[12px] font-bold ${accentText} tabular-nums`}>= +{exampleCalculation.matchWins}</span>
                          </div>
                        </div>

                        {/* Tournament champion */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.05)' }}>
                          <div className="flex items-center gap-2">
                            <Crown className="w-3.5 h-3.5 text-amber-400/70" />
                            <span className="text-[11px] text-white/60">Juara Turnamen</span>
                          </div>
                          <span className="text-[12px] font-bold text-amber-400/80 tabular-nums">+{exampleCalculation.tournamentChampion}</span>
                        </div>

                        {/* Divider */}
                        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                        {/* Total */}
                        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: isMale ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)' }}>
                          <span className="text-[12px] font-bold text-white/70">Total Poin</span>
                          <span className={`text-[18px] font-black ${accentText} tabular-nums`}>
                            {exampleCalculation.total}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Other scenarios */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                        Skenario Lain
                      </p>

                      {/* MVP scenario */}
                      <motion.div
                        className="rounded-xl p-3.5"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-3.5 h-3.5 text-amber-400/60" />
                          <span className="text-[11px] font-bold text-white/60">Pemain MVP (Anggota Tim Juara)</span>
                        </div>
                        <div className="space-y-1.5 pl-5.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white/30">Mendapat poin MVP turnamen</span>
                            <span className="text-amber-400/70 font-bold">+{tournamentPts.mvp}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white/30">Mendapat poin Juara (sebagai anggota tim)</span>
                            <span className="text-amber-400/70 font-bold">+{tournamentPts.champion}</span>
                          </div>
                          <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white/40 font-bold">Total (finalisasi saja)</span>
                            <span className="text-amber-400/80 font-black">+{tournamentPts.mvp + tournamentPts.champion}</span>
                          </div>
                          <p className="text-[9px] text-amber-400/40 mt-1">
                            Catatan: MVP TIDAK mendapat poin match (partisipasi + menang) — hanya poin finalisasi.
                          </p>
                        </div>
                      </motion.div>

                      {/* Runner-up scenario */}
                      <motion.div
                        className="rounded-xl p-3.5"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Medal className="w-3.5 h-3.5 text-slate-400/60" />
                          <span className="text-[11px] font-bold text-white/60">Anggota Tim Runner-Up</span>
                        </div>
                        <div className="space-y-1.5 pl-5.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white/30">Partisipasi match (4 match x {matchPts.participation})</span>
                            <span className="text-white/40 font-bold">+{4 * matchPts.participation}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white/30">Menang match (2 match x {matchPts.win})</span>
                            <span className="text-white/40 font-bold">+{2 * matchPts.win}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white/30">Runner-up turnamen</span>
                            <span className="text-slate-400/70 font-bold">+{tournamentPts.runnerUp}</span>
                          </div>
                          <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white/40 font-bold">Total</span>
                            <span className="text-white/60 font-black">+{4 * matchPts.participation + 2 * matchPts.win + tournamentPts.runnerUp}</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Note about season points */}
                    <motion.div
                      className="rounded-xl p-3.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                    >
                      <div className="flex items-start gap-2.5">
                        <Award className="w-3.5 h-3.5 text-white/15 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-white/20 leading-relaxed">
                          Poin Season diatur terpisah oleh admin dan ditampilkan di Leaderboard. Achievement badges diberikan otomatis saat poin kumulatif mencapai milestone (500 pts, 1000 pts, dll).
                        </p>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PointBreakdownModal;
