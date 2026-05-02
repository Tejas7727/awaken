import { useState } from 'react';
import { useStore } from '../../lib/store';
import type { LLMQuestImportPreview } from '../../lib/store';

export default function ImportPanel() {
  const [open, setOpen] = useState(false);
  const importJson = useStore((s) => s.importJson);
  const importError = useStore((s) => s.importError);
  const importPreview = useStore((s) => s.importPreview);
  const setImportJson = useStore((s) => s.setImportJson);
  const submitImport = useStore((s) => s.submitImport);
  const confirmImport = useStore((s) => s.confirmImport);
  const dismissImportPreview = useStore((s) => s.dismissImportPreview);

  if (importPreview) {
    return <PreviewModal preview={importPreview} onConfirm={confirmImport} onCancel={dismissImportPreview} />;
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span>Import from LLM</span>
        <span style={{ color: 'var(--text-tertiary)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <textarea
            className="w-full h-28 text-xs rounded-lg p-2 resize-none focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
            }}
            placeholder="Paste LLM JSON response here…"
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
          />
          {importError && (
            <p className="text-xs mt-1 mb-2" style={{ color: 'var(--accent-magenta)' }}>
              {importError}
            </p>
          )}
          <button
            className="w-full py-2 rounded-lg text-sm font-medium mt-1 transition-colors"
            style={{
              backgroundColor: 'var(--accent-cyan)',
              color: 'var(--bg-base)',
            }}
            onClick={submitImport}
            disabled={!importJson.trim()}
          >
            Preview import
          </button>
        </div>
      )}
    </div>
  );
}

interface PreviewModalProps {
  preview: LLMQuestImportPreview;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function PreviewModal({ preview, onConfirm, onCancel }: PreviewModalProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center px-4 pb-20"
      style={{ backgroundColor: 'rgba(7,9,14,0.85)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-4 max-h-[70vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Import preview
        </h3>

        <div className="mb-3">
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
            Quests ({preview.quests.length})
          </p>
          {preview.quests.map((q) => (
            <div
              key={q.id}
              className="mb-1.5 rounded-lg px-3 py-2"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {q.title}
              </span>
              <span className="text-xs ml-2" style={{ color: 'var(--accent-cyan)' }}>
                +{Math.round(q.xp)} XP
              </span>
            </div>
          ))}
        </div>

        {preview.storyBeat && (
          <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Story beat
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {preview.storyBeat}
            </p>
          </div>
        )}

        {preview.titleAward && (
          <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--accent-gold)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--accent-gold)' }}>
              Title: {preview.titleAward.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {preview.titleAward.reason}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-base)' }}
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? 'Importing…' : 'Confirm import'}
          </button>
        </div>
      </div>
    </div>
  );
}
