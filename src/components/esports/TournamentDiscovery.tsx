'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Trophy, Users, Calendar, MapPin, Swords, ChevronRight, Clock, Star, Flame, Crown, Zap, X, Gamepad2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// BOUNTIE-STYLE TOURNAMENT DISCOVERY
// ═══════════════════════════════════════════════════════════════════════

interface TournamentItem {
  id: string;
  name: string;
  division: string;
  type: string;
  status: string;
  week: number | null;
  bracketType: string | null;
  prizePool: number;
  prizeChampion: number;
  prizeRunnerUp: number;
  prizeThird: number;
  prizeMvp: number;
  mode: string;
  bpm: string;
  lokasi: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count: { registrations: number; teams: number; matches: number };
  registrations: Array<{ user: { name: string; avatar: string | null } }>;
  championName: string | null;
}

interface TournamentDiscoveryProps {
  division: 'male' | 'female';
  onTournamentSelect?: (tournamentId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  setup: { label: 'Segera', color: 'text-white/50', icon: Clock, bg: 'bg-white/10' },
  registration: { label: 'Daftar', color: 'text-green-400', icon: Users, bg: 'bg-green-500/20' },
  team_gen: { label: 'Tim Dibuat', color: 'text-blue-400', icon: Swords, bg: 'bg-blue-500/20' },
  bracket: { label: 'Bracket', color: 'text-purple-400', icon: Zap, bg: 'bg-purple-500/20' },
  ongoing: { label: 'Live', color: 'text-red-400', icon: Flame, bg: 'bg-red-500/20' },
  completed: { label: 'Selesai', color: 'text-amber-400', icon: Trophy, bg: 'bg-amber-500/20' },
};

const BRACKET_LABELS: Record<string, string> = {
  single_elim: 'Single Elimination',
  double_elim: 'Double Elimination',
  round_robin: 'Round Robin',
  swiss: 'Swiss System',
  group: 'Group Stage',
};

export function TournamentDiscovery({ division, onTournamentSelect }: TournamentDiscoveryProps) {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterBracket, setFilterBracket] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchTournaments = useCallback(async (reset = true) => {
    try {
      const params = new URLSearchParams({
        division,
        sort: sortBy,
        limit: '20',
        offset: reset ? '0' : String(offset),
      });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterBracket) params.set('bracketType', filterBracket);

      const res = await fetch(`/api/tournaments/discover?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (reset) {
            setTournaments(data.tournaments);
          } else {
            setTournaments(prev => [...prev, ...data.tournaments]);
          }
          setTotal(data.total);
          setHasMore(data.hasMore);
        }
      }
    } catch { /* silent */ }
  }, [division, search, filterStatus, filterBracket, sortBy, offset]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setOffset(0);
      const params = new URLSearchParams({
        division,
        sort: sortBy,
        limit: '20',
        offset: '0',
      });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterBracket) params.set('bracketType', filterBracket);

      try {
        const res = await fetch(`/api/tournaments/discover?${params}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.success) {
            setTournaments(data.tournaments);
            setTotal(data.total);
            setHasMore(data.hasMore);
          }
        }
      } catch { /* silent */ }
    };
    load();
    return () => { cancelled = true; };
  }, [division, search, filterStatus, filterBracket, sortBy]);

  const loadMore = () => {
    const newOffset = offset + 20;
    setOffset(newOffset);
    fetchTournaments(false);
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse h-40 bg-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  const activeTournaments = tournaments.filter(t => t.status === 'ongoing' || t.status === 'registration');
  const upcomingTournaments = tournaments.filter(t => t.status === 'setup' || t.status === 'team_gen' || t.status === 'bracket');
  const pastTournaments = tournaments.filter(t => t.status === 'completed');

  return (
    <div className="space-y-4 pb-24">
      {/* ── Search Bar ── */}
      <div className="px-4 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Cari turnamen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 rounded-xl border transition-colors ${showFilters ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-white/5 border-white/10 text-white/50'}`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* ── Filter Panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4"
          >
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              {/* Status filter */}
              <div>
                <p className="text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-wider">Status</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterStatus('')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${!filterStatus ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-white/5 text-white/40 border border-white/10'}`}
                  >
                    Semua
                  </button>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setFilterStatus(key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterStatus === key ? `${cfg.bg} ${cfg.color} border border-current/30` : 'bg-white/5 text-white/40 border border-white/10'}`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bracket type filter */}
              <div>
                <p className="text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-wider">Format</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterBracket('')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${!filterBracket ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-white/5 text-white/40 border border-white/10'}`}
                  >
                    Semua
                  </button>
                  {Object.entries(BRACKET_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setFilterBracket(key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterBracket === key ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-white/5 text-white/40 border border-white/10'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <p className="text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-wider">Urutkan</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'newest', label: 'Terbaru' },
                    { key: 'oldest', label: 'Terlama' },
                    { key: 'prize_high', label: 'Hadiah ↓' },
                    { key: 'prize_low', label: 'Hadiah ↑' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${sortBy === s.key ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-white/5 text-white/40 border border-white/10'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Total count ── */}
      <div className="px-4">
        <p className="text-xs text-white/30">{total} turnamen ditemukan</p>
      </div>

      {/* ── Active Tournaments (Live) ── */}
      {activeTournaments.length > 0 && (
        <div className="px-4">
          <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            Turnamen Aktif
          </h3>
          <div className="space-y-3">
            {activeTournaments.map((t, idx) => (
              <TournamentCard key={t.id} tournament={t} onSelect={onTournamentSelect} featured={idx === 0} />
            ))}
          </div>
        </div>
      )}

      {/* ── Upcoming ── */}
      {upcomingTournaments.length > 0 && (
        <div className="px-4">
          <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Akan Datang
          </h3>
          <div className="space-y-3">
            {upcomingTournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} onSelect={onTournamentSelect} />
            ))}
          </div>
        </div>
      )}

      {/* ── Past Tournaments ── */}
      {pastTournaments.length > 0 && (
        <div className="px-4">
          <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Turnamen Selesai
          </h3>
          <div className="space-y-3">
            {pastTournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} onSelect={onTournamentSelect} />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {tournaments.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <Gamepad2 className="w-14 h-14 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada turnamen</p>
          <p className="text-xs mt-1">Turnamen baru akan muncul di sini</p>
        </div>
      )}

      {/* ── Load More ── */}
      {hasMore && (
        <div className="px-4 text-center">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Muat lebih banyak
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tournament Card Component ──
function TournamentCard({ tournament, onSelect, featured = false }: {
  tournament: TournamentItem;
  onSelect?: (id: string) => void;
  featured?: boolean;
}) {
  const statusCfg = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.setup;
  const StatusIcon = statusCfg.icon;
  const divisionAccent = tournament.division === 'male' ? '#73FF00' : '#38BDF8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border transition-all hover:scale-[1.01] cursor-pointer ${
        featured
          ? 'bg-gradient-to-br from-white/8 to-white/3 border-white/15'
          : 'bg-white/5 border-white/10'
      }`}
      onClick={() => onSelect?.(tournament.id)}
    >
      {/* Division accent line */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${divisionAccent}, transparent)` }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm truncate">{tournament.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
              {tournament.bracketType && (
                <span className="text-[11px] text-white/30">{BRACKET_LABELS[tournament.bracketType] || tournament.bracketType}</span>
              )}
            </div>
          </div>
          <div className="text-right ml-3">
            <p className="text-xs text-white/30">Hadiah</p>
            <p className="text-lg font-black" style={{ color: divisionAccent }}>
              {tournament.prizePool > 0 ? `Rp${tournament.prizePool.toLocaleString()}` : '—'}
            </p>
          </div>
        </div>

        {/* Info tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {tournament.mode && (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/40 bg-white/5 px-2 py-1 rounded-md">
              <Swords className="w-3 h-3" /> {tournament.mode}
            </span>
          )}
          {tournament.lokasi && (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/40 bg-white/5 px-2 py-1 rounded-md">
              <MapPin className="w-3 h-3" /> {tournament.lokasi}
            </span>
          )}
          {tournament.bpm && (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/40 bg-white/5 px-2 py-1 rounded-md">
              <Zap className="w-3 h-3" /> {tournament.bpm} BPM
            </span>
          )}
          {tournament.week && (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/40 bg-white/5 px-2 py-1 rounded-md">
              <Calendar className="w-3 h-3" /> Week {tournament.week}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] text-white/30">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tournament._count.registrations} pemain</span>
            <span className="flex items-center gap-1"><Swords className="w-3 h-3" /> {tournament._count.teams} tim</span>
          </div>

          {/* Champion */}
          {tournament.championName && (
            <div className="flex items-center gap-1 text-[11px] text-amber-400">
              <Crown className="w-3 h-3" />
              <span className="font-medium">{tournament.championName}</span>
            </div>
          )}
        </div>

        {/* Registered players avatars */}
        {tournament.registrations.length > 0 && (
          <div className="flex items-center mt-3 -space-x-2">
            {tournament.registrations.slice(0, 5).map((r, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold border-2 border-[#1a1c22] overflow-hidden">
                {r.user.avatar ? <img src={r.user.avatar} alt="" className="w-full h-full object-cover" /> : r.user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {tournament._count.registrations > 5 && (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold border-2 border-[#1a1c22] text-white/40">
                +{tournament._count.registrations - 5}
              </div>
            )}
          </div>
        )}
      </div>

      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
    </motion.div>
  );
}
