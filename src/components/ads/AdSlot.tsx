'use client'

import Script from 'next/script'
import { useSyncExternalStore } from 'react'

// ═══════════════════════════════════════════════════════════════════════
// AdSlot — Non-intrusive Adstera native ad container
//
// Uses the container-based invoke.js format for async loading.
// Placed in strategic positions that don't interfere with UX.
//
// IMPORTANT: The Adstera invoke.js script uses document.getElementById()
// to find the EXACT container ID below. We must NOT modify it (e.g.
// appending "-landing" or "-banner") or the ad will NEVER render.
//
// Since landing page and app view are mutually exclusive (controlled by
// the `view` state), the container ID is unique in the DOM at any time.
// In app view, only the "dashboard" slot gets the real container ID;
// the "banner" slot is a secondary placeholder without the ID to avoid
// duplicate-id violations in the DOM.
//
// Props:
//   slot  — which ad placement (determines container styling)
//   className — optional extra styling
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
// The "banner" slot in app view does NOT get the ID because the
// "dashboard" slot is already using it on the same page.
// Having two elements with the same ID is invalid HTML and would cause
// the script to only inject into the first one anyway.
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
      {/* Adstera Script — loaded lazily via next/script (deduplicated by Next.js) */}
      <Script
        id={`adstera-invoke-${slot}`}
        src={AD_CONFIG.scriptSrc}
        strategy="lazyOnload"
        async
      />

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
