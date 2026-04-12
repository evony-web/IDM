# Task 2 and 3: Add Tournament Info and Quick Info sections to landing page

## Work Summary

### Task 2: TournamentInfoSection
- Created new `TournamentInfoSection` component in `LandingPage.tsx` (after line 3608)
- Fetches tournament info from `/api/admin/landing-content` (extracts `data.tournamentInfo`)
- Data shape: `{ title: string, description: string, features: Array<{ icon, label, value }> }`
- Icon mapping: Trophy, Users, Zap, Shield, Star, Swords, Coins, Heart, Gamepad2, Info
- BroadcastChannel `idm-landing-content` for real-time admin updates
- Visual: section header (trophy icon + title), description text, 3-col feature cards grid
- Feature cards cycle through accent colors: orange, green, blue

### Task 3: QuickInfoSection added to render tree
- The component already existed at line ~3548 but was never rendered
- Added `<QuickInfoSection />` to the main page render tree

### Render tree order (updated):
1. Top5PodiumSection (leaderboard)
2. Divider
3. **TournamentInfoSection** (NEW)
4. Divider
5. **QuickInfoSection** (ADDED to render tree)
6. Divider
7. AktivitasSection
8. Divider
9. LandingContentSection (Rules)
10. Footer

### Verification
- `bun run lint` — clean, no errors
- Dev server — all API endpoints returning 200 OK
