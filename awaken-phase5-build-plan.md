# Awaken — Phase 5: The Tower of Trials

A directive for Claude Code. Drop this file at the repo root next to `awaken-build-plan.md`. Then run `claude` in the repo and say:

> Read `awaken-phase5-build-plan.md`. Execute Phase 5A end-to-end. After 5A is committed, deployed, and acceptance criteria 5A.1–5A.6 pass on the live URL, stop and report. Do not start 5B until I confirm.

Phase 5 transforms the app from a single-player habit tracker with a cyberpunk skin into a small private guild climbing a Tower of Trials. The vision is **wow-on-open** — even an unauthenticated visitor should feel atmosphere before they see a login form.

---

## 1. Vision

The user opens the app. Before any UI, a 4-second cold open: the silhouette of a tall stone Tower revealed through drifting mist, a low ambient hum, candle-gold filaments lighting one floor at a time as the camera tilts upward. Two lines of Cinzel serif fade in and out: *"The Tower remembers everyone who climbs."* Then the mist clears and the login frame materializes — aged bronze, weathered parchment inside, two inputs and a single button: **Enter.**

After login, the same Tower remains as a faint background motif. The dashboard is now a Hunter's codex — quest cards as illuminated manuscript pages, stats as carved stone tablets, the XP bar as a thin gold filament filling a basin. Numbers in Space Grotesk. Quest titles in Cinzel. Body in Inter. Three fonts, each with one job.

The voice across every string in the app changes from utilitarian to bardic. *"Plank for 60 seconds"* becomes *"Hold the line for two minutes. The body wants to fall. The Tower asks how long you can refuse."* Every seed quest is rewritten. Every UI string is rewritten. Sentence case stays; the soul changes.

There are now multiple Hunters. They climb together. They see each other's ranks on a Tower floor map. They earn titles that other Hunters can see. The Quest Master (admin) curates packs through a notebook. The whole thing feels like a private order of friends ascending in parallel.

## 2. Hard constraints (still binding)

- **Hosting:** GitHub Pages frontend, Supabase free tier backend. Total monthly cost: $0.
- **Mobile-first:** Designed at 360px. PWA installable on iOS and Android.
- **Offline-capable:** Quest completion, stat updates, and reading must work fully offline. Sync when reconnected.
- **Type-safe:** TypeScript strict. No `any` except at I/O boundaries with a justifying comment.
- **Validated:** Every wire-format payload (login response, leaderboard rows, LLM imports, archive Gist payload) goes through Zod before reaching state.
- **No paid services:** Supabase free tier only. No Vercel, Firebase, analytics SaaS, or AI API calls from the bundle.
- **No secrets in the bundle:** Supabase anon key is fine (it's public by design with row-level security). Admin tokens, GitHub PATs, anything sensitive lives in localStorage or the admin notebook only.
- **Performance bar:** First Contentful Paint < 1.0s on 4G mobile. Time to Interactive < 1.8s. Total dist < 350 KB gzipped excluding fonts. Lighthouse mobile ≥ 92 across all four categories.

## 3. Tech stack additions

Add to existing stack:

| Concern | Pick |
|---|---|
| Auth + DB + realtime | `@supabase/supabase-js` |
| Server-side validation | Postgres row-level security (RLS) policies, no extra lib |
| Realtime sync | Supabase channels (websocket, included) |
| Cold-open animation | Framer Motion (already installed) + a single 60 KB inline SVG Tower |
| Display font | `@fontsource/cinzel` (variable, weight 400 + 500 only) |
| Body font | `@fontsource/inter` (already there) |
| Numeric font | `@fontsource-variable/space-grotesk` (already there) |
| Sound (optional) | Native `Audio` API, two ~6 KB ogg files |
| Fuzzy date formatting | `date-fns/formatDistanceToNow` (already installed) |

No new heavy dependencies. Total bundle stays under target.

## 4. Three sub-phases

Work strictly in order. Each sub-phase ends with a deploy to GitHub Pages and acceptance verification on the live URL before moving to the next.

| Phase | What ships | Visible to user |
|---|---|---|
| **5A** | Supabase wiring, auth, account migration, cold open, login screen | The login experience and wow-on-open. Existing dashboard otherwise unchanged. |
| **5B** | Tower aesthetic, font system, voice rewrite, rest-day, max-5-daily, title rarity, quest difficulty letters, rolling 90-day archive | The whole app looks and feels new. Still single-player. |
| **5C** | Leaderboard, Whispers feed, admin role + notebook, onboarding ritual, two narrative tracks, gender-aware generation | Multiplayer + Quest Master tools. Ready to invite friends. |

---

## 5. Phase 5A — Foundation

### 5A.1 Supabase project setup

Before writing any code, the developer (Tejas) must create a Supabase project. Claude Code prepares the schema and RLS policies and prints them as SQL the developer runs in the Supabase SQL Editor.

Required env vars (frontend, public — fine to expose):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Both go in `.env.local` (gitignored) for dev and as repo secrets for the GitHub Action. The deploy workflow injects them into the build.

### 5A.2 Database schema (Postgres, run in Supabase SQL Editor)

```sql
-- profiles: 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text unique not null,
  hunter_path text check (hunter_path in ('hunter','vanguard')) default 'hunter',
  gender text check (gender in ('male','female','nonbinary','prefer_not')) default 'prefer_not',
  rank text not null default 'F',
  player_level int not null default 1,
  total_xp int not null default 0,
  stats jsonb not null default '{"STR":1,"AGI":1,"VIT":1,"INT":1,"WIS":1,"CHA":1}'::jsonb,
  stat_xp jsonb not null default '{"STR":0,"AGI":0,"VIT":0,"INT":0,"WIS":0,"CHA":0}'::jsonb,
  streak int not null default 0,
  last_active_day date,
  current_chapter int not null default 1,
  current_floor int not null default 1,
  rest_days_remaining int not null default 2,
  rest_days_resets_on date,
  earned_title_ids text[] not null default array[]::text[],
  is_admin boolean not null default false,
  leaderboard_optout boolean not null default false,
  archive_gist_id text,
  archive_gist_token_hash text,  -- never store the raw PAT, only a hash for sanity check
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- public-readable subset for leaderboard. updated by trigger.
create table public.public_profile (
  id uuid primary key references public.profiles(id) on delete cascade,
  player_name text not null,
  rank text not null,
  player_level int not null,
  current_floor int not null,
  streak int not null,
  earned_title_ids text[] not null default array[]::text[],
  last_climb_at timestamptz,
  hunter_path text not null,
  updated_at timestamptz not null default now()
);

-- quests assigned to a user (current pool, not archive)
create table public.quests (
  id text primary key,  -- composite: ${user_id}_${slug}_${created_day}
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('daily','weekly','shadow','side','title','boss')),
  difficulty text not null check (difficulty in ('F','E','D','C','B','A','S','S++')),
  title text not null,
  prose text,             -- the bardic line under the title
  instruction text not null,  -- the measurable thing
  stats jsonb not null,
  xp int not null,
  tags text[] not null default array[]::text[],
  source text not null check (source in ('seed','llm','user','admin')) default 'admin',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  completed_at timestamptz,
  effective_day date
);

-- daily completion log (used by leaderboard "climbed today")
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id text not null,
  effective_day date not null,
  completed_at timestamptz not null default now(),
  xp_awarded int not null,
  stats_awarded jsonb not null
);

-- title definitions (shared across all users)
create table public.titles (
  id text primary key,
  name text not null,
  description text not null,
  rarity text not null check (rarity in ('common','rare','epic','legendary','mythic')),
  hidden boolean not null default false  -- hidden until earned
);

-- whispers: system messages per-user, optionally cross-user announcements
create table public.whispers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,  -- null = broadcast
  body text not null,
  kind text not null check (kind in ('system','milestone','peer','admin')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- indexes
create index quests_user_active on public.quests(user_id, expires_at) where completed_at is null;
create index completions_user_day on public.completions(user_id, effective_day);
create index whispers_user_unread on public.whispers(user_id, read_at) where read_at is null;
create index public_profile_floor on public.public_profile(current_floor desc, player_level desc);

-- triggers
create or replace function sync_public_profile() returns trigger as $$
begin
  insert into public.public_profile (id, player_name, rank, player_level, current_floor, streak, earned_title_ids, last_climb_at, hunter_path, updated_at)
  values (new.id, new.player_name, new.rank, new.player_level, new.current_floor, new.streak, new.earned_title_ids, now(), new.hunter_path, now())
  on conflict (id) do update set
    player_name = excluded.player_name,
    rank = excluded.rank,
    player_level = excluded.player_level,
    current_floor = excluded.current_floor,
    streak = excluded.streak,
    earned_title_ids = excluded.earned_title_ids,
    last_climb_at = case when new.streak > old.streak or new.player_level > old.player_level then now() else public_profile.last_climb_at end,
    hunter_path = excluded.hunter_path,
    updated_at = now();
  return new;
end; $$ language plpgsql security definer;

create trigger profiles_sync_public after insert or update on public.profiles
  for each row execute function sync_public_profile();
```

### 5A.3 Row-level security (run after the schema)

```sql
alter table public.profiles enable row level security;
alter table public.public_profile enable row level security;
alter table public.quests enable row level security;
alter table public.completions enable row level security;
alter table public.titles enable row level security;
alter table public.whispers enable row level security;

-- profiles: read your own + admins read all; write your own only
create policy profiles_self_read on public.profiles for select using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy profiles_self_write on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_self_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_admin_write on public.profiles for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- public_profile: anyone authenticated can read everyone's row, but only those who have not opted out
create policy public_profile_read on public.public_profile for select using (
  auth.role() = 'authenticated'
  and not exists (select 1 from public.profiles p where p.id = public_profile.id and p.leaderboard_optout)
);

-- quests: read your own; admins read all; write your own (completion only); admins create
create policy quests_self_read on public.quests for select using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy quests_self_complete on public.quests for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy quests_user_side on public.quests for insert with check (auth.uid() = user_id and type = 'side');
create policy quests_admin_insert on public.quests for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- completions: read your own; admins read all; write your own
create policy completions_self_read on public.completions for select using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy completions_self_write on public.completions for insert with check (auth.uid() = user_id);

-- titles: anyone authenticated reads; admins write
create policy titles_read on public.titles for select using (auth.role() = 'authenticated');
create policy titles_admin_write on public.titles for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- whispers: read your own + broadcasts; admins write any; system-generated via service role
create policy whispers_read on public.whispers for select using (user_id is null or auth.uid() = user_id);
create policy whispers_self_mark_read on public.whispers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy whispers_admin_write on public.whispers for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
```

### 5A.4 Auth flow

- Email + password (Supabase default). No magic links — they break offline-first.
- Player Name is set during sign-up and is unique. UI accepts only `[a-zA-Z0-9_-]{3,20}`.
- On sign-up, after auth, the app POSTs to a Postgres function `public.create_profile(player_name text)` that inserts into `profiles` using `auth.uid()`. If player_name collides, return error code mapped to a friendly message.
- On sign-in, the app fetches the profile and any pending quests, hydrates Zustand + IndexedDB, and routes to dashboard.
- Logout clears local DB and zustand, returns to cold-open.

### 5A.5 The cold open

`src/components/intro/ColdOpen.tsx` — the first thing every unauthenticated visitor sees.

Sequence over 4 seconds:

1. **0.0s** — black screen, faint stars (CSS-only, 30 dots with random opacity, no images).
2. **0.4s** — Tower silhouette fades in over 1.2s. SVG, ~60 KB inline. Tall stone tower with 8 floors, mist drifting at the base. Layered Bezier paths, no raster.
3. **1.0s** — first floor's window lights up (warm amber `#D4A553`), then second 0.3s later, third 0.3s later — climbing pattern up to the 5th floor by 2.4s.
4. **2.0s** — Cinzel serif text fades in centered: *"The Tower remembers everyone who climbs."* Letter-spacing 0.15em, font-size 22px, color `#E8DCC4`, 700ms fade-in, holds for 1.6s.
5. **3.6s** — text fades out, Tower slides up and dims to 30% opacity becoming a background.
6. **4.0s** — login frame materializes from below, slight scale-in 0.96 → 1.0, 400ms ease-out.

Honors `prefers-reduced-motion`: skips animations, shows final state immediately with a 200ms cross-fade. Also skips on second visit (sessionStorage flag — annoying to see every time). Long-press anywhere during the open replays it; useful for showing it off.

The Tower SVG: hand-drawn aesthetic, irregular stone block edges, slightly off-vertical. Not symmetrical. The asymmetry is the soul. Inline in the bundle, not fetched.

### 5A.6 Login screen

Inside an aged bronze frame: a 280px-wide parchment card, double border (outer bronze 2px, inner 0.5px hairline), corners visibly notched (clip-path). Two inputs: Player Name, Password. One button: **Enter.** Below: "First time? Awaken →" toggling to sign-up which adds a Confirm Password field and shows the validation rules.

Errors inline under each field, never as toast or alert. "That name is taken — choose another." / "Password must be at least 8 characters."

After successful auth: 600ms fade-out of the frame, dashboard fades in. No spinner.

### 5A.7 Local data migration

Existing local-only users (anyone who has used the app pre-Phase-5) lose nothing. On first launch after the update:

1. App detects the legacy IndexedDB schema (no `cloudUserId` field on the user row).
2. Shows a one-time screen: *"The Tower has expanded. Claim your account to bring your progress."* with a sign-up form pre-filled with their existing player name.
3. After sign-up, the app POSTs all existing data (user state, quests, completions, story unlocks, titles) to Supabase via a one-shot migration RPC.
4. On success, marks `migrated_at` in IndexedDB and routes to dashboard. The existing data is now in their cloud account.

Migration runs idempotently — re-running it twice is safe.

### 5A.8 Phase 5A acceptance criteria

5A is done when **all** of these pass on the deployed URL:

1. **5A.1** — Visiting the deployed URL while logged out shows the cold open exactly as specified, with the Tower SVG rendering crisply at 360px and 1440px widths, and reduced-motion users seeing the final state without animation.
2. **5A.2** — Sign-up with a fresh player name creates an `auth.users` row, a `profiles` row, and a corresponding `public_profile` row (verifiable in Supabase Studio).
3. **5A.3** — Sign-in with that account routes to the dashboard with all six stat tiles, current XP, and seed quests visible. Refresh keeps you logged in (session persisted).
4. **5A.4** — Logout returns to the cold open. Re-login restores the same state.
5. **5A.5** — A pre-Phase-5 local-only user sees the migration screen on first launch, can claim their data, and the cloud account has every quest completion they had locally.
6. **5A.6** — Lighthouse mobile run on the deployed login screen scores ≥ 92 on Performance and Accessibility. The cold open does not block Time to Interactive (TTI < 1.8s).

After 5A: commit, push, deploy, manually verify all six criteria, **stop and report.**

---

## 6. Phase 5B — Tower aesthetic + voice + rules

### 6.1 Design tokens

Replace `src/styles/tokens.css` entirely:

```css
:root {
  /* Dark mode (default) — Tower at night */
  --bg-base: #0F0A06;
  --bg-surface: #1A1410;
  --bg-elevated: #2B1F15;
  --bg-glow: rgba(212, 165, 83, 0.06);

  --border-subtle: rgba(212, 165, 83, 0.12);
  --border-strong: rgba(212, 165, 83, 0.28);
  --border-bronze: #B8924A;

  --accent-gold: #D4A553;
  --accent-gold-bright: #E8C168;
  --accent-bronze: #B8924A;
  --accent-ember: #C9663C;

  --text-primary: #E8DCC4;
  --text-secondary: rgba(232, 220, 196, 0.65);
  --text-tertiary: rgba(232, 220, 196, 0.4);
  --text-on-gold: #1A1410;

  /* Stat colors — earth-toned, cohesive with palette */
  --stat-str: #C9663C;  /* ember */
  --stat-agi: #8FA68A;  /* lichen */
  --stat-vit: #B8A05B;  /* aged brass */
  --stat-int: #6B7FA0;  /* slate blue */
  --stat-wis: #9D7BA8;  /* faded amethyst */
  --stat-cha: #C49080;  /* clay */

  --rarity-common: #8C7355;
  --rarity-rare: #6B7FA0;
  --rarity-epic: #9D7BA8;
  --rarity-legendary: #D4A553;
  --rarity-mythic: #C9663C;

  --difficulty-F: #6B5D45;
  --difficulty-E: #8C7355;
  --difficulty-D: #B8924A;
  --difficulty-C: #D4A553;
  --difficulty-B: #E8C168;
  --difficulty-A: #C9663C;
  --difficulty-S: #9D7BA8;
  --difficulty-Splus: #E8DCC4;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --font-display: 'Cinzel', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-numeric: 'Space Grotesk Variable', 'Space Grotesk', system-ui, sans-serif;
}

[data-theme="light"] {
  --bg-base: #F4EDDA;
  --bg-surface: #ECE2C5;
  --bg-elevated: #E0D2A8;
  --bg-glow: rgba(140, 111, 63, 0.06);

  --border-subtle: rgba(58, 46, 28, 0.12);
  --border-strong: rgba(58, 46, 28, 0.28);
  --border-bronze: #8C6F3F;

  --accent-gold: #8C6F3F;
  --accent-gold-bright: #B8924A;
  --accent-bronze: #5C4A2A;
  --accent-ember: #A04428;

  --text-primary: #3A2E1C;
  --text-secondary: rgba(58, 46, 28, 0.65);
  --text-tertiary: rgba(58, 46, 28, 0.4);
  --text-on-gold: #F4EDDA;

  --stat-str: #A04428;
  --stat-agi: #5A7355;
  --stat-vit: #8C6F3F;
  --stat-int: #4A5A78;
  --stat-wis: #6E5478;
  --stat-cha: #95604F;
}
```

Card surfaces use `--bg-surface` with `border: 0.5px solid var(--border-subtle)` and `border-radius: var(--radius-lg)`. **No gradients on card backgrounds.** The only gradient permitted in the entire app is on the rank badge (a 2-stop linear gradient from `--accent-gold` to `--accent-gold-bright`) and on the difficulty letter chip (same pattern, ramped per difficulty).

Shadow rule: no drop shadows. Replace with a single 0.5px hairline border in `--border-subtle`.

Glow rule: hover and focus states use a `box-shadow: 0 0 0 2px var(--bg-glow)` — soft inner-warmth glow, never neon.

### 6.2 Typography rules (strict)

| Where | Font | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| Cold-open quote | Cinzel | 500 | 22px | 0.15em |
| Page titles | Cinzel | 500 | 24px | 0.04em |
| Quest titles | Cinzel | 500 | 16px | 0.02em |
| Rank letter (hero) | Cinzel | 500 | 36px | 0.08em |
| Title pills | Cinzel | 500 | 11px | 0.12em |
| Body prose | Inter | 400 | 14-15px | normal |
| UI labels | Inter | 500 | 12-13px | normal |
| Numbers (XP, stats) | Space Grotesk | 500 | 14-32px | normal |

Cinzel is **never** used for paragraphs of body text. Inter is **never** used for rank letters or quest titles. This separation is the texture.

Sentence case everywhere except difficulty letters, rank letters, stat keys, and the cold-open quote (which uses no caps at all — see 5A.5).

### 6.3 Voice — rewrite all 22 seed quests

Replace `src/data/seed-quests.ts` entirely. Each quest now has `title` (the Cinzel one-liner), `prose` (the bardic line, Inter), and `instruction` (the measurable thing, Inter, slightly muted). Difficulty letter assigned. Daily quests capped at 5/day in the engine.

```ts
export const SEED_QUESTS = [
  // F-rank (gentle entry)
  { id: 'q_water',      type: 'daily',  difficulty: 'F', title: 'Quench the well',                  prose: 'The body remembers water before it remembers anything else.', instruction: 'Drink 2 L of water today.', stats: { VIT: 10 }, xp: 15, tags: ['hydration'] },
  { id: 'q_stretch',    type: 'daily',  difficulty: 'F', title: 'Loosen the tether',                prose: 'Tight muscle is forgotten armor. Take it off.', instruction: '20-min stretch session.', stats: { AGI: 8, VIT: 5 }, xp: 18, tags: ['mobility'] },
  { id: 'q_gratitude',  type: 'daily',  difficulty: 'F', title: 'Mark what is given',               prose: 'Three things you did not earn today. Write them.', instruction: 'Journal 3 things you are grateful for.', stats: { WIS: 6, CHA: 4 }, xp: 12, tags: ['reflection'] },

  // E-rank
  { id: 'q_walk6k',     type: 'daily',  difficulty: 'E', title: 'Walk among the living',            prose: 'Six thousand steps. Eyes off the screen, on the world.', instruction: 'Walk 6,000 steps before sundown.', stats: { AGI: 15 }, xp: 20, tags: ['movement','outdoor'] },
  { id: 'q_journal',    type: 'daily',  difficulty: 'E', title: 'Mark the day in ink',              prose: 'A page is enough. The Tower needs to know you were here.', instruction: 'Journal one full page.', stats: { WIS: 10 }, xp: 15, tags: ['reflection'] },
  { id: 'q_meditate',   type: 'daily',  difficulty: 'E', title: 'Sit beneath the noise',            prose: 'Ten minutes of stillness is louder than any answer you have been chasing.', instruction: 'Meditate 10 minutes.', stats: { WIS: 12 }, xp: 18, tags: ['mind'] },
  { id: 'q_sleep',      type: 'daily',  difficulty: 'E', title: 'Lay down the torch',               prose: 'The Tower is taller in the morning if you slept.', instruction: 'Lights out before 23:30.', stats: { VIT: 12 }, xp: 20, tags: ['recovery'] },

  // D-rank
  { id: 'q_read20',     type: 'daily',  difficulty: 'D', title: 'Read what the dead wrote',         prose: 'Twenty pages from someone who is no longer here. Inherit something.', instruction: 'Read 20 pages.', stats: { INT: 12 }, xp: 18, tags: ['learning'] },
  { id: 'q_focus30',    type: 'daily',  difficulty: 'D', title: 'Burn one candle clean',            prose: 'Thirty minutes. No phone, no tabs, no escape route.', instruction: '30-min focus block, phone in another room.', stats: { INT: 15 }, xp: 22, tags: ['deep-work'] },
  { id: 'q_pushups',    type: 'daily',  difficulty: 'D', title: 'Drive the floor away',             prose: 'Thirty pressings. Broken sets are still pressings.', instruction: '30 push-ups (broken sets ok).', stats: { STR: 12 }, xp: 18, tags: ['strength'] },
  { id: 'q_thanks',     type: 'side',   difficulty: 'D', title: 'Send a torch',                     prose: 'Tell someone what they gave you. They will not know unless you do.', instruction: 'Send a thank-you message.', stats: { CHA: 15 }, xp: 18, tags: ['social'] },
  { id: 'q_cook',       type: 'side',   difficulty: 'D', title: 'Feed yourself with your own hands', prose: 'A meal made by no one else, for no one else. The Tower will taste it.', instruction: 'Cook a meal from scratch.', stats: { VIT: 12, INT: 8 }, xp: 25, tags: ['skill'] },

  // C-rank
  { id: 'q_plank',      type: 'side',   difficulty: 'C', title: 'Hold the line',                    prose: 'The body wants to fall. The Tower asks how long you can refuse.', instruction: 'Plank for 2 minutes total.', stats: { STR: 15 }, xp: 20, tags: ['core'] },
  { id: 'q_pr',         type: 'daily',  difficulty: 'C', title: 'Cast one spell into the world',    prose: 'Code is the spell. Ship something today, even small.', instruction: 'Ship one PR for the side project.', stats: { INT: 25 }, xp: 35, tags: ['craft'] },
  { id: 'q_cold',       type: 'shadow', difficulty: 'C', title: 'Step into the cold',               prose: 'Sixty seconds. The body screams; that is the lesson.', instruction: 'Cold shower, 60 seconds at the end.', stats: { VIT: 15, STR: 10 }, xp: 30, tags: ['discomfort'] },
  { id: 'q_avoid',      type: 'shadow', difficulty: 'C', title: 'Name the thing you walked around', prose: 'Write what you avoided today, and why. Honesty is its own trial.', instruction: 'Journal entry: what you avoided and why.', stats: { WIS: 20 }, xp: 30, tags: ['reflection'] },

  // B-rank
  { id: 'q_run30',      type: 'side',   difficulty: 'B', title: 'Run until the noise quiets',       prose: 'Thirty minutes. The first ten lie. The next twenty teach.', instruction: '30-min run.', stats: { AGI: 25, STR: 10 }, xp: 35, tags: ['cardio'] },
  { id: 'q_compliment', type: 'shadow', difficulty: 'B', title: 'Speak the thing you would not',    prose: 'Tell a stranger what you noticed. The discomfort is the gate.', instruction: 'Compliment a stranger today.', stats: { CHA: 30 }, xp: 40, tags: ['social','vulnerable'] },
  { id: 'q_mirror',     type: 'shadow', difficulty: 'B', title: 'Speak across the glass',           prose: 'Five minutes. Tell yourself the day will go well, and mean it.', instruction: '5-min mirror talk: tell yourself today goes well.', stats: { CHA: 20, WIS: 10 }, xp: 30, tags: ['vulnerable'] },
  { id: 'q_reach',      type: 'shadow', difficulty: 'B', title: 'Cross the silence',                prose: 'Someone you have drifted from. Reach. They may not answer; that is not the trial.', instruction: 'Reach out to someone you have drifted from.', stats: { CHA: 35 }, xp: 45, tags: ['social','vulnerable'] },

  // Weekly (A-rank)
  { id: 'q_week_train', type: 'weekly', difficulty: 'A', title: 'Hold the body for a week',         prose: 'Four days of training in seven. The Tower watches consistency more than peaks.', instruction: 'Train 4 of 7 days this week.', stats: { STR: 30, AGI: 30 }, xp: 80, tags: ['consistency'] },
  { id: 'q_week_learn', type: 'weekly', difficulty: 'A', title: 'Finish a thing you started',       prose: 'One module, fully completed. Not skimmed. Not bookmarked. Finished.', instruction: 'Complete one full learning module.', stats: { INT: 50 }, xp: 80, tags: ['craft'] },
] as const;
```

Apply the same voice transformation rule to **every** UI string in the app, not just quests. Examples:

- "End day" → "Seal the day"
- "Today's quests" → "Trials before nightfall"
- "Settings" → "The Codex"
- "Stats" → "The Hunter's record"
- "Story" → "The chronicle"
- "Progress" → "The ascent"
- "Logout" → "Leave the Tower"
- "Reset all data" → "Forget your climb"
- Toast on quest complete → "The Tower remembers."
- Toast on level-up → "You have grown."
- Toast on rank-up → "The next floor opens."

Maintain a `src/lib/voice.ts` file as a single source for these strings. No inline copy in components.

### 6.4 The 8-rank system

Update `src/lib/progression.ts`:

```ts
export const RANKS = ['F','E','D','C','B','A','S','S++'] as const;

export const RANK_THRESHOLDS = [
  { rank: 'F',   sumStats: 6,    streak: 0,   floor: 1, label: 'Initiate' },
  { rank: 'E',   sumStats: 18,   streak: 3,   floor: 2, label: 'Aspirant' },
  { rank: 'D',   sumStats: 36,   streak: 7,   floor: 3, label: 'Trainee' },
  { rank: 'C',   sumStats: 66,   streak: 14,  floor: 4, label: 'Hunter' },
  { rank: 'B',   sumStats: 108,  streak: 21,  floor: 5, label: 'Adept' },
  { rank: 'A',   sumStats: 168,  streak: 30,  floor: 6, label: 'Champion' },
  { rank: 'S',   sumStats: 240,  streak: 60,  floor: 7, label: 'Ascendant' },
  { rank: 'S++', sumStats: 336,  streak: 100, floor: 8, label: 'Sovereign' },
] as const;
```

Quest difficulty letters (F–S++) are independent of user rank. The LLM picks difficulty appropriate for the user's current rank ± 1.

### 6.5 Rest-day mechanic

Each profile starts with `rest_days_remaining: 2` and `rest_days_resets_on: <next Monday>`. UI in the Codex (Settings) shows: *"You hold 2 rest tokens this week."*

A button on the dashboard (visible only if all 5 daily quests are still incomplete and at least one rest token remains): **"Rest the day."** Confirm dialog: *"The Tower respects rest. Streak holds. Are you sure?"* Yes → spend a token, mark today as rested in completions table with a special quest_id `__rest__`, streak does not break.

On reset day (Monday), tokens reset to 2.

### 6.6 Title rarity tiers

Replace `src/data/titles.ts`:

```ts
export const TITLE_RULES = [
  // Common
  { id: 'first_step',   name: 'First Step',     desc: 'Complete your first trial',                   rarity: 'common',    rule: (s) => s.totalXp > 0 },
  { id: 'shadow_step',  name: 'Shadow Step',    desc: 'Complete your first Shadow Trial',             rarity: 'common',    rule: (s, ctx) => ctx.shadowCompletions >= 1 },

  // Rare
  { id: 'iron_will',    name: 'Iron Will',      desc: 'Hold a 7-day streak',                          rarity: 'rare',      rule: (s) => s.streak >= 7 },
  { id: 'dawn_walker',  name: 'Dawn Walker',    desc: 'Complete 5 trials before 9 AM',                rarity: 'rare',      rule: (s, ctx) => ctx.morningCompletions >= 5 },
  { id: 'first_gate',   name: 'First Gate',     desc: 'Reach D-rank',                                 rarity: 'rare',      rule: (s) => RANKS.indexOf(s.rank) >= RANKS.indexOf('D') },

  // Epic
  { id: 'shadow_walker', name: 'Shadow Walker', desc: 'Complete 10 Shadow Trials',                    rarity: 'epic',      rule: (s, ctx) => ctx.shadowCompletions >= 10 },
  { id: 'awakened',     name: 'Awakened',       desc: 'Reach C-rank',                                  rarity: 'epic',      rule: (s) => RANKS.indexOf(s.rank) >= RANKS.indexOf('C') },
  { id: 'unbroken_30',  name: 'Unbroken',       desc: 'Hold a 30-day streak',                          rarity: 'epic',      rule: (s) => s.streak >= 30 },

  // Legendary
  { id: 'champion',     name: 'Champion',       desc: 'Reach A-rank',                                  rarity: 'legendary', rule: (s) => RANKS.indexOf(s.rank) >= RANKS.indexOf('A') },
  { id: 'polymath',     name: 'Polymath',       desc: 'Every stat at level 10 or higher',              rarity: 'legendary', rule: (s) => Object.values(s.stats).every((v) => v >= 10), hidden: true },

  // Mythic
  { id: 'sovereign',    name: 'Sovereign',      desc: 'Reach S++',                                     rarity: 'mythic',    rule: (s) => s.rank === 'S++', hidden: true },
  { id: 'unbroken_100', name: 'Unbroken (Mythic)', desc: 'Hold a 100-day streak',                       rarity: 'mythic',    rule: (s) => s.streak >= 100, hidden: true },
  { id: 'first_through', name: 'First Through', desc: 'First in your guild to reach a new rank',       rarity: 'mythic',    rule: (s, ctx) => ctx.firstInGuildAtRank === s.rank, hidden: true },
];
```

Hidden titles render as `???` until earned. Each rarity has a different border color (see tokens). Mythic titles get a slow 4s ambient pulse animation on their pill.

### 6.7 Daily quest cap and rollover

Engine enforces: max 5 active dailies at any time. The LLM is instructed to send 4-5 dailies per pack. If a pack contains 6+, the import preview rejects with "Too many dailies — the Tower asks for 5 at most."

At rollover (configurable hour, default 04:00): all uncompleted dailies expire and are deleted from the active pool. Completions remain logged. If today's daily count is already < 5 at rollover (because the user completed some), the LLM pack for tomorrow brings it back to 5.

Title quests and weekly quests have their own `expires_at` timestamps and tougher requirements. Their cards show a live countdown.

### 6.8 Rolling 90-day archive

Background job runs once per app launch (debounced to once per 24h):

1. Query completions older than 90 days.
2. If any exist and the user has a configured `archive_gist_id`, fetch the current archive Gist, append the old completions, push back, then delete from local IndexedDB.
3. If no Gist configured, prompt once on the Codex page: *"Your chronicle grows long. Bind the older pages to the cloud?"* with a GitHub PAT input.

Local IndexedDB never holds more than 90 days of completions. The History page lazy-loads from the Gist when the user scrolls past day 90.

### 6.9 Phase 5B acceptance criteria

5B is done when **all** of these pass on the deployed URL:

1. **5B.1** — Theme toggle in the Codex flips between dark and light, and both modes render every page without color-contrast violations (axe DevTools clean).
2. **5B.2** — Cinzel renders for all rank letters, quest titles, and the cold-open quote. No Inter mistakenly used for those. No Cinzel mistakenly used for body prose.
3. **5B.3** — Every UI string in the app uses Tower voice. Spot-check: dashboard, quest cards, settings page, toasts, errors. No remnants of "End day", "Settings", or "Today's quests".
4. **5B.4** — Daily quest count is hard-capped at 5. Attempting to import 6+ dailies shows a rejection message naming the limit. At rollover, uncompleted dailies are gone.
5. **5B.5** — Rest-day button appears when conditions are met, spends a token, preserves streak, marks rested in the completions log. Tokens reset on Monday.
6. **5B.6** — Titles render with rarity-tier styling. Hidden titles show as `???` until earned. Mythic titles have the ambient pulse.
7. **5B.7** — Archive flow works: a user with 100+ days of completions archives the older 10+ days to a Gist, local IndexedDB shrinks, History page can read them back.
8. **5B.8** — Lighthouse mobile re-runs ≥ 92 on Performance, Accessibility, Best Practices, PWA. Bundle size still under 350 KB gzipped.

After 5B: commit, push, deploy, manually verify all eight criteria, **stop and report.**

---

## 7. Phase 5C — Multiplayer + admin

### 7.1 The leaderboard — Tower floor map

A new page at `/tower` (in voice: **The Tower**). Renders an SVG of the same Tower from the cold open, but now interactive. Each floor is a horizontal band. User tokens (small portrait roundels with the Hunter's first initial inside) sit on their current floor. Hover/tap a token: a card slides up from below showing public profile.

Real-time: subscribe to the `public_profile` table via Supabase channel. When anyone's `current_floor` changes, their token animates upward with a 600ms ease-in-out. When they earn a new title, a small gold mote drifts up briefly.

Empty state: Tower stands alone. *"You climb alone for now. Invite a Hunter."*

Sorting: within a floor, by `player_level` desc, then `streak` desc.

Privacy: Hunters who set `leaderboard_optout = true` do not appear at all. Their absence is not announced.

### 7.2 Whispers feed

A new page at `/whispers`. List view, latest first. Three kinds:

- **System:** Generated client-side by a small rules engine. *"You have completed 7 Shadow Trials. The mirror is becoming familiar."* Triggered by milestones. Stored in `whispers` table with `kind = 'system'`.
- **Peer:** Generated server-side by a Postgres trigger when another Hunter ranks up or earns a Mythic title. *"Hunter Maya reached B-rank. She started 3 days after you did."* Anonymized dates if peer prefers.
- **Admin:** Sent by the Quest Master via the admin notebook. *"A new boss trial begins on Monday. Sharpen your blade."*

Realtime: Supabase channel on `whispers` filtered by `user_id = me OR user_id IS NULL`. New whispers slide in from the top with a soft 700ms fade.

Bell icon in the AppShell header shows unread count. Reading a whisper marks it `read_at = now()`.

### 7.3 Onboarding ritual

After successful sign-up (replaces the migration screen for new users, runs after migration for legacy users):

1. *"What name shall the Tower record?"* — Player Name input (already collected during sign-up; this just confirms and offers a chance to change once).
2. *"Which path calls you?"* — Two cards side by side: **The Hunter** (solo, internal) and **The Vanguard** (communal, leadership). Each has a 2-line description in Cinzel + Inter. Pick one.
3. *"What does your body need?"* — Multi-select chips: Strength · Endurance · Mobility · Recovery · None of these. Stored as tags for the LLM.
4. *"What does your mind avoid?"* — Multi-select chips: Solitude · Discomfort · Vulnerability · Failure · None of these. Stored as tags.
5. *"How shall the Tower address you?"* — Gender select: He · She · They · Prefer not to say. Stored. Used by the LLM to scale physical quests appropriately.

The flow is a sequence of full-screen panels with a 500ms slide transition. Skippable with a discreet "Skip the ritual" link bottom-right; defaults are saved if skipped.

After completion, the dashboard fades in with the user's first quest pack (auto-generated by a default LLM template that uses their answers).

### 7.4 Two narrative tracks

In `src/data/chapters.ts`, replace the single chapter list with two tracks:

```ts
export const HUNTER_CHAPTERS = [
  { chapter: 1, title: 'The Awakening', track: 'hunter', nodes: [
    { id: 'h_ch1_n1', body: 'You walked into the Tower because no one came to find you. Good. The climb belongs to you alone.', unlockAtPlayerLevel: 1 },
    { id: 'h_ch1_n2', body: 'A trial appears. You complete it. Something settles into place — small, but real.', unlockAtPlayerLevel: 3 },
    { id: 'h_ch1_n3', body: 'For the first time, you understand: the Tower is not testing you. It is waiting.', unlockAtPlayerLevel: 5 },
    { id: 'h_ch1_n4', body: 'You finish the day stronger than you woke. Tomorrow, you will be different.', unlockAtPlayerLevel: 8 },
  ]},
  // chapters 2-8 follow, one per floor, written in the same solo voice
];

export const VANGUARD_CHAPTERS = [
  { chapter: 1, title: 'The Awakening', track: 'vanguard', nodes: [
    { id: 'v_ch1_n1', body: 'The others look to you not because you are strong, but because you are climbing. Do not look back. They will follow if they choose.', unlockAtPlayerLevel: 1 },
    { id: 'v_ch1_n2', body: 'A trial appears. You complete it. Somewhere, another Hunter sees and decides to begin.', unlockAtPlayerLevel: 3 },
    { id: 'v_ch1_n3', body: 'The Tower does not need your leadership. It will record it anyway.', unlockAtPlayerLevel: 5 },
    { id: 'v_ch1_n4', body: 'You finish the day. Three Hunters finished theirs because of you.', unlockAtPlayerLevel: 8 },
  ]},
  // chapters 2-8 follow, in the communal voice
];
```

Both tracks have 8 chapters total (one per rank). Each chapter has 4–6 nodes. Body strings are gender-neutral, age-neutral, descriptive of action and feeling rather than appearance. Track switch allowed once per rank, in the Codex.

### 7.5 The admin LLM notebook

Create `admin-notebook/` at the repo root. Not bundled into the app — it's a developer-only tool.

```
admin-notebook/
├── README.md
├── prompt-template.md     # the master prompt
├── generate.mjs           # cli: format export → open in browser/terminal for paste-into-LLM
├── push.mjs               # cli: validate JSON response, push to Supabase
├── examples/
│   ├── input-c-rank-male-strength.json
│   ├── output-c-rank-male-strength.json
│   └── input-d-rank-female-mobility.json
└── package.json           # only deps: @supabase/supabase-js, zod, dotenv
```

`prompt-template.md` content:

```
You are the Quest Master of the Tower of Trials. Generate the next quest pack for a Hunter.

# Hunter context
{HUNTER_JSON}

# Rules (non-negotiable)
- Output exactly 5 daily quests, 0-1 weekly quests (only on Monday), and 0-1 shadow trials (every 3 days).
- Match the difficulty band: Hunter is rank {RANK}, so quest difficulties should be in the band {RANK_MINUS_1} to {RANK_PLUS_1}, weighted toward {RANK}.
- Respect their hunter_path ({HUNTER_PATH}). Solo Hunters get inward-facing trials. Vanguards get trials that subtly invite leadership or witness.
- Respect their gender ({GENDER}). Do not assume body type or capacity. "30 push-ups" is not appropriate for every Hunter; offer alternatives like "30 cumulative reps of any pressing motion" or scale the count.
- Respect their focus_areas ({FOCUS_AREAS}) and avoidances ({AVOIDANCES}). At least 3 of the 5 dailies should touch their focus areas. At most 1 daily should touch an avoidance, and only if difficulty is in their band.
- No quest title may repeat from the last 7 days (the cooldown list is in {RECENT_TITLES}).
- Voice: Tower-bardic. Each quest has:
  - title (Cinzel-style, sentence case, ≤60 chars, evocative)
  - prose (one Inter line, ≤140 chars, second-person, addresses the Hunter)
  - instruction (one Inter line, ≤80 chars, measurable and concrete)
- xp: scale to difficulty. F=10-15, E=15-20, D=18-25, C=25-35, B=35-50, A=60-90, S=90-150, S++=150-250.
- stats: each quest awards 1-3 stats. Awards must total close to xp/2.

# Output format (JSON only, no prose, no markdown fences)
{
  "quests": [...],
  "story_beat": "optional 1-2 sentence narrative continuation of the Hunter's chapter, or null",
  "title_award": { "id": "...", "name": "...", "reason": "..." } or null,
  "whisper": "optional system whisper to send to the Hunter, or null"
}
```

`generate.mjs` reads a Hunter's exported JSON from a file path arg, fills in the placeholders, copies the resulting prompt to clipboard, and prints: *"Prompt copied. Paste into Claude or GPT, copy the response, then run `node push.mjs <hunter_id> <response_path>`."*

`push.mjs` reads the response JSON, validates against the same Zod schema the app uses, and on pass writes the quests to Supabase via the admin service-role key (kept in `admin-notebook/.env`, gitignored). On title award or whisper, also writes those rows.

The admin Hunter (you) gets a button in the Codex: **Quest Master tools.** Visible only when `is_admin = true`. Lists every Hunter, last quest pack date, "Generate next pack" link that exports their JSON to clipboard ready for the notebook.

### 7.6 Phase 5C acceptance criteria

5C is done when **all** of these pass on the deployed URL:

1. **5C.1** — Sign up two test accounts. Both appear on the Tower floor map. Promoting one's `current_floor` in Supabase Studio causes the other's app to animate the token upward in real time.
2. **5C.2** — Onboarding ritual runs for a fresh sign-up, captures all 5 inputs, persists to the profile, and the first quest pack is auto-generated using those answers.
3. **5C.3** — Picking the Vanguard track shows Vanguard chapter nodes; switching to Hunter in the Codex switches the visible chronicle.
4. **5C.4** — Whispers page receives a system whisper after completing a milestone (e.g. 5th Shadow Trial). Bell icon shows unread count. Marking read clears it.
5. **5C.5** — As an admin Hunter, the Quest Master tools list every other Hunter and let you export their JSON. Running the notebook locally and pushing produces fresh quests in their account within 5 seconds.
6. **5C.6** — A Hunter who sets `leaderboard_optout = true` disappears from the Tower for everyone, and their public_profile row is filtered out at the RLS layer (not just the UI).
7. **5C.7** — Race condition test: two Hunters complete their last daily quest simultaneously. Both see the "Tower remembers" toast. Neither's data corrupts. Streaks update independently.
8. **5C.8** — Lighthouse mobile ≥ 92 across all categories. Bundle still under 350 KB gzipped excluding fonts. The Tower SVG and the leaderboard subscription do not regress TTI past 1.8s on 4G throttled.

After 5C: commit, push, deploy, manually verify all eight criteria, **stop and report.**

---

## 8. Working agreement (still binding)

- Sentence case in every UI string except the protected exceptions in 6.2.
- Every visible number runs through `Math.round` or `toLocaleString`.
- Every dialog dismisses with Esc and tap-outside.
- Every form has an inline error path with a real message — no silent failures, no toasts for form errors.
- Every async path has a loading state and an error state.
- Confirm before destructive actions ("Forget your climb", "Leave the Tower", spending a rest token).
- Lighthouse mobile re-run after every sub-phase. Regressions block the next sub-phase.
- All RLS policies tested with a non-admin account before each deploy. **Never disable RLS on any table.**
- Supabase service role key never leaves the admin notebook environment. Never imported into the bundled app code.
- Admin notebook commits exclude `.env`, `.env.local`, and any output JSON files (gitignore them explicitly).
- Theme tokens are the only color authority. No hardcoded hex values in components except for the cold-open SVG's bronze and amber, which are baked into the asset.

## 9. What "amazing" means in this build

The bar is: a friend opens the URL on their phone, watches the cold open, signs up, completes their first quest, and texts you about it unprompted within 24 hours. If that does not happen, the build is not done. Polish until it does.

Begin Phase 5A now. Do not start 5B until 5A passes acceptance on the live URL and I confirm. Do not start 5C until 5B passes acceptance on the live URL and I confirm.
