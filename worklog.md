---
Task ID: 1
Agent: Main Agent
Task: Add dynamic current season tracking - Season advances every 11 completed tournaments

Work Log:
- Reverted auto-increment season from finalize route and tournament PUT route (wrong approach)
- Removed current_season from Settings defaults and useAppSettings (no longer needed)
- Updated season-leaderboard API to calculate currentSeason dynamically: Math.floor(completedTournaments / 11) + 1
- Updated UnifiedLeaderboard frontend: default selectedSeason to currentSeason from API (not "all")
- Added "AKTIF" badge to current season in dropdown and button
- Updated header subtitle: "Season X sedang berjalan"
- Dropdown now shows visual distinction for current vs past seasons

Stage Summary:
- currentSeason is calculated dynamically from completed tournament count (no stored state)
- Formula: Season = floor(completedCount / 11) + 1 (Season 1: 0-10, Season 2: 11-21, etc.)
- Frontend defaults to current season on first load, user can switch to "All Seasons" or past seasons
- All lint checks pass, dev server running clean

---
Task ID: 2
Agent: Main Agent
Task: Implement secure authentication with NextAuth.js (JWT + httpOnly cookies) and remove Discover page

Work Log:
- Created /src/lib/auth.ts with NextAuth configuration (Credentials provider, JWT strategy, httpOnly cookies)
- Created /src/app/api/auth/[...nextauth]/route.ts for NextAuth API endpoint
- Created /src/lib/session.ts with requirePlayerAuth() and getPlayerSession() helpers
- Added NEXTAUTH_SECRET and NEXTAUTH_URL to .env
- Created /src/components/providers/AuthProvider.tsx (SessionProvider wrapper)
- Added AuthProvider to layout.tsx wrapping AppSettingsProvider
- Updated PlayerAuth.tsx: Login now uses signIn('player-credentials') instead of direct API call, Signup creates account then auto-signs in via NextAuth
- Updated store.ts: Removed localStorage persistence for player auth (idm_player_auth), logoutPlayer calls NextAuth signOut
- Updated /src/app/api/wallet/route.ts: GET and POST now use requirePlayerAuth() - userId comes from session not request
- Updated /src/app/api/wallet/transfer/route.ts: POST now uses requirePlayerAuth() - senderId comes from session not request body
- Updated WalletTab.tsx: API calls no longer pass userId in URL/body (session-based), handles 401 with logout
- Updated page.tsx: Added useSession() hook for session sync with Zustand store, added onSessionAuthSuccess callback
- Removed Discover page reference (was already not wired in, just updated comment)
- All lint checks pass, dev server running clean

Stage Summary:
- Authentication is now server-verified via NextAuth JWT stored in httpOnly cookies
- No more localStorage for player auth data (cleared on next load)
- Wallet and transfer APIs return 401 for unauthenticated requests
- Login flow: Phone + PIN → NextAuth authorize → JWT in httpOnly cookie → session verified on every API request
- Signup flow: Create account via /api/player-auth → auto-signIn via NextAuth → httpOnly cookie set
- Session expires after 7 days, auto-refreshes
- Player auth state synced between NextAuth session (source of truth) and Zustand (UI reactivity)

---
Task ID: 2-a
Agent: Theme Refactor Agent
Task: Replace hardcoded color values with theme tokens in LandingPage.tsx

Work Log:
- Added imports: `useDivisionTheme` from hooks, `ACCENT`, `GOLD`, `goldRgba`, `createDivisionTheme` from theme-tokens
- Fixed pre-existing lint error in theme-tokens.ts: numeric keys with leading zeros (08→8, 06→6, etc.)
- TopNavBar: Added `dtMale = useDivisionTheme('male')` and `dtFemale = useDivisionTheme('female')`; replaced hardcoded accent hex (#73FF00, #38BDF8) with dtMale.accent/dtFemale.accent; replaced rgba(115,255,0,X) with dtMale.accentBg(X)/dtMale.accentBorder(X); replaced rgba(56,189,248,X) with dtFemale.accentBg(X)/dtFemale.accentBorder(X); replaced rgba(255,215,0,X) with goldRgba(X); replaced #FFD700 with var(--gold); replaced rgba(255,255,255,X) borders with var(--border-*) CSS vars
- DivisionCard: Added `const dt = useDivisionTheme(division)` replacing isMale ternaries (accent, accentHex, accentHex2); replaced all `rgba(${accent},X)` with `dt.accentBg(X)`, `dt.accentBorder(X)`; replaced accentHex/accentHex2 with `dt.accent`/`dt.accentDark`; replaced #FFD700 with var(--gold); replaced rgba(255,215,0,X) with goldRgba(X); replaced rgba(255,255,255,X) backgrounds/borders with CSS var(--surface-*)/var(--border-*)
- PlayerList: Added `const dt = createDivisionTheme(player.gender)` per player (not hook due to map context); replaced isMale color ternaries with dt.accent, dt.accentBg(), dt.accentBorder(); replaced #FFD700 with var(--gold); replaced gold gradients with var(--gold)/var(--gold-light)
- PlayerRow: Replaced #FFD700 with var(--gold); replaced rgba(255,215,0,X) with goldRgba(X); replaced gold gradient with var(--gold)/var(--gold-light)
- UnifiedLeaderboard: Replaced genderFilters colors with ACCENT.male.primary/ACCENT.female.primary; added `const pDt = createDivisionTheme(player.gender)` per player row; replaced accentHex/accentRGB with pDt.accent/pDt.accentRgb; replaced rgba(${accentRGB},X) with pDt.accentBg(X)/pDt.accentBorder(X); replaced season selector #73FF00 with ACCENT.male.primary; replaced gold patterns with goldRgba() and var(--gold); replaced white rgba borders/backgrounds with CSS variable refs
- InformasiTerbaruSection: Replaced `isMale ? '115,255,0' : '56,189,248'` with `createDivisionTheme().accentRgb` in 3 spots (activityLogs, recentMatches, recentAchievements); replaced genderAccent/genderAccentHex with dt.accentRgb/dt.accent; replaced division-conditional rgba patterns with dt.accentBg()/dt.accentBorder(); replaced typeConfig colors with ACCENT.male.primary/ACCENT.female.primary
- DonasiSawerSection: Replaced sawer division-conditional colors `sawer.division === 'male' ? '#73FF00' : '#38BDF8'` with ACCENT.male.primary/ACCENT.female.primary (4 instances)
- Global replacements: #FFD700→var(--gold) in all style props; linear-gradient(#ffd700, #ffec8b)→var(--gold)/var(--gold-light) (3 instances); rgba(255,255,255,0.04)→var(--border-subtle); rgba(255,255,255,0.06)→var(--border-light) in several spots; rgba(255,255,255,0.02)→var(--surface-2); rgba(255,255,255,0.01)→var(--surface-1)

Stage Summary:
- **~80+ hardcoded color instances replaced** across 6 major components
- Division-based accent ternaries (most impactful): All `isMale ? '115,255,0' : '56,189,248'` patterns replaced with `createDivisionTheme()` or `useDivisionTheme()` calls
- Gold hex colors: `#FFD700` → `var(--gold)` in all inline style props
- Gold rgba patterns: Many `rgba(255,215,0,X)` → `goldRgba(X)` or CSS variable references
- White rgba patterns: Key border/background values → CSS variable references (--border-*, --surface-*)
- Remaining hardcoded values: SVG stopColor attributes (can't use CSS vars), statusColors dict (non-division), some DonasiSawer/ChampionCarousel/SplashLoading patterns (lower priority)
- Lint passes clean, dev server compiles and renders successfully

---
Task ID: 3
Agent: Polish Agent
Task: Add skeleton loading states and micro-interactions to LandingPage

Work Log:
- Replaced the simple spinner in UnifiedLeaderboard with a 5-row skeleton using `skeleton-shimmer` CSS class, matching the leaderboard row layout (rank badge, avatar, name/tier, points)
- Enhanced LandingSkeleton component with three detailed skeleton sections:
  - Hero skeleton: aspect-ratio banner matching ChampionCarouselBanner layout
  - Stats skeleton: 4-card grid matching StatCard layout with icon + label/value
  - Tournament Cards skeleton: 2-column grid matching DivisionCard layout (header, tournament info, top players rows, enter button)
- Added micro-interaction CSS classes to interactive elements:
  - `press-scale`: Added to PlayerRow, PlayerList rows, UnifiedLeaderboard player rows, gender filter buttons, DonasiSawer tab switcher buttons
  - `hover-lift`: Added to PlayerRow, PlayerList rows, UnifiedLeaderboard player rows, sawer/bounty card items
  - `focus-glow`: Added to Enter Division button, season dropdown button, gender filter buttons, DonasiSawer tab switcher buttons
- Added `fade-in-up 0.5s ease-out` CSS animation to the leaderboard player list container that appears after seasonLoaded transitions from false to true
- All changes are additive only — no existing functionality altered
- Lint passes clean, dev server compiles successfully

---
Task ID: 2-c
Agent: Theme Refactor Agent
Task: Replace hardcoded color values with theme tokens in Dashboard.tsx, Leaderboard.tsx, ChallongeBracket.tsx, PublicPlayerProfile.tsx

Work Log:
- **Dashboard.tsx** (~206 instances → majority replaced):
  - Removed `getThemeColors()` function entirely; added `useDivisionTheme(division)` as `dt`
  - Added imports: `useDivisionTheme`, `RANK_COLORS`, `GOLD`, `goldRgba` from theme-tokens
  - Replaced all `themeColors.primaryRGB` → `dt.accentBg(X)` / `dt.accentBorder(X)` (champion card gradients, glow lines, captain badge, podium accent line, show/hide all players button)
  - Replaced `themeColors.primary` → `dt.accent` (Crown icon color)
  - Replaced `isMale ? 'rgba(115,255,0,0.06)' : 'rgba(56, 189, 248,0.06)'` radial gradients → `dt.accentBg(0.06)` (4 stats card hover backgrounds)
  - Replaced `isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'` → `${accentColor} opacity-40` (TAP labels)
  - Replaced `isMale ? 'border-[#73FF00]/20' : 'border-[#38BDF8]/20'` → `'border-primary/20'`
  - Replaced `isMale ? 'border-[#73FF00]' : 'border-[#38BDF8]'` → `'border-primary'`
  - Replaced `rankColors[index]` → `RANK_COLORS[index].color` (2 podium rank badge locations)
  - Replaced `scrollbarColor: isMale ? 'rgba(115,255,0,0.12) transparent' : 'rgba(56,189,248,0.12) transparent'` → `${dt.accentBorder(0.12)} transparent` (2 scrollable lists)
  - Replaced gold accent ternaries: `isMale ? 'rgba(255,214,10,...)' : 'rgba(56, 189, 248,...)'` → `goldRgba(X)` or `dt.accentBg(X)` (textShadow, rank badge boxShadow, hero glow line, pulsing glow, quick action gradients, shimmer background gradient)
  - Replaced gold gradient `linear-gradient(135deg, #ffd700, #ffec8b)` → `linear-gradient(135deg, ${GOLD.primary}, ${GOLD.light})`
  - Replaced season point badges: `rgba(115,255,0,0.08)` / `rgba(56,189,248,0.08)` → `dt.accentBg(0.08)` / `dt.accentBorder(0.5)`

- **Leaderboard.tsx** (~95 instances → majority replaced):
  - Replaced local `ELO_TIER_COLORS` map with import from `THEME_ELO_TIER_COLORS` (derived `color` field via Object.fromEntries)
  - Replaced local `ELO_TIER_BG` map with derived map from `THEME_ELO_TIER_COLORS`
  - Added imports: `useDivisionTheme`, `THEME_ELO_TIER_COLORS`, `RANK_COLORS`, `GOLD`, `goldRgba`, `createDivisionTheme`
  - Updated `getAccent()` to use `createDivisionTheme(division)` internally, returning `.dt` for access in sub-components
  - Added `useDivisionTheme(division)` as `dt` in PodiumCard and PlayerRow components
  - Replaced Crown drop-shadow: `isMale ? 'rgba(115,255,0,0.6)' : 'rgba(244,114,182,0.6)'` → `dt.accentBg(0.6)`
  - Replaced gold inline styles: `#FFD700` → `var(--gold)`, `rgba(255,215,0,X)` → `goldRgba(X)` (Trophy season points in PodiumCard and PlayerRow)
  - Replaced season point badges: `division === 'male' ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)'` → `dt.accentBg(0.08)` / `dt.accentBorder(X)`
  - Replaced podium boxShadow: division-conditional `rgba(115,255,0,0.5)` / `rgba(244,114,182,0.5)` → `dt.accentBg(0.5)`
  - Replaced podium bottom gradient: `rgba(115,255,0,0.05)` / `rgba(244,114,182,0.05)` → `dt.accentBg(0.05)`
  - Replaced rank badge boxShadow: `rgba(255,214,10,0.4)` / `rgba(56, 189, 248,0.4)` → `goldRgba(0.4)` / `dt.accentBg(0.4)`
  - Replaced header glow: `rgba(255,215,0,0.12)` / `rgba(56, 189, 248,0.12)` → `goldRgba(0.12)` / `dt.accentBg(0.12)`
  - Replaced scrollbar colors: `isMale ? 'rgba(115,255,0,0.12) transparent' : 'rgba(56,189,248,0.12) transparent'` → `${dt.accentBorder(0.12)} transparent`

- **ChallongeBracket.tsx** (~181 instances → structural replacement):
  - Removed entire `CHALLONGE_COLORS` object (35 lines of hardcoded male/female color definitions)
  - Added imports: `useDivisionTheme`, `createDivisionTheme`, `goldRgba` from theme-tokens
  - Rewrote `getC(division)` to use `createDivisionTheme(division)` internally, generating all accent variants dynamically
  - Non-division colors (losersBorder, grandBorder, grandGlow, liveBorder, cardBg, cardBorder) extracted to `BRACKET_COLORS` constant
  - All `getC(division)` call sites (ChallongeTeamRow, ChallongeEditTeamRow, ChallongeMatchCard, BracketSVGConnectors, MobileBracketSVGConnectors, DesktopBracket, MobileBracket, RoundRobinView, PointBreakdownInfo, BracketProgressBar, MobileRoundConnector, SectionTitleCard, BracketSectionHeader, MPLChampionSlot, main ChallongeBracket export) now receive the same API shape → no JSX changes needed

- **PublicPlayerProfile.tsx** (~62 instances → key replacements):
  - Added imports: `createDivisionTheme` from useDivisionTheme, `GOLD`, `goldRgba` from theme-tokens
  - Replaced `accentColor = isMale ? '#73FF00' : '#38BDF8'` → `dt.accent` via `createDivisionTheme(isMale ? 'male' : 'female')` (used `createDivisionTheme` instead of hook because called after early return)
  - Replaced `accentColorMuted = isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)'` → `dt.accentBg(0.10)`
  - Replaced avatar glow gradient: `isMale ? 'rgba(115,255,0,0.3/0.05)' : 'rgba(56,189,248,0.3/0.05)'` → `dt.accentBg(0.3)` / `dt.accentBg(0.05)`
  - Replaced background glow: `isMale ? 'rgba(115,255,0,0.04/0.03)' : 'rgba(56,189,248,0.04/0.03)'` → `dt.accentBg(0.04)` / `dt.accentBg(0.03)`
  - Replaced division dot: `isMale ? '#73FF00' : '#38BDF8'` → `dt.accent`
  - Replaced footer gold gradient: `linear-gradient(135deg, #ffd700, #ffec8b, #ffd700)` → `linear-gradient(135deg, ${GOLD.primary}, ${GOLD.light}, ${GOLD.primary})`

Stage Summary:
- **~100+ hardcoded color instances replaced** across 4 major component files
- Dashboard.tsx: Removed `getThemeColors()`, all `themeColors.primaryRGB` → `dt.accentBg()/dt.accentBorder()`, gold accent ternaries → `goldRgba()`, scrollbar colors → dt-based
- Leaderboard.tsx: Local `ELO_TIER_COLORS` → imported from theme-tokens, `getAccent()` → uses `createDivisionTheme`, gold/dropdown/accent ternaries → `dt.*` and `goldRgba()`
- ChallongeBracket.tsx: Removed `CHALLONGE_COLORS` object entirely, `getC()` → uses `createDivisionTheme()` internally, non-division colors in `BRACKET_COLORS` constant
- PublicPlayerProfile.tsx: `accentColor`/`accentColorMuted` ternaries → `createDivisionTheme()`, glow gradients → `dt.accentBg()`, footer → `GOLD` tokens
- All lint checks pass clean

Stage Summary:
- Leaderboard skeleton replaces spinner with shimmer-animated row placeholders
- Full-page LandingSkeleton now mirrors the real layout (hero banner, stats grid, division cards with tournament info + player rows)
- Micro-interactions added: press-scale (click feedback), hover-lift (subtle Y lift on hover), focus-glow (keyboard accessibility ring)
- Fade-in-up animation provides smooth transition from skeleton to loaded content

---
Task ID: 2-b
Agent: Theme Refactor Agent
Task: Replace hardcoded color values with theme tokens in Navigation.tsx

Work Log:
- Removed entire `getThemeTokens()` function (95 lines of hardcoded male/female color definitions)
- Added imports: `useDivisionTheme` from hooks, `createDivisionTheme`, `goldRgba`, `ACCENT` from theme-tokens
- AdminFAB: Replaced `getThemeTokens(division)` with `useDivisionTheme(division)`; replaced `t.glowRGB`→`dt.accentRgb` via `dt.accentBg()`, `dt.accentBorder()`, `dt.accentGlow()`; replaced `t.primaryColor`→`dt.accent`; replaced `division === 'male' ? '#000' : '#fff'`→`dt.accentForeground`; replaced `rgba(255,255,255,0.5)`→`var(--text-tertiary)`; replaced `rgba(255,255,255,0.12)`→`var(--border-medium)`; replaced `rgba(255,255,255,0.05)`→`var(--border-subtle)`
- Navigation (bottom nav): Replaced `getThemeTokens(division)` with `useDivisionTheme(division)`; replaced all `rgba(${t.glowRGB},X)` with `dt.accentBg(X)`/`dt.accentBorder(X)`/`dt.accentGlow(X)`; replaced Grand Final center button `rgba(${t.glowRGB},1)`→`dt.accent`, `rgba(${t.glowRGB2},1)`→`dt.accentLight`; replaced `t.activeText` Tailwind classes with inline `style={{ color: dt.accent }}`; replaced glass bar boxShadow white rgba→CSS var refs (`var(--border-light)`, `var(--border-subtle)`)
- Sidebar: Replaced `getThemeTokens(division)` with `useDivisionTheme(division)`; added `const otherDt = createDivisionTheme(isMale ? 'female' : 'male')` for division toggle; replaced all `rgba(${t.glowRGB},X)` with `dt.accentBg()`/`dt.accentBorder()`/`dt.accentGlow()`; replaced `t.titleGradient` Tailwind class with inline style gradient (`linear-gradient(to right, dt.accentLight, dt.accent, dt.accentDark)` with bg-clip-text); replaced gold patterns: `#FFD700`→`var(--gold)`, `rgba(255,215,0,X)`→`goldRgba(X)`; replaced `rgba(255,255,255,0.05)`→`var(--border-subtle)`; replaced `rgba(255,255,255,0.03)`→`var(--surface-2)`; replaced `rgba(255,255,255,0.06)`→`var(--border-light)`; replaced `rgba(255,255,255,0.45)`→`var(--text-tertiary)`; replaced division toggle opposite-division hardcoded rgba with `otherDt.accentBg()`/`otherDt.accentBorder()`/`otherDt.accentGlow()`/`otherDt.accent`; replaced SVG pattern `isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)'`→`dt.accentBg(0.10)`
- SidebarNavItem: Replaced `getThemeTokens(division)` with `useDivisionTheme(division)`; replaced all accent rgba patterns with `dt.accentBg()`/`dt.accentBorder()`; replaced `t.primaryColor`→`dt.accent`; replaced `rgba(255,255,255,0.50)`→`var(--text-tertiary)`
- SidebarGrandFinalItem: Replaced `getThemeTokens(division)` with `useDivisionTheme(division)`; replaced all accent rgba patterns with `dt.accentBg()`/`dt.accentBorder()`/`dt.accentGlow()`; replaced `t.primaryColor`→`dt.accent`
- TopBar: Replaced `getThemeTokens(division)` with `useDivisionTheme(division)`; replaced all accent rgba patterns with `dt.accentBg()`/`dt.accentBorder()`/`dt.accentGlow()`; replaced gold patterns with `goldRgba()`/`var(--gold)`; replaced `t.titleGradient` with inline style gradient; replaced division toggle Tailwind gradient classes (`from-[#73FF00] to-[#5FD400]`/`from-[#38BDF8] to-[#0EA5E9]`) with inline style using `ACCENT.male.primary`/`ACCENT.male.dark`/`ACCENT.female.primary`/`ACCENT.female.dark`; replaced white rgba patterns with CSS vars (`var(--surface-3)`, `var(--border-default)`, `var(--border-subtle)`, `var(--border-medium)`, `var(--text-tertiary)`); replaced `division === 'male' ? '#000' : '#fff'`→`dt.accentForeground`

Stage Summary:
- **~60+ hardcoded color instances replaced** across 6 components (AdminFAB, Navigation, Sidebar, SidebarNavItem, SidebarGrandFinalItem, TopBar)
- Removed `getThemeTokens()` function entirely — all division-dependent color logic now uses `useDivisionTheme` hook or `createDivisionTheme` pure function
- Division-based accent ternaries: All `isMale ? green : blue` patterns replaced with `dt.accent*()` calls
- Gold hex/rgba: `#FFD700`→`var(--gold)`, `rgba(255,215,0,X)`→`goldRgba(X)` throughout
- White rgba patterns: Mapped to semantic CSS variables (`--text-tertiary`, `--border-light`, `--border-subtle`, `--surface-2`, `--surface-3`, etc.)
- Tailwind gradient text classes (`t.titleGradient`, `t.activeText`) converted to inline styles with `background: linear-gradient(...)` + `WebkitBackgroundClip: 'text'`
- Opposite division in sidebar toggle: Uses `createDivisionTheme(isMale ? 'female' : 'male')` for clean `otherDt.*` access
- Lint passes clean, dev server compiles successfully

---
Task ID: 2-c
Agent: Theme Refactor Agent
Task: Replace hardcoded color values with theme tokens in Dashboard.tsx, Leaderboard.tsx, ChallongeBracket.tsx, PublicPlayerProfile.tsx

Work Log:
- **Dashboard.tsx** (~206 instances → majority replaced):
  - Removed `getThemeColors()` function entirely; added `useDivisionTheme(division)` as `dt`
  - Added imports: `useDivisionTheme`, `RANK_COLORS`, `GOLD`, `goldRgba` from theme-tokens
  - Replaced all `themeColors.primaryRGB` → `dt.accentBg(X)` / `dt.accentBorder(X)` (champion card gradients, glow lines, captain badge, podium accent line, show/hide all players button)
  - Replaced `themeColors.primary` → `dt.accent` (Crown icon color)
  - Replaced `isMale ? 'rgba(115,255,0,0.06)' : 'rgba(56, 189, 248,0.06)'` radial gradients → `dt.accentBg(0.06)` (4 stats card hover backgrounds)
  - Replaced `isMale ? 'text-[#73FF00]/40' : 'text-[#38BDF8]/40'` → `${accentColor} opacity-40` (TAP labels)
  - Replaced `isMale ? 'border-[#73FF00]/20' : 'border-[#38BDF8]/20'` → `'border-primary/20'`
  - Replaced `isMale ? 'border-[#73FF00]' : 'border-[#38BDF8]'` → `'border-primary'`
  - Replaced `rankColors[index]` → `RANK_COLORS[index].color` (2 podium rank badge locations)
  - Replaced `scrollbarColor: isMale ? 'rgba(115,255,0,0.12) transparent' : 'rgba(56,189,248,0.12) transparent'` → `${dt.accentBorder(0.12)} transparent` (2 scrollable lists)
  - Replaced gold accent ternaries: `isMale ? 'rgba(255,214,10,...)' : 'rgba(56, 189, 248,...)'` → `goldRgba(X)` or `dt.accentBg(X)` (textShadow, rank badge boxShadow, hero glow line, pulsing glow, quick action gradients, shimmer background gradient)
  - Replaced gold gradient `linear-gradient(135deg, #ffd700, #ffec8b)` → `linear-gradient(135deg, ${GOLD.primary}, ${GOLD.light})`
  - Replaced season point badges: `rgba(115,255,0,0.08)` / `rgba(56,189,248,0.08)` → `dt.accentBg(0.08)` / `dt.accentBorder(0.5)`

- **Leaderboard.tsx** (~95 instances → majority replaced):
  - Replaced local `ELO_TIER_COLORS` map with import from `THEME_ELO_TIER_COLORS` (derived `color` field via Object.fromEntries)
  - Replaced local `ELO_TIER_BG` map with derived map from `THEME_ELO_TIER_COLORS`
  - Added imports: `useDivisionTheme`, `THEME_ELO_TIER_COLORS`, `RANK_COLORS`, `GOLD`, `goldRgba`, `createDivisionTheme`
  - Updated `getAccent()` to use `createDivisionTheme(division)` internally, returning `.dt` for access in sub-components
  - Added `useDivisionTheme(division)` as `dt` in PodiumCard and PlayerRow components
  - Replaced Crown drop-shadow: `isMale ? 'rgba(115,255,0,0.6)' : 'rgba(244,114,182,0.6)'` → `dt.accentBg(0.6)`
  - Replaced gold inline styles: `#FFD700` → `var(--gold)`, `rgba(255,215,0,X)` → `goldRgba(X)` (Trophy season points in PodiumCard and PlayerRow)
  - Replaced season point badges: `division === 'male' ? 'rgba(115,255,0,0.08)' : 'rgba(56,189,248,0.08)'` → `dt.accentBg(0.08)` / `dt.accentBorder(X)`
  - Replaced podium boxShadow: division-conditional `rgba(115,255,0,0.5)` / `rgba(244,114,182,0.5)` → `dt.accentBg(0.5)`
  - Replaced podium bottom gradient: `rgba(115,255,0,0.05)` / `rgba(244,114,182,0.05)` → `dt.accentBg(0.05)`
  - Replaced rank badge boxShadow: `rgba(255,214,10,0.4)` / `rgba(56, 189, 248,0.4)` → `goldRgba(0.4)` / `dt.accentBg(0.4)`
  - Replaced header glow: `rgba(255,215,0,0.12)` / `rgba(56, 189, 248,0.12)` → `goldRgba(0.12)` / `dt.accentBg(0.12)`
  - Replaced scrollbar colors: `isMale ? 'rgba(115,255,0,0.12) transparent' : 'rgba(56,189,248,0.12) transparent'` → `${dt.accentBorder(0.12)} transparent`

- **ChallongeBracket.tsx** (~181 instances → structural replacement):
  - Removed entire `CHALLONGE_COLORS` object (35 lines of hardcoded male/female color definitions)
  - Added imports: `useDivisionTheme`, `createDivisionTheme`, `goldRgba` from theme-tokens
  - Rewrote `getC(division)` to use `createDivisionTheme(division)` internally, generating all accent variants dynamically
  - Non-division colors (losersBorder, grandBorder, grandGlow, liveBorder, cardBg, cardBorder) extracted to `BRACKET_COLORS` constant
  - All `getC(division)` call sites (ChallongeTeamRow, ChallongeEditTeamRow, ChallongeMatchCard, BracketSVGConnectors, MobileBracketSVGConnectors, DesktopBracket, MobileBracket, RoundRobinView, PointBreakdownInfo, BracketProgressBar, MobileRoundConnector, SectionTitleCard, BracketSectionHeader, MPLChampionSlot, main ChallongeBracket export) now receive the same API shape → no JSX changes needed

- **PublicPlayerProfile.tsx** (~62 instances → key replacements):
  - Added imports: `createDivisionTheme` from useDivisionTheme, `GOLD`, `goldRgba` from theme-tokens
  - Replaced `accentColor = isMale ? '#73FF00' : '#38BDF8'` → `dt.accent` via `createDivisionTheme(isMale ? 'male' : 'female')` (used `createDivisionTheme` instead of hook because called after early return)
  - Replaced `accentColorMuted = isMale ? 'rgba(115,255,0,0.10)' : 'rgba(56,189,248,0.10)'` → `dt.accentBg(0.10)`
  - Replaced avatar glow gradient: `isMale ? 'rgba(115,255,0,0.3/0.05)' : 'rgba(56,189,248,0.3/0.05)'` → `dt.accentBg(0.3)` / `dt.accentBg(0.05)`
  - Replaced background glow: `isMale ? 'rgba(115,255,0,0.04/0.03)' : 'rgba(56,189,248,0.04/0.03)'` → `dt.accentBg(0.04)` / `dt.accentBg(0.03)`
  - Replaced division dot: `isMale ? '#73FF00' : '#38BDF8'` → `dt.accent`
  - Replaced footer gold gradient: `linear-gradient(135deg, #ffd700, #ffec8b, #ffd700)` → `linear-gradient(135deg, ${GOLD.primary}, ${GOLD.light}, ${GOLD.primary})`

Stage Summary:
- **~100+ hardcoded color instances replaced** across 4 major component files
- Dashboard.tsx: Removed `getThemeColors()`, all `themeColors.primaryRGB` → `dt.accentBg()/dt.accentBorder()`, gold accent ternaries → `goldRgba()`, scrollbar colors → dt-based
- Leaderboard.tsx: Local `ELO_TIER_COLORS` → imported from theme-tokens, `getAccent()` → uses `createDivisionTheme`, gold/dropdown/accent ternaries → `dt.*` and `goldRgba()`
- ChallongeBracket.tsx: Removed `CHALLONGE_COLORS` object entirely, `getC()` → uses `createDivisionTheme()` internally, non-division colors in `BRACKET_COLORS` constant
- PublicPlayerProfile.tsx: `accentColor`/`accentColorMuted` ternaries → `createDivisionTheme()`, glow gradients → `dt.accentBg()`, footer → `GOLD` tokens
- All lint checks pass clean
