# Awaken Admin Notebook

Developer-only CLI for generating and pushing quest packs via LLM.

## Setup

```bash
cd admin-notebook
npm install
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

## Workflow

### 1. Export a Hunter's context

In the app (admin account), go to the Codex → Quest Master tools and click  
**"Export context"** next to the Hunter's name. This copies their JSON to clipboard.  
Save it as e.g. `hunter-kingodhell.json`.

Or export your own pack from the dashboard ("Seal the day" button).

### 2. Generate the prompt

```bash
node generate.mjs hunter-kingofhell.json
```

This fills in the prompt template and copies it to your clipboard.

### 3. Paste into Claude or GPT

Paste the prompt. The model responds with a JSON object.  
Copy the JSON response and save it as e.g. `response.json`.

### 4. Push to Supabase

```bash
node push.mjs <hunter_user_id> response.json
```

Validates the JSON against the quest schema and writes quests (+ optional title + whisper) to Supabase. The Hunter's app receives them via realtime within 5 seconds.

## Files

| File | Purpose |
|------|---------|
| `prompt-template.md` | Master prompt with `{PLACEHOLDERS}` |
| `generate.mjs` | Fill template → clipboard |
| `push.mjs` | Validate response → Supabase |
| `examples/` | Sample input/output pairs |
| `.env` | Supabase credentials (gitignored) |

## .env format

```
SUPABASE_URL=https://xmfhqkbaghggholobyck.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
