'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Radio } from 'lucide-react';
import { useEffect, useCallback } from 'react';

interface LiveScoreBannerProps {
  match: {
    matchId: string;
    teamAName?: string;
    teamBName?: string;
    scoreA: number;
    scoreB: number;
    round: number;
    matchNumber: number;
    winnerName?: string;
  } | null;
  division: 'male' | 'female';
  onDismiss: () => void;
}

const DIVISION_STYLES = {
  male: {
    bg: 'linear-gradient(135deg, rgba(22, 163, 74, 0.92), rgba(21, 128, 61, 0.95))',
    border: 'rgba(34, 197, 94, 0.4)',
    glow: 'rgba(34, 197, 94, 0.15)',
    accentText: '#86EFAC',
    scoreText: '#FFFFFF',
    liveDot: '#4ADE80',
    shimmer: 'rgba(255,255,255,0.08)',
  },
  female: {
    bg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(29, 78, 216, 0.95))',
    border: 'rgba(59, 130, 246, 0.4)',
    glow: 'rgba(59, 130, 246, 0.15)',
    accentText: '#93C5FD',
    scoreText: '#FFFFFF',
    liveDot: '#60A5FA',
    shimmer: 'rgba(255,255,255,0.08)',
  },
};

export function LiveScoreBanner({ match, division, onDismiss }: LiveScoreBannerProps) {
  const style = DIVISION_STYLES[division];

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!match) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [match, onDismiss]);

  if (!match) return null;

  const hasWinner = match.winnerName;

  return (
    <AnimatePresence>
      <motion.div
        key={match.matchId}
        initial={{ y: -100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -100, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[200] flex justify-center px-4 pt-3 pointer-events-none"
      >
        <motion.div
          className="relative pointer-events-auto rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full"
          style={{
            background: style.bg,
            border: `1px solid ${style.border}`,
            boxShadow: `0 8px 32px ${style.glow}, 0 2px 8px rgba(0,0,0,0.3)`,
          }}
          whileHover={{ scale: 1.01 }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${style.shimmer} 50%, transparent 100%)`,
              animation: 'liveBannerShimmer 2.5s ease-in-out infinite',
            }}
          />

          <div className="relative z-10 px-4 py-3">
            {/* Top row: LIVE indicator + dismiss */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {/* Pulsing LIVE indicator */}
                <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <span className="relative flex h-2 w-2">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: style.liveDot }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: style.liveDot }}
                    />
                  </span>
                  <Radio className="w-3 h-3" style={{ color: style.liveDot }} />
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: style.accentText }}
                  >
                    LIVE
                  </span>
                </div>

                {hasWinner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-1 bg-amber-500/20 backdrop-blur-sm rounded-full px-2 py-0.5"
                  >
                    <Trophy className="w-3 h-3 text-amber-300" />
                    <span className="text-[9px] font-bold text-amber-200 uppercase tracking-wider">
                      Selesai
                    </span>
                  </motion.div>
                )}
              </div>

              <motion.button
                onClick={onDismiss}
                className="w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3 h-3 text-white/60" />
              </motion.button>
            </div>

            {/* Score row */}
            <div className="flex items-center justify-between gap-3">
              {/* Team A */}
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[12px] font-semibold text-white/80 truncate">
                  {match.teamAName || 'TBD'}
                </p>
              </div>

              {/* Score display */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-sm rounded-xl">
                <span
                  className="text-xl font-black tabular-nums"
                  style={{ color: style.scoreText }}
                >
                  {match.scoreA}
                </span>
                <span className="text-[11px] font-bold text-white/30">-</span>
                <span
                  className="text-xl font-black tabular-nums"
                  style={{ color: style.scoreText }}
                >
                  {match.scoreB}
                </span>
              </div>

              {/* Team B */}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-semibold text-white/80 truncate">
                  {match.teamBName || 'TBD'}
                </p>
              </div>
            </div>

            {/* Winner announcement */}
            {hasWinner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="mt-2 pt-2 border-t border-white/10 text-center"
              >
                <p className="text-[11px] text-white/60 font-medium">
                  <Trophy className="w-3 h-3 text-amber-300 inline mr-1" />
                  {match.winnerName} menang!
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Global CSS animation - only added once */}
      <style jsx global>{`
        @keyframes liveBannerShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </AnimatePresence>
  );
}

export default LiveScoreBanner;
