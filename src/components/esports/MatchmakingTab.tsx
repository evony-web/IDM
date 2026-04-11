'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Search,
  X,
  Clock,
  Zap,
  Trophy,
  ChevronRight,
  Users,
  Timer,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// BOUNTIE-STYLE MATCHMAKING TAB
// ═══════════════════════════════════════════════════════════════════════

interface OpponentInfo {
  id: string;
  name: string;
  avatar: string | null;
  eloRating: number;
  eloTier: string;
  gender?: string;
}

interface QueueEntry {
  id: string;
  division: string;
  eloRange: string;
  status: string;
  matchedWith: string | null;
  createdAt: string;
}

interface RecentMatch {
  id: string;
  opponent: OpponentInfo;
  result: 'win' | 'loss';
  date: string;
}

interface MatchmakingTabProps {
  division: 'male' | 'female';
  currentUserId?: string | null;
  onPlayerClick?: (playerId: string) => void;
}

const ELO_TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
  Master: '#FF6B6B',
  Grandmaster: '#FF4500',
};

type EloRange = 'any' | 'narrow' | 'wide';

const ELO_RANGE_OPTIONS: { value: EloRange; label: string; description: string }[] = [
  { value: 'any', label: 'Semua', description: 'ELO berapa saja' },
  { value: 'narrow', label: 'Sempit', description: '±200 ELO' },
  { value: 'wide', label: 'Lebar', description: '±400 ELO' },
];

export function MatchmakingTab({ division, currentUserId, onPlayerClick }: MatchmakingTabProps) {
  const [eloRange, setEloRange] = useState<EloRange>('any');
  const [isInQueue, setIsInQueue] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [queueTime, setQueueTime] = useState(0);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accentColor = division === 'male' ? '#73FF00' : '#38BDF8';
  const accentGlow = division === 'male' ? '115,255,0' : '56,189,248';

  // ── Queue timer ──
  useEffect(() => {
    if (isInQueue && !opponent) {
      queueTimerRef.current = setInterval(() => {
        setQueueTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (queueTimerRef.current) {
        clearInterval(queueTimerRef.current);
        queueTimerRef.current = null;
      }
    }
    return () => {
      if (queueTimerRef.current) {
        clearInterval(queueTimerRef.current);
        queueTimerRef.current = null;
      }
    };
  }, [isInQueue, opponent]);

  // ── Poll for match status while in queue ──
  const checkQueueStatus = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/matchmaking?userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.status === 'matched' && data.opponent) {
            setOpponent(data.opponent);
            setIsInQueue(false);
            setQueueEntry(null);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (data.inQueue) {
            setIsInQueue(true);
            setQueueEntry(data.queueEntry);
          } else {
            setIsInQueue(false);
            setQueueEntry(null);
          }
        }
      }
    } catch {
      /* silent */
    }
  }, [currentUserId]);

  useEffect(() => {
    if (isInQueue && !opponent) {
      pollIntervalRef.current = setInterval(checkQueueStatus, 3000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isInQueue, opponent, checkQueueStatus]);

  // ── Fetch recent matches on mount ──
  useEffect(() => {
    let cancelled = false;
    const fetchRecent = async () => {
      if (!currentUserId) return;
      try {
        // Get recent completed matches involving the user
        const res = await fetch(`/api/matches?userId=${currentUserId}&status=completed&limit=5`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.success && data.matches) {
            const matches: RecentMatch[] = data.matches.slice(0, 5).map((m: Record<string, unknown>) => ({
              id: m.id as string,
              opponent: m.opponent as OpponentInfo,
              result: m.result as 'win' | 'loss',
              date: m.date as string,
            }));
            setRecentMatches(matches);
          }
        }
      } catch {
        /* silent */
      }
    };
    fetchRecent();
    return () => { cancelled = true; };
  }, [currentUserId]);

  // ── Join queue ──
  const handleFindOpponent = useCallback(async () => {
    if (!currentUserId) return;
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          division,
          eloRange,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.matched && data.opponent) {
          setOpponent(data.opponent);
          setQueueTime(0);
        } else {
          setIsInQueue(true);
          setQueueEntry(data.queueEntry);
          setQueueTime(0);
        }
      } else {
        setError(data.error || 'Gagal mencari lawan');
      }
    } catch {
      setError('Gagal terhubung ke server');
    }
    setIsSearching(false);
  }, [currentUserId, division, eloRange]);

  // ── Leave queue ──
  const handleLeaveQueue = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/matchmaking?userId=${currentUserId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsInQueue(false);
        setQueueEntry(null);
        setQueueTime(0);
      }
    } catch {
      /* silent */
    }
  }, [currentUserId]);

  // ── Dismiss match found ──
  const handleDismissMatch = useCallback(() => {
    setOpponent(null);
    setQueueTime(0);
  }, []);

  // ── Format queue time ──
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 pb-24">
      {/* ── Match Found Overlay ── */}
      <AnimatePresence>
        {opponent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-sm"
            >
              {/* Match Found Card */}
              <div
                className="relative overflow-hidden rounded-3xl border p-6 text-center"
                style={{
                  background: `linear-gradient(180deg, rgba(${accentGlow},0.15) 0%, rgba(0,0,0,0.9) 100%)`,
                  borderColor: `rgba(${accentGlow},0.3)`,
                }}
              >
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{
                    boxShadow: [
                      `0 0 30px rgba(${accentGlow},0.2)`,
                      `0 0 60px rgba(${accentGlow},0.4)`,
                      `0 0 30px rgba(${accentGlow},0.2)`,
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Header */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4"
                >
                  <Swords
                    className="w-10 h-10 mx-auto mb-2"
                    style={{ color: accentColor }}
                  />
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">
                    Lawan Ditemukan!
                  </h2>
                </motion.div>

                {/* VS Card */}
                <div className="flex items-center justify-center gap-4 my-6">
                  {/* Player 1 (You) */}
                  <motion.div
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold overflow-hidden ring-2"
                      style={{ ringColor: accentColor }}
                    >
                      K
                    </div>
                    <span className="text-sm font-bold text-white">Kamu</span>
                  </motion.div>

                  {/* VS */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}, rgba(${accentGlow},0.6))`,
                        color: division === 'male' ? '#000' : '#fff',
                        boxShadow: `0 0 20px rgba(${accentGlow},0.4)`,
                      }}
                    >
                      VS
                    </div>
                  </motion.div>

                  {/* Opponent */}
                  <motion.div
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                    onClick={() => onPlayerClick?.(opponent.id)}
                  >
                    <div
                      className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold overflow-hidden ring-2"
                      style={{ ringColor: ELO_TIER_COLORS[opponent.eloTier] || '#666' }}
                    >
                      {opponent.avatar ? (
                        <img src={opponent.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        opponent.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-bold text-white">{opponent.name}</span>
                  </motion.div>
                </div>

                {/* Opponent Info */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mb-4"
                >
                  <div className="flex items-center justify-center gap-3">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: `${ELO_TIER_COLORS[opponent.eloTier] || '#666'}20`,
                        color: ELO_TIER_COLORS[opponent.eloTier] || '#999',
                        border: `1px solid ${ELO_TIER_COLORS[opponent.eloTier] || '#666'}40`,
                      }}
                    >
                      {opponent.eloTier}
                    </span>
                    <span className="text-white/60 text-sm">
                      ELO <span className="text-white font-bold">{opponent.eloRating}</span>
                    </span>
                  </div>
                </motion.div>

                {/* Action buttons */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="flex gap-3 mt-2"
                >
                  <button
                    onClick={handleDismissMatch}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={handleDismissMatch}
                    className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}, rgba(${accentGlow},0.8))`,
                      color: division === 'male' ? '#000' : '#fff',
                    }}
                  >
                    <Swords className="w-4 h-4" />
                    Siap Bertanding!
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="px-4 pt-2">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, rgba(${accentGlow},0.2), rgba(${accentGlow},0.05))`,
              border: `1px solid rgba(${accentGlow},0.25)`,
            }}
          >
            <Swords className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Matchmaking</h2>
            <p className="text-xs text-white/40">Cari lawan seimbang berdasarkan ELO</p>
          </div>
        </div>
      </div>

      {/* ── ELO Range Selector ── */}
      <div className="px-4">
        <label className="text-xs font-semibold text-white/50 mb-2 block">Rentang ELO</label>
        <div className="grid grid-cols-3 gap-2">
          {ELO_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setEloRange(opt.value)}
              className={`relative py-3 px-2 rounded-xl border text-center transition-all ${
                eloRange === opt.value
                  ? 'border-current'
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/8'
              }`}
              style={
                eloRange === opt.value
                  ? {
                      background: `linear-gradient(180deg, rgba(${accentGlow},0.15) 0%, rgba(${accentGlow},0.05) 100%)`,
                      borderColor: `rgba(${accentGlow},0.4)`,
                      color: accentColor,
                    }
                  : undefined
              }
              disabled={isInQueue}
            >
              <span className="text-sm font-bold block">{opt.label}</span>
              <span className="text-[10px] opacity-60 block mt-0.5">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Action Area ── */}
      <div className="px-4">
        {!isInQueue ? (
          /* ── Find Opponent Button ── */
          <motion.button
            onClick={handleFindOpponent}
            disabled={isSearching || !currentUserId}
            className="w-full relative overflow-hidden rounded-2xl py-6 font-black text-lg uppercase tracking-wider flex flex-col items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, rgba(${accentGlow},0.8))`,
              color: division === 'male' ? '#000' : '#fff',
              boxShadow: `0 8px 32px rgba(${accentGlow},0.3)`,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)`,
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
            />

            {isSearching ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderTopColor: division === 'male' ? '#000' : '#fff' }}
                />
                <span>Mencari...</span>
              </div>
            ) : (
              <>
                <Swords className="w-7 h-7" />
                <span>Cari Lawan</span>
                {eloRange !== 'any' && (
                  <span className="text-xs font-semibold opacity-70 normal-case tracking-normal">
                    {eloRange === 'narrow' ? '±200 ELO' : '±400 ELO'}
                  </span>
                )}
              </>
            )}
          </motion.button>
        ) : (
          /* ── Queue Status ── */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border p-6 text-center"
            style={{
              background: `linear-gradient(180deg, rgba(${accentGlow},0.08) 0%, rgba(0,0,0,0.4) 100%)`,
              borderColor: `rgba(${accentGlow},0.2)`,
            }}
          >
            {/* Animated radar/pulse */}
            <div className="relative w-24 h-24 mx-auto mb-4">
              {/* Outer pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid rgba(${accentGlow},0.2)` }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Middle pulse ring */}
              <motion.div
                className="absolute inset-3 rounded-full"
                style={{ border: `1.5px solid rgba(${accentGlow},0.3)` }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 0, 0.6],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              />
              {/* Inner spinning ring */}
              <motion.div
                className="absolute inset-5 rounded-full"
                style={{
                  border: '2px solid transparent',
                  borderTopColor: accentColor,
                  borderRightColor: `rgba(${accentGlow},0.3)`,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="w-6 h-6" style={{ color: accentColor }} />
              </div>
            </div>

            {/* Status text */}
            <p className="text-white font-bold text-lg mb-1">Mencari lawan...</p>
            <p className="text-white/40 text-sm mb-3">
              Divisi {division === 'male' ? 'Male' : 'Female'} · {ELO_RANGE_OPTIONS.find((o) => o.value === eloRange)?.label}
            </p>

            {/* Queue timer */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4"
              style={{
                background: `rgba(${accentGlow},0.1)`,
                border: `1px solid rgba(${accentGlow},0.2)`,
              }}
            >
              <Timer className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-lg font-mono font-bold" style={{ color: accentColor }}>
                {formatTime(queueTime)}
              </span>
            </div>

            {/* Leave Queue button */}
            <button
              onClick={handleLeaveQueue}
              className="w-full mt-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
            >
              <X className="w-4 h-4" />
              Keluar Antrian
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Error display ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400/50 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── No user warning ── */}
      {!currentUserId && (
        <div className="px-4">
          <div
            className="p-4 rounded-xl text-center"
            style={{
              background: `rgba(${accentGlow},0.05)`,
              border: `1px solid rgba(${accentGlow},0.15)`,
            }}
          >
            <Users className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <p className="text-white/50 text-sm font-medium">Login dulu untuk mulai matchmaking</p>
            <p className="text-white/30 text-xs mt-1">Cari lawan seimbang berdasarkan ELO rating kamu</p>
          </div>
        </div>
      )}

      {/* ── Matchmaking Info Cards ── */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <Zap className="w-4 h-4 mx-auto mb-1.5 text-amber-400" />
            <p className="text-[10px] text-white/40 font-medium">Matchmaking</p>
            <p className="text-sm font-bold text-white">Otomatis</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <ShieldCheck className="w-4 h-4 mx-auto mb-1.5 text-green-400" />
            <p className="text-[10px] text-white/40 font-medium">Rentang ELO</p>
            <p className="text-sm font-bold text-white">Seimbang</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <Trophy className="w-4 h-4 mx-auto mb-1.5 text-purple-400" />
            <p className="text-[10px] text-white/40 font-medium">ELO Update</p>
            <p className="text-sm font-bold text-white">Real-time</p>
          </div>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-white/60 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Cara Kerja
        </h3>
        <div className="space-y-2">
          {[
            { step: '1', title: 'Pilih Rentang ELO', desc: 'Tentukan seberapa sempit pencarian lawan' },
            { step: '2', title: 'Klik Cari Lawan', desc: 'Masuk antrian matchmaking otomatis' },
            { step: '3', title: 'Lawan Ditemukan!', desc: 'Sistem mencocokkan berdasarkan ELO rating' },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{
                  background: `rgba(${accentGlow},0.15)`,
                  color: accentColor,
                  border: `1px solid rgba(${accentGlow},0.25)`,
                }}
              >
                {item.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-[11px] text-white/40">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Match History ── */}
      {recentMatches.length > 0 && (
        <div className="px-4">
          <h3 className="text-sm font-bold text-white/60 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Riwayat Matchmaking
          </h3>
          <div className="space-y-2">
            {recentMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors"
                onClick={() => onPlayerClick?.(match.opponent.id)}
              >
                {/* Result badge */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    match.result === 'win'
                      ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                      : 'bg-red-500/15 text-red-400 border border-red-500/25'
                  }`}
                >
                  {match.result === 'win' ? 'W' : 'L'}
                </div>

                {/* Opponent info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{match.opponent.name}</p>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        background: `${ELO_TIER_COLORS[match.opponent.eloTier] || '#666'}20`,
                        color: ELO_TIER_COLORS[match.opponent.eloTier] || '#999',
                      }}
                    >
                      {match.opponent.eloTier}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40">ELO {match.opponent.eloRating}</p>
                </div>

                <ChevronRight className="w-4 h-4 text-white/20" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty recent matches ── */}
      {currentUserId && recentMatches.length === 0 && (
        <div className="px-4">
          <div className="py-8 text-center">
            <Swords className="w-10 h-10 mx-auto mb-2 text-white/10" />
            <p className="text-sm text-white/30 font-medium">Belum ada riwayat matchmaking</p>
            <p className="text-xs text-white/20 mt-1 flex items-center justify-center gap-1">
              Cari lawan sekarang <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
