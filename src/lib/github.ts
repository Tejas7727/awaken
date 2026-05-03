import { Octokit } from '@octokit/rest';
import { db } from './db';
import type { Quest, QuestCompletion, StoryNode, Title } from './schemas';
import type { UserStateRow, SettingsRow } from './db';

const GIST_FILENAME = 'awaken-sync.json';
const ARCHIVE_FILENAME = 'awaken-archive.json';

export interface GistSnapshot {
  version: '1.0';
  exportedAt: string;
  user: UserStateRow;
  quests: Quest[];
  completions: QuestCompletion[];
  stats_daily: Array<{ day: string; stat: string; value: number }>;
  stories: StoryNode[];
  titles: Title[];
  settings: Omit<SettingsRow, 'githubToken'>;
}

function octokit(token: string) {
  return new Octokit({ auth: token });
}

export async function findExistingGist(token: string): Promise<string | null> {
  const client = octokit(token);
  let page = 1;
  while (true) {
    const { data } = await client.gists.list({ per_page: 100, page });
    const found = data.find((g) => g.files?.[GIST_FILENAME]);
    if (found) return found.id;
    if (data.length < 100) break;
    page++;
  }
  return null;
}

export async function createGist(token: string, snapshot: GistSnapshot): Promise<string> {
  const client = octokit(token);
  const { data } = await client.gists.create({
    description: 'Awaken sync data — do not edit manually',
    public: false,
    files: { [GIST_FILENAME]: { content: JSON.stringify(snapshot, null, 2) } },
  });
  return data.id!;
}

export async function updateGist(token: string, gistId: string, snapshot: GistSnapshot): Promise<void> {
  const client = octokit(token);
  await client.gists.update({
    gist_id: gistId,
    files: { [GIST_FILENAME]: { content: JSON.stringify(snapshot, null, 2) } },
  });
}

export async function fetchGist(
  token: string,
  gistId: string,
): Promise<{ snapshot: GistSnapshot; updatedAt: string } | null> {
  const client = octokit(token);
  const { data } = await client.gists.get({ gist_id: gistId });
  const file = data.files?.[GIST_FILENAME];
  if (!file?.content) return null;
  const snapshot = JSON.parse(file.content) as GistSnapshot;
  return { snapshot, updatedAt: data.updated_at! };
}

export async function pushArchiveToGist(
  token: string,
  gistId: string,
  newCompletions: QuestCompletion[],
): Promise<void> {
  const client = octokit(token);
  // Fetch existing archive content (may not exist yet)
  let existing: QuestCompletion[] = [];
  try {
    const { data } = await client.gists.get({ gist_id: gistId });
    const file = data.files?.[ARCHIVE_FILENAME];
    if (file?.content) existing = JSON.parse(file.content) as QuestCompletion[];
  } catch { /* first archive push */ }

  const existingIds = new Set(existing.map((c) => c.id));
  const merged = [...existing, ...newCompletions.filter((c) => !existingIds.has(c.id))];
  await client.gists.update({
    gist_id: gistId,
    files: { [ARCHIVE_FILENAME]: { content: JSON.stringify(merged, null, 2) } },
  });
}

export async function fetchArchiveFromGist(
  token: string,
  gistId: string,
): Promise<QuestCompletion[] | null> {
  const client = octokit(token);
  const { data } = await client.gists.get({ gist_id: gistId });
  const file = data.files?.[ARCHIVE_FILENAME];
  if (!file?.content) return null;
  return JSON.parse(file.content) as QuestCompletion[];
}

export async function buildSnapshot(token: string): Promise<GistSnapshot> {
  const [userRow, settingsRow, quests, completions, stats_daily, stories, titles] = await Promise.all([
    db.user.get('me'),
    db.settings.get('settings'),
    db.quests.toArray(),
    db.completions.toArray(),
    db.stats_daily.toArray(),
    db.stories.toArray(),
    db.titles.toArray(),
  ]);

  if (!userRow || !settingsRow) throw new Error('DB not initialized');

  // Strip PAT from settings before writing to gist — never persist the token remotely
  // I/O boundary — cast to omit type
  const { githubToken: _stripped, ...safeSettings } = settingsRow as SettingsRow & { githubToken?: string };
  void _stripped;

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    user: userRow,
    quests,
    completions,
    stats_daily,
    stories,
    titles,
    settings: safeSettings,
  };
}
