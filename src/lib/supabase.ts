import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, key);
export const isSupabaseConfigured = Boolean(url && key);

// Derive a stable internal email from player name — never shown in UI
// .io is a valid IANA TLD; Supabase accepts it without issues
export function playerEmail(playerName: string) {
  return `${playerName.toLowerCase()}@awaken.io`;
}

// Strip any mention of the internal email from Supabase error messages
export function cleanAuthError(msg: string): string {
  return msg
    .replace(/email\s+address\s+["'][^"']*["']\s+is\s+not\s+valid\.?/gi, 'Player name contains invalid characters.')
    .replace(/email/gi, 'player name')
    .replace(/@awaken\.io/gi, '');
}
