# Awaken

A solo-leveling habit tracker. Real-life habits become quests; quests award XP and stat points; stats unlock ranks (E → SSS) and narrative story beats. Built as a static PWA — no backend, no accounts, no subscriptions.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:5173/awaken/
pnpm build      # dist/ ready for GitHub Pages
```

## The LLM quest loop

Awaken uses any LLM (Claude, ChatGPT, Gemini) as a quest master to generate personalised daily quests. Here is the full loop:

### 1. Export your state

On the Home page, tap **End day → Export ↗**.

The app copies a JSON pack to your clipboard. It contains your current rank, stats, 7-day history, active story chapter, and a canned system prompt telling the LLM exactly what to produce.

### 2. Paste into your LLM

Open Claude (claude.ai), ChatGPT, or any chat LLM. Paste the clipboard contents as your message and send.

The LLM responds with a single JSON object — no prose, no markdown fences.

### 3. Import the response

On the **Quests page**, paste the LLM response into the import field and tap **Preview**.

The app validates the JSON against a strict schema:
- Rejects any daily quest with XP > 100 (anti-jackpot guard)
- Rejects if total daily XP exceeds 200
- Shows the exact failing field if the schema is wrong

Review the preview: new quests, any story beat, any title award. Tap **Confirm** to apply.

### 4. Play the new day

Complete quests via the checkbox. Each completion awards XP and stat points instantly. The XP bar fills; stats level up; rank advances when thresholds are met.

---

## GitHub Gist sync (optional)

Syncs your data across devices using a private GitHub Gist. No server required.

1. Create a GitHub Personal Access Token with **gist** scope at github.com/settings/tokens
2. Open **Settings → GitHub sync** and paste the token
3. The app finds or creates a private gist named `awaken-sync.json`
4. Data syncs automatically 30 seconds after any quest completion and on page close
5. On a second device, enter the same PAT — the app finds the existing gist and offers to merge

The PAT is never written to the gist. Tap **Revoke and clear** to disconnect.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard — stats, today's quests, streak, XP bar |
| `/quests` | All quests grouped by type; add custom side quests |
| `/stats` | Per-stat levels, 30-day line chart, tag contributions |
| `/story` | Narrative beats unlocked by levelling up |
| `/progress` | 90-day heatmap, 7-day chart, top quests by completions |
| `/settings` | Rules, focus areas, theme, GitHub sync, reset |

## PWA install

- **Android (Chrome):** tap the install icon in the address bar or the browser menu → Add to Home screen
- **iOS (Safari):** tap Share → Add to Home Screen

The app works fully offline after first load.

## Tech stack

Vite · React 18 · TypeScript · Tailwind CSS · Dexie (IndexedDB) · Zustand · Zod · React Router 6 · Recharts · Framer Motion · vite-plugin-pwa · @octokit/rest
