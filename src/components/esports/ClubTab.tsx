'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Trophy,
  Plus,
  Search,
  X,
  ChevronRight,
  Crown,
  Shield,
  Star,
  MessageSquare,
  Zap,
  ArrowLeft,
  UserPlus,
  LogOut,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// BOUNTIE-STYLE CLUB/COMMUNITY TAB — Dark glassmorphism, Indonesian labels
// ═══════════════════════════════════════════════════════════════════════

interface ClubTabProps {
  division: 'male' | 'female';
  currentUserId?: string | null;
  onPlayerClick?: (playerId: string) => void;
}

interface ClubInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  totalPoints: number;
  memberCount: number;
  rank: number;
  topMembers?: Array<{
    id: string;
    name: string;
    avatar: string | null;
    tier: string;
    points: number;
  }>;
}

interface ClubMember {
  id: string;
  name: string;
  avatar: string | null;
  tier: string;
  points: number;
  gender?: string;
  wins: number;
  losses: number;
}

interface ClubDetail extends ClubInfo {
  members: ClubMember[];
}

function getAccent(division: 'male' | 'female') {
  return division === 'male'
    ? {
        text: 'text-[#73FF00]',
        bg: 'bg-[#73FF00]',
        glowRGB: '115,255,0',
        gradient: 'from-[#73FF00] via-[#8CFF33] to-[#5FD400]',
        ring: 'ring-[#73FF00]/30',
        color: '#73FF00',
      }
    : {
        text: 'text-[#38BDF8]',
        bg: 'bg-[#38BDF8]',
        glowRGB: '56,189,248',
        gradient: 'from-[#38BDF8] via-[#7DD3FC] to-[#0EA5E9]',
        ring: 'ring-[#38BDF8]/30',
        color: '#38BDF8',
      };
}

const TIER_COLORS: Record<string, string> = {
  S: '#FFD700',
  A: '#C0C0C0',
  B: '#CD7F32',
  C: '#8FBC8F',
  D: '#94A3B8',
};

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════

export function ClubTab({ division, currentUserId, onPlayerClick }: ClubTabProps) {
  const accent = getAccent(division);
  const [clubs, setClubs] = useState<ClubInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState<ClubDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinClubId, setJoinClubId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState('');

  // Create club form
  const [newClubName, setNewClubName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // My club state
  const [myClub, setMyClub] = useState<ClubInfo | null>(null);

  // Fetch clubs
  const fetchClubs = useCallback(async () => {
    try {
      const genderParam = division === 'male' ? 'male' : 'female';
      const res = await fetch(`/api/clubs?gender=${genderParam}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.clubs) {
          setClubs(data.clubs);
        }
      }
    } catch { /* silent */ }
    setIsLoading(false);
  }, [division]);

  // Fetch my club info
  const fetchMyClub = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/users/profile?userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile?.club) {
          setMyClub({
            id: data.profile.club.id,
            name: data.profile.club.name,
            slug: data.profile.club.name.toLowerCase().replace(/\s+/g, '-'),
            logoUrl: data.profile.club.logoUrl,
            totalPoints: 0,
            memberCount: 0,
            rank: 0,
          });
        }
      }
    } catch { /* silent */ }
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await Promise.all([fetchClubs(), fetchMyClub()]);
      if (!cancelled) setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [fetchClubs, fetchMyClub]);

  // Fetch club detail
  const fetchClubDetail = useCallback(async (slug: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/clubs?slug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.club) {
          setSelectedClub(data.club);
        }
      }
    } catch { /* silent */ }
    setIsLoadingDetail(false);
  }, []);

  // Handle create club
  const handleCreateClub = async () => {
    if (!newClubName.trim() || newClubName.trim().length < 2) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClubName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewClubName('');
        await fetchClubs();
      }
    } catch { /* silent */ }
    setIsCreating(false);
  };

  // Handle join club
  const handleJoinClub = async () => {
    if (!currentUserId || !joinClubId) return;
    setIsJoining(true);
    try {
      const res = await fetch('/api/clubs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          clubId: joinClubId,
          message: joinMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowJoinModal(false);
        setJoinClubId(null);
        setJoinMessage('');
      }
    } catch { /* silent */ }
    setIsJoining(false);
  };

  // Filter clubs
  const filteredClubs = searchQuery.trim()
    ? clubs.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : clubs;

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse h-48 bg-white/5 rounded-2xl" />
        <div className="animate-pulse h-16 bg-white/5 rounded-2xl" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse h-20 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* ═══════════════════════════════════════
          Header
          ═══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: `linear-gradient(135deg, rgba(${accent.glowRGB},0.12) 0%, rgba(${accent.glowRGB},0.04) 50%, rgba(20,20,25,0.95) 100%)`,
          border: `1px solid rgba(${accent.glowRGB},0.15)`,
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(${accent.glowRGB},0.15) 0%, transparent 70%)` }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `rgba(${accent.glowRGB},0.15)`, border: `1px solid rgba(${accent.glowRGB},0.25)` }}
            >
              <Building2 className={`w-6 h-6 ${accent.text}`} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white/90 tracking-tight">Komunitas</h2>
              <p className="text-[13px] text-white/40 font-medium mt-0.5">
                {clubs.length} club terdaftar
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
            style={{
              background: `linear-gradient(135deg, ${accent.color}, rgba(${accent.glowRGB},0.8))`,
              color: division === 'male' ? '#000' : '#fff',
              boxShadow: `0 4px 16px rgba(${accent.glowRGB},0.25)`,
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Buat Club</span>
          </button>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════
          My Club Card
          ═══════════════════════════════════════ */}
      {myClub && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl p-4 cursor-pointer"
          style={{
            background: `linear-gradient(135deg, rgba(${accent.glowRGB},0.08) 0%, rgba(20,20,25,0.9) 100%)`,
            border: `1px solid rgba(${accent.glowRGB},0.2)`,
          }}
          onClick={() => fetchClubDetail(myClub.slug)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: `rgba(${accent.glowRGB},0.12)`, border: `1px solid rgba(${accent.glowRGB},0.2)` }}
            >
              {myClub.logoUrl ? (
                <img src={myClub.logoUrl} alt={myClub.name} className="w-full h-full object-cover" />
              ) : (
                <Crown className={`w-6 h-6 ${accent.text}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-white/90 truncate">{myClub.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${accent.text}`} style={{ background: `rgba(${accent.glowRGB},0.12)`, border: `1px solid rgba(${accent.glowRGB},0.2)` }}>
                  Club Saya
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">Ketuk untuk melihat detail</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20 flex-shrink-0" />
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════
          Search Bar
          ═══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <Search className={`w-4 h-4 ${accent.text} opacity-50 flex-shrink-0`} />
          <input
            type="text"
            placeholder="Cari club..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-white/40 font-medium w-full tracking-tight"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] font-semibold text-white/30 px-2 py-1 rounded-lg bg-white/[0.06] flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════
          Club Leaderboard
          ═══════════════════════════════════════ */}
      {filteredClubs.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h3 className="text-sm font-bold text-white/60 mb-3 flex items-center gap-2 px-1">
            <Trophy className="w-4 h-4" />
            Peringkat Club
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: `rgba(${accent.glowRGB},0.12) transparent` }}>
            {filteredClubs.map((club, idx) => (
              <ClubRow
                key={club.id}
                club={club}
                division={division}
                index={idx}
                isMyClub={myClub?.id === club.id}
                onClick={() => fetchClubDetail(club.slug)}
                onJoinClick={(clubId) => {
                  setJoinClubId(clubId);
                  setShowJoinModal(true);
                }}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-12 text-center bg-white/[0.02] rounded-2xl border border-white/[0.05]"
        >
          <Building2 className={`w-10 h-10 mx-auto mb-3 ${accent.text} opacity-20`} />
          <p className="text-sm font-medium text-white/35">
            {searchQuery ? `Tidak ada club "${searchQuery}"` : 'Belum ada club terdaftar'}
          </p>
          <p className="text-xs text-white/25 mt-1">
            {searchQuery ? 'Coba kata kunci lain' : 'Jadilah yang pertama membuat club!'}
          </p>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════
          Club Detail Panel
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {selectedClub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedClub(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-[#1a1c22] border border-white/10 rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Club header */}
              <div
                className="relative p-5 border-b border-white/10"
                style={{
                  background: `linear-gradient(180deg, rgba(${accent.glowRGB},0.1) 0%, transparent 100%)`,
                }}
              >
                <button
                  onClick={() => setSelectedClub(null)}
                  className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ background: `rgba(${accent.glowRGB},0.12)`, border: `1px solid rgba(${accent.glowRGB},0.25)` }}
                  >
                    {selectedClub.logoUrl ? (
                      <img src={selectedClub.logoUrl} alt={selectedClub.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className={`w-7 h-7 ${accent.text}`} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedClub.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {selectedClub.memberCount} anggota
                      </span>
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> {selectedClub.totalPoints.toLocaleString()} poin
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Members list */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingDetail ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse h-14 bg-white/5 rounded-xl mb-2" />
                  ))
                ) : selectedClub.members && selectedClub.members.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Anggota Club</h4>
                    {selectedClub.members.map((member, idx) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        onClick={() => {
                          onPlayerClick?.(member.id);
                          setSelectedClub(null);
                        }}
                      >
                        {/* Rank */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                          idx < 3
                            ? idx === 0
                              ? `bg-gradient-to-br ${division === 'male' ? 'from-[#73FF00] to-[#5FD400] text-black' : 'from-[#38BDF8] to-[#0EA5E9] text-white'}`
                              : idx === 1
                                ? 'from-gray-200 to-gray-400 text-gray-800 bg-gradient-to-br'
                                : 'from-orange-300 to-orange-500 text-orange-950 bg-gradient-to-br'
                            : 'bg-white/[0.06] text-white/40'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="text-xs font-bold text-white/70">{member.name.charAt(0)}</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white/90 truncate">{member.name}</p>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: `${TIER_COLORS[member.tier] || '#666'}20`,
                                color: TIER_COLORS[member.tier] || '#999',
                              }}
                            >
                              {member.tier}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/35">{member.wins}W</span>
                            <span className="text-[10px] text-white/35">{member.losses}L</span>
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold tabular-nums" style={{ color: accent.color }}>
                            {member.points.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-white/25">poin</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 mx-auto mb-2 text-white/10" />
                    <p className="text-sm text-white/30">Belum ada anggota</p>
                  </div>
                )}
              </div>

              {/* Join button */}
              {currentUserId && myClub?.id !== selectedClub.id && (
                <div className="p-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      setShowJoinModal(true);
                      setJoinClubId(selectedClub.id);
                    }}
                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${accent.color}, rgba(${accent.glowRGB},0.8))`,
                      color: division === 'male' ? '#000' : '#fff',
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                    Gabung Club
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          Create Club Modal
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
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
                    Buat Club Baru
                  </h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-white/30 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">Buat komunitas untuk bermain bersama</p>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Nama Club</label>
                  <input
                    type="text"
                    placeholder="Masukkan nama club..."
                    value={newClubName}
                    onChange={e => setNewClubName(e.target.value)}
                    maxLength={30}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                  <p className="text-[10px] text-white/25 mt-1">Minimal 2 karakter, maksimal 30 karakter</p>
                </div>

                <button
                  onClick={handleCreateClub}
                  disabled={!newClubName.trim() || newClubName.trim().length < 2 || isCreating}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    division === 'male'
                      ? 'bg-[#73FF00] text-black hover:bg-[#5FD400]'
                      : 'bg-[#38BDF8] text-black hover:bg-[#0EA5E9]'
                  }`}
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      Buat Club
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          Join Club Modal
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showJoinModal && joinClubId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowJoinModal(false);
              setJoinClubId(null);
              setJoinMessage('');
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
                    <UserPlus className={`w-5 h-5 ${accent.text}`} />
                    Gabung Club
                  </h3>
                  <button
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinClubId(null);
                      setJoinMessage('');
                    }}
                    className="text-white/30 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">Kirim permintaan untuk bergabung</p>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-1.5 block">Pesan (opsional)</label>
                  <textarea
                    placeholder="Perkenalkan diri Anda..."
                    value={joinMessage}
                    onChange={e => setJoinMessage(e.target.value)}
                    maxLength={200}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={handleJoinClub}
                  disabled={isJoining}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    division === 'male'
                      ? 'bg-[#73FF00] text-black hover:bg-[#5FD400]'
                      : 'bg-[#38BDF8] text-black hover:bg-[#0EA5E9]'
                  }`}
                >
                  {isJoining ? (
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Kirim Permintaan
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          No User State
          ═══════════════════════════════════════ */}
      {!currentUserId && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="p-4 rounded-xl text-center"
          style={{
            background: `rgba(${accent.glowRGB},0.05)`,
            border: `1px solid rgba(${accent.glowRGB},0.15)`,
          }}
        >
          <Users className="w-8 h-8 mx-auto mb-2 text-white/20" />
          <p className="text-white/50 text-sm font-medium">Login untuk bergabung club</p>
          <p className="text-white/30 text-xs mt-1">Buat atau gabung komunitas pemain</p>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Club Row Component
   ═══════════════════════════════════════════════════════════════════════ */

function ClubRow({
  club,
  division,
  index,
  isMyClub,
  onClick,
  onJoinClick,
  currentUserId,
}: {
  club: ClubInfo;
  division: 'male' | 'female';
  index: number;
  isMyClub: boolean;
  onClick: () => void;
  onJoinClick: (clubId: string) => void;
  currentUserId?: string | null;
}) {
  const accent = getAccent(division);
  const rank = club.rank || index + 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={`flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border hover:bg-white/[0.06] transition-colors cursor-pointer ${
        isMyClub
          ? division === 'male'
            ? '!border-[#73FF00]/20 !bg-[#73FF00]/[0.05]'
            : '!border-[#38BDF8]/20 !bg-[#38BDF8]/[0.05]'
          : 'border-white/[0.05]'
      }`}
      onClick={onClick}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
    >
      {/* Rank */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        rank <= 3
          ? `bg-gradient-to-br ${
              rank === 1
                ? division === 'male'
                  ? 'from-[#73FF00] to-[#5FD400] text-black'
                  : 'from-[#38BDF8] to-[#0EA5E9] text-white'
                : rank === 2
                  ? 'from-gray-200 to-gray-400 text-gray-800'
                  : 'from-orange-300 to-orange-500 text-orange-950'
            }`
          : 'bg-white/[0.06] text-white/40'
      }`}>
        {rank}
      </div>

      {/* Logo */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ background: `rgba(${accent.glowRGB},0.08)`, border: `1px solid rgba(${accent.glowRGB},0.15)` }}
      >
        {club.logoUrl ? (
          <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-5 h-5 text-white/30" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white/90 truncate">{club.name}</p>
          {isMyClub && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${accent.text}`} style={{ background: `rgba(${accent.glowRGB},0.12)` }}>
              Saya
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-white/35 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {club.memberCount}
          </span>
          <span className="text-[11px] text-white/35">•</span>
          <span className="text-[11px] text-white/35">{club.totalPoints.toLocaleString()} pts</span>
        </div>
      </div>

      {/* Points & Action */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums" style={{ color: accent.color }}>
            {club.totalPoints.toLocaleString()}
          </p>
          <p className="text-[9px] text-white/25">poin</p>
        </div>
        {!isMyClub && currentUserId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoinClick(club.id);
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-white/40" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
