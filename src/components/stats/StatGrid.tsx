import { useStore } from '../../lib/store';
import { statXpToLevel } from '../../lib/progression';
import type { StatKey } from '../../lib/schemas';

const STAT_META: Record<StatKey, { label: string; color: string }> = {
  STR: { label: 'STR', color: 'var(--stat-str)' },
  AGI: { label: 'AGI', color: 'var(--stat-agi)' },
  VIT: { label: 'VIT', color: 'var(--stat-vit)' },
  INT: { label: 'INT', color: 'var(--stat-int)' },
  WIS: { label: 'WIS', color: 'var(--stat-wis)' },
  CHA: { label: 'CHA', color: 'var(--stat-cha)' },
};

const STAT_KEYS: StatKey[] = ['STR', 'AGI', 'VIT', 'INT', 'WIS', 'CHA'];

export default function StatGrid() {
  const user = useStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {STAT_KEYS.map((key) => {
        const level = user.stats[key] ?? 1;
        const xp = user.statXp[key] ?? 0;
        const needed = statXpToLevel(level);
        const pct = Math.min(100, Math.round((xp / needed) * 100));
        const meta = STAT_META[key];

        return (
          <div
            key={key}
            className="rounded-lg p-3 flex flex-col gap-1"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '0.5px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-medium"
                style={{ color: meta.color, fontFamily: 'var(--font-numeric)' }}
              >
                {meta.label}
              </span>
              <span
                className="font-medium"
                style={{ color: meta.color, fontFamily: 'var(--font-numeric)', fontSize: 18 }}
              >
                {Math.round(level)}
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: meta.color }}
              />
            </div>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-numeric)' }}>
              {Math.round(xp)}/{Math.round(needed)} xp
            </span>
          </div>
        );
      })}
    </div>
  );
}
