import { create } from 'zustand';
import { db } from './db';
import { seedIfEmpty } from './seed';
import { computeRank, computePlayerLevel, statXpToLevel } from './progression';
import { getEffectiveDay } from './time';
import { LLMQuestImport, type Quest, type QuestCompletion, type Settings, type StoryNode, type Title, type UserState } from './schemas';
import { nanoid } from 'nanoid';
import { TITLE_RULES } from '../data/titles';

const LLM_PROMPT = `You are the Awaken Quest Master. The player has shared their state. Generate the next set of quests so that:
- They match the player's current rank and stats — do not propose impossible quests for an E-rank.
- They cover at least the number of stats listed in rules.minStatsCovered.
- There are exactly rules.dailyQuestCount daily quests.
- There are rules.weeklyQuestCount weekly quests if today is a Monday, otherwise none new (the player keeps last week's).
- There is exactly 1 shadow quest if dayCount % rules.shadowQuestEvery == 0, otherwise none.
- They reference focusAreas heavily.
- Each quest is specific and measurable ("walk 6,000 steps", not "walk more").
- The set varies meaningfully from the last seven days.
- Optionally append a 1-2 sentence story beat continuing the current chapter.
- Optionally award a title if a clear milestone was hit.

Respond with ONLY a single JSON object that matches this schema. No prose, no markdown, no fences:

{
  "quests": [
    {
      "id": "kebab-case-unique-slug",
      "type": "daily" | "weekly" | "shadow" | "side" | "boss",
      "title": "string, sentence case, ≤80 chars",
      "description": "string, ≤200 chars, optional",
      "stats": { "STR": 0, "AGI": 15, "VIT": 0, "INT": 0, "WIS": 0, "CHA": 0 },
      "xp": 25,
      "tags": ["movement","outdoor"]
    }
  ],
  "storyBeat": "optional string, ≤400 chars, or null",
  "titleAward": { "id": "iron_will", "name": "Iron Will", "reason": "7-day streak" } or null
}`;

export interface LLMQuestImportPreview {
  quests: Quest[];
  storyBeat: string | null;
  titleAward: { id: string; name: string; reason: string } | null;
}

interface AwakenState {
  user: UserState | null;
  settings: Settings | null;
  quests: Quest[];
  completions: QuestCompletion[];
  stories: StoryNode[];
  titles: Title[];
  todayCompletedIds: Set<string>;
  loading: boolean;
  toast: string | null;
  levelUpData: { level: number; rank: string } | null;
  importPreview: LLMQuestImportPreview | null;
  importError: string | null;
  importJson: string;

  statHistory: Array<{ day: string; stat: string; value: number }>;

  init: () => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  runRolloverCheck: () => Promise<void>;
  exportDailyPack: () => Promise<void>;
  setImportJson: (json: string) => void;
  submitImport: () => void;
  confirmImport: () => Promise<void>;
  dismissImportPreview: () => void;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  resetAllData: () => Promise<void>;
  addSideQuest: (title: string, stats: Record<string, number>, xp: number, tags: string[]) => Promise<void>;
  dismissLevelUp: () => void;
  showToast: (msg: string) => void;
  dismissToast: () => void;
}

export const useStore = create<AwakenState>((set, get) => ({
  user: null,
  settings: null,
  quests: [],
  completions: [],
  stories: [],
  titles: [],
  statHistory: [],
  todayCompletedIds: new Set(),
  loading: true,
  toast: null,
  levelUpData: null,
  importPreview: null,
  importError: null,
  importJson: '',

  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 3000);
  },
  dismissToast: () => set({ toast: null }),

  init: async () => {
    await seedIfEmpty();
    const [userRow, settingsRow, quests, completions, stories, titles, statHistory] = await Promise.all([
      db.user.get('me'),
      db.settings.get('settings'),
      db.quests.toArray(),
      db.completions.toArray(),
      db.stories.toArray(),
      db.titles.toArray(),
      db.stats_daily.toArray(),
    ]);

    if (!userRow || !settingsRow) {
      set({ loading: false });
      return;
    }

    // I/O boundary — Dexie rows are plain objects; cast to domain types
    const user = userRow as unknown as UserState;
    const settings = settingsRow as unknown as Settings;

    const today = getEffectiveDay(new Date(), settings.rolloverHour);
    const todayCompletedIds = new Set(
      completions.filter((c) => c.effectiveDay === today).map((c) => c.questId)
    );

    set({ user, settings, quests, completions, stories, titles, statHistory, todayCompletedIds, loading: false });
    await get().runRolloverCheck();
  },

  completeQuest: async (questId: string) => {
    const { user, settings, quests, todayCompletedIds } = get();
    if (!user || !settings) return;
    if (todayCompletedIds.has(questId)) return;

    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    const now = new Date();
    const today = getEffectiveDay(now, settings.rolloverHour);

    const newCompletion: QuestCompletion = {
      id: nanoid(),
      questId,
      completedAt: now.toISOString(),
      effectiveDay: today,
      xpAwarded: quest.xp,
      statsAwarded: quest.stats as Record<string, number>,
    };

    await db.completions.put(newCompletion);

    const newTotalXp = user.totalXp + quest.xp;
    // I/O boundary — stat keys come from Object.entries, cast to mutable string-indexed records
    const newStats: Record<string, number> = { ...user.stats };
    const newStatXp: Record<string, number> = { ...user.statXp };

    for (const [stat, amount] of Object.entries(quest.stats)) {
      let currentXp = (newStatXp[stat] ?? 0) + (amount as number);
      let level = newStats[stat] ?? 1;
      while (currentXp >= statXpToLevel(level)) {
        currentXp -= statXpToLevel(level);
        level++;
      }
      newStats[stat] = level;
      newStatXp[stat] = currentXp;
    }

    const sumStats = Object.values(newStats).reduce((a, b) => a + b, 0);
    const newRank = computeRank(sumStats, user.streak);
    const newPlayerLevel = computePlayerLevel(newTotalXp);

    // Streak: increment if first completion of a new effective day
    let newStreak = user.streak;
    if (user.lastActiveDay !== today) {
      const yesterday = getEffectiveDay(new Date(now.getTime() - 86400000), settings.rolloverHour);
      if (user.lastActiveDay === yesterday || user.lastActiveDay === null) {
        newStreak = user.streak + 1;
      } else {
        newStreak = 1;
      }
    }

    const updatedUser: UserState = {
      ...user,
      totalXp: newTotalXp,
      stats: newStats,
      statXp: newStatXp,
      rank: newRank as UserState['rank'],
      playerLevel: newPlayerLevel,
      streak: newStreak,
      lastActiveDay: today,
    };

    // Check title rules
    const allCompletions = await db.completions.toArray();
    const morningCompletions = allCompletions.filter((c) => new Date(c.completedAt).getHours() < 9).length;
    const shadowCompletions = allCompletions.filter((c) => {
      const q = quests.find((qq) => qq.id === c.questId);
      return q?.type === 'shadow';
    }).length + (quest.type === 'shadow' ? 1 : 0);

    const ctx = { morningCompletions, shadowCompletions };
    const newEarnedTitleIds = [...updatedUser.earnedTitleIds];
    for (const rule of TITLE_RULES) {
      if (!newEarnedTitleIds.includes(rule.id) && rule.rule(updatedUser, ctx)) {
        newEarnedTitleIds.push(rule.id);
        const titleRow = await db.titles.get(rule.id);
        if (titleRow) {
          await db.titles.put({ ...titleRow, earnedAt: now.toISOString() });
        }
      }
    }
    updatedUser.earnedTitleIds = newEarnedTitleIds;

    // I/O boundary — Dexie row type differs from domain type
    await db.user.put({ id: 'me', ...updatedUser } as unknown as import('./db').UserStateRow);

    // Snapshot each stat value for the day (upsert)
    for (const stat of Object.keys(newStats)) {
      await db.stats_daily.put({ day: today, stat, value: newStats[stat] });
    }

    const newTodayCompletedIds = new Set([...todayCompletedIds, questId]);
    const completions2 = await db.completions.toArray();
    const titles2 = await db.titles.toArray();
    const statHistory2 = await db.stats_daily.toArray();

    const didLevelUp = newPlayerLevel > user.playerLevel;
    set({
      user: updatedUser,
      todayCompletedIds: newTodayCompletedIds,
      completions: completions2,
      titles: titles2,
      statHistory: statHistory2,
      levelUpData: didLevelUp ? { level: newPlayerLevel, rank: newRank } : get().levelUpData,
    });
  },

  runRolloverCheck: async () => {
    const { user, settings } = get();
    if (!user || !settings) return;

    const today = getEffectiveDay(new Date(), settings.rolloverHour);

    // Decay streak if user missed yesterday
    if (user.lastActiveDay !== null && user.lastActiveDay !== today) {
      const yesterday = getEffectiveDay(new Date(Date.now() - 86400000), settings.rolloverHour);
      if (user.lastActiveDay !== yesterday) {
        const updatedUser = { ...user, streak: 0 };
        // I/O boundary — Dexie row type differs from domain type
        await db.user.put({ id: 'me', ...updatedUser } as unknown as import('./db').UserStateRow);
        set({ user: updatedUser });
      }
    }

    // Unlock story nodes whose level threshold is now met
    const stories = await db.stories.toArray();
    const now = new Date().toISOString();
    const currentLevel = user.playerLevel;
    const toUnlock = stories.filter(
      (s) => s.unlockedAt === null && s.unlockAtPlayerLevel !== null && s.unlockAtPlayerLevel <= currentLevel
    );

    for (const node of toUnlock) {
      await db.stories.put({ ...node, unlockedAt: now });
    }

    const updatedStories = await db.stories.toArray();
    set({ stories: updatedStories });
  },

  exportDailyPack: async () => {
    const { user, settings, completions, quests, stories } = get();
    if (!user || !settings) return;

    const today = getEffectiveDay(new Date(), settings.rolloverHour);
    const startedAt = new Date(user.startedAt);
    const dayCount = Math.max(1, Math.floor((Date.now() - startedAt.getTime()) / 86400000) + 1);

    const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
      const d = getEffectiveDay(new Date(Date.now() - i * 86400000), settings.rolloverHour);
      const dayCompletions = completions.filter((c) => c.effectiveDay === d);
      const completedTitles = dayCompletions.map((c) => {
        const q = quests.find((qq) => qq.id === c.questId);
        return q?.title ?? c.questId;
      });
      return { date: d, completed: completedTitles, missed: [] };
    });

    const unlockedStories = stories
      .filter((s) => s.unlockedAt !== null)
      .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''));
    const lastBeats = unlockedStories.slice(0, 3).map((s) => s.body);

    const exportPack = {
      version: '1.0' as const,
      prompt: LLM_PROMPT,
      state: {
        date: today,
        dayCount,
        rank: user.rank,
        playerLevel: user.playerLevel,
        stats: user.stats,
        streak: user.streak,
        lastSevenDays,
        story: {
          currentChapter: user.currentChapter,
          lastBeats,
        },
        focusAreas: settings.focusAreas,
        rules: {
          dailyQuestCount: settings.dailyQuestCount,
          shadowQuestEvery: settings.shadowQuestEvery,
          weeklyQuestCount: settings.weeklyQuestCount,
          minStatsCovered: settings.minStatsCovered,
        },
      },
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportPack, null, 2));
      get().showToast('Export copied to clipboard');
    } catch {
      get().showToast('Failed to copy — check clipboard permissions');
    }
  },

  setImportJson: (json) => set({ importJson: json, importError: null }),

  submitImport: () => {
    const { importJson } = get();
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      set({ importError: "That doesn't look like JSON. Did you copy the whole response?" });
      return;
    }

    const result = LLMQuestImport.safeParse(parsed);
    if (!result.success) {
      const firstError = result.error.errors[0];
      const path = firstError.path.join('.');
      set({ importError: `Invalid import — field "${path}": ${firstError.message}` });
      return;
    }

    const data = result.data;
    const dailyQuests = data.quests.filter((q) => q.type === 'daily');
    if (dailyQuests.some((q) => q.xp > 100)) {
      set({ importError: 'A daily quest has XP > 100, which is not allowed.' });
      return;
    }
    const totalDailyXp = dailyQuests.reduce((sum, q) => sum + q.xp, 0);
    if (totalDailyXp > 200) {
      set({ importError: `Total daily XP (${Math.round(totalDailyXp)}) exceeds the limit of 200.` });
      return;
    }

    const now = new Date().toISOString();
    const quests: Quest[] = data.quests.map((q) => ({
      ...q,
      stats: q.stats as Record<string, number>,
      tags: q.tags ?? [],
      createdAt: now,
      expiresAt: null,
      source: 'llm' as const,
    }));

    set({
      importPreview: {
        quests,
        storyBeat: data.storyBeat ?? null,
        titleAward: data.titleAward ?? null,
      },
      importError: null,
    });
  },

  confirmImport: async () => {
    const { importPreview, user } = get();
    if (!importPreview || !user) return;

    const now = new Date().toISOString();
    await db.quests.bulkPut(importPreview.quests);

    if (importPreview.storyBeat) {
      const storyNode: StoryNode = {
        id: nanoid(),
        chapter: user.currentChapter,
        body: importPreview.storyBeat,
        unlockAtPlayerLevel: null,
        unlockedAt: now,
        source: 'llm',
      };
      await db.stories.put(storyNode);
    }

    if (importPreview.titleAward) {
      const existing = await db.titles.get(importPreview.titleAward.id);
      if (existing && !existing.earnedAt) {
        await db.titles.put({ ...existing, earnedAt: now });
      } else if (!existing) {
        await db.titles.put({
          id: importPreview.titleAward.id,
          name: importPreview.titleAward.name,
          description: importPreview.titleAward.reason,
          earnedAt: now,
        });
      }
    }

    const [quests, stories, titles] = await Promise.all([
      db.quests.toArray(),
      db.stories.toArray(),
      db.titles.toArray(),
    ]);

    set({ quests, stories, titles, importPreview: null, importJson: '' });
    get().showToast('Quests imported successfully');
  },

  dismissImportPreview: () => set({ importPreview: null }),

  updateSettings: async (partial) => {
    const { settings } = get();
    if (!settings) return;
    const updated = { ...settings, ...partial };
    // I/O boundary — Dexie row type differs from domain type
    await db.settings.put({ id: 'settings', ...updated } as unknown as import('./db').SettingsRow);
    set({ settings: updated });
  },

  resetAllData: async () => {
    await Promise.all([
      db.user.clear(),
      db.quests.clear(),
      db.completions.clear(),
      db.stats_daily.clear(),
      db.stories.clear(),
      db.titles.clear(),
      db.settings.clear(),
      db.syncLog.clear(),
    ]);
    await seedIfEmpty();
    const [userRow, settingsRow, quests, completions, stories, titles, statHistory] = await Promise.all([
      db.user.get('me'),
      db.settings.get('settings'),
      db.quests.toArray(),
      db.completions.toArray(),
      db.stories.toArray(),
      db.titles.toArray(),
      db.stats_daily.toArray(),
    ]);
    if (!userRow || !settingsRow) return;
    // I/O boundary — Dexie rows are plain objects; cast to domain types
    const user = userRow as unknown as UserState;
    const settings = settingsRow as unknown as Settings;
    set({
      user,
      settings,
      quests,
      completions,
      stories,
      titles,
      statHistory,
      todayCompletedIds: new Set(),
    });
    get().showToast('All data reset');
  },

  addSideQuest: async (title, stats, xp, tags) => {
    const now = new Date().toISOString();
    const quest: Quest = {
      id: nanoid(),
      type: 'side',
      title,
      stats: stats as Record<string, number>,
      xp,
      tags,
      createdAt: now,
      expiresAt: null,
      source: 'user',
    };
    await db.quests.put(quest);
    const quests = await db.quests.toArray();
    set({ quests });
    get().showToast('Side quest added');
  },

  dismissLevelUp: () => set({ levelUpData: null }),
}));
