import { ZERO_STATS } from "./content.ts";
import type { MoveId, Stats } from "./types.ts";

/** Live blood. Unknown flavor strings (crew grit tags) are ignored. */
export type TraitDef = {
  blurb: string;
  stats?: Partial<Stats>;
  ai?: Partial<Record<MoveId, number>>;
  moltPerfect?: number;
  moltRough?: number;
  hunt?: number;
  heat?: number;
  train?: number;
};

export const TRAITS: Record<string, TraitDef> = {
  "Porch-bred": { blurb: "Home silk holds.", stats: { grit: 1 } },
  "Night feeder": { blurb: "Walks after the bulb dies.", hunt: 0.04 },
  Stubborn: { blurb: "Doesn't rattle. Slow to listen.", stats: { grit: 1 }, moltRough: -0.08, train: 4 },
  "Garden cross": { blurb: "Takes a beating in the beds.", stats: { grit: 1 } },
  Heavy: { blurb: "Thick as a pecan.", stats: { size: 1, speed: -1 } },
  Patient: { blurb: "Waits on the tell.", ai: { brace: 2 } },
  "Clover back": { blurb: "Plump and planted.", stats: { size: 1 } },
  Slow: { blurb: "Late off the silk.", stats: { speed: -1, grit: 1 } },
  Crushing: { blurb: "Locks and doesn't let go.", stats: { power: 1 }, ai: { grapple: 2 } },
  "Cat-faced": { blurb: "Ugly, and she knows it.", stats: { grit: 1 } },
  "Iron gut": { blurb: "Shells don't scare her.", stats: { grit: 1 }, moltRough: -0.06 },
  Watchful: { blurb: "Sees the twitch first.", hunt: 0.02, ai: { feint: 1 } },
  Marbled: { blurb: "Show silk, real bite.", stats: { silk: 1 } },
  Showy: { blurb: "Wants the lights on her.", stats: { silk: 1 } },
  "Hot-blooded": { blurb: "Meaner when the plate cracks.", heat: 0.14, moltPerfect: 0.06, moltRough: 0.05 },
  Arrowback: { blurb: "First off the line.", stats: { speed: 1 } },
  "Quick fang": { blurb: "Venom before the question.", stats: { venom: 1 }, ai: { lunge: 2 } },
  Skittish: { blurb: "Fast. Tears easy.", stats: { speed: 1, grit: -1 }, moltRough: 0.08 },
  Spined: { blurb: "Armor you can see.", stats: { grit: 1 } },
  Armored: { blurb: "Hits bounce.", stats: { grit: 1 } },
  "Crab-stance": { blurb: "Low and braced.", stats: { grit: 1 }, ai: { brace: 1 } },
  "Golden wind": { blurb: "Long legs, long thread.", stats: { silk: 1, speed: 1 } },
  "Long-leg": { blurb: "Reaches the far silk.", stats: { silk: 1 } },
  "Silk singer": { blurb: "The thread talks for her.", stats: { silk: 1 }, ai: { yank: 2 } },
  Joro: { blurb: "Bridge-builder. Big.", stats: { size: 1, silk: 1 } },
  Invasive: { blurb: "Doesn't ask permission.", stats: { power: 1 } },
  Showboat: { blurb: "Sells the feint.", ai: { feint: 2 } },
  Hourglass: { blurb: "The mark does the talking.", stats: { venom: 2 } },
  "Venom queen": { blurb: "Bite first. Ask never.", stats: { venom: 2 }, heat: 0.08 },
  "Doesn't blink": { blurb: "Holds the stare.", stats: { grit: 1 }, ai: { brace: 1 } },
  Geometric: { blurb: "Patterned and precise.", stats: { silk: 1 } },
  "Culvert-bred": { blurb: "Raised in the wet dark.", stats: { grit: 1 } },
  "Hot fang": { blurb: "Burns on the way in.", stats: { venom: 1 }, heat: 0.1 },
  "Ground hunter": { blurb: "Doesn't wait to be hung.", stats: { power: 1 }, ai: { lunge: 2 } },
  "Night eyes": { blurb: "Reads the dark.", hunt: 0.04 },
  "No web manners": { blurb: "Power over thread.", stats: { power: 1, silk: -1 } },
  "Jumps the line": { blurb: "Leaves the silk early.", stats: { speed: 1 }, ai: { drop: 2 } },
  Peacock: { blurb: "Wants to be seen.", stats: { silk: 1 }, ai: { feint: 1 } },
  "Close-range": { blurb: "Lives in the lock.", stats: { power: 1 }, ai: { grapple: 1 } },
  "Water runner": { blurb: "Skims and doesn't sink.", stats: { speed: 1 } },
  "Long reach": { blurb: "Covers the whole stick.", stats: { size: 1 }, ai: { yank: 1 } },
  "County creek": { blurb: "Mud in the plates.", stats: { grit: 1 } },
  "Grass knife": { blurb: "Cuts on the turn.", stats: { venom: 1, speed: 1 } },
  "Leaf blind": { blurb: "You don't see her till she moves.", ai: { feint: 2 } },
  "Quick turn": { blurb: "Pays silk and is gone.", stats: { speed: 1 }, ai: { drop: 1 } },
  "Crevice keeper": { blurb: "Holds a hole and a grudge.", stats: { grit: 1 }, ai: { brace: 1 } },
  "Heavy brace": { blurb: "Tucks and waits you out.", stats: { grit: 1 }, ai: { brace: 2 } },
  "Mean in close": { blurb: "The lock is her house.", stats: { power: 1 }, ai: { lunge: 2 } },
  "Drops on a dime": { blurb: "Silk pays out clean.", stats: { speed: 1 }, ai: { drop: 3 } },
  "Heavy abdomen": { blurb: "Weight on the line.", stats: { size: 1, speed: -1 } },
  "Silk hoarder": { blurb: "Keeps thread in reserve.", stats: { silk: 1 }, ai: { yank: 1 } },
  "Fence-trained": { blurb: "Drilled on wire.", stats: { grit: 1 } },
  "Won't quit": { blurb: "Meaner on a cracked plate.", stats: { grit: 1 }, heat: 0.1 },
  "Easy rattle": { blurb: "Loses her head when hit.", stats: { grit: -1 }, moltRough: 0.06 },
  "Fair veteran": { blurb: "She's been under the lights.", stats: { grit: 1, power: 1 } },
  "Molt glutton": { blurb: "Lives to shed.", moltPerfect: 0.1, moltRough: -0.06 },
  "Yard-bred": { blurb: "Born on this dirt.", stats: { grit: 1 }, moltPerfect: 0.04 },
  "First stick": { blurb: "Green. Still listens.", train: -2, moltRough: 0.03 },
};

export function traitOf(name: string): TraitDef | undefined {
  return TRAITS[name];
}

export function traitBlurb(name: string): string {
  return TRAITS[name]?.blurb ?? "";
}

export function traitStats(traits: string[]): Partial<Stats> {
  const out = { ...ZERO_STATS };
  for (const name of traits) {
    const bonus = TRAITS[name]?.stats;
    if (!bonus) continue;
    (Object.keys(bonus) as Array<keyof Stats>).forEach((key) => {
      out[key] += bonus[key] ?? 0;
    });
  }
  return out;
}

export function traitAi(traits: string[]): Partial<Record<MoveId, number>> {
  const out: Partial<Record<MoveId, number>> = {};
  for (const name of traits) {
    const bias = TRAITS[name]?.ai;
    if (!bias) continue;
    (Object.keys(bias) as MoveId[]).forEach((move) => {
      out[move] = (out[move] ?? 0) + (bias[move] ?? 0);
    });
  }
  return out;
}

export function traitMoltShift(traits: string[]): { perfect: number; rough: number } {
  let perfect = 0;
  let rough = 0;
  for (const name of traits) {
    const def = TRAITS[name];
    if (!def) continue;
    perfect += def.moltPerfect ?? 0;
    rough += def.moltRough ?? 0;
  }
  return { perfect, rough };
}

export function traitHuntChance(traits: string[]): number {
  return traits.reduce((sum, name) => sum + (TRAITS[name]?.hunt ?? 0), 0);
}

export function traitHeat(traits: string[], hpPct: number): number {
  if (hpPct >= 0.4) return 1;
  const extra = traits.reduce((sum, name) => sum + (TRAITS[name]?.heat ?? 0), 0);
  return 1 + extra;
}

export function traitTrainCost(traits: string[], base: number): number {
  const extra = traits.reduce((sum, name) => sum + (TRAITS[name]?.train ?? 0), 0);
  return Math.max(6, base + extra);
}
