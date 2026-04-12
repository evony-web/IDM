'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, MessageCircle, Send, Twitter, BarChart3 } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useDivisionTheme } from '@/hooks/useDivisionTheme';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface MatchShareData {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  winnerName?: string;
}

interface PlayerShareData {
  name: string;
  eloTier: string;
  eloRating: number;
  totalWins: number;
  totalMatches: number;
  achievements: number;
  division: 'male' | 'female';
}

interface ShareButtonProps {
  /** Fallback / override share text. Auto-generated from playerData or matchData when omitted. */
  text?: string;
  url?: string;
  division?: 'male' | 'female';
  matchData?: MatchShareData;
  playerData?: PlayerShareData;
  /** @deprecated Use variant instead */
  compact?: boolean;
  variant?: 'compact' | 'full';
}

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function generatePlayerStatsText(p: PlayerShareData): string {
  const winRate = p.totalMatches > 0 ? ((p.totalWins / p.totalMatches) * 100).toFixed(1) : '0.0';
  return [
    '🎮 IDM Tournament Stats',
    `👤 ${p.name}`,
    `🏅 ELO: ${p.eloRating} (${p.eloTier})`,
    `⚔️ Win Rate: ${p.totalWins}/${p.totalMatches} (${winRate}%)`,
    `🏆 Achievements: ${p.achievements}`,
  ].join('\n');
}

/* ────────────────────────────────────────────
   Platform configs
   ──────────────────────────────────────────── */

const PLATFORMS = [
  {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    bg: 'rgba(37,211,102,0.12)',
    border: 'rgba(37,211,102,0.20)',
    getUrl: (text: string, url: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
  },
  {
    name: 'Telegram',
    icon: Send,
    color: '#26A5E4',
    bg: 'rgba(38,165,228,0.12)',
    border: 'rgba(38,165,228,0.20)',
    getUrl: (text: string, url: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: 'Twitter / X',
    icon: Twitter,
    color: '#E7E9EA',
    bg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.12)',
    getUrl: (text: string, url: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
] as const;

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

export default function ShareButton({
  text: providedText,
  url: providedUrl,
  division = 'male',
  matchData,
  playerData,
  compact: compactProp,
  variant,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statsCopied, setStatsCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { settings } = useAppSettings();
  const dt = useDivisionTheme(division);

  const isCompact = variant === 'compact' || compactProp;

  // Derive share text: explicit > playerData > matchData > app name
  const shareText = providedText || (playerData ? generatePlayerStatsText(playerData) : '') || (matchData ? `${matchData.teamAName} vs ${matchData.teamBName}` : settings.app_name);
  const shareUrl = providedUrl || (typeof window !== 'undefined' ? window.location.href : '');

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    };
  }, []);

  const handleShare = useCallback(async () => {
    // Try Web Share API first (mobile browsers)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: matchData
            ? `${matchData.teamAName} vs ${matchData.teamBName}`
            : playerData
              ? `${playerData.name} — IDM Stats`
              : settings.app_name,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or error — fallback to dropdown
      }
    }
    // Toggle dropdown on desktop / when Web Share API fails
    setOpen((prev) => !prev);
  }, [shareText, shareUrl, matchData, playerData, settings.app_name]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: textarea copy trick
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleCopyStats = useCallback(async () => {
    if (!playerData) return;
    const statsText = generatePlayerStatsText(playerData);
    try {
      await navigator.clipboard.writeText(statsText);
      setStatsCopied(true);
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
      statsTimeoutRef.current = setTimeout(() => setStatsCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = statsText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setStatsCopied(true);
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
      statsTimeoutRef.current = setTimeout(() => setStatsCopied(false), 2000);
    }
  }, [playerData]);

  const handlePlatformShare = useCallback(
    (getUrl: (text: string, url: string) => string) => {
      const link = getUrl(shareText, shareUrl);
      window.open(link, '_blank', 'noopener,noreferrer,width=600,height=400');
      setOpen(false);
    },
    [shareText, shareUrl],
  );

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      {/* Trigger button */}
      {isCompact ? (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200"
          style={{
            background: dt.accentBg(0.06),
            border: `1px solid ${dt.accentBorder(0.08)}`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = dt.accentBg(0.12);
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = dt.accentBg(0.06);
          }}
          aria-label={playerData ? 'Bagikan statistik pemain' : 'Bagikan pertandingan'}
        >
          <Share2 className="w-3.5 h-3.5" style={{ color: dt.accentBorder(0.5) }} />
        </motion.button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors duration-200"
          style={{
            background: dt.accentBg(0.06),
            border: `1px solid ${dt.accentBorder(0.08)}`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = dt.accentBg(0.12);
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = dt.accentBg(0.06);
          }}
        >
          <Share2 className="w-4 h-4" style={{ color: dt.accentBorder(0.7) }} />
          <span className="text-[13px] font-semibold" style={{ color: dt.accentBorder(0.7) }}>
            Bagikan
          </span>
        </motion.button>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full mt-2 right-0 z-50 rounded-2xl p-2 min-w-[180px]"
            style={{
              background: 'rgba(18,18,22,0.95)',
              backdropFilter: 'blur(64px) saturate(200%)',
              WebkitBackdropFilter: 'blur(64px) saturate(200%)',
              border: '0.5px solid var(--border-light)',
              boxShadow: `0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle)`,
            }}
          >
            {/* Share Stats option (only when playerData is provided) */}
            {playerData && (
              <>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleCopyStats}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors duration-150"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = dt.accentBg(0.10);
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: dt.accentBg(0.12),
                      border: `1px solid ${dt.accentBorder(0.20)}`,
                    }}
                  >
                    <BarChart3 className="w-4 h-4" style={{ color: dt.accent }} />
                  </div>
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: statsCopied ? 'var(--green)' : dt.accentBorder(0.75) }}
                  >
                    {statsCopied ? 'Statistik disalin!' : 'Bagikan Statistik'}
                  </span>
                </motion.button>

                {/* Divider after Share Stats */}
                <div
                  className="my-1.5 h-px"
                  style={{ background: 'var(--border-subtle)' }}
                />
              </>
            )}

            {/* Platform buttons */}
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              return (
                <motion.button
                  key={platform.name}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handlePlatformShare(platform.getUrl)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors duration-150"
                  style={{
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = platform.bg;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: platform.bg,
                      border: `1px solid ${platform.border}`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: platform.color }} />
                  </div>
                  <span style={{ color: 'var(--text-tertiary)' }} className="text-[13px] font-medium">
                    {platform.name}
                  </span>
                </motion.button>
              );
            })}

            {/* Divider */}
            <div
              className="my-1.5 h-px"
              style={{ background: 'var(--border-subtle)' }}
            />

            {/* Copy link */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleCopyLink}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors duration-150"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: copied ? 'rgba(34,197,94,0.12)' : 'var(--glass-bg-subtle)',
                  border: copied
                    ? '1px solid rgba(34,197,94,0.20)'
                    : '1px solid var(--border-light)',
                }}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: 'var(--text-quaternary)' }} />
                )}
              </div>
              <span
                className="text-[13px] font-medium"
                style={{ color: copied ? 'var(--green)' : 'var(--text-tertiary)' }}
              >
                {copied ? 'Tersalin!' : 'Salin Tautan'}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export types for use in other components
export type { PlayerShareData, MatchShareData, ShareButtonProps };
