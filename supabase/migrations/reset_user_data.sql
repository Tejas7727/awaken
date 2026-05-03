-- =============================================================================
-- reset_user_data.sql
--
-- Clears all gameplay data while preserving accounts.
--
-- What this DOES reset:
--   - All rows in: quests, completions, whispers
--   - All profile gameplay fields: rank, xp, stats, streak, titles, etc.
--
-- What this DOES NOT touch:
--   - auth.users (accounts remain; users can still sign in)
--   - profiles.id, profiles.player_name, profiles.is_admin
--   - profiles.gender, profiles.hunter_path
--
-- Run this in the Supabase SQL Editor.
-- The entire operation is atomic — either all resets succeed or none do.
-- =============================================================================

BEGIN;

DELETE FROM public.quests;
DELETE FROM public.completions;
DELETE FROM public.whispers;

UPDATE public.profiles
SET
  rank                = 'F',
  player_level        = 1,
  total_xp            = 0,
  stats               = '{"STR":1,"AGI":1,"VIT":1,"INT":1,"WIS":1,"CHA":1}'::jsonb,
  stat_xp             = '{"STR":0,"AGI":0,"VIT":0,"INT":0,"WIS":0,"CHA":0}'::jsonb,
  streak              = 0,
  last_active_day     = null,
  current_chapter     = 1,
  current_floor       = 1,
  rest_days_remaining = 2,
  rest_days_resets_on = null,
  earned_title_ids    = '{}'::text[],
  onboarded_at        = null,
  updated_at          = now();

COMMIT;
