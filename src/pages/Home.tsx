import { useState } from 'react';
import { useStore } from '../lib/store';
import { V } from '../lib/voice';
import TopBar from '../components/layout/TopBar';
import XPBar from '../components/stats/XPBar';
import StatGrid from '../components/stats/StatGrid';
import TitleBadges from '../components/stats/TitleBadges';
import QuestList from '../components/quest/QuestList';
import ImportPanel from '../components/quest/ImportPanel';

export default function Home() {
  const quests = useStore((s) => s.quests);
  const user = useStore((s) => s.user);
  const exportDailyPack = useStore((s) => s.exportDailyPack);
  const restDay = useStore((s) => s.restDay);
  const todayCompletedIds = useStore((s) => s.todayCompletedIds);
  const loading = useStore((s) => s.loading);
  const isAdmin = useStore((s) => s.isAdmin);

  const [restConfirm, setRestConfirm] = useState(false);

  const todayQuests = quests.filter((q) => q.type === 'daily' || q.type === 'shadow');
  const completedToday = todayQuests.filter((q) => todayCompletedIds.has(q.id)).length;
  const allDailysDone = todayQuests.length > 0 && completedToday === todayQuests.length;
  const restDaysRemaining = user?.restDaysRemaining ?? 0;
  const alreadyRested = todayCompletedIds.has('__rest__');
  const showRestButton = !allDailysDone && restDaysRemaining > 0 && !alreadyRested;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p style={{ color: 'var(--text-tertiary)' }}>{V.loading}</p>
      </div>
    );
  }

  return (
    <div>
      <TopBar />
      <XPBar />
      <StatGrid />
      <TitleBadges />

      <section className="mb-4">
        <h2
          className="text-xs font-medium mb-2 uppercase tracking-wide"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}
        >
          {V.trialsBeforeNightfall}
        </h2>
        <QuestList
          quests={todayQuests}
          emptyMessage={V.noTrials}
        />
      </section>

      {isAdmin && <ImportPanel />}

      {/* Rest-day button */}
      {showRestButton && !restConfirm && (
        <button
          onClick={() => setRestConfirm(true)}
          className="w-full mt-3 py-2.5 rounded-lg text-sm font-medium transition-opacity"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {V.restTheDay} — {V.restTokens(restDaysRemaining)}
        </button>
      )}

      {showRestButton && restConfirm && (
        <div
          className="mt-3 rounded-lg p-4"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}
        >
          <p className="text-sm mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
            {V.restConfirmMsg}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setRestConfirm(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {V.restConfirmNo}
            </button>
            <button
              onClick={async () => { setRestConfirm(false); await restDay(); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-gold)', color: 'var(--text-on-gold)' }}
            >
              {V.restConfirmYes}
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <button
          onClick={exportDailyPack}
          className="w-full mt-3 py-3 rounded-lg text-sm font-medium transition-opacity active:scale-95"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            color: 'var(--accent-gold)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {V.sealTheDay} → export ↗
        </button>
      )}
    </div>
  );
}
