export const SEED_QUESTS = [
  // Daily — body
  { id: 'q_water',      type: 'daily',  title: 'Drink 2 L of water',                              stats: { VIT: 10 },             xp: 15, tags: ['hydration'] },
  { id: 'q_walk6k',     type: 'daily',  title: 'Walk 6,000 steps',                                stats: { AGI: 15 },             xp: 20, tags: ['movement', 'outdoor'] },
  { id: 'q_stretch',    type: 'daily',  title: '20-min stretch session',                          stats: { AGI: 8, VIT: 5 },      xp: 18, tags: ['mobility'] },
  { id: 'q_pushups',    type: 'daily',  title: '30 push-ups (broken sets ok)',                     stats: { STR: 12 },             xp: 18, tags: ['strength'] },
  { id: 'q_sleep',      type: 'daily',  title: 'Lights out before 23:30',                         stats: { VIT: 12 },             xp: 20, tags: ['recovery'] },
  // Daily — mind
  { id: 'q_meditate',   type: 'daily',  title: '10-min meditation',                               stats: { WIS: 12 },             xp: 18, tags: ['mind'] },
  { id: 'q_journal',    type: 'daily',  title: 'Journal one page',                                stats: { WIS: 10 },             xp: 15, tags: ['reflection'] },
  { id: 'q_gratitude',  type: 'daily',  title: 'Write 3 things you are grateful for',             stats: { WIS: 6, CHA: 4 },      xp: 12, tags: ['reflection'] },
  { id: 'q_read20',     type: 'daily',  title: 'Read 20 pages',                                   stats: { INT: 12 },             xp: 18, tags: ['learning'] },
  // Daily — work
  { id: 'q_focus30',    type: 'daily',  title: '30-min focus block, no phone',                    stats: { INT: 15 },             xp: 22, tags: ['deep-work'] },
  { id: 'q_pr',         type: 'daily',  title: 'Ship one PR for the side project',                stats: { INT: 25 },             xp: 35, tags: ['craft'] },
  // Shadow — discomfort
  { id: 'q_compliment', type: 'shadow', title: 'Compliment a stranger today',                     description: 'The discomfort is the gate.', stats: { CHA: 30 }, xp: 40, tags: ['social', 'vulnerable'] },
  { id: 'q_cold',       type: 'shadow', title: 'Cold shower, 60 seconds',                         stats: { VIT: 15, STR: 10 },    xp: 30, tags: ['discomfort'] },
  { id: 'q_mirror',     type: 'shadow', title: '5-min mirror talk: tell yourself today goes well', stats: { CHA: 20, WIS: 10 },   xp: 30, tags: ['vulnerable'] },
  { id: 'q_avoid',      type: 'shadow', title: 'Write what you avoided today and why',            stats: { WIS: 20 },             xp: 30, tags: ['reflection'] },
  { id: 'q_reach',      type: 'shadow', title: 'Reach out to someone you have drifted from',      stats: { CHA: 35 },             xp: 45, tags: ['social', 'vulnerable'] },
  // Side
  { id: 'q_cook',       type: 'side',   title: 'Cook a meal from scratch',                        stats: { VIT: 12, INT: 8 },     xp: 25, tags: ['skill'] },
  { id: 'q_run30',      type: 'side',   title: '30-min run',                                      stats: { AGI: 25, STR: 10 },    xp: 35, tags: ['cardio'] },
  { id: 'q_plank',      type: 'side',   title: 'Plank 2 minutes total',                           stats: { STR: 15 },             xp: 20, tags: ['core'] },
  { id: 'q_thanks',     type: 'side',   title: 'Send a thank-you message',                        stats: { CHA: 15 },             xp: 18, tags: ['social'] },
  // Weekly
  { id: 'q_week_train', type: 'weekly', title: 'Train 4 of 7 days',                               stats: { STR: 30, AGI: 30 },    xp: 80, tags: ['consistency'] },
  { id: 'q_week_learn', type: 'weekly', title: 'Finish one learning module',                      stats: { INT: 50 },             xp: 80, tags: ['craft'] },
] as const;
