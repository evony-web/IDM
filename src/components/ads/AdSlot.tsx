'use client'

import { useSyncExternalStore } from 'react'

// ═══════════════════════════════════════════════════════════════════════
// AdSlot — Non-intrusive Adstera native ad container
//
// Uses the EXACT script format provided by Adstera:
//   <script async="async" data-cfasync="false" src="...invoke.js"></script>
//   <div id="container-..."></div>
//
// IMPORTANT:
// - data-cfasync="false" tells Cloudflare to NOT optimize this script
// - async="async" ensures non-blocking load
// - The container ID must be EXACTLY as provided — no modifications
//
// Only ONE slot per page gets the real container ID (the script uses
// document.getElementById and duplicate IDs are invalid HTML).
// - Landing page: only "landing" gets the ID
// - App view: only "dashboard" gets the ID
// - "banner" slot stays empty (no duplicate ID)
//
// Responsive CSS:
// - Desktop/tablet: 4 ad boxes horizontal (Adstera default)
// - Mobile: 2 ad boxes per row (forced via CSS grid override)
// ═══════════════════════════════════════════════════════════════════════

type AdSlotType = 'landing' | 'dashboard' | 'banner'

interface AdSlotProps {
  slot: AdSlotType
  className?: string
}

// Adstera container-based native ad configuration
const AD_CONFIG = {
  scriptSrc: 'https://pl29128258.profitablecpmratenetwork.com/f08adb6bad6f125ddae8a01271dec636/invoke.js',
  containerId: 'container-f08adb6bad6f125ddae8a01271dec636',
}

// Only these slots get the REAL container ID that the script expects.
const PRIMARY_SLOTS: AdSlotType[] = ['landing', 'dashboard']

// Hydration-safe client detection using useSyncExternalStore
const emptySubscribe = () => () => {}
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // client: always mounted
    () => false,  // server: never mounted
  )
}

// ── Responsive CSS for Adstera native ad ──
// The script renders 4 ad items inside the container.
// On mobile, force them into 2-column grid for better UX.
const RESPONSIVE_AD_CSS = `
  /* Target the Adstera container and its child ad items */
  #${AD_CONFIG.containerId} {
    width: 100% !important;
  }

  /* Force 2-column grid on mobile for ad items */
  @media (max-width: 639px) {
    #${AD_CONFIG.containerId} > div,
    #${AD_CONFIG.containerId} > iframe,
    #${AD_CONFIG.containerId} > table,
    #${AD_CONFIG.containerId} > [id^="adngin-"],
    #${AD_CONFIG.containerId} > [style*="display"] {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
      width: 100% !important;
    }

    /* Make each ad item take full width of its grid cell */
    #${AD_CONFIG.containerId} > div > div,
    #${AD_CONFIG.containerId} > div > a,
    #${AD_CONFIG.containerId} > iframe {
      width: 100% !important;
      min-width: 0 !important;
    }

    /* Also target common Adstera wrapper structures */
    #${AD_CONFIG.containerId} [id^="adngin-"] {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
    }
  }

  /* Desktop: ensure horizontal layout */
  @media (min-width: 640px) {
    #${AD_CONFIG.containerId} {
      text-align: center;
    }
  }
`

export default function AdSlot({ slot, className = '' }: AdSlotProps) {
  const mounted = useIsMounted()

  // Don't render on server — ads require DOM and client-side JS
  if (!mounted) return null

  // Use the EXACT container ID that the Adstera script expects.
  // Only primary slots (landing, dashboard) get the real ID.
  // Banner is a secondary placeholder — no real ID, stays empty.
  const isPrimary = PRIMARY_SLOTS.includes(slot)
  const containerId = isPrimary ? AD_CONFIG.containerId : undefined

  // Size/spacing based on slot type
  const slotStyles: Record<AdSlotType, string> = {
    landing: 'w-full max-w-4xl mx-auto my-4 px-4',
    dashboard: 'w-full max-w-2xl mx-auto my-3 px-2',
    banner: 'w-full max-w-3xl mx-auto my-2 px-2',
  }

  return (
    <div
      className={`ad-slot ad-slot--${slot} ${slotStyles[slot]} ${className}`}
      style={{
        minHeight: isPrimary ? 90 : 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Responsive CSS override for Adstera native ad items */}
      {isPrimary && (
        <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_AD_CSS }} />
      )}

      {/* Adstera Script — EXACT format as provided by Adstera */}
      {isPrimary && (
        <div
          dangerouslySetInnerHTML={{
            __html: `<script async="async" data-cfasync="false" src="${AD_CONFIG.scriptSrc}"><\/script>`,
          }}
        />
      )}

      {/* Container where ad will be rendered — must use EXACT ID the script expects */}
      <div
        id={containerId}
        data-ad-slot={slot}
        style={{
          width: '100%',
          textAlign: 'center',
        }}
      />
    </div>
  )
}
