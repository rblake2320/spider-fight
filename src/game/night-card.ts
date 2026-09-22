import { RIVALS } from "./content";
import { isShipped } from "./catalog";
import { mulberry32, seedFrom } from "./rng";
import type { Rival } from "./types";

export function nightlyRival(date: string, rank: number): Rival {
  const card = RIVALS.filter((rival) => isShipped(rival) && !rival.always && rival.rank <= rank + 1);
  const pool = card.length ? card : RIVALS.filter((rival) => isShipped(rival) && !rival.always);
  const rng = mulberry32(seedFrom(`night-card:${date}:${rank}`));
  return rng.pick(pool) ?? RIVALS[0]!;
}

export const NIGHTLY_BONUS_CASH = 8;
export const NIGHTLY_BONUS_POINTS = 8;

export function nightlyReward(headliner: boolean): { cash: number; points: number } {
  return headliner ? { cash: NIGHTLY_BONUS_CASH, points: NIGHTLY_BONUS_POINTS } : { cash: 0, points: 0 };
}
