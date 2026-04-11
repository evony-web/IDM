# Task: PlayerAuth Component & API

## Summary
Created a full-featured PlayerAuth component for the IDOL META esports tournament platform with signup/login functionality, along with a complete backend API route.

## Files Created/Modified

### 1. `/home/z/my-project/src/components/esports/PlayerAuth.tsx`
- Full-screen modal overlay with dark backdrop blur
- Two modes: "Daftar" (Sign Up) and "Masuk" (Login) with tab toggle
- Sign Up form: Name, Phone (with +62 hint), Gender toggle buttons, PIN (4-6 digits with number pad), Confirm PIN with match indicator
- Login form: Phone, PIN
- Division-colored accents (green #73FF00 for male, blue #38BDF8 for female)
- Dark glassmorphism card design with inline focus styles for dynamic accent colors
- Framer-motion animations (slide up, fade in, shake on error)
- Proper validation: phone format, PIN format, PIN match
- Success/error messages with animated transitions
- Loading spinner on submit buttons
- Responsive design (mobile-first: bottom sheet on mobile, centered modal on desktop)
- Exports both `PlayerAuth` component and `PlayerUser` type

### 2. `/home/z/my-project/src/app/api/player-auth/route.ts`
- POST handler: Player signup with phone/name/PIN/gender/division
  - Creates new user with hashed PIN (SHA-256)
  - Links existing users (without PIN) to new auth
  - Creates wallet and ranking records
  - Returns `isNewAccount` and `isNewLink` flags
  - Prevents duplicate phone registration
- PUT handler: Player login with phone/PIN
  - Verifies PIN hash against stored hash
  - Optional division matching check
  - Returns player user data on success
- Phone normalization (handles +62, 62, 0 prefixes)
- SQLite-compatible (no `mode: 'insensitive'`, uses manual filtering)

## Key Design Decisions
- Used inline `onFocus`/`onBlur` event handlers for dynamic accent colors instead of dynamic Tailwind classes (which don't work at build time)
- PIN hashing uses SHA-256 (same pattern as existing admin auth)
- Modal slides up from bottom on mobile (like iOS sheet), centers on desktop
- Anti-autofill hidden inputs to prevent browser password managers
