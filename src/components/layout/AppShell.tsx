import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { V } from '../../lib/voice';
import { useStore } from '../../lib/store';
import BottomNav from './BottomNav';

const NAV_ITEMS = [
  { to: '/',         label: V.navHome,      end: true  },
  { to: '/quests',   label: V.navQuests,    end: false },
  { to: '/stats',    label: V.navStats,     end: false },
  { to: '/story',    label: V.navStory,     end: false },
  { to: '/tower',    label: V.navTower,     end: false },
  { to: '/progress', label: V.navProgress,  end: false },
];

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const unreadWhisperCount = useStore((s) => s.unreadWhisperCount);

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-30 flex items-center h-12 px-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '0.5px solid var(--border-subtle)',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          className="text-sm font-medium mr-6 flex-shrink-0"
          style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}
        >
          {V.brand}
        </Link>

        {/* Desktop top tabs */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--accent-gold)] bg-[var(--bg-elevated)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`
              }
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1 md:hidden" />

        {/* Bell icon — whispers */}
        <Link
          to="/whispers"
          title={V.navWhispers}
          aria-label={V.navWhispers}
          className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--bg-elevated)] mr-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8 1.33a4.67 4.67 0 0 1 4.67 4.67c0 2.57.55 4.08 1.04 5H2.29c.49-.92 1.04-2.43 1.04-5A4.67 4.67 0 0 1 8 1.33Z"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
            />
            <path d="M6.33 11v.33a1.67 1.67 0 0 0 3.34 0V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {unreadWhisperCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ backgroundColor: 'var(--accent-gold)', color: 'var(--text-on-gold)' }}
            >
              {unreadWhisperCount > 9 ? '9+' : unreadWhisperCount}
            </span>
          )}
        </Link>

        {/* Codex icon */}
        <Link
          to="/settings"
          title={V.navSettings}
          aria-label={V.navSettings}
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

      <main className="flex-1 w-full max-w-lg md:max-w-2xl mx-auto px-4 pt-4 pb-24 md:pb-8">
        {children}
      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
