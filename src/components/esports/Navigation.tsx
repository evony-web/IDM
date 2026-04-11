'use client';

import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAppSettings } from '@/hooks/useAppSettings';
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
}

/* ────────────────────────────────────────────
   Tab Definitions — grandfinal is separate
   ──────────────────────────────────────────── */

const regularNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'tournament', label: 'Tournament', icon: Swords },
  { id: 'bracket', label: 'Bracket', icon: GitBranch },
  { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { id: 'donation', label: 'Donasi', icon: Heart },
];



/* ────────────────────────────────────────────
   Theme Token Helpers - DARK MODE ONLY

   - Male = Green (#73FF00)
   - Female = Blue (#38BDF8)
   ──────────────────────────────────────────── */

function getThemeTokens(division: 'male' | 'female') {
  const isMale = division === 'male';

  if (isMale) {
    // MALE = GREEN
    return {
      primaryColor: '#73FF00',
      primaryColorDark: '#4AB800',
      primaryColorLight: '#8CFF00',
      glowRGB: '115,255,0',
      glowRGB2: '140,255,0',
      activeText: 'text-[#73FF00]',
      titleGradient: 'bg-gradient-to-r from-[#8CFF00] via-[#73FF00] to-[#5FD400] bg-clip-text text-transparent',
    };
  } else {
    // FEMALE = BLUE
    return {
      primaryColor: '#38BDF8',
      primaryColorDark: '#0EA5E9',
      primaryColorLight: '#7DD3FC',
      glowRGB: '56,189,248',
      glowRGB2: '125,211,252',
      activeText: 'text-[#38BDF8]',
      titleGradient: 'bg-gradient-to-r from-[#7DD3FC] via-[#38BDF8] to-[#0EA5E9] bg-clip-text text-transparent',
    };
  }
}

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
  const t = getThemeTokens(division);

  return (
    <motion.button
      onClick={onAdminClick}
      className="fixed z-[60] flex items-center justify-center gap-1.5 cursor-pointer outline-none md:bottom-6 md:right-6 px-3"
      style={{
        height: 40,
        right: 12,
        bottom: 76, // Above bottom nav on mobile
        background: isAdminAuthenticated
          ? `linear-gradient(135deg, rgba(${t.glowRGB},0.20) 0%, rgba(${t.glowRGB},0.10) 100%)`
          : 'rgba(40,40,45,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isAdminAuthenticated
          ? `1.5px solid rgba(${t.glowRGB},0.40)`
          : '1.5px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        boxShadow: isAdminAuthenticated
          ? `0 4px 16px rgba(${t.glowRGB},0.25), 0 0 0 1px rgba(${t.glowRGB},0.10)`
          : '0 4px 16px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <Shield
        className="w-4 h-4"
        style={{
          color: isAdminAuthenticated ? t.primaryColor : 'rgba(255,255,255,0.5)',
        }}
        strokeWidth={2}
      />
      <span
        className="text-[11px] font-semibold tracking-wide"
        style={{
          color: isAdminAuthenticated ? t.primaryColor : 'rgba(255,255,255,0.5)',
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
            background: t.primaryColor,
            color: division === 'male' ? '#000' : '#fff',
            boxShadow: `0 0 6px rgba(${t.glowRGB},0.5)`,
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

export function Navigation({ activeTab, onTabChange, division }: NavigationProps) {
  const t = getThemeTokens(division);
  const isGfActive = activeTab === 'grandfinal';
  const isMale = division === 'male';

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
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-4 right-4 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(${t.glowRGB},0.3), transparent)`,
            }}
          />

          <div className="relative flex items-center justify-around px-2 py-2">
            {/* ── Left group: Dashboard, Tournament ── */}
            {regularNavItems.slice(0, 2).map((item) => {
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
                        background: `linear-gradient(180deg, rgba(${t.glowRGB},0.12) 0%, rgba(${t.glowRGB},0.04) 100%)`,
                        border: `1px solid rgba(${t.glowRGB},0.2)`,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-200 ${
                      isActive ? t.activeText : 'text-white/50'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span
                    className={`relative z-10 mt-1 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                      isActive ? t.activeText : 'text-white/45'
                    }`}
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
                    background: `radial-gradient(circle, rgba(${t.glowRGB},0.15) 0%, transparent 70%)`,
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
                  background: `linear-gradient(135deg, rgba(${t.glowRGB},1) 0%, rgba(${t.glowRGB2},1) 100%)`,
                  boxShadow: `0 4px 16px rgba(${t.glowRGB},0.35), 0 0 0 3px rgba(${t.glowRGB},0.15), inset 0 1px 0 rgba(255,255,255,0.3)`,
                }}
                animate={isGfActive ? {
                  boxShadow: [
                    `0 4px 16px rgba(${t.glowRGB},0.35), 0 0 0 3px rgba(${t.glowRGB},0.15), inset 0 1px 0 rgba(255,255,255,0.3)`,
                    `0 4px 24px rgba(${t.glowRGB},0.5), 0 0 0 4px rgba(${t.glowRGB},0.25), inset 0 1px 0 rgba(255,255,255,0.3)`,
                    `0 4px 16px rgba(${t.glowRGB},0.35), 0 0 0 3px rgba(${t.glowRGB},0.15), inset 0 1px 0 rgba(255,255,255,0.3)`,
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

            {/* ── Right group: Bracket, Leaderboard ── */}
            {regularNavItems.slice(2, 4).map((item) => {
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
                        background: `linear-gradient(180deg, rgba(${t.glowRGB},0.12) 0%, rgba(${t.glowRGB},0.04) 100%)`,
                        border: `1px solid rgba(${t.glowRGB},0.2)`,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-200 ${
                      isActive ? t.activeText : 'text-white/50'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span
                    className={`relative z-10 mt-1 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                      isActive ? t.activeText : 'text-white/45'
                    }`}
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
}: TopBarProps) {
  const t = getThemeTokens(division);
  const isMale = division === 'male';

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
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='${isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)'}' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
          opacity: 0.20,
        }}
      />

      {/* Sidebar container */}
      <div
        className="relative flex flex-col h-full"
        style={{
          background: '#000000',
          borderRight: `1px solid rgba(${t.glowRGB},0.12)`,
        }}
      >
        {/* ── Logo Section ── */}
        <div
          className="flex items-center justify-center lg:justify-start gap-2 px-3 py-4 border-b"
          style={{
            borderColor: `rgba(${t.glowRGB},0.08)`,
          }}
        >
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, rgba(${t.glowRGB},1) 0%, rgba(${t.glowRGB2},1) 100%)`,
              boxShadow: `0 4px 12px rgba(${t.glowRGB},0.35)`,
            }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTabChange?.('dashboard')}
          >
            <Crown className="w-5 h-5 text-black/80" strokeWidth={2.5} />
          </motion.div>

          {/* Logo text - hidden on tablet */}
          <div className="hidden lg:flex flex-col leading-tight">
            <span className={`text-[15px] font-bold tracking-tight ${t.titleGradient}`}>
              {useAppSettings().settings.app_name}
            </span>
            <span className="text-[9px] font-medium tracking-wide"
              style={{ color: 'rgba(255,255,255,0.40)' }}
            >
              {useAppSettings().settings.app_subtitle}
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
                background: 'linear-gradient(180deg, rgba(255,215,0,0.10) 0%, rgba(255,215,0,0.03) 100%)',
                color: '#FFD700',
                border: '1px solid rgba(255,215,0,0.15)',
              }}
              whileHover={{ scale: 1.02, background: 'linear-gradient(180deg, rgba(255,215,0,0.14) 0%, rgba(255,215,0,0.05) 100%)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <LayoutGrid className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
              <span className="hidden lg:inline text-[12px] font-medium">Home</span>
            </motion.button>

            {/* Divider */}
            <div className="my-2 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

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
              style={{ background: `rgba(${t.glowRGB},0.08)` }}
            />

            {/* Grand Final - Special */}
            <SidebarGrandFinalItem
              division={division}
              isActive={activeTab === 'grandfinal'}
              onClick={() => onTabChange?.('grandfinal')}
            />

            <div className="my-1.5 h-px" style={{ background: `rgba(${t.glowRGB},0.08)` }} />

            {/* Division Toggle — only show the OTHER division, blinking */}
            <motion.button
              onClick={onToggleDivision}
              className="w-full mt-1 py-2 rounded-xl text-[11px] font-bold tracking-wide cursor-pointer outline-none relative overflow-hidden"
              style={{
                background: isMale
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(115,255,0,0.12) 0%, rgba(115,255,0,0.04) 100%)',
                border: isMale
                  ? '1.5px solid rgba(56,189,248,0.25)'
                  : '1.5px solid rgba(115,255,0,0.25)',
                color: isMale ? '#38BDF8' : '#73FF00',
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {/* Pulsing glow effect */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{
                  boxShadow: isMale
                    ? [
                        '0 0 4px rgba(56,189,248,0.10)',
                        '0 0 14px rgba(56,189,248,0.30)',
                        '0 0 4px rgba(56,189,248,0.10)',
                      ]
                    : [
                        '0 0 4px rgba(115,255,0,0.10)',
                        '0 0 14px rgba(115,255,0,0.30)',
                        '0 0 4px rgba(115,255,0,0.10)',
                      ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: isMale
                    ? 'linear-gradient(105deg, transparent 40%, rgba(56,189,248,0.08) 50%, transparent 60%)'
                    : 'linear-gradient(105deg, transparent 40%, rgba(115,255,0,0.08) 50%, transparent 60%)',
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
            borderColor: `rgba(${t.glowRGB},0.08)`,
          }}
        >
          {/* Notification Bell — Desktop Sidebar */}
          <div className="flex justify-center lg:justify-start px-3">
            <NotificationPanel division={division} />
          </div>

          {/* Admin Panel — moved to bottom */}
          <motion.button
            onClick={onAdminClick}
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative"
            style={{
              background: isAdminAuthenticated
                ? `linear-gradient(180deg, rgba(${t.glowRGB},0.12) 0%, rgba(${t.glowRGB},0.04) 100%)`
                : 'rgba(255,255,255,0.03)',
              border: isAdminAuthenticated
                ? `1px solid rgba(${t.glowRGB},0.25)`
                : '1px solid rgba(255,255,255,0.06)',
              color: isAdminAuthenticated
                ? t.primaryColor
                : 'rgba(255,255,255,0.50)',
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
                  background: t.primaryColor,
                  color: division === 'male' ? '#000' : '#fff',
                  boxShadow: `0 0 8px rgba(${t.glowRGB},0.5)`,
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
  const t = getThemeTokens(division);
  const Icon = item.icon;

  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative"
      style={{
        background: isActive
          ? `linear-gradient(180deg, rgba(${t.glowRGB},0.12) 0%, rgba(${t.glowRGB},0.04) 100%)`
          : 'transparent',
        color: isActive 
          ? t.primaryColor 
          : 'rgba(255,255,255,0.50)',
        border: isActive 
          ? `1px solid rgba(${t.glowRGB},0.2)` 
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
          style={{ background: t.primaryColor }}
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
  const t = getThemeTokens(division);

  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer outline-none relative overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg, rgba(${t.glowRGB},0.20) 0%, rgba(${t.glowRGB},0.08) 100%)`
          : `linear-gradient(135deg, rgba(${t.glowRGB},0.08) 0%, rgba(${t.glowRGB},0.03) 100%)`,
        color: t.primaryColor,
        border: `1px solid rgba(${t.glowRGB},0.25)`,
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
          style={{ boxShadow: `0 0 20px rgba(${t.glowRGB},0.25)` }}
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
}: TopBarProps) {
  const t = getThemeTokens(division);
  const isMale = division === 'male';

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
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-6 right-6 h-[1px]"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${t.glowRGB},0.25), transparent)`,
              }}
            />

            <div className="flex items-center justify-between px-3.5 py-2.5">
              {/* Left: Home + Logo + Title */}
              <div className="flex items-center gap-1.5">
                <motion.button
                  onClick={onGoHome}
                  className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer outline-none flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,215,0,0.05) 100%)',
                    border: '1px solid rgba(255,215,0,0.15)',
                  }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <LayoutGrid className="w-3.5 h-3.5" style={{ color: '#FFD700' }} strokeWidth={2} />
                </motion.button>
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => onTabChange?.('dashboard')}
                >
                  <motion.div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, rgba(${t.glowRGB},1) 0%, rgba(${t.glowRGB2},1) 100%)`,
                      boxShadow: `0 2px 8px rgba(${t.glowRGB},0.3)`,
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <Crown className="w-3.5 h-3.5 text-black/80" strokeWidth={2.5} />
                  </motion.div>

                  <div className="flex flex-col leading-tight">
                    <span className={`text-[13px] font-bold tracking-tight ${t.titleGradient}`}>
                      {useAppSettings().settings.app_name}
                    </span>
                    <span className="text-[8px] font-medium tracking-wide text-white/40">
                      {useAppSettings().settings.app_subtitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Division toggle + Admin Button */}
              <div className="flex items-center gap-1.5">
                {/* Division toggle - Male | Female style */}
                <div
                  className="relative flex rounded-lg overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <button
                    onClick={() => division !== 'male' && onToggleDivision()}
                    className={`px-2 py-0.5 text-[9px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                      division === 'male'
                        ? 'bg-gradient-to-r from-[#73FF00] to-[#5FD400] text-black rounded-l-md'
                        : 'text-white/45 hover:text-white/60'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    onClick={() => division !== 'female' && onToggleDivision()}
                    className={`px-2 py-0.5 text-[9px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                      division === 'female'
                        ? 'bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] text-white rounded-r-md'
                        : 'text-white/45 hover:text-white/60'
                    }`}
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
                      ? `linear-gradient(180deg, rgba(${t.glowRGB},0.12) 0%, rgba(${t.glowRGB},0.04) 100%)`
                      : 'rgba(255,255,255,0.04)',
                    border: isAdminAuthenticated
                      ? `1px solid rgba(${t.glowRGB},0.25)`
                      : '1px solid rgba(255,255,255,0.1)',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Shield
                    className="w-4 h-4"
                    style={{
                      color: isAdminAuthenticated ? t.primaryColor : 'rgba(255,255,255,0.45)',
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
                        background: t.primaryColor,
                        color: division === 'male' ? '#000' : '#fff',
                        paddingLeft: 4,
                        paddingRight: 4,
                        boxShadow: `0 0 6px rgba(${t.glowRGB},0.5)`,
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
