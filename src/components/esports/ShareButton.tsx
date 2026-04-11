'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, MessageCircle, Send, Twitter } from 'lucide-react';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface ShareButtonProps {
  text: string;
  url?: string;
  matchData?: {
    teamAName: string;
    teamBName: string;
    scoreA: number;
    scoreB: number;
    winnerName?: string;
  };
  compact?: boolean;
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
  text,
  url: providedUrl,
  matchData,
  compact = false,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleShare = useCallback(async () => {
    // Try Web Share API first (mobile browsers)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: matchData ? `${matchData.teamAName} vs ${matchData.teamBName}` : 'IDOL META',
          text,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or error — fallback to dropdown
      }
    }
    // Toggle dropdown on desktop / when Web Share API fails
    setOpen((prev) => !prev);
  }, [text, shareUrl, matchData]);

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

  const handlePlatformShare = useCallback(
    (getUrl: (text: string, url: string) => string) => {
      const link = getUrl(text, shareUrl);
      window.open(link, '_blank', 'noopener,noreferrer,width=600,height=400');
      setOpen(false);
    },
    [text, shareUrl],
  );

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      {/* Trigger button */}
      {compact ? (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
          }}
          aria-label="Bagikan pertandingan"
        >
          <Share2 className="w-3.5 h-3.5 text-white/50" />
        </motion.button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors duration-200"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
          }}
        >
          <Share2 className="w-4 h-4 text-white/70" />
          <span className="text-[13px] font-semibold text-white/70">Bagikan</span>
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
              border: '0.5px solid rgba(255,255,255,0.08)',
              boxShadow:
                '0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
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
                  <span className="text-[13px] font-medium text-white/75">
                    {platform.name}
                  </span>
                </motion.button>
              );
            })}

            {/* Divider */}
            <div
              className="my-1.5 h-px"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />

            {/* Copy link */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleCopyLink}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors duration-150"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                  border: copied
                    ? '1px solid rgba(34,197,94,0.20)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/50" />
                )}
              </div>
              <span
                className="text-[13px] font-medium"
                style={{ color: copied ? '#22C55E' : 'rgba(255,255,255,0.75)' }}
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
