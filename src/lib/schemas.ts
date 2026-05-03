import { z } from 'zod';

export const StatKey = z.enum(['STR', 'AGI', 'VIT', 'INT', 'WIS', 'CHA']);
export type StatKey = z.infer<typeof StatKey>;

export const Rank = z.enum(['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S++']);
export type Rank = z.infer<typeof Rank>;

export const QuestType = z.enum(['daily', 'weekly', 'shadow', 'side', 'boss']);
export type QuestType = z.infer<typeof QuestType>;

export const DifficultyKey = z.enum(['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S++']);
export type DifficultyKey = z.infer<typeof DifficultyKey>;

export const Quest = z.object({
  id: z.string().min(1),
  type: QuestType,
  difficulty: DifficultyKey.optional(),
  title: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  instruction: z.string().max(120).optional(),
  stats: z.record(StatKey, z.number().int().min(0).max(200)),
  xp: z.number().int().min(0).max(500),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  source: z.enum(['seed', 'llm', 'user', 'admin']).default('user'),
});
export type Quest = z.infer<typeof Quest>;

export const QuestCompletion = z.object({
  id: z.string(),
  questId: z.string(),
  completedAt: z.string().datetime(),
  effectiveDay: z.string(),
  xpAwarded: z.number().int(),
  statsAwarded: z.record(StatKey, z.number().int()),
});
export type QuestCompletion = z.infer<typeof QuestCompletion>;

export const Title = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  earnedAt: z.string().datetime().nullable(),
});
export type Title = z.infer<typeof Title>;

export const StoryNode = z.object({
  id: z.string(),
  chapter: z.number().int(),
  body: z.string(),
  unlockAtPlayerLevel: z.number().int().nullable(),
  unlockedAt: z.string().datetime().nullable(),
  source: z.enum(['seed', 'llm']).default('seed'),
});
export type StoryNode = z.infer<typeof StoryNode>;

export const Settings = z.object({
  rolloverHour: z.number().int().min(0).max(23).default(4),
  dailyQuestCount: z.number().int().min(1).max(8).default(5),
  weeklyQuestCount: z.number().int().min(0).max(4).default(2),
  shadowQuestEvery: z.number().int().min(1).max(14).default(3),
  minStatsCovered: z.number().int().min(1).max(6).default(4),
  focusAreas: z.array(StatKey).default([]),
  githubToken: z.string().optional(),
  gistId: z.string().optional(),
  archiveGistId: z.string().optional(),
});
export type Settings = z.infer<typeof Settings>;

export const UserState = z.object({
  name: z.string().default('Awakened'),
  startedAt: z.string().datetime(),
  rank: z.string().default('F'),
  playerLevel: z.number().int().min(1).default(1),
  totalXp: z.number().int().min(0).default(0),
  stats: z.record(StatKey, z.number().int().min(1)).default({ STR: 1, AGI: 1, VIT: 1, INT: 1, WIS: 1, CHA: 1 }),
  statXp: z.record(StatKey, z.number().int().min(0)).default({ STR: 0, AGI: 0, VIT: 0, INT: 0, WIS: 0, CHA: 0 }),
  streak: z.number().int().min(0).default(0),
  lastActiveDay: z.string().nullable(),
  currentChapter: z.number().int().min(1).default(1),
  earnedTitleIds: z.array(z.string()).default([]),
  restDaysRemaining: z.number().int().min(0).max(2).default(2),
  restDaysResetsOn: z.string().nullable().default(null),
});
export type UserState = z.infer<typeof UserState>;

export const LLMQuestImport = z.object({
  quests: z.array(Quest.omit({ createdAt: true, expiresAt: true, source: true })).min(1).max(12),
  storyBeat: z.string().max(400).nullable().optional(),
  titleAward: z.object({
    id: z.string(),
    name: z.string(),
    reason: z.string(),
  }).nullable().optional(),
});
export type LLMQuestImport = z.infer<typeof LLMQuestImport>;

export const DailyExport = z.object({
  version: z.literal('1.0'),
  prompt: z.string(),
  state: z.object({
    date: z.string(),
    dayCount: z.number().int(),
    rank: z.string(),
    playerLevel: z.number().int(),
    stats: z.record(StatKey, z.number().int()),
    streak: z.number().int(),
    lastSevenDays: z.array(z.object({
      date: z.string(),
      completed: z.array(z.string()),
      missed: z.array(z.string()),
    })),
    story: z.object({
      currentChapter: z.number().int(),
      lastBeats: z.array(z.string()),
    }),
    focusAreas: z.array(StatKey),
    userNotes: z.string().optional(),
    rules: z.object({
      dailyQuestCount: z.number().int(),
      shadowQuestEvery: z.number().int(),
      weeklyQuestCount: z.number().int(),
      minStatsCovered: z.number().int(),
    }),
  }),
});
export type DailyExport = z.infer<typeof DailyExport>;
