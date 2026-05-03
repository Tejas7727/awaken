import { db } from './db';
import { supabase, isSupabaseConfigured } from './supabase';
import { SEED_QUESTS } from '../data/seed-quests';
import { SEED_CHAPTERS } from '../data/chapters';
import { TITLE_RULES } from '../data/titles';
import type { Quest } from './schemas';

export async function seedIfEmpty() {
  const count = await db.user.count();
  if (count > 0) return;

  const now = new Date().toISOString();

  await db.user.put({
    id: 'me',
    name: 'Awakened',
    startedAt: now,
    rank: 'F',
    playerLevel: 1,
    totalXp: 0,
    stats: { STR: 1, AGI: 1, VIT: 1, INT: 1, WIS: 1, CHA: 1 },
    statXp: { STR: 0, AGI: 0, VIT: 0, INT: 0, WIS: 0, CHA: 0 },
    streak: 0,
    lastActiveDay: null,
    currentChapter: 1,
    earnedTitleIds: [],
    restDaysRemaining: 2,
    restDaysResetsOn: null,
  });

  await db.settings.put({
    id: 'settings',
    rolloverHour: 4,
    dailyQuestCount: 5,
    weeklyQuestCount: 2,
    shadowQuestEvery: 3,
    minStatsCovered: 4,
    focusAreas: [],
  });

  const seedQuests: Quest[] = SEED_QUESTS.map((q) => ({
    id: q.id,
    type: q.type as Quest['type'],
    difficulty: q.difficulty as Quest['difficulty'],
    title: q.title,
    description: q.description,
    instruction: q.instruction,
    stats: q.stats as Record<string, number>,
    xp: q.xp,
    tags: [...q.tags],
    createdAt: now,
    expiresAt: null,
    source: 'seed' as const,
  }));
  await db.quests.bulkPut(seedQuests);

  const storyNodes = SEED_CHAPTERS.flatMap((chapter) =>
    chapter.nodes.map((node) => ({
      id: node.id,
      chapter: chapter.chapter,
      body: node.body,
      unlockAtPlayerLevel: node.unlockAtPlayerLevel,
      unlockedAt: node.unlockAtPlayerLevel === 1 ? now : null,
      source: 'seed' as const,
    }))
  );
  await db.stories.bulkPut(storyNodes);

  const titles = TITLE_RULES.map((rule) => ({
    id: rule.id,
    name: rule.name,
    description: rule.desc,
    earnedAt: null,
  }));
  await db.titles.bulkPut(titles);
}

// Update existing seed quest rows to the latest copy (title, prose, instruction, difficulty).
// Only touches rows with source='seed'. Safe to run on every launch.
export async function backfillSeedQuests() {
  const now = new Date().toISOString();
  for (const sq of SEED_QUESTS) {
    const existing = await db.quests.get(sq.id);
    if (existing) {
      if (existing.source === 'seed' || !existing.source) {
        await db.quests.put({
          ...existing,
          title: sq.title,
          description: sq.description,
          instruction: sq.instruction,
          difficulty: sq.difficulty as Quest['difficulty'],
          stats: sq.stats as Record<string, number>,
          xp: sq.xp,
          tags: [...sq.tags],
          source: 'seed' as const,
        });
      }
    } else {
      await db.quests.put({
        id: sq.id,
        type: sq.type as Quest['type'],
        difficulty: sq.difficulty as Quest['difficulty'],
        title: sq.title,
        description: sq.description,
        instruction: sq.instruction,
        stats: sq.stats as Record<string, number>,
        xp: sq.xp,
        tags: [...sq.tags],
        createdAt: now,
        expiresAt: null,
        source: 'seed' as const,
      });
    }
  }
}

// Seed user's initial quest pack into Supabase if they have zero quests there.
export async function seedQuestsToSupabase(userId: string) {
  if (!isSupabaseConfigured) return;
  try {
    const { data: existing } = await supabase
      .from('quests')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    if (existing && existing.length > 0) return;

    const now = new Date().toISOString();
    const rows = SEED_QUESTS.map((sq) => ({
      id: `${userId}_${sq.id}`,
      user_id: userId,
      type: sq.type,
      difficulty: sq.difficulty,
      title: sq.title,
      prose: sq.description,
      instruction: sq.instruction,
      stats: sq.stats,
      xp: sq.xp,
      tags: [...sq.tags],
      source: 'seed',
      created_at: now,
    }));

    await supabase.from('quests').insert(rows);
  } catch {
    // Non-fatal — IndexedDB is the source of truth
  }
}

// Seed title definitions into the shared titles table (idempotent, once per app boot).
export async function seedTitlesToSupabase() {
  if (!isSupabaseConfigured) return;
  try {
    const rows = TITLE_RULES.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.desc,
      rarity: rule.rarity,
      hidden: rule.hidden ?? false,
    }));
    await supabase.from('titles').upsert(rows, { ignoreDuplicates: true });
  } catch {
    // Non-fatal
  }
}
