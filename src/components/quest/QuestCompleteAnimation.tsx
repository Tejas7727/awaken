import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  visible: boolean;
  xp: number;
}

export default function QuestCompleteAnimation({ visible, xp }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          key="xp-fly"
          className="absolute right-2 top-0 text-xs font-medium font-display pointer-events-none"
          style={{ color: 'var(--accent-cyan)' }}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -24 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          +{Math.round(xp)} XP
        </motion.span>
      )}
    </AnimatePresence>
  );
}
