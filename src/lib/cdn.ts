/**
 * CDN constants — SERVER-SIDE ONLY fallback.
 *
 * Client components should use `useAppSettings().settings.logo_url` instead.
 * This constant is kept as a SSR/build-time fallback only.
 *
 * For production, set NEXT_PUBLIC_LOGO_URL env variable or configure via /api/settings.
 */

export const IDM_LOGO_URL =
  process.env.NEXT_PUBLIC_LOGO_URL ||
  'https://res.cloudinary.com/dagoryri5/image/upload/q_auto,f_webp/idm/static/idm-logo.png';
