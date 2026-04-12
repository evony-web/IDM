import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════
// Middleware — Cache headers for static assets & SEO
//
// - Cloudinary images: long cache (1 year)
// - Static assets (icons, logos, manifest): medium cache (1 day)
// - API routes: no extra headers (handled individually)
// ═══════════════════════════════════════════════════════════════════════

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // ── Cloudinary proxy/cache ──
  // If we ever proxy Cloudinary images, cache them aggressively
  if (pathname.startsWith('/_next/image') && request.nextUrl.searchParams.get('url')?.includes('cloudinary.com')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return response
  }

  // ── Static assets — long cache ──
  if (
    pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|woff2?)$/) &&
    !pathname.startsWith('/api/')
  ) {
    response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    return response
  }

  // ── Next.js static chunks — very long cache ──
  if (pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return response
  }

  // ── Security headers for all pages ──
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    // Match all paths except API routes that need special handling
    '/((?!api/auth|api/og).*)',
    // Also match static files
    '/_next/:path*',
  ],
}
