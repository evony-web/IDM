'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Swords, ChevronRight } from 'lucide-react';
import { useState } from 'react';

/* ── Types ── */
interface LiveMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  bracket: string;
  mvpName?: string | null;
  tournamentName?: string;
}

interface LiveMatchTickerProps {
  matches: LiveMatch[];
  division: 'male' | 'female';
  onMatchClick?: (match: LiveMatch) => void;
}

/* ── Division Styles ── */
const DIVISION_STYLES = {
  male: {
    accent: '#73FF00',
    accentBg: 'rgba(115,255,0,0.08)',
    accentBorder: 'rgba(115,255,0,0.25)',
    liveDot: '#4ADE80',
    text: 'rgba(115,255,0,0.90)',
  },
  female: {
    accent: '#38BDF8',
    accentBg: 'rgba(56,189,248,0.08)',
    accentBorder: 'rgba(56,189,248,0.25)',
    liveDot: '#60A5FA',
    text: 'rgba(56,189,248,0.90)',
  },
};

/* ── Animation ── */
const containerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   LIVE MATCH TICKER
   ══════════════════════════════════════════════════════════════════════════ */
export function LiveMatchTicker({ matches, division, onMatchClick }: LiveMatchTickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const style = DIVISION_STYLES[division];

  if (matches.length === 0) return null;

  const displayMatches = isExpanded ? matches : matches.slice(0, 3);
  const hasMore = matches.length > 3;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl overflow-hidden"
      style={{
        background: style.accentBg,
        border: `1px solid ${style.accentBorder}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
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
            <Radio className="w-3.5 h-3.5" style={{ color: style.accent }} />
          </div>
          <span className="text-[12px] font-black uppercase tracking-wider" style={{ color: style.text }}>
            LIVE — {matches.length} Match
          </span>
        </div>
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
            style={{ color: `${style.accent}99` }}
          >
            {isExpanded ? 'Tutup' : `Lihat Semua`}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Match List */}
      <div className="px-3 pb-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {displayMatches.map((match) => (
            <motion.div
              key={match.id}
              variants={itemVariants}
              layout
              exit={{ opacity: 0, x: -20, height: 0 }}
              onClick={() => onMatchClick?.(match)}
              className="rounded-xl px-3.5 py-3 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'rgba(0,0,0,0.20)',
                border: `1px solid rgba(255,255,255,0.04)`,
              }}
            >
              {/* Match meta */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-medium text-white/30">
                    <Swords className="w-2.5 h-2.5" />
                    {match.bracket === 'winners' ? 'Winners' : match.bracket === 'losers' ? 'Losers' : match.bracket === 'playoff' ? 'Playoff' : match.bracket === 'grand_final' ? 'Grand Final' : 'Group'}
                  </span>
                  <span className="text-[10px] text-white/15">·</span>
                  <span className="text-[10px] text-white/20">R{match.round} M{match.matchNumber}</span>
                </div>
                {/* Pulsing LIVE indicator */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: `${style.accent}15` }}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                      style={{ backgroundColor: style.liveDot }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-1.5 w-1.5"
                      style={{ backgroundColor: style.liveDot }}
                    />
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: style.accent }}>
                    LIVE
                  </span>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-center gap-3">
                {/* Team A */}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[13px] font-bold text-white/80 truncate">
                    {match.teamAName || 'TBD'}
                  </p>
                </div>

                {/* Score Box */}
                <div
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl flex-shrink-0"
                  style={{
                    background: `${style.accent}10`,
                    border: `1px solid ${style.accentBorder}`,
                  }}
                >
                  <span className="text-lg font-black tabular-nums" style={{ color: match.scoreA !== null && match.scoreA! > (match.scoreB ?? 0) ? style.accent : 'rgba(255,255,255,0.6)' }}>
                    {match.scoreA ?? 0}
                  </span>
                  <span className="text-[11px] font-bold text-white/20">:</span>
                  <span className="text-lg font-black tabular-nums" style={{ color: match.scoreB !== null && match.scoreB! > (match.scoreA ?? 0) ? style.accent : 'rgba(255,255,255,0.6)' }}>
                    {match.scoreB ?? 0}
                  </span>
                </div>

                {/* Team B */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-bold text-white/80 truncate">
                    {match.teamBName || 'TBD'}
                  </p>
                </div>
              </div>

              {/* MVP indicator */}
              {match.mvpName && (
                <div className="mt-2 pt-2 border-t border-white/[0.04]">
                  <p className="text-[10px] text-amber-400/70 font-medium text-center">
                    MVP: {match.mvpName}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default LiveMatchTicker;
