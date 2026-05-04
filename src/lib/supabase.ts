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
    return msg;
  return msg.replace(/@awaken\.io/gi, '').replace(/email/gi, 'player name');
}

// Snake_case row exactly as Postgres/PostgREST returns it
export interface ProfileRow {
  id: string;
  player_name: string;
  hunter_path: string;
  gender: string;
  rank: string;
  player_level: number;
  total_xp: number;
  stats: Record<string, number>;
  stat_xp: Record<string, number>;
  streak: number;
  last_active_day: string | null;
  current_chapter: number;
  current_floor: number;
  rest_days_remaining: number;
  rest_days_resets_on: string | null;
  earned_title_ids: string[];
  is_admin: boolean;
  leaderboard_optout: boolean;
  archive_gist_id: string | null;
  onboarded_at: string | null;
  focus_areas: string[];
  avoidances: string[];
  created_at: string;
  updated_at: string;
}

// Camel-case projection used by Zustand
export interface Profile {
  id: string;
  playerName: string;
  hunterPath: string;
  gender: string;
  rank: string;
  playerLevel: number;
  totalXp: number;
  stats: Record<string, number>;
  statXp: Record<string, number>;
  streak: number;
  lastActiveDay: string | null;
  currentChapter: number;
  currentFloor: number;
  restDaysRemaining: number;
  restDaysResetsOn: string | null;
  earnedTitleIds: string[];
  isAdmin: boolean;
  leaderboardOptout: boolean;
  archiveGistId: string | null;
  onboardedAt: string | null;
  focusAreas: string[];
  avoidances: string[];
  createdAt: string;
  updatedAt: string;
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id:                row.id,
    playerName:        row.player_name,
    hunterPath:        row.hunter_path,
    gender:            row.gender,
    rank:              row.rank,
    playerLevel:       row.player_level,
    totalXp:           row.total_xp,
    stats:             row.stats,
    statXp:            row.stat_xp,
    streak:            row.streak,
    lastActiveDay:     row.last_active_day,
    currentChapter:    row.current_chapter,
    currentFloor:      row.current_floor,
    restDaysRemaining: row.rest_days_remaining,
    restDaysResetsOn:  row.rest_days_resets_on,
    earnedTitleIds:    row.earned_title_ids,
    isAdmin:           row.is_admin,
    leaderboardOptout: row.leaderboard_optout,
    archiveGistId:     row.archive_gist_id,
    onboardedAt:       row.onboarded_at,
    focusAreas:        row.focus_areas ?? [],
    avoidances:        row.avoidances ?? [],
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

// Public profile row from the public_profile denormalized table
export interface PublicProfileRow {
  id: string;
  player_name: string;
  rank: string;
  player_level: number;
  current_floor: number;
  streak: number;
  earned_title_ids: string[];
  last_climb_at: string;
  hunter_path: string;
  updated_at: string;
}

// Whisper row from Supabase
export interface WhisperRow {
  id: string;
  user_id: string;
  body: string;
  kind: 'system' | 'peer' | 'admin';
  read_at: string | null;
  created_at: string;
}

// Fetch the full profile row for a given user ID and map it.
// Returns null if the row doesn't exist or RLS blocks it (logs the error).
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[awaken] fetchProfile error:', error.message, error.code);
    return null;
  }
  if (!data) {
    console.warn('[awaken] fetchProfile: no row for', userId);
    return null;
  }

  // I/O boundary — Supabase returns untyped JSON; cast via the ProfileRow interface
  const profile = mapProfile(data as unknown as ProfileRow);
  console.log('[awaken] profile loaded:', {
    isAdmin: profile.isAdmin,
    playerName: profile.playerName,
    rank: profile.rank,
  });
  return profile;
}
