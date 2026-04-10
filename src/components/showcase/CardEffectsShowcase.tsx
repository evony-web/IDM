'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Star, Crown, Trophy, Flame, Diamond, Users, Gamepad2, Wallet } from 'lucide-react';

interface CardEffectsShowcaseProps {
  division: 'male' | 'female';
}

export function CardEffectsShowcase({ division }: CardEffectsShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState<'hero' | 'exclusive' | 'highlight' | 'core'>('hero');
  
  // For spotlight effect
  const spotlightRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      spotlightRefs.current.forEach((card) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const accentColor = division === 'male' ? '#73FF00' : '#38BDF8';
  
  const categories = [
    { id: 'hero', label: 'Hero', icon: Diamond, desc: 'PALING PREMIUM - 1 per halaman' },
    { id: 'exclusive', label: 'Exclusive', icon: Crown, desc: 'Paling berat, untuk 1 elemen saja' },
    { id: 'highlight', label: 'Highlight', icon: Star, desc: 'Medium-heavy, untuk top 3 / featured' },
    { id: 'core', label: 'Core', icon: Zap, desc: 'Ringan, untuk list banyak card' },
  ] as const;

  // Hero Effects - THE MOST PREMIUM (main featured card only)
  const heroEffects = [
    {
      name: 'card-hero-premium',
      title: 'Card Hero Premium',
      desc: 'ULTIMATE: Floating + Spinning glow + Shimmer + Particles - PALING UTAMA',
      class: 'card-hero-premium',
      icon: Crown,
      performance: 'PREMIUM+',
      recommended: true,
      isPremium: true,
    },
    {
      name: 'card-hero',
      title: 'Card Hero',
      desc: 'Spinning glow border + inner glow + corner accents',
      class: 'card-hero card-hero-corner',
      icon: Diamond,
      performance: 'PREMIUM',
      recommended: true,
    },
  ];

  // Exclusive Effects - HEAVIEST (use sparingly)
  const exclusiveEffects = [
    {
      name: 'card-holo',
      title: 'Holographic',
      desc: 'Rainbow shimmer effect - Efek holografik pelangi',
      class: 'card-holo',
      icon: Sparkles,
      performance: 'MEDIUM-HEAVY',
    },
    {
      name: 'card-spotlight',
      title: 'Spotlight',
      desc: 'Glow follows cursor - Cahaya mengikuti mouse',
      class: 'card-spotlight',
      icon: Flame,
      performance: 'MEDIUM (Desktop only)',
    },
    {
      name: 'card-glass-pro',
      title: 'Glass Pro',
      desc: 'Premium glassmorphism - Efek kaca premium',
      class: 'card-glass-pro',
      icon: Trophy,
      performance: 'HEAVIEST',
      warning: 'Hindari untuk list banyak card!',
    },
  ];

  // Highlight Effects - For top 3 / featured cards
  const highlightEffects = [
    {
      name: 'card-pro',
      title: 'Card Pro',
      desc: 'Animated glow border + shimmer + scale',
      class: 'card-pro',
      icon: Crown,
      performance: 'MEDIUM-HEAVY',
      recommended: true,
    },
    {
      name: 'card-gold-enhanced',
      title: 'Gold Enhanced',
      desc: 'Shimmer + glow accent',
      class: 'card-gold-enhanced',
      icon: Star,
      performance: 'MEDIUM',
      recommended: true,
    },
    {
      name: 'card-glow',
      title: 'Card Glow',
      desc: 'Pulsing glow animation',
      class: 'card-glow',
      icon: Zap,
      performance: 'MEDIUM',
    },
  ];

  // Core Effects - Light for mass usage
  const coreEffects = [
    {
      name: 'card-float',
      title: 'Card Float',
      desc: 'Floating animation + shadow',
      class: 'card-float',
      icon: Zap,
      performance: 'LIGHT',
      recommended: true,
    },
    {
      name: 'card-inner-glow',
      title: 'Inner Glow',
      desc: 'Subtle inner highlight',
      class: 'card-inner-glow',
      icon: Star,
      performance: 'VERY LIGHT',
      recommended: true,
    },
    {
      name: 'card-accent-line',
      title: 'Accent Line',
      desc: 'Top accent line glow',
      class: 'card-accent-line',
      icon: Flame,
      performance: 'VERY LIGHT',
      recommended: true,
    },
    {
      name: 'card-corner-accent',
      title: 'Corner Accent',
      desc: 'Corner glow accents',
      class: 'card-corner-accent',
      icon: Sparkles,
      performance: 'VERY LIGHT',
    },
  ];

  const getEffects = () => {
    switch (activeCategory) {
      case 'hero':
        return heroEffects;
      case 'exclusive':
        return exclusiveEffects;
      case 'highlight':
        return highlightEffects;
      case 'core':
        return coreEffects;
    }
  };

  const getPerformanceColor = (perf: string) => {
    if (perf.includes('VERY LIGHT')) return 'text-green-400';
    if (perf.includes('LIGHT')) return 'text-green-300';
    if (perf.includes('PREMIUM')) return 'text-purple-400';
    if (perf.includes('MEDIUM-HEAVY')) return 'text-orange-400';
    if (perf.includes('HEAVIEST')) return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold gradient-gold">
          High-End Card Effects Showcase
        </h2>
        <p className="text-sm text-white/60 max-w-md mx-auto">
          Efek-efek premium untuk device high-end. Gunakan dengan bijak sesuai panduan performa.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex justify-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'text-black'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
            }`}
            style={activeCategory === cat.id ? { background: accentColor } : {}}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <cat.icon className="w-4 h-4 inline mr-1.5" />
            {cat.label}
          </motion.button>
        ))}
      </div>

      {/* Category Description */}
      <div className="text-center">
        <p className="text-xs text-white/40">
          {categories.find(c => c.id === activeCategory)?.desc}
        </p>
      </div>

      {/* Cards Grid */}
      <div className={`grid grid-cols-1 ${activeCategory === 'hero' ? 'gap-10' : 'sm:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
        {getEffects().map((effect, index) => {
          // Special rendering for hero premium card
          if (effect.isPremium && activeCategory === 'hero') {
            return (
              <motion.div
                key={effect.name}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className={`${effect.class} p-8 min-h-[320px] flex flex-col relative col-span-full max-w-2xl mx-auto w-full`}
              >
                {/* Crown */}
                <div className="hero-crown">
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Crown
                      className="w-12 h-12"
                      style={{ color: accentColor }}
                      fill={accentColor}
                    />
                  </motion.div>
                </div>

                {/* Premium Badge */}
                <div className="hero-badge">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  PREMIUM
                </div>

                {/* Corner Accents */}
                <div className="hero-corner-tl" />
                <div className="hero-corner-br" />

                {/* Floating Particles */}
                <div className="hero-particles">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="hero-particle"
                      style={{
                        left: `${10 + Math.random() * 80}%`,
                        animationDelay: `${Math.random() * 8}s`,
                        animationDuration: `${6 + Math.random() * 4}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <effect.icon
                    className="w-12 h-12 mb-6"
                    style={{ color: accentColor }}
                  />

                  <h3 className="text-2xl font-bold text-white mb-2">
                    {effect.title}
                  </h3>

                  <code className="text-sm px-3 py-1.5 rounded-lg bg-white/10 text-white/70 mb-4 font-mono inline-block">
                    .{effect.name}
                  </code>

                  <p className="text-base text-white/60 mb-6">
                    {effect.desc}
                  </p>

                  {/* Example Content */}
                  <div className="grid grid-cols-3 gap-4 mt-auto">
                    <div className="text-center p-3 rounded-xl bg-white/5">
                      <Users className="w-5 h-5 mx-auto mb-1" style={{ color: accentColor }} />
                      <span className="text-xs text-white/50">128 Players</span>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5">
                      <Gamepad2 className="w-5 h-5 mx-auto mb-1" style={{ color: accentColor }} />
                      <span className="text-xs text-white/50">32 Teams</span>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5">
                      <Wallet className="w-5 h-5 mx-auto mb-1" style={{ color: accentColor }} />
                      <span className="text-xs text-white/50">Rp 2.5M</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <span className="text-sm text-white/40">Performance:</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(effect.performance)}`}>
                      {effect.performance}
                    </span>
                    <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: accentColor, color: '#000' }}>
                      RECOMMENDED
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          }

          // Regular card rendering
          return (
            <motion.div
              key={effect.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              ref={(el) => {
                if (effect.name === 'card-spotlight') {
                  spotlightRefs.current[index] = el;
                }
              }}
              className={`${effect.class} p-6 min-h-[200px] flex flex-col relative`}
            >
              {/* Recommended Badge */}
              {effect.recommended && (
                <div
                  className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: accentColor, color: '#000' }}
                >
                  RECOMMENDED
                </div>
              )}

              {/* Warning Badge */}
              {effect.warning && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  WARNING
                </div>
              )}

              {/* Icon */}
              <effect.icon
                className="w-8 h-8 mb-4"
                style={{ color: accentColor }}
              />

              {/* Title */}
              <h3 className="text-lg font-bold text-white mb-1">
                {effect.title}
              </h3>

              {/* Class Name */}
              <code className="text-xs px-2 py-1 rounded bg-white/10 text-white/70 mb-2 font-mono">
                .{effect.name}
              </code>

              {/* Description */}
              <p className="text-sm text-white/50 flex-1">
                {effect.desc}
              </p>

              {/* Performance Badge */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-white/30">Performance:</span>
                <span className={`text-xs font-medium ${getPerformanceColor(effect.performance)}`}>
                  {effect.performance}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Combination Examples */}
      <div className="mt-12 space-y-4">
        <h3 className="text-lg font-bold text-center gradient-gold">
          Kombinasi yang Disarankan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Core Combination */}
          <div className="card-float card-accent-line card-inner-glow p-5">
            <h4 className="font-semibold text-white mb-2">Core Combination</h4>
            <code className="text-xs text-white/50 block mb-3">
              .card-float .card-accent-line .card-inner-glow
            </code>
            <p className="text-xs text-white/40">
              Untuk list banyak card (leaderboard, daftar pemain)
            </p>
          </div>

          {/* Highlight Combination */}
          <div className="card-pro p-5">
            <h4 className="font-semibold text-white mb-2">Highlight</h4>
            <code className="text-xs text-white/50 block mb-3">
              .card-pro
            </code>
            <p className="text-xs text-white/40">
              Untuk top 3 players / featured cards (max 3 per page)
            </p>
          </div>

          {/* Exclusive Combination */}
          <div className="card-holo p-5">
            <h4 className="font-semibold text-white mb-2">Exclusive</h4>
            <code className="text-xs text-white/50 block mb-3">
              .card-holo
            </code>
            <p className="text-xs text-white/40">
              Untuk 1 elemen spesial saja (MVP of the week)
            </p>
          </div>
        </div>
      </div>

      {/* Performance Guidelines */}
      <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" style={{ color: accentColor }} />
          Panduan Performa
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold text-green-400">Rekomendasi untuk List:</h4>
            <ul className="text-white/60 space-y-1 text-xs">
              <li>.card-float + .card-accent-line + .card-inner-glow</li>
              <li>Hindari .card-glass-pro untuk list banyak card</li>
              <li>Shimmer hanya saat hover, bukan loop</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-orange-400">Rekomendasi untuk Featured:</h4>
            <ul className="text-white/60 space-y-1 text-xs">
              <li>.card-pro (max 3 per page)</li>
              <li>.card-gold-enhanced (max 3 per page)</li>
              <li>.card-holo atau .card-spotlight (1 saja per page)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
