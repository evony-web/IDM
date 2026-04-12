'use client';

/* ═══════════════════════════════════════════════════════════════════
   IDOL META (TARKAM) — Premium Background System
   Male: Solid Black (#000000) - Dark Theme with Green Glow
   Female: Solid Black (#000000) - Dark Theme with Blue Glow
   ═══════════════════════════════════════════════════════════════════ */

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

type Division = 'male' | 'female';
type UITheme = 'dark-male' | 'dark-female' | 'dark';

/* ═══════════════════════════════════════════════════════════════════
   GRADIENT BACKGROUND — Dark Mode: Male=Green Glow | Female=Blue Glow
   ═══════════════════════════════════════════════════════════════════ */

interface GradientBackgroundProps {
  division: Division;
  uiTheme?: UITheme;
}

export function GradientBackground({ division = 'male' }: GradientBackgroundProps) {
  const isMale = division === 'male';
  
  // Both divisions use the same dark background, only glow color differs
  const glowRGB = isMale ? '115,255,0' : '56,189,248'; // Green for Male, Blue for Female

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Video Background Pattern */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.15 }}
      >
        <source src="https://res.cloudinary.com/dagoryri5/video/upload/v1775996429/a962508d4a57662147d45e06c7cbb073_ynfpw4.mp4" type="video/mp4" />
      </video>

      {/* Base Background Color - BLACK for both divisions */}
      <motion.div
        key={division}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
        }}
      />

      {/* Subtle dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,0.15) 100%)`,
        }}
      />

      {/* Accent glow orb - Green for Male, Blue for Female */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          left: '50%',
          top: '30%',
          background: `radial-gradient(circle, rgba(${glowRGB},0.08) 0%, transparent 70%)`,
          filter: 'blur(80px)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.65, 0.4],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PREMIUM 3D EFFECTS — Male: Green Glow | Female: Blue Glow
   ═══════════════════════════════════════════════════════════════════ */

interface Premium3DEffectsProps {
  color?: 'blue' | 'pink';
  className?: string;
  uiTheme?: UITheme;
}

export function Premium3DEffects({ color = 'blue', className = '' }: Premium3DEffectsProps) {
  // Male (blue prop) = Green accent glow, Female (pink prop) = Blue accent glow
  const isMale = color === 'blue';
  const glowRGB = isMale ? '115,255,0' : '56,189,248'; // Green for Male, Blue for Female

  // Both divisions use the same glow effect style, just different colors
  return (
    <div className={`fixed inset-0 z-[-5] pointer-events-none overflow-hidden ${className}`}>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          left: '50%',
          top: '30%',
          background: `radial-gradient(circle, rgba(${glowRGB},0.08) 0%, transparent 70%)`,
          filter: 'blur(80px)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.65, 0.4],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   APPLE 3D CARD — Hover Effects with Perspective
   ═══════════════════════════════════════════════════════════════════ */

interface Apple3DCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
  glowColor?: string;
  onClick?: () => void;
}

export function Apple3DCard({ 
  children, 
  className = '', 
  intensity = 'medium',
  glowColor,
  onClick 
}: Apple3DCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const intensityMultiplier = {
    subtle: 3,
    medium: 8,
    strong: 15,
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateXVal = ((y - centerY) / centerY) * -intensityMultiplier[intensity];
    const rotateYVal = ((x - centerX) / centerX) * intensityMultiplier[intensity];

    setRotateX(rotateXVal);
    setRotateY(rotateYVal);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <motion.div
      className={`relative ${className}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      animate={{
        rotateX,
        rotateY,
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        mass: 0.8,
      }}
    >
      {/* Glow effect on hover */}
      <AnimatePresence>
        {isHovered && glowColor && (
          <motion.div
            className="absolute inset-0 rounded-[inherit] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: `radial-gradient(800px circle at 50% 50%, ${glowColor}15, transparent 40%)`,
              transform: 'translateZ(-20px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Card content */}
      <div style={{ transform: 'translateZ(0px)' }}>
        {children}
      </div>

      {/* Inner shadow for depth */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background: `linear-gradient(135deg, 
            rgba(255,255,255,${isHovered ? 0.08 : 0.04}) 0%, 
            transparent 50%,
            rgba(0,0,0,${isHovered ? 0.15 : 0.08}) 100%)`,
        }}
        animate={{
          opacity: isHovered ? 1 : 0.6,
        }}
      />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   APPLE FLOATING ACTION — Spring Animation Button
   ═══════════════════════════════════════════════════════════════════ */

interface AppleFloatingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  accentColor?: string;
}

export function AppleFloatingButton({ 
  children, 
  onClick, 
  className = '',
  accentColor = '#73FF00'
}: AppleFloatingButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative ${className}`}
      style={{
        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
        boxShadow: `0 8px 32px ${accentColor}40, 0 2px 8px ${accentColor}20`,
      }}
      whileHover={{ 
        scale: 1.08,
        boxShadow: `0 12px 48px ${accentColor}50, 0 4px 12px ${accentColor}30`,
      }}
      whileTap={{ 
        scale: 0.95,
        boxShadow: `0 4px 16px ${accentColor}30`,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 20,
      }}
    >
      {children}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   APPLE GLASS MORPHISM — iOS Style Frosted Glass
   ═══════════════════════════════════════════════════════════════════ */

interface AppleGlassProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'heavy';
  hover?: boolean;
  onClick?: () => void;
}

export function AppleGlass({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true,
  onClick 
}: AppleGlassProps) {
  const variants = {
    default: {
      background: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.12)',
      blur: 40,
    },
    subtle: {
      background: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 255, 255, 0.08)',
      blur: 24,
    },
    heavy: {
      background: 'rgba(255, 255, 255, 0.12)',
      border: 'rgba(255, 255, 255, 0.18)',
      blur: 64,
    },
  };

  const v = variants[variant];

  return (
    <motion.div
      onClick={onClick}
      className={`relative ${className}`}
      style={{
        background: v.background,
        backdropFilter: `blur(${v.blur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${v.blur}px) saturate(180%)`,
        border: `0.5px solid ${v.border}`,
      }}
      whileHover={hover ? {
        background: 'rgba(255, 255, 255, 0.12)',
        borderColor: 'rgba(255, 255, 255, 0.18)',
        scale: 1.01,
      } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {/* Top highlight */}
      <div 
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        }}
      />
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   APPLE SHIMMER — Loading Animation
   ═══════════════════════════════════════════════════════════════════ */

export function AppleShimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   APPLE RESPONSIVE CONTAINER — Desktop/Tablet/Mobile
   ═══════════════════════════════════════════════════════════════════ */

interface AppleContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function AppleContainer({ 
  children, 
  className = '',
  maxWidth = 'lg'
}: AppleContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    'full': 'max-w-full',
  };

  return (
    <div className={`
      w-full mx-auto px-4
      sm:px-6 md:px-8 lg:px-12
      ${maxWidthClasses[maxWidth]}
      ${className}
    `}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   APPLE GRID — Responsive Grid System
   ═══════════════════════════════════════════════════════════════════ */

interface AppleGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function AppleGrid({ 
  children, 
  className = '',
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md'
}: AppleGridProps) {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 lg:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8',
  };

  const colClasses = `
    grid
    grid-cols-${cols.mobile || 1}
    sm:grid-cols-${cols.tablet || 2}
    lg:grid-cols-${cols.desktop || 3}
  `;

  return (
    <div className={`${colClasses} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}
