import { useState } from 'react';
import { useStore } from '../lib/store';
import QuestList from '../components/quest/QuestList';
import ImportPanel from '../components/quest/ImportPanel';
import type { Quest, StatKey } from '../lib/schemas';

const GROUPS: Array<{ type: Quest['type']; label: string }> = [
  { type: 'daily',  label: 'Daily' },
  { type: 'shadow', label: 'Shadow' },
  { type: 'weekly', label: 'Weekly' },
  { type: 'side',   label: 'Side' },
  { type: 'boss',   label: 'Boss' },
];

const STAT_KEYS: StatKey[] = ['STR', 'AGI', 'VIT', 'INT', 'WIS', 'CHA'];

export default function Quests() {
  const quests = useStore((s) => s.quests);
  const addSideQuest = useStore((s) => s.addSideQuest);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium font-display" style={{ color: 'var(--text-primary)' }}>
          Quests
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm px-3 py-1.5 rounded-lg font-medium"
          style={{
            backgroundColor: showForm ? 'var(--bg-elevated)' : 'var(--accent-cyan)',
            color: showForm ? 'var(--text-secondary)' : 'var(--bg-base)',
          }}
        >
          {showForm ? 'Cancel' : '+ Side quest'}
        </button>
      </div>

      {showForm && (
        <SideQuestForm
          onAdd={async (title, stats, xp, tags) => {
            await addSideQuest(title, stats, xp, tags);
            setShowForm(false);
          }}
        />
      )}

      <ImportPanel />

      <div className="mt-4">
        {GROUPS.map(({ type, label }) => {
          const group = quests.filter((q) => q.type === type);
          if (group.length === 0) return null;
          return (
            <section key={type} className="mb-5">
              <h2 className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                {label} ({group.length})
              </h2>
              <QuestList quests={group} />
            </section>
          );
        })}
        {quests.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            No quests yet. Import from LLM or add a side quest.
          </p>
        )}
      </div>
    </div>
  );
}

interface SideQuestFormProps {
  onAdd: (title: string, stats: Record<string, number>, xp: number, tags: string[]) => Promise<void>;
}

function SideQuestForm({ onAdd }: SideQuestFormProps) {
  const [title, setTitle] = useState('');
  const [xp, setXp] = useState(20);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tagsRaw, setTagsRaw] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStatChange = (stat: string, val: string) => {
    const n = parseInt(val, 10);
    setStats((prev) => ({ ...prev, [stat]: isNaN(n) ? 0 : Math.min(200, Math.max(0, n)) }));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (xp < 1 || xp > 500) { setError('XP must be between 1 and 500.'); return; }
    const hasStats = Object.values(stats).some((v) => v > 0);
    if (!hasStats) { setError('Add at least one stat point.'); return; }
    setError('');
    setSaving(true);
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    await onAdd(title.trim(), stats, xp, tags);
    setSaving(false);
  };

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <p className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
        New side quest
      </p>

      <input
        className="w-full px-3 py-2 rounded-lg text-sm mb-2 focus:outline-none"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
        placeholder="Quest title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />

      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {STAT_KEYS.map((stat) => (
          <div key={stat} className="flex items-center gap-1.5">
            <span className="text-xs w-8" style={{ color: 'var(--text-tertiary)' }}>{stat}</span>
            <input
              type="number"
              min={0} max={200}
              className="flex-1 px-2 py-1 rounded text-xs focus:outline-none text-right"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              value={stats[stat] ?? 0}
              onChange={(e) => handleStatChange(stat, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>XP</span>
          <input
            type="number"
            min={1} max={500}
            className="flex-1 px-2 py-1 rounded text-xs focus:outline-none"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            value={xp}
            onChange={(e) => setXp(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tags</span>
          <input
            className="flex-1 px-2 py-1 rounded text-xs focus:outline-none"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            placeholder="comma, separated"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-xs mb-2" style={{ color: 'var(--accent-magenta)' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-2 rounded-lg text-sm font-medium"
        style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-base)' }}
      >
        {saving ? 'Adding…' : 'Add quest'}
      </button>
    </div>
  );
}
