'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserCheck, UserMinus } from 'lucide-react';
import { useDivisionTheme } from '@/hooks/useDivisionTheme';
import { useAppStore } from '@/lib/store';

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  division?: 'male' | 'female';
  size?: 'sm' | 'md';
  onFollowChange?: (isFollowing: boolean, followerCount: number) => void;
}

export function FollowButton({
  targetUserId,
  targetUserName,
  division = 'male',
  size = 'md',
  onFollowChange,
}: FollowButtonProps) {
  const dt = useDivisionTheme(division);
  const { currentPlayer: player } = useAppStore();

  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const isOwnProfile = player?.id === targetUserId;

  // Fetch follow status on mount
  useEffect(() => {
    if (!player || isOwnProfile) return;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/follow/status?targetUserId=${targetUserId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setIsFollowing(data.isFollowing);
            setIsChecked(true);
          }
        }
      } catch {
        // Silent fail
      }
    }
    checkStatus();
  }, [player, targetUserId, isOwnProfile]);

  const handleToggle = useCallback(async () => {
    if (!player || isLoading) return;
    setIsLoading(true);

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch('/api/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        onFollowChange?.(data.isFollowing, data.followerCount);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, [player, isLoading, isFollowing, targetUserId, onFollowChange]);

  // Don't render for own profile or unauthenticated
  if (isOwnProfile) return null;
  if (!player) {
    return (
      <motion.button
        className="flex items-center gap-1.5 cursor-not-allowed opacity-50"
        style={{
          fontSize: size === 'sm' ? '10px' : '11px',
          padding: size === 'sm' ? '4px 10px' : '6px 14px',
          borderRadius: size === 'sm' ? '8px' : '12px',
          background: 'var(--surface-4)',
          border: `1px solid var(--border-light)`,
          color: 'var(--text-tertiary)',
        }}
      >
        <UserPlus className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2} />
        Ikuti
      </motion.button>
    );
  }

  // Not yet checked
  if (!isChecked) {
    return (
      <div
        className="animate-pulse"
        style={{
          width: size === 'sm' ? 64 : 80,
          height: size === 'sm' ? 26 : 32,
          borderRadius: size === 'sm' ? '8px' : '12px',
          background: 'var(--surface-4)',
        }}
      />
    );
  }

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2.5 py-1.5 rounded-lg gap-1'
    : 'text-[11px] px-3.5 py-2 rounded-xl gap-1.5';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <motion.button
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      className={`flex items-center font-bold tracking-wide uppercase press-scale ${sizeClasses}`}
      style={{
        background: isFollowing
          ? isHovered
            ? 'rgba(255,69,58,0.12)'
            : dt.accentBg(0.12)
          : 'transparent',
        border: `1px solid ${
          isFollowing
            ? isHovered
              ? 'rgba(255,69,58,0.30)'
              : dt.accentBorder(0.25)
            : dt.accentBorder(0.40)
        }`,
        color: isFollowing
          ? isHovered
            ? '#FF453A'
            : dt.accent
          : dt.accent,
        cursor: isLoading ? 'wait' : 'pointer',
        transition: 'all 0.2s ease',
      }}
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isFollowing ? (
          isHovered ? (
            <motion.div
              key="unfollow"
              initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <UserMinus className={iconSize} strokeWidth={2.2} />
            </motion.div>
          ) : (
            <motion.div
              key="following"
              initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <UserCheck className={iconSize} strokeWidth={2.2} />
            </motion.div>
          )
        ) : (
          <motion.div
            key="follow"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            <UserPlus className={iconSize} strokeWidth={2.2} />
          </motion.div>
        )}
      </AnimatePresence>

      <span>
        {isFollowing
          ? isHovered
            ? 'Berhenti'
            : 'Mengikuti'
          : 'Ikuti'}
      </span>
    </motion.button>
  );
}

export default FollowButton;
