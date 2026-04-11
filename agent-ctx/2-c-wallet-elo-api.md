# Task 2-c: Wallet & ELO API Builder

## Summary
Built 4 API route files for wallet management, ELO rating, and matchmaking systems.

## Files Created

### 1. `/src/app/api/wallet/route.ts`
- **GET** — Fetch user wallet (auto-creates with 0 balance if missing), returns last 50 transactions sorted by createdAt DESC
- **POST** — Top up wallet: creates credit WalletTransaction, updates balance and totalIn in a Prisma $transaction

### 2. `/src/app/api/wallet/transfer/route.ts`
- **POST** — Transfer points between users
  - Validates: sufficient balance, amount > 0, sender != receiver
  - Creates WalletTransfer record, debit transaction for sender, credit transaction for receiver
  - Updates both wallets atomically in a single Prisma transaction

### 3. `/src/app/api/elo/route.ts`
- **GET** — ELO leaderboard: users sorted by eloRating DESC, optional division filter (gender), includes wins/losses from Ranking table
- **POST** — ELO calculation after match
  - K-factor: 32, standard expected score formula
  - Handles draws and wins/losses
  - Minimum ELO: 100
  - Tier thresholds: Bronze (0-999), Silver (1000-1199), Gold (1200-1399), Platinum (1400-1599), Diamond (1600-1799), Master (1800-1999), Grandmaster (2000+)
  - Updates winStreak (increment on win, reset on loss, unchanged on draw), bestStreak if exceeded
  - Updates Ranking wins/losses for both players

### 4. `/src/app/api/matchmaking/route.ts`
- **POST** — Join matchmaking queue
  - Checks for existing waiting entry (returns it if found)
  - Creates new MatchmakingQueue entry if none
  - Attempts to find match: same division, ELO range filter (narrow: ±200, wide: ±400, any: no limit)
  - On match: updates both entries to status "matched" with matchedWith
- **GET** — Check matchmaking status: returns queue entry + opponent info if matched
- **DELETE** — Leave queue: sets status to "cancelled"

## Technical Details
- All routes use `import { db } from '@/lib/db'` for database access
- All routes use NextRequest/NextResponse from 'next/server'
- Consistent response format: `{ success: boolean, ...data }` or `{ success: false, error: string }`
- Error handling with try/catch, returns 500 on unexpected errors
- All mutations wrapped in Prisma $transaction for atomicity
- ESLint passes with 0 new errors
- Dev server running without errors
