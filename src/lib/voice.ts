export const V = {
  // Navigation labels
  navHome:      'Trials',
  navQuests:    'Quests',
  navStats:     'Record',
  navStory:     'Chronicle',
  navProgress:  'Ascent',
  navSettings:  'The Codex',

  // App brand
  brand: 'Awaken',

  // Home
  trialsBeforeNightfall: 'Trials before nightfall',
  noTrials: 'No trials today — import a pack or add one below.',
  sealTheDay: 'Seal the day',

  // Quest card types
  typeDaily:  'Daily',
  typeWeekly: 'Weekly',
  typeShadow: 'Shadow',
  typeSide:   'Side',
  typeBoss:   'Boss',

  // Rest day
  restTokens:     (n: number) => `${n} rest token${n !== 1 ? 's' : ''} remaining this week`,
  restTheDay:     'Rest the day',
  restConfirmMsg: 'The Tower respects rest. Your streak holds. Are you sure?',
  restConfirmYes: 'Rest',
  restConfirmNo:  'Not yet',
  restToast:      'Rest taken. The streak holds.',

  // Stats
  hunterRecord:      "The Hunter's record",
  statLevels30:      'Stat levels — last 30 days',
  completionsByTag:  'Completions by tag',
  rankLabel:         'Rank',
  streakLabel:       'Streak',
  totalXpLabel:      'Total XP',

  // Story
  chronicle:          'The chronicle',
  storyEmpty:         'No chronicle entries yet.',
  storyHint:          'Complete quests and level up to unlock chronicle fragments.',
  storyLocked:        (n: number) => `${n} fragment${n !== 1 ? 's' : ''} still locked — keep climbing.`,
  storyBeats:         'Story beats',

  // Progress
  theAscent:          'The ascent',
  last7Days:          'Last 7 days',
  ninetyDayRecord:    '90-day record',
  topTrials:          'Most completed trials',
  completionsLabel:   'Trials sealed',
  activeDaysLabel:    'Days climbed',

  // Settings (The Codex)
  codexTitle:         'The Codex',
  questRulesSection:  'Quest rules',
  focusAreasSection:  'Focus areas',
  syncSection:        'Chronicle sync',
  accountSection:     'Hunter',
  dangerSection:      'Forgotten paths',
  resetAllData:       'Forget your climb',
  resetConfirmMsg:    'This will erase all progress and begin again. The Tower forgets you. Are you sure?',
  resetConfirmYes:    'Forget everything',
  leaveTheTower:      'Leave the Tower',
  archivePrompt:      'Your chronicle grows long. Bind the older pages to the cloud?',
  bindToCloud:        'Bind to cloud',
  restSection:        'Rest tokens',

  // Import panel
  importPanel:        'Inscribe a quest pack',
  importPreviewTitle: 'Quest pack preview',
  importConfirm:      'Accept the trials',
  importStoryBeat:    'Chronicle fragment',
  importTitleAward:   'Title awarded',
  importTooManyDailies: (n: number) => `Too many dailies (${n}) — the Tower asks for 5 at most.`,

  // Toasts
  toastQuestComplete: 'The Tower remembers.',
  toastLevelUp:       'You have grown.',
  toastRankUp:        'The next floor opens.',
  toastImported:      'The Tower receives your trials.',
  toastSideAdded:     'Trial inscribed.',
  toastGistLinked:    'Chronicle bound.',
  toastGistCreated:   'Chronicle created — sync active.',
  toastResetDone:     'The Tower forgets. Begin again.',

  // Level-up modal
  levelUpLabel:       'The Tower acknowledges you.',
  levelUpLevel:       (n: number) => `Level ${n} reached`,
  levelUpRank:        (r: string) => `Current rank: ${r}`,
  levelUpContinue:    'Climb on',

  // TopBar
  welcomeBack:        'The Tower awaits',

  // Loading
  loading:            'The Tower stirs…',

  // Empty states
  noQuestsYet:        'No quests yet. Import a pack or add a side quest.',

  // Tower
  navTower:           'Tower',
  towerTitle:         'The Tower',
  towerEmptyState:    'You climb alone for now. Invite a Hunter.',
  towerFloor:         (n: number) => `Floor ${n}`,
  towerHunterCard:    'Hunter profile',

  // Whispers
  navWhispers:        'Whispers',
  whispersTitle:      'Whispers',
  whispersEmpty:      'No whispers yet. The Tower is watching.',
  whisperKindSystem:  'Tower',
  whisperKindPeer:    'Hunter',
  whisperKindAdmin:   'Quest Master',

  // Onboarding
  onboardingSkip:     'Skip the ritual',
  onboardingStep:     (n: number, total: number) => `${n} / ${total}`,
  onboardingContinue: 'Continue',
  onboardingBegin:    'Enter the Tower',
  onboardingNameQ:    'What name shall the Tower record?',
  onboardingPathQ:    'Which path calls you?',
  onboardingPathHunterName: 'The Hunter',
  onboardingPathHunterDesc: 'You climb for yourself. The Tower is a mirror, not a stage.',
  onboardingPathVanguardName: 'The Vanguard',
  onboardingPathVanguardDesc: 'You climb visibly. Your ascent gives others permission to begin.',
  onboardingFocusQ:   'What does your body need?',
  onboardingAvoidQ:   'What does your mind avoid?',
  onboardingGenderQ:  'How shall the Tower address you?',

  // Chronicle track switch
  chronicleTrackLabel: 'Narrative track',
  chronicleHunter:     'Hunter',
  chronicleVanguard:   'Vanguard',
} as const;
