import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore } from '../lib/store';
import { V } from '../lib/voice';
import { getEffectiveDay } from '../lib/time';

export default function Progress() {
  const completions = useStore((s) => s.completions);
  const quests = useStore((s) => s.quests);
  const settings = useStore((s) => s.settings);

  const rolloverHour = settings?.rolloverHour ?? 4;

  const weekData = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = getEffectiveDay(new Date(Date.now() - (6 - i) * 86400000), rolloverHour);
      const count = completions.filter((c) => c.effectiveDay === d).length;
      return { day: d.slice(5), count };
    }),
    [completions, rolloverHour]
  );

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
      <h1
        className="text-lg font-medium mb-4"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}
      >
        {V.theAscent}
      </h1>

      {/* Summary pills */}
      <div className="flex gap-2 mb-5">
        <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{V.completionsLabel}</p>
          <p className="text-xl font-medium" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-numeric)' }}>{totalCompletions.toLocaleString()}</p>
        </div>
        <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{V.activeDaysLabel}</p>
          <p className="text-xl font-medium" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-numeric)' }}>{activeDays}</p>
        </div>
      </div>

      {/* 7-day bar chart */}
      <section className="mb-5">
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          {V.last7Days}
        </h2>
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weekData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="day" tick={{ fill: 'rgba(232,220,196,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(232,220,196,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2B1F15',
                  border: '0.5px solid rgba(212,165,83,0.28)',
                  borderRadius: 8,
                  color: '#E8DCC4',
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(212,165,83,0.06)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {weekData.map((d, i) => (
                  <Cell key={i} fill={d.count > 0 ? '#D4A553' : '#2B1F15'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 90-day heatmap */}
      <section className="mb-5">
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          {V.ninetyDayRecord}
        </h2>
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}>
          <div className="flex flex-wrap gap-0.5">
            {heatmapDays.map(({ day, count, intensity }) => (
              <div
                key={day}
                title={`${day}: ${count} trial${count !== 1 ? 's' : ''}`}
                className="rounded-sm"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: count === 0
                    ? '#2B1F15'
                    : `rgba(212,165,83,${0.18 + intensity * 0.82})`,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-2 justify-end">
            <span className="text-xs" style={{ color: 'rgba(232,220,196,0.4)' }}>Less</span>
            {[0.18, 0.38, 0.58, 0.78, 1].map((v) => (
              <div key={v} className="rounded-sm" style={{ width: 10, height: 10, backgroundColor: `rgba(212,165,83,${v})` }} />
            ))}
            <span className="text-xs" style={{ color: 'rgba(232,220,196,0.4)' }}>More</span>
          </div>
        </div>
      </section>

      {/* Top quests */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          {V.topTrials}
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
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
              >
                <span className="text-sm font-medium w-5 text-center" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-numeric)' }}>
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{title}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-numeric)' }}>
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
