import Dexie, { type Table } from 'dexie';
import type { Quest, QuestCompletion, StoryNode, Title } from './schemas';

export interface UserStateRow {
  id: string;
  name: string;
  startedAt: string;
  rank: string;
  playerLevel: number;
  totalXp: number;
  stats: Record<string, number>;
  statXp: Record<string, number>;
  streak: number;
  lastActiveDay: string | null;
  currentChapter: number;
  earnedTitleIds: string[];
}

export interface SettingsRow {
  id: string;
  rolloverHour: number;
  dailyQuestCount: number;
  weeklyQuestCount: number;
  shadowQuestEvery: number;
  minStatsCovered: number;
  focusAreas: string[];
  githubToken?: string;
  gistId?: string;
  themeAccent: 'cyan' | 'magenta' | 'gold';
}

interface StatDailyRow {
  day: string;
  stat: string;
  value: number;
}

interface SyncLogRow {
  id: string;
  syncedAt: string;
}

export class AwakenDB extends Dexie {
  user!: Table<UserStateRow, string>;
  quests!: Table<Quest, string>;
  completions!: Table<QuestCompletion, string>;
  stats_daily!: Table<StatDailyRow, string>;
  stories!: Table<StoryNode, string>;
  titles!: Table<Title, string>;
  settings!: Table<SettingsRow, string>;
  syncLog!: Table<SyncLogRow, string>;

  constructor() {
    super('awaken');
    this.version(1).stores({
      user: 'id',
      quests: 'id, type, source, expiresAt',
      completions: 'id, questId, effectiveDay, completedAt',
      stats_daily: '[day+stat], day, stat',
      stories: 'id, chapter, unlockedAt',
      titles: 'id, earnedAt',
      settings: 'id',
      syncLog: 'id, syncedAt',
    });
  }
}

export const db = new AwakenDB();
