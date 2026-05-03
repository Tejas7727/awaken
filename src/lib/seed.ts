import { db } from './db';
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
    theme: 'dark',
  });

  const seedQuests: Quest[] = SEED_QUESTS.map((q) => ({
    id: q.id,
    type: q.type as Quest['type'],
    difficulty: (q as { difficulty?: string }).difficulty as Quest['difficulty'],
    title: q.title,
    description: (q as { description?: string }).description,
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
