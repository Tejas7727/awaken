import { useStore } from '../lib/store';
import { SEED_CHAPTERS } from '../data/chapters';

export default function Story() {
  const stories = useStore((s) => s.stories);
  const user = useStore((s) => s.user);

  const unlocked = stories.filter((s) => s.unlockedAt !== null);
  const locked = stories.filter((s) => s.unlockedAt === null);

  // Group unlocked nodes by chapter
  const byChapter = SEED_CHAPTERS.map((ch) => ({
    chapter: ch.chapter,
    title: ch.title,
    nodes: unlocked.filter((n) => n.chapter === ch.chapter)
      .sort((a, b) => (a.unlockedAt ?? '').localeCompare(b.unlockedAt ?? '')),
  })).filter((ch) => ch.nodes.length > 0);

  // Also include LLM nodes (chapter = user.currentChapter, not from seed list)
  const llmNodes = unlocked.filter((n) => n.source === 'llm')
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''));

  return (
    <div>
      <h1 className="text-lg font-medium font-display mb-1" style={{ color: 'var(--text-primary)' }}>
        Story
      </h1>
      <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>
        Chapter {user?.currentChapter ?? 1} · {unlocked.length} node{unlocked.length !== 1 ? 's' : ''} unlocked
      </p>

      {byChapter.length === 0 && llmNodes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            No story nodes unlocked yet.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Complete quests and level up to unlock story fragments.
          </p>
        </div>
      ) : (
        <>
          {/* LLM beats — most recent first, above chapters */}
          {llmNodes.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                <span className="text-xs font-medium px-2" style={{ color: 'var(--accent-magenta)' }}>
                  Story beats
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
              </div>
              <div className="flex flex-col gap-2">
                {llmNodes.map((node) => (
                  <StoryNodeCard key={node.id} body={node.body} accent="var(--accent-magenta)" label="LLM" />
                ))}
              </div>
            </section>
          )}

          {/* Seed chapters */}
          {byChapter.map((ch) => (
            <section key={ch.chapter} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                <span className="text-xs font-medium px-2" style={{ color: 'var(--accent-cyan)' }}>
                  Chapter {ch.chapter} · {ch.title}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
              </div>
              <div className="flex flex-col gap-2">
                {ch.nodes.map((node) => (
                  <StoryNodeCard key={node.id} body={node.body} accent="var(--accent-cyan)" />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {/* Locked count hint */}
      {locked.length > 0 && (
        <div
          className="rounded-xl p-4 text-center mt-2"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {locked.length} node{locked.length !== 1 ? 's' : ''} still locked — keep leveling up.
          </p>
        </div>
      )}
    </div>
  );
}

function StoryNodeCard({ body, accent, label }: { body: string; accent: string; label?: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: `3px solid ${accent}`,
        border: '1px solid var(--border-subtle)',
        borderLeftColor: accent,
      }}
    >
      {label && (
        <span className="text-xs font-medium block mb-1" style={{ color: accent }}>
          {label}
        </span>
      )}
      <p className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: '1.7' }}>
        {body}
      </p>
    </div>
  );
}
