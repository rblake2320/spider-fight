import { MAX_STAT, NAMES_F, NAMES_M, SPECIES, TRAIT_POOL, ZERO_STATS, maxEnergy, maxHp } from "./content.ts";
import { clamp, uid, type Rng } from "./rng.ts";
import type { Spider, Stage, Stats } from "./types.ts";

const GROWN: Stage[] = ["adult", "veteran", "champion", "legend"];

export function clutchCost(rank: number): number {
  return 28 + rank * 4;
}

export function canClutch(a: Spider, b: Spider, rosterLen: number, rosterCap: number): string | null {
  if (a.id === b.id) return "Need two spiders";
  if (rosterLen >= rosterCap) return "Stable is full";
  if (a.injury || b.injury) return "Wait till the plates harden";
  if (!GROWN.includes(a.stage) || !GROWN.includes(b.stage)) return "Both need to be adult";
  if (a.sex !== "female" && b.sex !== "female") return "Need a hen on the line";
  if (!a.retired && a.energy < 28) return "Too tired to set a clutch";
  if (!b.retired && b.energy < 28) return "Too tired to set a clutch";
  if (a.morale < 30 || b.morale < 30) return "Rattled stock won't pair";
  return null;
}

function mixStat(a: number, b: number, rng: Rng): number {
  return clamp(Math.round((a + b) / 2 + rng.float(-1.5, 1.5)), 2, MAX_STAT);
}

export function makeClutch(a: Spider, b: Spider, rng: Rng, stableName: string): Spider {
  const dam = a.sex === "female" ? a : b.sex === "female" ? b : a;
  const sire = dam.id === a.id ? b : a;
  const spec = SPECIES[dam.speciesId] ?? SPECIES[sire.speciesId] ?? SPECIES.hentz!;
  const sex = rng.chance(0.62) ? "female" : "male";
  const stage: Stage = "nymph";
  const base: Stats = {
    power: mixStat(a.base.power, b.base.power, rng),
    speed: mixStat(a.base.speed, b.base.speed, rng),
    grit: mixStat(a.base.grit, b.base.grit, rng),
    venom: mixStat(a.base.venom, b.base.venom, rng),
    silk: mixStat(a.base.silk, b.base.silk, rng),
    size: mixStat(a.base.size, b.base.size, rng),
  };
  (Object.keys(base) as Array<keyof Stats>).forEach((key) => {
    base[key] = clamp(Math.round(base[key] * 0.72), 2, MAX_STAT);
  });
  const traits = [rng.pick(dam.traits.length ? dam.traits : spec.traits), rng.pick(sire.traits.length ? sire.traits : TRAIT_POOL), "Yard-bred"]
    .filter((trait, index, all) => all.indexOf(trait) === index)
    .slice(0, 4);
  const line = dam.line || sire.line || `${stableName} line`;
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
    morale: rng.int(70, 90),
    gear: {},
    stimFights: 0,
    injury: null,
    origin: "Set in the yard",
    traits,
    wins: 0,
    losses: 0,
    streak: 0,
    caughtAt: Date.now(),
    moltReady: 0,
    retired: false,
    bredFrom: `${dam.name} × ${sire.name}`,
    line,
  };
}
