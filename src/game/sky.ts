import { mulberry32, seedFrom, todayStamp } from "./rng.ts";
import type { Rarity, Stats } from "./types.ts";

export type SkyId = "clear" | "humid" | "storm" | "drought" | "harvest" | "cold";

export type Sky = {
  id: SkyId;
  name: string;
  blurb: string;
  hunt: Partial<Record<Rarity, number>>;
  chance: number;
  fight: Partial<Stats>;
  purse: number;
  energy: number;
  tint: string;
};

export const SKIES: Sky[] = [
  {
    id: "clear",
    name: "Porch-quiet",
    blurb: "Bugs on the bulb. Honest silk.",
    hunt: {},
    chance: 0,
    fight: {},
    purse: 0,
    energy: 0,
    tint: "rgba(12,8,6,0.12)",
  },
  {
    id: "humid",
    name: "Wet-towel air",
    blurb: "Silk lays thicker. Uncommons come in.",
    hunt: { uncommon: 8, rare: 4 },
    chance: 0.04,
    fight: { silk: 2, speed: -1 },
    purse: 0,
    energy: 0,
    tint: "rgba(20,40,28,0.22)",
  },
  {
    id: "storm",
    name: "Ridge lightning",
    blurb: "They hang lower. The stick kicks.",
    hunt: { rare: 6 },
    chance: -0.02,
    fight: { speed: -1, grit: 1 },
    purse: 6,
    energy: 2,
    tint: "rgba(8,12,28,0.32)",
  },
  {
    id: "drought",
    name: "Dust on the wraps",
    blurb: "Mean and thirsty. Harder walk, harder hit.",
    hunt: { common: 10, legendary: -4 },
    chance: -0.04,
    fight: { power: 1, silk: -1 },
    purse: 0,
    energy: 4,
    tint: "rgba(60,32,10,0.22)",
  },
  {
    id: "harvest",
    name: "Big moon",
    blurb: "The legends walk. Purses fatten.",
    hunt: { legendary: 14, rare: 8 },
    chance: 0.06,
    fight: { venom: 1, size: 1 },
    purse: 12,
    energy: -2,
    tint: "rgba(48,22,4,0.2)",
  },
  {
    id: "cold",
    name: "First snap",
    blurb: "Fangs slow. Guts honest.",
    hunt: { uncommon: 6 },
    chance: 0,
    fight: { venom: -1, grit: 1 },
    purse: 0,
    energy: 2,
    tint: "rgba(18,24,40,0.28)",
  },
];

const WEIGHTS: { item: Sky; w: number }[] = [
  { item: SKIES[0]!, w: 30 },
  { item: SKIES[1]!, w: 22 },
  { item: SKIES[2]!, w: 14 },
  { item: SKIES[3]!, w: 12 },
  { item: SKIES[4]!, w: 10 },
  { item: SKIES[5]!, w: 12 },
];

export function tonightSky(day = todayStamp()): Sky {
  const rng = mulberry32(seedFrom(`sky-${day}`));
  return rng.weighted(WEIGHTS);
}

export function mixHunt(base: Partial<Record<Rarity, number>>, sky: Sky): Partial<Record<Rarity, number>> {
  const out: Partial<Record<Rarity, number>> = { ...base };
  for (const [key, value] of Object.entries(sky.hunt) as [Rarity, number][]) {
    out[key] = Math.max(0, (out[key] ?? 0) + value);
  }
  return out;
}
