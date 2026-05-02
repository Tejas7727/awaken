import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, key);
export const isSupabaseConfigured = Boolean(url && key);

// Derive a stable internal email from player name — never shown in UI
export function playerEmail(playerName: string) {
  return `${playerName.toLowerCase()}@awaken.game`;
}
