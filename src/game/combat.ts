import { MOVES, RANKS, SPECIES, ZERO_STATS, maxHp } from "./content";
import { callKo, callRound } from "./caller";
import { clamp, mulberry32, seedFrom } from "./rng";
import { burst, type Particle } from "./spider-draw";
import { addStats, colorsOf, decayTrained, effective, luckOf, stripGear, tickStim } from "./spiders";
import { crackGraft, bayCombat } from "./bay";
import { traitAi, traitHeat } from "./traits";
import type { FightOutcome, FightRound, MorphColors, MoveId, Spider, Stats, WebProfile } from "./types";

export type Fighter = {
  spider: Spider;
  stats: Stats;
  hp: number;
  max: number;
  stam: number;
  attachX: number;
  silk: number;
  /** Earned by reading a rival correctly; spent by the species signature move. */
  webCharge: number;
  angle: number;
  aVel: number;
  pose: MoveId | "idle" | "hurt" | "ko" | "intro";
  poseT: number;
  queued: MoveId | null;
  tell: MoveId | null;
  hurtFlash: number;
  colors: MorphColors;
  facing: 1 | -1;
  name: string;
  web: WebProfile;
};

export type StickFight = {
  player: Fighter;
  enemy: Fighter;
  phase: "intro" | "telegraph" | "resolve" | "ko" | "done";
  phaseT: number;
  round: number;
  particles: Particle[];
  shake: number;
  hitstop: number;
  wager: number;
  practice: boolean;
  rivalId: string;
  rivalName: string;
  rivalStyle: MoveId | null;
  teamBonus: Partial<Stats>;
  lastText: string;
  outcome: FightOutcome | null;
  timing: number;
  timingHit: boolean;
  playerLocked: boolean;
  tellReady: boolean;
  jevMinded: boolean;
  jevReads: number;
  lastPlayerMove: MoveId | null;
  lastEnemyMove: MoveId | null;
  failedJev: boolean;
  pendingJev: MoveId | null;
  roundLog: FightRound[];
  decisionWinner: "player" | "enemy" | null;
  skyId: string | null;
  readWindow: number;
  readGuideOff: boolean;
};

const INTRO = 1.15;
// Players choose only after the tell is exposed. Keep the visible read long
// enough for a real reaction while preserving the pressure of timed rounds.
export const READ_WINDOW_SECONDS = 1.7;
export const ASSIST_READ_WINDOW_SECONDS = 2.5;
/** The moving timing needle earns its bonus while inside this visible band. */
export const SWEET_TIMING_CENTER = 0.62;
export const SWEET_TIMING_TOLERANCE = 0.16;
const RESOLVE = 0.9;
const TELL_LOCK = 0.28;
export const MAX_ROUNDS = 12;

/** Portion of the visible read window still available to make a move. */
export function readWindowPercent(fight: Pick<StickFight, "phase" | "phaseT" | "tellReady" | "readWindow">): number {
  if (fight.phase !== "telegraph" || !fight.tellReady) return 0;
  return clamp(((fight.readWindow - fight.phaseT) / fight.readWindow) * 100, 0, 100);
}

/** Exact seconds left in the player-facing reaction window. */
export function readWindowSeconds(fight: Pick<StickFight, "phase" | "phaseT" | "tellReady" | "readWindow">): number {
  return (readWindowPercent(fight) / 100) * fight.readWindow;
}

/** The first scored call teaches the same timed read with enough room to learn it. */
export function openingReadWindow(
  wins: number,
  losses: number,
  practice: boolean,
  timingAssist: boolean,
): number {
  return timingAssist || (!practice && wins + losses === 0)
    ? ASSIST_READ_WINDOW_SECONDS
    : READ_WINDOW_SECONDS;
}

export function hasSweetTiming(timing: number): boolean {
  return Math.abs(timing - SWEET_TIMING_CENTER) < SWEET_TIMING_TOLERANCE;
}

export function webSurgeHint(web: Pick<WebProfile, "style" | "surge">): string {
  const base =
    web.style === "cross" ? "restore shell and stamina"
      : web.style === "tangle" ? "drain rival stamina"
        : web.style === "spoked" ? "snap for bonus damage"
          : web.style === "golden" ? "bite back and recover"
            : web.style === "sheet" ? "tighten the sheet and recover stamina"
              : "catch hard for bonus damage";
  if (web.surge === "harden") return `${base}, then harden shell`;
  if (web.surge === "reel") return `${base}, then steal tempo`;
  if (web.surge === "ambush") return `${base}, then pin the line`;
  return base;
}

function makeFighter(s: Spider, attach: number, facing: 1 | -1, bonus: Partial<Stats> = {}): Fighter {
  const stats = addStats(effective(s), bonus);
  const hp = maxHp(stats.size, stats.grit, s.stage);
  const kit = bayCombat(s);
  return {
    spider: s,
    stats,
    hp,
    max: hp,
    stam: 100,
    attachX: attach,
    silk: kit.sacs ? 0.3 : 0.22,
    webCharge: kit.sacs ? 1 : 0,
    angle: facing * 0.18,
    aVel: 0,
    pose: "intro",
    poseT: 0,
    queued: null,
    tell: null,
    hurtFlash: 0,
    colors: colorsOf(s),
    facing,
    name: s.name,
    web: SPECIES[s.speciesId]?.web ?? { name: "Loose line", style: "orb", move: "brace", ability: "Brace restores stamina" },
  };
}

export function createFight(
  player: Spider,
  enemy: Spider,
  wager: number,
  rivalId: string,
  rivalName: string,
  rivalStyle: MoveId | null = null,
  teamBonus: Partial<Stats> = {},
  nightMods: Partial<Stats> = {},
  skyId: string | null = null,
  practice = false,
  readWindow = READ_WINDOW_SECONDS,
): StickFight {
  return {
    player: makeFighter(player, 0.36, 1, addStats(addStats({ ...ZERO_STATS }, teamBonus), nightMods)),
    enemy: makeFighter(enemy, 0.64, -1, nightMods),
    phase: "intro",
    phaseT: 0,
    round: 0,
    particles: [],
    shake: 0,
    hitstop: 0,
    wager,
    practice,
    rivalId,
    rivalName,
    rivalStyle,
    teamBonus,
    lastText: "On the stick.",
    outcome: null,
    timing: 0,
    timingHit: false,
    playerLocked: false,
    tellReady: false,
    jevMinded: false,
    jevReads: 0,
    lastPlayerMove: null,
    lastEnemyMove: null,
    failedJev: false,
    pendingJev: null,
    roundLog: [],
    decisionWinner: null,
    skyId,
    readWindow,
    readGuideOff: false,
  };
}

/** The crowd follows the called crew, even when both yards gave a spider the same name. */
export function arenaOpponentName(fight: Pick<StickFight, "rivalName">): string {
  return fight.rivalName;
}

function pickAi(f: StickFight): MoveId {
  const rng = mulberry32((f.round + 1) * 9973 + f.enemy.hp * 13);
  const s = f.enemy.stats;
  const weights: { item: MoveId; w: number }[] = [
    { item: "lunge", w: 3 + s.power * 0.15 },
    { item: "grapple", w: 3 + s.size * 0.12 },
    { item: "feint", w: 2 + s.speed * 0.14 },
    { item: "brace", w: f.enemy.hp < f.enemy.max * 0.4 ? 3 : 1 },
    { item: "yank", w: 2 + s.silk * 0.16 },
    { item: "drop", w: f.player.pose === "lunge" ? 2.5 : 0.8 },
  ];
  const signature = weights.find((entry) => entry.item === f.rivalStyle);
  if (signature) signature.w += 3;
  const bias = traitAi(f.enemy.spider.traits);
  for (const entry of weights) entry.w += bias[entry.item] ?? 0;
  if (f.enemy.stam < 14) return "brace";
  return rng.weighted(weights);
}

export { pickAi };

export function applyEnemyTell(f: StickFight, move: MoveId, fromJev = true): boolean {
  if (f.phase === "intro") {
    f.pendingJev = move;
    if (fromJev) f.jevMinded = true;
    return true;
  }
  if (f.phase !== "telegraph") return false;
  if (f.tellReady && f.phaseT > TELL_LOCK) return false;
  f.enemy.tell = move;
  f.enemy.pose = move;
  f.lastText = MOVES[move].tell;
  f.tellReady = true;
  if (fromJev) {
    f.jevMinded = true;
    f.jevReads += 1;
  }
  return true;
}

function rps(a: MoveId, b: MoveId): number {
  if (a === b) return 0;
  const ma = MOVES[a];
  if (ma.beats === b) return 1;
  if (ma.loses === b) return -1;
  // A move may name its own loss (Silk Yank loses to Brace), so honor the
  // opposite declaration before applying the general defensive fallback.
  if (MOVES[b].loses === a) return 1;
  if (MOVES[b].beats === a) return -1;
  if (a === "brace") return -0.2;
  if (b === "brace") return 0.35;
  return 0;
}

/** Moves that win the current exchange. Used by the live read card and tests. */
export function countersFor(move: MoveId): MoveId[] {
  return (Object.keys(MOVES) as MoveId[]).filter((candidate) => rps(candidate, move) > 0);
}

/** The clearest single answer for a pre-fight scout card. */
export function bestCounterFor(move: MoveId): MoveId | null {
  return countersFor(move).sort((a, b) => MOVES[b].power - MOVES[a].power)[0] ?? null;
}

function spend(f: Fighter, move: MoveId): void {
  f.stam = clamp(f.stam - MOVES[move].stamina, 0, 100);
}

function impulse(f: Fighter, toward: number, amt: number): void {
  f.aVel += toward * amt;
}

export function queuePlayerMove(f: StickFight, move: MoveId): void {
  if (f.phase !== "telegraph" || !f.tellReady || f.playerLocked) return;
  if (f.player.stam < MOVES[move].stamina * 0.5) return;
  f.player.queued = move;
  f.playerLocked = true;
  f.timingHit = hasSweetTiming(f.timing);
}

/** Desktop shortcuts mirror the move grid from left to right. */
export function moveForKey(key: string): MoveId | null {
  const moves: readonly MoveId[] = ["lunge", "grapple", "feint", "brace", "yank", "drop"];
  const index = Number(key) - 1;
  return Number.isInteger(index) && index >= 0 && index < moves.length ? moves[index]! : null;
}

export function stepFight(f: StickFight, dt: number): void {
  const cap = Math.min(dt, 0.05);
  if (f.hitstop > 0) {
    f.hitstop -= cap;
    return;
  }
  f.phaseT += cap;
  f.timing = (f.timing + cap * 1.15) % 1;
  f.shake = Math.max(0, f.shake - cap * 4);
  f.player.hurtFlash = Math.max(0, f.player.hurtFlash - cap);
  f.enemy.hurtFlash = Math.max(0, f.enemy.hurtFlash - cap);
  f.player.poseT += cap;
  f.enemy.poseT += cap;
  f.particles = f.particles
    .map((p) => ({ ...p, x: p.x + p.vx * cap, y: p.y + p.vy * cap, vy: p.vy + 80 * cap, life: p.life - cap }))
    .filter((p) => p.life > 0);

  pendulum(f.player, cap);
  pendulum(f.enemy, cap);

  if (f.phase === "intro") {
    if (f.phaseT >= INTRO) beginTell(f);
    return;
  }
  if (f.phase === "telegraph") {
    if (f.tellReady || f.phaseT >= TELL_LOCK) {
      if (!f.enemy.tell) f.enemy.tell = pickAi(f);
      f.tellReady = true;
      f.enemy.pose = f.enemy.tell;
      if (f.lastText === "Watch the legs.") f.lastText = MOVES[f.enemy.tell].tell;
    }
    if (f.player.queued) f.player.pose = f.player.queued;
    if (f.phaseT >= f.readWindow) resolveRound(f);
    return;
  }
  if (f.phase === "resolve") {
    if (f.phaseT >= RESOLVE) {
      if (f.player.hp <= 0 || f.enemy.hp <= 0) {
        f.phase = "ko";
        f.phaseT = 0;
        const won = f.decisionWinner ? f.decisionWinner === "player" : f.player.hp > 0;
        f.player.pose = won ? "idle" : "ko";
        f.enemy.pose = won ? "ko" : "idle";
        f.lastText = callKo(won, f.player.name, f.enemy.name);
      } else if (f.round >= MAX_ROUNDS) {
        finishOnPoints(f);
      } else {
        beginTell(f);
      }
    }
    return;
  }
  if (f.phase === "ko" && f.phaseT > 1.2 && !f.outcome) {
    f.outcome = buildOutcome(f);
    f.phase = "done";
  }
}

export function finishOnPoints(f: StickFight): void {
  const playerPct = f.player.hp / Math.max(1, f.player.max);
  const enemyPct = f.enemy.hp / Math.max(1, f.enemy.max);
  const lead = playerPct - enemyPct;
  const won = Math.abs(lead) > 0.025 ? lead > 0 : f.player.stam >= f.enemy.stam;
  f.decisionWinner = won ? "player" : "enemy";
  f.phase = "ko";
  f.phaseT = 0;
  f.player.pose = won ? "idle" : "hurt";
  f.enemy.pose = won ? "hurt" : "idle";
  f.lastText = won ? `${f.player.name} takes the judges' decision.` : `${f.enemy.name} takes the judges' decision.`;
}

function beginTell(f: StickFight): void {
  f.phase = "telegraph";
  f.phaseT = 0;
  f.round += 1;
  f.player.queued = null;
  f.playerLocked = false;
  f.player.tell = null;
  if (f.pendingJev) {
    f.enemy.tell = f.pendingJev;
    f.tellReady = true;
    f.jevMinded = true;
    f.jevReads += 1;
    f.lastText = MOVES[f.pendingJev].tell;
    f.pendingJev = null;
  } else {
    f.enemy.tell = pickAi(f);
    f.tellReady = false;
    f.lastText = "Watch the legs.";
  }
  f.player.pose = "idle";
  f.enemy.pose = f.tellReady && f.enemy.tell ? f.enemy.tell : "idle";
  f.player.stam = clamp(f.player.stam + 7, 0, 100);
  f.enemy.stam = clamp(f.enemy.stam + 7, 0, 100);
  f.timing = 0.08;
  f.timingHit = false;
  f.lastText = f.tellReady && f.enemy.tell ? MOVES[f.enemy.tell].tell : "Watch the legs.";
}

function resolveRound(f: StickFight): void {
  f.phase = "resolve";
  f.phaseT = 0;
  const pMove: MoveId = f.player.queued ?? "brace";
  const eMove: MoveId = f.enemy.tell ?? "lunge";
  f.lastPlayerMove = pMove;
  f.lastEnemyMove = eMove;
  f.player.pose = pMove;
  f.enemy.pose = eMove;
  spend(f.player, pMove);
  spend(f.enemy, eMove);

  const cmp = rps(pMove, eMove);
  const timeMul = f.timingHit ? 1.18 : 1;
  const pAtk = attackPower(f.player, pMove) * timeMul;
  const eAtk = attackPower(f.enemy, eMove);

  if (pMove === "yank") {
    const gum = bayCombat(f.player.spider).sticky ? 0.035 : 0;
    f.enemy.silk = clamp(f.enemy.silk + 0.04 + gum, 0.14, 0.36);
    impulse(f.enemy, f.player.facing, 3.2);
  }
  if (eMove === "yank") {
    const gum = bayCombat(f.enemy.spider).sticky ? 0.035 : 0;
    f.player.silk = clamp(f.player.silk + 0.04 + gum, 0.14, 0.36);
    impulse(f.player, f.enemy.facing, 3.2);
  }
  if (pMove === "drop") f.player.silk = clamp(f.player.silk + 0.06, 0.14, 0.4);
  if (eMove === "drop") f.enemy.silk = clamp(f.enemy.silk + 0.06, 0.14, 0.4);
  if (pMove === "lunge") impulse(f.player, 1, 4.4);
  if (eMove === "lunge") impulse(f.enemy, -1, 4.4);
  if (pMove === "grapple") impulse(f.player, 1, 2.6);
  if (eMove === "grapple") impulse(f.enemy, -1, 2.6);

  let pDmg = 0;
  let eDmg = 0;
  let playerSurge: string | undefined;
  let enemySurge: string | undefined;
  if (cmp > 0) {
    pDmg = pAtk * (0.85 + cmp * 0.25);
    if (eMove === "brace") pDmg *= 0.45;
    applyHit(f, f.enemy, pDmg, pMove);
    f.player.webCharge = clamp(f.player.webCharge + 1, 0, 3);
    f.lastText = `${f.player.name} — ${MOVES[pMove].name}`;
  } else if (cmp < 0) {
    eDmg = eAtk * (0.85 - cmp * 0.25);
    if (pMove === "brace") eDmg *= 0.45;
    applyHit(f, f.player, eDmg, eMove);
    f.enemy.webCharge = clamp(f.enemy.webCharge + 1, 0, 3);
    f.lastText = `${f.enemy.name} — ${MOVES[eMove].name}`;
  } else {
    pDmg = pAtk * 0.55;
    eDmg = eAtk * 0.55;
    applyHit(f, f.enemy, pDmg, pMove);
    applyHit(f, f.player, eDmg, eMove);
    f.lastText = "They lock.";
  }

  if (pMove === "brace") f.player.stam = clamp(f.player.stam + 10, 0, 100);
  if (eMove === "brace") f.enemy.stam = clamp(f.enemy.stam + 10, 0, 100);
  applyWebSignature(f.player, f.enemy, pMove);
  applyWebSignature(f.enemy, f.player, eMove);
  if (cmp >= 0) playerSurge = applyWebSurge(f, f.player, f.enemy, pMove);
  if (cmp <= 0) enemySurge = applyWebSurge(f, f.enemy, f.player, eMove);
  const edgeMove = cmp >= 0 ? pMove : eMove;
  f.lastText = callRound({
    player: f.player.name,
    enemy: f.enemy.name,
    result: cmp > 0 ? "edge" : cmp < 0 ? "hit" : "lock",
    move: edgeMove,
    timing: f.timingHit,
    signature: (cmp >= 0 ? f.player : f.enemy).web.move === edgeMove,
    venom: false,
    round: f.round,
  });
  if (playerSurge) f.lastText = `${f.player.name} spends the ${f.player.web.name}.`;
  if (enemySurge && cmp < 0) f.lastText = `${f.enemy.name} spends the ${f.enemy.web.name}.`;
  f.roundLog.push({
    round: f.round,
    playerMove: pMove,
    enemyMove: eMove,
    result: cmp > 0 ? "edge" : cmp < 0 ? "hit" : "lock",
    playerDamage: Math.round(eDmg),
    enemyDamage: Math.round(pDmg),
    playerSurge,
    enemySurge,
  });
}

function attackPower(f: Fighter, move: MoveId): number {
  const m = MOVES[move];
  const s = f.stats;
  const core = s.power * 1.1 + s.size * 0.35 + s.venom * 0.45 + s.speed * 0.2;
  const stamPen = f.stam < 12 ? 0.7 : 1;
  const signature = f.web.move === move && move !== "brace" ? 1.16 : 1;
  const heat = traitHeat(f.spider.traits, f.hp / Math.max(1, f.max));
  const optic = bayCombat(f.spider).optic && move === "lunge" ? 1.16 : 1;
  return (8 + core * 0.55) * m.power * stamPen * signature * heat * optic;
}

function applyWebSignature(fighter: Fighter, opponent: Fighter, move: MoveId): void {
  if (fighter.web.move !== move) return;
  if (move === "brace") {
    fighter.stam = clamp(fighter.stam + 7, 0, 100);
  } else if (move === "yank") {
    opponent.silk = clamp(opponent.silk + 0.035, 0.14, 0.4);
  } else if (move === "drop") {
    fighter.silk = clamp(fighter.silk - 0.025, 0.14, 0.4);
  }
}

function applyHit(f: StickFight, target: Fighter, raw: number, move: MoveId): void {
  const armor = target.stats.grit * 0.012;
  const dmg = Math.max(3, Math.round(raw * (1 - armor)));
  target.hp = Math.max(0, target.hp - dmg);
  target.hurtFlash = 0.22;
  target.pose = target.hp <= 0 ? "ko" : "hurt";
  f.shake = 0.55;
  f.hitstop = 0.06;
  const bob = bobPos(target);
  f.particles.push(...burst(bob.x, bob.y, move === "lunge" ? "ichor" : "silk", 9));
}

function pendulum(fi: Fighter, dt: number): void {
  const g = 18;
  const rest = fi.facing * 0.16;
  const acc = -g * Math.sin(fi.angle - rest) - fi.aVel * 2.4;
  fi.aVel += acc * dt;
  fi.angle += fi.aVel * dt;
  fi.angle = clamp(fi.angle, -0.9, 0.9);
  if (fi.pose === "ko") fi.silk = Math.min(0.42, fi.silk + dt * 0.08);
}

export function bobPos(fi: Fighter): { x: number; y: number } {
  return {
    x: fi.attachX + Math.sin(fi.angle) * fi.silk,
    y: 0.3 + Math.cos(fi.angle) * fi.silk * 0.85,
  };
}

function buildOutcome(f: StickFight): FightOutcome {
  const won = f.decisionWinner ? f.decisionWinner === "player" : f.player.hp > 0;
  const rng = mulberry32(seedFrom(f.player.spider.id + f.round + String(f.wager)));
  const rank = RANKS[clamp(Math.floor(f.wager / 20), 0, RANKS.length - 1)] ?? RANKS[0]!;
  const purse = won ? Math.round(rank.purse * (0.8 + luckOf(f.player.spider) * 0.03) + f.wager) : 0;
  const xp = f.practice ? 8 : won ? 28 + f.round * 4 : 10 + f.round * 2;
  let stripped: string[] = [];
  let decay: Partial<Stats> = {};
  let injury = f.player.spider.injury;
  let loot: string | null = null;
  let spider = f.player.spider;
  let cracked: string | undefined;

  if (f.practice) {
    spider = { ...spider, hp: f.player.hp };
  } else if (!won) {
    const n = rng.int(1, Object.values(spider.gear).filter(Boolean).length ? 2 : 1);
    const st = stripGear(spider, rng, n);
    spider = st.spider;
    stripped = st.stripped;
    const d = decayTrained(spider, rng);
    spider = d.spider;
    decay = d.decay;
    if (rng.chance(0.28)) {
      const crackedBay = crackGraft(spider, rng);
      spider = crackedBay.spider;
      cracked = crackedBay.cracked ?? undefined;
    }
    if (rng.chance(0.45)) {
      injury = { label: rng.pick(["Split femur", "Torn silk gland", "Cracked plate", "Rattled palps"]), fightsLeft: rng.int(1, 3) };
    }
    spider = { ...spider, injury, morale: clamp(spider.morale - rng.int(10, 22), 0, 100), energy: clamp(spider.energy - 22, 0, 100), losses: spider.losses + 1, streak: 0, hp: f.player.hp };
  } else {
    spider = tickStim({
      ...spider,
      wins: spider.wins + 1,
      streak: spider.streak + 1,
      morale: clamp(spider.morale + 6, 0, 100),
      energy: clamp(spider.energy - 16, 8, 100),
      hp: f.player.hp,
      moltReady: spider.moltReady + 6,
    });
    if (rng.chance(0.22 + luckOf(spider) * 0.02) && Object.values(f.enemy.spider.gear).some(Boolean)) {
      const vals = Object.values(f.enemy.spider.gear).filter(Boolean) as string[];
      loot = rng.pick(vals);
    }
  }

  f.player.spider = spider;
  return {
    won,
    practice: f.practice || undefined,
    wager: f.wager,
    purse: won ? purse : 0,
    xp,
    stripped,
    decay,
    loot,
    injury: !won ? injury : null,
    cracked,
    koMove: null,
    playerHp: f.player.hp,
    enemyHp: f.enemy.hp,
    // A rolled spider may share the player's given name. The result card and
    // share card need the crew the player called, which is stable and was
    // visible on the fight card.
    enemyName: f.rivalName,
    rivalId: f.rivalId,
    jevReads: f.jevReads,
    readGuideOff: f.readGuideOff || undefined,
    rounds: f.roundLog,
  };
}

/**
 * Two good reads prime a web. A player must then choose that spider's signature
 * move while holding the exchange to cash it in. Styles intentionally reward
 * different approaches, rather than being a hidden stat bonus.
 */
function applyWebSurge(f: StickFight, fighter: Fighter, opponent: Fighter, move: MoveId): string | undefined {
  if (fighter.webCharge < 2 || fighter.web.move !== move) return undefined;
  fighter.webCharge = 0;
  let label = "";
  if (fighter.web.style === "cross") {
    fighter.hp = clamp(fighter.hp + 12 + fighter.stats.grit * 0.35, 0, fighter.max);
    fighter.stam = clamp(fighter.stam + 10, 0, 100);
    label = "cross brace restores shell";
  } else if (fighter.web.style === "tangle") {
    const gum = bayCombat(fighter.spider).sticky ? 6 : 0;
    opponent.stam = clamp(opponent.stam - 18 - gum, 0, 100);
    label = gum ? "sticky tangle drinks stamina" : "tangle drains stamina";
  } else if (fighter.web.style === "spoked") {
    applyHit(f, opponent, 7 + fighter.stats.speed * 0.45, move);
    fighter.silk = clamp(fighter.silk - 0.05, 0.14, 0.4);
    label = "spoked web snaps tight";
  } else if (fighter.web.style === "golden") {
    applyHit(f, opponent, 6 + fighter.stats.silk * 0.5, move);
    fighter.hp = clamp(fighter.hp + 7, 0, fighter.max);
    label = "gold silk bites back";
  } else if (fighter.web.style === "sheet") {
    fighter.stam = clamp(fighter.stam + 18, 0, 100);
    opponent.silk = clamp(opponent.silk + 0.08, 0.14, 0.4);
    label = "sheet web tightens the line";
  } else {
    applyHit(f, opponent, 6 + fighter.stats.silk * 0.4, move);
    opponent.silk = clamp(opponent.silk + 0.035, 0.14, 0.4);
    label = "orb web catches hard";
  }
  if (fighter.web.surge === "harden") {
    fighter.hp = clamp(fighter.hp + 7 + fighter.stats.grit * 0.2, 0, fighter.max);
    label += "; shell hardens";
  } else if (fighter.web.surge === "reel") {
    opponent.stam = clamp(opponent.stam - 9, 0, 100);
    label += "; steals tempo";
  } else if (fighter.web.surge === "ambush") {
    applyHit(f, opponent, 8 + fighter.stats.speed * 0.35, move);
    opponent.stam = clamp(opponent.stam - 6, 0, 100);
    label += "; pins the line";
  }
  f.lastText = `${fighter.name}'s ${fighter.web.name} surges — ${label}.`;
  return label;
}

export { bobPos as fighterBob };
