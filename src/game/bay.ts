import { RANKS } from "./content.ts";
import { clamp, type Rng } from "./rng.ts";
import { TRAITS } from "./traits.ts";
import type { BaySlot, Spider, Stats } from "./types.ts";

export type BayLook = {
  legs: number;
  length: number;
  fangs: number;
  plump: number;
  silk: number;
  splice: boolean;
};

export type BayJob = {
  id: string;
  slot: BaySlot;
  name: string;
  blurb: string;
  price: number;
  rank: number;
  energy: number;
  bonus: Partial<Stats>;
  look: Partial<BayLook>;
};

export const BAY_SLOTS: { id: BaySlot; label: string; blurb: string }[] = [
  { id: "legs", label: "Legs", blurb: "Tires. Reach, shove, how she hangs." },
  { id: "fangs", label: "Fangs", blurb: "The mill. Bite first." },
  { id: "gut", label: "Gut", blurb: "The chassis. Size and grit." },
  { id: "gland", label: "Gland", blurb: "The turbo. Silk and pull." },
];

/** Rank-gated body work. Gear still walks off a loss; this is bolted to the shell. */
export const BAY_JOBS: BayJob[] = [
  {
    id: "joint-tape",
    slot: "legs",
    name: "Joint tape",
    blurb: "Porch tape at the femurs. First honest upgrade.",
    price: 22,
    rank: 0,
    energy: 10,
    bonus: { grit: 1 },
    look: { legs: 1.12 },
  },
  {
    id: "bulk-femurs",
    slot: "legs",
    name: "Bulk femurs",
    blurb: "Thicker legs. Hits harder, turns slower.",
    price: 64,
    rank: 1,
    energy: 16,
    bonus: { power: 2, size: 1, speed: -1 },
    look: { legs: 1.45 },
  },
  {
    id: "long-tarsi",
    slot: "legs",
    name: "Long tarsi",
    blurb: "Stretched reach. She covers more stick.",
    price: 88,
    rank: 2,
    energy: 16,
    bonus: { speed: 2, silk: 1, grit: -1 },
    look: { length: 1.22, legs: 0.92 },
  },
  {
    id: "whet-fangs",
    slot: "fangs",
    name: "Whet fangs",
    blurb: "Honed chelicerae. The mill gets mean.",
    price: 96,
    rank: 2,
    energy: 14,
    bonus: { venom: 2, power: 1 },
    look: { fangs: 1.4 },
  },
  {
    id: "brick-gut",
    slot: "gut",
    name: "Brick gut",
    blurb: "Abdomen packed. She soaks a lock.",
    price: 140,
    rank: 3,
    energy: 18,
    bonus: { grit: 3, size: 2, speed: -1 },
    look: { plump: 0.22 },
  },
  {
    id: "spinner-press",
    slot: "gland",
    name: "Spinner press",
    blurb: "Gland work. Extra thread on the drop.",
    price: 210,
    rank: 4,
    energy: 18,
    bonus: { silk: 3, speed: 1 },
    look: { silk: 1 },
  },
  {
    id: "race-frame",
    slot: "legs",
    name: "Race frame",
    blurb: "Regional kit. Fast and heavy at once.",
    price: 340,
    rank: 5,
    energy: 22,
    bonus: { speed: 2, power: 2 },
    look: { legs: 1.28, length: 1.12 },
  },
  {
    id: "world-mill",
    slot: "fangs",
    name: "World mill",
    blurb: "Endgame fangs. Cash you earned on the stick.",
    price: 480,
    rank: 7,
    energy: 24,
    bonus: { venom: 3, power: 2 },
    look: { fangs: 1.7 },
  },
];

export const BAY_BY_ID: Record<string, BayJob> = Object.fromEntries(BAY_JOBS.map((job) => [job.id, job]));

const BAY_STAT_ORDER: Array<keyof Stats> = ["power", "speed", "grit", "venom", "silk", "size"];

/** Exact stat movement shown before a player spends cash and energy in the bay. */
export function bayBonusLine(bonus: Partial<Stats>): string {
  return BAY_STAT_ORDER
    .filter((stat) => (bonus[stat] ?? 0) !== 0)
    .map((stat) => `${(bonus[stat] ?? 0) > 0 ? "+" : ""}${bonus[stat]} ${stat}`)
    .join(" · ") || "No stat change";
}

export function bayJobOf(id: string | undefined): BayJob | undefined {
  return id ? BAY_BY_ID[id] : undefined;
}

export function graftsOf(spider: Spider): Partial<Record<BaySlot, string>> {
  return spider.grafts ?? {};
}

export function bayStats(spider: Spider): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const id of Object.values(graftsOf(spider))) {
    const bonus = bayJobOf(id)?.bonus;
    if (!bonus) continue;
    (Object.keys(bonus) as Array<keyof Stats>).forEach((key) => {
      out[key] = (out[key] ?? 0) + (bonus[key] ?? 0);
    });
  }
  return out;
}

export function bayLook(spider: Spider): BayLook {
  const look: BayLook = { legs: 1, length: 1, fangs: 1, plump: 0, silk: 0, splice: Boolean(spider.spliceMark) };
  for (const id of Object.values(graftsOf(spider))) {
    const extra = bayJobOf(id)?.look;
    if (!extra) continue;
    if (extra.legs) look.legs *= extra.legs;
    if (extra.length) look.length *= extra.length;
    if (extra.fangs) look.fangs *= extra.fangs;
    look.plump += extra.plump ?? 0;
    look.silk += extra.silk ?? 0;
  }
  return look;
}

export function canFit(job: BayJob, spider: Spider, cash: number, rank: number): string | null {
  if (spider.retired) return "Hung in the rafters";
  if (spider.injury) return spider.injury.label;
  if (rank < job.rank) return `Need ${RANKS[job.rank]?.name ?? "higher rank"}`;
  if (cash < job.price) return "Not enough cash";
  if (spider.energy < job.energy) return "Too tired for the bay";
  if (graftsOf(spider)[job.slot] === job.id) return "Already running that kit";
  if ((job.slot === "gut" || job.slot === "gland") && spider.stage === "nymph") return "Let her grow first";
  return null;
}

export function applyJob(spider: Spider, job: BayJob): Spider {
  return {
    ...spider,
    grafts: { ...graftsOf(spider), [job.slot]: job.id },
    energy: Math.max(0, spider.energy - job.energy),
    morale: clamp(spider.morale + 4, 0, 100),
  };
}

export function spliceCost(rank: number): number {
  return 40 + rank * 6;
}

export function canSplice(host: Spider, donor: Spider, cash: number, rank: number): string | null {
  if (host.id === donor.id) return "Need a donor";
  if (host.retired) return "Hung in the rafters";
  if (host.injury) return host.injury.label;
  if (rank < 2) return "Reach District before splicing blood";
  if (cash < spliceCost(rank)) return "Not enough cash";
  if (host.energy < 22) return "Too tired for a graft";
  if (host.stage === "nymph" || host.stage === "juvenile") return "Let the host grow first";
  return null;
}

export function splice(host: Spider, donor: Spider, rng: Rng): { host: Spider; fever: boolean } {
  const traits = [...host.traits];
  const taken = donor.traits.find((trait) => TRAITS[trait] && !traits.includes(trait));
  if (taken) {
    if (traits.length >= 6) traits.pop();
    traits.push(taken);
  }
  if (!traits.includes("Yard-spliced")) {
    if (traits.length >= 6) traits.pop();
    traits.push("Yard-spliced");
  }
  const focus = (Object.keys(donor.base) as Array<keyof Stats>).reduce((best, stat) =>
    donor.base[stat] > donor.base[best] ? stat : best, "power");
  const base = { ...host.base, [focus]: clamp(host.base[focus] + 1, 2, 42) };
  const fever = rng.chance(0.18);
  return {
    host: {
      ...host,
      base,
      traits: traits.slice(0, 6),
      splicedFrom: donor.name,
      spliceMark: donor.speciesId,
      energy: Math.max(0, host.energy - 22),
      morale: clamp(host.morale + (fever ? -8 : 6), 0, 100),
      injury: fever ? { label: "Graft fever", fightsLeft: 1 } : host.injury,
    },
    fever,
  };
}

export function crackGraft(spider: Spider, rng: Rng): { spider: Spider; cracked: string | null } {
  const slots = (Object.keys(graftsOf(spider)) as BaySlot[]).filter((slot) => graftsOf(spider)[slot]);
  if (!slots.length) return { spider, cracked: null };
  const slot = rng.pick(slots);
  const id = graftsOf(spider)[slot];
  const grafts = { ...graftsOf(spider) };
  delete grafts[slot];
  return { spider: { ...spider, grafts }, cracked: bayJobOf(id)?.name ?? id ?? null };
}

export function bayKitLine(spider: Spider): string {
  const names = (Object.keys(graftsOf(spider)) as BaySlot[])
    .map((slot) => bayJobOf(graftsOf(spider)[slot])?.name)
    .filter((name): name is string => Boolean(name));
  if (spider.splicedFrom) names.push(`spliced ${spider.splicedFrom}`);
  return names.length ? names.join(" · ") : "Stock frame";
}
