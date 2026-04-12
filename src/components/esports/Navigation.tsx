'use client';

import { motion } from 'framer-motion';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useDivisionTheme } from '@/hooks/useDivisionTheme';
import { createDivisionTheme, goldRgba, ACCENT } from '@/lib/theme-tokens';
import {
  Home,
  Trophy,
  Swords,
  GitBranch,
  BarChart3,
  Crown,
  Shield,
  Heart,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Crosshair,
  Wallet,
  SwordsIcon,
  Building2,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { NotificationPanel } from '@/components/esports/NotificationPanel';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  division: 'male' | 'female';
  onToggleDivision?: () => void;
  isAdminAuthenticated?: boolean;
  onAdminClick?: () => void;
  adminNotificationCount?: number;
  currentPlayer?: { id: string; name: string; avatar: string | null; tier: string } | null;
  onPlayerLoginClick?: () => void;
}

interface TopBarProps {
  division: 'male' | 'female';
  onToggleDivision: () => void;
  isAdminAuthenticated?: boolean;
  onAdminClick?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onGoHome?: () => void;
  adminNotificationCount?: number;
  currentPlayer?: { id: string; name: string; avatar: string | null; tier: string } | null;
  onPlayerLoginClick?: () => void;
}

/* ────────────────────────────────────────────
   Tab Definitions — grandfinal is separate
   ──────────────────────────────────────────── */

const regularNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'tournament', label: 'Tournament', icon: Swords },
  { id: 'bracket', label: 'Bracket', icon: GitBranch },
  { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { id: 'bounty', label: 'Bounty', icon: Crosshair },
  { id: 'matchmaking', label: 'Matchmaking', icon: SwordsIcon },
  { id: 'club', label: 'Komunitas', icon: Building2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'donation', label: 'Donasi', icon: Heart },
];

// Mobile bottom bar: show only these 5 + GrandFinal center
const mobileNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tournament', label: 'Tourney', icon: Swords },
  { id: 'bounty', label: 'Bounty', icon: Crosshair },
  { id: 'leaderboard', label: 'Board', icon: BarChart3 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
];



/* ════════════════════════════════════════════
   Admin FAB  –  Small floating admin button (mobile)
   ════════════════════════════════════════════ */

export function AdminFAB({
  division,
  isAdminAuthenticated,
  onAdminClick,
  adminNotificationCount = 0,
}: {
  division: 'male' | 'female';
  isAdminAuthenticated?: boolean;
  onAdminClick?: () => void;
  adminNotificationCount?: number;
}) {
  const dt = useDivisionTheme(division);

  return (
    <motion.button
      onClick={onAdminClick}
      className="fixed z-[60] flex items-center justify-center gap-1.5 cursor-pointer outline-none md:bottom-6 md:right-6 px-3"
      style={{
        height: 40,
        right: 12,
        bottom: 76, // Above bottom nav on mobile
        background: isAdminAuthenticated
          ? `linear-gradient(135deg, ${dt.accentBg(0.20)} 0%, ${dt.accentBg(0.10)} 100%)`
          : 'rgba(40,40,45,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isAdminAuthenticated
          ? `1.5px solid ${dt.accentBorder(0.40)}`
          : '1.5px solid var(--border-medium)',
        borderRadius: 20,
        boxShadow: isAdminAuthenticated
          ? `0 4px 16px ${dt.accentGlow(0.25)}, 0 0 0 1px ${dt.accentBg(0.10)}`
          : '0 4px 16px rgba(0,0,0,0.40), 0 0 0 1px var(--border-subtle)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <Shield
        className="w-4 h-4"
        style={{
          color: isAdminAuthenticated ? dt.accent : 'var(--text-tertiary)',
        }}
        strokeWidth={2}
      />
      <span
        className="text-[11px] font-semibold tracking-wide"
        style={{
          color: isAdminAuthenticated ? dt.accent : 'var(--text-tertiary)',
        }}
      >
        {isAdminAuthenticated ? 'Admin' : 'Login'}
      </span>

      {/* Notification badge */}
      {isAdminAuthenticated && adminNotificationCount > 0 && (
        <motion.div
          className="absolute flex items-center justify-center text-[8px] font-bold"
          style={{
            top: -4,
            right: -4,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            background: dt.accent,
            color: dt.accentForeground,
            boxShadow: `0 0 6px ${dt.accentGlow(0.5)}`,
            paddingLeft: 4,
            paddingRight: 4,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
        </motion.div>
      )}
    </motion.button>
  );
}

/* ════════════════════════════════════════════
   Navigation  –  iOS-style bottom tab bar
   with floating Grand Final center button
   ════════════════════════════════════════════ */

export function Navigation({ activeTab, onTabChange, division, currentPlayer, onPlayerLoginClick }: NavigationProps) {
  const dt = useDivisionTheme(division);
  const isGfActive = activeTab === 'grandfinal';

  return (
    <>
    {/* ── Mobile Bottom Nav (hidden on tablet and desktop) ── */}
    <nav
      className="fixed bottom-0 left-0 right-0 z-[55] flex justify-center md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* ── Floating bar container ──────────────── */}
      <motion.div
        className="relative w-full max-w-[420px] mx-3"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        {/* Glass bar - DARK for both divisions */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(30,30,35,0.92) 0%, rgba(20,20,25,0.95) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--border-light), inset 0 1px 0 var(--border-subtle)',
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-4 right-4 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${dt.accentBg(0.3)}, transparent)`,
            }}
          />

          <div className="relative flex items-center justify-around px-2 py-2">
            {/* ── Left group: Home, Tournament ── */}
            {mobileNavItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl cursor-pointer outline-none"
                  style={{ touchAction: 'manipulation' }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `linear-gradient(180deg, ${dt.accentBg(0.12)} 0%, ${dt.accentBg(0.04)} 100%)`,
                        border: `1px solid ${dt.accentBorder(0.2)}`,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-200 ${!isActive ? 'text-white/50' : ''}`}
                    style={isActive ? { color: dt.accent } : undefined}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span
                    className={`relative z-10 mt-1 text-[10px] font-semibold tracking-wide transition-all duration-200 ${!isActive ? 'text-white/45' : ''}`}
                    style={isActive ? { color: dt.accent } : undefined}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

            {/* ═══════════════════════════════════════
                GRAND FINAL — Center Button
                ═══════════════════════════════════════ */}
            <motion.button
              onClick={() => onTabChange('grandfinal')}
              className="relative z-20 flex flex-col items-center justify-center cursor-pointer outline-none mx-1"
              style={{ touchAction: 'manipulation' }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {/* Glow ring */}
              {isGfActive && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 64,
                    height: 64,
                    background: `radial-gradient(circle, ${dt.accentBg(0.15)} 0%, transparent 70%)`,
                  }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Main circle */}
              <motion.div
                className="relative rounded-full flex items-center justify-center"
                style={{
                  width: 52,
                  height: 52,
                  background: `linear-gradient(135deg, ${dt.accent} 0%, ${dt.accentLight} 100%)`,
                  boxShadow: `0 4px 16px ${dt.accentGlow(0.35)}, 0 0 0 3px ${dt.accentBg(0.15)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                }}
                animate={isGfActive ? {
                  boxShadow: [
                    `0 4px 16px ${dt.accentGlow(0.35)}, 0 0 0 3px ${dt.accentBg(0.15)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    `0 4px 24px ${dt.accentGlow(0.5)}, 0 0 0 4px ${dt.accentBg(0.25)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    `0 4px 16px ${dt.accentGlow(0.35)}, 0 0 0 3px ${dt.accentBg(0.15)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                  ]
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Crown
                  className="w-6 h-6 text-black/80"
                  strokeWidth={2.2}
                />
              </motion.div>

            </motion.button>

            {/* ── Right group: Leaderboard, Wallet ── */}
            {mobileNavItems.slice(3, 5).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl cursor-pointer outline-none"
                  style={{ touchAction: 'manipulation' }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `linear-gradient(180deg, ${dt.accentBg(0.12)} 0%, ${dt.accentBg(0.04)} 100%)`,
                        border: `1px solid ${dt.accentBorder(0.2)}`,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-200 ${!isActive ? 'text-white/50' : ''}`}
                    style={isActive ? { color: dt.accent } : undefined}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span
                    className={`relative z-10 mt-1 text-[10px] font-semibold tracking-wide transition-all duration-200 ${!isActive ? 'text-white/45' : ''}`}
                    style={isActive ? { color: dt.accent } : undefined}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </nav>

    </>
  );
}

/* ════════════════════════════════════════════
   Sidebar – Desktop/Tablet Navigation
   ════════════════════════════════════════════ */

export function Sidebar({
  division,
  onToggleDivision,
  isAdminAuthenticated,
  onAdminClick,
  activeTab = 'dashboard',
  onTabChange,
  onGoHome,
  adminNotificationCount = 0,
  currentPlayer,
  onPlayerLoginClick,
}: TopBarProps) {
  const dt = useDivisionTheme(division);
  const isMale = division === 'male';
  const otherDt = createDivisionTheme(isMale ? 'female' : 'male');
  const { settings } = useAppSettings();

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 flex-col w-16 lg:w-56"
      style={{
        backgroundColor: '#000000',
      }}
    >
      {/* Dragon Scale Pattern Background - Both divisions */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='${dt.accentBg(0.10)}' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
          opacity: 0.20,
        }}
      />

      {/* Sidebar container */}
      <div
        className="relative flex flex-col h-full"
        style={{
          background: '#000000',
          borderRight: `1px solid ${dt.accentBorder(0.12)}`,
        }}
      >
        {/* ── Logo Section ── */}
        <div
          className="flex items-center justify-center lg:justify-start gap-2 px-3 py-4 border-b"
          style={{
            borderColor: dt.accentBorder(0.08),
          }}
        >
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${dt.accent} 0%, ${dt.accentLight} 100%)`,
              boxShadow: `0 4px 12px ${dt.accentGlow(0.35)}`,
            }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTabChange?.('dashboard')}
          >
            <Crown className="w-5 h-5 text-black/80" strokeWidth={2.5} />
          </motion.div>

          {/* Logo text - hidden on tablet */}
          <div className="hidden lg:flex flex-col leading-tight">
            <span
              className="text-[15px] font-bold tracking-tight"
              style={{
                background: `linear-gradient(to right, ${dt.accentLight}, ${dt.accent}, ${dt.accentDark})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {settings.app_name}
            </span>
            <span className="text-[9px] font-medium tracking-wide"
              style={{ color: 'var(--text-quaternary)' }}
            >
              {settings.app_subtitle}
            </span>
          </div>
        </div>

        {/* ── Navigation Items ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-1">
            {/* Home / Landing Page Button — Gold Accent */}
            <motion.button
              onClick={onGoHome}
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative"
              style={{
                background: `linear-gradient(180deg, ${goldRgba(0.10)} 0%, ${goldRgba(0.03)} 100%)`,
                color: 'var(--gold)',
                border: `1px solid ${goldRgba(0.15)}`,
              }}
              whileHover={{ scale: 1.02, background: `linear-gradient(180deg, ${goldRgba(0.14)} 0%, ${goldRgba(0.05)} 100%)` }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <LayoutGrid className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
              <span className="hidden lg:inline text-[12px] font-medium">Home</span>
            </motion.button>

            {/* Divider */}
            <div className="my-2 h-px" style={{ background: 'var(--border-subtle)' }} />

            {/* Regular Nav Items */}
            {regularNavItems.map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                division={division}
                isActive={activeTab === item.id}
                onClick={() => onTabChange?.(item.id)}
              />
            ))}

            {/* Divider */}
            <div
              className="my-3 h-px"
              style={{ background: dt.accentBorder(0.08) }}
            />

            {/* Grand Final - Special */}
            <SidebarGrandFinalItem
              division={division}
              isActive={activeTab === 'grandfinal'}
              onClick={() => onTabChange?.('grandfinal')}
            />

            <div className="my-1.5 h-px" style={{ background: dt.accentBorder(0.08) }} />

            {/* Division Toggle — only show the OTHER division, blinking */}
            <motion.button
              onClick={onToggleDivision}
              className="w-full mt-1 py-2 rounded-xl text-[11px] font-bold tracking-wide cursor-pointer outline-none relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${otherDt.accentBg(0.12)} 0%, ${otherDt.accentBg(0.04)} 100%)`,
                border: `1.5px solid ${otherDt.accentBorder(0.25)}`,
                color: otherDt.accent,
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {/* Pulsing glow effect */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{
                  boxShadow: [
                    `0 0 4px ${otherDt.accentGlow(0.10)}`,
                    `0 0 14px ${otherDt.accentGlow(0.30)}`,
                    `0 0 4px ${otherDt.accentGlow(0.10)}`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: `linear-gradient(105deg, transparent 40%, ${otherDt.accentBg(0.08)} 50%, transparent 60%)`,
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
              />
              {/* Text blinking */}
              <motion.span
                className="relative z-10 hidden lg:inline"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isMale ? 'Female' : 'Male'} Division
              </motion.span>
              <motion.span
                className="relative z-10 lg:hidden text-[9px]"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isMale ? 'F' : 'M'}
              </motion.span>
            </motion.button>
          </div>
        </nav>

        {/* ── Bottom Section ── */}
        <div
          className="px-2 py-3 space-y-2 border-t"
          style={{
            borderColor: dt.accentBorder(0.08),
          }}
        >
          {/* Notification Bell — Desktop Sidebar */}
          <div className="flex justify-center lg:justify-start px-3">
            <NotificationPanel division={division} />
          </div>

          {/* Player Profile — Login/Logout */}
          {currentPlayer ? (
            <motion.button
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative"
              style={{
                background: `linear-gradient(180deg, ${dt.accentBg(0.08)} 0%, ${dt.accentBg(0.02)} 100%)`,
                border: `1px solid ${dt.accentBorder(0.12)}`,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-[10px] font-bold"
                style={{ background: dt.accentBg(0.15), color: dt.accent }}
              >
                {currentPlayer.avatar
                  ? <img src={currentPlayer.avatar} alt="" className="w-full h-full object-cover" />
                  : currentPlayer.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:flex flex-col items-start leading-tight min-w-0">
                <span className="text-[11px] font-semibold truncate max-w-[120px]" style={{ color: dt.accent }}>
                  {currentPlayer.name}
                </span>
                <span className="text-[9px] text-white/25">Tier {currentPlayer.tier}</span>
              </div>
            </motion.button>
          ) : onPlayerLoginClick ? (
            <motion.button
              onClick={onPlayerLoginClick}
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-tertiary)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <UserCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
              <span className="hidden lg:inline text-[12px] font-medium">Daftar / Masuk</span>
            </motion.button>
          ) : null}

          {/* Admin Panel — moved to bottom */}
          <motion.button
            onClick={onAdminClick}
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative"
            style={{
              background: isAdminAuthenticated
                ? `linear-gradient(180deg, ${dt.accentBg(0.12)} 0%, ${dt.accentBg(0.04)} 100%)`
                : 'var(--surface-2)',
              border: isAdminAuthenticated
                ? `1px solid ${dt.accentBorder(0.25)}`
                : '1px solid var(--border-light)',
              color: isAdminAuthenticated
                ? dt.accent
                : 'var(--text-tertiary)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Shield className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
            <span className="hidden lg:inline text-[12px] font-medium">
              {isAdminAuthenticated ? 'Admin Panel' : 'Login Admin'}
            </span>

            {/* Notification badge */}
            {isAdminAuthenticated && adminNotificationCount > 0 && (
              <motion.span
                className="absolute -top-1 -right-1 flex items-center justify-center text-[9px] font-bold"
                style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: dt.accent,
                  color: dt.accentForeground,
                  boxShadow: `0 0 8px ${dt.accentGlow(0.5)}`,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
              </motion.span>
            )}
          </motion.button>


        </div>
      </div>
    </aside>
  );
}

/* ────────────────────────────────────────────
   SidebarNavItem — Regular nav item for sidebar
   ──────────────────────────────────────────── */

function SidebarNavItem({
  item,
  division,
  isActive,
  onClick,
}: {
  item: NavItem;
  division: 'male' | 'female';
  isActive: boolean;
  onClick: () => void;
}) {
  const dt = useDivisionTheme(division);
  const Icon = item.icon;

  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative"
      style={{
        background: isActive
          ? `linear-gradient(180deg, ${dt.accentBg(0.12)} 0%, ${dt.accentBg(0.04)} 100%)`
          : 'transparent',
        color: isActive
          ? dt.accent
          : 'var(--text-tertiary)',
        border: isActive
          ? `1px solid ${dt.accentBorder(0.2)}`
          : '1px solid transparent',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
      <span className="hidden lg:inline text-[12px] font-medium">{item.label}</span>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
          style={{ background: dt.accent }}
          layoutId="sidebar-active-indicator"
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      )}
    </motion.button>
  );
}

/* ────────────────────────────────────────────
   SidebarGrandFinalItem — Special glowing item
   ──────────────────────────────────────────── */

function SidebarGrandFinalItem({
  division,
  isActive,
  onClick,
}: {
  division: 'male' | 'female';
  isActive: boolean;
  onClick: () => void;
}) {
  const dt = useDivisionTheme(division);

  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${dt.accentBg(0.20)} 0%, ${dt.accentBg(0.08)} 100%)`
          : `linear-gradient(135deg, ${dt.accentBg(0.08)} 0%, ${dt.accentBg(0.03)} 100%)`,
        color: dt.accent,
        border: `1px solid ${dt.accentBorder(0.25)}`,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Crown className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
      <span className="hidden lg:inline text-[12px] font-semibold">Grand Final</span>

      {/* Glow effect when active */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: `0 0 20px ${dt.accentGlow(0.25)}` }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
}

/* ════════════════════════════════════════════
   TopBar  –  Mobile only header
   ════════════════════════════════════════════ */

export function TopBar({
  division,
  onToggleDivision,
  isAdminAuthenticated,
  onAdminClick,
  activeTab = 'dashboard',
  onTabChange,
  onGoHome,
  adminNotificationCount = 0,
  currentPlayer,
  onPlayerLoginClick,
}: TopBarProps) {
  const dt = useDivisionTheme(division);
  const isMale = division === 'male';
  const { settings } = useAppSettings();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
      <div
        className="relative"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* ── Mobile: Compact header ── */}
        <motion.div
          className="mx-3 max-w-[420px]"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          {/* Glass header - DARK for both divisions */}
          <div
            className="relative rounded-b-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(30,30,35,0.92) 0%, rgba(20,20,25,0.95) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px var(--border-subtle), inset 0 1px 0 var(--border-subtle)',
            }}
          >
            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-6 right-6 h-[1px]"
              style={{
                background: `linear-gradient(90deg, transparent, ${dt.accentBg(0.25)}, transparent)`,
              }}
            />

            <div className="flex items-center justify-between px-3.5 py-2.5">
              {/* Left: Home + Logo + Title */}
              <div className="flex items-center gap-1.5">
                <motion.button
                  onClick={onGoHome}
                  className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer outline-none flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${goldRgba(0.12)} 0%, ${goldRgba(0.05)} 100%)`,
                    border: `1px solid ${goldRgba(0.15)}`,
                  }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <LayoutGrid className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} strokeWidth={2} />
                </motion.button>
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => onTabChange?.('dashboard')}
                >
                  <motion.div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${dt.accent} 0%, ${dt.accentLight} 100%)`,
                      boxShadow: `0 2px 8px ${dt.accentGlow(0.3)}`,
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <Crown className="w-3.5 h-3.5 text-black/80" strokeWidth={2.5} />
                  </motion.div>

                  <div className="flex flex-col leading-tight">
                    <span
                      className="text-[13px] font-bold tracking-tight"
                      style={{
                        background: `linear-gradient(to right, ${dt.accentLight}, ${dt.accent}, ${dt.accentDark})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {settings.app_name}
                    </span>
                    <span className="text-[8px] font-medium tracking-wide text-white/40">
                      {settings.app_subtitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Division toggle + Player + Admin Button */}
              <div className="flex items-center gap-1.5">
                {/* Player avatar / login */}
                {currentPlayer ? (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden text-[10px] font-bold cursor-default"
                    style={{
                      background: dt.accentBg(0.12),
                      border: `1px solid ${dt.accentBorder(0.20)}`,
                      color: dt.accent,
                    }}
                  >
                    {currentPlayer.avatar
                      ? <img src={currentPlayer.avatar} alt="" className="w-full h-full object-cover" />
                      : currentPlayer.name.charAt(0).toUpperCase()}
                  </div>
                ) : onPlayerLoginClick ? (
                  <motion.button
                    onClick={onPlayerLoginClick}
                    className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer outline-none"
                    style={{
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border-default)',
                    }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <UserCircle className="w-4 h-4 text-white/40" />
                  </motion.button>
                ) : null}
                {/* Division toggle - Male | Female style */}
                <div
                  className="relative flex rounded-lg overflow-hidden"
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    onClick={() => division !== 'male' && onToggleDivision()}
                    className="px-2 py-0.5 text-[9px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer rounded-l-md"
                    style={{
                      background: division === 'male'
                        ? `linear-gradient(to right, ${ACCENT.male.primary}, ${ACCENT.male.dark})`
                        : undefined,
                      color: division === 'male' ? '#0a0f0d' : 'var(--text-tertiary)',
                    }}
                  >
                    Male
                  </button>
                  <button
                    onClick={() => division !== 'female' && onToggleDivision()}
                    className="px-2 py-0.5 text-[9px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer rounded-r-md"
                    style={{
                      background: division === 'female'
                        ? `linear-gradient(to right, ${ACCENT.female.primary}, ${ACCENT.female.dark})`
                        : undefined,
                      color: division === 'female' ? '#ffffff' : 'var(--text-tertiary)',
                    }}
                  >
                    Female
                  </button>
                </div>

                {/* Notification Bell — hidden on mobile, visible on md+ */}
                <div className="hidden md:block">
                  <NotificationPanel division={division} />
                </div>


                {/* Admin Button */}
                <motion.button
                  onClick={onAdminClick}
                  className="relative flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer outline-none"
                  style={{
                    background: isAdminAuthenticated
                      ? `linear-gradient(180deg, ${dt.accentBg(0.12)} 0%, ${dt.accentBg(0.04)} 100%)`
                      : 'var(--surface-3)',
                    border: isAdminAuthenticated
                      ? `1px solid ${dt.accentBorder(0.25)}`
                      : '1px solid var(--border-medium)',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Shield
                    className="w-4 h-4"
                    style={{
                      color: isAdminAuthenticated ? dt.accent : 'var(--text-tertiary)',
                    }}
                    strokeWidth={2}
                  />
                  {/* Notification badge */}
                  {isAdminAuthenticated && adminNotificationCount > 0 && (
                    <motion.span
                      className="absolute flex items-center justify-center text-[8px] font-bold"
                      style={{
                        top: -4,
                        right: -4,
                        minWidth: 14,
                        height: 14,
                        borderRadius: 7,
                        background: dt.accent,
                        color: dt.accentForeground,
                        paddingLeft: 4,
                        paddingRight: 4,
                        boxShadow: `0 0 6px ${dt.accentGlow(0.5)}`,
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                    </motion.span>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
