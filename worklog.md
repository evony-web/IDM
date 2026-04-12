---
Task ID: 1
Agent: Main Agent
Task: Add dynamic current season tracking - Season advances every 11 completed tournaments

Stage Summary:
- Modified /src/app/api/season-leaderboard/route.ts: currentSeason = Math.floor(completedTournaments / 11) + 1
- Modified /src/components/esports/LandingPage.tsx: UnifiedLeaderboard now uses dynamic currentSeason from API

---
Task ID: 2
Agent: Main Agent
Task: Fix leaderboard to show ALL 75 players + landing page UX redesign

Work Log:
- Fixed API: removed .filter() that excluded players without season points
- Fixed frontend: removed 0-point filter from displaySeasonPlayers and renderPlayerRow
- Added "Lihat Semua" / "Ciutkan" button with INITIAL_VISIBLE = 10 limit
- Division cards: limited top players to 5 per card
- **MAJOR UX REDESIGN** implemented:
  1. Stats Bar → merged into Banner overlay (glass-morphism strip at bottom of banner)
  2. Section order: Banner → Division Cards → Video Highlight → Leaderboard → Aktivitas → Clubs → Rules → Footer
  3. Video Highlight: 2 division cards (Male & Female) with featured video + compact list
  4. Created AktivitasSection: tabbed view merging Donasi+Sawer+InformasiTerbaru (tabs: Semua|Match|Donasi|Achieve)
  5. Rules → collapsible accordion (default collapsed, click to expand)
  6. Section dividers added between major sections (gradient lines)
  7. Increased spacing from mb-6/10 to mb-8/14 for breathing room

Stage Summary:
- Landing page completely reorganized following UX best practices
- Primary content (divisions, highlights, leaderboard) at top
- Supporting content (donasi, clubs, rules) below
- Stats integrated into banner for cleaner flow
- Rules now collapsible to reduce visual noise
- All lint checks pass
