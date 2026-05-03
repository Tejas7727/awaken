export const statXpToLevel = (level: number) => 50 + (level - 1) * 25;

export const playerXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S++'] as const;
export type RankKey = typeof RANKS[number];

export const RANK_THRESHOLDS = [
  { rank: 'F',   sumStats: 6,    streak: 0,   floor: 1, label: 'Initiate'   },
  { rank: 'E',   sumStats: 18,   streak: 3,   floor: 2, label: 'Aspirant'   },
  { rank: 'D',   sumStats: 36,   streak: 7,   floor: 3, label: 'Trainee'    },
  { rank: 'C',   sumStats: 66,   streak: 14,  floor: 4, label: 'Hunter'     },
  { rank: 'B',   sumStats: 108,  streak: 21,  floor: 5, label: 'Adept'      },
  { rank: 'A',   sumStats: 168,  streak: 30,  floor: 6, label: 'Champion'   },
  { rank: 'S',   sumStats: 240,  streak: 60,  floor: 7, label: 'Ascendant'  },
  { rank: 'S++', sumStats: 336,  streak: 100, floor: 8, label: 'Sovereign'  },
] as const;

export function computeRank(sumStats: number, streak: number): string {
  let rank = 'F';
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

export function rankLabel(rank: string): string {
  return RANK_THRESHOLDS.find((t) => t.rank === rank)?.label ?? rank;
}
