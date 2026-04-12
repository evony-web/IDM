'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useDivisionTheme } from '@/hooks/useDivisionTheme';
import { ACCENT, GOLD, goldRgba, createDivisionTheme } from '@/lib/theme-tokens';
// Logo comes from useAppSettings().settings.logo_url
import ShareButton from '@/components/esports/ShareButton';
import {
  Trophy,
  Users,
  Calendar,
  Coins,
  Swords,
  Shield,
  Settings,
  ChevronRight,
  ChevronLeft,
  Crown,
  Star,
  Zap,
  Info,
  Heart,
  ArrowRight,
  X,
  Menu,
  Flame,
  Gamepad2,
  ScrollText,
  TrendingUp,
  Bell,
  Play,
  ListChecks,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Medal,
  Wallet,
} from 'lucide-react';
import AdSlot from '@/components/ads/AdSlot';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface LandingPageProps {
  onEnterDivision: (division: 'male' | 'female') => void;
  onAdminLogin: () => void;
  onOpenWallet: () => void;
  onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void;
  preloadedData?: LandingData | null;
}

interface SeasonPoint {
  season: number;
  points: number;
}

interface TopPlayer {
  id?: string;
  rank: number;
  name: string;
  avatar: string | null;
  points: number;
  tier: string;
  isMVP?: boolean;
  mvpScore?: number;
  gender: 'male' | 'female';
  seasonPoints?: SeasonPoint[];
}

interface TournamentInfo {
  name: string;
  status: string;
  week: number;
  prizePool: number;
  participants: number;
}

interface DivisionData {
  topPlayers: TopPlayer[];
  tournament: TournamentInfo | null;
  totalPlayers: number;
  totalDonation: number;
}

interface ClubData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  memberCount: number;
  totalPoints: number;
}

interface MatchResult {
  id: string;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number;
  scoreB: number;
  winnerName: string | null;
  mvpName: string | null;
  mvpAvatar: string | null;
  division: string;
  round: number;
  matchNumber: number;
  completedAt: string;
}

interface AchievementItem {
  id: string;
  type: string;
  name: string;
  icon: string;
  userName: string;
  userAvatar: string | null;
  userGender: string;
  earnedAt: string;
}

interface ChampionData {
  teamName: string | null;
  tierSPlayerName: string | null;
  playerId: string | null;
  playerName: string | null;
  playerAvatar: string | null;
  tournamentName: string | null;
  tournamentWeek: number | null;
  prize: number;
  score: string;
  round: number;
}

interface DonationItem {
  id: string;
  donorName: string;
  donorAvatar: string | null;
  amount: number;
  message: string | null;
  anonymous: boolean;
  createdAt: string;
}

interface SawerItem {
  id: string;
  senderName: string;
  senderAvatar: string | null;
  targetPlayerName: string | null;
  amount: number;
  message: string | null;
  division: string | null;
  createdAt: string;
}

interface ActivityLogItem {
  id: string;
  action: string;
  details: string | null;
  userId: string | null;
  userName: string;
  userAvatar: string | null;
  userGender: string;
  userClub: string | null;
  createdAt: string;
}

type NewsFeedItem = {
  id: string;
  type: 'club_transfer' | 'match_result' | 'achievement' | 'win_streak' | 'tournament_win';
  timestamp: string;
  playerName: string;
  playerAvatar: string | null;
  playerGender: string;
  playerClub: string | null;
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
};

interface LandingData {
  male: DivisionData;
  female: DivisionData;
  totalDonation: number;
  totalSawer: number;
  clubs: ClubData[];
  bannerMaleUrl: string | null;
  bannerFemaleUrl: string | null;
  maleChampion: ChampionData | null;
  femaleChampion: ChampionData | null;
  recentMatches: MatchResult[];
  liveMatches: MatchResult[];
  liveMatchCount: number;
  recentAchievements: AchievementItem[];
  recentDonations: DonationItem[];
  recentSawers: SawerItem[];
  activityLogs: ActivityLogItem[];
}

/* ────────────────────────────────────────────
   Top Navigation Bar (Desktop & Tablet)
   ──────────────────────────────────────────── */

function TopNavBar({
  onEnterDivision,
  onAdminLogin,
  onOpenWallet,
  activeData,
}: {
  onEnterDivision: (division: 'male' | 'female') => void;
  onAdminLogin: () => void;
  onOpenWallet: () => void;
  activeData: LandingData;
}) {
  const [scrolled, setScrolled] = useState(false);
  const { settings } = useAppSettings();
  const logoUrl = settings.logo_url || 'https://res.cloudinary.com/dagoryri5/image/upload/q_auto,f_webp/idm/static/idm-logo.png';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const dtMale = useDivisionTheme('male');
  const dtFemale = useDivisionTheme('female');
  const liveCount = activeData.liveMatchCount || 0;
  const totalPlayers = activeData.male.totalPlayers + activeData.female.totalPlayers;

  const navLinks = [
    { label: 'Male Division', icon: Swords, division: 'male' as const, color: dtMale.accent },
    { label: 'Female Division', icon: Shield, division: 'female' as const, color: dtFemale.accent },
  ];

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          MOBILE HEADER — Apple iOS Clean Style (shows on mobile only)
          ═══════════════════════════════════════════════════════════ */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="md:hidden sticky top-0 z-40 w-full"
        style={{
          background: scrolled
            ? 'rgba(5,5,7,0.92)'
            : 'rgba(5,5,7,0.60)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          borderBottom: `1px solid ${scrolled ? 'var(--border-default)' : 'var(--border-subtle)'}`,
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Accent gradient line */}
        <div
          className="h-[1.5px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${dtMale.accentBg(0.35)} 20%, ${goldRgba(0.30)} 50%, ${dtFemale.accentBg(0.35)} 80%, transparent 100%)`,
          }}
        />

        <div className="flex items-center justify-between px-4 h-[52px]">
          {/* ── Left: Logo + Brand ── */}
          <div className="flex items-center gap-2.5">
            <motion.img
              src={logoUrl}
              alt="Logo"
              className="w-8 h-8 rounded-xl"
              style={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
              whileTap={{ scale: 0.92 }}
            />
            <div className="flex flex-col">
              <h1
                className="text-[14px] font-black tracking-tight leading-none"
                style={{
                  background: `linear-gradient(135deg, ${dtMale.accent}, var(--gold), ${dtFemale.accent})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {settings.app_name}
              </h1>
              <p className="text-[7px] font-semibold tracking-[0.15em] uppercase text-white/20 leading-none mt-0.5">
                {settings.app_subtitle}
              </p>
            </div>

            {/* Live indicator — compact for mobile */}
            {liveCount > 0 && (
              <motion.div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full ml-1.5"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} />
                <span className="text-[8px] font-bold text-red-400 uppercase tracking-wider">LIVE</span>
              </motion.div>
            )}
          </div>

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-2">
            {/* Player count — mini pill */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{
                background: dtMale.accentBg(0.06),
                border: `1px solid ${dtMale.accentBorder(0.12)}`,
              }}
            >
              <Users className="w-3 h-3" style={{ color: dtMale.accent }} />
              <span className="text-[10px] font-bold text-white/60">{totalPlayers}</span>
            </div>

            {/* Share button */}
            <ShareButton
              text={settings.app_share_text}
              compact
            />

            {/* Admin button — min 44px touch target */}
            <motion.button
              onClick={onAdminLogin}
              className="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer"
              style={{
                background: goldRgba(0.06),
                border: `1px solid ${goldRgba(0.12)}`,
              }}
              whileTap={{ scale: 0.88 }}
            >
              <Shield className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════
          Desktop/Tablet NavBar (hidden on mobile)
          ═══════════════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="sticky top-0 z-40 w-full hidden md:block"
        style={{
          background: scrolled
            ? 'rgba(5,5,7,0.85)'
            : 'rgba(5,5,7,0.50)',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
          borderBottom: `1px solid ${scrolled ? 'var(--border-light)' : 'var(--border-subtle)'}`,
        }}
      >
        {/* Top accent line */}
        <div
          className="h-[1px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${dtMale.accentBg(0.3)} 25%, ${goldRgba(0.25)} 50%, ${dtFemale.accentBg(0.3)} 75%, transparent 100%)`,
          }}
        />

        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-12 xl:px-16 h-14">
          {/* ── Left: Logo + Brand ── */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-8 h-8 rounded-lg"
              />
              <div>
                <h1
                  className="text-[15px] font-black tracking-tight leading-none"
                  style={{
                    background: `linear-gradient(135deg, ${dtMale.accent}, var(--gold), ${dtFemale.accent})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {settings.app_name}
                </h1>
                <p className="text-[8px] font-semibold tracking-[0.18em] uppercase text-white/25 leading-none mt-0.5">
                  {settings.app_subtitle}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-7 bg-white/[0.08] mx-2" />

            {/* Live indicator */}
            {liveCount > 0 && (
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.20)',
                }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} />
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">LIVE</span>
              </motion.div>
            )}
          </div>

          {/* ── Center: Nav Links ── */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <motion.button
                  key={link.division}
                  onClick={() => onEnterDivision(link.division)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide uppercase cursor-pointer transition-all duration-200"
                  style={{
                    color: link.color,
                    background: 'rgba(0,0,0,0)',
                    border: '1px solid rgba(0,0,0,0)',
                  }}
                  whileHover={{
                    background: `${link.color}12`,
                    borderColor: `${link.color}25`,
                  }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </motion.button>
              );
            })}

            {/* Leaderboard shortcut */}
            <motion.button
              onClick={() => {
                document.getElementById('leaderboard-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide uppercase cursor-pointer transition-all duration-200 text-white/50"
              style={{
                background: 'rgba(0,0,0,0)',
                border: '1px solid rgba(0,0,0,0)',
              }}
              whileHover={{
                color: 'var(--gold)',
                background: 'rgba(255,215,0,0.06)',
                borderColor: 'rgba(255,215,0,0.15)',
              }}
              whileTap={{ scale: 0.96 }}
            >
              <TrendingUp className="w-4 h-4" />
              Leaderboard
            </motion.button>

            {/* Info shortcut */}
            <motion.button
              onClick={() => {
                document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide uppercase cursor-pointer transition-all duration-200 text-white/50"
              style={{
                background: 'rgba(0,0,0,0)',
                border: '1px solid rgba(0,0,0,0)',
              }}
              whileHover={{
                color: 'var(--gold)',
                background: 'rgba(255,215,0,0.06)',
                borderColor: 'rgba(255,215,0,0.15)',
              }}
              whileTap={{ scale: 0.96 }}
            >
              <ScrollText className="w-4 h-4" />
              Info
            </motion.button>

            {/* Wallet shortcut */}
            <motion.button
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide uppercase cursor-pointer transition-all duration-200 text-white/50"
              style={{
                background: 'rgba(0,0,0,0)',
                border: '1px solid rgba(0,0,0,0)',
              }}
              whileHover={{
                color: 'rgb(115,255,0)',
                background: 'rgba(115,255,0,0.06)',
                borderColor: 'rgba(115,255,0,0.15)',
              }}
              whileTap={{ scale: 0.96 }}
            >
              <Wallet className="w-4 h-4" />
              Wallet
            </motion.button>
          </div>

          {/* ── Right: Stats + Actions ── */}
          <div className="flex items-center gap-3">
            {/* Player count mini */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: dtMale.accentBg(0.06), border: `1px solid ${dtMale.accentBorder(0.10)}` }}
            >
              <Users className="w-3.5 h-3.5" style={{ color: dtMale.accent }} />
              <span className="text-[11px] font-bold text-white/70">{totalPlayers}</span>
              <span className="text-[9px] text-white/30">pemain</span>
            </div>

            {/* Admin button */}
            <motion.button
              onClick={onAdminLogin}
              className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer"
              style={{
                background: goldRgba(0.06),
                border: `1px solid ${goldRgba(0.10)}`,
              }}
              whileHover={{
                background: goldRgba(0.12),
                borderColor: goldRgba(0.20),
              }}
              whileTap={{ scale: 0.92 }}
            >
              <Shield className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ═══════════════════════════════════════════════════════════
          Mobile Bottom Bar — iOS Tab Bar Style (shows on mobile only)
          ═══════════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(5,5,7,0.92)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          borderTop: '1px solid var(--border-light)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around py-2 px-2">
          {/* Home tab */}
          <motion.button
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[52px] min-h-[44px] justify-center rounded-xl cursor-pointer"
            whileTap={{ scale: 0.88 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Gamepad2 className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--gold)' }}>Home</span>
          </motion.button>

          {/* Male Division tab */}
          <motion.button
            onClick={() => onEnterDivision('male')}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[52px] min-h-[44px] justify-center rounded-xl cursor-pointer"
            whileTap={{ scale: 0.88 }}
          >
            <Swords className="w-5 h-5" style={{ color: dtMale.accent }} />
            <span className="text-[9px] font-bold text-white/40 uppercase">Male</span>
          </motion.button>

          {/* Female Division tab */}
          <motion.button
            onClick={() => onEnterDivision('female')}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[52px] min-h-[44px] justify-center rounded-xl cursor-pointer"
            whileTap={{ scale: 0.88 }}
          >
            <Shield className="w-5 h-5" style={{ color: dtFemale.accent }} />
            <span className="text-[9px] font-bold text-white/40 uppercase">Female</span>
          </motion.button>

          {/* Leaderboard tab */}
          <motion.button
            onClick={() => {
              document.getElementById('leaderboard-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[52px] min-h-[44px] justify-center rounded-xl cursor-pointer"
            whileTap={{ scale: 0.88 }}
          >
            <TrendingUp className="w-5 h-5 text-white/30" />
            <span className="text-[9px] font-bold text-white/30 uppercase">Board</span>
          </motion.button>

          {/* Wallet tab */}
          <motion.button
            onClick={onOpenWallet}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[52px] min-h-[44px] justify-center rounded-xl cursor-pointer"
            whileTap={{ scale: 0.88 }}
          >
            <Wallet className="w-5 h-5 text-white/30" />
            <span className="text-[9px] font-bold text-white/30 uppercase">Wallet</span>
          </motion.button>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────
   Animation Variants
   ──────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const statusLabels: Record<string, string> = {
  registration: 'Pendaftaran',
  team_generation: 'Pembuatan Tim',
  bracket_generation: 'Pembuatan Bracket',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
};

const statusColors: Record<string, string> = {
  registration: '#F59E0B',
  team_generation: '#F59E0B',
  bracket_generation: '#F59E0B',
  ongoing: '#73FF00',
  completed: '#94A3B8',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Baru saja';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
  return `${Math.floor(seconds / 86400)} hari lalu`;
}

/* ────────────────────────────────────────────
   Skeleton Loader
   ──────────────────────────────────────────── */

function LandingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 sm:px-6 lg:px-10 xl:px-16 py-4 md:py-8">
      {/* Hero skeleton (matches ChampionCarouselBanner layout) */}
      <div className="w-full mb-6 md:mb-10">
        <div
          className="w-full aspect-[3/2] sm:aspect-[16/5] md:aspect-[16/4.5] rounded-[20px] skeleton-shimmer"
          style={{ background: 'var(--surface-2)' }}
        />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full mb-6 md:mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
            <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-2 w-12 rounded skeleton-shimmer" />
              <div className="h-4 w-16 rounded skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Tournament Cards skeleton (matches DivisionCard layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 w-full mb-6 md:mb-10">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-3xl p-4 md:p-6 space-y-4"
            style={{ background: 'linear-gradient(180deg, var(--surface-3) 0%, var(--surface-1) 100%)', border: '1px solid var(--border-light)' }}
          >
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl skeleton-shimmer" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded skeleton-shimmer" />
                  <div className="h-2 w-16 rounded skeleton-shimmer" />
                </div>
              </div>
              <div className="h-5 w-16 rounded-full skeleton-shimmer" />
            </div>
            {/* Tournament info skeleton */}
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}
            >
              <div className="h-5 w-2/3 rounded skeleton-shimmer" />
              <div className="h-3 w-1/2 rounded skeleton-shimmer" />
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-16 rounded-full skeleton-shimmer" />
                <div className="h-6 w-16 rounded-full skeleton-shimmer" />
              </div>
            </div>
            {/* Top Players skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded skeleton-shimmer" />
                <div className="h-2 w-8 rounded skeleton-shimmer" />
              </div>
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center gap-3 py-1.5 px-2 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                  <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
                  <div className="w-8 h-8 rounded-full skeleton-shimmer" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded skeleton-shimmer" />
                    <div className="h-2 w-1/2 rounded skeleton-shimmer" />
                  </div>
                  <div className="h-4 w-10 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
            {/* Enter button skeleton */}
            <div className="h-12 rounded-xl skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Stat Card
   ──────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, rgba(${color},0.08) 0%, rgba(${color},0.02) 100%)`,
        border: `1px solid rgba(${color},0.12)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, rgba(${color},0.20) 0%, rgba(${color},0.08) 100%)`,
        }}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: `rgb(${color})` }} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[11px] font-medium text-white/40 tracking-wide uppercase truncate">
          {label}
        </p>
        <p className="text-[12px] sm:text-sm font-bold text-white/90 truncate">{value}</p>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Player Row
   ──────────────────────────────────────────── */

function PlayerRow({
  player,
  accent,
  onPlayerClick,
}: {
  player: TopPlayer;
  accent: string;
  onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-1.5 px-2 rounded-xl transition-all duration-150 hover-lift ${player.id ? 'cursor-pointer press-scale hover:bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
      onClick={player.id && onPlayerClick ? () => { onPlayerClick(player.id, player.gender); } : undefined}
      style={{ touchAction: 'manipulation', animationDelay: `${player.rank * 50}ms`, animation: 'fadeInRow 0.3s ease forwards', opacity: 0 }}
    >
      {/* Rank Badge */}
      <div
        className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black flex-shrink-0"
        style={{
          background:
            player.rank === 1
              ? 'linear-gradient(135deg, var(--gold), #FFA500)'
              : player.rank === 2
                ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                : player.rank === 3
                  ? 'linear-gradient(135deg, #CD7F32, #B87333)'
                  : `rgba(${accent},0.10)`,
          color: player.rank <= 3 ? '#000' : `rgb(${accent})`,
        }}
      >
        {player.rank <= 3 ? (
          <Crown className="w-3.5 h-3.5" strokeWidth={2.5} />
        ) : (
          player.rank
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{
          background: player.avatar
            ? `url(${player.avatar}) center/cover`
            : `linear-gradient(135deg, rgba(${accent},0.25), rgba(${accent},0.08))`,
          border: player.isMVP
            ? `1.5px solid var(--gold)`
            : `1.5px solid rgba(${accent},0.20)`,
        }}
      >
        {!player.avatar && (
          <span className="text-[11px] font-bold" style={{ color: `rgb(${accent})` }}>
            {player.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name + Tier */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-white/85 truncate">{player.name}</p>
          {player.isMVP && (
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: goldRgba(0.15),
                color: 'var(--gold)',
                border: `1px solid ${goldRgba(0.25)}`,
              }}
            >
              MVP
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/35">Tier {player.tier}</p>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p
          className="text-[13px] font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {player.points.toLocaleString()}
        </p>
        <p className="text-[9px] text-white/30">pts</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Division Card
   ──────────────────────────────────────────── */

function DivisionCard({
  division,
  data,
  onEnter,
  onPlayerClick,
}: {
  division: 'male' | 'female';
  data: DivisionData;
  onEnter: () => void;
  onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void;
}) {
  const dt = useDivisionTheme(division);
  const label = dt.isMale ? 'MALE DIVISION' : 'FEMALE DIVISION';
  const Icon = dt.isMale ? Swords : Shield;

  return (
    <motion.div
      variants={cardVariants}
      className="relative rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, var(--surface-3) 0%, var(--surface-1) 100%)',
        border: `1px solid ${dt.accentBorder(0.12)}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      whileHover={{ scale: 1.015, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Top gradient accent bar */}
      <div
        className="h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${dt.accentBg(0.5)}, transparent)`,
        }}
      />

      {/* Corner glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${dt.accentBg(0.08)} 0%, transparent 70%)`,
        }}
      />

      <div className="relative p-3 sm:p-4 md:p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${dt.accentBg(0.20)} 0%, ${dt.accentBg(0.06)} 100%)`,
                border: `1px solid ${dt.accentBorder(0.18)}`,
              }}
            >
              <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" style={{ color: dt.accent }} strokeWidth={2} />
            </div>
            <div>
              <h3
                className="text-[11px] sm:text-[13px] font-bold tracking-wider uppercase"
                style={{
                  background: `linear-gradient(135deg, ${dt.accent}, ${dt.accentDark})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {label}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/35 mt-0.5">{data.totalPlayers} pemain terdaftar</p>
            </div>
          </div>

          {/* Status badge */}
          {data.tournament && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{
                background: `${statusColors[data.tournament.status]}15`,
                border: `1px solid ${statusColors[data.tournament.status]}30`,
                color: statusColors[data.tournament.status],
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: statusColors[data.tournament.status],
                  boxShadow: `0 0 6px ${statusColors[data.tournament.status]}50`,
                }}
              />
              {statusLabels[data.tournament.status] || data.tournament.status}
            </div>
          )}
        </div>

        {/* Tournament Info */}
        {data.tournament ? (
          <div
            className="rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 md:mb-4"
            style={{
              background: `linear-gradient(135deg, ${dt.accentBg(0.06)} 0%, ${dt.accentBg(0.02)} 100%)`,
                border: `1px solid ${dt.accentBorder(0.08)}`,
            }}
          >
            <p className="text-[12px] sm:text-[14px] font-bold text-white/90 mb-1.5 sm:mb-2">{data.tournament.name}</p>
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <div>
                <p className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-wider">Minggu</p>
                <p className="text-[11px] sm:text-[13px] font-bold text-white/80 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: dt.accent }} />
                  {data.tournament.week}
                </p>
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-wider">Peserta</p>
                <p className="text-[11px] sm:text-[13px] font-bold text-white/80 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: dt.accent }} />
                  {data.tournament.participants}
                </p>
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-wider">Prize</p>
                <p
                  className="text-[11px] sm:text-[13px] font-bold flex items-center gap-1"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ WebkitTextFillColor: 'var(--gold)' }} />
                  {formatRupiah(data.tournament.prizePool)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 md:mb-4 text-center"
            style={{
              background: 'var(--surface-2)',
                border: '1px solid var(--border-light)',
            }}
          >
            <p className="text-[12px] text-white/30">Belum ada turnamen aktif</p>
          </div>
        )}

        {/* Top Players */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
              <p className="text-[11px] font-semibold text-white/45 tracking-wide uppercase">
                Top Players
              </p>
            </div>
            <span className="text-[10px] text-white/25">{data.topPlayers.length} pemain</span>
          </div>
          <div className="space-y-0.5 max-h-64 sm:max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${dt.accentBg(0.12)} transparent` }}>
            {data.topPlayers.map((player) => (
              <PlayerRow key={player.rank} player={player} accent={dt.accentRgb} onPlayerClick={onPlayerClick} />
            ))}
          </div>
        </div>

        {/* Enter Button */}
        <motion.button
          onClick={onEnter}
          className="w-full mt-3 md:mt-4 flex items-center justify-center gap-2 py-2.5 sm:py-3 md:py-3.5 rounded-xl font-bold text-[11px] sm:text-[12px] md:text-[13px] tracking-wide uppercase cursor-pointer outline-none focus-glow"
          style={{
            background: `linear-gradient(135deg, ${dt.accentBg(0.18)} 0%, ${dt.accentBg(0.08)} 100%)`,
            border: `1.5px solid ${dt.accentBorder(0.25)}`,
            color: dt.accent,
          }}
          whileHover={{
            background: `linear-gradient(135deg, ${dt.accentBg(0.25)} 0%, ${dt.accentBg(0.12)} 100%)`,
            border: `1.5px solid ${dt.accentBorder(0.35)}`,
          }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Zap className="w-4 h-4" />
          MASUK DIVISI
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Reusable player list renderer ── */
function PlayerList({ players, startDelay, onPlayerClick }: { players: TopPlayer[]; startDelay: number; onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void }) {
  return (
    <>
      {players.map((player) => {
        const dt = createDivisionTheme(player.gender);
        return (
          <div
            key={`${player.gender}-${player.rank}`}
            className={`flex items-center gap-3 py-1.5 px-2 rounded-xl transition-all duration-150 hover-lift ${player.id ? 'cursor-pointer press-scale hover:bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
            onClick={player.id && onPlayerClick ? () => { onPlayerClick(player.id, player.gender); } : undefined}
            style={{ touchAction: 'manipulation', animationDelay: `${Math.min(startDelay + player.rank * 30, 1200)}ms`, animation: 'fadeInRow 0.3s ease forwards', opacity: 0 }}
          >
            {/* Rank Badge */}
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black flex-shrink-0"
              style={{
                background:
                  player.rank === 1
                    ? 'linear-gradient(135deg, var(--gold), #FFA500)'
                    : player.rank === 2
                      ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                      : player.rank === 3
                        ? 'linear-gradient(135deg, #CD7F32, #B87333)'
                        : dt.accentBg(0.10),
                color: player.rank <= 3 ? '#000' : dt.accent,
              }}
            >
              {player.rank <= 3 ? (
                <Crown className="w-3.5 h-3.5" strokeWidth={2.5} />
              ) : (
                player.rank
              )}
            </div>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{
                background: player.avatar
                  ? `url(${player.avatar}) center/cover`
                  : `linear-gradient(135deg, ${dt.accentBg(0.25)}, ${dt.accentBg(0.08)})`,
                border: player.isMVP
                  ? `1.5px solid var(--gold)`
                  : `1.5px solid ${dt.accentBorder(0.20)}`,
              }}
            >
              {!player.avatar && (
                <span className="text-[11px] font-bold" style={{ color: dt.accent }}>
                  {player.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name + Tier + Gender Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold truncate" style={{ color: dt.accent }}>{player.name}</p>
                {player.isMVP && (
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: goldRgba(0.15),
                      color: 'var(--gold)',
                      border: `1px solid ${goldRgba(0.25)}`,
                    }}
                  >
                    MVP
                  </span>
                )}
                {/* Gender badge */}
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: dt.accentBg(0.10),
                    color: dt.accent,
                    border: `1px solid ${dt.accentBorder(0.18)}`,
                  }}
                >
                  {dt.isMale ? 'M' : 'F'}
                </span>
              </div>
              <p className="text-[10px] text-white/35">Tier {player.tier}</p>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <p
                className="text-[13px] font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {player.points.toLocaleString()}
              </p>
              <p className="text-[9px] text-white/30">pts</p>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── Inline keyframes for player row fade-in ── */
const playerRowKeyframes = `
@keyframes fadeInRow {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
`;

/* ── Inline keyframes for #1 sawer fire glow ── */
const fireGlowKeyframes = `
@keyframes fireGlow {
  0%, 100% { box-shadow: 0 0 25px rgba(255,107,53,0.25), 0 0 50px rgba(244,114,182,0.15), 0 0 80px rgba(255,215,0,0.08), inset 0 0 15px rgba(255,107,53,0.06); }
  33% { box-shadow: 0 0 35px rgba(255,107,53,0.35), 0 0 70px rgba(244,114,182,0.20), 0 0 100px rgba(255,215,0,0.12), inset 0 0 20px rgba(255,107,53,0.10); }
  66% { box-shadow: 0 0 30px rgba(255,69,0,0.30), 0 0 60px rgba(244,114,182,0.18), 0 0 90px rgba(255,165,0,0.10), inset 0 0 18px rgba(255,69,0,0.08); }
}
`;

/* ────────────────────────────────────────────
   Clubs Carousel Section
   ──────────────────────────────────────────── */

function ClubsCarousel({ clubs }: { clubs: ClubData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // ── Auto-scroll carousel every 7 seconds (pauses on hover & user scroll) ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || clubs.length === 0) return;

    const startAutoScroll = () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      autoScrollRef.current = setInterval(() => {
        if (isHovered || isUserScrolling || !el) return;
        const cardEl = el.querySelector('[data-club-card]') as HTMLElement | null;
        const cardWidth = cardEl?.offsetWidth || 180;
        const gap = 16;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 4) return; // All clubs visible, no scroll needed
        if (el.scrollLeft >= maxScroll - 4) {
          // Reset to start smoothly
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: cardWidth + gap, behavior: 'smooth' });
        }
      }, 7000);
    };

    startAutoScroll();
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [clubs, isHovered, isUserScrolling]);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollButtons, { passive: true });
      window.addEventListener('resize', updateScrollButtons);
    }
    return () => {
      el?.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [clubs]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardEl = el.querySelector('[data-club-card]') as HTMLElement | null;
    const cardWidth = cardEl?.offsetWidth || 180;
    const gap = 16;
    const visible = Math.floor(el.clientWidth / (cardWidth + gap));
    const scrollAmount = (cardWidth + gap) * Math.max(1, Math.floor(visible * 0.7));
    el.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (clubs.length === 0) return null;

  return (
    <motion.div variants={itemVariants} className="w-full max-w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: '#38BDF8' }} />
          <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Club Terdaftar</h2>
          <span className="text-[11px] text-white/25 ml-1">{clubs.length} club</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default transition-opacity"
            style={{
              background: canScrollLeft ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid rgba(255,255,255,${canScrollLeft ? '0.08' : '0.03'})`,
            }}
            whileHover={canScrollLeft ? { scale: 1.08 } : {}}
            whileTap={canScrollLeft ? { scale: 0.92 } : {}}
          >
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </motion.button>
          <motion.button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default transition-opacity"
            style={{
              background: canScrollRight ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid rgba(255,255,255,${canScrollRight ? '0.08' : '0.03'})`,
            }}
            whileHover={canScrollRight ? { scale: 1.08 } : {}}
            whileTap={canScrollRight ? { scale: 0.92 } : {}}
          >
            <ChevronRight className="w-4 h-4 text-white/60" />
          </motion.button>
        </div>
      </div>

      {/* Scrollable container - hidden scrollbar, auto-scroll on hover pause */}
      <div
        ref={scrollRef}
        data-club-scroll=""
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => {
          setIsUserScrolling(true);
          if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
        }}
        onTouchEnd={() => {
          if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
          userScrollTimeoutRef.current = setTimeout(() => setIsUserScrolling(false), 3000);
        }}
        onWheel={() => {
          setIsUserScrolling(true);
          if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
          userScrollTimeoutRef.current = setTimeout(() => setIsUserScrolling(false), 3000);
        }}
      >
        <style>{`[data-club-scroll]::-webkit-scrollbar{display:none}`}</style>
        {clubs.map((club, idx) => (
          <motion.div
            key={club.id}
            data-club-card=""
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className={`relative flex-shrink-0 w-[calc(33.333%-11px)] sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(14.286%-14px)] overflow-hidden rounded-2xl`}
            style={{
              background: club.name === 'GYMSHARK'
                ? 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: club.name === 'GYMSHARK'
                ? 'none'
                : '1px solid rgba(255,255,255,0.06)',
            }}
            whileHover={{
              y: -3,
              transition: { type: 'spring', stiffness: 400, damping: 25 },
            }}
          >
            {club.name === 'GYMSHARK' && (
              <svg className="absolute inset-[-2px] w-[calc(100%+4px)] h-[calc(100%+4px)] pointer-events-none" style={{ zIndex: 0 }} viewBox="0 0 200 200" preserveAspectRatio="none" fill="none">
                <defs>
                  <linearGradient id="gymNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#73FF00" />
                    <stop offset="50%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#73FF00" />
                  </linearGradient>
                  <filter id="gymNeonGlow">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect x="1" y="1" width="198" height="198" rx="16" ry="16" stroke="url(#gymNeonGrad)" strokeWidth="1" strokeDasharray="275 325" strokeLinecap="round" filter="url(#gymNeonGlow)">
                  <animate attributeName="stroke-dashoffset" from="0" to="-600" dur="3s" repeatCount="indefinite" />
                </rect>
              </svg>
            )}
            {/* Club Logo Area */}
            <div
              className="relative w-full aspect-square flex items-center justify-center overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(115,255,0,0.03) 100%)',
              }}
            >
              {club.logoUrl ? (
                <img
                  src={club.logoUrl}
                  alt={club.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-[80%] h-[80%] rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(115,255,0,0.08) 100%)',
                    border: '1px solid rgba(56,189,248,0.12)',
                  }}
                >
                  <span
                    className="text-3xl md:text-4xl font-black"
                    style={{
                      background: 'linear-gradient(135deg, #38BDF8, #73FF00)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {club.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Rank badge top-right */}
              <div
                className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    idx === 0
                      ? 'linear-gradient(135deg, var(--gold), #FFA500)'
                      : idx === 1
                        ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                        : idx === 2
                          ? 'linear-gradient(135deg, #CD7F32, #B87333)'
                          : 'rgba(255,255,255,0.06)',
                  color: idx <= 2 ? '#000' : 'rgba(255,255,255,0.35)',
                }}
              >
                <span className="text-[10px] font-bold">{idx + 1}</span>
              </div>
            </div>

            {/* Club Info */}
            <div className="p-2 sm:p-3">
              <p className="text-[11px] sm:text-[13px] font-bold text-white/85 truncate">{club.name}</p>
              <div className="flex items-center justify-between mt-1 sm:mt-1.5">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-white/30" />
                  <span className="text-[10px] sm:text-[11px] text-white/40">{club.memberCount}</span>
                </div>
                <span
                  className="text-[10px] sm:text-[11px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {club.totalPoints.toLocaleString()} pts
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Quick Info Section
   ──────────────────────────────────────────── */

// Icon map for QuickInfo — maps icon name string to Lucide component
const QUICK_INFO_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>> = {
  Info,
  Calendar,
  Heart,
  Trophy,
  Users,
  Coins,
  Swords,
  Shield,
  Star,
  Zap,
  Bell,
  Gamepad2,
  ScrollText,
  TrendingUp,
};

interface QuickInfoItem {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const DEFAULT_QUICK_INFO: QuickInfoItem[] = [
  { icon: 'Info', title: 'Cara Daftar', description: 'Pergi ke halaman Tournament di divisi pilihanmu, isi formulir pendaftaran dengan data diri yang valid. Tunggu approval dari admin.', color: '115,255,0' },
  { icon: 'Calendar', title: 'Jadwal Turnamen', description: 'Turnamen diadakan setiap minggu. Jadwal dan detail mode akan diumumkan melalui dashboard masing-masing divisi.', color: '56,189,248' },
  { icon: 'Heart', title: 'Donasi & Sawer', description: 'Dukung turnamen dengan donasi atau sawer ke pemain favoritmu! Semua donasi akan masuk ke prize pool.', color: '244,114,182' },
];

/* ────────────────────────────────────────────
   Video Highlight Section (YouTube Embed Cards)
   ──────────────────────────────────────────── */

interface VideoHighlightItem {
  id: string;
  title: string;
  youtubeUrl: string;
  division: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function VideoHighlightSection({ division }: { division: 'male' | 'female' | 'all' }) {
  const [highlights, setHighlights] = useState<VideoHighlightItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/video-highlights?division=${division}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.success && Array.isArray(data.data)) {
          setHighlights(data.data);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [division]);

  if (!loaded) return null;

  // Show placeholder when no highlights available (keep the 3-column layout intact)
  if (highlights.length === 0) {
    return (
      <motion.div variants={itemVariants} className="w-full max-w-full md:h-full md:flex md:flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-4 h-4" style={{ color: '#FF6B35' }} />
          <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Highlight</h2>
        </div>
        <div
          className="rounded-2xl flex-1 flex flex-col items-center justify-center py-12 px-4"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,107,53,0.06)',
          }}
        >
          <Play className="w-8 h-8 text-white/10 mb-3" />
          <p className="text-[12px] text-white/25 text-center">Belum ada video highlight</p>
          <p className="text-[10px] text-white/15 mt-1 text-center">Tambahkan dari panel admin</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="w-full max-w-full md:h-full md:flex md:flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-4 h-4" style={{ color: '#FF6B35' }} />
        <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Highlight</h2>
        <span className="text-[9px] text-white/20 ml-0.5">({highlights.length})</span>
      </div>

      {/* Video Cards — single column for the middle panel */}
      <div className="space-y-3 md:flex-1 md:overflow-y-auto md:max-h-[520px] pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,107,53,0.15) transparent' }}>
        {highlights.slice(0, 5).map((highlight, idx) => {
          const videoId = extractYouTubeId(highlight.youtubeUrl);
          if (!videoId) return null;

          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          const isPlaying = activeVideo === highlight.id;

          return (
            <motion.div
              key={highlight.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              className="rounded-2xl overflow-hidden relative group"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,53,0.06) 0%, rgba(244,114,182,0.04) 50%, rgba(255,215,0,0.03) 100%)',
                border: '1px solid rgba(255,107,53,0.10)',
              }}
            >
              {/* Video area */}
              <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                {isPlaying ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                    title={highlight.title}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    style={{ border: 'none' }}
                  />
                ) : (
                  <>
                    {/* Thumbnail */}
                    <img
                      src={thumbnailUrl}
                      alt={highlight.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />
                    {/* Play button */}
                    <motion.button
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={() => setActiveVideo(highlight.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,107,53,0.90), rgba(255,69,0,0.85))',
                          boxShadow: '0 0 16px rgba(255,107,53,0.4), 0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        <Play className="w-4 h-4 text-white ml-0.5" fill="white" strokeWidth={0} />
                      </div>
                    </motion.button>
                    {/* YouTube badge */}
                    <div
                      className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-white"
                      style={{ background: 'rgba(0,0,0,0.75)' }}
                    >
                      ▶ YouTube
                    </div>
                  </>
                )}
              </div>
              {/* Title */}
              <div className="p-2.5">
                <p className="text-[11px] font-semibold text-white/80 truncate">{highlight.title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {highlight.division !== 'all' && (
                    <span
                      className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: highlight.division === 'male' ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)',
                        color: highlight.division === 'male' ? '#73FF00' : '#38BDF8',
                        border: `1px solid ${highlight.division === 'male' ? 'rgba(115,255,0,0.15)' : 'rgba(56,189,248,0.15)'}`,
                      }}
                    >
                      {highlight.division === 'male' ? 'MALE' : 'FEMALE'}
                    </span>
                  )}
                  {highlight.division === 'all' && (
                    <span
                      className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(255,107,53,0.08)',
                        color: '#FF6B35',
                        border: '1px solid rgba(255,107,53,0.15)',
                      }}
                    >
                      ALL
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Season Points Leaderboard — Card-based layout with season chips
   Scales to any number of seasons — no column overflow
   ──────────────────────────────────────────── */

interface SeasonLeaderboardPlayer {
  id: string;
  name: string;
  avatar: string | null;
  gender: string;
  tier: string;
  isMVP: boolean;
  currentPoints: number;
  clubName: string | null;
  seasonPoints: Array<{ season: number; points: number }>;
  totalSeasonPoints: number;
}

/* ────────────────────────────────────────────
   UNIFIED LEADERBOARD — Season Points Only (clean list, no podium)
   ──────────────────────────────────────────── */

function UnifiedLeaderboard({ data, onPlayerClick }: { data: LandingData; onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void }) {
  const [seasonPlayers, setSeasonPlayers] = useState<SeasonLeaderboardPlayer[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [currentSeason, setCurrentSeason] = useState<number>(1);
  const [seasonLoaded, setSeasonLoaded] = useState(false);
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>(1); // Default to current season
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const seasonDropdownRef = useRef<HTMLDivElement>(null);

  // Helper to process API response
  const processSeasonData = (json: any) => {
    if (json?.success && json.data) {
      const players = json.data.players || [];
      const seasonList = json.data.seasons || [];
      const cs = json.data.currentSeason || 1;
      setSeasonPlayers(players);
      setSeasons(seasonList);
      setCurrentSeason(cs);
      return { players, seasonList, cs };
    }
    return null;
  };

  // Fetch season data on mount
  useEffect(() => {
    let cancelled = false;
    const genderParam = filterGender === 'all' ? '' : `?gender=${filterGender}`;
    fetch(`/api/season-leaderboard${genderParam}`)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!cancelled) {
          const result = processSeasonData(json);
          if (result) {
            // Set selected season to current season on first load
            setSelectedSeason(result.cs);
          }
          setSeasonLoaded(true);
        }
      })
      .catch(() => { if (!cancelled) setSeasonLoaded(true); });
    return () => { cancelled = true; };
  }, [filterGender]);

  // Real-time update from admin panel
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('idm-player-seasons');
    const handler = () => {
      const genderParam = filterGender === 'all' ? '' : `?gender=${filterGender}`;
      fetch(`/api/season-leaderboard${genderParam}`)
        .then(res => res.ok ? res.json() : null)
        .then(json => {
          processSeasonData(json);
        })
        .catch(() => {});
    };
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
  }, [filterGender]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(e.target as Node)) {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Compute season-filtered players
  const displaySeasonPlayers = useMemo(() => {
    if (selectedSeason === 'all') {
      return [...seasonPlayers].sort((a, b) => b.totalSeasonPoints - a.totalSeasonPoints);
    }
    return [...seasonPlayers].sort((a, b) => {
      const aSP = a.seasonPoints.find(sp => sp.season === selectedSeason)?.points ?? 0;
      const bSP = b.seasonPoints.find(sp => sp.season === selectedSeason)?.points ?? 0;
      return bSP - aSP;
    }).filter(p => {
      const sp = p.seasonPoints.find(s => s.season === selectedSeason);
      return sp && sp.points > 0;
    });
  }, [seasonPlayers, selectedSeason]);

  const visiblePlayers = displaySeasonPlayers;
  const hasMore = false;

  const genderFilters = [
    { key: 'all' as const, label: 'Semua', color: 'var(--gold)' },
    { key: 'male' as const, label: 'Male', color: ACCENT.male.primary },
    { key: 'female' as const, label: 'Female', color: ACCENT.female.primary },
  ];

  // ── Shared player row renderer ──
  const renderPlayerRow = (player: SeasonLeaderboardPlayer, idx: number, isExpanded: boolean, onToggle: () => void) => {
    const rank = idx + 1;
    const pDt = createDivisionTheme(player.gender as 'male' | 'female');
    const accentHex = pDt.accent;
    const accentRGB = pDt.accentRgb;

    const displayPoints = selectedSeason === 'all'
      ? player.totalSeasonPoints
      : (player.seasonPoints.find(sp => sp.season === selectedSeason)?.points ?? 0);

    if (selectedSeason !== 'all' && displayPoints === 0) return null;

    // Rank badge colors
    const rankBg = rank === 1
      ? 'linear-gradient(135deg, var(--gold), #FFA500)'
      : rank === 2
        ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
        : rank === 3
          ? 'linear-gradient(135deg, #CD7F32, #B87333)'
          : pDt.accentBg(0.08);
    const rankColor = rank <= 3 ? '#000' : pDt.accent;
    const rankShadow = rank <= 3
      ? `0 2px 16px ${rank === 1 ? goldRgba(0.25) : rank === 2 ? 'rgba(192,192,192,0.20)' : 'rgba(205,127,50,0.20)'}`
      : 'none';

    return (
      <div key={player.id}>
        {/* ── Main Row ── */}
        <div
          className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 cursor-pointer transition-colors duration-150 hover:bg-white/[0.02] press-scale hover-lift"
          onClick={onToggle}
        >
          {/* Rank Badge */}
          <div
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-[14px] sm:text-[16px] font-black flex-shrink-0"
            style={{ background: rankBg, color: rankColor, boxShadow: rankShadow }}
          >
            {rank <= 3 ? <Crown className="w-4.5 h-4.5 sm:w-5 sm:h-5" strokeWidth={2.5} /> : rank}
          </div>

          {/* Avatar */}
          <div
            className="w-11 h-11 sm:w-13 sm:h-13 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={{
              background: player.avatar
                ? `url(${player.avatar}) center/cover`
                : `linear-gradient(135deg, ${pDt.accentBg(0.25)}, ${pDt.accentBg(0.08)})`,
              border: player.isMVP
                ? '2.5px solid var(--gold)'
                : `2px solid ${pDt.accentBorder(0.25)}`,
              boxShadow: player.isMVP ? `0 0 12px ${goldRgba(0.20)}` : 'none',
            }}
          >
            {!player.avatar && (
              <span className="text-[14px] sm:text-[16px] font-bold" style={{ color: pDt.accent }}>
                {player.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name + Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[14px] sm:text-[16px] font-bold text-white/90 truncate">{player.name}</p>
              {player.isMVP && (
                <span
                  className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: goldRgba(0.15), color: 'var(--gold)', border: `1px solid ${goldRgba(0.25)}` }}
                >
                  MVP
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: player.tier === 'S' ? goldRgba(0.12) : player.tier === 'A' ? pDt.accentBg(0.10) : 'var(--surface-4)',
                  color: player.tier === 'S' ? 'var(--gold)' : player.tier === 'A' ? pDt.accent : 'var(--text-quaternary)',
                }}
              >
                Tier {player.tier}
              </span>
              {player.clubName && (
                <span className="text-[10px] sm:text-[11px] text-white/30 truncate">{player.clubName}</span>
              )}
            </div>
          </div>

          {/* Points */}
          <div className="text-right flex-shrink-0 flex flex-col items-end">
            <p
              className="text-[18px] sm:text-[22px] font-black leading-none"
              style={{
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {displayPoints.toLocaleString()}
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/30 mt-1">
              {selectedSeason === 'all' ? 'total pts' : `S${selectedSeason} pts`}
            </p>
            {selectedSeason === 'all' && player.seasonPoints.length > 0 && (
              <motion.div
                className="flex items-center gap-1 mt-0.5"
                animate={{ opacity: isExpanded ? 0.4 : 0.6 }}
              >
                <span className="text-[8px] text-white/20">{player.seasonPoints.length} season</span>
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3 h-3 text-white/20" />
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Expandable Season Breakdown ── */}
        <AnimatePresence>
          {selectedSeason === 'all' && isExpanded && player.seasonPoints.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {player.seasonPoints.map(sp => (
                    <div
                      key={sp.season}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                      style={{
                        background: sp.points > 0 ? pDt.accentBg(0.06) : 'var(--surface-1)',
                        border: `1px solid ${sp.points > 0 ? pDt.accentBorder(0.12) : 'var(--border-subtle)'}`,
                      }}
                    >
                      <span className="text-[11px] sm:text-[12px] font-bold text-white/40">S{sp.season}</span>
                      <span className="text-[12px] sm:text-[13px] font-bold" style={{ color: sp.points > 0 ? accentHex : 'var(--border-strong)' }}>
                        {sp.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div variants={itemVariants} className="w-full max-w-full">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${goldRgba(0.18)} 0%, ${goldRgba(0.06)} 100%)`,
              border: `1px solid ${goldRgba(0.22)}`,
            }}
          >
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <h2 className="text-[19px] sm:text-[22px] font-black text-white/90 tracking-tight">Leaderboard</h2>
            <p className="text-[11px] sm:text-[12px] text-white/35 mt-0.5">
              {seasonLoaded
                ? `${displaySeasonPlayers.length} pemain • Season ${currentSeason} sedang berjalan`
                : 'Memuat data...'}
            </p>
          </div>
        </div>

        {/* ═══ Season Selector + Gender Filter ═══ */}
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          {/* Season Dropdown */}
          <div className="relative min-w-0" ref={seasonDropdownRef}>
            <motion.button
              onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
              className="flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl cursor-pointer focus-glow"
              style={{
                background: `linear-gradient(135deg, ${goldRgba(0.08)} 0%, ${goldRgba(0.03)} 100%)`,
                border: `1px solid ${goldRgba(0.15)}`,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: selectedSeason === 'all'
                      ? 'linear-gradient(135deg, rgba(255,215,0,0.20), rgba(255,215,0,0.08))'
                      : selectedSeason === currentSeason
                        ? 'linear-gradient(135deg, rgba(115,255,0,0.20), rgba(115,255,0,0.08))'
                        : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${selectedSeason === 'all' ? 'rgba(255,215,0,0.25)' : selectedSeason === currentSeason ? 'rgba(115,255,0,0.25)' : 'rgba(255,255,255,0.10)'}`,
                  }}
                >
                  {selectedSeason === 'all' ? (
                    <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--gold)' }} />
                  ) : (
                    <span className="text-[10px] sm:text-[12px] font-black" style={{ color: selectedSeason === currentSeason ? '#73FF00' : 'rgba(255,255,255,0.5)' }}>S{selectedSeason}</span>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <p className="text-[12px] sm:text-[14px] font-bold truncate" style={{ color: selectedSeason === 'all' ? 'var(--gold)' : selectedSeason === currentSeason ? '#73FF00' : 'rgba(255,255,255,0.6)' }}>
                      {selectedSeason === 'all' ? 'All' : `S${selectedSeason}`}
                    </p>
                    {selectedSeason === currentSeason && (
                      <span className="text-[7px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(115,255,0,0.12)', color: '#73FF00', border: '1px solid rgba(115,255,0,0.20)' }}>AKTIF</span>
                    )}
                  </div>
                </div>
              </div>
              <motion.div animate={{ rotate: seasonDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/30" />
              </motion.div>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {seasonDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full left-0 mt-2 rounded-xl overflow-hidden z-30 min-w-[200px] sm:min-w-[260px]"
                  style={{
                    background: 'rgba(18,18,22,0.98)',
                    border: '1px solid rgba(255,215,0,0.15)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(255,215,0,0.05)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <button
                    onClick={() => { setSelectedSeason('all'); setSeasonDropdownOpen(false); setExpandedPlayer(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer"
                    style={{
                      background: selectedSeason === 'all' ? 'rgba(255,215,0,0.08)' : 'transparent',
                      borderLeft: selectedSeason === 'all' ? '3px solid #FFD700' : '3px solid transparent',
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,215,0,0.10)', border: '1px solid rgba(255,215,0,0.18)' }}>
                      <Medal className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[13px] font-bold" style={{ color: selectedSeason === 'all' ? 'var(--gold)' : 'rgba(255,255,255,0.7)' }}>All Seasons (Total)</p>
                      <p className="text-[10px] text-white/25">Akumulasi semua season</p>
                    </div>
                    {selectedSeason === 'all' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)', boxShadow: '0 0 6px rgba(255,215,0,0.5)' }} />}
                  </button>

                  <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                  <div className="max-h-60 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,215,0,0.12) transparent' }}>
                    {seasons.map(s => {
                      const playerCount = seasonPlayers.filter(p => {
                        const sp = p.seasonPoints.find(sp => sp.season === s);
                        return sp && sp.points > 0;
                      }).length;
                      return (
                        <button
                          key={s}
                          onClick={() => { setSelectedSeason(s); setSeasonDropdownOpen(false); setExpandedPlayer(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer"
                          style={{
                            background: selectedSeason === s ? 'rgba(115,255,0,0.06)' : 'transparent',
                            borderLeft: selectedSeason === s ? '3px solid #73FF00' : '3px solid transparent',
                          }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(115,255,0,0.08)', border: '1px solid rgba(115,255,0,0.12)' }}>
                            <span className="text-[12px] font-black" style={{ color: '#73FF00' }}>S{s}</span>
                          </div>
                          <div className="text-left flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-bold" style={{ color: selectedSeason === s ? '#73FF00' : 'rgba(255,255,255,0.7)' }}>Season {s}</p>
                              {s === currentSeason && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(115,255,0,0.12)', color: '#73FF00', border: '1px solid rgba(115,255,0,0.20)' }}>AKTIF</span>
                              )}
                            </div>
                            <p className="text-[10px] text-white/25">{playerCount} pemain berpoints</p>
                          </div>
                          {selectedSeason === s && <div className="w-2 h-2 rounded-full" style={{ background: '#73FF00', boxShadow: '0 0 6px rgba(115,255,0,0.5)' }} />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {genderFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterGender(f.key)}
                className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-[12px] font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer press-scale focus-glow"
                style={{
                  background: filterGender === f.key ? `${f.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${filterGender === f.key ? `${f.color}28` : 'rgba(255,255,255,0.06)'}`,
                  color: filterGender === f.key ? f.color : 'rgba(255,255,255,0.35)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Player List ═══ */}
      {!seasonLoaded ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
              <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded skeleton-shimmer" />
                <div className="h-2 w-1/2 rounded skeleton-shimmer" />
              </div>
              <div className="h-4 w-12 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : seasonPlayers.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 px-4"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,215,0,0.06)',
          }}
        >
          <BarChart3 className="w-12 h-12 text-white/10 mb-3" />
          <p className="text-[14px] text-white/25 text-center font-medium">Belum ada data season points</p>
          <p className="text-[12px] text-white/15 mt-1 text-center">Tambahkan dari panel admin tab Peserta</p>
        </div>
      ) : displaySeasonPlayers.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 px-4"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,215,0,0.06)',
          }}
        >
          <BarChart3 className="w-12 h-12 text-white/10 mb-3" />
          <p className="text-[14px] text-white/25 text-center font-medium">
            {selectedSeason === 'all'
              ? 'Belum ada data season points'
              : `Belum ada data untuk Season ${selectedSeason}`}
          </p>
          <p className="text-[12px] text-white/15 mt-1 text-center">
            {selectedSeason === currentSeason
              ? 'Season sedang berjalan, points belum ditambahkan'
              : 'Coba pilih season lain dari dropdown'}
          </p>
        </div>
      ) : (
        <>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.02)',
              animation: 'fade-in-up 0.5s ease-out',
              border: '1px solid rgba(255,215,0,0.08)',
            }}
          >
            {/* Top accent line for the card */}
            <div
              className="h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.25), transparent)' }}
            />

            <div className="divide-y divide-white/[0.04]">
              {visiblePlayers.map((player, idx) => {
                const isExpanded = expandedPlayer === player.id;
                return renderPlayerRow(player, idx, isExpanded, () => {
                  if (selectedSeason === 'all') {
                    setExpandedPlayer(isExpanded ? null : player.id);
                  } else if (onPlayerClick) {
                    onPlayerClick(player.id, player.gender as 'male' | 'female');
                  }
                });
              })}
            </div>

          </div>
        </>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Landing Content Section — Rules
   Card layout above footer, managed from admin panel
   ──────────────────────────────────────────── */

interface RulesData {
  title: string;
  items: string[];
}

const LANDING_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>> = {
  Info, Calendar, Heart, Trophy, Users, Coins, Swords, Shield, Star, Zap, Bell, Gamepad2, ScrollText, TrendingUp,
};

const DEFAULT_RULES: RulesData = {
  title: 'Rules',
  items: [
    'Wajib menggunakan akun yang terdaftar di platform.',
    'Peserta wajib hadir 15 menit sebelum turnamen dimulai.',
    'Penggunaan cheat/exploit akan mengakibatkan diskualifikasi.',
    'Keputusan admin bersifat final dan tidak dapat diganggu gugat.',
    'Turnamen menggunakan sistem single elimination.',
  ],
};

function LandingContentSection() {
  const [rules, setRules] = useState<RulesData>(DEFAULT_RULES);
  const [loaded, setLoaded] = useState(false);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/landing-content')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.success) {
          if (data.rules) setRules(data.rules);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Real-time update from admin panel
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('idm-landing-content');
    const handler = () => {
      fetch('/api/admin/landing-content')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.success) {
            if (data.rules) setRules(data.rules);
          }
        })
        .catch(() => {});
    };
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
  }, []);

  if (!loaded) return null;

  return (
    <motion.div variants={itemVariants} className="w-full max-w-full">
      <div className="w-full">
        {/* ═══ RULES CARD ═══ */}
        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(255,107,53,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,107,53,0.08)',
          }}
          whileHover={{ borderColor: 'rgba(255,107,53,0.15)', y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 pb-3 border-b border-white/[0.04]">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(255,107,53,0.04) 100%)',
                border: '1px solid rgba(255,107,53,0.10)',
              }}
            >
              <ListChecks className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-white/80 tracking-wide">{rules.title}</h2>
              <p className="text-[10px] text-white/25 mt-0.5">Peraturan turnamen</p>
            </div>
          </div>
          {/* Rules list */}
          <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,107,53,0.12) transparent' }}>
            {rules.items.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(255,107,53,0.06) 100%)',
                    color: 'rgba(255,107,53,0.7)',
                  }}
                >
                  {idx + 1}
                </div>
                <p className="text-[12px] text-white/45 leading-relaxed">{rule}</p>
              </div>
            ))}
            {rules.items.length === 0 && (
              <p className="text-[12px] text-white/20 text-center py-6">Belum ada rules ditambahkan</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function QuickInfoSection() {
  const [infoItems, setInfoItems] = useState<QuickInfoItem[]>(DEFAULT_QUICK_INFO);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/quick-info')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.success && Array.isArray(data.items) && data.items.length > 0) {
          setInfoItems(data.items);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.div variants={itemVariants} className="w-full max-w-full">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4" style={{ color: 'var(--gold)' }} />
        <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Informasi</h2>
      </div>

      {/* Mobile: horizontal scroll, Desktop: grid */}
      <div className="flex gap-3 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible" style={{ scrollbarWidth: 'none' }}>
        <style>{`.flex.gap-3::-webkit-scrollbar{display:none}`}</style>
        {infoItems.map((item, idx) => {
          const IconComponent = QUICK_INFO_ICON_MAP[item.icon] || Info;
          return (
            <motion.div
              key={idx}
              className="flex-shrink-0 w-[260px] md:w-auto rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, rgba(${item.color},0.05) 0%, rgba(${item.color},0.01) 100%)`,
                border: `1px solid rgba(${item.color},0.08)`,
              }}
              whileHover={{
                borderColor: `rgba(${item.color},0.15)`,
                y: -2,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{
                  background: `linear-gradient(135deg, rgba(${item.color},0.15) 0%, rgba(${item.color},0.05) 100%)`,
                }}
              >
                <IconComponent className="w-4 h-4" style={{ color: `rgb(${item.color})` }} strokeWidth={2} />
              </div>
              <h3 className="text-[13px] font-bold text-white/80 mb-1.5">{item.title}</h3>
              <p className="text-[11px] text-white/35 leading-relaxed">{item.description}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Informasi Terbaru Section (News Feed)
   Combines: club transfers, match results, achievements, win streaks
   ──────────────────────────────────────────── */

function InformasiTerbaruSection({ data, onPlayerClick }: { data: LandingData; onPlayerClick?: (playerId: string, gender: 'male' | 'female') => void }) {
  // Build unified news feed from all sources
  const newsItems: NewsFeedItem[] = [];

  // 1. Club transfers from activity logs
  if (data.activityLogs && Array.isArray(data.activityLogs)) {
    data.activityLogs.forEach((log) => {
      const isMale = log.userGender === 'male';
      const dt = createDivisionTheme(log.userGender as 'male' | 'female');
      const accent = dt.accentRgb;

      if (log.action === 'club_transfer') {
        try {
          const details = log.details ? JSON.parse(log.details) : {};
          const from = details.from || 'Tanpa Club';
          const to = details.to || 'Tanpa Club';
          newsItems.push({
            id: `transfer-${log.id}`,
            type: 'club_transfer',
            timestamp: log.createdAt,
            playerName: log.userName,
            playerAvatar: log.userAvatar,
            playerGender: log.userGender,
            playerClub: log.userClub,
            icon: '🔄',
            title: `${log.userName} berpindah club`,
            subtitle: `${from} → ${to}`,
            accent,
          });
        } catch { /* skip malformed */ }
      }

      if (log.action === 'win_streak') {
        try {
          const details = log.details ? JSON.parse(log.details) : {};
          newsItems.push({
            id: `streak-${log.id}`,
            type: 'win_streak',
            timestamp: log.createdAt,
            playerName: log.userName,
            playerAvatar: log.userAvatar,
            playerGender: log.userGender,
            playerClub: log.userClub,
            icon: '🔥',
            title: `${log.userName} Win Streak ${details.streak || 3}×!`,
            subtitle: `${details.streak || 3} kali menang beruntun`,
            accent: '255,165,0',
          });
        } catch { /* skip malformed */ }
      }

      if (log.action === 'tournament_win') {
        try {
          const details = log.details ? JSON.parse(log.details) : {};
          newsItems.push({
            id: `twin-${log.id}`,
            type: 'tournament_win',
            timestamp: log.createdAt,
            playerName: log.userName,
            playerAvatar: log.userAvatar,
            playerGender: log.userGender,
            playerClub: log.userClub,
            icon: '🏆',
            title: `${log.userName} juara turnamen!`,
            subtitle: details.tournamentName || details.division || '',
            accent,
          });
        } catch { /* skip malformed */ }
      }
    });
  }

  // 2. Match results from recentMatches
  data.recentMatches.forEach((match) => {
    const isMale = match.division === 'male';
    const dt = createDivisionTheme(match.division as 'male' | 'female');
    const accent = dt.accentRgb;
    const matchLabel = match.round >= 3 ? 'Final' : match.round === 2 ? 'Semi-Final' : `R${match.round}`;
    newsItems.push({
      id: `match-${match.id}`,
      type: 'match_result',
      timestamp: match.completedAt,
      playerName: match.winnerName || 'Unknown',
      playerAvatar: match.mvpAvatar,
      playerGender: isMale ? 'male' : 'female',
      playerClub: null,
      icon: '⚔️',
      title: `Hasil ${matchLabel}: ${match.teamAName || 'TBD'} ${match.scoreA} - ${match.scoreB} ${match.teamBName || 'TBD'}`,
      subtitle: match.winnerName ? `🏆 ${match.winnerName} menang${match.mvpName ? ` · MVP: ${match.mvpName}` : ''}` : '',
      accent,
    });
  });

  // 3. Achievements
  data.recentAchievements.forEach((achievement) => {
    const isMale = achievement.userGender === 'male';
    const dt = createDivisionTheme(achievement.userGender as 'male' | 'female');
    const accent = dt.accentRgb;
    newsItems.push({
      id: `ach-${achievement.id}`,
      type: 'achievement',
      timestamp: achievement.earnedAt,
      playerName: achievement.userName,
      playerAvatar: achievement.userAvatar,
      playerGender: achievement.userGender,
      playerClub: null,
      icon: achievement.icon || '🏅',
      title: `${achievement.userName} mendapat pencapaian`,
      subtitle: achievement.name,
      accent,
    });
  });

  // Sort all by timestamp descending
  newsItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Only keep the 7 newest items — oldest are dropped when new ones come in
  const maxItems = 7;
  const displayed = newsItems.slice(0, maxItems);
  // Show 4 initially visible, rest accessible via scroll
  const initialVisibleCount = 4;

  return (
    <motion.div variants={itemVariants} className="w-full max-w-full md:h-full md:flex md:flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4" style={{ color: 'var(--gold)' }} />
        <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Informasi Terbaru</h2>
        {displayed.length > 0 && (
          <span className="text-[11px] text-white/25 ml-1">{displayed.length} update</span>
        )}
      </div>

      {displayed.length > 0 ? (
        <div
          className="rounded-2xl overflow-hidden md:flex-1 md:flex md:flex-col"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,215,0,0.06)',
          }}
        >
          {/* Top gradient accent */}
          <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${goldRgba(0.3)}, ${dt.accentBg(0.2)}, transparent)` }} />

          <div className="p-2 max-h-[304px] md:max-h-none md:flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,215,0,0.10) transparent' }}>
            {displayed.map((item, idx) => {
              const isMale = item.playerGender === 'male';
              const dt = createDivisionTheme(item.playerGender as 'male' | 'female');
              const genderAccent = dt.accentRgb;
              const genderAccentHex = dt.accent;

              // Type-specific badge colors
              const typeConfig: Record<string, { bg: string; border: string; color: string; label: string }> = {
                club_transfer: { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.15)', color: ACCENT.female.primary, label: 'Transfer' },
                match_result: { bg: 'rgba(115,255,0,0.08)', border: 'rgba(115,255,0,0.15)', color: ACCENT.male.primary, label: 'Pertandingan' },
                achievement: { bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.15)', color: 'var(--gold)', label: 'Pencapaian' },
                win_streak: { bg: 'rgba(255,165,0,0.08)', border: 'rgba(255,165,0,0.15)', color: '#FFA500', label: 'Win Streak' },
                tournament_win: { bg: 'rgba(255,215,0,0.10)', border: 'rgba(255,215,0,0.20)', color: 'var(--gold)', label: 'Juara' },
              };
              const cfg = typeConfig[item.type] || typeConfig.achievement;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  className="flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03] mb-1"
                  style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Type Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                    style={{
                      background: `linear-gradient(135deg, rgba(${item.accent},0.12) 0%, rgba(${item.accent},0.04) 100%)`,
                      border: `1px solid rgba(${item.accent},0.12)`,
                    }}
                  >
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Player avatar mini */}
                      <div
                        className="w-5 h-5 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                        style={{
                          background: item.playerAvatar
                            ? `url(${item.playerAvatar}) center/cover`
                            : `linear-gradient(135deg, ${dt.accentBg(0.25)}, ${dt.accentBg(0.08)})`,
                          border: `1px solid ${dt.accentBorder(0.20)}`,
                        }}
                      >
                        {!item.playerAvatar && (
                          <span className="text-[8px] font-bold" style={{ color: genderAccentHex }}>
                            {item.playerName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] font-semibold text-white/85 truncate">{item.title}</p>
                    </div>
                    {item.subtitle && (
                      <p className="text-[11px] text-white/35 mt-0.5 truncate">{item.subtitle}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {/* Type badge */}
                      <span
                        className="text-[7px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider"
                        style={{
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          color: cfg.color,
                        }}
                      >
                        {cfg.label}
                      </span>
                      {/* Gender badge */}
                      <span
                        className="text-[7px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: dt.accentBg(0.08),
                          color: genderAccentHex,
                          border: `1px solid ${dt.accentBorder(0.15)}`,
                        }}
                      >
                        {isMale ? 'M' : 'F'}
                      </span>
                      {/* Time ago */}
                      <span className="text-[9px] text-white/15">{timeAgo(item.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl overflow-hidden md:flex-1 md:flex md:flex-col"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)' }} />
          <div className="p-8 flex flex-col items-center text-center">
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'rgba(255,215,0,0.06)',
                border: '1px solid rgba(255,215,0,0.10)',
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap className="w-8 h-8 text-yellow-500/30" />
            </motion.div>
            <p className="text-[13px] font-semibold text-white/30 mb-1">Belum ada informasi terbaru</p>
            <p className="text-[11px] text-white/18">Update akan muncul saat ada aktivitas turnamen, transfer club, atau pencapaian</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   Splash Loading Screen
   ════════════════════════════════════════════ */

function SplashLoadingScreen({ onComplete }: { onComplete: () => void }) {
  const { settings } = useAppSettings();
  const logoUrl = settings.logo_url || 'https://res.cloudinary.com/dagoryri5/image/upload/q_auto,f_webp/idm/static/idm-logo.png';

  useEffect(() => {
    const timer = setTimeout(onComplete, 3200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#050507' }}
    >
      {/* Diamond pattern background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Multi-color glows */}
      <div className="absolute w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(115,255,0,0.05) 0%, transparent 60%)', top: '10%', left: '20%' }} />
      <div className="absolute w-[350px] h-[350px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 60%)', bottom: '15%', right: '10%' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.03) 0%, transparent 60%)', top: '40%', left: '50%', transform: 'translateX(-50%)' }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="relative"
      >
        <motion.div
          className="absolute inset-0 rounded-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.10) 0%, transparent 70%)', transform: 'scale(2.2)' }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <img
          src={logoUrl}
          alt="IDM Logo"
          className="relative w-32 h-32 md:w-40 md:h-40"
          loading="eager"
        />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 text-[26px] md:text-[36px] font-black tracking-tight text-center"
        style={{
          background: 'linear-gradient(135deg, #73FF00 0%, #FFD700 45%, #38BDF8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {settings.app_name}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="text-[12px] md:text-[14px] font-semibold tracking-[0.2em] uppercase mt-2"
        style={{ color: 'rgba(255,255,255,0.40)' }}
      >
        {settings.app_subtitle}
      </motion.p>

      {/* Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.2 }}
        className="mt-10 flex flex-col items-center"
      >
        <div className="relative w-10 h-10">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: '2px solid transparent', borderTopColor: 'var(--gold)', borderRightColor: 'rgba(255,215,0,0.3)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-1.5 rounded-full"
            style={{ border: '1.5px solid transparent', borderBottomColor: '#73FF00', borderLeftColor: 'rgba(115,255,0,0.2)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
          </motion.div>
        </div>
        <motion.p
          className="mt-4 text-[11px] tracking-wider text-white/40"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          Loading...
        </motion.p>
      </motion.div>

      {/* {settings.app_tagline} */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="absolute bottom-8 flex flex-col items-center"
      >
        <motion.p
          className="text-[11px] md:text-[12px] font-bold tracking-[0.15em] uppercase"
          style={{
            background: 'linear-gradient(135deg, #ffd700 0%, #ffec8b 50%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✦ {settings.app_tagline} ✦
        </motion.p>
        <span className="mt-1 text-[9px] tracking-widest text-white/30">© {settings.app_copyright_year}</span>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   Donasi & Sawer Showcase — Motivating donation section
   ════════════════════════════════════════════ */

function DonasiSawerSection({ data }: { data: LandingData }) {
  const [activeTab, setActiveTab] = useState<'sawer' | 'donasi'>('sawer');
  const [showAllDonasi, setShowAllDonasi] = useState(false);
  const totalDana = data.totalDonation + data.totalSawer;
  const hasSawer = data.recentSawers.length > 0;
  const hasDonasi = data.recentDonations.length > 0;
  const hasAny = hasSawer || hasDonasi;

  // Sort penyawer by amount descending (highest first)
  const sortedSawers = [...data.recentSawers].sort((a, b) => b.amount - a.amount);
  // Sort donasi by newest first
  const sortedDonations = [...data.recentDonations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  // Limit donasi to 5 unless "Lihat Semua" is clicked
  const MAX_DONASI_VISIBLE = 5;
  const visibleDonations = showAllDonasi ? sortedDonations : sortedDonations.slice(0, MAX_DONASI_VISIBLE);
  const hasMoreDonasi = sortedDonations.length > MAX_DONASI_VISIBLE;

  return (
    <motion.div variants={itemVariants} className="w-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4" style={{ color: '#F472B6' }} />
          <h2 className="text-[15px] font-bold text-white/80 tracking-wide">Dukungan & Sawer</h2>
        </div>
        {/* Total fund raised */}
        <motion.div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(244,114,182,0.10) 0%, rgba(255,215,0,0.05) 100%)',
            border: '1px solid rgba(244,114,182,0.15)',
          }}
          whileHover={{ scale: 1.02 }}
        >
          <Coins className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
          <span
            className="text-[12px] font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {formatRupiah(totalDana)}
          </span>
          <span className="text-[9px] text-white/25">terkumpul</span>
        </motion.div>
      </div>

      {hasAny ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(244,114,182,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(244,114,182,0.08)',
          }}
        >
          {/* Top gradient accent */}
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,114,182,0.4), rgba(255,215,0,0.3), transparent)' }} />

          {/* ═══════════════════════════════════════════════════════
              MOBILE: Tab Switcher (Sawer / Donasi)
              ═══════════════════════════════════════════════════════ */}
          <div className="md:hidden">
            <div className="flex items-center gap-1 p-2 mx-3 mt-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => setActiveTab('sawer')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer press-scale focus-glow ${
                  activeTab === 'sawer' ? 'text-white' : 'text-white/30 hover:text-white/50'
                }`}
                style={activeTab === 'sawer' ? {
                  background: 'linear-gradient(135deg, rgba(244,114,182,0.15) 0%, rgba(244,114,182,0.05) 100%)',
                  border: '1px solid rgba(244,114,182,0.20)',
                  boxShadow: '0 0 12px rgba(244,114,182,0.08)',
                } : {}}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: activeTab === 'sawer' ? '#F472B6' : 'currentColor' }} />
                Sawer ({sortedSawers.length})
              </button>
              <button
                onClick={() => setActiveTab('donasi')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer press-scale focus-glow ${
                  activeTab === 'donasi' ? 'text-white' : 'text-white/30 hover:text-white/50'
                }`}
                style={activeTab === 'donasi' ? {
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,215,0,0.04) 100%)',
                  border: '1px solid rgba(255,215,0,0.18)',
                  boxShadow: '0 0 12px rgba(255,215,0,0.06)',
                } : {}}
              >
                <Heart className="w-3.5 h-3.5" style={{ color: activeTab === 'donasi' ? 'var(--gold)' : 'currentColor' }} />
                Donasi ({sortedDonations.length})
              </button>
            </div>

            <div className="p-3 pt-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(244,114,182,0.15) transparent' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'sawer' ? (
                  <motion.div
                    key="sawer"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-2"
                  >
                    {sortedSawers.map((sawer, idx) => (
                      <motion.div
                        key={sawer.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }}
                        className="flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03] relative hover-lift"
                        style={{
                          background: idx === 0
                            ? 'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(244,114,182,0.10) 40%, rgba(255,215,0,0.06) 70%, rgba(255,107,53,0.08) 100%)'
                            : 'rgba(255,255,255,0.01)',
                          border: idx === 0
                            ? '1px solid rgba(255,107,53,0.35)'
                            : '1px solid rgba(255,255,255,0.04)',
                          boxShadow: idx === 0
                            ? '0 0 25px rgba(255,107,53,0.25), 0 0 50px rgba(244,114,182,0.15), 0 0 80px rgba(255,215,0,0.08), inset 0 0 15px rgba(255,107,53,0.06)'
                            : 'none',
                          animation: idx === 0 ? 'fireGlow 2s ease-in-out infinite' : 'none',
                        }}
                      >
                        {/* #1 Top Sawer fire blazing effect */}
                        {idx === 0 && (
                          <>
                            <motion.div
                              className="absolute -top-2 -right-1"
                              animate={{ scale: [1, 1.3, 0.9, 1.2, 1], rotate: [0, 15, -10, 5, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <Flame className="w-5 h-5" style={{ color: '#FF6B35', filter: 'drop-shadow(0 0 8px rgba(255,107,53,0.8)) drop-shadow(0 0 16px rgba(255,69,0,0.4))' }} />
                            </motion.div>
                            <motion.div
                              className="absolute -top-1 right-4"
                              animate={{ scale: [0.8, 1.1, 0.7, 1], opacity: [0.5, 0.9, 0.4, 0.8] }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                            >
                              <Flame className="w-3.5 h-3.5" style={{ color: 'var(--gold)', filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.7))' }} />
                            </motion.div>
                            <motion.div
                              className="absolute top-0 right-9"
                              animate={{ scale: [0.6, 1, 0.5, 0.9], opacity: [0.3, 0.7, 0.2, 0.6] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                            >
                              <Flame className="w-2.5 h-2.5" style={{ color: '#FFA500', filter: 'drop-shadow(0 0 4px rgba(255,165,0,0.6))' }} />
                            </motion.div>
                            <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.06), transparent 40%, rgba(255,215,0,0.04))' }} />
                          </>
                        )}
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden relative"
                          style={{
                            background: sawer.senderAvatar
                              ? `url(${sawer.senderAvatar}) center/cover`
                              : 'linear-gradient(135deg, rgba(244,114,182,0.25), rgba(244,114,182,0.08))',
                            border: idx === 0
                              ? '2px solid rgba(255,215,0,0.50)'
                              : '1.5px solid rgba(244,114,182,0.20)',
                            boxShadow: idx === 0 ? '0 0 15px rgba(255,215,0,0.30), 0 0 30px rgba(255,107,53,0.15)' : 'none',
                          }}
                        >
                          {!sawer.senderAvatar && (
                            <span className="text-[11px] font-bold text-[#F472B6]">
                              {sawer.senderName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {idx === 0 && (
                              <motion.span
                                className="text-[7px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.20), rgba(255,107,53,0.15))', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.30)' }}
                                animate={{ textShadow: ['0 0 4px rgba(255,215,0,0.3)', '0 0 8px rgba(255,215,0,0.6)', '0 0 4px rgba(255,215,0,0.3)'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                              >👑 #1</motion.span>
                            )}
                            <p className="text-[12px] font-semibold text-white/85 truncate">{sawer.senderName}</p>
                            {sawer.targetPlayerName && (
                              <>
                                <span className="text-[10px] text-white/20">→</span>
                                <p className="text-[11px] font-medium truncate" style={{ color: sawer.division === 'male' ? ACCENT.male.primary : ACCENT.female.primary }}>
                                  {sawer.targetPlayerName}
                                </p>
                              </>
                            )}
                            {sawer.division && (
                              <span
                                className="text-[7px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{
                                  background: sawer.division === 'male' ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)',
                                  color: sawer.division === 'male' ? ACCENT.male.primary : ACCENT.female.primary,
                                  border: `1px solid ${sawer.division === 'male' ? 'rgba(115,255,0,0.15)' : 'rgba(56,189,248,0.15)'}`,
                                }}
                              >
                                {sawer.division === 'male' ? 'M' : 'F'}
                              </span>
                            )}
                          </div>
                          {sawer.message && (
                            <p className="text-[11px] text-white/30 mt-0.5 truncate">&quot;{sawer.message}&quot;</p>
                          )}
                          <p className="text-[9px] text-white/15 mt-0.5">{timeAgo(sawer.createdAt)}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p
                            className="text-[13px] font-bold"
                            style={{
                              background: 'linear-gradient(135deg, #F472B6, #FFD700)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            {formatRupiah(sawer.amount)}
                          </p>
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <Zap className="w-2.5 h-2.5 text-[#F472B6]/40" />
                            <span className="text-[8px] text-[#F472B6]/40 font-semibold">SAWER</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="donasi"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-2"
                  >
                    {visibleDonations.map((donation, idx) => (
                      <motion.div
                        key={donation.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }}
                        className="flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03]"
                        style={{
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                          style={{
                            background: donation.anonymous
                              ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))'
                              : donation.donorAvatar
                                ? `url(${donation.donorAvatar}) center/cover`
                                : 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.08))',
                            border: donation.anonymous
                              ? '1.5px solid rgba(255,215,0,0.15)'
                              : '1.5px solid rgba(255,215,0,0.20)',
                          }}
                        >
                          {donation.anonymous ? (
                            <Heart className="w-3.5 h-3.5 text-yellow-400/50" />
                          ) : !donation.donorAvatar ? (
                            <span className="text-[11px] font-bold text-yellow-400">
                              {donation.donorName.charAt(0).toUpperCase()}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[12px] font-semibold text-white/85 truncate">
                              {donation.anonymous ? '🤲 Hamba Allah' : donation.donorName}
                            </p>
                            {donation.anonymous && (
                              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,215,0,0.08)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.12)' }}>
                                ANONIM
                              </span>
                            )}
                          </div>
                          {donation.message && (
                            <p className="text-[11px] text-white/30 mt-0.5 truncate">&quot;{donation.message}&quot;</p>
                          )}
                          <p className="text-[9px] text-white/15 mt-0.5">{timeAgo(donation.createdAt)}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p
                            className="text-[13px] font-bold"
                            style={{
                              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            {formatRupiah(donation.amount)}
                          </p>
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <Heart className="w-2.5 h-2.5 text-yellow-400/40" />
                            <span className="text-[8px] text-yellow-400/40 font-semibold">DONASI</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {/* Lihat Semua CTA for mobile donasi */}
                    {hasMoreDonasi && !showAllDonasi && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAllDonasi(true)}
                        className="w-full py-2 rounded-xl text-center text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,165,0,0.04))',
                          border: '1px dashed rgba(255,215,0,0.15)',
                          color: 'rgba(255,215,0,0.7)',
                        }}
                      >
                        <span>Lihat Semua</span>
                        <ChevronRight className="w-3 h-3" />
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              DESKTOP/TABLET: Side by side (Donasi kiri, Sawer kanan)
              ═══════════════════════════════════════════════════════ */}
          <div className="hidden md:flex md:gap-3 p-3 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(244,114,182,0.15) transparent' }}>
            {/* ── Donasi List (kiri) ── */}
            {hasDonasi && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <Heart className="w-3 h-3" style={{ color: 'var(--gold)' }} />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-yellow-400/70">Donasi</span>
                  <span className="text-[9px] text-white/20 ml-0.5">({sortedDonations.length})</span>
                </div>
                <div className="space-y-1.5">
                  {visibleDonations.map((donation, idx) => (
                    <motion.div
                      key={donation.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                      className="flex items-start gap-3 p-2.5 rounded-xl transition-all hover:bg-white/[0.03]"
                      style={{
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,215,0,0.06)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                        style={{
                          background: donation.anonymous
                            ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))'
                            : donation.donorAvatar
                              ? `url(${donation.donorAvatar}) center/cover`
                              : 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.08))',
                          border: donation.anonymous
                            ? '1.5px solid rgba(255,215,0,0.15)'
                            : '1.5px solid rgba(255,215,0,0.20)',
                        }}
                      >
                        {donation.anonymous ? (
                          <Heart className="w-3 h-3 text-yellow-400/50" />
                        ) : !donation.donorAvatar ? (
                          <span className="text-[10px] font-bold text-yellow-400">
                            {donation.donorName.charAt(0).toUpperCase()}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-semibold text-white/85 truncate">
                            {donation.anonymous ? '🤲 Hamba Allah' : donation.donorName}
                          </p>
                          {donation.anonymous && (
                            <span className="text-[7px] font-bold px-1 py-0.5 rounded-full" style={{ background: 'rgba(255,215,0,0.08)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.12)' }}>
                              ANONIM
                            </span>
                          )}
                        </div>
                        {donation.message && (
                          <p className="text-[10px] text-white/30 mt-0.5 truncate">&quot;{donation.message}&quot;</p>
                        )}
                        <p className="text-[8px] text-white/15 mt-0.5">{timeAgo(donation.createdAt)}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p
                          className="text-[12px] font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {formatRupiah(donation.amount)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {/* Lihat Semua CTA for desktop donasi */}
                  {hasMoreDonasi && !showAllDonasi && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowAllDonasi(true)}
                      className="w-full py-1.5 rounded-xl text-center text-[10px] font-semibold flex items-center justify-center gap-1 transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,165,0,0.04))',
                        border: '1px dashed rgba(255,215,0,0.15)',
                        color: 'rgba(255,215,0,0.7)',
                      }}
                    >
                      <span>Lihat Semua</span>
                      <ChevronRight className="w-3 h-3" />
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {/* ── Vertical divider ── */}
            {hasSawer && hasDonasi && (
              <div className="w-px self-stretch flex-shrink-0" style={{ background: 'linear-gradient(180deg, transparent, rgba(244,114,182,0.12), rgba(255,215,0,0.10), transparent)' }} />
            )}

            {/* ── Sawer List (kanan) ── */}
            {hasSawer && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <Zap className="w-3 h-3" style={{ color: '#F472B6' }} />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[#F472B6]/70">Sawer</span>
                  <span className="text-[9px] text-white/20 ml-0.5">({sortedSawers.length})</span>
                </div>
                <div className="space-y-1.5">
                  {sortedSawers.map((sawer, idx) => (
                    <motion.div
                      key={sawer.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                      className="flex items-start gap-3 p-2.5 rounded-xl transition-all hover:bg-white/[0.03] relative"
                      style={{
                        background: idx === 0
                          ? 'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(244,114,182,0.10) 40%, rgba(255,215,0,0.06) 70%, rgba(255,107,53,0.08) 100%)'
                          : 'rgba(255,255,255,0.01)',
                        border: idx === 0
                          ? '1px solid rgba(255,107,53,0.35)'
                          : '1px solid rgba(244,114,182,0.06)',
                        boxShadow: idx === 0
                          ? '0 0 25px rgba(255,107,53,0.25), 0 0 50px rgba(244,114,182,0.15), 0 0 80px rgba(255,215,0,0.08), inset 0 0 15px rgba(255,107,53,0.06)'
                          : 'none',
                        animation: idx === 0 ? 'fireGlow 2s ease-in-out infinite' : 'none',
                      }}
                    >
                      {/* #1 Top Sawer fire blazing effect */}
                      {idx === 0 && (
                        <>
                          <motion.div
                            className="absolute -top-2 -right-1"
                            animate={{ scale: [1, 1.3, 0.9, 1.2, 1], rotate: [0, 15, -10, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <Flame className="w-4 h-4" style={{ color: '#FF6B35', filter: 'drop-shadow(0 0 8px rgba(255,107,53,0.8)) drop-shadow(0 0 16px rgba(255,69,0,0.4))' }} />
                          </motion.div>
                          <motion.div
                            className="absolute -top-1 right-3"
                            animate={{ scale: [0.8, 1.1, 0.7, 1], opacity: [0.5, 0.9, 0.4, 0.8] }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                          >
                            <Flame className="w-3 h-3" style={{ color: 'var(--gold)', filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.7))' }} />
                          </motion.div>
                          <motion.div
                            className="absolute top-0 right-7"
                            animate={{ scale: [0.6, 1, 0.5, 0.9], opacity: [0.3, 0.7, 0.2, 0.6] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                          >
                            <Flame className="w-2 h-2" style={{ color: '#FFA500', filter: 'drop-shadow(0 0 4px rgba(255,165,0,0.6))' }} />
                          </motion.div>
                          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.06), transparent 40%, rgba(255,215,0,0.04))' }} />
                        </>
                      )}
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden relative"
                        style={{
                          background: sawer.senderAvatar
                            ? `url(${sawer.senderAvatar}) center/cover`
                            : 'linear-gradient(135deg, rgba(244,114,182,0.25), rgba(244,114,182,0.08))',
                          border: idx === 0
                            ? '2px solid rgba(255,215,0,0.50)'
                            : '1.5px solid rgba(244,114,182,0.20)',
                          boxShadow: idx === 0 ? '0 0 15px rgba(255,215,0,0.30), 0 0 30px rgba(255,107,53,0.15)' : 'none',
                        }}
                      >
                        {!sawer.senderAvatar && (
                          <span className="text-[10px] font-bold text-[#F472B6]">
                            {sawer.senderName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {idx === 0 && (
                            <motion.span
                              className="text-[7px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.20), rgba(255,107,53,0.15))', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.30)' }}
                              animate={{ textShadow: ['0 0 4px rgba(255,215,0,0.3)', '0 0 8px rgba(255,215,0,0.6)', '0 0 4px rgba(255,215,0,0.3)'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            >👑 #1</motion.span>
                          )}
                          <p className="text-[11px] font-semibold text-white/85 truncate">{sawer.senderName}</p>
                          {sawer.targetPlayerName && (
                            <>
                              <span className="text-[9px] text-white/20">→</span>
                              <p className="text-[10px] font-medium truncate" style={{ color: sawer.division === 'male' ? ACCENT.male.primary : ACCENT.female.primary }}>
                                {sawer.targetPlayerName}
                              </p>
                            </>
                          )}
                          {sawer.division && (
                            <span
                              className="text-[7px] font-bold px-1 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                background: sawer.division === 'male' ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)',
                                color: sawer.division === 'male' ? ACCENT.male.primary : ACCENT.female.primary,
                                border: `1px solid ${sawer.division === 'male' ? 'rgba(115,255,0,0.15)' : 'rgba(56,189,248,0.15)'}`,
                              }}
                            >
                              {sawer.division === 'male' ? 'M' : 'F'}
                            </span>
                          )}
                        </div>
                        {sawer.message && (
                          <p className="text-[10px] text-white/30 mt-0.5 truncate">&quot;{sawer.message}&quot;</p>
                        )}
                        <p className="text-[8px] text-white/15 mt-0.5">{timeAgo(sawer.createdAt)}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p
                          className="text-[12px] font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #F472B6, #FFD700)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {formatRupiah(sawer.amount)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Motivational CTA Footer */}
          <div
            className="m-3 mt-0 p-3 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(244,114,182,0.06) 0%, rgba(255,215,0,0.04) 100%)',
              border: '1px dashed rgba(244,114,182,0.15)',
            }}
          >
            <p className="text-[11px] text-white/40">
              💖 Dukung turnamen & pemain favoritmu!
            </p>
            <p className="text-[9px] text-white/20 mt-0.5">Sawer langsung ke pemain atau donasi ke prize pool</p>
          </div>
        </div>
      ) : (
        /* Empty state - motivasi untuk mulai menyawer/donasi */
        <motion.div
          variants={cardVariants}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(244,114,182,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(244,114,182,0.08)',
          }}
        >
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,114,182,0.3), rgba(255,215,0,0.2), transparent)' }} />

          <div className="p-8 flex flex-col items-center text-center">
            {/* Animated heart icon */}
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(244,114,182,0.12) 0%, rgba(255,215,0,0.06) 100%)',
                border: '1px solid rgba(244,114,182,0.15)',
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart className="w-8 h-8 text-pink-400/50" />
            </motion.div>

            <p className="text-[15px] font-bold text-white/50 mb-1">Belum Ada Dukungan</p>
            <p className="text-[12px] text-white/25 max-w-[280px] leading-relaxed">
              Jadilah yang pertama menyawer pemain favorit atau mendonasi untuk menambah prize pool turnamen!
            </p>

            {/* Decorative stats */}
            <div className="flex items-center gap-4 mt-5">
              <div className="flex flex-col items-center">
                <Zap className="w-4 h-4 text-pink-400/30 mb-1" />
                <span className="text-[10px] text-white/15 font-semibold">SAWER</span>
                <span className="text-[9px] text-white/10">ke pemain</span>
              </div>
              <div className="w-px h-8" style={{ background: 'rgba(244,114,182,0.10)' }} />
              <div className="flex flex-col items-center">
                <Heart className="w-4 h-4 text-yellow-400/30 mb-1" />
                <span className="text-[10px] text-white/15 font-semibold">DONASI</span>
                <span className="text-[9px] text-white/10">ke prize pool</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   Champion Carousel Banner — Full-width auto-rotating
   Shows Male & Female division champions alternately
   ════════════════════════════════════════════ */

// Helper: format team name as "Tim {Tier S player name}"
function getChampionTeamName(champion: ChampionData): string {
  const tierSName = champion.tierSPlayerName;
  if (tierSName) {
    const formatted = tierSName.charAt(0).toUpperCase() + tierSName.slice(1);
    return `Tim ${formatted}`;
  }
  const tn = champion.teamName;
  if (tn) {
    if (tn.toLowerCase().startsWith('tim ') || tn.toLowerCase().startsWith('team ')) {
      return tn.charAt(0).toUpperCase() + tn.slice(1);
    }
    return `Tim ${tn.charAt(0).toUpperCase() + tn.slice(1)}`;
  }
  const pName = champion.playerName;
  if (pName) {
    return `Tim ${pName.charAt(0).toUpperCase() + pName.slice(1)}`;
  }
  return '';
}

function ChampionCarouselBanner({ data }: { data: LandingData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { settings } = useAppSettings();
  const logoUrl = settings.logo_url || 'https://res.cloudinary.com/dagoryri5/image/upload/q_auto,f_webp/idm/static/idm-logo.png';

  const slides: {
    division: 'male' | 'female';
    champion: ChampionData | null;
    bannerUrl: string | null;
    accent: string;
    accentHex: string;
    accentHex2: string;
    label: string;
  }[] = [
    {
      division: 'male',
      champion: data.maleChampion,
      bannerUrl: data.bannerMaleUrl,
      accent: '115,255,0',
      accentHex: '#73FF00',
      accentHex2: '#5FD400',
      label: 'MALE DIVISION',
    },
    {
      division: 'female',
      champion: data.femaleChampion,
      bannerUrl: data.bannerFemaleUrl,
      accent: '56,189,248',
      accentHex: '#38BDF8',
      accentHex2: '#0EA5E9',
      label: 'FEMALE DIVISION',
    },
  ];

  const hasAnyContent = slides.some(s => s.bannerUrl || s.champion);

  // Auto-rotate every 9 seconds
  useEffect(() => {
    if (isPaused || !hasAnyContent) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 9000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, hasAnyContent, slides.length]);

  const currentSlide = slides[currentIndex];

  if (!hasAnyContent) {
    // Show a minimal placeholder banner
    return (
      <motion.div
        variants={itemVariants}
        className="w-full max-w-full mt-8 md:mt-10 mb-8 md:mb-10"
      >
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full overflow-hidden"
          style={{ borderRadius: '20px', boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}
        >
          <div className="relative w-full aspect-[3/2] sm:aspect-[16/5] md:aspect-[16/4.5] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(5,5,7,0.95) 0%, rgba(10,12,8,0.90) 50%, rgba(5,5,7,0.95) 100%)' }}>
            <div className="text-center">
              <motion.img
                src={logoUrl}
                alt="Logo"
                className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain opacity-50 mx-auto"
                animate={{ filter: ['brightness(1) saturate(1)', 'brightness(1.2) saturate(1.1)', 'brightness(1) saturate(1)'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <p className="text-[12px] sm:text-[16px] md:text-[20px] font-bold text-white/40 mt-2 tracking-tight">Banner</p>

            </div>
          </div>
          {/* Neon border */}
          <svg className="absolute pointer-events-none" style={{ inset: '-4px', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', zIndex: 10 }} viewBox="0 0 1200 500" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="emptyNeonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#73FF00" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </linearGradient>
              <filter id="emptyNeonGlow"><feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <rect x="2" y="2" width="1196" height="496" rx="20" ry="20" stroke="url(#emptyNeonGrad)" strokeWidth="1.5" filter="url(#emptyNeonGlow)" />
          </svg>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={itemVariants}
      className="w-full max-w-full mt-1 md:mt-8 mb-4 md:mb-10"
    >
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full overflow-visible"
        style={{ borderRadius: '20px' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => { setIsPaused(false); }}
      >
        {/* ── Neon running border (SVG) ── */}
        <svg
          className="absolute pointer-events-none"
          style={{ inset: '-4px', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', zIndex: 10 }}
          viewBox="0 0 1200 500"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id={`champNeonGrad${currentIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={currentSlide.accentHex} stopOpacity="0" />
              <stop offset="25%" stopColor={currentSlide.accentHex} />
              <stop offset="50%" stopColor="#FFD700" />
              <stop offset="75%" stopColor={currentSlide.accentHex} />
              <stop offset="100%" stopColor={currentSlide.accentHex} stopOpacity="0" />
            </linearGradient>
            <filter id="champNeonGlow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur1" />
              <feMerge><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect x="2" y="2" width="1196" height="496" rx="20" ry="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <rect x="2" y="2" width="1196" height="496" rx="20" ry="20" stroke={`url(#champNeonGrad${currentIndex})`} strokeWidth="1.5" filter="url(#champNeonGlow)" />
        </svg>

        {/* ── Inner content ── */}
        <div
          className="relative w-full overflow-hidden"
          style={{ borderRadius: '20px', boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}
        >
          <div className="relative w-full aspect-[3/2] sm:aspect-[16/5] md:aspect-[16/4.5]">
            {/* Slide Content with AnimatePresence */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
              >
                {currentSlide.bannerUrl ? (
                  <>
                    {/* Banner image */}
                    <img
                      src={currentSlide.bannerUrl}
                      alt={`${currentSlide.division} Champion`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Gradient overlays */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.90) 0%, rgba(5,5,7,0.30) 40%, rgba(5,5,7,0.20) 60%, rgba(5,5,7,0.40) 100%)' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 80%, rgba(${currentSlide.accent},0.08) 0%, transparent 100%)` }} />
                  </>
                ) : (
                  <>
                    {/* No banner image - themed gradient background */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 40%, rgba(${currentSlide.accent},0.06) 0%, transparent 100%), linear-gradient(135deg, rgba(5,5,7,0.95) 0%, rgba(10,12,8,0.90) 50%, rgba(5,5,7,0.95) 100%)` }} />
                    {/* Decorative rings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: '200px', height: '200px', borderRadius: '50%', border: `1px solid rgba(${currentSlide.accent},0.06)`, boxShadow: `0 0 60px rgba(${currentSlide.accent},0.03), inset 0 0 60px rgba(${currentSlide.accent},0.02)` }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: '140px', height: '140px', borderRadius: '50%', border: `1px solid rgba(${currentSlide.accent},0.04)` }} />
                  </>
                )}

                {/* Champion Info Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-5 sm:pb-7 md:pb-7 px-4">
                  {currentSlide.champion ? (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center text-center"
                    >
                      {/* Crown Icon */}
                      <motion.div
                        animate={{ y: [0, -4, 0], rotate: [0, -3, 3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
                      >
                        <Crown className="w-6 h-6 sm:w-8 sm:h-8 md:w-11 md:h-11 text-yellow-400 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.4))' }} strokeWidth={1.5} />
                      </motion.div>

                      {/* Champion Avatar */}
                      <div className="relative mt-2">
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 md:w-22 md:h-22 rounded-full flex items-center justify-center overflow-hidden"
                          style={{
                            background: currentSlide.champion.playerAvatar
                              ? 'none'
                              : `linear-gradient(135deg, rgba(${currentSlide.accent},0.30), rgba(${currentSlide.accent},0.08))`,
                            border: '3px solid rgba(255,215,0,0.6)',
                            boxShadow: '0 0 24px rgba(255,215,0,0.20), 0 0 48px rgba(255,215,0,0.08)',
                          }}
                        >
                          {currentSlide.champion.playerAvatar ? (
                            <img src={currentSlide.champion.playerAvatar} alt={currentSlide.champion.playerName || ''} className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="text-lg sm:text-xl md:text-3xl font-black" style={{ color: currentSlide.accentHex }}>
                              {(currentSlide.champion.tierSPlayerName || currentSlide.champion.playerName || currentSlide.champion.teamName || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Gold ring around avatar */}
                        <div className="absolute inset-[-3px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,215,0,0.15)', boxShadow: `0 0 16px rgba(${currentSlide.accent},0.10)` }} />
                      </div>

                      {/* Team Name — "Tim {Tier S player name}" format */}
                      <h2 className="text-[16px] sm:text-[22px] md:text-[32px] font-black text-white mt-2.5 tracking-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                        {getChampionTeamName(currentSlide.champion)}
                      </h2>

                      {/* Prize Row */}
                      <div className="flex items-center gap-2 mt-2">
                        {currentSlide.champion.prize > 0 && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold" style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.20)', color: 'var(--gold)' }}>
                            <Coins className="w-3 h-3" />
                            {formatRupiah(currentSlide.champion.prize)}
                          </span>
                        )}
                      </div>

                      {/* Tournament Name */}
                      {currentSlide.champion.tournamentName && (
                        <p className="text-[10px] sm:text-[11px] md:text-[12px] text-white/35 mt-2 tracking-wide">{currentSlide.champion.tournamentName}</p>
                      )}
                    </motion.div>
                  ) : currentSlide.bannerUrl ? (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="flex flex-col items-center text-center"
                    >
                      <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400/50" />
                      <p className="text-[11px] sm:text-[20px] md:text-[24px] font-bold text-white/70 mt-2 tracking-tight">
                        {currentSlide.division === 'male' ? 'Male' : 'Female'} Division
                      </p>
                    </motion.div>
                  ) : null}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* ── Bottom glow line ── */}
            <div className="absolute bottom-0 left-[10%] right-[10%] h-px pointer-events-none z-20" style={{ background: `linear-gradient(90deg, transparent, rgba(${currentSlide.accent},0.30), rgba(255,215,0,0.20), rgba(${currentSlide.accent},0.30), transparent)` }} />
            {/* Top subtle glow line */}
            <div className="absolute top-0 left-[15%] right-[15%] h-px pointer-events-none z-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.12) 50%, transparent)' }} />
            {/* Inner border */}
            <div className="absolute inset-0 pointer-events-none z-20" style={{ borderRadius: '20px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)' }} />
          </div>
        </div>


      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   LandingPage — Main Component
   ════════════════════════════════════════════ */

// Fallback data for when database is unavailable (e.g. Vercel without DB)
const FALLBACK_DATA: LandingData = {
  male: {
    topPlayers: [],
    tournament: null,
    totalPlayers: 0,
    totalDonation: 0,
  },
  female: {
    topPlayers: [],
    tournament: null,
    totalPlayers: 0,
    totalDonation: 0,
  },
  totalDonation: 0,
  totalSawer: 0,
  clubs: [],
  bannerMaleUrl: null,
  bannerFemaleUrl: null,
  maleChampion: null,
  femaleChampion: null,
  recentMatches: [],
  liveMatches: [],
  liveMatchCount: 0,
  recentAchievements: [],
  recentDonations: [],
  recentSawers: [],
  activityLogs: [],
};

export function LandingPage({ onEnterDivision, onAdminLogin, onOpenWallet, onPlayerClick, preloadedData }: LandingPageProps) {
  const { settings } = useAppSettings();
  const [data, setData] = useState<LandingData | null>(preloadedData ?? null);
  const [loading, setLoading] = useState(!preloadedData);

  const handlePlayerClick = onPlayerClick;

  useEffect(() => {
    if (preloadedData) return; // Already have data, skip fetch
    async function fetchLanding() {
      try {
        const res = await fetch('/api/landing');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setData(json.data);
        }
      } catch {
        // silent - use fallback data
      } finally {
        setLoading(false);
      }
    }
    fetchLanding();
  }, [preloadedData]);


  // Use fallback data when API fails (no database on Vercel, etc.)
  const activeData = data || FALLBACK_DATA;
  if (loading) return <LandingSkeleton />;

  const totalPlayers = activeData.male.totalPlayers + activeData.female.totalPlayers;
  const totalTournaments =
    (activeData.male.tournament ? 1 : 0) + (activeData.female.tournament ? 1 : 0);
  const totalPrizePool =
    (activeData.male.tournament?.prizePool || 0) + (activeData.female.tournament?.prizePool || 0);

  return (
    <>
    <style>{playerRowKeyframes}</style>
    <style>{fireGlowKeyframes}</style>
    <TopNavBar onEnterDivision={onEnterDivision} onAdminLogin={onAdminLogin} onOpenWallet={onOpenWallet} activeData={activeData} />
    <div className="h-full relative overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: '#050507' }} />
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(5,5,7,0.95)' }} />
        {/* Green glow (Male) */}
        <div
          className="absolute -top-20 left-1/4 w-[500px] h-[500px]"
          style={{
            background: 'radial-gradient(circle, rgba(115,255,0,0.04) 0%, transparent 60%)',
          }}
        />
        {/* Blue glow (Female) */}
        <div
          className="absolute top-[20%] right-0 w-[500px] h-[500px]"
          style={{
            background: 'radial-gradient(circle, rgba(56,189,248,0.035) 0%, transparent 60%)',
          }}
        />
        {/* Gold glow (center bottom) */}
        <div
          className="absolute bottom-[10%] left-1/3 w-[400px] h-[400px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.02) 0%, transparent 60%)',
          }}
        />
        {/* Diamond pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Content ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center px-4 sm:px-6 lg:px-10 xl:px-16 pt-0 pb-24 md:pt-4 md:pb-12 min-h-screen overflow-x-hidden"
      >
        {/* ═══ CHAMPION CAROUSEL BANNER ═══ */}
        <div className="w-full">
          <ChampionCarouselBanner data={activeData} />
        </div>

        {/* ═══ STATS BAR ═══ */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full mb-6 md:mb-10"
        >
          <StatCard
            icon={Users}
            label="Total Pemain"
            value={totalPlayers.toString()}
            color="115,255,0"
          />
          <StatCard
            icon={Swords}
            label="Club Peserta"
            value={`${activeData.clubs.length}`}
            color="56,189,248"
          />
          <StatCard
            icon={Coins}
            label="Total Prize Pool"
            value={formatRupiah(totalPrizePool)}
            color="255,215,0"
          />
          <StatCard
            icon={Heart}
            label="Total Donasi"
            value={formatRupiah(activeData.totalDonation + activeData.totalSawer)}
            color="244,114,182"
          />
        </motion.div>

        {/* ═══ AD SLOT — After Stats, before Division Cards ═══ */}
        <AdSlot slot="landing" />

        {/* ═══ DIVISION CARDS ═══ */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 w-full mb-6 md:mb-10"
        >
          <DivisionCard
            division="male"
            data={activeData.male}
            onEnter={() => onEnterDivision('male')}
            onPlayerClick={handlePlayerClick}
          />
          <DivisionCard
            division="female"
            data={activeData.female}
            onEnter={() => onEnterDivision('female')}
            onPlayerClick={handlePlayerClick}
          />
        </motion.div>

        {/* ═══ UNIFIED LEADERBOARD — Overall + Season Points ═══ */}
        <div id="leaderboard-section" className="w-full mb-6 md:mb-10">
          <UnifiedLeaderboard data={activeData} onPlayerClick={handlePlayerClick} />
        </div>

        {/* ═══ CLUBS CAROUSEL ═══ */}
        <div className="w-full mb-6 md:mb-10">
          <ClubsCarousel clubs={activeData.clubs} />
        </div>

        {/* ═══ DONASI & SAWER SECTION ═══ */}
        <div className="w-full mb-6 md:mb-10">
          <DonasiSawerSection data={activeData} />
        </div>

        {/* ═══ VIDEO HIGHLIGHT + INFORMASI TERBARU (Side by Side) ═══ */}
        <div className="w-full mb-6 md:mb-10 flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Video Highlight — wider */}
          <div className="flex-1 min-w-0">
            <VideoHighlightSection division="all" />
          </div>
          {/* Informasi Terbaru — narrower */}
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <InformasiTerbaruSection data={activeData} onPlayerClick={handlePlayerClick} />
          </div>
        </div>

        {/* ═══ RULES ═══ */}
        <div id="info-section" className="w-full mb-6 md:mb-10">
          <LandingContentSection />
        </div>

        {/* ═══ FOOTER ═══ */}
        <motion.footer
          variants={itemVariants}
          className="mt-auto pt-8 pb-20 md:pb-4 flex flex-col items-center gap-3 w-full"
        >
          <p className="text-[11px] text-white/20 hover:text-white/40 transition-colors cursor-pointer tracking-wide"
            onClick={onAdminLogin}
          >
            Admin
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-white/10" />
            <p className="text-[10px] text-white/20 tracking-wider">
              © {settings.app_copyright_year} {settings.app_copyright_holder} — {settings.app_tagline}
            </p>
            <div className="h-px w-6 bg-white/10" />
          </div>
        </motion.footer>
      </motion.div>
    </div>

    {/* ═══ ADMIN FAB — Floating Action Button (hidden on mobile, accessible via menu) ═══ */}
    <motion.button
      onClick={onAdminLogin}
      className="hidden"
      style={{
        right: 16,
        bottom: 24,
        width: 48,
        height: 48,
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(255,215,0,0.20)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,215,0,0.08), 0 0 30px rgba(255,215,0,0.06)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 1.5 }}
      whileHover={{
        scale: 1.08,
        boxShadow: '0 6px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.15), 0 0 40px rgba(255,215,0,0.10)',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.22) 0%, rgba(255,215,0,0.08) 100%)',
      }}
      whileTap={{ scale: 0.92 }}
    >
      {/* Pulsing glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: '0 0 12px rgba(255,215,0,0.15)',
        }}
        animate={{
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Settings
        className="w-5 h-5 relative z-10"
        style={{ color: 'var(--gold)' }}
        strokeWidth={2}
      />
    </motion.button>
    </>
  );
}
