import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { V } from '../lib/voice';
import type { StatKey } from '../lib/schemas';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ProfileRow } from '../lib/supabase';

const STAT_KEYS: StatKey[] = ['STR', 'AGI', 'VIT', 'INT', 'WIS', 'CHA'];

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const user = useStore((s) => s.user);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAllData = useStore((s) => s.resetAllData);
  const signOut = useStore((s) => s.signOut);
  const connectGist = useStore((s) => s.connectGist);
  const pushToGist = useStore((s) => s.pushToGist);
  const syncStatus = useStore((s) => s.syncStatus);
  const lastSyncedAt = useStore((s) => s.lastSyncedAt);
  const showArchivePrompt = useStore((s) => s.showArchivePrompt);
  const dismissArchivePrompt = useStore((s) => s.dismissArchivePrompt);
  const authSession = useStore((s) => s.authSession);
  const isAdmin = useStore((s) => s.isAdmin);

  const [confirmReset, setConfirmReset] = useState(false);
  const [showPat, setShowPat] = useState(false);
  const [patInput, setPatInput] = useState('');
  const [hunters, setHunters] = useState<ProfileRow[]>([]);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured) return;
    supabase.from('profiles').select('*').order('player_level', { ascending: false })
      .then(({ data }) => { if (data) setHunters(data as ProfileRow[]); });
  }, [isAdmin]);

  const handleExportHunterContext = async (p: ProfileRow) => {
    setExportingId(p.id);
    const exportPack = {
      version: '1.0',
      state: {
        date: new Date().toISOString().slice(0, 10),
        rank: p.rank,
        playerLevel: p.player_level,
        stats: p.stats,
        streak: p.streak,
        hunterPath: p.hunter_path,
        gender: p.gender,
        focusAreas: p.focus_areas ?? [],
        avoidances: p.avoidances ?? [],
        lastSevenDays: [],
        story: { currentChapter: p.current_chapter, lastBeats: [] },
        rules: { dailyQuestCount: 5, shadowQuestEvery: 3, weeklyQuestCount: 1, minStatsCovered: 4 },
      },
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportPack, null, 2));
    } catch {
      // Clipboard may be blocked; silently skip
    }
    setExportingId(null);
  };

  if (!settings || !user) return null;

  const handleRolloverHour = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 23) updateSettings({ rolloverHour: v });
  };

  const handleToggleFocus = (stat: StatKey) => {
    const current = settings.focusAreas;
    const next = current.includes(stat)
      ? current.filter((s) => s !== stat)
      : [...current, stat];
    updateSettings({ focusAreas: next });
  };

  const handleSavePat = async () => {
    if (!patInput.trim()) return;
    await connectGist(patInput.trim());
    setPatInput('');
    setShowPat(false);
  };

  const handleRevokePat = () => {
    updateSettings({ githubToken: undefined, gistId: undefined });
  };

  const syncLabel = syncStatus === 'syncing'
    ? 'Binding…'
    : lastSyncedAt
    ? `Bound ${new Date(lastSyncedAt).toLocaleString()}`
    : 'Not yet bound';

  const restDaysRemaining = user.restDaysRemaining ?? 2;

  return (
    <div>
      <h1
        className="text-lg font-medium mb-5"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}
      >
        {V.codexTitle}
      </h1>

      {/* Rest tokens */}
      <SectionHeader>{V.restSection}</SectionHeader>
      <div
        className="rounded-lg px-4 py-3 mb-5 flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {V.restTokens(restDaysRemaining)}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Resets Monday</span>
      </div>

      {/* Archive prompt */}
      {showArchivePrompt && (
        <div
          className="rounded-lg p-4 mb-5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent-gold)' }}
        >
          <p className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>{V.archivePrompt}</p>
          <div className="flex gap-2">
            <button
              onClick={dismissArchivePrompt}
              className="flex-1 py-1.5 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              Not now
            </button>
            <button
              onClick={() => { dismissArchivePrompt(); setShowPat(true); }}
              className="flex-1 py-1.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-gold)', color: 'var(--text-on-gold)' }}
            >
              {V.bindToCloud}
            </button>
          </div>
        </div>
      )}

      {/* Quest rules */}
      <SectionHeader>{V.questRulesSection}</SectionHeader>
      <div className="flex flex-col gap-1.5 mb-5">
        <NumberRow
          label="Weekly quest count"
          value={settings.weeklyQuestCount}
          min={0} max={4}
          onChange={(v) => updateSettings({ weeklyQuestCount: v })}
        />
        <NumberRow
          label="Shadow trial every N days"
          value={settings.shadowQuestEvery}
          min={1} max={14}
          onChange={(v) => updateSettings({ shadowQuestEvery: v })}
        />
        <NumberRow
          label="Min stats covered"
          value={settings.minStatsCovered}
          min={1} max={6}
          onChange={(v) => updateSettings({ minStatsCovered: v })}
        />
        <NumberRow
          label="Rollover hour (0–23)"
          value={settings.rolloverHour}
          min={0} max={23}
          onChange={(v) => updateSettings({ rolloverHour: v })}
          onBlur={handleRolloverHour}
        />
      </div>

      {/* Focus areas */}
      <SectionHeader>{V.focusAreasSection}</SectionHeader>
      <div className="flex flex-wrap gap-2 mb-5">
        {STAT_KEYS.map((stat) => {
          const active = settings.focusAreas.includes(stat);
          return (
            <button
              key={stat}
              onClick={() => handleToggleFocus(stat)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent-gold)' : 'var(--bg-elevated)',
                color: active ? 'var(--text-on-gold)' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                fontFamily: 'var(--font-numeric)',
              }}
            >
              {stat}
            </button>
          );
        })}
      </div>

      {/* Chronicle sync */}
      <SectionHeader>{V.syncSection}</SectionHeader>
      <div
        className="rounded-lg p-4 mb-5"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        {settings.githubToken ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {settings.gistId ? 'Chronicle bound' : 'PAT saved — no chronicle yet'}
              </span>
              <span
                className="text-xs"
                style={{ color: syncStatus === 'error' ? 'var(--accent-ember)' : 'var(--text-tertiary)' }}
              >
                {syncStatus === 'error' ? 'Bind failed' : syncLabel}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => pushToGist()}
                disabled={syncStatus === 'syncing'}
                className="flex-1 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: syncStatus === 'syncing' ? 'var(--text-tertiary)' : 'var(--accent-gold)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {syncStatus === 'syncing' ? 'Binding…' : 'Bind now'}
              </button>
              <button
                onClick={handleRevokePat}
                className="flex-1 py-1.5 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-ember)', border: '1px solid var(--border-subtle)' }}
              >
                Revoke and clear
              </button>
            </div>
          </div>
        ) : showPat ? (
          <div className="flex flex-col gap-2">
            <input
              type="password"
              placeholder="ghp_… (gist scope required)"
              value={patInput}
              onChange={(e) => setPatInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowPat(false)} className="flex-1 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleSavePat} className="flex-1 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--accent-gold)', color: 'var(--text-on-gold)' }}>
                Save PAT
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPat(true)}
            className="w-full py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            + Add GitHub PAT
          </button>
        )}
      </div>

      {/* Account */}
      <SectionHeader>{V.accountSection}</SectionHeader>
      <div className="flex flex-col gap-1.5 mb-5">
        <InfoRow label="Name" value={user.name} />
        <InfoRow label="Climbing since" value={new Date(user.startedAt).toLocaleDateString()} />
        <InfoRow label="Level" value={String(user.playerLevel)} />
      </div>

      {/* Leave the Tower */}
      {authSession && (
        <>
          <SectionHeader>Session</SectionHeader>
          <button
            onClick={() => signOut()}
            className="w-full py-3 rounded-lg text-sm font-medium mb-5"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.06em',
            }}
          >
            {V.leaveTheTower}
          </button>
        </>
      )}

      {/* Quest Master tools — admin only */}
      {isAdmin && (
        <>
          <SectionHeader>Quest Master tools</SectionHeader>
          <div className="flex flex-col gap-2 mb-5">
            {hunters.map((p) => (
              <div
                key={p.id}
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {p.player_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
                    {p.rank}-rank · Lv {p.player_level} · Streak {p.streak}d
                  </p>
                </div>
                <button
                  onClick={() => handleExportHunterContext(p)}
                  disabled={exportingId === p.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--accent-gold)',
                    border: '1px solid var(--border-strong)',
                    opacity: exportingId === p.id ? 0.5 : 1,
                  }}
                >
                  {exportingId === p.id ? 'Copying…' : 'Export context'}
                </button>
              </div>
            ))}
            {hunters.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No hunters found.</p>
            )}
          </div>
        </>
      )}

      {/* Danger zone */}
      <SectionHeader>{V.dangerSection}</SectionHeader>
      {!confirmReset ? (
        <button
          onClick={() => setConfirmReset(true)}
          className="w-full py-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-ember)', border: '1px solid var(--accent-ember)' }}
        >
          {V.resetAllData}
        </button>
      ) : (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent-ember)' }}>
          <p className="text-sm mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
            {V.resetConfirmMsg}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmReset(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={async () => { await resetAllData(); setConfirmReset(false); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-ember)', color: '#F4EDDA' }}
            >
              {V.resetConfirmYes}
            </button>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium mb-2 mt-1 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-4 py-3"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{value}</span>
    </div>
  );
}

interface NumberRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

function NumberRow({ label, value, min, max, onChange }: NumberRowProps) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-4 py-3"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-md flex items-center justify-center text-base leading-none"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          −
        </button>
        <span className="text-sm font-medium w-5 text-center" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-numeric)' }}>
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-md flex items-center justify-center text-base leading-none"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          +
        </button>
      </div>
    </div>
  );
}
