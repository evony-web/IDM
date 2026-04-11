'use client';

import { useCallback } from 'react';

/**
 * Global player profile controller.
 * Simple imperative API — no React state, no SSR issues.
 * Any component can call openPlayerProfile(id) and any component
 * reading via usePlayerProfileState() will re-render.
 */

let _currentPlayerId: string | null = null;
const _subscribers = new Set<() => void>();

function _notify() {
  _subscribers.forEach(fn => fn());
}

/** Open a player profile by ID */
export function openPlayerProfile(id: string): void {
  _currentPlayerId = id;
  _notify();
}

/** Close the currently open player profile */
export function closePlayerProfile(): void {
  _currentPlayerId = null;
  _notify();
}

/** Get the currently open player ID (synchronous, for non-React usage) */
export function getPlayerProfileId(): string | null {
  return _currentPlayerId;
}

/**
 * React hook: open/close player profile.
 * Usage: const { openProfile, closeProfile } = usePlayerProfile();
 */
export function usePlayerProfile() {
  const openProfile = useCallback((id: string) => {
    openPlayerProfile(id);
  }, []);

  const closeProfile = useCallback(() => {
    closePlayerProfile();
  }, []);

  return { openProfile, closeProfile };
}

export default usePlayerProfile;
