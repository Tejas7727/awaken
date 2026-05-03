export const SEED_QUESTS = [
  // F-rank
  { id: 'q_water',     type: 'daily',  difficulty: 'F', title: 'Quench the well',                    description: 'The body remembers water before it remembers anything else.',    stats: { VIT: 10 },             xp: 15, tags: ['hydration'] },
  { id: 'q_stretch',   type: 'daily',  difficulty: 'F', title: 'Loosen the tether',                  description: 'Tight muscle is forgotten armor. Take it off.',                  stats: { AGI: 8, VIT: 5 },      xp: 18, tags: ['mobility'] },
  { id: 'q_gratitude', type: 'daily',  difficulty: 'F', title: 'Mark what is given',                 description: 'Three things you did not earn today. Write them.',                stats: { WIS: 6, CHA: 4 },      xp: 12, tags: ['reflection'] },

  // E-rank
  { id: 'q_walk6k',    type: 'daily',  difficulty: 'E', title: 'Walk among the living',              description: 'Six thousand steps. Eyes off the screen, on the world.',           stats: { AGI: 15 },             xp: 20, tags: ['movement', 'outdoor'] },
  { id: 'q_journal',   type: 'daily',  difficulty: 'E', title: 'Mark the day in ink',                description: 'A page is enough. The Tower needs to know you were here.',         stats: { WIS: 10 },             xp: 15, tags: ['reflection'] },
  { id: 'q_meditate',  type: 'daily',  difficulty: 'E', title: 'Sit beneath the noise',              description: 'Ten minutes of stillness is louder than any answer you have been chasing.', stats: { WIS: 12 }, xp: 18, tags: ['mind'] },
  { id: 'q_sleep',     type: 'daily',  difficulty: 'E', title: 'Lay down the torch',                 description: 'The Tower is taller in the morning if you slept.',                 stats: { VIT: 12 },             xp: 20, tags: ['recovery'] },

  // D-rank
  { id: 'q_read20',    type: 'daily',  difficulty: 'D', title: 'Read what the dead wrote',           description: 'Twenty pages from someone who is no longer here. Inherit something.',stats: { INT: 12 },             xp: 18, tags: ['learning'] },
  { id: 'q_focus30',   type: 'daily',  difficulty: 'D', title: 'Burn one candle clean',              description: 'Thirty minutes. No phone, no tabs, no escape route.',              stats: { INT: 15 },             xp: 22, tags: ['deep-work'] },
  { id: 'q_pushups',   type: 'daily',  difficulty: 'D', title: 'Drive the floor away',               description: 'Thirty pressings. Broken sets are still pressings.',               stats: { STR: 12 },             xp: 18, tags: ['strength'] },
  { id: 'q_thanks',    type: 'side',   difficulty: 'D', title: 'Send a torch',                       description: 'Tell someone what they gave you. They will not know unless you do.',stats: { CHA: 15 },             xp: 18, tags: ['social'] },
  { id: 'q_cook',      type: 'side',   difficulty: 'D', title: 'Feed yourself with your own hands',  description: 'A meal made by no one else, for no one else.',                      stats: { VIT: 12, INT: 8 },     xp: 25, tags: ['skill'] },

  // C-rank
  { id: 'q_plank',     type: 'side',   difficulty: 'C', title: 'Hold the line',                      description: 'The body wants to fall. The Tower asks how long you can refuse.',  stats: { STR: 15 },             xp: 20, tags: ['core'] },
  { id: 'q_pr',        type: 'daily',  difficulty: 'C', title: 'Cast one spell into the world',      description: 'Code is the spell. Ship something today, even small.',             stats: { INT: 25 },             xp: 35, tags: ['craft'] },
  { id: 'q_cold',      type: 'shadow', difficulty: 'C', title: 'Step into the cold',                 description: 'Sixty seconds. The body screams; that is the lesson.',             stats: { VIT: 15, STR: 10 },    xp: 30, tags: ['discomfort'] },
  { id: 'q_avoid',     type: 'shadow', difficulty: 'C', title: 'Name the thing you walked around',   description: 'Write what you avoided today, and why. Honesty is its own trial.',  stats: { WIS: 20 },             xp: 30, tags: ['reflection'] },

  // B-rank
  { id: 'q_run30',     type: 'side',   difficulty: 'B', title: 'Run until the noise quiets',         description: 'Thirty minutes. The first ten lie. The next twenty teach.',         stats: { AGI: 25, STR: 10 },    xp: 35, tags: ['cardio'] },
  { id: 'q_compliment',type: 'shadow', difficulty: 'B', title: 'Speak the thing you would not',      description: 'Tell a stranger what you noticed. The discomfort is the gate.',    stats: { CHA: 30 },             xp: 40, tags: ['social', 'vulnerable'] },
  { id: 'q_mirror',    type: 'shadow', difficulty: 'B', title: 'Speak across the glass',             description: 'Five minutes. Tell yourself the day will go well, and mean it.',   stats: { CHA: 20, WIS: 10 },    xp: 30, tags: ['vulnerable'] },
  { id: 'q_reach',     type: 'shadow', difficulty: 'B', title: 'Cross the silence',                  description: 'Someone you have drifted from. Reach. They may not answer; that is not the trial.', stats: { CHA: 35 }, xp: 45, tags: ['social', 'vulnerable'] },

  // A-rank weekly
  { id: 'q_week_train',type: 'weekly', difficulty: 'A', title: 'Hold the body for a week',           description: 'Four days of training in seven. The Tower watches consistency more than peaks.', stats: { STR: 30, AGI: 30 }, xp: 80, tags: ['consistency'] },
  { id: 'q_week_learn',type: 'weekly', difficulty: 'A', title: 'Finish a thing you started',         description: 'One module, fully completed. Not skimmed. Not bookmarked. Finished.', stats: { INT: 50 }, xp: 80, tags: ['craft'] },
] as const;
