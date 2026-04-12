# Task 2-b: Replace hardcoded color values with theme tokens in Navigation.tsx

## Agent: Theme Refactor Agent

## Summary
Refactored `/home/z/my-project/src/components/esports/Navigation.tsx` to replace all hardcoded color values with theme tokens from the project's theme system.

## Key Changes

### Removed
- `getThemeTokens()` function (~30 lines) that hardcoded male/female accent colors

### Added Imports
- `useDivisionTheme` from `@/hooks/useDivisionTheme`
- `createDivisionTheme`, `goldRgba`, `ACCENT` from `@/lib/theme-tokens`

### Components Refactored (6 total)
1. **AdminFAB** — `getThemeTokens` → `useDivisionTheme(division)`, all accent rgba → `dt.accent*()`, badge fg → `dt.accentForeground`
2. **Navigation** (bottom nav) — accent gradients/glow → `dt.accentBg()`/`dt.accentGlow()`, GF button → `dt.accent`/`dt.accentLight`, `activeText` → inline style
3. **Sidebar** — accent patterns → `dt.accent*()`, gold → `goldRgba()`/`var(--gold)`, division toggle → `otherDt = createDivisionTheme(...)`, SVG pattern → `dt.accentBg(0.10)`
4. **SidebarNavItem** — accent → `dt.accent*()`, inactive text → `var(--text-tertiary)`
5. **SidebarGrandFinalItem** — accent → `dt.accent*()`
6. **TopBar** — accent → `dt.accent*()`, gold → `goldRgba()`/`var(--gold)`, division toggle Tailwind classes → inline style with `ACCENT.*`, white rgba → CSS vars

### Color Mapping Applied
| Pattern | Replacement |
|---------|------------|
| `t.primaryColor` | `dt.accent` |
| `rgba(${t.glowRGB},X)` | `dt.accentBg(X)` / `dt.accentBorder(X)` / `dt.accentGlow(X)` |
| `rgba(${t.glowRGB2},1)` | `dt.accentLight` |
| `#FFD700` | `var(--gold)` |
| `rgba(255,215,0,X)` | `goldRgba(X)` |
| `division === 'male' ? '#000' : '#fff'` | `dt.accentForeground` |
| `rgba(255,255,255,0.50/0.45)` | `var(--text-tertiary)` |
| `rgba(255,255,255,0.12/0.10)` | `var(--border-medium)` |
| `rgba(255,255,255,0.08/0.06)` | `var(--border-light)` / `var(--border-default)` |
| `rgba(255,255,255,0.05/0.04)` | `var(--border-subtle)` |
| `rgba(255,255,255,0.03)` | `var(--surface-2)` |
| `rgba(255,255,255,0.04)` (bg) | `var(--surface-3)` |
| `t.titleGradient` (Tailwind) | inline style gradient + bg-clip-text |
| `t.activeText` (Tailwind) | inline style `color: dt.accent` |
| Opposite division ternaries | `otherDt = createDivisionTheme(isMale ? 'female' : 'male')` |

## Verification
- `bun run lint` passes clean
- Dev server compiles successfully
