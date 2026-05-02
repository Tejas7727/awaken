export const statXpToLevel = (level: number) => 50 + (level - 1) * 25;

export const playerXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

export const RANK_THRESHOLDS = [
  { rank: 'E',   sumStats: 6,   streak: 0   },
  { rank: 'D',   sumStats: 18,  streak: 3   },
  { rank: 'C',   sumStats: 36,  streak: 7   },
  { rank: 'B',   sumStats: 66,  streak: 14  },
  { rank: 'A',   sumStats: 108, streak: 21  },
  { rank: 'S',   sumStats: 168, streak: 30  },
  { rank: 'SS',  sumStats: 240, streak: 60  },
  { rank: 'SSS', sumStats: 336, streak: 100 },
] as const;

export function computeRank(sumStats: number, streak: number): string {
  let rank = 'E';
  for (const threshold of RANK_THRESHOLDS) {
    if (sumStats >= threshold.sumStats && streak >= threshold.streak) {
      rank = threshold.rank;
    }
  }
  return rank;
}

export function computePlayerLevel(totalXp: number): number {
  let level = 1;
  while (totalXp >= playerXpThreshold(level + 1)) {
    level++;
    if (level > 999) break;
  }
  return level;
}
