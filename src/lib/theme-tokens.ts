/**
 * ═══════════════════════════════════════════
 * 🐉 NIGHT FURY THEME TOKENS
 * ═══════════════════════════════════════════
 * 
 * Single source of truth for all color tokens.
 * Use these instead of hardcoded hex/rgba values.
 * 
 * CSS variables handle division-based theming automatically.
 * This file provides TypeScript access to the same tokens.
 */

// ── Accent Color Definitions ──
export const ACCENT = {
  male: {
    primary: '#73FF00',
    light: '#8CFF00',
    dark: '#5FD400',
    rgb: '115, 255, 0',
  },
  female: {
    primary: '#38BDF8',
    light: '#7DD3FC',
    dark: '#0EA5E9',
    rgb: '56, 189, 248',
  },
} as const;

// ── Gold / Trophy Colors ──
export const GOLD = {
  primary: '#FFD700',
  light: '#FFE44D',
  dark: '#CC9F00',
  rgb: '255, 215, 0',
} as const;

// ── Semantic Status Colors ──
export const STATUS = {
  live: { color: '#30D158', rgb: '48, 209, 88' },
  completed: { color: '#BF5AF2', rgb: '191, 90, 242' },
  setup: { color: '#FF9F0A', rgb: '255, 159, 10' },
  registration: { color: '#FFD700', rgb: '255, 215, 0' },
  destructive: { color: '#FF453A', rgb: '255, 69, 58' },
} as const;

// ── ELO Tier Colors (shared across components) ──
export const ELO_TIER_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Bronze:   { color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.20)',  label: 'Bronze' },
  Silver:   { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.20)', label: 'Silver' },
  Gold:     { color: '#FFD700', bg: 'rgba(255,215,0,0.12)',   border: 'rgba(255,215,0,0.20)',   label: 'Gold' },
  Platinum: { color: '#64D2FF', bg: 'rgba(100,210,255,0.12)', border: 'rgba(100,210,255,0.20)', label: 'Platinum' },
  Diamond:  { color: '#BF5AF2', bg: 'rgba(191,90,242,0.12)',  border: 'rgba(191,90,242,0.20)',  label: 'Diamond' },
  Master:   { color: '#FF453A', bg: 'rgba(255,69,58,0.12)',   border: 'rgba(255,69,58,0.20)',   label: 'Master' },
  Grandmaster: { color: '#FF2D55', bg: 'rgba(255,45,85,0.12)', border: 'rgba(255,45,85,0.20)', label: 'Grandmaster' },
};

// ── Rank Colors (Top 3) ──
export const RANK_COLORS = [
  { color: '#FFD60A', bg: 'rgba(255,214,10,0.15)',  border: 'rgba(255,214,10,0.25)',  glow: 'rgba(255,214,10,0.40)' },  // #1 Gold
  { color: '#C7C7CC', bg: 'rgba(199,199,204,0.12)', border: 'rgba(199,199,204,0.20)', glow: 'rgba(199,199,204,0.30)' },  // #2 Silver
  { color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.20)',  glow: 'rgba(205,127,50,0.30)' },  // #3 Bronze
] as const;

// ── White Opacity Scale (replaces rgba(255,255,255,X) and text-white/XX) ──
// Use with CSS variables: var(--text-primary), var(--text-secondary), etc.
// Or with Tailwind: text-theme-primary, text-theme-secondary, etc.
export const TEXT_OPACITY = {
  92: 'rgba(255, 255, 255, 0.92)',  // --text-primary
  60: 'rgba(255, 255, 255, 0.60)',  // --text-secondary
  48: 'rgba(255, 255, 255, 0.48)',  // --muted-foreground
  38: 'rgba(255, 255, 255, 0.38)',  // --text-tertiary
  25: 'rgba(255, 255, 255, 0.25)',  // --text-quaternary
  22: 'rgba(255, 255, 255, 0.22)',
  15: 'rgba(255, 255, 255, 0.15)',
  12: 'rgba(255, 255, 255, 0.12)',
  10: 'rgba(255, 255, 255, 0.10)',
  8: 'rgba(255, 255, 255, 0.08)',
  6: 'rgba(255, 255, 255, 0.06)',
  4: 'rgba(255, 255, 255, 0.04)',
  3: 'rgba(255, 255, 255, 0.03)',
  2: 'rgba(255, 255, 255, 0.02)',
} as const;

// ── CSS Variable References for inline styles ──
// Use these in style={{ }} props instead of hardcoded values
export const CSS = {
  // Text
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textTertiary: 'var(--text-tertiary)',
  textQuaternary: 'var(--text-quaternary)',
  
  // Accent (division-aware)
  accent: 'var(--primary)',
  accentLight: 'var(--primary-light)',
  accentDark: 'var(--primary-dark)',
  accentForeground: 'var(--primary-foreground)',
  accentMuted: 'var(--gold-muted)',
  accentGlow: 'var(--gold-glow)',
  
  // Gold (always gold, division-independent)
  gold: 'var(--gold)',
  goldLight: 'var(--gold-light)',
  goldDark: 'var(--gold-dark)',
  goldMuted: 'var(--gold-muted)',
  goldGlow: 'var(--gold-glow)',
  
  // Backgrounds
  bg: 'var(--background)',
  bgSecondary: 'var(--background-secondary)',
  bgTertiary: 'var(--background-tertiary)',
  bgElevated: 'var(--background-elevated)',
  
  // Glass
  glassBg: 'var(--glass-bg)',
  glassHover: 'var(--glass-hover)',
  glassBorder: 'var(--glass-border)',
  glassHighlight: 'var(--glass-highlight)',
  glassBgSubtle: 'var(--glass-bg-subtle)',
  glassBgHeavy: 'var(--glass-bg-heavy)',
  
  // Card
  card: 'var(--card)',
  cardForeground: 'var(--card-foreground)',
  
  // Border
  border: 'var(--border)',
  input: 'var(--input)',
  ring: 'var(--ring)',
  
  // Status
  destructive: 'var(--destructive)',
  orange: 'var(--orange)',
  orangeMuted: 'var(--orange-muted)',
  purple: 'var(--purple)',
  purpleMuted: 'var(--purple-muted)',
  green: 'var(--green)',
  greenMuted: 'var(--green-muted)',
  cyan: 'var(--cyan)',
  cyanMuted: 'var(--cyan-muted)',
  rose: 'var(--rose)',
  roseMuted: 'var(--rose-muted)',
  red: 'var(--red)',
  redMuted: 'var(--red-muted)',
  
  // Shadows
  depth1: 'var(--depth-1)',
  depth2: 'var(--depth-2)',
  depth3: 'var(--depth-3)',
  depth4: 'var(--depth-4)',
  depth5: 'var(--depth-5)',
  
  // Transitions
  themeTransition: 'var(--theme-transition)',
  durationFast: 'var(--duration-fast)',
  durationNormal: 'var(--duration-normal)',
  durationSlow: 'var(--duration-slow)',
  easeOutExpo: 'var(--ease-out-expo)',
  easeSpring: 'var(--ease-spring)',
} as const;

// ── Helper: Create rgba from accent RGB ──
export function accentRgba(division: 'male' | 'female', opacity: number): string {
  const rgb = ACCENT[division].rgb;
  return `rgba(${rgb}, ${opacity})`;
}

// ── Helper: Create gold rgba ──
export function goldRgba(opacity: number): string {
  return `rgba(${GOLD.rgb}, ${opacity})`;
}

// ── Helper: Create white rgba ──
export function whiteRgba(opacity: number): string {
  return `rgba(255, 255, 255, ${opacity})`;
}

// ── Helper: Create black rgba ──
export function blackRgba(opacity: number): string {
  return `rgba(0, 0, 0, ${opacity})`;
}

// ── Division Theme Type ──
export interface DivisionTheme {
  // Accent colors
  accent: string;
  accentLight: string;
  accentDark: string;
  accentRgb: string;
  accentForeground: string;
  
  // Accent with opacity
  accentBg: (opacity: number) => string;
  accentBorder: (opacity: number) => string;
  accentGlow: (opacity: number) => string;
  accentShadow: (opacity: number) => string;
  
  // Gradient presets
  gradientAccent: string;
  gradientAccentButton: string;
  gradientAccentBg: string;
  
  // Ring
  avatarRingGradient: string;
  avatarRingShadow: string;
  
  // Division info
  division: 'male' | 'female';
  isMale: boolean;
}

// ── Create Division Theme ──
export function createDivisionTheme(division: 'male' | 'female'): DivisionTheme {
  const a = ACCENT[division];
  const isMale = division === 'male';
  
  return {
    accent: a.primary,
    accentLight: a.light,
    accentDark: a.dark,
    accentRgb: a.rgb,
    accentForeground: isMale ? '#0a0f0d' : '#ffffff',
    
    accentBg: (opacity: number) => `rgba(${a.rgb}, ${opacity})`,
    accentBorder: (opacity: number) => `rgba(${a.rgb}, ${opacity})`,
    accentGlow: (opacity: number) => `rgba(${a.rgb}, ${opacity})`,
    accentShadow: (opacity: number) => `0 0 ${Math.round(opacity * 40)}px rgba(${a.rgb}, ${opacity})`,
    
    gradientAccent: `linear-gradient(180deg, ${a.primary} 0%, ${a.dark} 100%)`,
    gradientAccentButton: `linear-gradient(180deg, ${a.primary} 0%, ${a.dark} 100%)`,
    gradientAccentBg: `linear-gradient(135deg, rgba(${a.rgb}, 0.08) 0%, rgba(${a.rgb}, 0.03) 100%)`,
    
    avatarRingGradient: `linear-gradient(145deg, ${a.primary}, ${a.dark}, ${a.light}, ${a.primary})`,
    avatarRingShadow: `0 0 14px rgba(${a.rgb}, 0.18), 0 0 28px rgba(${a.rgb}, 0.06), 0 2px 8px rgba(0, 0, 0, 0.30)`,
    
    division,
    isMale,
  };
}
