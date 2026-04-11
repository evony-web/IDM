'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Users,
  ChevronRight,
  ChevronDown,
  Swords,
  UserPlus,
  Clock,
  ArrowRight,
  Crown,
  Star,
  Sparkles,
  BarChart3,
  Heart,
  Gamepad2,
  Music,
  MapPin,
  Shield,
  Target,
} from 'lucide-react';
import { QualifiedPlayersModal } from './QualifiedPlayersModal';
import { AllRankingsModal } from './AllRankingsModal';

/* ─────────────────────────────────────────────
   Interfaces — preserved exactly
   ───────────────────────────────────────────── */

interface Player {
  id: string;
  name: string;
  email: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  rank: number;
  wins: number;
  losses: number;
}

interface ChampionMember {
  userId: string;
  userName: string;
  userAvatar: string | null;
  userTier: string;
  role: string;
}

interface ChampionData {
  teamName: string;
  members: ChampionMember[];
}

interface MVPData {
  userId: string;
  userName: string;
  userAvatar: string | null;
  userPoints: number;
  mvpScore: number;
}

/* ─────────────────────────────────────────────
   Theme Color Helper - colors based on DIVISION
   Male = Green, Female = Pink
   ───────────────────────────────────────────── */
function getThemeColors(division: 'male' | 'female') {
  if (division === 'male') {
    // MALE = GREEN
    return {
      primary: '#73FF00',
      primaryRGB: '115,255,0',
      primaryLight: '#8CFF00',
      primaryDark: '#4AB800',
    };
  } else {
    // FEMALE = BLUE
    return {
      primary: '#38BDF8',
      primaryRGB: '56,189,248',
      primaryLight: '#7DD3FC',
      primaryDark: '#0EA5E9',
    };
  }
}

interface DashboardProps {
  division: 'male' | 'female';
  tournament: {
    name: string;
    status: string;
    week: number;
    prizePool: number;
    participants: number;
    mode?: string;
    bpm?: string;
    lokasi?: string;
    startDate?: string | null;
  } | null;
  topPlayers: Player[];
  onRegister: () => void;
  onNavigate?: (tab: string) => void;
  onViewPlayers?: () => void;
  registeredCount?: number;
  registeredAvatars?: { name: string; avatar: string }[];
  onViewPrize?: () => void;
  onViewDonation?: () => void;
  teamsCount?: number;
  onViewTeams?: () => void;
  champion?: ChampionData | null;
  mvp?: MVPData | null;
  leaderboardTab?: 'players' | 'clubs';
  onLeaderboardTabChange?: (tab: 'players' | 'clubs') => void;
  topClubs?: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    totalPoints: number;
    memberCount: number;
    rank: number;
  }>;
  onPlayerClick?: (playerId: string) => void;
  onViewPoints?: () => void;
}

/* ─────────────────────────────────────────────
   Animation Variants — premium spring physics
   ───────────────────────────────────────────── */

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
  },
};

const staggeredItem = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, delay: i * 0.07, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
  }),
};

const rankColors = ['#FFD60A', '#C7C7CC', '#CD7F32'];

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function getStatusInfo(status: string) {
  switch (status) {
    case 'setup':
      return { cls: 'status-setup', label: 'PERSIAPAN', desc: 'Turnamen sedang disiapkan' };
    case 'registration':
      return { cls: 'status-registration', label: 'PENDAFTARAN', desc: 'Daftar sekarang untuk bertanding!' };
    case 'team_generation':
      return { cls: 'status-team', label: 'TIM', desc: 'Tim sedang dibentuk dari peserta' };
    case 'bracket_ready':
      return { cls: 'status-bracket', label: 'BRACKET', desc: 'Bracket sudah siap, turnamen segera dimulai' };
    case 'ongoing':
      return { cls: 'status-live', label: '● LIVE', desc: 'Turnamen sedang berlangsung' };
    case 'completed':
      return { cls: 'status-completed', label: 'SELESAI', desc: 'Turnamen minggu ini telah berakhir' };
    default:
      return { cls: 'status-setup', label: 'PERSIAPAN', desc: 'Turnamen sedang disiapkan' };
  }
}

/* ─────────────────────────────────────────────
   useCountdown — Countdown timer to a target date
   ───────────────────────────────────────────── */

function useCountdown(targetDate: string | null | undefined) {
  const calcTimeLeft = (date: string | null | undefined) => {
    if (!date) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const target = new Date(date).getTime();
    if (isNaN(target)) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const diff = target - Date.now();
    if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const totalSeconds = Math.floor(diff / 1000);
    return {
      total: diff,
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      expired: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetDate));

  useEffect(() => {
    const target = targetDate ? new Date(targetDate).getTime() : NaN;
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

/* ─────────────────────────────────────────────
   useCountUp — Animated number counter (Apple-style)
   ───────────────────────────────────────────── */

function useCountUp(target: number, duration = 1200, delay = 300) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let start: number | null = null;
    let frameId: ReturnType<typeof requestAnimationFrame> | null = null;

    const timer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (cancelled) return;
        if (start === null) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        }
      };
      frameId = requestAnimationFrame(step);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [target, duration, delay]);

  return value;
}

/* ─────────────────────────────────────────────
   getGreeting — Dynamic time-based greeting
   ───────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Selamat Pagi';
  if (h >= 11 && h < 15) return 'Selamat Siang';
  if (h >= 15 && h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

/* ─────────────────────────────────────────────
   Dashboard Component — Premium Upgrade
   ───────────────────────────────────────────── */

export function Dashboard({
  division,
  tournament,
  topPlayers,
  onRegister,
  onNavigate,
  onViewPlayers,
  registeredCount,
  registeredAvatars,
  onViewPrize,
  teamsCount,
  onViewTeams,
  onViewDonation,
  champion,
  mvp,
  leaderboardTab = 'players',
  onLeaderboardTabChange,
  topClubs,
  onPlayerClick,
  onViewPoints,
}: DashboardProps) {
  const isMale = division === 'male';
  // ⚡ PERFORMANCE-OPTIMIZED: Use card-hero for main, card-float for stats
  const heroCardClass = 'card-hero card-hero-corner';  // Premium hero with spinning border
  const statsCardClass = 'card-float card-accent-line';  // Lightweight for many cards
  
  // Get theme-aware colors based on DIVISION (dark mode only)
  const themeColors = getThemeColors(division);

  /* ── Theme-aware accent colors based on DIVISION ── */
  const accentColor = isMale 
    ? 'text-[#73FF00]'
    : 'text-[#38BDF8]';
  const accentBg = isMale
    ? 'bg-[#73FF00]/12'
    : 'bg-[#38BDF8]/12';
  const accentSubtleBg = isMale
    ? 'bg-[#73FF00]/[0.07]'
    : 'bg-[#38BDF8]/[0.07]';

  /* ── Countdown timer ── */
  const shouldShowCountdown = tournament && (tournament.status === 'setup' || tournament.status === 'registration') && tournament.startDate;
  const countdown = useCountdown(shouldShowCountdown ? tournament.startDate : null);

  /* ── Tournament info tags ── */
  const infoTags = [
    tournament?.mode ? { icon: Gamepad2, label: 'Mode', value: tournament.mode } : null,
    tournament?.bpm ? { icon: Music, label: 'BPM', value: tournament.bpm } : null,
    tournament?.lokasi ? { icon: MapPin, label: 'Lokasi', value: tournament.lokasi } : null,
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string }[];
  const btnClass = isMale ? 'btn-gold' : 'btn-gold'; // Both use btn-gold style, CSS handles the color
  const gradientClass = isMale ? 'gradient-gold' : 'gradient-pink';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-gold'; // Both use gold style, CSS handles the color

  const tierMap: Record<string, string> = { S: 'tier-s', A: 'tier-a', B: 'tier-b' };

  const status = tournament?.status || 'setup';
  const statusInfo = getStatusInfo(status);
  const isRegistration = status === 'registration';
  const isOngoing = status === 'ongoing';
  const hasPlayers = topPlayers.length > 0;
  const hasClubs = topClubs !== undefined && topClubs.length > 0;
  const showResults = champion || mvp;

  /* ── Qualified Players Modal State ── */
  const [qualifiedModalOpen, setQualifiedModalOpen] = useState(false);
  const qualifiedPlayers = topPlayers.slice(0, 12);

  /* ── All Rankings Modal State ── */
  const [allRankingsModalOpen, setAllRankingsModalOpen] = useState(false);

  /* ── Show All Players Inline ── */
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const displayedPlayers = showAllPlayers ? topPlayers : topPlayers.slice(0, 5);

  /* ── Club Members Dropdown State ── */
  const [expandedClubId, setExpandedClubId] = useState<string | null>(null);
  const [clubMembers, setClubMembers] = useState<Record<string, Array<{
    id: string;
    name: string;
    avatar: string | null;
    tier: string | null;
    points: number;
    wins: number;
    losses: number;
  }>>>({});
  const [loadingClubMembers, setLoadingClubMembers] = useState<string | null>(null);

  // Fetch club members when expanded
  const fetchClubMembers = useCallback(async (slug: string, clubId: string) => {
    if (clubMembers[clubId]) {
      // Already cached, just toggle
      setExpandedClubId(prev => prev === clubId ? null : clubId);
      return;
    }
    
    setLoadingClubMembers(clubId);
    try {
      const res = await fetch(`/api/clubs?slug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.club?.members) {
          setClubMembers(prev => ({
            ...prev,
            [clubId]: data.club.members,
          }));
          setExpandedClubId(clubId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch club members:', err);
    } finally {
      setLoadingClubMembers(null);
    }
  }, [clubMembers]);

  /* ── Deterministic gradient for club letter avatar ── */
  const clubGradients = [
    'linear-gradient(135deg, #FF6B6B, #EE5A24)',
    'linear-gradient(135deg, #A29BFE, #6C5CE7)',
    'linear-gradient(135deg, #55E6C1, #26de81)',
    'linear-gradient(135deg, #FD79A8, #E84393)',
    'linear-gradient(135deg, #FDCB6E, #F39C12)',
    'linear-gradient(135deg, #74B9FF, #0984E3)',
    'linear-gradient(135deg, #FF9FF3, #F368E0)',
    'linear-gradient(135deg, #48DBFB, #0ABDE3)',
    'linear-gradient(135deg, #FF9F43, #EE5A24)',
    'linear-gradient(135deg, #C8D6E5, #8395A7)',
  ];
  const getClubGradient = useCallback((name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return clubGradients[Math.abs(hash) % clubGradients.length];
  }, []);

  const handleTabChange = useCallback((tab: 'players' | 'clubs') => {
    onLeaderboardTabChange?.(tab);
  }, [onLeaderboardTabChange]);

  /* ── Animated counters ── */
  const countParticipants = useCountUp(registeredCount ?? tournament?.participants ?? 0, 1400, 500);
  const countPrize = useCountUp(tournament?.prizePool || 0, 1800, 700);
  const countTeams = useCountUp(teamsCount ?? 0, 1200, 900);

  /* ── Compact prize formatter for hero card info bar ── */
  const compactPrize = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}jt`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
    return String(val);
  };

  /* ── Dynamic greeting ── */
  const greeting = getGreeting();

  // Division label
  const divisionLabel = isMale ? 'Divisi Male' : 'Divisi Female';

  return (
    <motion.div
      className="space-y-4 sm:space-y-5 pb-4 lg:pb-6 apple-desktop-container overflow-x-hidden"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ═══════════════════════════════════════════════════════════
          DESKTOP/TABLET LAYOUT - Two Column Grid (Full Width)
          ═══════════════════════════════════════════════════════════ */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* Main Content - Full width */}
        <div className="lg:col-span-12 space-y-5">
      {/* ═══════════════════════════════════════════════════════════
          HERO CARD — Premium iOS Tournament Template
          Uses: .card-pro .card-corner-accent (shimmer on hover)
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={item} className="relative">
        <div
          className={`${heroCardClass} rounded-3xl relative overflow-hidden${onNavigate ? ' cursor-pointer' : ''}`}
          onClick={() => onNavigate && onNavigate('bracket')}
        >

          {/* ── Card content ── */}
          <div className="relative z-10 p-5 lg:p-8">

            {/* ── Status row: Pill + Week + Support (top area) ── */}
            <div className="flex items-center justify-between mb-4 lg:mb-5">
              <div className="flex items-center gap-2.5">
                {/* Refined status pill with dot indicator */}
                <span className={`hero-status-pill ${
                  status === 'ongoing' ? 'hero-status-live' :
                  status === 'registration' ? 'hero-status-registration' :
                  status === 'completed' ? 'hero-status-completed' :
                  status === 'team_generation' ? 'hero-status-team' :
                  status === 'bracket_ready' ? 'hero-status-bracket' :
                  'hero-status-setup'
                }`}>
                  <span className="status-dot" />
                  {statusInfo.label}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${false ? 'text-slate-400' : 'text-white/35'}`}>
                  Minggu {tournament?.week || 1}
                </span>
              </div>

              {/* Support/Donasi Button — inline with status */}
              {onNavigate && (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); onNavigate('donation'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer min-h-[36px]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(220,38,38,0.06) 100%)',
                    border: '0.5px solid rgba(239,68,68,0.18)',
                  }}
                  whileHover={{
                    scale: 1.06,
                    boxShadow: '0 0 16px rgba(239,68,68,0.15)',
                  }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  <Heart
                    className="w-3.5 h-3.5 text-red-400"
                    fill="currentColor"
                    style={{ filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.4))' }}
                  />
                  <span className="text-[10px] font-semibold text-red-400/80 tracking-wide">
                    Support
                  </span>
                </motion.button>
              )}
            </div>

            {/* ── Tournament Name — bold title below status row ── */}
            <h2
              className={`text-[24px] sm:text-[28px] lg:text-[40px] font-black leading-[1.1] mb-2 hero-shimmer-title ${isMale ? 'shimmer-gold' : 'shimmer-pink'}`}
              style={{
                letterSpacing: '-0.03em',
                textShadow: isMale
                  ? '0 0 40px rgba(255,214,10,0.08)'
                  : '0 0 40px rgba(56, 189, 248,0.08)',
              }}
            >
              {tournament?.name || divisionLabel}
            </h2>

            {/* ── Two-column layout on desktop ── */}
            <div className="lg:flex lg:items-start lg:gap-8">
              {/* ── Left Column: Title info + Tags + Countdown ── */}
              <div className="lg:flex-1 lg:min-w-0">

              {/* ── Tournament Info Tags — refined glass chips ── */}
              {infoTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3.5">
                  {infoTags.map((tag) => {
                    const Icon = tag.icon;
                    return (
                      <div
                        key={tag.label}
                        className="hero-info-chip"
                      >
                        <Icon className={`w-3.5 h-3.5 chip-icon ${accentColor}`} />
                        <span className={`chip-label ${false ? 'text-slate-600' : 'text-white'}`}>{tag.label}</span>
                        <span className={`font-bold ${false ? 'text-slate-700' : 'text-white/80'}`}>{tag.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Countdown Timer — iOS World Clock segmented blocks ── */}
              {shouldShowCountdown && (
                <div className="mb-4">
                  {countdown.expired ? (
                    <div className={`flex items-center gap-2 text-[12px] font-medium ${false ? 'text-slate-500' : 'text-white/40'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Seharusnya sudah dimulai</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock className={`w-4 h-4 ${accentColor} opacity-60`} />
                      <span className={`text-[11px] font-medium mr-1 ${false ? 'text-slate-400' : 'text-white/35'}`}>Dimulai dalam</span>
                      <div className="hero-countdown-block">
                        {countdown.days > 0 && (
                          <>
                            <div className="hero-countdown-digit">
                              <span className={`digit-value ${accentColor}`}>{countdown.days}</span>
                              <span className={`digit-label ${false ? 'text-slate-600' : 'text-white'}`}>Hari</span>
                            </div>
                            <span className={`hero-countdown-separator ${accentColor}`}>:</span>
                          </>
                        )}
                        <div className="hero-countdown-digit">
                          <span className={`digit-value ${accentColor}`}>{String(countdown.hours).padStart(2, '0')}</span>
                          <span className={`digit-label ${false ? 'text-slate-600' : 'text-white'}`}>Jam</span>
                        </div>
                        <span className={`hero-countdown-separator ${accentColor}`}>:</span>
                        <div className="hero-countdown-digit">
                          <span className={`digit-value ${accentColor}`}>{String(countdown.minutes).padStart(2, '0')}</span>
                          <span className={`digit-label ${false ? 'text-slate-600' : 'text-white'}`}>Menit</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Greeting */}
              <p className={`text-[13px] mb-4 leading-relaxed font-normal lg:text-sm ${false ? 'text-slate-500' : 'text-white/40'}`}>
                {greeting}! {statusInfo.desc}
              </p>
              </div>{/* end left column */}

              {/* ── Right Column: Info Bar + CTA (non-results) OR Results ── */}
              <div className="lg:w-80 lg:flex-shrink-0">

              {/* ── Prize Pool + Participants — refined inline info bar ── */}
              {!showResults && (tournament?.prizePool || (registeredCount ?? tournament?.participants) > 0) && (
                <div className="hero-info-bar mb-4 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {/* Prize Pool */}
                  <div className="info-block min-w-0">
                    <div className={`info-block-icon ${isMale ? 'icon-gold' : 'icon-pink'}`}>
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                    <div className="info-block-content min-w-0">
                      <span className={`info-block-value ${accentColor} truncate`}>Rp {compactPrize(countPrize)}</span>
                      <span className="info-block-label">Hadiah</span>
                    </div>
                  </div>
                  {/* Divider */}
                  <div className="info-block-divider hidden sm:block" />
                  {/* Participants */}
                  <div className="info-block min-w-0">
                    <div className={`info-block-icon ${isMale ? 'icon-gold' : 'icon-pink'}`}>
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="info-block-content min-w-0">
                      <span className={`info-block-value ${false ? 'text-slate-800' : 'text-white/90'}`}>{countParticipants}</span>
                      <span className="info-block-label">Peserta</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CTA Buttons (when NOT showing results) ── */}
              {!showResults && (
                <>
                  {isRegistration && (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); onRegister(); }}
                      className={`${btnClass} btn-ios hero-shimmer-btn w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2.5 relative`}
                      whileHover={{ scale: 1.012, y: -1 }}
                      whileTap={{ scale: 0.975 }}
                      transition={springTransition}
                    >
                      <span className="relative z-[2] flex items-center gap-2.5">
                        <UserPlus className="w-[18px] h-[18px]" />
                        GABUNG TURNAMEN
                        <ArrowRight className="w-[18px] h-[18px]" />
                      </span>
                    </motion.button>
                  )}

                  {isOngoing && (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); onNavigate?.('bracket'); }}
                      className={`w-full py-3.5 rounded-2xl text-[14px] font-semibold ${accentBg} ${accentColor} border ${isMale ? 'border-[#73FF00]/20' : 'border-[#38BDF8]/20'} flex items-center justify-center gap-2.5`}
                      whileHover={{ scale: 1.012 }}
                      whileTap={{ scale: 0.975 }}
                      transition={springTransition}
                    >
                      <Swords className="w-[18px] h-[18px]" />
                      Lihat Bracket
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  )}

                  {!isRegistration && !isOngoing && (
                    <div className="flex items-center gap-2.5 text-white/35 text-[13px] font-medium">
                      <Clock className="w-4 h-4" />
                      <span>Menunggu dimulai...</span>
                    </div>
                  )}
                </>
              )}

              {/* ═══════════════════════════════════════════
                  CHAMPION + MVP Results Section
                  ═══════════════════════════════════════════ */}
              {showResults && (
                <div className="space-y-3.5">
                {/* ─── Champion Card — refined inner card ─── */}
                {champion && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                    className="hero-result-card lg:flex-1 lg:min-w-0"
                    style={{
                      background: false
                        ? `linear-gradient(145deg, rgba(${themeColors.primaryRGB},0.10) 0%, rgba(255,255,255,0.85) 50%, rgba(${themeColors.primaryRGB},0.05) 100%)`
                        : `linear-gradient(145deg, rgba(${themeColors.primaryRGB},0.06) 0%, rgba(18,18,22,0.50) 50%, rgba(${themeColors.primaryRGB},0.02) 100%)`,
                      borderColor: false
                        ? `rgba(${themeColors.primaryRGB},0.15)`
                        : `rgba(${themeColors.primaryRGB},0.10)`,
                    }}
                  >
                    {/* Subtle glow line at top */}
                    <div
                      className="result-glow"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgba(${themeColors.primaryRGB},0.20), transparent)`,
                      }}
                    />

                    {/* Champion header */}
                    <div className="flex items-center gap-3.5 p-4 pb-3">
                      <div>
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{
                            background: false
                              ? `linear-gradient(135deg, rgba(${themeColors.primaryRGB},0.20), rgba(${themeColors.primaryRGB},0.10))`
                              : `linear-gradient(135deg, rgba(${themeColors.primaryRGB},0.14), rgba(${themeColors.primaryRGB},0.06))`,
                            border: `0.5px solid rgba(${themeColors.primaryRGB},0.20)`,
                          }}
                        >
                          <Crown className={`w-6 h-6`} style={{ color: themeColors.primary }} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span
                          className="text-[9px] font-black uppercase"
                          style={{ letterSpacing: '0.2em', color: `rgba(${themeColors.primaryRGB},0.70)` }}
                        >
                          Pemenang Pekan Ini
                        </span>
                        <p className={`text-[16px] font-black truncate leading-tight mt-0.5 tracking-tight ${false ? 'text-slate-800' : 'text-white/90'}`}>
                          {champion.teamName}
                        </p>
                      </div>

                      <motion.div
                        animate={{ rotate: [0, 8, -8, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: false
                              ? `linear-gradient(135deg, rgba(${themeColors.primaryRGB},0.15), rgba(${themeColors.primaryRGB},0.08))`
                              : `linear-gradient(135deg, rgba(${themeColors.primaryRGB},0.10), rgba(${themeColors.primaryRGB},0.04))`,
                          }}
                        >
                          <Trophy className="w-5 h-5" style={{ color: `rgba(${themeColors.primaryRGB},0.70)` }} />
                        </div>
                      </motion.div>
                    </div>

                    {/* Subtle divider */}
                    <div className={`mx-4 h-px ${false ? 'bg-gradient-to-r from-transparent via-slate-200' : 'bg-gradient-to-r from-transparent via-white/[0.05]'} to-transparent`} />

                    {/* Team members — staggered entrance with larger avatars */}
                    <div className="space-y-1.5 p-4 pt-3">
                      {champion.members.map((member, idx) => (
                        <motion.div
                          key={member.userId}
                          custom={idx}
                          variants={staggeredItem}
                          initial="hidden"
                          animate="show"
                          className={`flex items-center gap-3 ${onPlayerClick ? 'cursor-pointer hover:bg-white/[0.03] rounded-lg px-1 py-0.5 -mx-1 -my-0.5 transition-colors' : ''}`}
                          onClick={onPlayerClick ? () => onPlayerClick(member.userId) : undefined}
                          whileHover={onPlayerClick ? { scale: 1.01 } : undefined}
                          whileTap={onPlayerClick ? { scale: 0.99 } : undefined}
                        >
                          <div className={avatarRingClass}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${false ? 'bg-gradient-to-br from-slate-200 to-slate-300' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
                              {member.userAvatar ? (
                                <img src={member.userAvatar} alt={member.userName} loading="lazy" className="w-full h-full object-cover object-top" />
                              ) : (
                                <span className={`text-sm font-bold ${false ? 'text-slate-600' : 'text-white/70'}`}>{member.userName.charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold truncate leading-snug ${false ? 'text-slate-800' : 'text-white/90'}`}>
                              {member.userName}
                              {member.role === 'captain' && (
                                <span className="ml-2 text-[9px] font-bold uppercase" style={{ letterSpacing: '0.08em', color: `rgba(${themeColors.primaryRGB},0.40)` }}>
                                  CPT
                                </span>
                              )}
                            </p>
                          </div>
                          <span className={"tier-badge " + (tierMap[member.userTier] || "tier-b")}>
                            {member.userTier}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ─── MVP Card — refined with softer borders ─── */}
                {mvp && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    className={`hero-result-card lg:flex-1 lg:min-w-0 ${onPlayerClick ? 'cursor-pointer' : ''}`}
                    style={{
                      background: false
                        ? 'linear-gradient(145deg, rgba(251,146,60,0.10) 0%, rgba(255,255,255,0.85) 50%, rgba(251,146,60,0.05) 100%)'
                        : 'linear-gradient(145deg, rgba(255,159,10,0.06) 0%, rgba(28,28,30,0.45) 50%, rgba(255,214,10,0.02) 100%)',
                      borderColor: false ? 'rgba(251,146,60,0.15)' : 'rgba(255,159,10,0.08)',
                    }}
                    onClick={onPlayerClick ? () => onPlayerClick(mvp.userId) : undefined}
                    whileHover={onPlayerClick ? { scale: 1.02 } : undefined}
                    whileTap={onPlayerClick ? { scale: 0.98 } : undefined}
                  >
                    {/* Subtle glow line at top */}
                    <div
                      className="result-glow"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,159,10,0.25), transparent)',
                      }}
                    />

                    <div className="flex items-center gap-4 p-4">
                      {/* Star + Avatar — larger avatar */}
                      <div className="relative flex-shrink-0">
                        <motion.div
                          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Star className="w-5 h-5 mx-auto mb-1.5 text-orange-400/60" />
                        </motion.div>
                        <div className="relative">
                          {/* Orange-gold avatar ring for MVP — larger */}
                          <div
                            className="p-[2.5px] rounded-full"
                            style={{
                              background: 'linear-gradient(145deg, #FF9F0A, #E68A00, #FFD60A)',
                              boxShadow: false
                                ? '0 0 16px rgba(255,159,10,0.15), 0 2px 8px rgba(0,0,0,0.08)'
                                : '0 0 16px rgba(255,159,10,0.20), 0 2px 8px rgba(0,0,0,0.25)',
                            }}
                          >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden ${false ? 'bg-gradient-to-br from-orange-100 to-orange-200' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
                              {mvp.userAvatar ? (
                                <img src={mvp.userAvatar} alt={mvp.userName} loading="lazy" className="w-full h-full object-cover object-top" />
                              ) : (
                                <span className={`text-base font-bold ${false ? 'text-orange-600' : 'text-white/70'}`}>{mvp.userName.charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          {/* MVP badge dot */}
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"
                            style={{ boxShadow: '0 0 10px rgba(255,159,10,0.4), 0 0 0 2px rgba(0,0,0,0.5)' }}
                          >
                            <Star className="w-3 h-3 text-white/90 fill-white" />
                          </div>
                        </div>
                      </div>

                      {/* MVP Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase text-orange-400/80" style={{ letterSpacing: '0.2em' }}>
                            MVP
                          </span>
                          <span className="px-2 py-[3px] rounded-lg text-[9px] font-bold bg-orange-400/10 text-orange-400/80 border border-orange-400/10">
                            +25 pts
                          </span>
                        </div>
                        <p className={`text-[17px] font-black truncate leading-tight tracking-tight ${false ? 'text-slate-800' : 'text-white/90'}`}>
                          {mvp.userName}
                        </p>
                        {mvp.mvpScore > 0 && (
                          <p className="text-[12px] font-semibold text-orange-400/50 mt-1 tabular-nums">
                            Skor: {mvp.mvpScore.toLocaleString('id-ID')}
                          </p>
                        )}
                        <p className={`text-[11px] mt-0.5 font-normal ${false ? 'text-slate-500' : 'text-white/35'}`}>
                          {mvp.userPoints.toLocaleString()} total poin
                        </p>
                      </div>

                      {/* Sparkles icon */}
                      <div className="flex-shrink-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: false
                              ? 'linear-gradient(135deg, rgba(212,201,31,0.12), rgba(212,201,31,0.05))'
                              : 'linear-gradient(135deg, rgba(212,201,31,0.10), rgba(212,201,31,0.03))',
                          }}
                        >
                          <Sparkles className="w-4 h-4 text-purple-400/50" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              )}
              </div>{/* end right column */}
            </div>{/* end two-column layout */}
          </div>
        </div>
      </motion.div>

      {/* ── Quick Stats — 3 Cards Horizontal on desktop ── */}
      <div className="space-y-5">
      {/* ═══════════════════════════════════════════════════════════
          QUICK STATS — Performance Optimized
          Uses: .card-float .card-accent-line (lightweight for lists)
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={item} className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 min-w-0">
        {/* PESERTA - Clickable card with modal */}
        <motion.button
          onClick={onViewPlayers}
          className={`relative ${statsCardClass} rounded-2xl p-3 sm:p-4 lg:p-6 text-center cursor-pointer group overflow-hidden min-w-0 min-h-[44px]`}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={springTransition}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
            style={{
              background: isMale
                ? 'radial-gradient(circle at 50% 30%, rgba(115,255,0,0.06) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 30%, rgba(56, 189, 248,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10 min-w-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 rounded-xl mx-auto mb-2 sm:mb-2.5 lg:mb-3 flex items-center justify-center ${accentSubtleBg}`}>
              <Users className={`w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-6 lg:h-6 ${accentColor}`} />
            </div>
            <p className={`text-[17px] sm:text-[20px] lg:text-3xl font-extrabold ${gradientClass} tracking-tight leading-none truncate`}>
              {countParticipants}
            </p>
            <p className={`text-[9px] uppercase tracking-[0.1em] mt-1.5 lg:mt-2 font-semibold lg:text-[11px] ${false ? 'text-slate-500' : 'text-white/40'}`}>
              Peserta
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <ChevronRight className={`w-2.5 h-2.5 -rotate-90 ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`} />
              <span className={`text-[8px] font-bold tracking-[0.15em] ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`}>
                TAP
              </span>
              <ChevronRight className={`w-2.5 h-2.5 rotate-90 ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`} />
            </div>
          </div>
        </motion.button>

        {/* HADIAH - Clickable card with modal */}
        <motion.button
          onClick={onViewPrize}
          className={`relative ${statsCardClass} rounded-2xl p-3 sm:p-4 lg:p-6 text-center cursor-pointer group overflow-hidden min-w-0 min-h-[44px]`}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={springTransition}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
            style={{
              background: isMale
                ? 'radial-gradient(circle at 50% 30%, rgba(115,255,0,0.06) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 30%, rgba(56, 189, 248,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10 min-w-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 rounded-xl mx-auto mb-2 sm:mb-2.5 lg:mb-3 flex items-center justify-center ${accentSubtleBg}`}>
              <Trophy className={`w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-6 lg:h-6 ${accentColor}`} />
            </div>
            <p className={`text-[15px] sm:text-[20px] lg:text-3xl font-extrabold ${gradientClass} tracking-tight leading-none truncate`}>
              Rp {compactPrize(countPrize)}
            </p>
            <p className={`text-[9px] uppercase tracking-[0.1em] mt-1.5 lg:mt-2 font-semibold lg:text-[11px] ${false ? 'text-slate-500' : 'text-white/40'}`}>
              Hadiah
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <ChevronRight className={`w-2.5 h-2.5 -rotate-90 ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`} />
              <span className={`text-[8px] font-bold tracking-[0.15em] ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`}>
                TAP
              </span>
              <ChevronRight className={`w-2.5 h-2.5 rotate-90 ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`} />
            </div>
          </div>
        </motion.button>

        {/* SISTEM POIN - Point Breakdown */}
        {onViewPoints && (
          <motion.button
            onClick={onViewPoints}
            className={`relative ${statsCardClass} rounded-2xl p-3 sm:p-4 lg:p-6 text-center cursor-pointer group overflow-hidden min-w-0 min-h-[44px]`}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={springTransition}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
              style={{
                background: isMale
                  ? 'radial-gradient(circle at 50% 30%, rgba(115,255,0,0.06) 0%, transparent 70%)'
                  : 'radial-gradient(circle at 50% 30%, rgba(56, 189, 248,0.06) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10 min-w-0">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 rounded-xl mx-auto mb-2 sm:mb-2.5 lg:mb-3 flex items-center justify-center ${accentSubtleBg}`}>
                <Target className={`w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-6 lg:h-6 ${accentColor}`} />
              </div>
              <p className={`text-[12px] sm:text-[14px] lg:text-lg font-extrabold ${gradientClass} tracking-tight leading-none`}>
                Poin
              </p>
              <p className={`text-[9px] uppercase tracking-[0.1em] mt-1.5 lg:mt-2 font-semibold lg:text-[11px] ${false ? 'text-slate-500' : 'text-white/40'}`}>
                Sistem Poin
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <ChevronRight className={`w-2.5 h-2.5 -rotate-90 ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`} />
                <span className={`text-[8px] font-bold tracking-[0.15em] ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`}>
                  TAP
                </span>
                <ChevronRight className={`w-2.5 h-2.5 rotate-90 ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`} />
              </div>
            </div>
          </motion.button>
        )}

        {/* TIM */}
        <motion.button
          onClick={onViewTeams}
          className={`relative ${statsCardClass} rounded-2xl p-3 sm:p-4 lg:p-6 text-center cursor-pointer group overflow-hidden min-w-0 min-h-[44px]`}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={springTransition}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
            style={{
              background: isMale
                ? 'radial-gradient(circle at 50% 30%, rgba(115,255,0,0.06) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 30%, rgba(56, 189, 248,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10 min-w-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 rounded-xl mx-auto mb-2 sm:mb-2.5 lg:mb-3 flex items-center justify-center ${accentSubtleBg}`}>
              <Swords className={`w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-6 lg:h-6 ${accentColor}`} />
            </div>
            <p className={`text-[17px] sm:text-[20px] lg:text-3xl font-extrabold ${gradientClass} tracking-tight leading-none truncate`}>
              {countTeams}
            </p>
            <p className={`text-[9px] uppercase tracking-[0.1em] mt-1.5 lg:mt-2 font-semibold lg:text-[11px] ${false ? 'text-slate-500' : 'text-white/40'}`}>
              Tim
            </p>
            <div
              className="flex items-center justify-center gap-1 mt-2"
            >
              <ChevronRight className={`w-2.5 h-2.5 -rotate-90 ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`} />
              <span className={`text-[8px] font-bold tracking-[0.15em] ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`}>
                TAP
              </span>
              <ChevronRight className={`w-2.5 h-2.5 rotate-90 ${isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'}`} />
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          TOP 3 PODIUM — Ranking Section with pulsing "Semua Peringkat"
          ═══════════════════════════════════════════════════════════ */}
      {hasPlayers && (
        <motion.div variants={item} className="relative">
          <div className={`relative ${statsCardClass} rounded-2xl overflow-hidden`}>
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${themeColors.primaryRGB},0.3), transparent)`,
              }}
            />

            <div className="p-4 lg:p-5">
              {/* Section Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className={`w-4 h-4 ${accentColor}`} />
                  <span className={`text-[13px] font-bold tracking-tight ${false ? 'text-slate-700' : 'text-white/80'}`}>
                    Top 3 Pemain
                  </span>
                </div>
              </div>

              {/* Podium - 3 Cards */}
              <div className="flex items-end justify-center gap-2 sm:gap-3 lg:gap-4 overflow-x-auto">
                {/* 2nd Place - Left */}
                <div className="flex flex-col items-center flex-1 max-w-[90px] sm:max-w-[100px] lg:max-w-[120px]">
                  {/* Avatar */}
                  <div className={avatarRingClass}>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center overflow-hidden ${false ? 'bg-gradient-to-br from-slate-200 to-slate-300' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
                      {topPlayers[1]?.avatar ? (
                        <img src={topPlayers[1].avatar} alt={topPlayers[1].name} loading="lazy" className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className={`text-lg font-bold ${false ? 'text-slate-600' : 'text-white/70'}`}>{topPlayers[1]?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Rank Badge */}
                  <div
                    className="mt-2 w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-sm sm:text-base font-black"
                    style={{
                      background: 'linear-gradient(135deg, #C7C7CC, #8E8E93)',
                      color: '#1C1C1E',
                      boxShadow: '0 2px 8px rgba(199,199,204,0.25)',
                    }}
                  >
                    2
                  </div>
                  
                  {/* Name & Points */}
                  <p className={`text-[11px] sm:text-[12px] font-bold mt-2 truncate w-full text-center ${false ? 'text-slate-800' : 'text-white/90'}`}>
                    {topPlayers[1]?.name || '-'}
                  </p>
                  <p className={`text-[10px] sm:text-[11px] font-bold ${accentColor} mt-0.5`}>
                    {topPlayers[1]?.points?.toLocaleString() || 0} PTS
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-[9px] text-green-400/70 font-medium">{topPlayers[1]?.wins || 0}W</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[9px] text-red-400/70 font-medium">{topPlayers[1]?.losses || 0}L</span>
                    </div>
                  </div>
                </div>

                {/* 1st Place - Center (Tallest) */}
                <div className="flex flex-col items-center flex-1 max-w-[100px] sm:max-w-[115px] lg:max-w-[140px] -mt-4 sm:-mt-5">
                  {/* Crown */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Crown className={`w-5 h-5 sm:w-6 sm:h-6 ${accentColor} mb-1.5`} />
                  </motion.div>
                  
                  {/* Avatar */}
                  <div className={avatarRingClass}>
                    <div className={`w-16 h-16 sm:w-[72px] sm:h-[72px] lg:w-24 lg:h-24 rounded-full flex items-center justify-center overflow-hidden ${false ? 'bg-gradient-to-br from-slate-200 to-slate-300' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
                      {topPlayers[0]?.avatar ? (
                        <img src={topPlayers[0].avatar} alt={topPlayers[0].name} loading="lazy" className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className={`text-xl font-bold ${false ? 'text-slate-600' : 'text-white/70'}`}>{topPlayers[0]?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Rank Badge */}
                  <div
                    className="mt-2 w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center text-base sm:text-lg font-black"
                    style={{
                      background: isMale
                        ? 'linear-gradient(135deg, #FFD60A, #E5A800)'
                        : 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                      color: '#000',
                      boxShadow: isMale
                        ? '0 0 16px rgba(255,214,10,0.35)'
                        : '0 0 16px rgba(56, 189, 248,0.35)',
                    }}
                  >
                    1
                  </div>
                  
                  {/* Name & Points */}
                  <p className={`text-[12px] sm:text-[13px] lg:text-sm font-bold mt-2 truncate w-full text-center ${false ? 'text-slate-800' : 'text-white/90'}`}>
                    {topPlayers[0]?.name || '-'}
                  </p>
                  <p className={`text-[11px] sm:text-[12px] font-bold ${accentColor} mt-0.5`}>
                    {topPlayers[0]?.points?.toLocaleString() || 0} PTS
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-[9px] text-green-400/70 font-medium">{topPlayers[0]?.wins || 0}W</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[9px] text-red-400/70 font-medium">{topPlayers[0]?.losses || 0}L</span>
                    </div>
                  </div>
                </div>

                {/* 3rd Place - Right */}
                <div className="flex flex-col items-center flex-1 max-w-[90px] sm:max-w-[100px] lg:max-w-[120px]">
                  {/* Avatar */}
                  <div className={avatarRingClass}>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center overflow-hidden ${false ? 'bg-gradient-to-br from-slate-200 to-slate-300' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
                      {topPlayers[2]?.avatar ? (
                        <img src={topPlayers[2].avatar} alt={topPlayers[2].name} loading="lazy" className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className={`text-lg font-bold ${false ? 'text-slate-600' : 'text-white/70'}`}>{topPlayers[2]?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Rank Badge */}
                  <div
                    className="mt-2 w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-sm sm:text-base font-black"
                    style={{
                      background: 'linear-gradient(135deg, #CD7F32, #8B4513)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(205,127,50,0.25)',
                    }}
                  >
                    3
                  </div>
                  
                  {/* Name & Points */}
                  <p className={`text-[11px] sm:text-[12px] font-bold mt-2 truncate w-full text-center ${false ? 'text-slate-800' : 'text-white/90'}`}>
                    {topPlayers[2]?.name || '-'}
                  </p>
                  <p className={`text-[10px] sm:text-[11px] font-bold ${accentColor} mt-0.5`}>
                    {topPlayers[2]?.points?.toLocaleString() || 0} PTS
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-[9px] text-green-400/70 font-medium">{topPlayers[2]?.wins || 0}W</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[9px] text-red-400/70 font-medium">{topPlayers[2]?.losses || 0}L</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pulsing "Semua Peringkat" Button */}
              <motion.button
                onClick={() => setAllRankingsModalOpen(true)}
                className="w-full mt-5 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden min-h-[44px]"
                style={{
                  background: 'transparent',
                  border: `1px solid ${isMale ? 'rgba(255,214,10,0.1)' : 'rgba(56, 189, 248,0.1)'}`,
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Subtle pulsing glow line - thin only */}
                <motion.div
                  className="absolute inset-x-0 top-0 h-[1px]"
                  style={{
                    background: isMale
                      ? 'linear-gradient(90deg, transparent, rgba(255,214,10,0.4), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(56, 189, 248,0.4), transparent)',
                  }}
                  animate={{
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <span className={`relative z-10 text-[11px] sm:text-[12px] font-semibold ${accentColor} tracking-wide`}>
                  Lihat Semua Peringkat
                </span>
                <ChevronRight className={`relative z-10 w-3.5 h-3.5 ${accentColor}`} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          QUICK ACTIONS — 2 Glass-Subtle Cards (+ 2 desktop-only)
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {/* Daftar */}
          <motion.button
            onClick={onRegister}
            className={`${statsCardClass} rounded-2xl p-3 sm:p-4 text-left group min-h-[44px]`}
            whileHover={{ scale: 1.025, y: -3 }}
            whileTap={{ scale: 0.975 }}
            transition={springTransition}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3`}
              style={{
                background: isMale
                  ? 'linear-gradient(135deg, rgba(255,214,10,0.12), rgba(255,159,10,0.05))'
                  : 'linear-gradient(135deg, rgba(56, 189, 248,0.12), rgba(196,181,253,0.05))',
              }}
            >
              <UserPlus className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${accentColor}`} />
            </div>
            <p className={`text-[13px] font-semibold leading-snug truncate ${false ? 'text-slate-800' : 'text-white/90'}`}>Daftar</p>
            <p className={`text-[11px] mt-0.5 font-normal truncate ${false ? 'text-slate-500' : 'text-white/40'}`}>Gabung turnamen</p>
          </motion.button>

          {/* Bracket */}
          <motion.button
            onClick={() => onNavigate && onNavigate('bracket')}
            className={`${statsCardClass} rounded-2xl p-3 sm:p-4 text-left group min-h-[44px]`}
            whileHover={{ scale: 1.025, y: -3 }}
            whileTap={{ scale: 0.975 }}
            transition={springTransition}
          >
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(212,201,31,0.12), rgba(212,201,31,0.04))',
              }}
            >
              <Swords className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-purple-400" />
            </div>
            <p className={`text-[13px] font-semibold leading-snug truncate ${false ? 'text-slate-800' : 'text-white/90'}`}>Bracket</p>
            <p className={`text-[11px] mt-0.5 font-normal truncate ${false ? 'text-slate-500' : 'text-white/40'}`}>Lihat pertandingan</p>
          </motion.button>

          {/* Leaderboard */}
          <motion.button
            onClick={() => onNavigate && onNavigate('leaderboard')}
            className={`${statsCardClass} rounded-2xl p-3 sm:p-4 text-left group min-h-[44px]`}
            whileHover={{ scale: 1.025, y: -3 }}
            whileTap={{ scale: 0.975 }}
            transition={springTransition}
          >
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(52,199,89,0.12), rgba(52,199,89,0.04))',
              }}
            >
              <BarChart3 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-green-400" />
            </div>
            <p className={`text-[13px] font-semibold leading-snug truncate ${false ? 'text-slate-800' : 'text-white/90'}`}>Leaderboard</p>
            <p className={`text-[11px] mt-0.5 font-normal truncate ${false ? 'text-slate-500' : 'text-white/40'}`}>Pemain terbaik</p>
          </motion.button>

          {/* Total Donasi */}
          <motion.button
            onClick={() => onViewDonation && onViewDonation()}
            className={`${statsCardClass} rounded-2xl p-3 sm:p-4 text-left group min-h-[44px]`}
            whileHover={{ scale: 1.025, y: -3 }}
            whileTap={{ scale: 0.975 }}
            transition={springTransition}
          >
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3"
              style={{
                background: isMale
                  ? 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(244,63,94,0.06))'
                  : 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(244,63,94,0.06))',
              }}
            >
              <Heart className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-purple-400" />
            </div>
            <p className={`text-[13px] font-semibold leading-snug truncate ${false ? 'text-slate-800' : 'text-white/90'}`}>Total Donasi</p>
            <p className={`text-[11px] mt-0.5 font-normal truncate ${false ? 'text-slate-500' : 'text-white/40'}`}>Dukung Season 2</p>
          </motion.button>
        </div>
      </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TOP PLAYERS / CLUBS — Tabbed leaderboard
          ═══════════════════════════════════════════════════════════ */}
      {(hasPlayers || hasClubs || true) && (
        <motion.div variants={item}>
          {/* Section header with segmented tab */}
          <div className="flex items-center justify-between px-1 mb-3 gap-2">
            <div className="flex items-center gap-1 bg-white/[0.06] rounded-lg p-0.5 min-w-0">
              {([
                { id: 'players' as const, label: 'PEMAIN TERBAIK', icon: Trophy },
                { id: 'clubs' as const, label: 'CLUB TERBAIK', icon: Shield },
              ]).map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="relative flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold z-10 min-h-[36px]"
                  whileTap={{ scale: 0.97 }}
                >
                  {leaderboardTab === tab.id && (
                    <motion.div
                      className={`absolute inset-0 rounded-md ${statsCardClass} pointer-events-none`}
                      layoutId="leaderboardTab"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${leaderboardTab === tab.id ? accentColor : false ? 'text-slate-400' : 'text-white/35'}`}>
                    <tab.icon className="w-3 h-3 inline" />
                  </span>
                  <span className={`relative z-10 ${leaderboardTab === tab.id ? (false ? 'text-slate-800' : 'text-white/90') : false ? 'text-slate-400' : 'text-white/35'} hidden sm:inline`}>
                    {tab.label}
                  </span>
                  <span className={`relative z-10 ${leaderboardTab === tab.id ? (false ? 'text-slate-800' : 'text-white/90') : false ? 'text-slate-400' : 'text-white/35'} sm:hidden`}>
                    {tab.id === 'players' ? 'PEMAIN' : 'CLUB'}
                  </span>
                </motion.button>
              ))}
            </div>
            {leaderboardTab === 'players' && (
              <button
                onClick={onViewPlayers}
                className={`text-[11px] flex items-center gap-0.5 font-semibold transition-colors duration-200 ${false ? 'text-slate-700 hover:text-slate-900' : 'text-white/40 hover:text-white/60'}`}
              >
                Lihat Semua <ChevronRight className="w-3 h-3" />
              </button>
            )}
            {leaderboardTab === 'clubs' && (
              <button
                onClick={() => onNavigate && onNavigate('leaderboard')}
                className={`text-[11px] flex items-center gap-0.5 font-semibold transition-colors duration-200 ${false ? 'text-slate-700 hover:text-slate-900' : 'text-white/40 hover:text-white/60'}`}
              >
                Lihat Semua <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ── PLAYERS TAB ── */}
          {leaderboardTab === 'players' && hasPlayers && (
            <>
              <motion.div
                className="space-y-1.5 max-h-96 sm:max-h-[420px] overflow-y-auto pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full"
                style={{ scrollbarWidth: 'thin', scrollbarColor: isMale ? 'rgba(115,255,0,0.12) transparent' : 'rgba(56,189,248,0.12) transparent' }}
                variants={container}
                initial="hidden"
                animate="show"
              >
                {displayedPlayers.map((player, index) => (
                  <motion.div
                    key={player.id}
                    className={`${statsCardClass} rounded-xl px-3 py-2.5 flex items-center gap-3 group min-h-[44px] ${onPlayerClick && player.id ? 'cursor-pointer' : 'cursor-default'}`}
                    variants={item}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    onClick={onPlayerClick && player.id ? () => onPlayerClick(player.id) : undefined}
                  >
                    {/* Rank badge */}
                    <div
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-[11px] shrink-0"
                      style={
                        index < 3
                          ? {
                              background: `linear-gradient(160deg, ${rankColors[index]} 0%, ${
                                index === 1 ? '#8E8E93' : index === 2 ? '#A0522D' : '#E5A800'
                              } 100%)`,
                              color: index === 1 ? '#1C1C1E' : index === 2 ? '#fff' : '#000',
                              boxShadow: `0 2px 6px ${rankColors[index]}30, inset 0 1px 0 rgba(255,255,255,${index === 2 ? '0.15' : '0.35'})`,
                            }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }
                      }
                    >
                      {player.rank}
                    </div>

                    {/* Avatar */}
                    <div className={avatarRingClass}>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} loading="lazy" className="w-full h-full object-cover object-top" />
                        ) : (
                          <span className="text-[10px] font-semibold text-white/70">{player.name[0]}</span>
                        )}
                      </div>
                    </div>

                    {/* Name + Tier */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <p className={`text-[13px] font-semibold truncate ${false ? 'text-slate-800' : 'text-white/90'}`}>{player.name}</p>
                      {player.tier && (
                        <span className={`tier-badge ${tierMap[player.tier] || 'tier-b'} shrink-0`}>
                          {player.tier}
                        </span>
                      )}
                    </div>

                    {/* Points + Season Breakdown */}
                    <div className="text-right shrink-0">
                      <span
                        className="text-[12px] sm:text-[13px] font-bold tabular-nums"
                        style={{
                          background: 'linear-gradient(135deg, #ffd700, #ffec8b)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {player.points.toLocaleString()}
                      </span>
                      {player.seasonPoints && player.seasonPoints.length > 0 && (
                        <div className="flex items-center gap-0.5 justify-end mt-0.5 flex-wrap">
                          {player.seasonPoints.map((sp: { season: number; points: number }) => (
                            <span
                              key={sp.season}
                              className="text-[6px] font-semibold px-0.5 rounded"
                              style={{
                                background: false ? 'rgba(56,189,248,0.08)' : 'rgba(115,255,0,0.08)',
                                color: false ? 'rgba(56,189,248,0.5)' : 'rgba(115,255,0,0.5)',
                              }}
                            >
                              S{sp.season}:{sp.points}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA — Lihat Semua / Tutup */}
              {topPlayers.length > 5 && (
                <motion.button
                  onClick={() => setShowAllPlayers(prev => !prev)}
                  className="w-full mt-3 py-3 rounded-xl text-[12px] font-semibold tracking-wide cursor-pointer outline-none flex items-center justify-center gap-1.5 min-h-[44px]"
                  style={{
                    background: showAllPlayers
                      ? `rgba(${themeColors.primaryRGB},0.08)`
                      : (false ? 'rgba(100,116,139,0.06)' : 'rgba(255,255,255,0.03)'),
                    border: showAllPlayers
                      ? `1px solid rgba(${themeColors.primaryRGB},0.15)`
                      : `1px solid ${false ? 'rgba(100,116,139,0.10)' : 'rgba(255,255,255,0.06)'}`,
                    color: showAllPlayers
                      ? themeColors.primary
                      : (false ? 'text-slate-500' : 'text-white/40'),
                  }}
                  whileHover={{
                    background: showAllPlayers
                      ? `rgba(${themeColors.primaryRGB},0.12)`
                      : (false ? 'rgba(100,116,139,0.10)' : 'rgba(255,255,255,0.06)'),
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {showAllPlayers ? 'Tutup' : 'Lihat Semua Pemain'}
                  {showAllPlayers
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                </motion.button>
              )}
            </>
          )}

          {/* ── CLUBS TAB ── */}
          {leaderboardTab === 'clubs' && (
            <>
              {/* Empty State when no clubs */}
              {!hasClubs && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`${statsCardClass} rounded-2xl p-8 text-center`}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: false
                        ? 'linear-gradient(135deg, rgba(100,116,139,0.10), rgba(100,116,139,0.05))'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                    }}
                  >
                    <Shield className={`w-6 h-6 ${false ? 'text-slate-300' : 'text-white/15'}`} />
                  </div>
                  <p className={`text-[13px] font-medium mb-1 ${false ? 'text-slate-400' : 'text-white/30'}`}>
                    Belum ada club terdaftar
                  </p>
                  <p className={`text-[11px] ${false ? 'text-slate-300' : 'text-white/20'}`}>
                    Club akan muncul setelah admin membuat club baru
                  </p>
                </motion.div>
              )}

              {hasClubs && (
              <>
              {/* Club rows */}
              <motion.div
                className="space-y-1.5 max-h-96 sm:max-h-[420px] overflow-y-auto pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full"
                style={{ scrollbarWidth: 'thin', scrollbarColor: isMale ? 'rgba(115,255,0,0.12) transparent' : 'rgba(56,189,248,0.12) transparent' }}
                variants={container}
                initial="hidden"
                animate="show"
              >
                {topClubs!.slice(0, 10).map((club, index) => {
                  const isExpanded = expandedClubId === club.id;
                  const isLoading = loadingClubMembers === club.id;
                  const members = clubMembers[club.id] || [];
                  
                  return (
                    <div key={club.id}>
                      {/* Club Row - Clickable to expand */}
                      <motion.div
                        className={`${statsCardClass} rounded-xl px-3 py-2.5 flex items-center gap-3 group cursor-pointer min-h-[44px] ${index >= 5 ? 'max-lg:hidden' : ''}`}
                        variants={item}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        onClick={() => fetchClubMembers(club.slug, club.id)}
                      >
                        {/* Rank badge */}
                        <div
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-[11px] shrink-0"
                          style={
                            index < 3
                              ? {
                                  background: `linear-gradient(160deg, ${rankColors[index]} 0%, ${
                                    index === 1 ? '#8E8E93' : index === 2 ? '#A0522D' : '#E5A800'
                                  } 100%)`,
                                  color: index === 1 ? '#1C1C1E' : index === 2 ? '#fff' : '#000',
                                  boxShadow: `0 2px 6px ${rankColors[index]}30, inset 0 1px 0 rgba(255,255,255,${index === 2 ? '0.15' : '0.35'})`,
                                }
                              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }
                          }
                        >
                          {club.rank}
                        </div>

                        {/* Club avatar */}
                        <div className={avatarRingClass}>
                          <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden"
                            style={club.logoUrl ? undefined : { background: getClubGradient(club.name) }}
                          >
                            {club.logoUrl ? (
                              <img src={club.logoUrl} alt={club.name} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <span className="club-avatar">
                                {club.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Club name + members */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <p className={`text-[13px] font-semibold truncate ${false ? 'text-slate-800' : 'text-white/90'}`}>{club.name}</p>
                          <span className={`text-[10px] shrink-0 ${
                            false ? 'text-slate-400' : 'text-white/30'
                          }`}>
                            {club.memberCount} anggota
                          </span>
                        </div>

                        {/* Points */}
                        <span
                          className="text-[12px] sm:text-[13px] font-bold tabular-nums shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #ffd700, #ffec8b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {club.totalPoints.toLocaleString()}
                        </span>

                        {/* Expand indicator */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="shrink-0"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 ${false ? 'text-slate-400' : 'text-white/30'}`} />
                        </motion.div>
                      </motion.div>

                      {/* Expanded Members Section */}
                      <motion.div
                        initial={false}
                        animate={{
                          height: isExpanded ? 'auto' : 0,
                          opacity: isExpanded ? 1 : 0,
                        }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className={`pl-10 pr-3 py-2 space-y-1.5 max-h-64 overflow-y-auto ${false ? 'bg-slate-50/50' : 'bg-white/[0.02]'} [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full`}>
                          {isLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isMale ? 'border-[#73FF00]' : 'border-[#38BDF8]'}`} />
                            </div>
                          ) : members.length > 0 ? (
                            members.map((member, idx) => (
                              <motion.div
                                key={member.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${false ? 'hover:bg-white/60' : 'hover:bg-white/[0.03]'}`}
                              >
                                {/* Member avatar */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${false ? 'bg-gradient-to-br from-slate-200 to-slate-300' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
                                  {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} loading="lazy" className="w-full h-full object-cover object-top" />
                                  ) : (
                                    <span className={`text-[10px] font-bold ${false ? 'text-slate-600' : 'text-white/70'}`}>{member.name[0]}</span>
                                  )}
                                </div>
                                
                                {/* Member name */}
                                <span className={`flex-1 text-[12px] font-medium truncate ${false ? 'text-slate-700' : 'text-white/80'}`}>
                                  {member.name}
                                </span>
                                
                                {/* Tier badge */}
                                {member.tier && (
                                  <span className={`tier-badge ${tierMap[member.tier] || 'tier-b'} text-[9px] px-1.5 py-0.5`}>
                                    {member.tier}
                                  </span>
                                )}
                                
                                {/* Wins/Losses */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-green-400/70 font-medium">{member.wins}W</span>
                                  <span className="text-[10px] text-red-400/60 font-medium">{member.losses}L</span>
                                </div>
                                
                                {/* Points */}
                                <span className={`text-[11px] font-bold ${accentColor} tabular-nums shrink-0`}>
                                  {member.points.toLocaleString()}
                                </span>
                              </motion.div>
                            ))
                          ) : null}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </motion.div>
              </>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          GRAND FINAL BANNER — Premium glass with shimmer holographic
          ═══════════════════════════════════════════════════════════ */}
      <motion.div
        variants={item}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.985 }}
        transition={springTransition}
        className={`${heroCardClass} rounded-2xl relative overflow-hidden cursor-pointer`}
        onClick={() => setQualifiedModalOpen(true)}
      >
        {/* Shimmer holographic overlay */}
        <div
          className="absolute inset-0 pointer-events-none animate-shimmer"
          style={{
            background: `linear-gradient(
              110deg,
              transparent 20%,
              ${isMale ? 'rgba(255,214,10,0.05)' : 'rgba(56, 189, 248,0.05)'} 35%,
              ${isMale ? 'rgba(255,214,10,0.10)' : 'rgba(56, 189, 248,0.10)'} 50%,
              ${isMale ? 'rgba(255,214,10,0.05)' : 'rgba(56, 189, 248,0.05)'} 65%,
              transparent 80%
            )`,
            backgroundSize: '200% 100%',
          }}
        />

        {/* Accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1.5px]"
          style={{
            background: isMale
              ? 'linear-gradient(90deg, transparent, rgba(255,214,10,0.4) 50%, transparent)'
              : 'linear-gradient(90deg, transparent, rgba(56, 189, 248,0.4) 50%, transparent)',
            boxShadow: isMale
              ? '0 0 16px rgba(255,214,10,0.2)'
              : '0 0 16px rgba(56, 189, 248,0.2)',
          }}
        />

        <div className="relative z-10 flex items-center gap-3.5 p-4 lg:p-6">
          <div
            className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isMale
                ? 'linear-gradient(135deg, rgba(255,214,10,0.16), rgba(229,168,0,0.06))'
                : 'linear-gradient(135deg, rgba(56, 189, 248,0.16), rgba(212,201,31,0.06))',
            }}
          >
            <Trophy className={`w-5 h-5 lg:w-7 lg:h-7 ${accentColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-white/90 tracking-tight leading-snug lg:text-xl">Grand Final</p>
            <p className="text-[12px] text-white/45 mt-0.5 font-normal lg:text-sm">
              12 Pemain teratas yang lolos
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/15 shrink-0 lg:w-5 lg:h-5" />
        </div>
      </motion.div>

      {/* Qualified Players Modal */}
      <QualifiedPlayersModal
        isOpen={qualifiedModalOpen}
        onOpenChange={setQualifiedModalOpen}
        players={qualifiedPlayers}
        division={division}
      />

      {/* All Rankings Modal */}
      <AllRankingsModal
        isOpen={allRankingsModalOpen}
        onOpenChange={setAllRankingsModalOpen}
        players={topPlayers}
        division={division}
      />
        </div>{/* End Main Content */}
      </div>{/* End Desktop Grid Layout */}
    </motion.div>
  );
}
