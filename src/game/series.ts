import { RIVALS } from "./content";
import { isShipped } from "./catalog";
import { mulberry32, seedFrom } from "./rng";
import type { Rival } from "./types";

/** A deterministic daily three-call card, shared by every yard at a rank. */
export function yardSeriesLineup(date: string, rank: number): Rival[] {
  const pool = RIVALS.filter((rival) => isShipped(rival) && !rival.always && rival.rank <= rank + 1);
  const source = pool.length ? pool : RIVALS.filter((rival) => isShipped(rival) && !rival.always);
  const rng = mulberry32(seedFrom(`yard-series:${date}:${rank}`));
  const bag = [...source];
  const lineup: Rival[] = [];
  while (bag.length && lineup.length < 3) lineup.push(bag.splice(rng.int(0, bag.length - 1), 1)[0]!);
  while (lineup.length < 3) lineup.push(source[lineup.length % source.length] ?? RIVALS[0]!);
  return lineup;
}

export const SERIES_BONUS_CASH = [6, 14, 30] as const;
export const SERIES_BONUS_POINTS = [4, 8, 18] as const;
