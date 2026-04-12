'use client';

import { useMemo } from 'react';
import { createDivisionTheme, DivisionTheme, GOLD, CSS, accentRgba, goldRgba, whiteRgba, blackRgba } from '@/lib/theme-tokens';

// Re-export helpers for convenience
export { accentRgba, goldRgba, whiteRgba, blackRgba, CSS, GOLD };

/**
 * useDivisionTheme — Division-aware theme hook
 * 
 * Returns all accent color variants based on the current division.
 * Use this instead of `isMale ? '#73FF00' : '#38BDF8'` ternaries.
 * 
 * Usage:
 *   const dt = useDivisionTheme('male');
 *   style={{ color: dt.accent }}           // → #73FF00 or #38BDF8
 *   style={{ background: dt.accentBg(0.08) }} // → rgba(115,255,0,0.08)
 *   style={{ border: `1px solid ${dt.accentBorder(0.15)}` }}
 */
export function useDivisionTheme(division: 'male' | 'female'): DivisionTheme & {
  gold: typeof GOLD;
  css: typeof CSS;
  w: typeof whiteRgba;
  b: typeof blackRgba;
} {
  const theme = useMemo(() => createDivisionTheme(division), [division]);
  
  return useMemo(() => ({
    ...theme,
    gold: GOLD,
    css: CSS,
    w: whiteRgba,
    b: blackRgba,
  }), [theme]);
}

export default useDivisionTheme;
