'use client'

import Image, { type ImageProps } from 'next/image'

// ═══════════════════════════════════════════════════════════════════════
// CdnImage — Optimized Cloudinary image with Next.js Image component
//
// Features:
// - Auto WebP/AVIF via Next.js Image optimization
// - Cloudinary URL transformation support
// - Proper lazy loading by default (eager only for above-fold)
// - Blur placeholder for Cloudinary images
// - Responsive sizes
// ═══════════════════════════════════════════════════════════════════════

const CLOUDINARY_BASE = 'https://res.cloudinary.com/dagoryri5/image/upload/'

interface CdnImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  /** If true, adds a tiny Cloudinary blur placeholder (w_20,e_blur:200) */
  blur?: boolean
}

/**
 * Generate a tiny blur placeholder URL from a Cloudinary image URL.
 * Inserts w_20,e_blur:200 before the public ID portion.
 */
function getBlurDataURL(src: string): string | undefined {
  if (!src.includes('res.cloudinary.com')) return undefined
  try {
    // Pattern: .../upload/<transformations>/<public_id>.<ext>
    const uploadIdx = src.indexOf('/upload/')
    if (uploadIdx === -1) return undefined
    const afterUpload = src.substring(uploadIdx + 8) // after "/upload/"
    return `${CLOUDINARY_BASE}w_40,e_blur:1000,q_10,f_webp/${afterUpload}`
  } catch {
    return undefined
  }
}

export default function CdnImage({
  src,
  alt,
  blur = true,
  loading = 'lazy',
  sizes,
  className = '',
  ...props
}: CdnImageProps) {
  // Determine if this is a Cloudinary image
  const isCloudinary = typeof src === 'string' && src.includes('res.cloudinary.com')

  // Generate blur placeholder for Cloudinary images
  const blurDataURL = blur && isCloudinary && typeof src === 'string'
    ? getBlurDataURL(src)
    : undefined

  return (
    <Image
      src={src}
      alt={alt}
      loading={loading}
      sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
      className={className}
      placeholder={blurDataURL ? 'blur' : undefined}
      blurDataURL={blurDataURL}
      {...props}
    />
  )
}

/**
 * Avatar image — circular, fixed size, optimized for Cloudinary.
 * Falls back to a gradient circle if no image is provided.
 */
export function CdnAvatar({
  src,
  alt,
  size = 40,
  fallbackInitial,
  className = '',
}: {
  src: string | null | undefined
  alt: string
  size?: number
  fallbackInitial?: string
  className?: string
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-white/70 font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackInitial || alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <CdnImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover object-top shrink-0 ${className}`}
      loading="lazy"
      sizes={`${size}px`}
    />
  )
}
