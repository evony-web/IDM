'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Trophy,
  Users,
  Gamepad2,
  Crown,
  Star,
  ChevronRight,
  Sparkles,
  Zap,
  Target,
  Medal,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Apple iOS Premium Dashboard
   ───────────────────────────────────────────── */

interface AppleDashboardProps {
  division: 'male' | 'female';
  tournament?: {
    name: string;
    status: string;
    week?: number;
    prizePool?: number;
    participants?: number;
  } | null;
  topPlayers?: Array<{
    id: string;
    name: string;
    points: number;
    avatar?: string | null;
    tier?: string;
  }>;
  onRegister?: () => void;
  onNavigate?: (tab: string) => void;
}

// Theme colors
function getColors(division: 'male' | 'female') {
  return division === 'male' 
    ? { 
        primary: '#73FF00', 
        rgb: '115,255,0',
        gradient: 'from-[#73FF00] via-[#5FD400] to-[#4AB800]'
      }
    : { 
        primary: '#38BDF8', 
        rgb: '56,189,248',
        gradient: 'from-[#38BDF8] via-[#0EA5E9] to-[#0284C7]'
      };
}

export function AppleDashboard({ 
  division, 
  tournament, 
  topPlayers = [],
  onRegister,
  onNavigate 
}: AppleDashboardProps) {
  const colors = getColors(division);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Stats data
  const stats = [
    { id: 'tournaments', icon: Trophy, label: 'Turnamen', value: '24', change: '+3' },
    { id: 'players', icon: Users, label: 'Pemain', value: '1,847', change: '+156' },
    { id: 'games', icon: Gamepad2, label: 'Game', value: '12', change: '' },
    { id: 'champions', icon: Crown, label: 'Juara', value: '156', change: '+8' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ═══════════════════════════════════════════
          HERO CARD - Apple iOS Premium 3D
          ═══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="apple-3d-container"
      >
        <motion.div
          className="apple-hero-card relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, rgba(${colors.rgb},0.08) 0%, rgba(10,15,13,0.95) 50%, rgba(${colors.rgb},0.04) 100%)`,
            borderRadius: '24px',
            padding: '24px',
            border: `0.5px solid rgba(${colors.rgb},0.15)`,
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
            e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
          }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Ambient glow orbs */}
          <div 
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] pointer-events-none opacity-40"
            style={{ background: `radial-gradient(circle, rgba(${colors.rgb},0.4) 0%, transparent 70%)` }}
          />
          <div 
            className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-[60px] pointer-events-none opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(255,159,10,0.3) 0%, transparent 70%)' }}
          />

          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Status badge */}
              <motion.span
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: `linear-gradient(135deg, rgba(${colors.rgb},0.2) 0%, rgba(${colors.rgb},0.1) 100%)`,
                  border: `1px solid rgba(${colors.rgb},0.3)`,
                  color: colors.primary,
                }}
                animate={{ 
                  boxShadow: [
                    `0 0 8px rgba(${colors.rgb},0.3)`,
                    `0 0 16px rgba(${colors.rgb},0.5)`,
                    `0 0 8px rgba(${colors.rgb},0.3)`,
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ● LIVE
              </motion.span>
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                Minggu {tournament?.week || 1}
              </span>
            </div>

            {/* Division badge */}
            <div 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: `linear-gradient(135deg, rgba(${colors.rgb},0.15) 0%, rgba(${colors.rgb},0.05) 100%)`,
                border: `1px solid rgba(${colors.rgb},0.2)`,
              }}
            >
              <Sparkles className="w-3 h-3" style={{ color: colors.primary }} />
              <span className="text-[10px] font-semibold" style={{ color: colors.primary }}>
                {division === 'male' ? 'Night Fury' : 'Light Fury'}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 
            className="text-[28px] sm:text-[32px] lg:text-[40px] font-black leading-tight mb-3"
            style={{ letterSpacing: '-0.03em' }}
          >
            <span className={`bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
              {tournament?.name || 'IDOL META Tournament'}
            </span>
          </h1>

          {/* Info row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                Rp {(tournament?.prizePool || 500000).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/50" />
              <span className="text-sm text-white/70">
                {tournament?.participants || 0} Peserta
              </span>
            </div>
          </div>

          {/* CTA Button */}
          {tournament?.status === 'registration' && (
            <motion.button
              onClick={onRegister}
              className="w-full py-4 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, rgba(${colors.rgb},0.8) 100%)`,
                boxShadow: `0 8px 32px rgba(${colors.rgb},0.4), inset 0 1px 0 rgba(255,255,255,0.2)`,
                color: '#000',
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Zap className="w-5 h-5" />
              GABUNG TURNAMEN
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}

          {tournament?.status === 'ongoing' && (
            <motion.button
              onClick={() => onNavigate?.('bracket')}
              className="w-full py-4 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, rgba(${colors.rgb},0.15) 0%, rgba(${colors.rgb},0.08) 100%)`,
                border: `1px solid rgba(${colors.rgb},0.3)`,
                color: colors.primary,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Target className="w-5 h-5" />
              Lihat Bracket
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* ═══════════════════════════════════════════
          STATS GRID - Apple 3D Cards
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="apple-stat-card group cursor-pointer"
            onMouseEnter={() => setHoveredCard(stat.id)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: hoveredCard === stat.id 
                ? `linear-gradient(135deg, rgba(${colors.rgb},0.08) 0%, rgba(255,255,255,0.04) 100%)`
                : 'rgba(255,255,255,0.04)',
              border: hoveredCard === stat.id 
                ? `0.5px solid rgba(${colors.rgb},0.2)`
                : '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            <div 
              className="apple-stat-icon"
              style={{
                background: `linear-gradient(135deg, rgba(${colors.rgb},0.2) 0%, rgba(${colors.rgb},0.1) 100%)`,
              }}
            >
              <stat.icon className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            <p className="apple-stat-value">{stat.value}</p>
            <p className="apple-stat-label">{stat.label}</p>
            {stat.change && (
              <span 
                className="absolute top-3 right-3 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ 
                  background: `rgba(${colors.rgb},0.15)`,
                  color: colors.primary 
                }}
              >
                {stat.change}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          TOP PLAYERS - Apple Leaderboard
          ═══════════════════════════════════════════ */}
      {topPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Crown className="w-5 h-5" style={{ color: colors.primary }} />
              Top Players
            </h2>
            <button 
              onClick={() => onNavigate?.('leaderboard')}
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: colors.primary }}
            >
              Lihat Semua
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {topPlayers.slice(0, 5).map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                className="apple-leaderboard-item group"
                style={{
                  background: index === 0 
                    ? `linear-gradient(135deg, rgba(${colors.rgb},0.06) 0%, rgba(255,255,255,0.02) 100%)`
                    : 'rgba(255,255,255,0.03)',
                  border: index === 0 
                    ? `0.5px solid rgba(${colors.rgb},0.15)`
                    : '0.5px solid rgba(255,255,255,0.05)',
                }}
              >
                {/* Rank */}
                <div 
                  className={`apple-leaderboard-rank ${
                    index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''
                  }`}
                  style={index > 2 ? { 
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.5)'
                  } : {}}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className="apple-leaderboard-avatar bg-gradient-to-br from-gray-600 to-gray-800">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-sm font-bold text-white/70">{player.name.charAt(0)}</span>
                  )}
                </div>

                {/* Info */}
                <div className="apple-leaderboard-info">
                  <p className="apple-leaderboard-name">{player.name}</p>
                  <p className="apple-leaderboard-score">
                    {player.tier && <span className="mr-2">{player.tier}</span>}
                    Tier
                  </p>
                </div>

                {/* Points */}
                <div className="apple-leaderboard-points" style={{ color: colors.primary }}>
                  {player.points.toLocaleString()}
                  <span className="text-[10px] text-white/40 ml-1">pts</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════
          QUICK ACTIONS
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => onNavigate?.('grandfinal')}
          className="apple-glass p-4 rounded-2xl text-left group"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: `linear-gradient(135deg, rgba(${colors.rgb},0.2), rgba(${colors.rgb},0.1))` }}
          >
            <Medal className="w-5 h-5" style={{ color: colors.primary }} />
          </div>
          <p className="font-semibold text-[15px] mb-1">Grand Final</p>
          <p className="text-[12px] text-white/50">Lihat klasemen liga</p>
        </motion.button>

        <motion.button
          onClick={() => onNavigate?.('history')}
          className="apple-glass p-4 rounded-2xl text-left group"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: `linear-gradient(135deg, rgba(255,159,10,0.2), rgba(255,159,10,0.1))` }}
          >
            <Star className="w-5 h-5 text-orange-400" />
          </div>
          <p className="font-semibold text-[15px] mb-1">Riwayat</p>
          <p className="text-[12px] text-white/50">Turnamen sebelumnya</p>
        </motion.button>
      </div>
    </div>
  );
}
