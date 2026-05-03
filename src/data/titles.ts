import type { UserState } from '../lib/schemas';
import { RANKS } from '../lib/progression';

export type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

interface TitleContext {
  morningCompletions: number;
  shadowCompletions: number;
  firstInGuildAtRank?: string;
}

export const TITLE_RULES: Array<{
  id: string;
  name: string;
  desc: string;
  rarity: TitleRarity;
  hidden?: boolean;
  rule: (s: UserState, ctx: TitleContext) => boolean;
}> = [
  // Common
  { id: 'first_step',   name: 'First Step',        desc: 'Complete your first trial',                 rarity: 'common',    rule: (s) => s.totalXp > 0 },
  { id: 'shadow_step',  name: 'Shadow Step',        desc: 'Complete your first shadow trial',          rarity: 'common',    rule: (_s, ctx) => ctx.shadowCompletions >= 1 },

  // Rare
  { id: 'iron_will',    name: 'Iron Will',          desc: 'Hold a 7-day streak',                       rarity: 'rare',      rule: (s) => s.streak >= 7 },
  { id: 'dawn_walker',  name: 'Dawn Walker',        desc: 'Complete 5 trials before 9 AM',             rarity: 'rare',      rule: (_s, ctx) => ctx.morningCompletions >= 5 },
  { id: 'first_gate',   name: 'First Gate',         desc: 'Reach D-rank',                              rarity: 'rare',      rule: (s) => RANKS.indexOf(s.rank as typeof RANKS[number]) >= RANKS.indexOf('D') },

  // Epic
  { id: 'shadow_walker',name: 'Shadow Walker',      desc: 'Complete 10 shadow trials',                 rarity: 'epic',      rule: (_s, ctx) => ctx.shadowCompletions >= 10 },
  { id: 'awakened',     name: 'Awakened',           desc: 'Reach C-rank',                              rarity: 'epic',      rule: (s) => RANKS.indexOf(s.rank as typeof RANKS[number]) >= RANKS.indexOf('C') },
  { id: 'unbroken_30',  name: 'Unbroken',           desc: 'Hold a 30-day streak',                      rarity: 'epic',      rule: (s) => s.streak >= 30 },

  // Legendary
  { id: 'champion',     name: 'Champion',           desc: 'Reach A-rank',                              rarity: 'legendary', rule: (s) => RANKS.indexOf(s.rank as typeof RANKS[number]) >= RANKS.indexOf('A') },
  { id: 'polymath',     name: 'Polymath',           desc: 'Every stat at level 10 or higher',          rarity: 'legendary', hidden: true, rule: (s) => Object.values(s.stats).every((v) => v >= 10) },

  // Mythic
  { id: 'sovereign',    name: 'Sovereign',          desc: 'Reach S++',                                 rarity: 'mythic',    hidden: true, rule: (s) => s.rank === 'S++' },
  { id: 'unbroken_100', name: 'Unbroken (Mythic)',  desc: 'Hold a 100-day streak',                     rarity: 'mythic',    hidden: true, rule: (s) => s.streak >= 100 },
];

export const RARITY_COLOR: Record<TitleRarity, string> = {
  common:    'var(--rarity-common)',
  rare:      'var(--rarity-rare)',
  epic:      'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
  mythic:    'var(--rarity-mythic)',
};
