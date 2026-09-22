import { ITEMS, RIVALS, SAVE_VERSION, SPECIES, ZERO_STATS } from "./content.ts";
import { isShipped } from "./catalog.ts";
import type { CareerLog, MoltQuality, PaperClip, SaveState, Spider, Stats, YardSeries } from "./types.ts";
import { makeDailyContract, makeDailyWebChallenge } from "./contracts.ts";
import type { MoveId } from "./types.ts";

const EMPTY_CAREER: CareerLog = { hunts: 0, molts: 0, bouts: 0, stripped: 0, clutches: 0, perfectMolts: 0 };

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

function moltQualityOf(v: unknown): MoltQuality | undefined {
  return v === "perfect" || v === "clean" || v === "rough" ? v : undefined;
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
  const lastMolt = moltQualityOf(s.lastMolt);
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
    bredFrom: str(s.bredFrom) || undefined,
    line: str(s.line) || undefined,
    lastMolt,
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

function sanitizePaper(raw: unknown): PaperClip[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const clip = asRecord(entry);
      const headline = str(clip.headline);
      if (!headline) return null;
      return {
        date: str(clip.date),
        headline: headline.slice(0, 120),
        won: clip.won === true,
        fighter: str(clip.fighter).slice(0, 18),
        rival: str(clip.rival).slice(0, 32),
      };
    })
    .filter((clip): clip is PaperClip => !!clip)
    .slice(0, 8);
}

export function migrateSave(persisted: unknown, fromVersion: number): SaveState {
  const p = asRecord(persisted);
  const spiders = (Array.isArray(p.spiders) ? p.spiders : []).map(sanitizeSpider).filter((s): s is Spider => !!s);
  const seen = (Array.isArray(p.seen) ? p.seen : [])
    .filter((id): id is string => typeof id === "string" && !!SPECIES[id]);
  const careerRaw = asRecord(p.career);
  const dailyRaw = asRecord(p.dailyContract);
  const webChallengeRaw = asRecord(p.dailyWebChallenge);
  const rawRivalRecords = asRecord(p.rivalRecords);
  const rivalRecords = Object.fromEntries(
    Object.entries(rawRivalRecords)
      .filter(([id]) => RIVALS.some((r) => r.id === id))
      .map(([id, raw]) => {
        const record = asRecord(raw);
        const rawMoves = asRecord(record.moves);
        const moves = Object.fromEntries(
          Object.entries(rawMoves)
            .filter(([move, count]) => ["lunge", "grapple", "feint", "brace", "yank", "drop"].includes(move) && num(count) > 0)
            .map(([move, count]) => [move, Math.max(0, num(count))]),
        ) as Partial<Record<MoveId, number>>;
        const base = { wins: Math.max(0, num(record.wins)), losses: Math.max(0, num(record.losses)), streak: Math.max(0, num(record.streak)) };
        return [id, Object.keys(moves).length ? { ...base, moves } : base];
      }),
  );
  const date = str(dailyRaw.date, str(p.dayStamp));
  const seriesRaw = asRecord(p.yardSeries);
  const seriesRivals = Array.isArray(seriesRaw.rivals)
    ? seriesRaw.rivals.filter((id): id is string => typeof id === "string" && RIVALS.some((rival) => rival.id === id)).slice(0, 3)
    : [];
  const yardSeries: YardSeries | null = seriesRivals.length === 3 && typeof seriesRaw.playerId === "string" && spiders.some((spider) => spider.id === seriesRaw.playerId)
    ? { date: str(seriesRaw.date), playerId: seriesRaw.playerId, rivals: seriesRivals, stage: Math.max(0, Math.min(2, num(seriesRaw.stage))) }
    : null;
  const generatedContract = makeDailyContract(date || "1970-1-1", Math.max(0, num(p.rank)));
  const generatedWebChallenge = makeDailyWebChallenge(date || "1970-1-1", Math.max(0, num(p.rank)));
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
      (id): id is string => typeof id === "string" && spiders.some((s) => s.id === id && !s.retired),
    ),
    selectedId:
      typeof p.selectedId === "string" && spiders.some((s) => s.id === p.selectedId)
        ? p.selectedId
        : (spiders.find((s) => !s.retired)?.id ?? spiders[0]?.id ?? null),
    huntsLeft: num(p.huntsLeft, 6),
    dayStamp: str(p.dayStamp),
    wins: num(p.wins),
    losses: num(p.losses),
    winStreak: Math.max(0, num(p.winStreak)),
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
      clutches: num(careerRaw.clutches),
      perfectMolts: num(careerRaw.perfectMolts),
    },
    dailyContract: {
      ...generatedContract,
      progress: Math.max(0, Math.min(generatedContract.target, num(dailyRaw.progress))),
      claimed: dailyRaw.claimed === true,
    },
    dailyWebChallenge: {
      ...generatedWebChallenge,
      progress: Math.max(0, Math.min(generatedWebChallenge.target, num(webChallengeRaw.progress))),
      claimed: webChallengeRaw.claimed === true,
    },
    rivalRecords,
    earnedBadges: Array.isArray(p.earnedBadges) ? p.earnedBadges.filter((id): id is string => typeof id === "string") : [],
    yardSeries,
    paper: sanitizePaper(p.paper),
  } satisfies SaveState;
  void fromVersion;
  return save;
}

export { EMPTY_CAREER };
