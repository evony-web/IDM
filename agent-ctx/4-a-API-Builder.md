# Task 4-a: Club Management API + Matchmaking UI Component

## Agent: API Builder

## Work Completed

### 1. Club Join Request API — `/src/app/api/clubs/join/route.ts`
- **POST**: Submit a join request to a club
  - Validates: user exists, club exists, user not already in a club, no existing pending request
  - Handles re-application: previously rejected users can re-apply (updates existing request instead of creating duplicate)
  - Returns: `{ success: true, request: {...} }`
- **GET**: List join requests for a club
  - Query params: `clubId`, `status?` (pending/approved/rejected)
  - Returns user info (name, avatar, eloRating, eloTier) with each request

### 2. Club Join Review API — `/src/app/api/clubs/join/[id]/route.ts`
- **PATCH**: Approve or reject a join request
  - Body: `{ status: "approved"|"rejected", reviewedBy }`
  - If approved: transactional update of both request status and user's clubId
  - Validates request exists and is still in pending status

### 3. Club Detail API — `/src/app/api/clubs/[id]/route.ts`
- **GET**: Get club details with members
  - Returns: club info + members (id, name, avatar, eloRating, eloTier, points) + join requests count + total club points
  - Members ordered by points descending

### 4. Matchmaking UI Component — `/src/components/esports/MatchmakingTab.tsx`
- "Cari Lawan" (Find Opponent) button with division accent color and shimmer effect
- ELO range selector: Any / Narrow (±200) / Wide (±400)
- Queue status display with animated radar/pulse spinner and queue timer
- Match found VS card overlay with opponent info animation (spring transitions)
- Leave queue button
- Recent matchmaking history
- "How it works" guide section
- Dark theme, glassmorphism cards, division-aware accent colors (male=#73FF00, female=#38BDF8)
- ELO tier badge colors: Bronze=#CD7F32, Silver=#C0C0C0, Gold=#FFD700, Platinum=#E5E4E2, Diamond=#B9F2FF, Master=#FF6B6B, Grandmaster=#FF4500
- Indonesian language labels
- Responsive mobile-first design
- Polls matchmaking API every 3s while in queue
- No setState directly in useEffect body (uses refs for intervals, callbacks for state updates)

## Lint Status
All new files pass lint. The only existing lint error is in WalletTab.tsx (pre-existing, not from this task).

## Files Created
- `/src/app/api/clubs/join/route.ts`
- `/src/app/api/clubs/join/[id]/route.ts`
- `/src/app/api/clubs/[id]/route.ts`
- `/src/components/esports/MatchmakingTab.tsx`
