import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './lib/store';
import { isSupabaseConfigured } from './lib/supabase';
import AppShell from './components/layout/AppShell';
import LevelUpModal from './components/LevelUpModal';
import SyncBanner from './components/SyncBanner';
import ColdOpen from './components/intro/ColdOpen';
import Migrate from './pages/Migrate';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Quests from './pages/Quests';
import Stats from './pages/Stats';
import Story from './pages/Story';
import Settings from './pages/Settings';
import Tower from './pages/Tower';
import Whispers from './pages/Whispers';

// Lazy-load recharts-heavy page to keep initial bundle under 350 KB gzipped
const Progress = lazy(() => import('./pages/Progress'));

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
          <Route path="/progress" element={<Suspense fallback={null}><Progress /></Suspense>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/tower" element={<Tower />} />
          <Route path="/whispers" element={<Whispers />} />
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
  const loadWhispers = useStore((s) => s.loadWhispers);

  useEffect(() => {
    loadWhispers();
  }, [loadWhispers]);

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
  const needsOnboarding = useStore((s) => s.needsOnboarding);

  useEffect(() => {
    if (isSupabaseConfigured) {
      initAuth();
    } else {
      init();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isSupabaseConfigured && authLoading) {
    return <div className="fixed inset-0" style={{ backgroundColor: '#07090E' }} />;
  }

  if (isSupabaseConfigured && !authSession) {
    return <ColdOpen />;
  }

  if (isLegacyUser) {
    return <Migrate />;
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return <Dashboard />;
}
