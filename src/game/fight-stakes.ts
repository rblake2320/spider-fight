import { RANKS } from "./content";
import { NIGHTLY_BONUS_CASH, NIGHTLY_BONUS_POINTS } from "./night-card";

export type FightStakes = {
  purse: number;
  points: number;
  lossPoints: number;
  basePurse: number;
  headlineCash: number;
  headlinePoints: number;
  skyCash: number;
};

/** The exact competitive reward for a ranked call before the bout is fought. */
export function fightStakes(rank: number, wager: number, headliner = false, skyCash = 0): FightStakes {
  const basePurse = (RANKS[rank]?.purse ?? 18) + wager;
  const headlineCash = headliner ? NIGHTLY_BONUS_CASH : 0;
  const headlinePoints = headliner ? NIGHTLY_BONUS_POINTS : 0;
  return {
    basePurse,
    purse: basePurse + headlineCash + skyCash,
    points: 12 + Math.round(wager / 8) + headlinePoints,
    lossPoints: 6,
    headlineCash,
    headlinePoints,
    skyCash,
  };
}
