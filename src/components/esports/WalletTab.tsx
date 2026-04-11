'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowDown,
  ArrowRightLeft,
  History,
  Crosshair,
  Shield,
  Trophy,
  Heart,
  Gift,
  Search,
  X,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Send,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// BOUNTIE-STYLE WALLET TAB — Dark glassmorphism, Indonesian labels
// ═══════════════════════════════════════════════════════════════════════

interface WalletTabProps {
  division: 'male' | 'female';
  currentUserId?: string | null;
}

interface WalletData {
  id: string;
  userId: string;
  balance: number;
  totalIn: number;
  totalOut: number;
}

interface Transaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  category: string;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface SearchedUser {
  id: string;
  name: string;
  avatar: string | null;
  eloRating: number;
  eloTier: string;
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  bounty_place: Crosshair,
  bounty_claim: Shield,
  prize: Trophy,
  topup: Plus,
  withdraw: ArrowDown,
  sawer: Heart,
  donation: Gift,
  transfer: ArrowRightLeft,
};

const CATEGORY_COLORS: Record<string, string> = {
  bounty_place: 'text-red-400 bg-red-400/10',
  bounty_claim: 'text-blue-400 bg-blue-400/10',
  prize: 'text-amber-400 bg-amber-400/10',
  topup: 'text-green-400 bg-green-400/10',
  withdraw: 'text-orange-400 bg-orange-400/10',
  sawer: 'text-pink-400 bg-pink-400/10',
  donation: 'text-purple-400 bg-purple-400/10',
  transfer: 'text-cyan-400 bg-cyan-400/10',
};

const CATEGORY_LABELS: Record<string, string> = {
  bounty_place: 'Bounty',
  bounty_claim: 'Klaim',
  prize: 'Hadiah',
  topup: 'Top Up',
  withdraw: 'Tarik',
  sawer: 'Sawer',
  donation: 'Donasi',
  transfer: 'Transfer',
};

function getAccent(division: 'male' | 'female') {
  return division === 'male'
    ? {
        text: 'text-[#73FF00]',
        bg: 'bg-[#73FF00]',
        glowRGB: '115,255,0',
        gradient: 'from-[#73FF00] via-[#8CFF33] to-[#5FD400]',
        ring: 'ring-[#73FF00]/30',
      }
    : {
        text: 'text-[#38BDF8]',
        bg: 'bg-[#38BDF8]',
        glowRGB: '56,189,248',
        gradient: 'from-[#38BDF8] via-[#7DD3FC] to-[#0EA5E9]',
        ring: 'ring-[#38BDF8]/30',
      };
}

// Animated counter hook
function useAnimatedCounter(target: number, duration = 800) {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = Date.now();
    let rafId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + diff * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        prevTarget.current = target;
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return current;
}

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════

export function WalletTab({ division, currentUserId }: WalletTabProps) {
  const accent = getAccent(division);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // Top Up form
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDesc, setTopupDesc] = useState('');
  const [isToppingUp, setIsToppingUp] = useState(false);

  // Transfer form
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [searchUsers, setSearchUsers] = useState<SearchedUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);

  const animatedBalance = useAnimatedCounter(wallet?.balance ?? 0);

  const fetchWallet = useCallback(async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/wallet?userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWallet(data.wallet);
          setTransactions(data.transactions || []);
        }
      }
    } catch { /* silent */ }
    setIsLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await fetchWallet();
      if (!cancelled) setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [fetchWallet]);

  // Search users for transfer
  useEffect(() => {
    if (!userSearch.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?gender=${division}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.users) {
            const q = userSearch.toLowerCase();
            const filtered = data.users
              .filter((u: { id: string; name: string; gender: string }) =>
                u.id !== currentUserId &&
                u.name.toLowerCase().includes(q)
              )
              .slice(0, 8)
              .map((u: { id: string; name: string; avatar: string | null; eloRating: number; eloTier: string }) => ({
                id: u.id,
                name: u.name,
                avatar: u.avatar,
                eloRating: u.eloRating || 0,
                eloTier: u.eloTier || 'Bronze',
              }));
            setSearchUsers(filtered);
          }
        }
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, division, currentUserId]);

  const handleTopUp = async () => {
    if (!currentUserId || !topupAmount || Number(topupAmount) <= 0) return;
    setIsToppingUp(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          amount: Number(topupAmount),
          category: 'topup',
          description: topupDesc || `Top up ${topupAmount} poin`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowTopUp(false);
        setTopupAmount('');
        setTopupDesc('');
        await fetchWallet();
      }
    } catch { /* silent */ }
    setIsToppingUp(false);
  };

  const handleTransfer = async () => {
    if (!currentUserId || !transferTarget || !transferAmount || Number(transferAmount) <= 0) return;
    setIsTransferring(true);
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: transferTarget,
          amount: Number(transferAmount),
          reason: transferReason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowTransfer(false);
        setTransferTarget('');
        setTransferAmount('');
        setTransferReason('');
        setUserSearch('');
        setSelectedUser(null);
        setSearchUsers([]);
        await fetchWallet();
      }
    } catch { /* silent */ }
    setIsTransferring(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHr < 24) return `${diffHr} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse h-48 bg-white/5 rounded-2xl" />
        <div className="animate-pulse h-16 bg-white/5 rounded-2xl" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse h-16 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  // ── No user state ──
  if (!currentUserId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <WalletIcon className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/40 font-medium">Wallet belum tersedia</p>
        <p className="text-xs text-white/25 mt-1">Login untuk mengakses wallet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* ═══════════════════════════════════════
          Balance Card — Glassmorphism with accent glow
          ═══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, rgba(${accent.glowRGB},0.12) 0%, rgba(${accent.glowRGB},0.04) 50%, rgba(20,20,25,0.95) 100%)`,
          border: `1px solid rgba(${accent.glowRGB},0.15)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(${accent.glowRGB},0.15) 0%, transparent 70%)` }}
        />

        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='rgba(255,255,255,0.5)'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10">
          {/* Label */}
          <div className="flex items-center gap-2 mb-3">
            <WalletIcon className={`w-4 h-4 ${accent.text}`} />
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Saldo Anda</span>
          </div>

          {/* Balance */}
          <div className="flex items-end gap-3">
            <p
              className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight"
              style={{
                background: `linear-gradient(135deg, #${accent.glowRGB.replace(/,/g, '') === '115,255,0' ? '73FF00' : '38BDF8'} 0%, rgba(255,255,255,0.9) 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {animatedBalance.toLocaleString()}
            </p>
            <span className="text-sm font-semibold text-white/40 mb-1.5">poin</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-white/40">Masuk</span>
              <span className="text-xs font-bold text-green-400">{wallet?.totalIn.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-white/40">Keluar</span>
              <span className="text-xs font-bold text-red-400">{wallet?.totalOut.toLocaleString() ?? 0}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════
          Quick Actions Row
          ═══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-3 gap-3"
      >
        <button
          onClick={() => setShowTopUp(true)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.text}`} style={{ background: `rgba(${accent.glowRGB},0.10)` }}>
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white/60">Top Up</span>
        </button>

        <button
          onClick={() => setShowTransfer(true)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.text}`} style={{ background: `rgba(${accent.glowRGB},0.10)` }}>
            <Send className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white/60">Transfer</span>
        </button>

        <button
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.text}`} style={{ background: `rgba(${accent.glowRGB},0.10)` }}>
            <History className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white/60">Riwayat</span>
        </button>
      </motion.div>

      {/* ═══════════════════════════════════════
          Recent Transactions
          ═══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/30" />
            Transaksi Terakhir
          </h3>
          {transactions.length > 5 && (
            <button className="text-[11px] font-semibold text-white/30 flex items-center gap-1 hover:text-white/50 transition-colors">
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
            <WalletIcon className="w-10 h-10 mx-auto mb-3 text-white/10" />
            <p className="text-sm font-medium text-white/30">Belum ada transaksi</p>
            <p className="text-xs text-white/20 mt-1">Top up untuk mulai bertransaksi</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: `rgba(${accent.glowRGB},0.12) transparent` }}>
            {transactions.map((tx, idx) => {
              const IconComp = CATEGORY_ICONS[tx.category] || WalletIcon;
              const colorClass = CATEGORY_COLORS[tx.category] || 'text-white/50 bg-white/5';
              const isCredit = tx.type === 'credit';
              const [textColor, bgColor] = colorClass.split(' ');

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                >
                  {/* Category Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                    <IconComp className={`w-4.5 h-4.5 ${textColor}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white/90 truncate">
                        {tx.description || CATEGORY_LABELS[tx.category] || tx.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          background: bgColor,
                          color: 'inherit',
                        }}
                      >
                        {CATEGORY_LABELS[tx.category] || tx.category}
                      </span>
                      <span className="text-[11px] text-white/25">{formatTime(tx.createdAt)}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                      {isCredit ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-white/25">poin</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════
          Top Up Modal
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showTopUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTopUp(false)}
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
                    <Plus className={`w-5 h-5 ${accent.text}`} />
                    Top Up Saldo
                  </h3>
                  <button onClick={() => setShowTopUp(false)} className="text-white/30 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">Tambah poin ke wallet Anda</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Quick amounts */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-2 block">Pilih Nominal</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[100, 500, 1000, 2500, 5000, 10000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setTopupAmount(String(amount))}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                          topupAmount === String(amount)
                            ? `bg-gradient-to-r ${accent.gradient} text-black`
                            : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Atau Masukkan Jumlah</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="1"
                    value={topupAmount}
                    onChange={e => setTopupAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Catatan (opsional)</label>
                  <input
                    type="text"
                    placeholder="Top up saldo..."
                    value={topupDesc}
                    onChange={e => setTopupDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <button
                  onClick={handleTopUp}
                  disabled={!topupAmount || Number(topupAmount) <= 0 || isToppingUp}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    division === 'male'
                      ? 'bg-[#73FF00] text-black hover:bg-[#5FD400]'
                      : 'bg-[#38BDF8] text-black hover:bg-[#0EA5E9]'
                  }`}
                >
                  {isToppingUp ? (
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Top Up {topupAmount ? Number(topupAmount).toLocaleString() : ''} Poin
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          Transfer Modal
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showTransfer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowTransfer(false);
              setSelectedUser(null);
              setUserSearch('');
              setSearchUsers([]);
            }}
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
                    <Send className={`w-5 h-5 ${accent.text}`} />
                    Transfer Poin
                  </h3>
                  <button
                    onClick={() => {
                      setShowTransfer(false);
                      setSelectedUser(null);
                      setUserSearch('');
                      setSearchUsers([]);
                    }}
                    className="text-white/30 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">Kirim poin ke pemain lain</p>
                {wallet && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30">
                    <span>Saldo:</span>
                    <span className={`font-bold ${accent.text}`}>{wallet.balance.toLocaleString()}</span>
                    <span>poin</span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Search user */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Penerima</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      placeholder="Cari pemain..."
                      value={selectedUser ? selectedUser.name : userSearch}
                      onChange={e => {
                        setUserSearch(e.target.value);
                        setSelectedUser(null);
                        setTransferTarget('');
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                    />
                    {selectedUser && (
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setTransferTarget('');
                          setUserSearch('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Search results */}
                  {!selectedUser && searchUsers.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1 bg-black/30 rounded-xl p-2 border border-white/5">
                      {searchUsers.map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setTransferTarget(u.id);
                            setUserSearch('');
                            setSearchUsers([]);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden">
                            {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{u.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Selected user chip */}
                  {selectedUser && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden">
                        {selectedUser.avatar ? <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover" /> : selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-white">{selectedUser.name}</span>
                      <span className={`text-[10px] font-semibold ${accent.text}`}>✓</span>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Jumlah</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="1"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Pesan (opsional)</label>
                  <input
                    type="text"
                    placeholder="Untuk hadiah..."
                    value={transferReason}
                    onChange={e => setTransferReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <button
                  onClick={handleTransfer}
                  disabled={!transferTarget || !transferAmount || Number(transferAmount) <= 0 || isTransferring}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    division === 'male'
                      ? 'bg-[#73FF00] text-black hover:bg-[#5FD400]'
                      : 'bg-[#38BDF8] text-black hover:bg-[#0EA5E9]'
                  }`}
                >
                  {isTransferring ? (
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Transfer {transferAmount ? Number(transferAmount).toLocaleString() : ''} Poin
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
