import { useStore } from '../../lib/store';

export default function TitleBadges() {
  const titles = useStore((s) => s.titles);
  const earned = titles.filter((t) => t.earnedAt !== null);

  if (earned.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
        Titles earned
      </p>
      <div className="flex flex-wrap gap-1.5">
        {earned.map((t) => (
          <span
            key={t.id}
            title={t.description}
            className="text-xs px-2 py-1 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--accent-gold)',
              color: 'var(--accent-gold)',
            }}
          >
            {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}
