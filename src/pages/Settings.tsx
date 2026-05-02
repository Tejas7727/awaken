import { useState } from 'react';
import { useStore } from '../lib/store';
import type { StatKey } from '../lib/schemas';

const STAT_KEYS: StatKey[] = ['STR', 'AGI', 'VIT', 'INT', 'WIS', 'CHA'];

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const user = useStore((s) => s.user);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAllData = useStore((s) => s.resetAllData);

  const connectGist = useStore((s) => s.connectGist);
  const pushToGist = useStore((s) => s.pushToGist);
  const syncStatus = useStore((s) => s.syncStatus);
  const lastSyncedAt = useStore((s) => s.lastSyncedAt);

  const [confirmReset, setConfirmReset] = useState(false);
  const [showPat, setShowPat] = useState(false);
  const [patInput, setPatInput] = useState('');

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
    ? 'Syncing…'
    : lastSyncedAt
    ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
    : 'Not yet synced';

  return (
    <div>
      <h1 className="text-lg font-medium font-display mb-5" style={{ color: 'var(--text-primary)' }}>
        Settings
      </h1>

      {/* Rules */}
      <SectionHeader>Quest rules</SectionHeader>
      <div className="flex flex-col gap-1.5 mb-5">
        <NumberRow
          label="Daily quest count"
          value={settings.dailyQuestCount}
          min={1} max={8}
          onChange={(v) => updateSettings({ dailyQuestCount: v })}
        />
        <NumberRow
          label="Weekly quest count"
          value={settings.weeklyQuestCount}
          min={0} max={4}
          onChange={(v) => updateSettings({ weeklyQuestCount: v })}
        />
        <NumberRow
          label="Shadow quest every N days"
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
      <SectionHeader>Focus areas</SectionHeader>
      <div className="flex flex-wrap gap-2 mb-5">
        {STAT_KEYS.map((stat) => {
          const active = settings.focusAreas.includes(stat);
          return (
            <button
              key={stat}
              onClick={() => handleToggleFocus(stat)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                color: active ? 'var(--bg-base)' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
              }}
            >
              {stat}
            </button>
          );
        })}
      </div>

      {/* Theme accent */}
      <SectionHeader>Theme accent</SectionHeader>
      <div className="flex gap-2 mb-5">
        {(['cyan', 'magenta', 'gold'] as const).map((accent) => {
          const active = settings.themeAccent === accent;
          const color = accent === 'cyan' ? 'var(--accent-cyan)' : accent === 'magenta' ? 'var(--accent-magenta)' : 'var(--accent-gold)';
          return (
            <button
              key={accent}
              onClick={() => updateSettings({ themeAccent: accent })}
              className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
              style={{
                backgroundColor: active ? color : 'var(--bg-elevated)',
                color: active ? 'var(--bg-base)' : color,
                border: `1px solid ${color}`,
              }}
            >
              {accent}
            </button>
          );
        })}
      </div>

      {/* GitHub PAT */}
      <SectionHeader>GitHub sync</SectionHeader>
      <div
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        {settings.githubToken ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {settings.gistId ? 'Gist linked' : 'PAT saved — no gist yet'}
              </span>
              <span
                className="text-xs"
                style={{ color: syncStatus === 'error' ? 'var(--accent-magenta)' : 'var(--text-tertiary)' }}
              >
                {syncStatus === 'error' ? 'Sync error' : syncLabel}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => pushToGist()}
                disabled={syncStatus === 'syncing'}
                className="flex-1 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: syncStatus === 'syncing' ? 'var(--text-tertiary)' : 'var(--accent-cyan)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={handleRevokePat}
                className="flex-1 py-1.5 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-magenta)', border: '1px solid var(--border-subtle)' }}
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
              <button onClick={handleSavePat} className="flex-1 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-base)' }}>
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

      {/* Account info */}
      <SectionHeader>Account</SectionHeader>
      <div className="flex flex-col gap-1.5 mb-5">
        <InfoRow label="Name" value={user.name} />
        <InfoRow label="Started" value={new Date(user.startedAt).toLocaleDateString()} />
        <InfoRow label="Player level" value={String(user.playerLevel)} />
      </div>

      {/* Danger zone */}
      <SectionHeader>Danger zone</SectionHeader>
      {!confirmReset ? (
        <button
          onClick={() => setConfirmReset(true)}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-magenta)', border: '1px solid var(--accent-magenta)' }}
        >
          Reset all data
        </button>
      ) : (
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent-magenta)' }}>
          <p className="text-sm mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
            This will delete all progress and re-seed the app. Are you sure?
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
              style={{ backgroundColor: 'var(--accent-magenta)', color: 'var(--bg-base)' }}
            >
              Yes, reset everything
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
    <p className="text-xs font-medium mb-2 mt-1 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm font-medium font-display" style={{ color: 'var(--text-primary)' }}>{value}</span>
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
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-md flex items-center justify-center text-base leading-none"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          −
        </button>
        <span className="text-sm font-medium font-display w-5 text-center" style={{ color: 'var(--text-primary)' }}>
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
