import { motion } from 'framer-motion';
import { useStore } from '../../lib/store';
import { TITLE_RULES, RARITY_COLOR, type TitleRarity } from '../../data/titles';

export default function TitleBadges() {
  const titles = useStore((s) => s.titles);

  // Merge TITLE_RULES metadata with earned state
  const merged = TITLE_RULES.map((rule) => {
    const dbTitle = titles.find((t) => t.id === rule.id);
    return {
      id: rule.id,
      name: rule.name,
      desc: rule.desc,
      rarity: rule.rarity,
      hidden: rule.hidden ?? false,
      earnedAt: dbTitle?.earnedAt ?? null,
    };
  });

  // Show earned titles + visible unearned titles (not hidden)
  const visible = merged.filter((t) => t.earnedAt !== null || !t.hidden);
  if (visible.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
        Titles
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((t) => {
          const earned = t.earnedAt !== null;
          const isHiddenUnearned = t.hidden && !earned;

          if (isHiddenUnearned) {
            return (
              <span
                key={t.id}
                className="text-xs px-2 py-1 rounded-lg font-medium"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.12em',
                  fontSize: 11,
                }}
              >
                ???
              </span>
            );
          }

          if (!earned) {
            return (
              <span
                key={t.id}
                title={t.desc}
                className="text-xs px-2 py-1 rounded-lg font-medium"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: `0.5px solid ${RARITY_COLOR[t.rarity as TitleRarity]}`,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.12em',
                  fontSize: 11,
                  opacity: 0.4,
                }}
              >
                {t.name}
              </span>
            );
          }

          // Earned — rarity styling
          if (t.rarity === 'mythic') {
            return (
              <motion.span
                key={t.id}
                title={t.desc}
                className="text-xs px-2 py-1 rounded-lg font-medium"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: `1px solid ${RARITY_COLOR.mythic}`,
                  color: RARITY_COLOR.mythic,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.12em',
                  fontSize: 11,
                }}
                animate={{
                  boxShadow: [
                    `0 0 0px ${RARITY_COLOR.mythic}`,
                    `0 0 8px ${RARITY_COLOR.mythic}`,
                    `0 0 0px ${RARITY_COLOR.mythic}`,
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
              >
                {t.name}
              </motion.span>
            );
          }

          return (
            <span
              key={t.id}
              title={t.desc}
              className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: `1px solid ${RARITY_COLOR[t.rarity as TitleRarity]}`,
                color: RARITY_COLOR[t.rarity as TitleRarity],
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.12em',
                fontSize: 11,
              }}
            >
              {t.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
