import {
  HABITATS,
  ITEMS,
  MAX_STAT,
  NAMES_F,
  NAMES_M,
  SPECIES,
  STAGE_ORDER,
  TRAIT_POOL,
  ZERO_STATS,
  maxEnergy,
  maxHp,
  xpToNext,
} from "./content";
import { clamp, mulberry32, type Rng, uid } from "./rng";
import type {
  GearSlot,
  Habitat,
  MorphColors,
  Rarity,
  Sex,
  Spider,
  Stage,
  Stats,
} from "./types";

export function portraitOf(s: Spider): string {
  const sp = SPECIES[s.speciesId];
  if (!sp) return "/images/spiders/hentz-f.jpg";
  return sp.portraits[s.sex] ?? sp.portraits.default ?? Object.values(sp.portraits)[0]!;
}

export function colorsOf(s: Spider): MorphColors {
  const sp = SPECIES[s.speciesId];
  if (!sp) return SPECIES.hentz!.colors;
  if (s.sex === "male" && sp.maleColors) return sp.maleColors;
  return sp.colors;
}

export function addStats(a: Stats, b: Partial<Stats>): Stats {
  return {
    power: a.power + (b.power ?? 0),
    speed: a.speed + (b.speed ?? 0),
    grit: a.grit + (b.grit ?? 0),
    venom: a.venom + (b.venom ?? 0),
    silk: a.silk + (b.silk ?? 0),
    size: a.size + (b.size ?? 0),
  };
}

export function luckOf(s: Spider): number {
  let n = 0;
  for (const id of Object.values(s.gear)) {
    if (!id) continue;
    n += ITEMS[id]?.bonus?.luck ?? 0;
  }
  return n;
}

export function effective(s: Spider): Stats {
  let e = addStats(s.base, s.trained);
  for (const id of Object.values(s.gear)) {
    if (!id) continue;
    const b = ITEMS[id]?.bonus;
    if (b) e = addStats(e, b);
  }
  (Object.keys(e) as Array<keyof Stats>).forEach((k) => {
    e[k] = clamp(e[k], 1, MAX_STAT);
  });
  return e;
}

export function trainingTotal(s: Spider): number {
  return Object.values(s.trained).reduce((total, value) => total + value, 0);
}

export function spiderScore(s: Spider): number {
  const gearScore = Object.values(s.gear).filter(Boolean).length * 8;
  return Math.max(0, s.wins * 32 - s.losses * 6 + s.level * 12 + trainingTotal(s) * 5 + gearScore);
}

export function filledHp(s: Spider): number {
  const e = effective(s);
  return maxHp(e.size, e.grit, s.stage);
}

export function canFight(s: Spider): string | null {
  if (s.retired) return "Retired";
  if (s.injury && s.injury.fightsLeft > 0) return s.injury.label;
  if (s.energy < 18) return "Too tired";
  if (s.morale < 20) return "Rattled";
  return null;
}

export function rollSpider(
  rng: Rng,
  opts: {
    habitat?: Habitat;
    rank?: number;
    speciesId?: string;
    stage?: Stage;
    asRival?: boolean;
  } = {},
): Spider {
  const habitat = opts.habitat;
  const rank = opts.rank ?? 0;
  let speciesId = opts.speciesId;
  if (!speciesId) {
    const pool = habitat?.species ?? Object.keys(SPECIES);
    const rarity = rollRarity(rng, habitat?.weights ?? { common: 70, uncommon: 25, rare: 5 });
    const matches = pool.filter((id) => SPECIES[id]?.rarity === rarity);
    const fallback = pool.filter((id) => SPECIES[id]);
    speciesId = rng.pick(matches.length ? matches : fallback);
  }
  const spec = SPECIES[speciesId] ?? SPECIES.hentz!;
  const sex: Sex = rng.chance(0.62) ? "female" : "male";
  const stage: Stage = opts.stage ?? (rank < 1 ? "juvenile" : rank < 3 ? "adult" : rank < 5 ? "veteran" : "champion");
  const stageMul =
    stage === "nymph" ? 0.7 : stage === "juvenile" ? 0.85 : stage === "adult" ? 1 : stage === "veteran" ? 1.12 : stage === "champion" ? 1.28 : 1.45;
  const rivalMul = opts.asRival ? 1 + rank * 0.06 : 1;
  const base: Stats = {
    power: clamp(Math.round((spec.bases.power + rng.int(0, spec.spread.power)) * stageMul * rivalMul), 2, MAX_STAT),
    speed: clamp(Math.round((spec.bases.speed + rng.int(0, spec.spread.speed)) * stageMul * rivalMul), 2, MAX_STAT),
    grit: clamp(Math.round((spec.bases.grit + rng.int(0, spec.spread.grit)) * stageMul * rivalMul), 2, MAX_STAT),
    venom: clamp(Math.round((spec.bases.venom + rng.int(0, spec.spread.venom)) * stageMul * rivalMul), 2, MAX_STAT),
    silk: clamp(Math.round((spec.bases.silk + rng.int(0, spec.spread.silk)) * stageMul * rivalMul), 2, MAX_STAT),
    size: clamp(Math.round((spec.bases.size + rng.int(0, spec.spread.size)) * stageMul * (sex === "female" ? 1.08 : 0.9)), 2, MAX_STAT),
  };
  const name = sex === "female" ? rng.pick(NAMES_F) : rng.pick(NAMES_M);
  const traits = [rng.pick(spec.traits), rng.pick(TRAIT_POOL)].filter((t, i, a) => a.indexOf(t) === i);
  const hp = maxHp(base.size, base.grit, stage);
  const energy = maxEnergy(base.size);
  const level = stage === "nymph" ? 1 : stage === "juvenile" ? 2 : stage === "adult" ? 4 : stage === "veteran" ? 7 : stage === "champion" ? 11 : 16;
  return {
    id: uid(),
    name,
    speciesId: spec.id,
    morph: sex,
    sex,
    stage,
    level,
    xp: 0,
    base,
    trained: { ...ZERO_STATS },
    hp,
    energy,
    morale: rng.int(62, 92),
    gear: {},
    stimFights: 0,
    injury: null,
    origin: habitat?.name ?? "The porch",
    traits,
    wins: 0,
    losses: 0,
    streak: 0,
    caughtAt: Date.now(),
    moltReady: rng.int(0, 20),
    retired: false,
  };
}

/** Applies a crew's authored toughness after the species and rank roll. */
export function applyRivalGrit(spider: Spider, grit: number): Spider {
  const scale = clamp(grit, 0.65, 1.7);
  const base = Object.fromEntries(
    Object.entries(spider.base).map(([key, value]) => [key, clamp(Math.round(value * scale), 2, MAX_STAT)]),
  ) as Stats;
  const hp = maxHp(base.size, base.grit, spider.stage);
  return {
    ...spider,
    base,
    hp,
    energy: maxEnergy(base.size),
    traits: [...spider.traits, `${Math.round(scale * 100)}% grit`].slice(0, 6),
  };
}

function rollRarity(rng: Rng, weights: Partial<Record<Rarity, number>>): Rarity {
  const items = (Object.entries(weights) as [Rarity, number][])
    .filter(([, w]) => w > 0)
    .map(([item, w]) => ({ item, w }));
  if (!items.length) return "common";
  return rng.weighted(items);
}

export function starterSpider(): Spider {
  const rng = mulberry32(seedNow());
  const s = rollSpider(rng, { speciesId: "hentz", stage: "juvenile", habitat: HABITATS[0] });
  s.name = s.sex === "female" ? "Cinder" : "Rusty";
  s.morale = 80;
  s.origin = "The porch eave";
  s.traits = ["Porch-bred", "First stick"];
  return s;
}

function seedNow(): number {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
}

export function applyXp(s: Spider, amount: number): Spider {
  const next = { ...s, xp: s.xp + amount };
  while (next.xp >= xpToNext(next.level) && next.level < 30) {
    next.xp -= xpToNext(next.level);
    next.level += 1;
    next.moltReady += 8;
    next.base = addStats(next.base, {
      power: next.level % 2 === 0 ? 1 : 0,
      grit: next.level % 3 === 0 ? 1 : 0,
    });
  }
  return next;
}

export function molt(s: Spider): Spider | null {
  const idx = STAGE_ORDER.indexOf(s.stage);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  if (s.moltReady < 70) return null;
  const stage = STAGE_ORDER[idx + 1]!;
  const grown = addStats(s.base, {
    power: 2,
    speed: 1,
    grit: 2,
    venom: 1,
    silk: 1,
    size: 3,
  });
  const next: Spider = {
    ...s,
    stage,
    base: grown,
    moltReady: 0,
    energy: maxEnergy(grown.size),
    hp: maxHp(grown.size, grown.grit, stage),
    morale: Math.min(100, s.morale + 12),
    injury: { label: "Soft from molt", fightsLeft: 1 },
  };
  return next;
}

export function decayTrained(s: Spider, rng: Rng): { spider: Spider; decay: Partial<Stats> } {
  const keys = (Object.keys(s.trained) as Array<keyof Stats>).filter((k) => s.trained[k] > 0);
  const decay: Partial<Stats> = {};
  if (!keys.length) return { spider: s, decay };
  const count = rng.int(1, Math.min(2, keys.length));
  const trained = { ...s.trained };
  for (let i = 0; i < count; i++) {
    const k = rng.pick(keys);
    const loss = Math.min(trained[k], rng.int(1, 2));
    if (loss > 0) {
      trained[k] -= loss;
      decay[k] = (decay[k] ?? 0) + loss;
    }
  }
  return { spider: { ...s, trained }, decay };
}

export function stripGear(s: Spider, rng: Rng, n: number): { spider: Spider; stripped: string[] } {
  const slots = (Object.keys(s.gear) as GearSlot[]).filter((k) => s.gear[k]);
  const stripped: string[] = [];
  const gear = { ...s.gear };
  for (let i = 0; i < n && slots.length; i++) {
    const idx = rng.int(0, slots.length - 1);
    const slot = slots.splice(idx, 1)[0]!;
    const id = gear[slot];
    if (id) stripped.push(id);
    delete gear[slot];
  }
  return { spider: { ...s, gear }, stripped };
}

export function tickStim(s: Spider): Spider {
  if (!s.gear.stim) return s;
  const left = s.stimFights - 1;
  if (left <= 0) {
    const gear = { ...s.gear };
    delete gear.stim;
    return { ...s, gear, stimFights: 0 };
  }
  return { ...s, stimFights: left };
}

export const STAT_LABEL: Record<keyof Stats, string> = {
  power: "Power",
  speed: "Speed",
  grit: "Grit",
  venom: "Venom",
  silk: "Silk",
  size: "Size",
};

export const STAGE_LABEL: Record<Stage, string> = {
  nymph: "Nymph",
  juvenile: "Juvenile",
  adult: "Adult",
  veteran: "Veteran",
  champion: "Champion",
  legend: "Legend",
};
