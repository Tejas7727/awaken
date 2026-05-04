import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { V } from '../lib/voice';
import type { PublicProfileRow } from '../lib/supabase';

const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S++'];
const TOTAL_FLOORS = 8;

function floorForProfile(p: PublicProfileRow): number {
  return Math.min(Math.max(p.current_floor ?? 1, 1), TOTAL_FLOORS);
}

function sortProfiles(profiles: PublicProfileRow[]): PublicProfileRow[] {
  return [...profiles].sort((a, b) => {
    if (b.current_floor !== a.current_floor) return b.current_floor - a.current_floor;
    if (b.player_level !== a.player_level) return b.player_level - a.player_level;
    return b.streak - a.streak;
  });
}

export default function Tower() {
  const publicProfiles = useStore((s) => s.publicProfiles);
  const loadPublicProfiles = useStore((s) => s.loadPublicProfiles);
  const subscribeTower = useStore((s) => s.subscribeTower);
  const authSession = useStore((s) => s.authSession);

  const [selectedProfile, setSelectedProfile] = useState<PublicProfileRow | null>(null);
  const [prevFloors, setPrevFloors] = useState<Record<string, number>>({});

  useEffect(() => {
    loadPublicProfiles();
    const unsub = subscribeTower();
    return unsub;
  }, [loadPublicProfiles, subscribeTower]);

  // Track floor changes for animation
  useEffect(() => {
    setPrevFloors((prev) => {
      const next = { ...prev };
      for (const p of publicProfiles) {
        if (!(p.id in next)) next[p.id] = floorForProfile(p);
      }
      return next;
    });
  }, [publicProfiles]);

  const sorted = sortProfiles(publicProfiles);
  const byFloor: Record<number, PublicProfileRow[]> = {};
  for (const p of sorted) {
    const f = floorForProfile(p);
    if (!byFloor[f]) byFloor[f] = [];
    byFloor[f].push(p);
  }

  const floorNumbers = Array.from({ length: TOTAL_FLOORS }, (_, i) => TOTAL_FLOORS - i);

  return (
    <div>
      <h1
        className="text-lg font-medium mb-6"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}
      >
        {V.towerTitle}
      </h1>

      {publicProfiles.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
          {V.towerEmptyState}
        </p>
      )}

      {publicProfiles.length > 0 && (
        <div className="relative">
          {/* Tower spine */}
          <div
            className="absolute left-8 top-0 bottom-0 w-px"
            style={{ backgroundColor: 'var(--border-subtle)' }}
          />

          {floorNumbers.map((floor) => (
            <FloorBand
              key={floor}
              floor={floor}
              profiles={byFloor[floor] ?? []}
              prevFloors={prevFloors}
              currentUserId={authSession?.user.id}
              onSelectProfile={setSelectedProfile}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedProfile && (
          <ProfileCard
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FloorBand({
  floor, profiles, prevFloors, currentUserId, onSelectProfile,
}: {
  floor: number;
  profiles: PublicProfileRow[];
  prevFloors: Record<string, number>;
  currentUserId?: string;
  onSelectProfile: (p: PublicProfileRow) => void;
}) {
  const rank = RANKS[floor - 1] ?? 'F';

  return (
    <div className="flex items-center gap-4 mb-4 min-h-[52px]">
      {/* Floor label */}
      <div className="w-16 flex-shrink-0 text-right pr-3">
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-numeric)' }}>
          {rank}
        </span>
      </div>

      {/* Floor band */}
      <div
        className="flex-1 rounded-lg px-3 py-2 flex items-center flex-wrap gap-2 min-h-[44px]"
        style={{
          backgroundColor: profiles.length > 0 ? 'var(--bg-surface)' : 'transparent',
          border: profiles.length > 0 ? '1px solid var(--border-subtle)' : '1px solid transparent',
        }}
      >
        <AnimatePresence>
          {profiles.map((p) => {
            const prevFloor = prevFloors[p.id] ?? floor;
            const movedUp = prevFloor < floor;
            return (
              <motion.button
                key={p.id}
                layout
                initial={movedUp ? { y: 30, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                onClick={() => onSelectProfile(p)}
                className="flex flex-col items-center gap-0.5"
                title={p.player_name}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold relative"
                  style={{
                    backgroundColor: p.id === currentUserId ? 'var(--accent-gold)' : 'var(--bg-elevated)',
                    border: `2px solid ${p.id === currentUserId ? 'var(--accent-gold)' : 'var(--border-strong)'}`,
                    color: p.id === currentUserId ? 'var(--text-on-gold)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {p.player_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-[9px] max-w-[36px] truncate" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
                  {p.player_name}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onClose }: { profile: PublicProfileRow; onClose: () => void }) {
  return (
    <>
      <motion.div
        className="fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ backgroundColor: 'rgba(7,9,14,0.6)' }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-2xl p-6"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-strong)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '2px solid var(--border-strong)',
              color: 'var(--accent-gold)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {profile.player_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
              {profile.player_name}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
              {profile.hunter_path === 'vanguard' ? 'Vanguard' : 'Hunter'} · Rank {profile.rank}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Floor', value: profile.current_floor },
            { label: 'Level', value: profile.player_level },
            { label: 'Streak', value: `${profile.streak}d` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg py-3 text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-numeric)' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>{label}</p>
            </div>
          ))}
        </div>

        {profile.earned_title_ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {profile.earned_title_ids.slice(0, 5).map((id) => (
              <span
                key={id}
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--accent-gold)',
                  border: '1px solid var(--border-strong)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {id.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          Close
        </button>
      </motion.div>
    </>
  );
}
