import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useStore } from '../lib/store';
import { V } from '../lib/voice';
import StatGrid from '../components/stats/StatGrid';
import XPBar from '../components/stats/XPBar';
import { getEffectiveDay } from '../lib/time';
import type { StatKey } from '../lib/schemas';

// Match the new earth-tone stat palette from tokens.css
const STAT_COLORS: Record<StatKey, string> = {
  STR: '#C9663C',
  AGI: '#8FA68A',
  VIT: '#B8A05B',
  INT: '#6B7FA0',
  WIS: '#9D7BA8',
  CHA: '#C49080',
};
const STAT_KEYS: StatKey[] = ['STR', 'AGI', 'VIT', 'INT', 'WIS', 'CHA'];

export default function Stats() {
  const user = useStore((s) => s.user);
  const settings = useStore((s) => s.settings);
  const statHistory = useStore((s) => s.statHistory);
  const completions = useStore((s) => s.completions);
  const quests = useStore((s) => s.quests);

  const rolloverHour = settings?.rolloverHour ?? 4;

  const chartData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) =>
      getEffectiveDay(new Date(Date.now() - (29 - i) * 86400000), rolloverHour)
    );
    const map: Record<string, Record<string, number>> = {};
    for (const row of statHistory) {
      if (!map[row.day]) map[row.day] = {};
      map[row.day][row.stat] = row.value;
    }
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
      <h1
        className="text-lg font-medium mb-4"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}
      >
        {V.hunterRecord}
      </h1>

      <XPBar />
      <StatGrid />

      {/* Rank + streak summary */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{V.rankLabel}</p>
          <p className="font-medium" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.08em' }}>{user.rank}</p>
        </div>
        <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{V.streakLabel}</p>
          <p className="font-medium" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-numeric)', fontSize: 28 }}>{Math.round(user.streak)}</p>
        </div>
        <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{V.totalXpLabel}</p>
          <p className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-numeric)', fontSize: 20 }}>{user.totalXp.toLocaleString()}</p>
        </div>
      </div>

      {/* Stat progression chart */}
      <section className="mb-6">
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          {V.statLevels30}
        </h2>
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: 'rgba(232,220,196,0.4)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fill: 'rgba(232,220,196,0.4)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2B1F15',
                  border: '0.5px solid rgba(212,165,83,0.28)',
                  borderRadius: 8,
                  color: '#E8DCC4',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'rgba(232,220,196,0.65)', marginBottom: 4 }}
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
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
            {STAT_KEYS.map((k) => (
              <span key={k} className="flex items-center gap-1 text-xs" style={{ color: 'rgba(232,220,196,0.4)' }}>
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
            {V.completionsByTag}
          </h2>
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
          >
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={tagData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <XAxis dataKey="tag" tick={{ fill: 'rgba(232,220,196,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(232,220,196,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2B1F15',
                    border: '0.5px solid rgba(212,165,83,0.28)',
                    borderRadius: 8,
                    color: '#E8DCC4',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {tagData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${30 + (i * 40) % 120}, 55%, 55%)`} />
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
