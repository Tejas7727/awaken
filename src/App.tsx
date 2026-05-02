import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './lib/store';
import { isSupabaseConfigured } from './lib/supabase';
import AppShell from './components/layout/AppShell';
import LevelUpModal from './components/LevelUpModal';
import SyncBanner from './components/SyncBanner';
import ColdOpen from './components/intro/ColdOpen';
import Migrate from './pages/Migrate';
import Home from './pages/Home';
import Quests from './pages/Quests';
import Stats from './pages/Stats';
import Story from './pages/Story';
import Progress from './pages/Progress';
import Settings from './pages/Settings';

const reducedMotion = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const pageVariants = {
  initial: reducedMotion ? {} : { opacity: 0, y: 4 },
  animate: reducedMotion ? {} : { opacity: 1, y: 0 },
  exit:    reducedMotion ? {} : { opacity: 0, y: -4 },
};

const pageTransition = { duration: reducedMotion ? 0 : 0.2, ease: 'easeOut' };

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/story" element={<Story />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function Dashboard() {
  const runRolloverCheck = useStore((s) => s.runRolloverCheck);
  const toast = useStore((s) => s.toast);
  const dismissToast = useStore((s) => s.dismissToast);
  const pushToGist = useStore((s) => s.pushToGist);

  useEffect(() => {
    const id = setInterval(() => { runRolloverCheck(); }, 60_000);
    return () => clearInterval(id);
  }, [runRolloverCheck]);

  useEffect(() => {
    const handler = () => { pushToGist(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pushToGist]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <AppShell>
        <AnimatedRoutes />
      </AppShell>

      <LevelUpModal />
      <SyncBanner />

      {toast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50 cursor-pointer whitespace-nowrap"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
          }}
          onClick={dismissToast}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const initAuth = useStore((s) => s.initAuth);
  const init = useStore((s) => s.init);
  const authLoading = useStore((s) => s.authLoading);
  const authSession = useStore((s) => s.authSession);
  const isLegacyUser = useStore((s) => s.isLegacyUser);

  useEffect(() => {
    if (isSupabaseConfigured) {
      initAuth();
    } else {
      // Local-only mode (Supabase not configured) — skip auth gate
      init();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // While checking session — black screen
  if (isSupabaseConfigured && authLoading) {
    return <div className="fixed inset-0" style={{ backgroundColor: '#07090E' }} />;
  }

  // No session → cold open + login
  if (isSupabaseConfigured && !authSession) {
    return <ColdOpen />;
  }

  // Legacy local user who needs to create a cloud account
  if (isLegacyUser) {
    return <Migrate />;
  }

  // Authenticated (or Supabase not configured) → dashboard
  return <Dashboard />;
}
