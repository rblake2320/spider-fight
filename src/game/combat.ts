import { MOVES, RANKS, maxHp } from "./content";
import { clamp, mulberry32, seedFrom } from "./rng";
import { burst, type Particle } from "./spider-draw";
import { colorsOf, decayTrained, effective, luckOf, stripGear, tickStim } from "./spiders";
import type { FightOutcome, MorphColors, MoveId, Spider, Stats } from "./types";

export type Fighter = {
  spider: Spider;
  stats: Stats;
  hp: number;
  max: number;
  stam: number;
  attachX: number;
  silk: number;
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
  rivalId: string;
  rivalName: string;
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
};

const INTRO = 1.15;
const TELL = 1.18;
const RESOLVE = 0.9;
const TELL_LOCK = 0.42;

function makeFighter(s: Spider, attach: number, facing: 1 | -1): Fighter {
  const stats = effective(s);
  const hp = maxHp(stats.size, stats.grit, s.stage);
  return {
    spider: s,
    stats,
    hp,
    max: hp,
    stam: 100,
    attachX: attach,
    silk: 0.22,
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
  };
}

export function createFight(player: Spider, enemy: Spider, wager: number, rivalId: string, rivalName: string): StickFight {
  return {
    player: makeFighter(player, 0.36, 1),
    enemy: makeFighter(enemy, 0.64, -1),
    phase: "intro",
    phaseT: 0,
    round: 0,
    particles: [],
    shake: 0,
    hitstop: 0,
    wager,
    rivalId,
    rivalName,
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
  };
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
  if (a === "brace") return -0.2;
  if (b === "brace") return 0.35;
  return 0;
}

function spend(f: Fighter, move: MoveId): void {
  f.stam = clamp(f.stam - MOVES[move].stamina, 0, 100);
}

function impulse(f: Fighter, toward: number, amt: number): void {
  f.aVel += toward * amt;
}

export function queuePlayerMove(f: StickFight, move: MoveId): void {
  if (f.phase !== "telegraph" || f.playerLocked) return;
  if (f.player.stam < MOVES[move].stamina * 0.5) return;
  f.player.queued = move;
  f.playerLocked = true;
  const window = Math.abs(f.timing - 0.62);
  f.timingHit = window < 0.16;
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
    if (f.phaseT >= TELL) resolveRound(f);
    return;
  }
  if (f.phase === "resolve") {
    if (f.phaseT >= RESOLVE) {
      if (f.player.hp <= 0 || f.enemy.hp <= 0) {
        f.phase = "ko";
        f.phaseT = 0;
        const won = f.player.hp > 0;
        f.player.pose = won ? "idle" : "ko";
        f.enemy.pose = won ? "ko" : "idle";
        f.lastText = won ? `${f.player.name} holds the stick.` : `${f.enemy.name} takes it.`;
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
  f.lastText = "Watch the legs.";
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
    f.enemy.silk = clamp(f.enemy.silk + 0.04, 0.14, 0.36);
    impulse(f.enemy, f.player.facing, 3.2);
  }
  if (eMove === "yank") {
    f.player.silk = clamp(f.player.silk + 0.04, 0.14, 0.36);
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
  if (cmp > 0) {
    pDmg = pAtk * (0.85 + cmp * 0.25);
    if (eMove === "brace") pDmg *= 0.45;
    applyHit(f, f.enemy, pDmg, pMove);
    f.lastText = `${f.player.name} — ${MOVES[pMove].name}`;
  } else if (cmp < 0) {
    eDmg = eAtk * (0.85 - cmp * 0.25);
    if (pMove === "brace") eDmg *= 0.45;
    applyHit(f, f.player, eDmg, eMove);
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
}

function attackPower(f: Fighter, move: MoveId): number {
  const m = MOVES[move];
  const s = f.stats;
  const core = s.power * 1.1 + s.size * 0.35 + s.venom * 0.45 + s.speed * 0.2;
  const stamPen = f.stam < 12 ? 0.7 : 1;
  return (8 + core * 0.55) * m.power * stamPen;
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
  const won = f.player.hp > 0;
  const rng = mulberry32(seedFrom(f.player.spider.id + f.round + String(f.wager)));
  const rank = RANKS[clamp(Math.floor(f.wager / 20), 0, RANKS.length - 1)] ?? RANKS[0]!;
  const purse = won ? Math.round(rank.purse * (0.8 + luckOf(f.player.spider) * 0.03) + f.wager) : 0;
  const xp = won ? 28 + f.round * 4 : 10 + f.round * 2;
  let stripped: string[] = [];
  let decay: Partial<Stats> = {};
  let injury = f.player.spider.injury;
  let loot: string | null = null;
  let spider = f.player.spider;

  if (!won) {
    const n = rng.int(1, Object.values(spider.gear).filter(Boolean).length ? 2 : 1);
    const st = stripGear(spider, rng, n);
    spider = st.spider;
    stripped = st.stripped;
    const d = decayTrained(spider, rng);
    spider = d.spider;
    decay = d.decay;
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
    wager: f.wager,
    purse: won ? purse : 0,
    xp,
    stripped,
    decay,
    loot,
    injury: !won ? injury : null,
    koMove: null,
    playerHp: f.player.hp,
    enemyHp: f.enemy.hp,
    enemyName: f.enemy.name,
    rivalId: f.rivalId,
    jevReads: f.jevReads,
  };
}

export { bobPos as fighterBob };
