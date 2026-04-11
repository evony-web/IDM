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
