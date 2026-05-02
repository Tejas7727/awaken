import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore } from '../lib/store';
import { getEffectiveDay } from '../lib/time';

export default function Progress() {
  const completions = useStore((s) => s.completions);
  const quests = useStore((s) => s.quests);
  const settings = useStore((s) => s.settings);

  const rolloverHour = settings?.rolloverHour ?? 4;

  // 7-day bar chart data
  const weekData = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = getEffectiveDay(new Date(Date.now() - (6 - i) * 86400000), rolloverHour);
      const count = completions.filter((c) => c.effectiveDay === d).length;
      return { day: d.slice(5), count };
    }),
    [completions, rolloverHour]
  );

  // 90-day heatmap
  const heatmapDays = useMemo(() => {
    const countByDay: Record<string, number> = {};
    for (const c of completions) {
      countByDay[c.effectiveDay] = (countByDay[c.effectiveDay] ?? 0) + 1;
    }
    const maxCount = Math.max(1, ...Object.values(countByDay));
    return Array.from({ length: 90 }, (_, i) => {
      const d = getEffectiveDay(new Date(Date.now() - (89 - i) * 86400000), rolloverHour);
      const count = countByDay[d] ?? 0;
      return { day: d, count, intensity: count / maxCount };
    });
  }, [completions, rolloverHour]);

  // Top 5 quests by completion count
  const topQuests = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of completions) counts[c.questId] = (counts[c.questId] ?? 0) + 1;
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([questId, count]) => ({
        questId,
        count,
        title: quests.find((q) => q.id === questId)?.title ?? questId,
      }));
  }, [completions, quests]);

  const totalCompletions = completions.length;
  const activeDays = new Set(completions.map((c) => c.effectiveDay)).size;

  return (
    <div>
      <h1 className="text-lg font-medium font-display mb-4" style={{ color: 'var(--text-primary)' }}>
        Progress
      </h1>

      {/* Summary pills */}
      <div className="flex gap-2 mb-5">
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Completions</p>
          <p className="text-xl font-medium font-display" style={{ color: 'var(--accent-cyan)' }}>{totalCompletions.toLocaleString()}</p>
        </div>
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Active days</p>
          <p className="text-xl font-medium font-display" style={{ color: 'var(--accent-gold)' }}>{activeDays}</p>
        </div>
      </div>

      {/* 7-day bar chart */}
      <section className="mb-5">
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Last 7 days
        </h2>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weekData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {weekData.map((d, i) => (
                  <Cell key={i} fill={d.count > 0 ? 'var(--accent-cyan)' : 'var(--bg-elevated)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 90-day heatmap */}
      <section className="mb-5">
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          90-day heatmap
        </h2>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex flex-wrap gap-0.5">
            {heatmapDays.map(({ day, count, intensity }) => (
              <div
                key={day}
                title={`${day}: ${count} completion${count !== 1 ? 's' : ''}`}
                className="rounded-sm"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: count === 0
                    ? 'var(--bg-elevated)'
                    : `rgba(77,233,255,${0.15 + intensity * 0.85})`,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-2 justify-end">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Less</span>
            {[0.15, 0.35, 0.55, 0.75, 1].map((v) => (
              <div key={v} className="rounded-sm" style={{ width: 10, height: 10, backgroundColor: `rgba(77,233,255,${v})` }} />
            ))}
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>More</span>
          </div>
        </div>
      </section>

      {/* Top 5 quests */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Top quests
        </h2>
        {topQuests.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
            Complete quests to see rankings here.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {topQuests.map(({ questId, count, title }, idx) => (
              <div
                key={questId}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-sm font-medium font-display w-5 text-center" style={{ color: 'var(--text-tertiary)' }}>
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{title}</span>
                <span className="text-sm font-medium font-display" style={{ color: 'var(--accent-cyan)' }}>
                  {count}×
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
