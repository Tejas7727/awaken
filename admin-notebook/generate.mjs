#!/usr/bin/env node
/**
 * Usage: node generate.mjs <hunter_export.json>
 *
 * Reads a Hunter's exported JSON (from the "Seal the day" export in the app),
 * fills in the prompt template, and copies the result to your clipboard.
 * Then paste into Claude or GPT, copy the response, and run:
 *   node push.mjs <hunter_id> <response.json>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S++'];

function adjacentRanks(rank) {
  const idx = RANK_ORDER.indexOf(rank);
  const lower = RANK_ORDER[Math.max(0, idx - 1)];
  const upper = RANK_ORDER[Math.min(RANK_ORDER.length - 1, idx + 1)];
  return { lower, upper };
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node generate.mjs <hunter_export.json>');
  process.exit(1);
}

const raw = readFileSync(resolve(inputPath), 'utf8');
const exportData = JSON.parse(raw);
const state = exportData.state;

const rank = state.rank ?? 'F';
const { lower: rankMinus1, upper: rankPlus1 } = adjacentRanks(rank);

// Collect recent quest titles from last 7 days
const recentTitles = state.lastSevenDays
  ?.flatMap((d) => d.completed ?? [])
  .filter(Boolean) ?? [];

const hunterJson = JSON.stringify(state, null, 2);

const template = readFileSync(new URL('./prompt-template.md', import.meta.url), 'utf8');

const prompt = template
  .replace('{HUNTER_JSON}', hunterJson)
  .replace(/{RANK}/g, rank)
  .replace(/{RANK_MINUS_1}/g, rankMinus1)
  .replace(/{RANK_PLUS_1}/g, rankPlus1)
  .replace('{HUNTER_PATH}', state.hunterPath ?? 'hunter')
  .replace('{GENDER}', state.gender ?? 'prefer_not')
  .replace('{FOCUS_AREAS}', JSON.stringify(state.focusAreas ?? []))
  .replace('{AVOIDANCES}', JSON.stringify(state.avoidances ?? []))
  .replace('{RECENT_TITLES}', JSON.stringify(recentTitles));

// Copy to clipboard (cross-platform best-effort)
try {
  const platform = process.platform;
  if (platform === 'darwin') {
    execSync('pbcopy', { input: prompt });
  } else if (platform === 'win32') {
    execSync('clip', { input: prompt });
  } else {
    execSync('xclip -selection clipboard', { input: prompt });
  }
  console.log('✓ Prompt copied to clipboard.');
} catch {
  console.log('Could not auto-copy. Prompt printed below:\n');
  console.log(prompt);
}

console.log(`\nHunter: ${state.rank ?? '?'}-rank · Level ${state.playerLevel ?? '?'} · Streak ${state.streak ?? 0}`);
console.log('\nPaste into Claude or GPT, copy the JSON response, then run:');
console.log(`  node push.mjs <hunter_user_id> <response.json>`);
