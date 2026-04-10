import { IDM_LOGO_URL } from '@/lib/cdn';

/**
 * favicon.ico route — redirects to IDM logo on Cloudinary CDN.
 * This eliminates the 404 for /favicon.ico on Vercel.
 */
export async function GET() {
  // Cloudinary can serve the image in PNG format
  const faviconUrl = IDM_LOGO_URL.replace('f_webp', 'f_png');
  return Response.redirect(faviconUrl, 302);
}
