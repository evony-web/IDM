'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Award, Lock, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── Types ── */
export interface AchievementItem {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface AchievementCategory {
  key: string;
  label: string;
  icon: string;
}

interface AchievementBadgeProps {
  achievements: AchievementItem[];
  categories: AchievementCategory[];
  compact?: boolean;
  accentColor?: string;
}

/* ── Category color map ── */
const CATEGORY_COLORS: Record<string, { bg: string; border: string; glow: string; text: string }> = {
  match:     { bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.30)',   glow: 'rgba(34,197,94,0.15)',   text: '#4ADE80' },
  tournament:{ bg: 'rgba(255,215,0,0.10)',   border: 'rgba(255,215,0,0.30)',   glow: 'rgba(255,215,0,0.15)',   text: '#FBBF24' },
  mvp:       { bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.30)',  glow: 'rgba(168,85,247,0.15)',  text: '#C084FC' },
  streak:    { bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.30)',  glow: 'rgba(251,146,60,0.15)',  text: '#FB923C' },
  veteran:   { bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.30)',  glow: 'rgba(59,130,246,0.15)',  text: '#60A5FA' },
  points:    { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.30)',  glow: 'rgba(16,185,129,0.15)',  text: '#34D399' },
  social:    { bg: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.30)',  glow: 'rgba(236,72,153,0.15)',  text: '#F472B6' },
  ranking:   { bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.30)',   glow: 'rgba(6,182,212,0.15)',   text: '#22D3EE' },
};

/* ── Animation variants ── */
const badgeContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const badgeItemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   COMPACT MODE — Horizontal scrollable row of earned badges
   ══════════════════════════════════════════════════════════════════════════ */
function CompactBadgeRow({
  achievements,
  accentColor = '#73FF00',
}: {
  achievements: AchievementItem[];
  accentColor?: string;
}) {
  const earned = achievements.filter((a) => a.earned);

  if (earned.length === 0) {
    return (
      <div className="flex items-center gap-2 text-white/25">
        <Lock className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium">Belum ada achievement</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {earned.map((ach) => {
          const catColor = CATEGORY_COLORS[ach.category] || CATEGORY_COLORS.match;
          return (
            <Tooltip key={ach.type}>
              <TooltipTrigger asChild>
                <motion.div
                  className="relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-default"
                  style={{
                    background: catColor.bg,
                    border: `1px solid ${catColor.border}`,
                    boxShadow: `0 0 8px ${catColor.glow}`,
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-base leading-none">{ach.icon}</span>
                  {/* Subtle shimmer for earned badges */}
                  <motion.div
                    className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)`,
                    }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                  />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-black/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 max-w-[180px]"
              >
                <p className="text-[12px] font-semibold text-white/90">{ach.icon} {ach.name}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{ach.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        <span
          className="text-[10px] font-bold flex-shrink-0 px-2 py-1 rounded-full"
          style={{ color: `${accentColor}99`, background: `${accentColor}10` }}
        >
          {earned.length} / {achievements.length}
        </span>
      </div>
    </TooltipProvider>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FULL MODE — Grid of all achievements grouped by category
   ══════════════════════════════════════════════════════════════════════════ */
function CategorySection({
  category,
  items,
  accentColor,
}: {
  category: AchievementCategory;
  items: AchievementItem[];
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const catColor = CATEGORY_COLORS[category.key] || CATEGORY_COLORS.match;
  const earnedCount = items.filter((a) => a.earned).length;
  const isAllEarned = earnedCount === items.length;

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Category Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2.5 px-1 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{category.icon}</span>
          <span className="text-[12px] font-bold text-white/60 group-hover:text-white/80 transition-colors">
            {category.label}
          </span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              color: isAllEarned ? catColor.text : 'rgba(255,255,255,0.3)',
              background: isAllEarned ? catColor.bg : 'rgba(255,255,255,0.04)',
            }}
          >
            {earnedCount}/{items.length}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/20" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
        )}
      </button>

      {/* Achievement Grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-3">
              {items.map((ach) => (
                <AchievementCard key={ach.type} achievement={ach} accentColor={accentColor} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AchievementCard({
  achievement,
  accentColor,
}: {
  achievement: AchievementItem;
  accentColor: string;
}) {
  const catColor = CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.match;

  if (achievement.earned) {
    return (
      <motion.div
        variants={badgeItemVariants}
        className="relative rounded-xl p-3 overflow-hidden group"
        style={{
          background: catColor.bg,
          border: `1px solid ${catColor.border}`,
          boxShadow: `0 2px 12px ${catColor.glow}`,
        }}
        whileHover={{ scale: 1.03, boxShadow: `0 4px 20px ${catColor.glow}` }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)`,
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg leading-none">{achievement.icon}</span>
            <span className="text-[11px] font-bold truncate" style={{ color: catColor.text }}>
              {achievement.name}
            </span>
          </div>
          <p className="text-[10px] text-white/40 leading-snug">{achievement.description}</p>
          {achievement.earnedAt && (
            <p className="text-[9px] text-white/20 mt-1.5">
              {new Date(achievement.earnedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // Locked achievement
  return (
    <motion.div
      variants={badgeItemVariants}
      className="relative rounded-xl p-3 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5 opacity-30">
        <Lock className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[11px] font-bold text-white/40 truncate">{achievement.name}</span>
      </div>
      <p className="text-[10px] text-white/15 leading-snug">{achievement.description}</p>
      <div className="absolute top-2 right-2 text-lg opacity-10 grayscale">
        {achievement.icon}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
export function AchievementBadge({
  achievements,
  categories,
  compact = false,
  accentColor = '#73FF00',
}: AchievementBadgeProps) {
  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  // ── Compact Mode ──
  if (compact) {
    return <CompactBadgeRow achievements={achievements} accentColor={accentColor} />;
  }

  // ── Full Mode ──
  // Group achievements by category
  const groupedByCategory: Record<string, AchievementItem[]> = {};
  for (const category of categories) {
    groupedByCategory[category.key] = achievements.filter(
      (a) => a.category === category.key
    );
  }

  return (
    <div>
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accentColor}15` }}
          >
            <Award className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-white/70">
              Achievement
            </h3>
            <p className="text-[10px] text-white/30">
              {earnedCount} dari {totalCount} terbuka
            </p>
          </div>
        </div>
        <div
          className="text-[11px] font-black px-2.5 py-1 rounded-full"
          style={{
            color: progressPercent === 100 ? accentColor : `${accentColor}99`,
            background: progressPercent === 100 ? `${accentColor}20` : `${accentColor}10`,
          }}
        >
          {progressPercent}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-white/[0.05] mb-5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: progressPercent === 100
              ? `linear-gradient(90deg, ${accentColor}, ${accentColor}CC)`
              : `${accentColor}88`,
            boxShadow: `0 0 8px ${accentColor}33`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
        />
      </div>

      {/* Category Sections */}
      <motion.div
        variants={badgeContainerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-1 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar"
      >
        {categories.map((cat) => (
          <CategorySection
            key={cat.key}
            category={cat}
            items={groupedByCategory[cat.key] || []}
            accentColor={accentColor}
          />
        ))}
      </motion.div>

      {/* Custom scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${accentColor}22; border-radius: 100px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${accentColor}44; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default AchievementBadge;
