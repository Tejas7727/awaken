import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';

const reducedMotion = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function LevelUpModal() {
  const levelUpData = useStore((s) => s.levelUpData);
  const dismissLevelUp = useStore((s) => s.dismissLevelUp);

  return (
    <AnimatePresence>
      {levelUpData && (
        <motion.div
          key="levelup-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(7,9,14,0.92)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
          onClick={dismissLevelUp}
        >
          <motion.div
            key="levelup-card"
            className="w-full max-w-sm rounded-2xl p-8 text-center"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--accent-cyan)',
              boxShadow: '0 0 48px rgba(77,233,255,0.25)',
            }}
            initial={reducedMotion ? {} : { scale: 0.8, opacity: 0, y: 24 }}
            animate={reducedMotion ? {} : { scale: 1, opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { scale: 0.9, opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, duration: reducedMotion ? 0 : 1.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Shimmer ring */}
            <motion.div
              className="relative mx-auto mb-5 flex items-center justify-center rounded-full"
              style={{
                width: 96,
                height: 96,
                border: '2px solid var(--accent-cyan)',
              }}
              animate={reducedMotion ? {} : {
                boxShadow: [
                  '0 0 0px rgba(77,233,255,0)',
                  '0 0 32px rgba(77,233,255,0.7)',
                  '0 0 8px rgba(77,233,255,0.3)',
                ],
              }}
              transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
            >
              <motion.span
                className="text-3xl font-medium font-display"
                style={{ color: 'var(--accent-cyan)' }}
                initial={reducedMotion ? {} : { scale: 0.5 }}
                animate={reducedMotion ? {} : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.15 }}
              >
                {levelUpData.level}
              </motion.span>
            </motion.div>

            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Level up
            </p>
            <h2 className="text-xl font-medium font-display mb-1" style={{ color: 'var(--text-primary)' }}>
              Level {levelUpData.level} reached
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Current rank: <span style={{ color: 'var(--accent-cyan)' }}>{levelUpData.rank}</span>
            </p>

            <button
              onClick={dismissLevelUp}
              className="w-full py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-base)' }}
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
