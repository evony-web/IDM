'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useSyncExternalStore } from 'react';

/* ────────────────────────────────────────────
   SIMPLE THEME: Only Dark or Light
   - Male = Green accent
   - Female = Pink accent

   Uses next-themes for persistence & SSR safety.
   ════════════════════════════════════════════ */

export type ThemeMode = 'dark' | 'light';

// Color based on division
const getAccentColor = (division: 'male' | 'female') => ({
  primary: division === 'male' ? '#73FF00' : '#38BDF8',
  glow: division === 'male' ? 'rgba(115, 255, 0, 0.35)' : 'rgba(56, 189, 248, 0.35)',
});

// Hydration-safe mounted check using useSyncExternalStore
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,  // client: always mounted
    () => false, // server: never mounted
  );
}

/* ════════════════════════════════════════════
   Compact Theme Toggle for Navigation
   Sun = Light, Moon = Dark
   ════════════════════════════════════════════ */

export function CompactThemeToggle({
  division = 'male'
}: {
  division?: 'male' | 'female';
}) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const isLight = mounted ? (theme === 'light' || theme?.startsWith('light')) : false;
  const accent = getAccentColor(division);

  const toggleTheme = () => {
    setTheme(isLight ? 'dark' : 'light');
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 cursor-pointer"
      style={{
        background: isLight
          ? 'rgba(250, 250, 250, 0.90)'
          : 'rgba(30, 30, 35, 0.90)',
        border: isLight
          ? '1px solid rgba(148, 163, 184, 0.25)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isLight
          ? '0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          : '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <AnimatePresence mode="wait">
        {isLight ? (
          <motion.div
            key="sun"
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{ duration: 0.25 }}
          >
            <Sun
              className="w-4 h-4"
              style={{ color: accent.primary }}
              strokeWidth={2.5}
            />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
            transition={{ duration: 0.25 }}
          >
            <Moon
              className="w-4 h-4"
              style={{ color: accent.primary }}
              strokeWidth={2.5}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ boxShadow: `0 0 12px ${accent.glow}` }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.button>
  );
}

/* ════════════════════════════════════════════
   Full ThemeToggle Component (optional use)
   ════════════════════════════════════════════ */

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  division?: 'male' | 'female';
}

export function ThemeToggle({
  size = 'md',
  showLabels = false,
  division = 'male'
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const isLight = mounted ? (theme === 'light' || theme?.startsWith('light')) : false;
  const accent = getAccentColor(division);

  const sizeConfig = {
    sm: { width: 52, height: 28, thumb: 22, icon: 12 },
    md: { width: 64, height: 34, thumb: 28, icon: 16 },
    lg: { width: 76, height: 40, thumb: 34, icon: 20 },
  };

  const s = sizeConfig[size];

  return (
    <div className="flex items-center gap-2">
      {showLabels && (
        <span className={`text-[10px] font-semibold tracking-wide ${isLight ? 'text-slate-600' : 'text-white/60'}`}>
          {isLight ? 'Light' : 'Dark'}
        </span>
      )}

      <motion.button
        onClick={() => setTheme(isLight ? 'dark' : 'light')}
        className="relative rounded-full"
        style={{ width: s.width, height: s.height }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Track */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: isLight
              ? 'linear-gradient(135deg, #fafafa 0%, #e2e8f0 100%)'
              : 'linear-gradient(135deg, #0a0f0d 0%, #1a1a1f 100%)',
            border: isLight
              ? '1px solid rgba(148, 163, 184, 0.20)'
              : `1px solid ${accent.glow.replace('0.35', '0.15')}`,
          }}
        />

        {/* Thumb */}
        <motion.div
          className="absolute top-1 flex items-center justify-center rounded-full bg-white"
          style={{
            width: s.thumb,
            height: s.thumb,
            boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15), 0 0 12px ${accent.glow}`,
          }}
          animate={{ left: isLight ? s.width - s.thumb - 4 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {isLight ? (
            <Sun className="w-4 h-4" style={{ color: accent.primary }} strokeWidth={2.5} />
          ) : (
            <Moon className="w-4 h-4" style={{ color: accent.primary }} strokeWidth={2.5} />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}

export default ThemeToggle;
