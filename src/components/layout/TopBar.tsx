import { useStore } from '../../lib/store';

export default function TopBar() {
  const user = useStore((s) => s.user);

  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          Welcome back
        </p>
        <h1 className="text-lg font-medium font-display" style={{ color: 'var(--text-primary)' }}>
          {user?.name ?? 'Awakened'}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium font-display"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-cyan)',
              }}
            >
              Rank {user.rank}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-gold)',
              }}
            >
              🔥 {Math.round(user.streak)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
