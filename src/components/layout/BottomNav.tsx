import { NavLink } from 'react-router-dom';
import { V } from '../../lib/voice';

const NAV_ITEMS = [
  { to: '/',         label: V.navHome,     icon: '⌂' },
  { to: '/quests',   label: V.navQuests,   icon: '⚔' },
  { to: '/stats',    label: V.navStats,    icon: '◈' },
  { to: '/story',    label: V.navStory,    icon: '📖' },
  { to: '/progress', label: V.navProgress, icon: '▦' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto flex items-center justify-around h-16 px-2"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '0.5px solid var(--border-subtle)',
      }}
    >
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'text-[var(--accent-gold)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`
          }
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <span className="text-lg leading-none">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
