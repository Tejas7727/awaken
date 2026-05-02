import { useStore } from '../lib/store';
import TopBar from '../components/layout/TopBar';
import XPBar from '../components/stats/XPBar';
import StatGrid from '../components/stats/StatGrid';
import TitleBadges from '../components/stats/TitleBadges';
import QuestList from '../components/quest/QuestList';
import ImportPanel from '../components/quest/ImportPanel';

export default function Home() {
  const quests = useStore((s) => s.quests);
  const exportDailyPack = useStore((s) => s.exportDailyPack);
  const loading = useStore((s) => s.loading);

  const todayQuests = quests.filter(
    (q) => q.type === 'daily' || q.type === 'shadow'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
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
        <h2 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Today's quests
        </h2>
        <QuestList
          quests={todayQuests}
          emptyMessage="No quests today — import from LLM or add one."
        />
      </section>

      <ImportPanel />

      <button
        onClick={exportDailyPack}
        className="w-full mt-4 py-3 rounded-xl text-sm font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          color: 'var(--accent-cyan)',
        }}
      >
        End day → export ↗
      </button>
    </div>
  );
}
