import { useStore } from '../../lib/store';
import { V } from '../../lib/voice';
import { rankLabel } from '../../lib/progression';

export default function TopBar() {
  const user = useStore((s) => s.user);

  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
          {V.welcomeBack}
        </p>
        <h1 className="text-lg font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
          {user?.name ?? 'Awakened'}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-bright))',
                color: 'var(--text-on-gold)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.08em',
                fontSize: 13,
              }}
            >
              {user.rank}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-subtle)',
                color: 'var(--accent-gold)',
                fontFamily: 'var(--font-numeric)',
              }}
            >
              {Math.round(user.streak)}d
            </span>
          </>
        )}
      </div>
    </div>
  );
}
