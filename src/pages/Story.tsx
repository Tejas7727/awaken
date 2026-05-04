import { useState } from 'react';
import { useStore } from '../lib/store';
import { V } from '../lib/voice';
import { HUNTER_CHAPTERS, VANGUARD_CHAPTERS } from '../data/chapters';

export default function Story() {
  const stories = useStore((s) => s.stories);
  const user = useStore((s) => s.user);
  const cloudProfile = useStore((s) => s.cloudProfile);

  const defaultTrack = (cloudProfile?.hunterPath === 'vanguard' ? 'vanguard' : 'hunter') as 'hunter' | 'vanguard';
  const [track, setTrack] = useState<'hunter' | 'vanguard'>(defaultTrack);

  const chapters = track === 'vanguard' ? VANGUARD_CHAPTERS : HUNTER_CHAPTERS;

  const unlocked = stories.filter((s) => s.unlockedAt !== null);
  const locked = stories.filter((s) => s.unlockedAt === null);

  const byChapter = chapters.map((ch) => ({
    chapter: ch.chapter,
    title: ch.title,
    nodes: unlocked.filter((n) => n.chapter === ch.chapter)
      .sort((a, b) => (a.unlockedAt ?? '').localeCompare(b.unlockedAt ?? '')),
  })).filter((ch) => ch.nodes.length > 0);

  const llmNodes = unlocked.filter((n) => n.source === 'llm')
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1
          className="text-lg font-medium"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}
        >
          {V.chronicle}
        </h1>

        {/* Track toggle */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)' }}
        >
          {(['hunter', 'vanguard'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTrack(t)}
              className="px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: track === t ? 'var(--bg-elevated)' : 'transparent',
                color: track === t ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {t === 'hunter' ? V.chronicleHunter : V.chronicleVanguard}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>
        Chapter {user?.currentChapter ?? 1} · {unlocked.length} fragment{unlocked.length !== 1 ? 's' : ''} unlocked
      </p>

      {byChapter.length === 0 && llmNodes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            {V.storyEmpty}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {V.storyHint}
          </p>
        </div>
      ) : (
        <>
          {llmNodes.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                <span className="text-xs font-medium px-2" style={{ color: 'var(--accent-ember)' }}>
                  {V.storyBeats}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
              </div>
              <div className="flex flex-col gap-2">
                {llmNodes.map((node) => (
                  <StoryNodeCard key={node.id} body={node.body} accent="var(--accent-ember)" label="LLM" />
                ))}
              </div>
            </section>
          )}

          {byChapter.map((ch) => (
            <section key={ch.chapter} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                <span className="text-xs font-medium px-2" style={{ color: 'var(--accent-gold)' }}>
                  Chapter {ch.chapter} · {ch.title}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
              </div>
              <div className="flex flex-col gap-2">
                {ch.nodes.map((node) => (
                  <StoryNodeCard key={node.id} body={node.body} accent="var(--accent-gold)" />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {locked.length > 0 && (
        <div
          className="rounded-lg p-4 text-center mt-2"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {V.storyLocked(locked.length)}
          </p>
        </div>
      )}
    </div>
  );
}

function StoryNodeCard({ body, accent, label }: { body: string; accent: string; label?: string }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '0.5px solid var(--border-subtle)',
        borderLeftWidth: 3,
        borderLeftColor: accent,
      }}
    >
      {label && (
        <span className="text-xs font-medium block mb-1" style={{ color: accent }}>
          {label}
        </span>
      )}
      <p className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: '1.7', fontFamily: 'var(--font-body)' }}>
        {body}
      </p>
    </div>
  );
}
