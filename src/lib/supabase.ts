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

// Map Supabase error messages to user-facing strings that never mention email
export function cleanAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many') || m.includes('over_email'))
    return 'Too many attempts — wait a minute and try again.';
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'Incorrect name or password.';
  if (m.includes('already registered') || m.includes('already exists') || m.includes('unique'))
    return 'That name is taken — choose another.';
  if (m.includes('not valid') || m.includes('invalid email'))
    return 'Player name contains invalid characters.';
  if (m.includes('password'))
    return msg; // pass through — password errors are shown under password field
  // Fallback: strip any raw email reference from unexpected messages
  return msg.replace(/@awaken\.io/gi, '').replace(/email/gi, 'player name');
}
