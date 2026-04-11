# Task ID: 1 — Merge ChallongeBracket with Classic Bracket Menu/Navigation System

**Agent**: main
**Status**: ✅ Completed

## Summary
Rewrote `/home/z/my-project/src/components/esports/ChallongeBracket.tsx` to merge the best of both bracket components:
- **Visual bracket layout**: Kept Challonge's visual style (ChallongeMatchCard, DesktopBracket, MobileBracket, SVG bezier connectors, Challonge color palette)
- **Menu/Navigation system**: Added Classic Bracket's menu system (SectionTitleCard, BracketSectionHeader, MPLChampionSlot, GroupStandingsTable, MobileRoundConnector, bracketData detection, rrSwissStandings)

## Components Added from Classic (adapted to Challonge colors):
- `SectionTitleCard` — icon + title + subtitle at top, uses card-gold/card-pink CSS
- `BracketSectionHeader` — section headers with color variants (gold/red/purple/default)
- `MPLChampionSlot` — champion display with Crown, avatar, MVP card, cosmic glow
- `StandingRow` + `computeGroupStandings` — group stage standings calculation
- `GroupStandingsTable` — standings table with qualified team highlighting
- `MobileRoundConnector` — visual connector between sections on mobile
- `bracketData` detection logic (single/double/group/round_robin/swiss)
- `rrSwissStandings` with draw support (RR: W=3/D=1/L=0, Swiss: W=1/L=0)

## Main Component Structure:
- Single Elimination: SectionTitleCard → Progress → Bracket → MPLChampionSlot
- Double Elimination: SectionTitleCard → Progress → Winners Section → Losers Section → Grand Final → MPLChampionSlot
- Group + Playoff: SectionTitleCard → Progress → Group Section → Playoff Section → MPLChampionSlot
- Round Robin / Swiss: SectionTitleCard → Progress → Standings → Match Grid

## Lint: ✅ Passed (zero errors)
