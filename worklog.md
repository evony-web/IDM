---
Task ID: 1
Agent: Main Agent
Task: Add dynamic current season tracking - Season advances every 11 completed tournaments

Stage Summary:
- Modified /src/app/api/season-leaderboard/route.ts: currentSeason = Math.floor(completedTournaments / 11) + 1
- Modified /src/components/esports/LandingPage.tsx: UnifiedLeaderboard now uses dynamic currentSeason from API
- Season selector dropdown shows "AKTIF" badge next to current season
- Season 1 = tournaments 1-11, Season 2 = tournaments 12-22, etc.

---
Task ID: 2
Agent: Main Agent
Task: Fix leaderboard to show ALL 75 players instead of only 6

Work Log:
- Investigated why leaderboard only showed 6 players: found 3 filtering layers
- API `/api/season-leaderboard/route.ts` filtered out players with no season point records
- Frontend `displaySeasonPlayers` filtered out players with 0 points for specific season
- Frontend `renderPlayerRow` returned null for players with 0 points
- Fixed API: removed `.filter()`, now includes ALL non-admin users via `.map()` directly
- Fixed frontend: removed 0-point filter from `displaySeasonPlayers` useMemo
- Fixed frontend: removed `return null` for 0-point players in renderPlayerRow
- Added "Lihat Semua" / "Ciutkan" button with INITIAL_VISIBLE = 10 limit
- Added setShowAllPlayers(false) in gender filter and season selector click handlers
- Updated season dropdown label to show "X pemain • Y berpoints" for clarity
- All lint checks pass, no errors in dev server log

Stage Summary:
- Leaderboard now shows ALL 75 players (not just those with season points)
- Initially shows 10 players with "Lihat Semua (65 lagi)" button
- Clicking "Lihat Semua" expands to show all players with "Ciutkan" button to collapse
- Season dropdown now shows total player count + how many have points
- Filter changes (gender/season) reset the expand state automatically
