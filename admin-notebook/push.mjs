#!/usr/bin/env node
/**
 * Usage: node push.mjs <hunter_user_id> <response.json>
 *
 * Validates the LLM response JSON against the quest schema, then pushes
 * quests, optional title award, and optional whisper to Supabase using the
 * service-role key from admin-notebook/.env
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const hunterId = process.argv[2];
const responsePath = process.argv[3];

if (!hunterId || !responsePath) {
  console.error('Usage: node push.mjs <hunter_user_id> <response.json>');
  process.exit(1);
}

// ── Schema ────────────────────────────────────────────────────────────────────

const QuestSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['daily', 'weekly', 'shadow', 'side', 'boss']),
  difficulty: z.enum(['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S++']).optional(),
  title: z.string().min(1).max(60),
  description: z.string().max(140).optional(),
  instruction: z.string().max(80).optional(),
  stats: z.record(z.number().int().min(0).max(200)),
  xp: z.number().int().min(1).max(500),
  tags: z.array(z.string()).default([]),
});

const ResponseSchema = z.object({
  quests: z.array(QuestSchema).min(1).max(12),
  storyBeat: z.string().max(400).nullable().optional(),
  titleAward: z.object({
    id: z.string(),
    name: z.string(),
    reason: z.string(),
  }).nullable().optional(),
  whisper: z.string().max(300).nullable().optional(),
});

// ── Parse & Validate ──────────────────────────────────────────────────────────

const raw = readFileSync(resolve(responsePath), 'utf8');
let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  console.error('Response is not valid JSON.');
  process.exit(1);
}

const result = ResponseSchema.safeParse(parsed);
if (!result.success) {
  console.error('Validation failed:');
  result.error.errors.forEach((e) => {
    console.error(`  [${e.path.join('.')}] ${e.message}`);
  });
  process.exit(1);
}

const data = result.data;
console.log(`✓ Validated: ${data.quests.length} quests`);

// ── Push to Supabase ──────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const now = new Date().toISOString();

// Insert quests
const questRows = data.quests.map((q) => ({
  id: q.id,
  user_id: hunterId,
  type: q.type,
  difficulty: q.difficulty ?? null,
  title: q.title,
  prose: q.description ?? null,
  instruction: q.instruction ?? null,
  stats: q.stats,
  xp: q.xp,
  tags: q.tags,
  source: 'admin',
  created_at: now,
  expires_at: null,
}));

const { error: questError } = await supabase.from('quests').upsert(questRows);
if (questError) {
  console.error('Quest insert failed:', questError.message);
  process.exit(1);
}
console.log(`✓ Pushed ${questRows.length} quests for hunter ${hunterId}`);

// Insert title award
if (data.titleAward) {
  const { error: titleError } = await supabase.from('titles').upsert({
    id: data.titleAward.id,
    name: data.titleAward.name,
    description: data.titleAward.reason,
    user_id: hunterId,
    earned_at: now,
  });
  if (titleError) console.warn('Title upsert warning:', titleError.message);
  else console.log(`✓ Title awarded: ${data.titleAward.name}`);
}

// Insert whisper
if (data.whisper) {
  const { error: whisperError } = await supabase.from('whispers').insert({
    user_id: hunterId,
    body: data.whisper,
    kind: 'admin',
  });
  if (whisperError) console.warn('Whisper insert warning:', whisperError.message);
  else console.log('✓ Whisper sent');
}

console.log('\nDone. Quests will appear in the Hunter\'s app within 5 seconds via realtime.');
