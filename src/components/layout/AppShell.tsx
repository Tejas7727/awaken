import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import BottomNav from './BottomNav';

const NAV_ITEMS = [
  { to: '/',         label: 'Home',     end: true  },
  { to: '/quests',   label: 'Quests',   end: false },
  { to: '/stats',    label: 'Stats',    end: false },
  { to: '/story',    label: 'Story',    end: false },
  { to: '/progress', label: 'Progress', end: false },
];

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Persistent shell header — visible at all widths */}
      <header
        className="sticky top-0 z-30 flex items-center h-12 px-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          className="text-sm font-medium font-display mr-6 flex-shrink-0"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Awaken
        </Link>

        {/* Desktop top tabs — hidden below md */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--accent-cyan)] bg-[var(--bg-elevated)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Spacer on mobile so gear stays right */}
        <div className="flex-1 md:hidden" />

        {/* Gear icon — always visible, right side */}
        <Link
          to="/settings"
          title="Settings"
          aria-label="Settings"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
            <path
              d="M13.3 9.87a1.1 1.1 0 0 0 .22 1.21l.04.04a1.33 1.33 0 0 1-1.88 1.88l-.04-.04a1.1 1.1 0 0 0-1.21-.22 1.1 1.1 0 0 0-.67 1.01V14a1.33 1.33 0 1 1-2.67 0v-.06a1.1 1.1 0 0 0-.72-1.01 1.1 1.1 0 0 0-1.21.22l-.04.04a1.33 1.33 0 0 1-1.88-1.88l.04-.04a1.1 1.1 0 0 0 .22-1.21 1.1 1.1 0 0 0-1.01-.67H2a1.33 1.33 0 1 1 0-2.67h.06a1.1 1.1 0 0 0 1.01-.72 1.1 1.1 0 0 0-.22-1.21l-.04-.04a1.33 1.33 0 0 1 1.88-1.88l.04.04a1.1 1.1 0 0 0 1.21.22h.05a1.1 1.1 0 0 0 .67-1.01V2a1.33 1.33 0 1 1 2.67 0v.06a1.1 1.1 0 0 0 .67 1.01 1.1 1.1 0 0 0 1.21-.22l.04-.04a1.33 1.33 0 0 1 1.88 1.88l-.04.04a1.1 1.1 0 0 0-.22 1.21v.05a1.1 1.1 0 0 0 1.01.67H14a1.33 1.33 0 1 1 0 2.67h-.06a1.1 1.1 0 0 0-1.01.67Z"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </Link>
      </header>

      {/* Page content */}
      <main className="flex-1 w-full max-w-lg md:max-w-2xl mx-auto px-4 pt-4 pb-24 md:pb-8">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
