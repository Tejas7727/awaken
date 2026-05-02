import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',         label: 'Home',     icon: '⌂' },
  { to: '/quests',   label: 'Quests',   icon: '⚔' },
  { to: '/stats',    label: 'Stats',    icon: '◈' },
  { to: '/story',    label: 'Story',    icon: '📖' },
  { to: '/progress', label: 'Progress', icon: '▦' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto flex items-center justify-around h-16 px-2"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
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
                ? 'text-[var(--accent-cyan)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`
          }
        >
          <span className="text-lg leading-none">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
