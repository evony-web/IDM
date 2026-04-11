---
Task ID: 1
Agent: Main Agent
Task: Remove light theme support - keep only dark theme

Work Log:
- Removed ThemeProvider from layout.tsx, hardcoded className="dark" on html element
- Updated viewport themeColor to single value "#0B0B0F"
- Removed next-themes usage from page.tsx, Navigation.tsx, sonner.tsx
- Deleted ThemeToggle.tsx component
- Removed CompactThemeToggle from Navigation sidebar and topbar
- Cleaned up globals.css: removed theme-toggle CSS, light fury override comments
- Updated ParticleField.tsx: removed light theme from UITheme type
- Simplified Dashboard.tsx: removed theme prop, isLight replaced with false
- Updated GrandFinal.tsx: isLight = false (always dark)
- Updated PublicPlayerProfile.tsx: removed light class references

Stage Summary:
- Project uses DARK MODE ONLY, no light theme toggle
- Division system (Male=Green, Female=Blue) works within dark mode
- All code compiles cleanly, page loads successfully
