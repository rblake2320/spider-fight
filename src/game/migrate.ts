import { ITEMS, RIVALS, SAVE_VERSION, SPECIES, ZERO_STATS } from "./content.ts";
import { isShipped } from "./catalog.ts";
import { BAY_BY_ID } from "./bay.ts";
import { isHideSrc } from "./hides.ts";
import type { CareerLog, FightArchive, FightRound, Hide, Infestation, MoltQuality, PaperClip, SaveState, Spider, Stats, WeeklyCircuit, YardSeries } from "./types.ts";
import { makeDailyContract, makeDailyWebChallenge } from "./contracts.ts";
import { makeWeeklyCircuit } from "./weekly-circuit.ts";
import type { MoveId } from "./types.ts";

const EMPTY_CAREER: CareerLog = { hunts: 0, molts: 0, bouts: 0, stripped: 0, clutches: 0, perfectMolts: 0, worldTitles: 0, bayJobs: 0, splices: 0, hatches: 0, hides: 0, millwrights: 0, houseCut: 0, millPaid: 0 };

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

function sanitizeGrafts(raw: unknown): Spider["grafts"] {
  const record = asRecord(raw);
  const out: NonNullable<Spider["grafts"]> = {};
  for (const [slot, id] of Object.entries(record)) {
    if ((slot === "legs" || slot === "fangs" || slot === "gut" || slot === "gland" || slot === "eye") && typeof id === "string" && BAY_BY_ID[id]?.slot === slot) {
      out[slot] = id;
    }
  }
  return Object.keys(out).length ? out : undefined;
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
    grafts: sanitizeGrafts(s.grafts),
    splicedFrom: str(s.splicedFrom) || undefined,
    spliceMark: SPECIES[str(s.spliceMark)] ? str(s.spliceMark) : undefined,
    brood: sanitizeBrood(s.brood),
    hatchlings: Math.max(0, num(s.hatchlings)) || undefined,
    hideId: str(s.hideId) || undefined,
  };
}

function sanitizeBrood(raw: unknown): Spider["brood"] {
  const record = asRecord(raw);
  const speciesId = str(record.speciesId);
  const fightsLeft = Math.max(0, num(record.fightsLeft));
  if (!SPECIES[speciesId] || fightsLeft <= 0) return undefined;
  const mateName = str(record.mateName);
  return { speciesId, fightsLeft: Math.min(4, fightsLeft), ...(mateName ? { mateName } : {}) };
}

function sanitizeInfestation(raw: unknown): Infestation | null {
  const record = asRecord(raw);
  const speciesId = str(record.speciesId);
  const nights = Math.max(0, num(record.nights));
  const count = Math.max(0, num(record.count));
  if (!SPECIES[speciesId] || nights <= 0 || count <= 0) return null;
  return { speciesId, nights: Math.min(8, nights), count: Math.min(40, count) };
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

function sanitizeFightArchive(raw: unknown): FightArchive[] {
  if (!Array.isArray(raw)) return [];
  const moveIds = ["lunge", "grapple", "feint", "brace", "yank", "drop"] as const;
  const validMove = (value: unknown): value is FightRound["playerMove"] => typeof value === "string" && moveIds.includes(value as FightRound["playerMove"]);
  const archives: FightArchive[] = [];
  for (const entry of raw) {
    if (archives.length >= 12) break;
    const tape = asRecord(entry);
    const enemyName = str(tape.enemyName).slice(0, 32);
    const rivalId = str(tape.rivalId).slice(0, 32);
    if (!enemyName || !rivalId) continue;
    const rounds: FightRound[] = [];
    if (Array.isArray(tape.rounds)) {
      for (const rawRound of tape.rounds.slice(-12)) {
        const round = asRecord(rawRound);
        if (!validMove(round.playerMove) || !validMove(round.enemyMove)) continue;
        const result = round.result === "edge" || round.result === "hit" || round.result === "lock" ? round.result : "lock";
        const playerSurge = str(round.playerSurge);
        const enemySurge = str(round.enemySurge);
        rounds.push({
          round: Math.max(1, num(round.round, 1)), playerMove: round.playerMove, enemyMove: round.enemyMove, result,
          playerDamage: Math.max(0, num(round.playerDamage)), enemyDamage: Math.max(0, num(round.enemyDamage)),
          ...(playerSurge ? { playerSurge } : {}), ...(enemySurge ? { enemySurge } : {}),
        });
      }
    }
    archives.push({
      date: str(tape.date), fighter: str(tape.fighter, "Unnamed").slice(0, 18), enemyName, rivalId,
      won: tape.won === true, practice: tape.practice === true, wager: Math.max(0, num(tape.wager)),
      purse: Math.max(0, num(tape.purse)), ...(typeof tape.points === "number" ? { points: num(tape.points) } : {}), rounds,
    });
  }
  return archives;
}

function sanitizeHides(raw: unknown): Hide[] {
  if (!Array.isArray(raw)) return [];
  const out: Hide[] = [];
  for (const entry of raw) {
    if (out.length >= 6) break;
    const hide = asRecord(entry);
    const id = str(hide.id).slice(0, 48);
    const src = str(hide.src);
    if (!id || !isHideSrc(src)) continue;
    out.push({
      id,
      name: str(hide.name, "Yard hide").slice(0, 18),
      src,
      madeAt: num(hide.madeAt),
      ...(str(hide.maker) ? { maker: str(hide.maker).slice(0, 22) } : {}),
    });
  }
  return out;
}

export function migrateSave(persisted: unknown, fromVersion: number): SaveState {
  const p = asRecord(persisted);
  const spiders = (Array.isArray(p.spiders) ? p.spiders : []).map(sanitizeSpider).filter((s): s is Spider => !!s);
  const hides = sanitizeHides(p.hides);
  const hideIds = new Set(hides.map((hide) => hide.id));
  for (const spider of spiders) {
    if (spider.hideId && !hideIds.has(spider.hideId)) delete spider.hideId;
  }
  const seen = (Array.isArray(p.seen) ? p.seen : [])
    .filter((id): id is string => typeof id === "string" && !!SPECIES[id]);
  const careerRaw = asRecord(p.career);
  const dailyRaw = asRecord(p.dailyContract);
  const webChallengeRaw = asRecord(p.dailyWebChallenge);
  const weeklyRaw = asRecord(p.weeklyCircuit);
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
  const generatedWeeklyCircuit = makeWeeklyCircuit(str(weeklyRaw.week, date || "1970-1-1"), Math.max(0, num(p.rank)));
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
      timingAssist: asRecord(p.settings).timingAssist === true,
      readHints: asRecord(p.settings).readHints !== false,
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
      worldTitles: Math.max(0, num(careerRaw.worldTitles)),
      bayJobs: Math.max(0, num(careerRaw.bayJobs)),
      splices: Math.max(0, num(careerRaw.splices)),
      hatches: Math.max(0, num(careerRaw.hatches)),
      hides: Math.max(0, num(careerRaw.hides)),
      millwrights: Math.max(0, num(careerRaw.millwrights)),
      houseCut: Math.max(0, num(careerRaw.houseCut)),
      millPaid: Math.max(0, num(careerRaw.millPaid)),
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
    weeklyCircuit: {
      ...generatedWeeklyCircuit,
      hunts: Math.max(0, Math.min(generatedWeeklyCircuit.huntTarget, num(weeklyRaw.hunts))),
      trains: Math.max(0, Math.min(generatedWeeklyCircuit.trainTarget, num(weeklyRaw.trains))),
      wins: Math.max(0, Math.min(generatedWeeklyCircuit.winTarget, num(weeklyRaw.wins))),
      claimed: weeklyRaw.claimed === true,
    } satisfies WeeklyCircuit,
    rivalRecords,
    earnedBadges: Array.isArray(p.earnedBadges) ? p.earnedBadges.filter((id): id is string => typeof id === "string") : [],
    yardSeries,
    paper: sanitizePaper(p.paper),
    fightArchive: sanitizeFightArchive(p.fightArchive),
    infestation: sanitizeInfestation(p.infestation),
    hides,
  } satisfies SaveState;
  void fromVersion;
  return save;
}

export { EMPTY_CAREER };
