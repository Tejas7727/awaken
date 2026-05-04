export interface ChapterNode {
  id: string;
  body: string;
  unlockAtPlayerLevel: number;
}

export interface Chapter {
  chapter: number;
  title: string;
  track: 'hunter' | 'vanguard';
  nodes: ChapterNode[];
}

export const HUNTER_CHAPTERS: Chapter[] = [
  {
    chapter: 1, title: 'The Awakening', track: 'hunter',
    nodes: [
      { id: 'h_ch1_n1', body: 'You walked into the Tower because no one came to find you. Good. The climb belongs to you alone.', unlockAtPlayerLevel: 1 },
      { id: 'h_ch1_n2', body: 'A trial appears. You complete it. Something settles into place — small, but real.', unlockAtPlayerLevel: 3 },
      { id: 'h_ch1_n3', body: 'For the first time, you understand: the Tower is not testing you. It is waiting.', unlockAtPlayerLevel: 5 },
      { id: 'h_ch1_n4', body: 'You finish the day stronger than you woke. Tomorrow, you will be different.', unlockAtPlayerLevel: 8 },
    ],
  },
  {
    chapter: 2, title: 'The First Gate', track: 'hunter',
    nodes: [
      { id: 'h_ch2_n1', body: 'A gate forms. The Tower asks if you are ready. You step through anyway.', unlockAtPlayerLevel: 12 },
      { id: 'h_ch2_n2', body: 'Inside the gate: not enemies. Mirrors. The Tower wants to know what you avoid.', unlockAtPlayerLevel: 16 },
      { id: 'h_ch2_n3', body: 'You name the thing. It shrinks. You are already past it.', unlockAtPlayerLevel: 20 },
      { id: 'h_ch2_n4', body: 'The gate closes behind you. You did not need permission to pass it.', unlockAtPlayerLevel: 24 },
    ],
  },
  {
    chapter: 3, title: 'Shadow Work', track: 'hunter',
    nodes: [
      { id: 'h_ch3_n1', body: 'Your shadow speaks for the first time. It is not your enemy. It is your inheritance.', unlockAtPlayerLevel: 28 },
      { id: 'h_ch3_n2', body: 'Every shadow trial is a question asked twice: once by the Tower, once by you.', unlockAtPlayerLevel: 32 },
      { id: 'h_ch3_n3', body: 'You complete the trial. The shadow grows quieter. Not gone — integrated.', unlockAtPlayerLevel: 36 },
      { id: 'h_ch3_n4', body: 'There are no monsters here. Only the places you refused to look.', unlockAtPlayerLevel: 40 },
    ],
  },
  {
    chapter: 4, title: 'The Quiet Floor', track: 'hunter',
    nodes: [
      { id: 'h_ch4_n1', body: 'You reach a floor with no trials. The Tower offers silence. You sit in it.', unlockAtPlayerLevel: 45 },
      { id: 'h_ch4_n2', body: 'Rest is not surrender. The Tower knows this. Now so do you.', unlockAtPlayerLevel: 50 },
      { id: 'h_ch4_n3', body: 'You have climbed long enough to know the difference between stopping and ending.', unlockAtPlayerLevel: 55 },
      { id: 'h_ch4_n4', body: 'The quiet floor passes. You were stronger for it.', unlockAtPlayerLevel: 60 },
    ],
  },
  {
    chapter: 5, title: 'The Weight of Rank', track: 'hunter',
    nodes: [
      { id: 'h_ch5_n1', body: 'Rank is not a reward. It is a new baseline. The Tower lifts its floor.', unlockAtPlayerLevel: 66 },
      { id: 'h_ch5_n2', body: 'You looked back once. Just to measure. Then you kept climbing.', unlockAtPlayerLevel: 72 },
      { id: 'h_ch5_n3', body: 'The trials are harder now. So are you.', unlockAtPlayerLevel: 78 },
      { id: 'h_ch5_n4', body: 'You no longer ask the Tower if you belong here. You simply climb.', unlockAtPlayerLevel: 84 },
    ],
  },
  {
    chapter: 6, title: 'Iron Memory', track: 'hunter',
    nodes: [
      { id: 'h_ch6_n1', body: 'The Tower keeps a record. Every trial, every rest day, every morning you chose to begin.', unlockAtPlayerLevel: 90 },
      { id: 'h_ch6_n2', body: 'Memory is not nostalgia here. It is evidence. You have done hard things before.', unlockAtPlayerLevel: 96 },
      { id: 'h_ch6_n3', body: 'The streak is long now. You do not notice it anymore. That is what consistency feels like.', unlockAtPlayerLevel: 104 },
      { id: 'h_ch6_n4', body: 'You carry what you have built. It carries you in return.', unlockAtPlayerLevel: 112 },
    ],
  },
  {
    chapter: 7, title: 'The Narrow Path', track: 'hunter',
    nodes: [
      { id: 'h_ch7_n1', body: 'The floor narrows. You have always climbed alone; now the Tower makes that visible.', unlockAtPlayerLevel: 120 },
      { id: 'h_ch7_n2', body: 'At this height the air is different. Thinner. Your body has adapted. You did not notice when.', unlockAtPlayerLevel: 130 },
      { id: 'h_ch7_n3', body: 'There are fewer trials now, but each one costs more. You pay willingly.', unlockAtPlayerLevel: 140 },
      { id: 'h_ch7_n4', body: 'The Tower does not applaud. It simply records. You find that enough.', unlockAtPlayerLevel: 150 },
    ],
  },
  {
    chapter: 8, title: 'The Summit Waits', track: 'hunter',
    nodes: [
      { id: 'h_ch8_n1', body: 'You can see the summit now. The Tower did not promise it would be empty.', unlockAtPlayerLevel: 160 },
      { id: 'h_ch8_n2', body: 'The climb has changed you in ways that do not fit into a rank or a number.', unlockAtPlayerLevel: 172 },
      { id: 'h_ch8_n3', body: 'You are not the person who walked in. That person would not have made it here.', unlockAtPlayerLevel: 184 },
      { id: 'h_ch8_n4', body: 'The Tower has one last thing to say: you were always going to make it. You just needed to climb.', unlockAtPlayerLevel: 200 },
    ],
  },
];

export const VANGUARD_CHAPTERS: Chapter[] = [
  {
    chapter: 1, title: 'The Awakening', track: 'vanguard',
    nodes: [
      { id: 'v_ch1_n1', body: 'The others look to you not because you are strong, but because you are climbing. Do not look back. They will follow if they choose.', unlockAtPlayerLevel: 1 },
      { id: 'v_ch1_n2', body: 'A trial appears. You complete it. Somewhere, another Hunter sees and decides to begin.', unlockAtPlayerLevel: 3 },
      { id: 'v_ch1_n3', body: 'The Tower does not need your leadership. It will record it anyway.', unlockAtPlayerLevel: 5 },
      { id: 'v_ch1_n4', body: 'You finish the day. Three Hunters finished theirs because of you.', unlockAtPlayerLevel: 8 },
    ],
  },
  {
    chapter: 2, title: 'The First Gate', track: 'vanguard',
    nodes: [
      { id: 'v_ch2_n1', body: 'A gate forms. You step through. Someone who was watching decides to follow.', unlockAtPlayerLevel: 12 },
      { id: 'v_ch2_n2', body: 'Inside the gate: not enemies. Mirrors. The Tower shows you what it costs to carry others.', unlockAtPlayerLevel: 16 },
      { id: 'v_ch2_n3', body: 'You name the weight. You carry it anyway. That is the Vanguard.', unlockAtPlayerLevel: 20 },
      { id: 'v_ch2_n4', body: 'The gate closes. You turned back once, to see who had followed. More than you expected.', unlockAtPlayerLevel: 24 },
    ],
  },
  {
    chapter: 3, title: 'Shadow Work', track: 'vanguard',
    nodes: [
      { id: 'v_ch3_n1', body: 'Your shadow speaks. It asks who you are when no one is watching. The answer matters more than the question.', unlockAtPlayerLevel: 28 },
      { id: 'v_ch3_n2', body: 'Every shadow trial is a question asked twice: once by the Tower, once by the people you lead.', unlockAtPlayerLevel: 32 },
      { id: 'v_ch3_n3', body: 'You complete the trial not just for yourself. The record belongs to everyone who watched you climb.', unlockAtPlayerLevel: 36 },
      { id: 'v_ch3_n4', body: 'The Vanguard does not perform strength. It demonstrates that strength is possible.', unlockAtPlayerLevel: 40 },
    ],
  },
  {
    chapter: 4, title: 'The Quiet Floor', track: 'vanguard',
    nodes: [
      { id: 'v_ch4_n1', body: 'You reach a floor with no trials. The others you carry need this rest too. You sit together in the silence.', unlockAtPlayerLevel: 45 },
      { id: 'v_ch4_n2', body: 'The Vanguard rests visibly. This is also leadership. You give permission to stop.', unlockAtPlayerLevel: 50 },
      { id: 'v_ch4_n3', body: 'You have climbed long enough to know: the people who see you rest will rest, too. That is not weakness. It is instruction.', unlockAtPlayerLevel: 55 },
      { id: 'v_ch4_n4', body: 'The quiet floor passes. You were stronger for it. They were too.', unlockAtPlayerLevel: 60 },
    ],
  },
  {
    chapter: 5, title: 'The Weight of Rank', track: 'vanguard',
    nodes: [
      { id: 'v_ch5_n1', body: 'Rank changes how they see you. You feel the weight of the new expectation. Carry it lightly.', unlockAtPlayerLevel: 66 },
      { id: 'v_ch5_n2', body: 'You looked back once. You saw how far others have climbed in your wake. The sight gave you speed.', unlockAtPlayerLevel: 72 },
      { id: 'v_ch5_n3', body: 'The trials are harder now. The Vanguard does not hide that. It says: yes, harder. And then completes them anyway.', unlockAtPlayerLevel: 78 },
      { id: 'v_ch5_n4', body: 'You no longer ask if you belong here. You belong here because you made it possible for others to believe they might.', unlockAtPlayerLevel: 84 },
    ],
  },
  {
    chapter: 6, title: 'Iron Memory', track: 'vanguard',
    nodes: [
      { id: 'v_ch6_n1', body: 'The Tower keeps a record. So do the people who have watched you climb.', unlockAtPlayerLevel: 90 },
      { id: 'v_ch6_n2', body: 'Your memory is also their evidence. You have done hard things. They have seen it. They believe they can too.', unlockAtPlayerLevel: 96 },
      { id: 'v_ch6_n3', body: 'The streak is long now. The Vanguard does not boast about it. It simply continues. That is the message.', unlockAtPlayerLevel: 104 },
      { id: 'v_ch6_n4', body: 'You carry what you have built. It carries others. The weight is distributed now.', unlockAtPlayerLevel: 112 },
    ],
  },
  {
    chapter: 7, title: 'The Narrow Path', track: 'vanguard',
    nodes: [
      { id: 'v_ch7_n1', body: 'The floor narrows. The Vanguard walks it first. Behind you, someone finds the courage to step onto it.', unlockAtPlayerLevel: 120 },
      { id: 'v_ch7_n2', body: 'At this height the air is different. Thinner. You breathe it steadily so they know it can be breathed.', unlockAtPlayerLevel: 130 },
      { id: 'v_ch7_n3', body: 'There are fewer trials now, but each one costs more. You pay in public. That is a gift.', unlockAtPlayerLevel: 140 },
      { id: 'v_ch7_n4', body: 'The Tower records your climb. Others will read it long after you reach the top.', unlockAtPlayerLevel: 150 },
    ],
  },
  {
    chapter: 8, title: 'The Summit Waits', track: 'vanguard',
    nodes: [
      { id: 'v_ch8_n1', body: 'You can see the summit. The Tower did not promise it would be empty. You hoped it would not be.', unlockAtPlayerLevel: 160 },
      { id: 'v_ch8_n2', body: 'The climb has changed you in ways that are not yours alone. Others carry them too now.', unlockAtPlayerLevel: 172 },
      { id: 'v_ch8_n3', body: 'You are not who walked in. Neither are they. You changed together without planning to.', unlockAtPlayerLevel: 184 },
      { id: 'v_ch8_n4', body: 'The Tower has one last thing to say: you were always going to make it. And you brought them with you.', unlockAtPlayerLevel: 200 },
    ],
  },
];

// Legacy flat export used by the seed system — defaults to Hunter track
export const SEED_CHAPTERS = HUNTER_CHAPTERS.map(({ chapter, title, nodes }) => ({
  chapter, title,
  nodes: nodes.map(({ id, body, unlockAtPlayerLevel }) => ({ id, body, unlockAtPlayerLevel })),
}));
