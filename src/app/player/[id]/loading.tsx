export default function PlayerProfileLoading() {
  return (
    <div className="min-h-screen relative" style={{ background: '#0a0f0d' }}>
      {/* Background Effects (static, no animation) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pb-12">
        {/* Back button skeleton */}
        <div className="pt-6 pb-4">
          <div className="w-24 h-10 rounded-2xl bg-white/[0.04] animate-pulse" />
        </div>

        <div className="space-y-6">
          {/* Avatar skeleton */}
          <div className="flex flex-col items-center text-center pb-8">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="w-40 h-7 mt-5 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-20 h-6 rounded-lg bg-white/[0.04] animate-pulse" />
              <div className="w-16 h-4 rounded bg-white/[0.04] animate-pulse" />
            </div>
            <div className="w-24 h-7 mt-3 rounded-xl bg-white/[0.04] animate-pulse" />
          </div>

          {/* Stats cards skeleton - 2x3 grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-subtle rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="w-8 h-5 rounded bg-white/[0.06] animate-pulse" />
                  <div className="w-12 h-2.5 rounded bg-white/[0.04] animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Info section skeleton */}
          <div className="glass-subtle rounded-2xl px-5 py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0">
                <div className="w-24 h-3.5 rounded bg-white/[0.04] animate-pulse" />
                <div className="w-20 h-3.5 rounded bg-white/[0.06] animate-pulse" />
              </div>
            ))}
          </div>

          {/* Matches skeleton */}
          <div className="space-y-2.5">
            <div className="w-32 h-4 rounded bg-white/[0.04] animate-pulse" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-subtle rounded-2xl px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] animate-pulse" />
                    <div className="space-y-2">
                      <div className="w-28 h-3.5 rounded bg-white/[0.06] animate-pulse" />
                      <div className="w-40 h-2.5 rounded bg-white/[0.04] animate-pulse" />
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="w-14 h-3.5 rounded bg-white/[0.06] animate-pulse ml-auto" />
                    <div className="w-10 h-2.5 rounded bg-white/[0.04] animate-pulse ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer skeleton */}
          <div className="text-center pt-4 pb-6 space-y-2">
            <div className="w-36 h-3 rounded bg-white/[0.04] animate-pulse mx-auto" />
            <div className="w-20 h-2 rounded bg-white/[0.03] animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
