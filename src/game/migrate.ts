import { ITEMS, SAVE_VERSION, SPECIES, ZERO_STATS } from "./content.ts";
import { isShipped } from "./catalog.ts";
import type { CareerLog, SaveState, Spider, Stats } from "./types.ts";
import { makeDailyContract } from "./contracts.ts";

const EMPTY_CAREER: CareerLog = { hunts: 0, molts: 0, bouts: 0, stripped: 0 };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function statsOf(v: unknown): Stats {
  const s = asRecord(v);
  return {
    power: num(s.power),
    speed: num(s.speed),
    grit: num(s.grit),
    venom: num(s.venom),
    silk: num(s.silk),
    size: num(s.size),
  };
}

export function sanitizeSpider(raw: unknown): Spider | null {
  const s = asRecord(raw);
  const id = str(s.id);
  if (!id) return null;
  const speciesId = SPECIES[str(s.speciesId)] ? str(s.speciesId) : "hentz";
  const gear: Spider["gear"] = {};
  const rawGear = asRecord(s.gear);
  for (const [slot, itemId] of Object.entries(rawGear)) {
    if (typeof itemId === "string" && ITEMS[itemId]) gear[slot as keyof Spider["gear"]] = itemId;
  }
  return {
    id,
    name: str(s.name, "Unnamed").slice(0, 18),
    speciesId,
    morph: str(s.morph, "female"),
    sex: s.sex === "male" ? "male" : "female",
    stage: (["nymph", "juvenile", "adult", "veteran", "champion", "legend"] as const).includes(
      s.stage as Spider["stage"],
    )
      ? (s.stage as Spider["stage"])
      : "juvenile",
    level: Math.max(1, num(s.level, 1)),
    xp: Math.max(0, num(s.xp)),
    base: { ...ZERO_STATS, ...statsOf(s.base) },
    trained: { ...ZERO_STATS, ...statsOf(s.trained) },
    hp: num(s.hp, 20),
    energy: num(s.energy, 40),
    morale: num(s.morale, 70),
    gear,
    stimFights: num(s.stimFights),
    injury: s.injury && typeof s.injury === "object" ? (s.injury as Spider["injury"]) : null,
    origin: str(s.origin, "porch"),
    traits: Array.isArray(s.traits) ? s.traits.filter((t): t is string => typeof t === "string").slice(0, 6) : [],
    wins: num(s.wins),
    losses: num(s.losses),
    streak: num(s.streak),
    caughtAt: num(s.caughtAt, Date.now()),
    moltReady: num(s.moltReady),
    retired: s.retired === true,
  };
}

export function sanitizeInventory(raw: unknown): Record<string, number> {
  const inv = asRecord(raw);
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(inv)) {
    if (!ITEMS[id] || !isShipped(ITEMS[id]!)) continue;
    const count = num(n);
    if (count > 0) out[id] = count;
  }
  return out;
}

export function migrateSave(persisted: unknown, fromVersion: number): SaveState {
  const p = asRecord(persisted);
  const spiders = (Array.isArray(p.spiders) ? p.spiders : []).map(sanitizeSpider).filter((s): s is Spider => !!s);
  const seen = (Array.isArray(p.seen) ? p.seen : [])
    .filter((id): id is string => typeof id === "string" && !!SPECIES[id]);
  const careerRaw = asRecord(p.career);
  const dailyRaw = asRecord(p.dailyContract);
  const date = str(dailyRaw.date, str(p.dayStamp));
  const generatedContract = makeDailyContract(date || "1970-1-1", Math.max(0, num(p.rank)));
  const save = {
    version: SAVE_VERSION,
    season: Math.max(1, num(p.season, 1)),
    stableName: str(p.stableName, "Porch Crew").slice(0, 22),
    cash: Math.max(0, num(p.cash, 48)),
    rank: Math.max(0, num(p.rank)),
    rankPoints: Math.max(0, num(p.rankPoints)),
    spiders,
    inventory: sanitizeInventory(p.inventory),
    rosterCap: Math.max(4, num(p.rosterCap, 6)),
    activeTeam: (Array.isArray(p.activeTeam) ? p.activeTeam : []).filter(
      (id): id is string => typeof id === "string" && spiders.some((s) => s.id === id),
    ),
    selectedId:
      typeof p.selectedId === "string" && spiders.some((s) => s.id === p.selectedId)
        ? p.selectedId
        : (spiders[0]?.id ?? null),
    huntsLeft: num(p.huntsLeft, 6),
    dayStamp: str(p.dayStamp),
    wins: num(p.wins),
    losses: num(p.losses),
    tutorial: num(p.tutorial),
    settings: {
      sfx: asRecord(p.settings).sfx !== false,
      music: asRecord(p.settings).music !== false,
      reduceMotion: asRecord(p.settings).reduceMotion === true,
    },
    seen: seen.length ? seen : ["hentz"],
    flags: asRecord(p.flags) as SaveState["flags"],
    career: {
      hunts: num(careerRaw.hunts),
      molts: num(careerRaw.molts),
      bouts: num(careerRaw.bouts),
      stripped: num(careerRaw.stripped),
    },
    dailyContract: {
      ...generatedContract,
      progress: Math.max(0, Math.min(generatedContract.target, num(dailyRaw.progress))),
      claimed: dailyRaw.claimed === true,
    },
  } satisfies SaveState;
  void fromVersion;
  return save;
}

export { EMPTY_CAREER };
