import { useStore } from '../lib/store';
import { fetchGist } from '../lib/github';

export default function SyncBanner() {
  const syncBanner = useStore((s) => s.syncBanner);
  const dismissSyncBanner = useStore((s) => s.dismissSyncBanner);
  const applyGistSnapshot = useStore((s) => s.applyGistSnapshot);
  const settings = useStore((s) => s.settings);
  const syncStatus = useStore((s) => s.syncStatus);

  if (!syncBanner) return null;

  const handleLoad = async () => {
    if (!settings?.githubToken || !settings?.gistId) return;
    const result = await fetchGist(settings.githubToken, settings.gistId);
    if (result) await applyGistSnapshot(result.snapshot);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm max-w-sm w-[calc(100%-2rem)]"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        color: 'var(--text-primary)',
      }}
    >
      <span className="flex-1" style={{ color: 'var(--text-secondary)' }}>{syncBanner}</span>
      <button
        onClick={handleLoad}
        disabled={syncStatus === 'syncing'}
        className="text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0"
        style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-base)' }}
      >
        {syncStatus === 'syncing' ? 'Loading…' : 'Load'}
      </button>
      <button
        onClick={dismissSyncBanner}
        aria-label="Dismiss"
        className="flex-shrink-0"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ✕
      </button>
    </div>
  );
}
