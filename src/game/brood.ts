import { MAX_STAT, NAMES_F, NAMES_M, SPECIES, TRAIT_POOL, ZERO_STATS, maxEnergy, maxHp } from "./content.ts";
import { clamp, uid, type Rng } from "./rng.ts";
import type { Infestation, Spider, Stage, Stats } from "./types.ts";

const GROWN: Stage[] = ["adult", "veteran", "champion", "legend"];

export function sacCost(rank: number): number {
  return 16 + rank * 3;
}

export function canSetSac(mother: Spider): string | null {
  if (mother.sex !== "female") return "Need a hen on the line";
  if (!GROWN.includes(mother.stage)) return "Let her grow first";
  if (mother.injury) return mother.injury.label;
  if (mother.brood && mother.brood.fightsLeft > 0) return "She's already carrying";
  if ((mother.hatchlings ?? 0) > 0) return "Shake the hatchlings first";
  if (!mother.retired && mother.energy < 22) return "Too tired to set a sac";
  if (mother.morale < 28) return "Rattled stock won't hold a sac";
  return null;
}

export function setSac(mother: Spider, mate: Spider | null): Spider {
  const speciesId = mate && mate.speciesId !== mother.speciesId && mate.speciesId ? mother.speciesId : mother.speciesId;
  return {
    ...mother,
    brood: {
      mateName: mate?.name,
      fightsLeft: 2,
      speciesId,
    },
    energy: mother.retired ? mother.energy : Math.max(0, mother.energy - 22),
    moltReady: clamp(mother.moltReady + 4, 0, 100),
  };
}

export function tickBrood(spider: Spider, rng: Rng): { spider: Spider; hatched: number } {
  const sac = spider.brood;
  if (!sac || sac.fightsLeft <= 0) return { spider, hatched: 0 };
  const fightsLeft = sac.fightsLeft - 1;
  if (fightsLeft > 0) {
    return { spider: { ...spider, brood: { ...sac, fightsLeft } }, hatched: 0 };
  }
  const hatched = rng.int(4, 7);
  return { spider: { ...spider, brood: null, hatchlings: hatched }, hatched };
}

function mixStat(a: number, b: number, rng: Rng): number {
  return clamp(Math.round((a + b) / 2 + rng.float(-1.2, 1.2)), 2, MAX_STAT);
}

export function makeHatchling(mother: Spider, rng: Rng, stableName: string, speciesId: string): Spider {
  const spec = SPECIES[speciesId] ?? SPECIES[mother.speciesId] ?? SPECIES.hentz!;
  const sex = rng.chance(0.62) ? "female" : "male";
  const stage: Stage = "nymph";
  const base: Stats = {
    power: mixStat(mother.base.power, spec.bases.power, rng),
    speed: mixStat(mother.base.speed, spec.bases.speed, rng),
    grit: mixStat(mother.base.grit, spec.bases.grit, rng),
    venom: mixStat(mother.base.venom, spec.bases.venom, rng),
    silk: mixStat(mother.base.silk, spec.bases.silk, rng),
    size: mixStat(mother.base.size, spec.bases.size, rng),
  };
  (Object.keys(base) as Array<keyof Stats>).forEach((key) => {
    base[key] = clamp(Math.round(base[key] * 0.68), 2, MAX_STAT);
  });
  const traits = [rng.pick(mother.traits.length ? mother.traits : spec.traits), rng.pick(TRAIT_POOL), "Yard-bred"]
    .filter((trait, index, all) => all.indexOf(trait) === index)
    .slice(0, 4);
  const name = sex === "female" ? rng.pick(NAMES_F) : rng.pick(NAMES_M);
  const hp = maxHp(base.size, base.grit, stage);
  return {
    id: uid(),
    name,
    speciesId: spec.id,
    morph: sex,
    sex,
    stage,
    level: 1,
    xp: 0,
    base,
    trained: { ...ZERO_STATS },
    hp,
    energy: maxEnergy(base.size),
    morale: rng.int(72, 92),
    gear: {},
    stimFights: 0,
    injury: null,
    origin: `Hatched on ${mother.name}`,
    traits,
    wins: 0,
    losses: 0,
    streak: 0,
    caughtAt: Date.now(),
    moltReady: 0,
    retired: false,
    bredFrom: mother.brood?.mateName ? `${mother.name} × ${mother.brood.mateName}` : mother.name,
    line: mother.line || `${stableName} brood`,
    grafts: {},
  };
}

export function scatterBrood(
  mother: Spider,
  rng: Rng,
  stableName: string,
  rosterLen: number,
  rosterCap: number,
): { mother: Spider; kept: Spider[]; escaped: number; speciesId: string } {
  const count = Math.max(0, mother.hatchlings ?? 0);
  const speciesId = mother.speciesId;
  const room = Math.max(0, rosterCap - rosterLen);
  const keep = Math.min(room, count > 0 ? 1 : 0);
  const kept: Spider[] = [];
  for (let i = 0; i < keep; i += 1) kept.push(makeHatchling(mother, rng, stableName, speciesId));
  return {
    mother: { ...mother, hatchlings: 0, brood: null },
    kept,
    escaped: Math.max(0, count - keep),
    speciesId,
  };
}

export function mergeInfestation(current: Infestation | null, speciesId: string, escaped: number): Infestation | null {
  if (escaped <= 0) return current;
  if (current && current.speciesId === speciesId) {
    return { speciesId, nights: Math.min(6, current.nights + 2), count: current.count + escaped };
  }
  return { speciesId, nights: 3, count: escaped };
}

export function tickInfestation(current: Infestation | null): Infestation | null {
  if (!current) return null;
  const nights = current.nights - 1;
  if (nights <= 0) return null;
  return { ...current, nights };
}
