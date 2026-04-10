'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeft,
  Trophy,
  TrendingUp,
  Shield,
  Star,
  Crown,
  MapPin,
  Building2,
  Gamepad2,
  Swords,
  Users,
  Award,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   MODULE-LEVEL STORE — Works without prop drilling
   ═══════════════════════════════════════════════════════════════ */

let _playerId: string | null = null;
let _gender: 'male' | 'female' = 'male';
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

export function openPlayerProfile(playerId: string, gender: 'male' | 'female') {
  _playerId = playerId;
  _gender = gender;
  _notify();
}

export function closePlayerProfile() {
  _playerId = null;
  _notify();
}

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface ProfileData {
  id: string;
  name: string;
  email: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  city: string | null;
  isMVP: boolean;
  mvpScore: number;
  club: { id: string; name: string; logoUrl: string | null } | null;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  recentMatches: Array<{
    id: string;
    tournamentName: string;
    result: string;
    score: string;
    date: string;
    opponentName: string;
    bracket: string;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  S: { label: 'S', color: '#FFD700', bg: 'rgba(255,215,0,0.15)' },
  A: { label: 'A', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  B: { label: 'B', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  C: { label: 'C', color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)' },
  D: { label: 'D', color: '#92400E', bg: 'rgba(146,64,14,0.15)' },
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function PlayerProfileModal() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to module-level store
  useEffect(() => {
    const handler = () => {
      setPlayerId(_playerId);
      setGender(_gender);
    };
    _listeners.add(handler);
    handler();
    return () => { _listeners.delete(handler); };
  }, []);

  // Fetch profile when playerId changes
  useEffect(() => {
    if (!playerId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/users/profile?userId=${playerId}`)
      .then((r) => {
        if (cancelled) return;
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.profile) {
          setProfile(json.profile);
        } else {
          setError('Pemain tidak ditemukan');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat profil');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [playerId]);

  // Clear profile when modal closes
  useEffect(() => {
    if (!playerId) {
      setProfile(null);
      setError(null);
      setLoading(false);
    }
  }, [playerId]);

  // Escape key handler
  useEffect(() => {
    if (!playerId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePlayerProfile();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playerId]);

  // Prevent body scroll when modal open
  useEffect(() => {
    if (playerId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [playerId]);

  const isMale = gender === 'male';
  const accent = isMale ? '#73FF00' : '#38BDF8';
  const accentRGB = isMale ? '115,255,0' : '56,189,248';
  const tier = TIER_CONFIG[profile?.tier || 'B'] || TIER_CONFIG.B;

  return (
    <AnimatePresence>
      {playerId && (
        <motion.div
          className="fixed inset-0 z-[300] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePlayerProfile}
          />

          {/* Content */}
          <motion.div
            ref={scrollRef}
            className="relative z-10 flex-1 overflow-y-auto"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="min-h-full flex items-start justify-center p-4 pt-8 sm:pt-16">
              <div
                className="w-full max-w-lg rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(20,20,24,0.98) 0%, rgba(10,10,14,0.99) 100%)',
                  border: `1px solid rgba(${accentRGB},0.15)`,
                  boxShadow: `0 0 60px rgba(${accentRGB},0.06), 0 20px 40px rgba(0,0,0,0.5)`,
                }}
              >
                {/* Top bar */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}
                >
                  <button
                    onClick={closePlayerProfile}
                    className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>
                  <button
                    onClick={closePlayerProfile}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {loading && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative w-10 h-10">
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: `2px solid transparent`,
                          borderTopColor: accent,
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                    <p className="mt-4 text-sm text-white/40">Memuat profil...</p>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                      <X className="w-7 h-7 text-red-400" />
                    </div>
                    <p className="text-sm text-red-400 font-medium">{error}</p>
                    <button
                      onClick={closePlayerProfile}
                      className="mt-4 px-4 py-2 rounded-xl text-xs font-medium bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                {profile && !loading && !error && (
                  <div>
                    {/* Header Section — Large Circular Avatar */}
                    <div className="relative flex flex-col items-center pt-8 pb-4 px-5">
                      {/* Accent glow behind avatar */}
                      <div
                        className="absolute top-4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
                        style={{ background: accent }}
                      />

                      {/* Avatar Container with double border */}
                      <div className="relative">
                        {/* Outer decorative ring */}
                        <div
                          className="absolute -inset-3 rounded-full"
                          style={{
                            border: `3px solid rgba(${accentRGB},0.30)`,
                            boxShadow: `0 0 24px rgba(${accentRGB},0.10)`,
                          }}
                        />
                        {/* Inner avatar circle */}
                        <div
                          className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-full flex items-center justify-center overflow-hidden"
                          style={{
                            background: profile.avatar
                              ? 'none'
                              : `linear-gradient(135deg, rgba(${accentRGB},0.25), rgba(${accentRGB},0.08))`,
                            border: `2.5px solid ${accent}`,
                            boxShadow: profile.isMVP
                              ? '0 0 24px rgba(255,215,0,0.20), 0 0 0 3px rgba(255,215,0,0.10)'
                              : `0 0 16px rgba(${accentRGB},0.12)`,
                          }}
                        >
                          {profile.avatar ? (
                            <img
                              src={profile.avatar}
                              alt={profile.name}
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <span
                            className={`text-6xl sm:text-7xl font-black ${profile.avatar ? 'hidden' : ''}`}
                            style={{ color: accent }}
                          >
                            {profile.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        {/* Tier badge on bottom-right of avatar */}
                        <div
                          className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black"
                          style={{
                            background: tier.bg,
                            border: `2.5px solid ${tier.color}`,
                            color: tier.color,
                            boxShadow: `0 2px 8px ${tier.color}33`,
                          }}
                        >
                          {tier.label}
                        </div>

                        {/* MVP Crown badge on top-right of avatar */}
                        {profile.isMVP && (
                          <div
                            className="absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                              boxShadow: '0 2px 12px rgba(255,215,0,0.35)',
                            }}
                          >
                            <Crown className="w-5 h-5 text-black" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>

                      {/* Player Name — below avatar */}
                      <div className="mt-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <h2 className="text-xl font-black text-white">
                            {profile.name}
                          </h2>
                          {profile.isMVP && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                background: 'rgba(255,215,0,0.20)',
                                color: '#FFD700',
                                border: '1px solid rgba(255,215,0,0.30)',
                              }}
                            >
                              MVP
                            </span>
                          )}
                        </div>
                        {/* Division + Gender + City row */}
                        <div className="flex items-center justify-center gap-2 mt-1.5">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: accent,
                              background: `rgba(${accentRGB},0.12)`,
                              border: `1px solid rgba(${accentRGB},0.20)`,
                            }}
                          >
                            {profile.gender === 'male' ? '♂ Male' : '♀ Female'}
                          </span>
                          {profile.city && (
                            <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {profile.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Player Information Section */}
                    <div className="mx-5 mb-4">
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
                        style={{
                          background: `rgba(${accentRGB},0.08)`,
                          borderBottom: `1px solid rgba(${accentRGB},0.15)`,
                        }}
                      >
                        <Users className="w-3.5 h-3.5" style={{ color: accent }} />
                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: accent }}>
                          Player Information
                        </span>
                      </div>
                      <div
                        className="rounded-b-xl overflow-hidden"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderTop: 'none',
                        }}
                      >
                        {/* Tier */}
                        <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span className="text-[11px] text-white/40">Tier</span>
                          <span className="text-[11px] font-bold" style={{ color: tier.color }}>
                            {tier.label}
                          </span>
                        </div>
                        {/* Club */}
                        <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span className="text-[11px] text-white/40">Club</span>
                          <div className="flex items-center gap-1.5">
                            {profile.club ? (
                              <>
                                {profile.club.logoUrl ? (
                                  <img src={profile.club.logoUrl} alt="" className="w-4 h-4 rounded object-cover" />
                                ) : (
                                  <Building2 className="w-3.5 h-3.5 text-white/30" />
                                )}
                                <span className="text-[11px] font-semibold text-white/70">{profile.club.name}</span>
                              </>
                            ) : (
                              <span className="text-[11px] text-white/25">—</span>
                            )}
                          </div>
                        </div>
                        {/* Status */}
                        <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span className="text-[11px] text-white/40">Status</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-emerald-400 font-medium">Active</span>
                          </div>
                        </div>
                        {/* Gender */}
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <span className="text-[11px] text-white/40">Division</span>
                          <span className="text-[11px] font-semibold" style={{ color: accent }}>
                            {profile.gender === 'male' ? 'Putra' : 'Putri'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Section */}
                    <div
                      className="mx-5 p-4 rounded-2xl mb-4"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <p className="text-[10px] font-bold tracking-wider uppercase text-white/30 mb-3">
                        Statistik
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div
                            className="text-xl font-black"
                            style={{
                              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            {profile.points.toLocaleString()}
                          </div>
                          <p className="text-[10px] text-white/30 mt-0.5">Points</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-black text-emerald-400">
                            {(profile as any).stats?.wins ?? 0}
                          </div>
                          <p className="text-[10px] text-white/30 mt-0.5">Menang</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-black text-red-400">
                            {(profile as any).stats?.losses ?? 0}
                          </div>
                          <p className="text-[10px] text-white/30 mt-0.5">Kalah</p>
                        </div>
                      </div>
                      {((profile as any).stats?.totalMatches ?? 0) > 0 && (
                        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white/40">Total Pertandingan</span>
                            <span className="text-white/60 font-semibold">{(profile as any).stats?.totalMatches ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] mt-1.5">
                            <span className="text-white/40">Win Rate</span>
                            <span
                              className="font-semibold"
                              style={{ color: ((profile as any).stats?.winRate ?? 0) >= 50 ? '#34D399' : '#F87171' }}
                            >
                              {((profile as any).stats?.winRate ?? 0).toFixed(1)}%
                            </span>
                          </div>
                          {/* Win rate bar */}
                          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{
                                background: `linear-gradient(90deg, ${accent}, rgba(${accentRGB},0.5))`,
                                width: `${(profile as any).stats?.winRate ?? 0}%`,
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(profile as any).stats?.winRate ?? 0}%` }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Achievements */}
                    {profile.achievements && profile.achievements.length > 0 && (
                      <div className="mx-5 mb-4">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-white/30 mb-2.5">
                          Pencapaian
                        </p>
                        <div className="space-y-1.5">
                          {profile.achievements.slice(0, 5).map((ach) => (
                            <div
                              key={ach.id}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                              style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.04)',
                              }}
                            >
                              <span className="text-base">{ach.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-white/70 truncate">{ach.name}</p>
                                <p className="text-[10px] text-white/30 truncate">{ach.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Matches */}
                    {profile.recentMatches && profile.recentMatches.length > 0 && (
                      <div className="mx-5 mb-5">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-white/30 mb-2.5">
                          Pertandingan Terakhir
                        </p>
                        <div className="space-y-1.5">
                          {profile.recentMatches.slice(0, 8).map((match) => (
                            <div
                              key={match.id}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                              style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.04)',
                              }}
                            >
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                                style={{
                                  background: match.result === 'win' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                                  color: match.result === 'win' ? '#34D399' : '#F87171',
                                }}
                              >
                                {match.result === 'win' ? 'W' : 'L'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-white/70 truncate">
                                  vs {match.opponentName || 'Unknown'}
                                </p>
                                <p className="text-[10px] text-white/30">{match.tournamentName}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[12px] font-bold text-white/60">{match.score}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state when no matches */}
                    {(!profile.recentMatches || profile.recentMatches.length === 0) && ((profile as any).stats?.totalMatches ?? 0) === 0 && (
                      <div className="mx-5 mb-5 py-8 flex flex-col items-center">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                          style={{ background: `rgba(${accentRGB},0.08)` }}
                        >
                          <Gamepad2 className="w-6 h-6" style={{ color: accent, opacity: 0.5 }} />
                        </div>
                        <p className="text-[12px] text-white/30 text-center">
                          Belum ada pertandingan
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
