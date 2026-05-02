import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import type { Quest, StatKey } from '../../lib/schemas';

const STAT_COLORS: Record<StatKey, string> = {
  STR: 'var(--stat-str)',
  AGI: 'var(--stat-agi)',
  VIT: 'var(--stat-vit)',
  INT: 'var(--stat-int)',
  WIS: 'var(--stat-wis)',
  CHA: 'var(--stat-cha)',
};

const TYPE_LABEL: Record<Quest['type'], string> = {
  daily:  'Daily',
  weekly: 'Weekly',
  shadow: 'Shadow',
  side:   'Side',
  boss:   'Boss',
};

const reducedMotion = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  quest: Quest;
}

export default function QuestCard({ quest }: Props) {
  const completeQuest = useStore((s) => s.completeQuest);
  const isCompleted = useStore((s) => s.todayCompletedIds.has(quest.id));

  const [justCompleted, setJustCompleted] = useState(false);
  const [showXpFly, setShowXpFly] = useState(false);

  const handleCheck = async () => {
    if (isCompleted) return;
    setJustCompleted(true);
    setShowXpFly(true);
    await completeQuest(quest.id);
    setTimeout(() => setShowXpFly(false), 900);
  };

  const statEntries = Object.entries(quest.stats).filter(([, v]) => (v as number) > 0);

  return (
    <motion.div
      className="relative rounded-xl p-3 mb-2 flex items-start gap-3"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
      animate={
        justCompleted && !reducedMotion
          ? { opacity: [1, 1, 0.55], transition: { duration: 0.4, delay: 0.1 } }
          : { opacity: isCompleted ? 0.55 : 1 }
      }
    >
      {/* Checkbox */}
      <motion.button
        onClick={handleCheck}
        disabled={isCompleted}
        aria-label={isCompleted ? `${quest.title} — completed` : `Complete ${quest.title}`}
        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
        style={{
          borderColor: isCompleted ? 'var(--accent-cyan)' : 'var(--border-strong)',
          backgroundColor: isCompleted ? 'var(--accent-cyan)' : 'transparent',
        }}
        whileTap={isCompleted || reducedMotion ? {} : { scale: 0.75 }}
        animate={
          justCompleted && !reducedMotion
            ? { scale: [1, 1.4, 1], transition: { type: 'spring', stiffness: 400, damping: 15 } }
            : {}
        }
      >
        {isCompleted && (
          <svg width="11" height="8" viewBox="0 0 11 8" fill="none" aria-hidden="true">
            <path d="M1 4L4 7L10 1" stroke="#07090E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </motion.button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: quest.type === 'shadow' ? 'var(--accent-magenta)' : 'var(--text-tertiary)',
            }}
          >
            {TYPE_LABEL[quest.type]}
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {quest.title}
          </span>
        </div>
        {quest.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {quest.description}
          </p>
        )}

        {/* Stat chips with glow pulse on completion */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-xs font-medium font-display" style={{ color: 'var(--accent-cyan)' }}>
            +{Math.round(quest.xp)} XP
          </span>
          {statEntries.map(([stat, amount]) => {
            const color = STAT_COLORS[stat as StatKey] ?? 'var(--text-tertiary)';
            return (
              <motion.span
                key={stat}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--bg-elevated)', color }}
                animate={
                  justCompleted && !reducedMotion
                    ? {
                        boxShadow: [`0 0 0px ${color}`, `0 0 8px ${color}`, `0 0 0px ${color}`],
                        transition: { duration: 0.6, delay: 0.15 },
                      }
                    : {}
                }
              >
                {stat} +{Math.round(amount as number)}
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* XP flies upward */}
      <AnimatePresence>
        {showXpFly && (
          <motion.span
            key="xp-fly"
            className="absolute right-3 top-1 text-xs font-medium font-display pointer-events-none"
            style={{ color: 'var(--accent-cyan)' }}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
          >
            +{Math.round(quest.xp)} XP
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
