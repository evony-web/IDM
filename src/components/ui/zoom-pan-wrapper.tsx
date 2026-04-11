'use client';

import { ReactNode, useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Maximize2 } from 'lucide-react';

interface ZoomPanWrapperProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  minZoom?: number;
  maxZoom?: number;
  initialScale?: number;
}

export function ZoomPanWrapper({
  children,
  className = '',
  style,
  minZoom = 0.3,
  maxZoom = 3,
  initialScale = 1,
}: ZoomPanWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  const scale = useMotionValue(initialScale);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const smoothScale = useSpring(scale, { stiffness: 300, damping: 30 });
  const smoothX = useSpring(x, { stiffness: 300, damping: 30 });
  const smoothY = useSpring(y, { stiffness: 300, damping: 30 });

  // Track current scale for reset button visibility
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    const unsubscribe = scale.on('change', (v) => {
      setShowReset(Math.abs(v - initialScale) > 0.1 || Math.abs(x.get()) > 5 || Math.abs(y.get()) > 5);
    });
    return unsubscribe;
  }, [scale, initialScale, x, y]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const currentScale = scale.get();
      const newScale = Math.min(maxZoom, Math.max(minZoom, currentScale * delta));
      scale.set(newScale);
    },
    [scale, minZoom, maxZoom]
  );

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastTouchDist.current;
      const newScale = Math.min(maxZoom, Math.max(minZoom, scale.get() * delta));
      scale.set(newScale);
      lastTouchDist.current = dist;
    }
  }, [scale, minZoom, maxZoom]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Reset zoom to initial state
  const handleReset = useCallback(() => {
    scale.set(initialScale);
    x.set(0);
    y.set(0);
  }, [scale, x, y, initialScale]);

  // Pan handlers
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-grab ${isDragging ? 'cursor-grabbing' : ''} ${className}`}
      style={{ touchAction: 'none', ...style }}
    >
      <motion.div
        style={{
          x: smoothX,
          y: smoothY,
          scale: smoothScale,
          transformOrigin: 'center center',
        }}
        drag
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="w-full h-full"
      >
        {children}
      </motion.div>

      {/* Reset Zoom Button */}
      {showReset && (
        <button
          onClick={handleReset}
          className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          aria-label="Reset zoom"
        >
          <Maximize2 className="w-4 h-4 text-white/60" />
        </button>
      )}
    </div>
  );
}
