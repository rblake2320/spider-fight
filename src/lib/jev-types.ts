import type { Stats } from "@/game/types";

export type FighterSnap = {
  name: string;
  species: string;
  latin?: string;
  hpPct: number;
  stam: number;
  last: string | null;
  stats: Stats;
};

export type StickSnapshot = {
  round: number;
  rival: { name: string; grit: number };
  player: FighterSnap;
  enemy: FighterSnap;
};

export type CatchSnap = {
  name: string;
  species: string;
  latin?: string;
  rarity: string;
  stage: string;
  habitat: string;
  rank: number;
  stats: Stats;
};

export type BoutSnap = {
  won: boolean;
  rounds: number;
  playerName: string;
  enemyName: string;
  playerHp: number;
  enemyHp: number;
  stripped: string[];
  wager: number;
};
