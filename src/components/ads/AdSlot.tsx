'use client'

import Script from 'next/script'
import { useSyncExternalStore } from 'react'

// ═══════════════════════════════════════════════════════════════════════
// AdSlot — Non-intrusive Adstera native ad container
//
// Uses the container-based invoke.js format for async loading.
// Placed in strategic positions that don't interfere with UX.
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

  // Each slot gets a unique container ID to avoid conflicts
  // when multiple AdSlot instances are rendered on the same page
  const uniqueContainerId = `${AD_CONFIG.containerId}-${slot}`

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
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Adstera Script — loaded lazily via next/script */}
      <Script
        id={`adstera-invoke-${slot}`}
        src={AD_CONFIG.scriptSrc}
        strategy="lazyOnload"
        async
      />

      {/* Container where ad will be rendered */}
      <div
        id={uniqueContainerId}
        data-ad-slot={slot}
        style={{
          width: '100%',
          textAlign: 'center',
        }}
      />
    </div>
  )
}
