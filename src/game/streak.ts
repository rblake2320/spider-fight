export type StreakReward = {
  wins: number;
  cash: number;
  points: number;
  label: string;
};

const MILESTONES: readonly StreakReward[] = [
  { wins: 3, cash: 10, points: 6, label: "Three-call heater" },
  { wins: 5, cash: 18, points: 10, label: "Five-call heater" },
  { wins: 8, cash: 32, points: 16, label: "Eight-call heater" },
];

/** Rewards consecutive ranked wins. The eight-call heater returns every eight wins. */
export function streakReward(streak: number): StreakReward | null {
  const fixed = MILESTONES.find((milestone) => milestone.wins === streak);
  if (fixed) return fixed;
  return streak >= 8 && streak % 8 === 0 ? MILESTONES[2]! : null;
}

export function nextStreakReward(streak: number): StreakReward {
  const next = MILESTONES.find((milestone) => milestone.wins > streak);
  if (next) return next;
  const cycle = Math.floor(streak / 8) + 1;
  return { ...MILESTONES[2]!, wins: cycle * 8 };
}
