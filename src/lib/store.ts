import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { db } from './db';
import { seedIfEmpty } from './seed';
import { computeRank, computePlayerLevel, statXpToLevel } from './progression';
import { getEffectiveDay } from './time';
import { LLMQuestImport, type Quest, type QuestCompletion, type Settings, type StoryNode, type Title, type UserState } from './schemas';
import { nanoid } from 'nanoid';
import { TITLE_RULES } from '../data/titles';
import { findExistingGist, createGist, updateGist, fetchGist, buildSnapshot, type GistSnapshot } from './github';
import { supabase, isSupabaseConfigured, playerEmail, cleanAuthError } from './supabase';

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

  syncStatus: 'idle' | 'syncing' | 'error';
  syncBanner: string | null;
  lastSyncedAt: string | null;

  // Auth state
  authSession: Session | null;
  authLoading: boolean;
  isLegacyUser: boolean; // has local IndexedDB data but no cloudUserId

  initAuth: () => Promise<void>;
  signIn: (playerName: string, password: string) => Promise<string | null>;
  signUp: (playerName: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  migrateLocalData: (playerName: string, password: string) => Promise<string | null>;

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

  connectGist: (token: string) => Promise<void>;
  pushToGist: () => Promise<void>;
  pullCheckOnLaunch: () => Promise<void>;
  applyGistSnapshot: (snapshot: GistSnapshot) => Promise<void>;
  dismissSyncBanner: () => void;
}

// Module-level debounce timer for gist sync
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
  authSession: null,
  authLoading: true,
  isLegacyUser: false,

  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 3000);
  },
  dismissToast: () => set({ toast: null }),

  init: async () => {
    await seedIfEmpty();
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
    // Non-blocking: check if cloud has newer data
    get().pullCheckOnLaunch();
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

    // Debounced gist push — 30 s after last completion
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

  // ── Auth ──────────────────────────────────────────────────────────────────

  initAuth: async () => {
    if (!isSupabaseConfigured) {
      // Dev/local mode without Supabase — treat as authenticated locally
      set({ authLoading: false, authSession: null });
      return;
    }

    // Subscribe to auth changes (session refresh, sign-out)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ authSession: session });
      if (!session) {
        set({
          user: null, settings: null, quests: [], completions: [],
          stories: [], titles: [], todayCompletedIds: new Set(),
          statHistory: [], loading: true, isLegacyUser: false,
        });
      }
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      set({ authLoading: false, authSession: null });
      return;
    }

    set({ authSession: session });

    // Detect legacy local-only user (has data but never linked to cloud)
    const localUser = await db.user.get('me');
    if (localUser && !localUser.cloudUserId) {
      set({ authLoading: false, isLegacyUser: true });
      // Still load local state so Migrate page can display their name
      await get().init();
      return;
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

    // Seed local DB if this is a new device (no local data)
    const localUser = await db.user.get('me');
    if (!localUser) {
      await seedIfEmpty();
      // Mark cloudUserId
      const row = await db.user.get('me');
      if (row) await db.user.put({ ...row, cloudUserId: data.user.id });
    } else if (!localUser.cloudUserId) {
      // Legacy user who signed in — route to migration
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

    // Create the profile row
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
    // State reset handled by onAuthStateChange subscription
  },

  migrateLocalData: async (playerName: string, password: string): Promise<string | null> => {
    const { user, completions } = get();

    // Sign up with the local player's data
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

    // Create profile with existing local state
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

    // Push completions to Supabase
    if (completions.length > 0) {
      const rows = completions.map((c) => ({
        user_id: data.user!.id,
        quest_id: c.questId,
        effective_day: c.effectiveDay,
        completed_at: c.completedAt,
        xp_awarded: c.xpAwarded,
        stats_awarded: c.statsAwarded,
      }));
      // Insert in batches of 200
      for (let i = 0; i < rows.length; i += 200) {
        await supabase.from('completions').insert(rows.slice(i, i + 200));
      }
    }

    // Mark local user as migrated
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
            // Local is up-to-date; push local state
            const snapshot = await buildSnapshot(token);
            await updateGist(token, gistId, snapshot);
            await db.syncLog.put({ id: 'sync', syncedAt: new Date().toISOString() });
            set({ lastSyncedAt: new Date().toISOString(), syncStatus: 'idle' });
            get().showToast('Gist linked and synced');
          }
        }
      } else {
        // No existing gist — create one with current state
        const snapshot = await buildSnapshot(token);
        gistId = await createGist(token, snapshot);
        await get().updateSettings({ gistId });
        await db.syncLog.put({ id: 'sync', syncedAt: new Date().toISOString() });
        set({ lastSyncedAt: new Date().toISOString(), syncStatus: 'idle' });
        get().showToast('Gist created — sync active');
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
      // Silently skip — offline or token issue; don't block the app
    }
  },

  applyGistSnapshot: async (snapshot: GistSnapshot) => {
    set({ syncStatus: 'syncing' });
    try {
      // Merge completions: union by id (append-only)
      const localCompletions = await db.completions.toArray();
      const localIds = new Set(localCompletions.map((c) => c.id));
      const newCompletions = snapshot.completions.filter((c) => !localIds.has(c.id));
      if (newCompletions.length) await db.completions.bulkPut(newCompletions);

      // Merge quests: gist wins for same id; add new ones
      await db.quests.bulkPut(snapshot.quests);

      // Merge stories: take whichever has unlockedAt set
      const localStories = await db.stories.toArray();
      const localStoryMap = new Map(localStories.map((s) => [s.id, s]));
      for (const node of snapshot.stories) {
        const local = localStoryMap.get(node.id);
        if (!local || (!local.unlockedAt && node.unlockedAt)) {
          await db.stories.put(node);
        }
      }

      // Merge titles: take whichever has earnedAt set
      const localTitles = await db.titles.toArray();
      const localTitleMap = new Map(localTitles.map((t) => [t.id, t]));
      for (const title of snapshot.titles) {
        const local = localTitleMap.get(title.id);
        if (!local || (!local.earnedAt && title.earnedAt)) {
          await db.titles.put(title);
        }
      }

      // Merge stats_daily: gist wins (take whichever value is higher)
      for (const row of snapshot.stats_daily) {
        const existing = await db.stats_daily.get([row.day, row.stat]);
        if (!existing || row.value > existing.value) {
          await db.stats_daily.put(row);
        }
      }

      // User: take the one with more totalXp (more progress)
      const localUser = await db.user.get('me');
      if (!localUser || snapshot.user.totalXp > localUser.totalXp) {
        await db.user.put(snapshot.user);
      }

      const now = new Date().toISOString();
      await db.syncLog.put({ id: 'sync', syncedAt: now });

      // Reload everything into store state
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
        quests,
        completions,
        stories,
        titles,
        statHistory,
        todayCompletedIds,
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
