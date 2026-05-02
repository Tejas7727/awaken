import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useStore } from '../lib/store';
import StatGrid from '../components/stats/StatGrid';
import XPBar from '../components/stats/XPBar';
import { getEffectiveDay } from '../lib/time';
import type { StatKey } from '../lib/schemas';

const STAT_COLORS: Record<StatKey, string> = {
  STR: '#FF8C6B',
  AGI: '#4DE9C5',
  VIT: '#6BFF8C',
  INT: '#6B8CFF',
  WIS: '#B86BFF',
  CHA: '#FF6BB8',
};
const STAT_KEYS: StatKey[] = ['STR', 'AGI', 'VIT', 'INT', 'WIS', 'CHA'];

export default function Stats() {
  const user = useStore((s) => s.user);
  const settings = useStore((s) => s.settings);
  const statHistory = useStore((s) => s.statHistory);
  const completions = useStore((s) => s.completions);
  const quests = useStore((s) => s.quests);

  const rolloverHour = settings?.rolloverHour ?? 4;

  // Build last-30-days line chart data — one point per day per stat
  const chartData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) =>
      getEffectiveDay(new Date(Date.now() - (29 - i) * 86400000), rolloverHour)
    );
    // Build a map: day → stat → value
    const map: Record<string, Record<string, number>> = {};
    for (const row of statHistory) {
      if (!map[row.day]) map[row.day] = {};
      map[row.day][row.stat] = row.value;
    }
    // Forward-fill from last known value
    const lastKnown: Record<string, number> = {};
    if (user) {
      for (const k of STAT_KEYS) lastKnown[k] = user.stats[k] ?? 1;
    }
    return days.map((day) => {
      const entry: Record<string, number | string> = { day: day.slice(5) };
      for (const k of STAT_KEYS) {
        if (map[day]?.[k] !== undefined) {
          lastKnown[k] = map[day][k];
        }
        entry[k] = lastKnown[k] ?? 1;
      }
      return entry;
    });
  }, [statHistory, rolloverHour, user]);

  // Tag contribution bar chart
  const tagData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of completions) {
      const q = quests.find((qq) => qq.id === c.questId);
      if (q) {
        for (const tag of q.tags) {
          counts[tag] = (counts[tag] ?? 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  }, [completions, quests]);

  if (!user) return null;

  return (
    <div>
      <h1 className="text-lg font-medium font-display mb-4" style={{ color: 'var(--text-primary)' }}>
        Stats
      </h1>

      <XPBar />
      <StatGrid />

      {/* Rank + streak summary */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Rank</p>
          <p className="text-2xl font-medium font-display" style={{ color: 'var(--accent-cyan)' }}>{user.rank}</p>
        </div>
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Streak</p>
          <p className="text-2xl font-medium font-display" style={{ color: 'var(--accent-gold)' }}>{Math.round(user.streak)}</p>
        </div>
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Total XP</p>
          <p className="text-xl font-medium font-display" style={{ color: 'var(--text-primary)' }}>{user.totalXp.toLocaleString()}</p>
        </div>
      </div>

      {/* Stat progression chart */}
      <section className="mb-6">
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Stat levels — last 30 days
        </h2>
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
              />
              {STAT_KEYS.map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={STAT_COLORS[k]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
            {STAT_KEYS.map((k) => (
              <span key={k} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: STAT_COLORS[k] }} />
                {k}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tag contributions */}
      {tagData.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Completions by tag
          </h2>
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={tagData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <XAxis dataKey="tag" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {tagData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${(i * 47) % 360}, 70%, 65%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {tagData.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
          Complete quests to see tag breakdown here.
        </p>
      )}
    </div>
  );
}
