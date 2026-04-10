'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PlayerNotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: '#0a0f0d' }}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,69,58,0.04) 0%, transparent 60%)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 text-center max-w-sm"
      >
        {/* Icon */}
        <motion.div
          className="w-24 h-24 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <UserX className="w-10 h-10 text-white/20" />
        </motion.div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white/70 mb-2">404</h1>
        <h2 className="text-lg font-semibold text-white/50 mb-3">Pemain Tidak Ditemukan</h2>
        <p className="text-[13px] text-white/30 leading-relaxed mb-8">
          Pemain yang kamu cari tidak ada atau sudah dihapus dari platform.
          Periksa kembali tautan yang kamu gunakan.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.button
            onClick={() => router.back()}
            className="glass-subtle rounded-2xl px-6 py-3 flex items-center gap-2 text-[13px] font-semibold text-white/60 hover:text-white/80 transition-colors w-full sm:w-auto justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </motion.button>
          <motion.button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-amber-400 to-amber-600 text-black rounded-2xl px-6 py-3 flex items-center gap-2 text-[13px] font-bold hover:from-amber-300 hover:to-amber-500 transition-all w-full sm:w-auto justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Ke Beranda
          </motion.button>
        </div>

        {/* Footer branding */}
        <div className="mt-12">
          <p
            className="text-[11px] font-bold tracking-[0.15em] uppercase"
            style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #ffec8b 50%, #ffd700 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            IDOL META &middot; TARKAM
          </p>
          <p className="text-[9px] tracking-widest text-white/20 mt-1">
            Fan Made Edition &copy; 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
