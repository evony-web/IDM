/**
 * CDN constants — single source of truth for logo URL.
 *
 * Client components should use `useAppSettings().settings.logo_url` instead.
 * This constant is kept as a SSR/build-time fallback only.
 *
 * For production, set NEXT_PUBLIC_LOGO_URL env variable or configure via /api/settings.
 */

// Re-export from server-utils to avoid duplication
export { DEFAULT_LOGO_URL as IDM_LOGO_URL } from '@/lib/server-utils';
