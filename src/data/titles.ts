import type { UserState } from '../lib/schemas';

interface TitleContext {
  morningCompletions: number;
  shadowCompletions: number;
}

export const TITLE_RULES: Array<{
  id: string;
  name: string;
  desc: string;
  rule: (s: UserState, ctx: TitleContext) => boolean;
}> = [
  { id: 'first_step',  name: 'First Step',  desc: 'Complete your first quest',        rule: (s) => s.totalXp > 0 },
  { id: 'iron_will',   name: 'Iron Will',   desc: '7-day streak',                      rule: (s) => s.streak >= 7 },
  { id: 'unbroken',    name: 'Unbroken',    desc: '30-day streak',                     rule: (s) => s.streak >= 30 },
  { id: 'dawn_walker', name: 'Dawn Walker', desc: '5 quests completed before 9 AM',    rule: (_s, ctx) => ctx.morningCompletions >= 5 },
  { id: 'shadow_step', name: 'Shadow Step', desc: 'Complete your first shadow quest',  rule: (_s, ctx) => ctx.shadowCompletions >= 1 },
  { id: 'first_gate',  name: 'First Gate',  desc: 'Reach D rank',                      rule: (s) => ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].includes(s.rank) },
  { id: 'awakened',    name: 'Awakened',    desc: 'Reach C rank',                      rule: (s) => ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(s.rank) },
  { id: 'polymath',    name: 'Polymath',    desc: 'Every stat at level 10+',           rule: (s) => Object.values(s.stats).every((v) => v >= 10) },
];
