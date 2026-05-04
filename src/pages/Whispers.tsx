import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { V } from '../lib/voice';
import type { WhisperRow } from '../lib/supabase';

const KIND_LABEL: Record<WhisperRow['kind'], string> = {
  system: V.whisperKindSystem,
  peer:   V.whisperKindPeer,
  admin:  V.whisperKindAdmin,
};

const KIND_COLOR: Record<WhisperRow['kind'], string> = {
  system: 'var(--accent-gold)',
  peer:   'var(--text-secondary)',
  admin:  'var(--accent-ember)',
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Whispers() {
  const whispers = useStore((s) => s.whispers);
  const loadWhispers = useStore((s) => s.loadWhispers);
  const markWhisperRead = useStore((s) => s.markWhisperRead);
  const subscribeWhispers = useStore((s) => s.subscribeWhispers);

  useEffect(() => {
    loadWhispers();
    const unsub = subscribeWhispers();
    return unsub;
  }, [loadWhispers, subscribeWhispers]);

  useEffect(() => {
    // Mark all unread as read after 1.5 s of viewing
    const timer = setTimeout(() => {
      whispers.filter((w) => !w.read_at).forEach((w) => markWhisperRead(w.id));
    }, 1500);
    return () => clearTimeout(timer);
  }, [whispers, markWhisperRead]);

  return (
    <div>
      <h1
        className="text-lg font-medium mb-4"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}
      >
        {V.whispersTitle}
      </h1>

      {whispers.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
          {V.whispersEmpty}
        </p>
      )}

      <AnimatePresence initial={false}>
        {whispers.map((w) => (
          <motion.div
            key={w.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-3 rounded-lg p-4 relative"
            style={{
              backgroundColor: w.read_at ? 'var(--bg-surface)' : 'var(--bg-elevated)',
              border: `1px solid ${w.read_at ? 'var(--border-subtle)' : 'var(--border-strong)'}`,
            }}
          >
            {!w.read_at && (
              <span
                className="absolute top-3 right-3 w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--accent-gold)' }}
              />
            )}
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: KIND_COLOR[w.kind], fontFamily: 'var(--font-body)' }}
              >
                {KIND_LABEL[w.kind]}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {formatRelative(w.created_at)}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              {w.body}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
