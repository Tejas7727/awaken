import { useStore } from '../../lib/store';
import { playerXpThreshold } from '../../lib/progression';

export default function XPBar() {
  const user = useStore((s) => s.user);

  if (!user) return null;

  const currentLevel = user.playerLevel;
  const xpForNext = playerXpThreshold(currentLevel + 1);
  const xpForCurrent = playerXpThreshold(currentLevel);
  const xpInLevel = user.totalXp - xpForCurrent;
  const xpNeeded = xpForNext - xpForCurrent;
  const progress = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium font-display" style={{ color: 'var(--text-secondary)' }}>
          Level {Math.round(currentLevel)}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {Math.round(xpInLevel)} / {Math.round(xpNeeded)} XP
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--accent-cyan)',
            boxShadow: '0 0 8px var(--accent-cyan)',
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Total XP: {user.totalXp.toLocaleString()}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Level {Math.round(currentLevel + 1)}
        </span>
      </div>
    </div>
  );
}
