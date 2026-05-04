import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { db } from './db';
import { seedIfEmpty, backfillSeedQuests, seedQuestsToSupabase, seedTitlesToSupabase } from './seed';
import { computeRank, computePlayerLevel, statXpToLevel } from './progression';
import { getEffectiveDay } from './time';
import { LLMQuestImport, type Quest, type QuestCompletion, type Settings, type StoryNode, type Title, type UserState } from './schemas';
import { nanoid } from 'nanoid';
import { TITLE_RULES } from '../data/titles';
import { findExistingGist, createGist, updateGist, fetchGist, buildSnapshot, pushArchiveToGist, type GistSnapshot } from './github';
import { supabase, isSupabaseConfigured, playerEmail, cleanAuthError } from './supabase';
import { V } from './voice';

const DAILY_CAP = 5;

const LLM_PROMPT = `You are the Quest Master of the Tower of Trials. The Hunter has shared their state. Generate the next quest pack so that:
- Quest difficulties match the Hunter's current rank band (±1 rank).
- There are exactly 5 daily quests.
- There is 1 weekly quest if today is Monday, otherwise none.
- There is 1 shadow trial if dayCount % rules.shadowQuestEvery == 0, otherwise none.
- Quests reference focusAreas heavily.
- Each quest is specific and measurable.
- The set varies meaningfully from the last seven days.
- Voice: Tower-bardic. Each quest has: title (Cinzel-style, ≤60 chars), description (prose, ≤140 chars), instruction embedded in title.
- XP scale: F=10–15, E=15–20, D=18–25, C=25–35, B=35–50, A=60–90, S=90–150, S++=150–250.

Optionally include a storyBeat (1–2 sentence chronicle fragment) and a titleAward if a milestone was hit.

Respond with ONLY a single JSON object. No prose, no markdown fences:

{
  "quests": [
    {
      "id": "kebab-case-unique-slug",
      "type": "daily" | "weekly" | "shadow" | "side" | "boss",
      "difficulty": "F" | "E" | "D" | "C" | "B" | "A" | "S" | "S++",
      "title": "string, sentence case, ≤60 chars",
      "description": "bardic prose, ≤140 chars",
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
  syncStatus: 'idle' | 'syncing' | 'error';
  syncBanner: string | null;
  lastSyncedAt: string | null;
  showArchivePrompt: boolean;

  // Auth state
  authSession: Session | null;
  authLoading: boolean;
  isLegacyUser: boolean;
  isAdmin: boolean;

  initAuth: () => Promise<void>;
  signIn: (playerName: string, password: string) => Promise<string | null>;
  signUp: (playerName: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  migrateLocalData: (playerName: string, password: string) => Promise<string | null>;

  init: () => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  runRolloverCheck: () => Promise<void>;
  runArchiveCheck: () => Promise<void>;
  restDay: () => Promise<void>;
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
  dismissArchivePrompt: () => void;

  connectGist: (token: string) => Promise<void>;
  pushToGist: () => Promise<void>;
  pullCheckOnLaunch: () => Promise<void>;
  applyGistSnapshot: (snapshot: GistSnapshot) => Promise<void>;
  dismissSyncBanner: () => void;
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
  syncStatus: 'idle',
  syncBanner: null,
  lastSyncedAt: null,
  showArchivePrompt: false,
  authSession: null,
  authLoading: true,
  isLegacyUser: false,
  isAdmin: false,

  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 3000);
  },
  dismissToast: () => set({ toast: null }),
  dismissArchivePrompt: () => set({ showArchivePrompt: false }),

  init: async () => {
    await seedIfEmpty();
    await backfillSeedQuests();
    const [userRow, settingsRow, quests, completions, stories, titles, statHistory, syncLog] = await Promise.all([
      db.user.get('me'),
      db.settings.get('settings'),
      db.quests.toArray(),
      db.completions.toArray(),
      db.stories.toArray(),
      db.titles.toArray(),
      db.stats_daily.toArray(),
      db.syncLog.get('sync'),
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

    set({
      user, settings, quests, completions, stories, titles, statHistory, todayCompletedIds,
      loading: false,
      lastSyncedAt: syncLog?.syncedAt ?? null,
    });

    await get().runRolloverCheck();
    get().pullCheckOnLaunch();
    // Non-blocking archive check (once per day)
    get().runArchiveCheck();
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
    // I/O boundary — stat keys come from Object.entries
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
      rank: newRank,
      playerLevel: newPlayerLevel,
      streak: newStreak,
      lastActiveDay: today,
    };

    const allCompletions = await db.completions.toArray();
    const morningCompletions = allCompletions.filter((c) => new Date(c.completedAt).getHours() < 9).length;
    const shadowCompletions = allCompletions.filter((c) => {
      const q = quests.find((qq) => qq.id === c.questId);
      return q?.type === 'shadow';
    }).length + (quest.type === 'shadow' ? 1 : 0);

    const ctx = { morningCompletions, shadowCompletions };
    const newEarnedTitleIds = [...updatedUser.earnedTitleIds];
    const newlyEarnedTitleIds: string[] = [];
    for (const rule of TITLE_RULES) {
      if (!newEarnedTitleIds.includes(rule.id) && rule.rule(updatedUser, ctx)) {
        newEarnedTitleIds.push(rule.id);
        newlyEarnedTitleIds.push(rule.id);
        const titleRow = await db.titles.get(rule.id);
        if (titleRow) {
          await db.titles.put({ ...titleRow, earnedAt: now.toISOString() });
        }
      }
    }
    updatedUser.earnedTitleIds = newEarnedTitleIds;

    // Write system whispers to Supabase for each newly earned title
    const { authSession } = get();
    if (isSupabaseConfigured && authSession && newlyEarnedTitleIds.length > 0) {
      const whisperRows = newlyEarnedTitleIds.map((id) => {
        const rule = TITLE_RULES.find((r) => r.id === id);
        return {
          user_id: authSession.user.id,
          body: rule ? `Title earned: ${rule.name} — ${rule.desc}` : `Title earned: ${id}`,
          kind: 'system' as const,
        };
      });
      void supabase.from('whispers').insert(whisperRows);
    }

    // I/O boundary — Dexie row type differs from domain type
    await db.user.put({ id: 'me', ...updatedUser } as unknown as import('./db').UserStateRow);

    for (const stat of Object.keys(newStats)) {
      await db.stats_daily.put({ day: today, stat, value: newStats[stat] });
    }

    const newTodayCompletedIds = new Set([...todayCompletedIds, questId]);
    const completions2 = await db.completions.toArray();
    const titles2 = await db.titles.toArray();
    const statHistory2 = await db.stats_daily.toArray();

    const didLevelUp = newPlayerLevel > user.playerLevel;
    const didRankUp = newRank !== user.rank;

    set({
      user: updatedUser,
      todayCompletedIds: newTodayCompletedIds,
      completions: completions2,
      titles: titles2,
      statHistory: statHistory2,
      levelUpData: didLevelUp ? { level: newPlayerLevel, rank: newRank } : get().levelUpData,
    });

    if (didRankUp && !didLevelUp) get().showToast(V.toastRankUp);
    else get().showToast(V.toastQuestComplete);

    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => { get().pushToGist(); }, 30_000);
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
        // I/O boundary
        await db.user.put({ id: 'me', ...updatedUser } as unknown as import('./db').UserStateRow);
        set({ user: updatedUser });
      }
    }

    // Reset rest tokens on Monday
    const nowDate = new Date();
    const dayOfWeek = nowDate.getDay(); // 0=Sun, 1=Mon
    if (dayOfWeek === 1) {
      const restResetsOn = user.restDaysResetsOn;
      if (!restResetsOn || restResetsOn < today) {
        const updatedUser = { ...user, restDaysRemaining: 2, restDaysResetsOn: today };
        await db.user.put({ id: 'me', ...updatedUser } as unknown as import('./db').UserStateRow);
        set({ user: updatedUser });
      }
    }

    // Unlock story nodes
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

  runArchiveCheck: async () => {
    const { settings } = get();
    if (!settings) return;

    // Debounce to once per 24h
    const today = getEffectiveDay(new Date(), settings.rolloverHour);
    const lastCheck = localStorage.getItem('awaken_archive_check');
    if (lastCheck === today) return;
    localStorage.setItem('awaken_archive_check', today);

    const cutoff = getEffectiveDay(new Date(Date.now() - 90 * 86400000), settings.rolloverHour);
    const oldCompletions = await db.completions.where('effectiveDay').below(cutoff).toArray();
    if (oldCompletions.length === 0) return;

    if (!settings.githubToken || !settings.gistId) {
      // Prompt user to configure archive
      set({ showArchivePrompt: true });
      return;
    }

    const archiveGistId = settings.archiveGistId ?? settings.gistId;
    try {
      await pushArchiveToGist(settings.githubToken, archiveGistId, oldCompletions);
      const oldIds = oldCompletions.map((c) => c.id);
      await db.completions.bulkDelete(oldIds);
      const completions = await db.completions.toArray();
      set({ completions });
      if (!settings.archiveGistId) {
        await get().updateSettings({ archiveGistId });
      }
    } catch (err) {
      console.error('Archive check error:', err);
    }
  },

  restDay: async () => {
    const { user, settings } = get();
    if (!user || !settings) return;

    const restDaysRemaining = user.restDaysRemaining ?? 2;
    if (restDaysRemaining <= 0) return;

    const now = new Date();
    const today = getEffectiveDay(now, settings.rolloverHour);

    // Mark today as rested — preserves streak by counting as active
    const completion: QuestCompletion = {
      id: nanoid(),
      questId: '__rest__',
      completedAt: now.toISOString(),
      effectiveDay: today,
      xpAwarded: 0,
      statsAwarded: {},
    };
    await db.completions.put(completion);

    // Preserve streak: set lastActiveDay = today without incrementing streak
    const updatedUser: UserState = {
      ...user,
      restDaysRemaining: restDaysRemaining - 1,
      lastActiveDay: today,
    };
    await db.user.put({ id: 'me', ...updatedUser } as unknown as import('./db').UserStateRow);

    const completions = await db.completions.toArray();
    const newTodayIds = new Set([...get().todayCompletedIds, '__rest__']);
    set({ user: updatedUser, completions, todayCompletedIds: newTodayIds });
    get().showToast(V.restToast);
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
          dailyQuestCount: DAILY_CAP,
          shadowQuestEvery: settings.shadowQuestEvery,
          weeklyQuestCount: settings.weeklyQuestCount,
          minStatsCovered: settings.minStatsCovered,
        },
      },
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportPack, null, 2));
      get().showToast('Pack copied — paste into your LLM');
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

    // Hard daily cap
    if (dailyQuests.length > DAILY_CAP) {
      set({ importError: V.importTooManyDailies(dailyQuests.length) });
      return;
    }
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
    get().showToast(V.toastImported);
  },

  dismissImportPreview: () => set({ importPreview: null }),

  updateSettings: async (partial) => {
    const { settings } = get();
    if (!settings) return;
    const updated = { ...settings, ...partial };
    // I/O boundary
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
    // I/O boundary
    const user = userRow as unknown as UserState;
    const settings = settingsRow as unknown as Settings;
    set({
      user, settings, quests, completions, stories, titles, statHistory,
      todayCompletedIds: new Set(),
    });
    get().showToast(V.toastResetDone);
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
    get().showToast(V.toastSideAdded);
  },

  dismissLevelUp: () => set({ levelUpData: null }),

  // ── Auth ──────────────────────────────────────────────────────────────────

  initAuth: async () => {
    if (!isSupabaseConfigured) {
      set({ authLoading: false, authSession: null });
      return;
    }

    // One-shot migration: clear stale IndexedDB so local state matches server reset
    const resetKey = 'awaken_reset_v2';
    if (!localStorage.getItem(resetKey)) {
      await Promise.all([
        db.user.clear(), db.quests.clear(), db.completions.clear(),
        db.stats_daily.clear(), db.stories.clear(), db.titles.clear(),
        db.settings.clear(), db.syncLog.clear(),
      ]);
      localStorage.setItem(resetKey, '1');
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ authSession: session });
      if (!session) {
        set({
          user: null, settings: null, quests: [], completions: [],
          stories: [], titles: [], todayCompletedIds: new Set(),
          statHistory: [], loading: true, isLegacyUser: false, isAdmin: false,
        });
      }
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      set({ authLoading: false, authSession: null });
      return;
    }

    // Server-side validation — getSession() trusts the local token; getUser() verifies with Supabase
    const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !serverUser) {
      // Deleted account or invalid token — clear local session and route to cold open
      await supabase.auth.signOut({ scope: 'local' });
      await Promise.all([
        db.user.clear(), db.quests.clear(), db.completions.clear(),
        db.stats_daily.clear(), db.stories.clear(), db.titles.clear(),
        db.settings.clear(), db.syncLog.clear(),
      ]);
      set({ authLoading: false, authSession: null, isAdmin: false });
      return;
    }

    set({ authSession: session });

    // Fetch admin flag from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
    set({ isAdmin: profile?.is_admin ?? false });

    // Seed Supabase tables (idempotent)
    seedTitlesToSupabase();
    seedQuestsToSupabase(session.user.id);

    const localUser = await db.user.get('me');
    if (localUser && !localUser.cloudUserId) {
      // If the user is already authenticated server-side, just stamp cloudUserId and proceed.
      // The legacy migration path is only for pre-Phase-5 users with real offline data who
      // have never signed up. Post-reset everyone has a valid session, so skip Migrate.
      await db.user.put({ ...localUser, cloudUserId: session.user.id });
    }

    await get().init();
    set({ authLoading: false });
  },

  signIn: async (playerName: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: playerEmail(playerName),
      password,
    });
    if (error) return cleanAuthError(error.message);
    if (!data.session) return 'Sign-in failed — try again';

    set({ authSession: data.session });

    // Fetch admin flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.user.id)
      .single();
    set({ isAdmin: profile?.is_admin ?? false });

    // Seed Supabase tables (idempotent)
    seedTitlesToSupabase();
    seedQuestsToSupabase(data.user.id);

    const localUser = await db.user.get('me');
    if (!localUser) {
      await seedIfEmpty();
      const row = await db.user.get('me');
      if (row) await db.user.put({ ...row, cloudUserId: data.user.id });
    } else if (!localUser.cloudUserId) {
      set({ authLoading: false, isLegacyUser: true });
      await get().init();
      return null;
    }

    await get().init();
    set({ authLoading: false });
    return null;
  },

  signUp: async (playerName: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({
      email: playerEmail(playerName),
      password,
    });
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return 'That name is taken — choose another.';
      }
      return cleanAuthError(error.message);
    }
    if (!data.session) return 'Account created — check your email to confirm, then sign in.';

    const { data: rpc, error: rpcErr } = await supabase.rpc('create_profile', {
      p_player_name: playerName,
    });
    if (rpcErr) return rpcErr.message;
    // I/O boundary — RPC returns JSON
    const result = rpc as { error?: string; message?: string };
    if (result?.error) return result.message ?? 'Profile creation failed';

    set({ authSession: data.session });
    await seedIfEmpty();
    const row = await db.user.get('me');
    if (row) await db.user.put({ ...row, name: playerName, cloudUserId: data.user!.id });
    await get().init();
    set({ authLoading: false });
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  migrateLocalData: async (playerName: string, password: string): Promise<string | null> => {
    const { user, completions } = get();

    const { data, error } = await supabase.auth.signUp({
      email: playerEmail(playerName),
      password,
    });
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return 'That name is taken — choose another.';
      }
      return cleanAuthError(error.message);
    }
    if (!data.session) return 'Account created — check your email to confirm, then sign in.';

    const { data: rpc, error: rpcErr } = await supabase.rpc('create_profile', {
      p_player_name: playerName,
      p_rank: user?.rank ?? 'F',
      p_player_level: user?.playerLevel ?? 1,
      p_total_xp: user?.totalXp ?? 0,
      p_stats: user?.stats ?? {},
      p_stat_xp: user?.statXp ?? {},
      p_streak: user?.streak ?? 0,
      p_last_active_day: user?.lastActiveDay ?? null,
      p_current_chapter: user?.currentChapter ?? 1,
    });
    if (rpcErr) return rpcErr.message;
    const result = rpc as { error?: string; message?: string };
    if (result?.error) return result.message ?? 'Profile creation failed';

    if (completions.length > 0) {
      const rows = completions.map((c) => ({
        user_id: data.user!.id,
        quest_id: c.questId,
        effective_day: c.effectiveDay,
        completed_at: c.completedAt,
        xp_awarded: c.xpAwarded,
        stats_awarded: c.statsAwarded,
      }));
      for (let i = 0; i < rows.length; i += 200) {
        await supabase.from('completions').insert(rows.slice(i, i + 200));
      }
    }

    const localUser = await db.user.get('me');
    if (localUser) {
      await db.user.put({ ...localUser, name: playerName, cloudUserId: data.user!.id });
    }

    set({ authSession: data.session, isLegacyUser: false });
    await get().init();
    set({ authLoading: false });
    return null;
  },

  dismissSyncBanner: () => set({ syncBanner: null }),

  connectGist: async (token: string) => {
    set({ syncStatus: 'syncing' });
    try {
      await get().updateSettings({ githubToken: token });
      let gistId = await findExistingGist(token);
      if (gistId) {
        await get().updateSettings({ gistId });
        const result = await fetchGist(token, gistId);
        if (result) {
          const syncLog = await db.syncLog.get('sync');
          const localAt = syncLog?.syncedAt ?? null;
          if (!localAt || result.updatedAt > localAt) {
            set({ syncBanner: 'Cloud data found — load it to sync your progress?', syncStatus: 'idle' });
          } else {
            const snapshot = await buildSnapshot(token);
            await updateGist(token, gistId, snapshot);
            await db.syncLog.put({ id: 'sync', syncedAt: new Date().toISOString() });
            set({ lastSyncedAt: new Date().toISOString(), syncStatus: 'idle' });
            get().showToast(V.toastGistLinked);
          }
        }
      } else {
        const snapshot = await buildSnapshot(token);
        gistId = await createGist(token, snapshot);
        await get().updateSettings({ gistId });
        await db.syncLog.put({ id: 'sync', syncedAt: new Date().toISOString() });
        set({ lastSyncedAt: new Date().toISOString(), syncStatus: 'idle' });
        get().showToast(V.toastGistCreated);
      }
    } catch (err) {
      console.error('connectGist error:', err);
      set({ syncStatus: 'error' });
      get().showToast('Sync failed — check your PAT and try again');
    }
  },

  pushToGist: async () => {
    const { settings } = get();
    if (!settings?.githubToken || !settings?.gistId) return;
    set({ syncStatus: 'syncing' });
    try {
      const snapshot = await buildSnapshot(settings.githubToken);
      await updateGist(settings.githubToken, settings.gistId, snapshot);
      const now = new Date().toISOString();
      await db.syncLog.put({ id: 'sync', syncedAt: now });
      set({ lastSyncedAt: now, syncStatus: 'idle' });
    } catch (err) {
      console.error('pushToGist error:', err);
      set({ syncStatus: 'error' });
    }
  },

  pullCheckOnLaunch: async () => {
    const { settings } = get();
    if (!settings?.githubToken || !settings?.gistId) return;
    try {
      const result = await fetchGist(settings.githubToken, settings.gistId);
      if (!result) return;
      const syncLog = await db.syncLog.get('sync');
      const localAt = syncLog?.syncedAt ?? null;
      if (!localAt || result.updatedAt > localAt) {
        set({ syncBanner: 'Newer data on cloud — review and merge?' });
      }
    } catch {
      // Silently skip — offline or token issue
    }
  },

  applyGistSnapshot: async (snapshot: GistSnapshot) => {
    set({ syncStatus: 'syncing' });
    try {
      const localCompletions = await db.completions.toArray();
      const localIds = new Set(localCompletions.map((c) => c.id));
      const newCompletions = snapshot.completions.filter((c) => !localIds.has(c.id));
      if (newCompletions.length) await db.completions.bulkPut(newCompletions);

      await db.quests.bulkPut(snapshot.quests);

      const localStories = await db.stories.toArray();
      const localStoryMap = new Map(localStories.map((s) => [s.id, s]));
      for (const node of snapshot.stories) {
        const local = localStoryMap.get(node.id);
        if (!local || (!local.unlockedAt && node.unlockedAt)) {
          await db.stories.put(node);
        }
      }

      const localTitles = await db.titles.toArray();
      const localTitleMap = new Map(localTitles.map((t) => [t.id, t]));
      for (const title of snapshot.titles) {
        const local = localTitleMap.get(title.id);
        if (!local || (!local.earnedAt && title.earnedAt)) {
          await db.titles.put(title);
        }
      }

      for (const row of snapshot.stats_daily) {
        const existing = await db.stats_daily.get([row.day, row.stat]);
        if (!existing || row.value > existing.value) {
          await db.stats_daily.put(row);
        }
      }

      const localUser = await db.user.get('me');
      if (!localUser || snapshot.user.totalXp > localUser.totalXp) {
        await db.user.put(snapshot.user);
      }

      const now = new Date().toISOString();
      await db.syncLog.put({ id: 'sync', syncedAt: now });

      const [userRow, quests, completions, stories, titles, statHistory] = await Promise.all([
        db.user.get('me'),
        db.quests.toArray(),
        db.completions.toArray(),
        db.stories.toArray(),
        db.titles.toArray(),
        db.stats_daily.toArray(),
      ]);
      const { settings } = get();
      const rolloverHour = settings?.rolloverHour ?? 4;
      const today = getEffectiveDay(new Date(), rolloverHour);
      const todayCompletedIds = new Set(completions.filter((c) => c.effectiveDay === today).map((c) => c.questId));

      set({
        user: userRow as unknown as UserState,
        quests, completions, stories, titles, statHistory, todayCompletedIds,
        syncBanner: null,
        lastSyncedAt: now,
        syncStatus: 'idle',
      });
      get().showToast('Cloud data merged');
    } catch (err) {
      console.error('applyGistSnapshot error:', err);
      set({ syncStatus: 'error' });
      get().showToast('Merge failed — try again');
    }
  },
}));
