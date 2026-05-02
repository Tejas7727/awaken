# Awaken — Master Build Plan

A directive prompt for Claude Code. Drop this file into a fresh empty repo, then run `claude` and say: **"Read awaken-build-plan.md and execute Phase 1 end-to-end. After Phase 1 is committed and working locally, stop and ask before starting Phase 2."**

---

## 1. Project goal

Build **Awaken** — a personal gamified life-quest webapp. Real-life habits become quests; quests award XP and stat points; stats unlock ranks (E → SSS) and titles; the user's life becomes a Solo Leveling-style progression. Single user for now; data model and storage layer must be ready for multi-user later without restructuring.

## 2. Hard constraints

- **Hosting**: GitHub Pages, free tier, static only. No backend server, ever.
- **Persistence**: All data lives in IndexedDB. Optional cloud backup to a private GitHub Gist using the user's PAT.
- **Mobile-first**: Designed at 360px width before anything else. Installable as a PWA on iOS and Android.
- **Offline-capable**: The app must work end-to-end with no network after first load.
- **Type-safe**: TypeScript everywhere. No `any` except at clearly-marked I/O boundaries.
- **Validated**: Every untrusted input (clipboard imports, gist payloads) goes through a Zod schema before reaching the store.
- **No paid services**: No Firebase, no Supabase, no Vercel, no analytics SaaS.
- **No secrets in the bundle**: The app reads the user's GitHub PAT from `localStorage`, never from a build-time env var.

## 3. Tech stack (use these exact picks, latest stable at time of build)

| Concern | Pick |
|---|---|
| Bundler / dev server | Vite |
| UI framework | React 18 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Component primitives | shadcn/ui patterns (copy components, don't depend on a library) |
| State | Zustand with `persist` middleware |
| Local DB | Dexie.js (IndexedDB wrapper) |
| Schema validation | Zod |
| Routing | React Router 6 |
| Charts | Recharts |
| Animations | Framer Motion |
| Date math | date-fns |
| GitHub API | Octokit (`@octokit/rest`) |
| PWA | vite-plugin-pwa |
| Fonts | `@fontsource/inter`, `@fontsource/space-grotesk` |
| Package manager | pnpm preferred; npm fine |

Do not add any other runtime dependencies without flagging the reason.

## 4. Repo layout

```
awaken/
├── .github/workflows/deploy.yml
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── src/
│   ├── components/
│   │   ├── ui/              # button, card, input, dialog, sheet, badge, progress
│   │   ├── quest/           # QuestCard, QuestList, QuestCompleteAnimation
│   │   ├── stats/           # StatGrid, StatDetailChart, XPBar
│   │   ├── story/           # StoryFeed, ChapterHeader
│   │   ├── progress/        # Heatmap, WeeklyChart
│   │   └── layout/          # AppShell, BottomNav, TopBar
│   ├── features/
│   │   ├── daily/           # day rollover, end-of-day flow
│   │   ├── progression/     # XP, levels, ranks, titles
│   │   ├── llm/             # export pack builder, import parser
│   │   └── sync/            # Gist push/pull
│   ├── lib/
│   │   ├── db.ts            # Dexie setup
│   │   ├── store.ts         # Zustand root store
│   │   ├── schemas.ts       # All Zod schemas
│   │   ├── progression.ts   # XP curves, rank thresholds, title rules
│   │   ├── time.ts          # rollover-aware date helpers
│   │   ├── github.ts        # Octokit Gist client
│   │   └── seed.ts          # initial seed data
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Quests.tsx
│   │   ├── Stats.tsx
│   │   ├── Story.tsx
│   │   ├── Progress.tsx
│   │   └── Settings.tsx
│   ├── data/
│   │   ├── seed-quests.ts   # the 22 seed quests
│   │   ├── titles.ts        # the title rule list
│   │   └── chapters.ts      # the 3 seed story chapters
│   ├── styles/
│   │   └── tokens.css       # design tokens as CSS custom properties
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── tailwind.config.ts
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── awaken-build-plan.md
```

## 5. Data model (Zod schemas in `src/lib/schemas.ts`)

```ts
import { z } from 'zod';

export const StatKey = z.enum(['STR','AGI','VIT','INT','WIS','CHA']);
export type StatKey = z.infer<typeof StatKey>;

export const Rank = z.enum(['E','D','C','B','A','S','SS','SSS']);

export const QuestType = z.enum(['daily','weekly','shadow','side','boss']);

export const Quest = z.object({
  id: z.string().min(1),
  type: QuestType,
  title: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  stats: z.record(StatKey, z.number().int().min(0).max(200)),
  xp: z.number().int().min(0).max(500),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  source: z.enum(['seed','llm','user']).default('user'),
});
export type Quest = z.infer<typeof Quest>;

export const QuestCompletion = z.object({
  id: z.string(),
  questId: z.string(),
  completedAt: z.string().datetime(),
  effectiveDay: z.string(), // YYYY-MM-DD in user's rollover-aware day
  xpAwarded: z.number().int(),
  statsAwarded: z.record(StatKey, z.number().int()),
});

export const Title = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  earnedAt: z.string().datetime().nullable(),
});

export const StoryNode = z.object({
  id: z.string(),
  chapter: z.number().int(),
  body: z.string(),
  unlockAtPlayerLevel: z.number().int().nullable(),
  unlockedAt: z.string().datetime().nullable(),
  source: z.enum(['seed','llm']).default('seed'),
});

export const Settings = z.object({
  rolloverHour: z.number().int().min(0).max(23).default(4),
  dailyQuestCount: z.number().int().min(1).max(8).default(4),
  weeklyQuestCount: z.number().int().min(0).max(4).default(2),
  shadowQuestEvery: z.number().int().min(1).max(14).default(3),
  minStatsCovered: z.number().int().min(1).max(6).default(4),
  focusAreas: z.array(StatKey).default([]),
  githubToken: z.string().optional(),
  gistId: z.string().optional(),
  themeAccent: z.enum(['cyan','magenta','gold']).default('cyan'),
});

export const UserState = z.object({
  name: z.string().default('Awakened'),
  startedAt: z.string().datetime(),
  rank: Rank.default('E'),
  playerLevel: z.number().int().min(1).default(1),
  totalXp: z.number().int().min(0).default(0),
  stats: z.record(StatKey, z.number().int().min(1)).default({STR:1,AGI:1,VIT:1,INT:1,WIS:1,CHA:1}),
  statXp: z.record(StatKey, z.number().int().min(0)).default({STR:0,AGI:0,VIT:0,INT:0,WIS:0,CHA:0}),
  streak: z.number().int().min(0).default(0),
  lastActiveDay: z.string().nullable(), // YYYY-MM-DD
  currentChapter: z.number().int().min(1).default(1),
  earnedTitleIds: z.array(z.string()).default([]),
});

export const LLMQuestImport = z.object({
  quests: z.array(Quest.omit({createdAt:true,expiresAt:true,source:true})).min(1).max(10),
  storyBeat: z.string().max(400).nullable().optional(),
  titleAward: z.object({
    id: z.string(),
    name: z.string(),
    reason: z.string(),
  }).nullable().optional(),
});

export const DailyExport = z.object({
  version: z.literal('1.0'),
  prompt: z.string(),
  state: z.object({
    date: z.string(),
    dayCount: z.number().int(),
    rank: Rank,
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
```

## 6. Progression math (`src/lib/progression.ts`)

```ts
// XP to advance from level n to n+1, per stat
export const statXpToLevel = (level: number) => 50 + (level - 1) * 25;

// Total XP threshold for player level n
export const playerXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

// Rank thresholds: total of all stat levels AND streak
export const RANK_THRESHOLDS = [
  { rank: 'E',   sumStats: 6,   streak: 0   },
  { rank: 'D',   sumStats: 18,  streak: 3   },
  { rank: 'C',   sumStats: 36,  streak: 7   },
  { rank: 'B',   sumStats: 66,  streak: 14  },
  { rank: 'A',   sumStats: 108, streak: 21  },
  { rank: 'S',   sumStats: 168, streak: 30  },
  { rank: 'SS',  sumStats: 240, streak: 60  },
  { rank: 'SSS', sumStats: 336, streak: 100 },
] as const;
```

## 7. Seed quest pool (`src/data/seed-quests.ts`)

22 quests covering all stats and types. The app boots with these so it's usable from second one.

```ts
export const SEED_QUESTS = [
  // Daily — body
  { id: 'q_water',      type: 'daily', title: 'Drink 2 L of water',           stats: { VIT: 10 }, xp: 15, tags: ['hydration'] },
  { id: 'q_walk6k',     type: 'daily', title: 'Walk 6,000 steps',             stats: { AGI: 15 }, xp: 20, tags: ['movement','outdoor'] },
  { id: 'q_stretch',    type: 'daily', title: '20-min stretch session',       stats: { AGI: 8, VIT: 5 }, xp: 18, tags: ['mobility'] },
  { id: 'q_pushups',    type: 'daily', title: '30 push-ups (broken sets ok)', stats: { STR: 12 }, xp: 18, tags: ['strength'] },
  { id: 'q_sleep',      type: 'daily', title: 'Lights out before 23:30',      stats: { VIT: 12 }, xp: 20, tags: ['recovery'] },
  // Daily — mind
  { id: 'q_meditate',   type: 'daily', title: '10-min meditation',            stats: { WIS: 12 }, xp: 18, tags: ['mind'] },
  { id: 'q_journal',    type: 'daily', title: 'Journal one page',             stats: { WIS: 10 }, xp: 15, tags: ['reflection'] },
  { id: 'q_gratitude',  type: 'daily', title: 'Write 3 things you are grateful for', stats: { WIS: 6, CHA: 4 }, xp: 12, tags: ['reflection'] },
  { id: 'q_read20',     type: 'daily', title: 'Read 20 pages',                stats: { INT: 12 }, xp: 18, tags: ['learning'] },
  // Daily — work
  { id: 'q_focus30',    type: 'daily', title: '30-min focus block, no phone', stats: { INT: 15 }, xp: 22, tags: ['deep-work'] },
  { id: 'q_pr',         type: 'daily', title: 'Ship one PR for the side project', stats: { INT: 25 }, xp: 35, tags: ['craft'] },
  // Shadow — discomfort
  { id: 'q_compliment', type: 'shadow', title: 'Compliment a stranger today', description: 'The discomfort is the gate.', stats: { CHA: 30 }, xp: 40, tags: ['social','vulnerable'] },
  { id: 'q_cold',       type: 'shadow', title: 'Cold shower, 60 seconds',     stats: { VIT: 15, STR: 10 }, xp: 30, tags: ['discomfort'] },
  { id: 'q_mirror',     type: 'shadow', title: '5-min mirror talk: tell yourself today goes well', stats: { CHA: 20, WIS: 10 }, xp: 30, tags: ['vulnerable'] },
  { id: 'q_avoid',      type: 'shadow', title: 'Write what you avoided today and why', stats: { WIS: 20 }, xp: 30, tags: ['reflection'] },
  { id: 'q_reach',      type: 'shadow', title: 'Reach out to someone you have drifted from', stats: { CHA: 35 }, xp: 45, tags: ['social','vulnerable'] },
  // Side
  { id: 'q_cook',       type: 'side',   title: 'Cook a meal from scratch',    stats: { VIT: 12, INT: 8 }, xp: 25, tags: ['skill'] },
  { id: 'q_run30',      type: 'side',   title: '30-min run',                  stats: { AGI: 25, STR: 10 }, xp: 35, tags: ['cardio'] },
  { id: 'q_plank',      type: 'side',   title: 'Plank 2 minutes total',       stats: { STR: 15 }, xp: 20, tags: ['core'] },
  { id: 'q_thanks',     type: 'side',   title: 'Send a thank-you message',    stats: { CHA: 15 }, xp: 18, tags: ['social'] },
  // Weekly
  { id: 'q_week_train', type: 'weekly', title: 'Train 4 of 7 days',           stats: { STR: 30, AGI: 30 }, xp: 80, tags: ['consistency'] },
  { id: 'q_week_learn', type: 'weekly', title: 'Finish one learning module',  stats: { INT: 50 }, xp: 80, tags: ['craft'] },
] as const;
```

## 8. Title rules (`src/data/titles.ts`)

Earned the moment the rule trips. Check on every state change.

```ts
export const TITLE_RULES = [
  { id: 'first_step',   name: 'First Step',     desc: 'Complete your first quest',           rule: (s) => s.totalXp > 0 },
  { id: 'iron_will',    name: 'Iron Will',      desc: '7-day streak',                         rule: (s) => s.streak >= 7 },
  { id: 'unbroken',     name: 'Unbroken',       desc: '30-day streak',                        rule: (s) => s.streak >= 30 },
  { id: 'dawn_walker',  name: 'Dawn Walker',    desc: '5 quests completed before 9 AM',       rule: (s, ctx) => ctx.morningCompletions >= 5 },
  { id: 'shadow_step',  name: 'Shadow Step',    desc: 'Complete your first shadow quest',     rule: (s, ctx) => ctx.shadowCompletions >= 1 },
  { id: 'first_gate',   name: 'First Gate',     desc: 'Reach D rank',                         rule: (s) => ['D','C','B','A','S','SS','SSS'].includes(s.rank) },
  { id: 'awakened',     name: 'Awakened',       desc: 'Reach C rank',                         rule: (s) => ['C','B','A','S','SS','SSS'].includes(s.rank) },
  { id: 'polymath',     name: 'Polymath',       desc: 'Every stat at level 10+',              rule: (s) => Object.values(s.stats).every((v) => v >= 10) },
];
```

## 9. Story chapters (`src/data/chapters.ts`)

```ts
export const SEED_CHAPTERS = [
  {
    chapter: 1, title: 'The Awakening',
    nodes: [
      { id: 'ch1_n1', body: 'You feel it on a Tuesday: a subtle hum behind your ribs. The System has noticed you.', unlockAtPlayerLevel: 1 },
      { id: 'ch1_n2', body: 'A quest appears. You complete it. Something settles into place — small, but real.', unlockAtPlayerLevel: 3 },
      { id: 'ch1_n3', body: 'For the first time, you understand: the System is not testing you. It is waiting.', unlockAtPlayerLevel: 5 },
      { id: 'ch1_n4', body: 'You finish the day stronger than you woke. Tomorrow, you will be different.', unlockAtPlayerLevel: 8 },
    ],
  },
  {
    chapter: 2, title: 'The First Gate',
    nodes: [
      { id: 'ch2_n1', body: 'A Gate forms in your peripheral vision. The System asks if you are ready.', unlockAtPlayerLevel: 12 },
      { id: 'ch2_n2', body: 'Inside the Gate: not monsters. Mirrors. The System wants to know what you avoid.', unlockAtPlayerLevel: 16 },
    ],
  },
  {
    chapter: 3, title: 'Shadow Work',
    nodes: [
      { id: 'ch3_n1', body: 'Your shadow speaks for the first time. It is not your enemy. It is your inheritance.', unlockAtPlayerLevel: 22 },
    ],
  },
];
```

## 10. Design tokens (`src/styles/tokens.css`)

```css
:root {
  --bg-base: #07090E;
  --bg-surface: #0F1218;
  --bg-elevated: #161A22;
  --border-subtle: rgba(255,255,255,0.06);
  --border-strong: rgba(255,255,255,0.12);

  --accent-cyan: #4DE9FF;
  --accent-magenta: #FF4DCB;
  --accent-gold: #FFD24D;

  --stat-str: #FF8C6B;
  --stat-agi: #4DE9C5;
  --stat-vit: #6BFF8C;
  --stat-int: #6B8CFF;
  --stat-wis: #B86BFF;
  --stat-cha: #FF6BB8;

  --text-primary: #E8EAF0;
  --text-secondary: rgba(232,234,240,0.65);
  --text-tertiary: rgba(232,234,240,0.4);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}
```

Tailwind config extends with these as semantic colors. Glassmorphism: `bg-[var(--bg-surface)]/80 backdrop-blur-md border border-[var(--border-subtle)]`. Use sentence case in every UI string. Two font weights only: 400 and 500. Numbers in display use Space Grotesk; everything else Inter.

Motion: quest completion = checkmark scale-bounce (0.4s spring) + XP number flies up the bar + 600ms glow pulse on the affected stat hex. Level-up = full-screen modal with rank shimmer (1.2s) then dismissable. Page transitions = 200ms fade + 4px y-slide. All animations honor `prefers-reduced-motion`.

## 11. The LLM I/O contract

### 11.1 Export pack

Triggered by the "End day → export ↗" button. The app builds a single object, JSON-stringifies it, and writes to clipboard. Toast confirms.

The `prompt` field is the canned system prompt, embedded verbatim so the user can paste the whole pack into any LLM with no extra instructions. Use this exact text:

```
You are the Awaken Quest Master. The player has shared their state. Generate the next set of quests so that:
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
}
```

### 11.2 Import flow

Settings → "Import from clipboard" or paste into a textarea on the Quests page. The app:
1. JSON-parses → if fail, show "That doesn't look like JSON. Did you copy the whole response?"
2. Runs through `LLMQuestImport` Zod schema → if fail, show the exact field that's wrong, allow edit-and-retry.
3. Renders a preview: list of new quests with stats and XP, the story beat, the title award.
4. On confirm: replaces tomorrow's daily/shadow/weekly slots with the imported quests, appends the story beat as a new `StoryNode` with `source: 'llm'`, awards the title if any.

Reject silently and audibly: if `quests` array is empty, if any quest has `xp > 100` for a daily, if total daily XP exceeds 200 (anti-jackpot guard).

## 12. Pages

| Route | What it shows |
|---|---|
| `/` | Dashboard from the mockup: hero, XP bar, 6 stat hexes, today's quests, streak, end-day button |
| `/quests` | All active quests grouped by type with filters; a "+New side quest" form |
| `/stats` | Big number per stat, line chart of last 30 days, total contributions per quest tag |
| `/story` | Reading view of all unlocked story nodes, chapter dividers, latest at the top |
| `/progress` | 90-day completion heatmap, 7-day rolling chart, top 5 quests by completion count |
| `/settings` | Rollover hour, focus areas, rules tuning, theme accent, GitHub PAT, manual export/import, "Reset all data" behind confirm |

Bottom nav on mobile (4 items + a center "+ end day" action button), top tabs on desktop (≥768px).

## 13. Storage layer

```ts
// src/lib/db.ts
import Dexie, { Table } from 'dexie';

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
```

Seed on first run if `user` table is empty: insert default `UserState`, `Settings`, all `SEED_QUESTS`, all chapter nodes (with `unlockedAt: null`), all `TITLE_RULES` materialized as `Title` rows with `earnedAt: null`.

## 14. Day rollover

A "day" is `[rolloverHour, rolloverHour+24)`. All `effectiveDay` calculations use this offset. On app launch and every minute thereafter while focused: if the current effective day is later than `lastActiveDay`, run the rollover routine — mark uncompleted dailies as missed, clear them from active, decay streak if zero completions on the just-finished day (unless rest day flagged), unlock story nodes whose `unlockAtPlayerLevel ≤ playerLevel`, evaluate title rules, set `lastActiveDay` to the new effective day. If there are no active dailies for the new day, prompt the user to import from LLM or auto-pull from `seed-quests.ts` based on rules.

## 15. Sync (Phase 4)

Settings page exposes a single text input for a GitHub Personal Access Token with `gist` scope. On save:
1. App tries to read the PAT and look for an existing gist named `awaken-sync.json`.
2. If found, store its `gistId`. If not, create a private gist with that filename containing the current DB snapshot.
3. On every quest completion (debounced 30 s) and on app close, snapshot the DB and PATCH the gist.
4. On launch, GET the gist; if its `updated_at` is newer than the local `syncLog.lastSyncedAt`, show a non-blocking banner: "Newer data on cloud — review and merge?"
5. Merge strategy: per-record latest-wins by `updatedAt`. Add an `updatedAt` field to every row at write time.

The PAT is stored in `localStorage` only. Never echo it back in the UI after entry. Strip it from every export and every gist write. Add a "Revoke and clear" button.

## 16. PWA

`vite-plugin-pwa` configured with:
- `registerType: 'autoUpdate'`
- `manifest`: `{ name: 'Awaken', short_name: 'Awaken', display: 'standalone', theme_color: '#07090E', background_color: '#07090E', icons: [192, 512, 'maskable 512'] }`
- Workbox: cache the app shell, network-first for the gist call, cache-first for fonts.

Generate icons in `public/`. The maskable icon must have safe-zone padding.

## 17. Deployment

`.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Set `vite.config.ts` `base: '/awaken/'` (or whatever the repo is named — read `package.json` name). Use `HashRouter` from React Router so Pages 404s don't trip the SPA.

## 18. Acceptance criteria (the build is done when all pass)

1. `pnpm install && pnpm dev` shows a populated dashboard at localhost:5173 with the hero, six stats, today's quests from seed, and a streak counter.
2. Tapping a quest's checkbox plays the completion animation, increments the right stat, increments XP toward the next player level, and persists across reload.
3. The "End day → export ↗" button copies a valid `DailyExport` JSON to clipboard. Pasting that JSON into Claude or ChatGPT and pasting the response back via the import flow produces tomorrow's quests with no errors.
4. A malformed import (missing field, wrong type, empty quests array) shows a clear message naming the failing field and does not corrupt state.
5. Hitting the rollover hour locally moves the dashboard to a new day, decays streak appropriately if zero completions, and unlocks any newly-eligible story node.
6. With a valid PAT in Settings, the app creates a private gist and updates it within 30 s of any quest completion. On a fresh device with the same PAT, the data syncs down on launch.
7. Manifest installs the app to home screen on iOS Safari and Android Chrome. The app loads offline after first visit.
8. `pnpm build` produces a dist under 400 KB gzipped (excluding fonts). Lighthouse mobile run on the deployed site scores ≥90 on Performance, Accessibility, Best Practices, and PWA.
9. No console warnings or errors in production build. No `any` types except at I/O boundaries marked with a comment explaining why.
10. `README.md` documents the LLM loop end-to-end so a new user could pick up the app in 5 minutes.

## 19. Build phases (work strictly in order)

### Phase 1 — Core loop (Day 1)
- Vite + React + TS scaffold, Tailwind set up, tokens applied.
- Dexie schemas, seed loader, Zustand store wired to DB.
- Home dashboard rendering the mockup at 360 px.
- Quest completion: animation, XP, stat, streak, persistence.
- Day rollover logic (manual + auto on focus).
- Export to clipboard, import from paste sheet, full Zod validation.
- Acceptance check: 1, 2, 3, 4, 5 pass.

### Phase 2 — Depth
- All five other pages with real charts.
- Title rule engine, story node unlocks, chapter advancement.
- Settings page (rollover, rules, focus areas, theme, reset).
- Acceptance check: rerun 1–5, plus stats/story/progress pages render correctly.

### Phase 3 — Polish
- Framer Motion across completion, level-up, page transitions.
- PWA manifest, service worker, install prompt.
- GitHub Actions workflow committed.
- Lighthouse pass to ≥90.
- Acceptance check: 7, 8, 9 pass.

### Phase 4 — Sync
- Octokit Gist client, save/load/diff/merge.
- Conflict banner, secret stripping, revoke flow.
- Acceptance check: 6 passes. 10 passes (README).

After each phase: commit, push, open the deployed site (after Phase 3), confirm acceptance, then proceed.

## 20. Working agreement

- Sentence case in every UI string.
- Every visible number runs through `Math.round` or `toLocaleString`.
- Every dialog dismisses with Esc and tapping outside.
- Every form has a hard error path with a real message — never silent failures.
- Every async path has a loading state and an error state.
- Confirm before destructive actions ("Reset all data", "Replace tomorrow's quests").
- Lighthouse mobile re-run after every phase. Regressions block the next phase.

Begin Phase 1 now. Confirm package versions before installing. After Phase 1 acceptance criteria 1–5 pass and you have a clean commit, stop and report before starting Phase 2.
