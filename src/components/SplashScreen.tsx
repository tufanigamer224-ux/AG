import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BRAND_ASSETS } from '../lib/validation';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 1400;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        window.setTimeout(onComplete, 180);
      }
    }, 30);

    return () => window.clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070913] flex flex-col items-center justify-center overflow-hidden px-6">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${BRAND_ASSETS.heroBanner})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070913]/85 via-[#070913]/75 to-[#070913]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
      >
        <div className="w-28 h-28 rounded-3xl overflow-hidden border border-white/15 shadow-[0_0_45px_rgba(255,107,26,0.3)] mb-6 bg-[#0e1426]">
          <img
            src={BRAND_ASSETS.logo}
            alt="AJAY BATTLES Emblem"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-wider text-white">
          AJAY BATTLES
        </h1>

        <p className="mt-3 text-base sm:text-lg font-semibold tracking-wide text-[#FF6B1A]">
          PLAY LIKE A PRO.
        </p>
        <p className="mt-1 text-sm text-slate-300">
          JOIN TOURNAMENTS AND WIN.
        </p>

        <div className="mt-10 w-64 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF6B1A] via-[#9D4EDD] to-[#38BDF8] transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-mono-num text-xs text-slate-400">
            Loading Arena {progress}%
          </p>
        </div>
      </motion.div>
    </div>
  );
}
