'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Coins, Target, TrendingUp, Clock, Shield, ChevronDown, Search, Flame, Award, Zap, Filter, X } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// BOUNTIE-STYLE BOUNTY MARKETPLACE
// ═══════════════════════════════════════════════════════════════════════

interface Bounty {
  id: string;
  placerId: string;
  targetPlayerId: string;
  tournamentId?: string | null;
  amount: number;
  currency: string;
  reason?: string | null;
  status: string;
  expiresAt?: string | null;
  claimedAt?: string | null;
  claimedById?: string | null;
  createdAt: string;
  placer: { id: string; name: string; avatar: string | null; eloRating: number; eloTier: string };
  targetPlayer: { id: string; name: string; avatar: string | null; eloRating: number; eloTier: string; gender?: string };
  tournament?: { id: string; name: string; status: string } | null;
  claims?: { id: string; status: string }[];
}

interface BountyStats {
  totalActive: number;
  totalClaimed: number;
  totalAmount: number;
  highestBounty: { amount: number; target: { name: string; avatar: string | null } } | null;
  topHunters: Array<{ id: string; name: string; avatar: string | null; eloRating: number; eloTier: string; claimsCount: number }>;
  userStats: { placed: number; onMe: number; claimed: number } | null;
}

interface BountieTabProps {
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

export function BountieTab({ division, currentUserId, onPlayerClick }: BountieTabProps) {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [stats, setStats] = useState<BountyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'active' | 'claimed' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlaceBounty, setShowPlaceBounty] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Place bounty form
  const [placeTarget, setPlaceTarget] = useState('');
  const [placeAmount, setPlaceAmount] = useState('');
  const [placeReason, setPlaceReason] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [searchPlayers, setSearchPlayers] = useState<Array<{ id: string; name: string; avatar: string | null; eloRating: number; eloTier: string }>>([]);
  const [targetSearch, setTargetSearch] = useState('');

  const fetchBounties = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        status: filterStatus === 'all' ? '' : filterStatus,
        division,
        limit: '30',
      });
      const res = await fetch(`/api/bounties?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setBounties(data.bounties);
      }
    } catch { /* silent */ }
  }, [filterStatus, division]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ division });
      if (currentUserId) params.set('userId', currentUserId);
      const res = await fetch(`/api/bounties/stats?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setStats(data.stats);
      }
    } catch { /* silent */ }
  }, [division, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await Promise.all([fetchBounties(), fetchStats()]);
      if (!cancelled) setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [fetchBounties, fetchStats]);

  // Search players for bounty target
  useEffect(() => {
    if (!targetSearch.trim()) { return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(targetSearch)}&gender=${division}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.users) setSearchPlayers(data.users);
        }
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [targetSearch, division]);

  const handlePlaceBounty = async () => {
    if (!placeTarget || !placeAmount || Number(placeAmount) <= 0) return;
    setIsPlacing(true);
    try {
      const res = await fetch('/api/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placerId: currentUserId,
          targetPlayerId: placeTarget,
          amount: Number(placeAmount),
          currency: 'points',
          reason: placeReason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPlaceBounty(false);
        setPlaceTarget('');
        setPlaceAmount('');
        setPlaceReason('');
        setTargetSearch('');
        fetchBounties();
        fetchStats();
      }
    } catch { /* silent */ }
    setIsPlacing(false);
  };

  const filteredBounties = bounties.filter(b =>
    !searchQuery ||
    b.targetPlayer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.placer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.reason && b.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse h-28 bg-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* ── Stats Bar ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-white/50 font-medium">Active Bounties</span>
            </div>
            <p className="text-lg font-bold text-amber-400">{stats.totalActive}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Coins className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[11px] text-white/50 font-medium">Total Pool</span>
            </div>
            <p className="text-lg font-bold text-green-400">{stats.totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] text-white/50 font-medium">Claimed</span>
            </div>
            <p className="text-lg font-bold text-blue-400">{stats.totalClaimed}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[11px] text-white/50 font-medium">Highest</span>
            </div>
            <p className="text-lg font-bold text-pink-400">
              {stats.highestBounty ? stats.highestBounty.amount.toLocaleString() : '—'}
            </p>
          </div>
        </div>
      )}

      {/* ── Search & Filter Bar ── */}
      <div className="px-4 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Cari bounty, pemain..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 rounded-xl border transition-colors ${showFilters ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-white/50'}`}
        >
          <Filter className="w-4 h-4" />
        </button>
        {currentUserId && (
          <button
            onClick={() => setShowPlaceBounty(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm flex items-center gap-1.5 hover:bg-amber-400 transition-colors"
          >
            <Crosshair className="w-4 h-4" />
            <span className="hidden sm:inline">Pasang</span>
          </button>
        )}
      </div>

      {/* ── Filter Pills ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4"
          >
            <div className="flex gap-2 pb-2">
              {(['active', 'claimed', 'all'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filterStatus === s
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-white/5 text-white/50 border border-white/10'
                  }`}
                >
                  {s === 'active' ? '🔥 Aktif' : s === 'claimed' ? '✅ Diklaim' : '📋 Semua'}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bounty Cards ── */}
      <div className="px-4 space-y-3">
        {filteredBounties.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Crosshair className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Belum ada bounty</p>
            <p className="text-xs mt-1">Pasang bounty pertama dan tantang pemain!</p>
          </div>
        ) : (
          filteredBounties.map((bounty, idx) => (
            <motion.div
              key={bounty.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`relative overflow-hidden rounded-2xl border transition-all hover:scale-[1.01] ${
                bounty.status === 'active'
                  ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {/* Bounty amount badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">{bounty.amount.toLocaleString()}</span>
                <span className="text-[10px] text-white/40">pts</span>
              </div>

              <div className="p-4 pr-28">
                {/* Target player */}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="relative cursor-pointer"
                    onClick={() => onPlayerClick?.(bounty.targetPlayerId)}
                  >
                    <div
                      className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold overflow-hidden ring-2"
                      style={{ ringColor: ELO_TIER_COLORS[bounty.targetPlayer.eloTier] || '#666' }}
                    >
                      {bounty.targetPlayer.avatar ? (
                        <img src={bounty.targetPlayer.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        bounty.targetPlayer.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-[#12141a]"
                      style={{ background: ELO_TIER_COLORS[bounty.targetPlayer.eloTier] || '#666', color: '#000' }}
                    >
                      {bounty.targetPlayer.eloRating}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">Target</span>
                    </div>
                    <p className="font-bold text-white">{bounty.targetPlayer.name}</p>
                    <p className="text-[11px] text-white/40">{bounty.targetPlayer.eloTier} · ELO {bounty.targetPlayer.eloRating}</p>
                  </div>
                </div>

                {/* Placed by */}
                <div className="flex items-center gap-2 text-[11px] text-white/40 mt-2">
                  <span>Dipasang oleh</span>
                  <span className="text-white/70 font-medium">{bounty.placer.name}</span>
                  {bounty.tournament && (
                    <>
                      <span>·</span>
                      <span className="text-amber-400/60">{bounty.tournament.name}</span>
                    </>
                  )}
                </div>

                {/* Reason */}
                {bounty.reason && (
                  <p className="text-xs text-white/50 mt-1.5 italic">&ldquo;{bounty.reason}&rdquo;</p>
                )}

                {/* Claims count */}
                {bounty.claims && bounty.claims.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-400">
                    <Shield className="w-3 h-3" />
                    <span>{bounty.claims.length} klaim masuk</span>
                  </div>
                )}

                {/* Status badge */}
                {bounty.status === 'claimed' && (
                  <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-green-500/20 rounded-md text-[11px] font-semibold text-green-400">
                    <Shield className="w-3 h-3" /> Diklaim
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ── Place Bounty Modal ── */}
      <AnimatePresence>
        {showPlaceBounty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPlaceBounty(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-[#1a1c22] border border-white/10 rounded-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-amber-400" />
                    Pasang Bounty
                  </h3>
                  <button onClick={() => setShowPlaceBounty(false)} className="text-white/30 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">Tantang pemain dengan hadiah bounty. Jika mereka kalah, siapa yang mengalahkan mendapat bounty!</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Target player search */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Target Pemain</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      placeholder="Cari pemain..."
                      value={targetSearch}
                      onChange={e => setTargetSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  {searchPlayers.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1 bg-black/30 rounded-xl p-2">
                      {searchPlayers.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setPlaceTarget(p.id); setTargetSearch(p.name); setSearchPlayers([]); }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            placeTarget === p.id ? 'bg-amber-500/20 border border-amber-500/40' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden">
                            {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{p.name}</p>
                            <p className="text-[11px] text-white/40">{p.eloTier} · ELO {p.eloRating}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Jumlah Bounty (poin)</label>
                  <input
                    type="number"
                    placeholder="100"
                    min="1"
                    value={placeAmount}
                    onChange={e => setPlaceAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Alasan (opsional)</label>
                  <input
                    type="text"
                    placeholder="Kamu tidak bisa menang! 😤"
                    value={placeReason}
                    onChange={e => setPlaceReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <button
                  onClick={handlePlaceBounty}
                  disabled={!placeTarget || !placeAmount || Number(placeAmount) <= 0 || isPlacing}
                  className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isPlacing ? (
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Crosshair className="w-4 h-4" />
                      Pasang Bounty
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bounty Hunters ── */}
      {stats && stats.topHunters.length > 0 && (
        <div className="px-4 mt-4">
          <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Top Bounty Hunters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stats.topHunters.map((hunter, idx) => (
              <div
                key={hunter.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/8 transition-colors"
                onClick={() => onPlayerClick?.(hunter.id)}
              >
                <span className="text-lg font-black text-amber-400/50 w-6 text-center">{idx + 1}</span>
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden">
                  {hunter.avatar ? <img src={hunter.avatar} alt="" className="w-full h-full object-cover" /> : hunter.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{hunter.name}</p>
                  <p className="text-[11px] text-white/40">{hunter.eloTier} · ELO {hunter.eloRating}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{hunter.claimsCount}</p>
                  <p className="text-[10px] text-white/30">klaim</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
