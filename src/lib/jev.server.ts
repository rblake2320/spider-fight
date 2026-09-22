import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MoveId } from "@/game/types";
import type { BoutSnap, CatchSnap, StickSnapshot } from "./jev-types";

export type { BoutSnap, CatchSnap, StickSnapshot };

const MOVES: MoveId[] = ["lunge", "grapple", "feint", "brace", "yank", "drop"];

const callTimes: number[] = [];
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS = 48;

function readDotEnv(file: string): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const stripped = line.startsWith("export ") ? line.slice(7).trim() : line;
      const eq = stripped.indexOf("=");
      if (eq < 0) {
        if (stripped.startsWith("apikey_")) out.TYPESAFE_API_KEY = stripped;
        continue;
      }
      const key = stripped.slice(0, eq).trim();
      let val = stripped.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

export function getTypeSafeKey(): string | undefined {
  const env = process.env.TYPESAFE_API_KEY?.trim();
  if (env) return env;
  const root = process.cwd();
  const fromDot =
    readDotEnv(join(root, ".env")).TYPESAFE_API_KEY?.trim() ||
    readDotEnv(join(root, ".env.local")).TYPESAFE_API_KEY?.trim();
  if (fromDot) return fromDot;
  try {
    const fromFile = readFileSync(join(root, ".secrets/typesafe.key"), "utf8").trim();
    if (fromFile) return fromFile;
  } catch {
    /* preview / vercel may not have the file */
  }
  return undefined;
}

type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};
type ScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  probabilities?: Record<string, number>;
  legend?: Record<string, string>;
};
type NoulAnswer = { type: "noul"; noul: number };
type Answers = Record<string, ChoiceAnswer | ScoreAnswer | NoulAnswer>;

function allowCall(): boolean {
  const now = Date.now();
  while (callTimes.length && now - callTimes[0]! > WINDOW_MS) callTimes.shift();
  if (callTimes.length >= MAX_CALLS) return false;
  callTimes.push(now);
  return true;
}

async function systemOne(state: unknown, questions: Record<string, unknown>): Promise<Answers | null> {
  const key = getTypeSafeKey();
  if (!key) return null;
  if (!allowCall()) return null;
  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      model: "jev-latest",
      questions,
    }),
    signal: AbortSignal.timeout(1800),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { answers?: Answers };
  return body.answers ?? null;
}

function isMove(v: string): v is MoveId {
  return (MOVES as string[]).includes(v);
}

function sampleMove(probs: Record<string, number> | undefined, fallback: string): MoveId | null {
  const entries = Object.entries(probs ?? {}).filter(([k]) => isMove(k));
  if (!entries.length) return isMove(fallback) ? fallback : null;
  const sum = entries.reduce((a, [, p]) => a + p, 0);
  let r = Math.random() * (sum || 1);
  for (const [k, p] of entries) {
    r -= p;
    if (r <= 0) return k as MoveId;
  }
  const top = entries.sort((a, b) => b[1] - a[1])[0]?.[0];
  return top && isMove(top) ? top : null;
}

export async function decideRivalMove(snap: StickSnapshot): Promise<
  | { ok: true; move: MoveId; confidence: number; aggression: number; baiting: number; usedJev: boolean }
  | { ok: false; error: string }
> {
  if (snap.enemy.stam < 12) {
    return { ok: true, move: "brace", confidence: 1, aggression: 0, baiting: 0, usedJev: false };
  }
  const answers = await systemOne(
    {
      game: "Spider Fight — southern stick circuit, two orbweavers hanging on silk from a bamboo stick",
      round: snap.round,
      rival_crew: snap.rival,
      identity: snap.rival.mind
        ? "You ARE Jev, the stick mind on the far silk. You are the opponent. Play to win. Mix throws. Do not get baited into repeating the last one. Count their legs."
        : "You pick for this rival crew. Stay in character. Play to win.",
      rules:
        "RPS: lunge beats feint, feint beats grapple, grapple beats lunge. yank beats drop, drop beats lunge. brace cuts damage and recovers stamina. Do not assume the player's next input — only their last resolved move is known.",
      you: snap.enemy,
      opponent: snap.player,
    },
    {
      next_move: {
        type: "choice",
        instructions: "Which move should this rival spider throw right now?",
        criteria: {
          lunge: "Commit forward. Beats feint. Loses to grapple. High power, spends stamina.",
          grapple: "Drop the body and lock. Beats lunge. Loses to feint.",
          feint: "Twitch, don't commit. Beats grapple. Loses to lunge. Cheap stamina.",
          brace: "Tuck in, cut damage, recover stamina. Right when hurt or winded.",
          yank: "Pulse the dragline to unbalance. Beats a drop.",
          drop: "Pay out silk and drop. Beats a lunge. Loses to a yank.",
        },
      },
      aggression: {
        type: "score",
        instructions: "How committed should the rival be this exchange?",
        criteria: ["Play safe and recover", "Mix it up, stay even", "Go for the stick now"],
      },
      baiting: {
        type: "noul",
        instructions: "The player is repeating a pattern or setting a counter rather than committing.",
      },
    },
  );
  if (!answers) return { ok: false, error: "jev_unavailable" };
  const choice = answers.next_move;
  const score = answers.aggression;
  const noul = answers.baiting;
  if (!choice || choice.type !== "choice") return { ok: false, error: "bad_answer" };
  const move =
    (choice.confidence >= 0.4 && isMove(choice.choice) ? choice.choice : sampleMove(choice.probabilities, choice.choice)) ??
    (isMove(choice.choice) ? choice.choice : null);
  if (!move) return { ok: false, error: "bad_move" };
  return {
    ok: true,
    move,
    confidence: choice.confidence,
    aggression: score?.type === "score" ? score.score : 1,
    baiting: noul?.type === "noul" ? noul.noul : 0.5,
    usedJev: true,
  };
}

export async function judgeBout(snap: BoutSnap): Promise<
  | { ok: true; dominance: number; label: string; lesson: string; confidence: number }
  | { ok: false; error: string }
> {
  const answers = await systemOne(
    {
      game: "Spider Fight stick bout just ended",
      winner: snap.won ? snap.playerName : snap.enemyName,
      loser: snap.won ? snap.enemyName : snap.playerName,
      player: snap.playerName,
      enemy: snap.enemyName,
      rounds: snap.rounds,
      player_hp_left: snap.playerHp,
      enemy_hp_left: snap.enemyHp,
      wager: snap.wager,
      gear_stripped: snap.stripped,
    },
    {
      dominance: {
        type: "score",
        instructions: "How one-sided was this stick fight?",
        criteria: [
          "Toss-up scrap, either could have held it",
          "Clear winner, but they had to work",
          "Domination — the loser never had the stick",
        ],
      },
      lesson: {
        type: "choice",
        instructions: "What should the player train or buy next after this bout?",
        criteria: {
          power: "Need harder hits",
          speed: "Need to win the tell window",
          grit: "Need to survive trades",
          venom: "Need lingering damage",
          silk: "Need better line control (yank/drop)",
          wraps: "Need gear on the body — wraps or fang",
        },
      },
    },
  );
  if (!answers) return { ok: false, error: "jev_unavailable" };
  const dominance = answers.dominance;
  const lesson = answers.lesson;
  if (!dominance || dominance.type !== "score" || !lesson || lesson.type !== "choice") {
    return { ok: false, error: "bad_answer" };
  }
  const labels = dominance.legend ?? {
    "0": "even scrap",
    "1": "clear winner",
    "2": "domination",
  };
  const nearest = String(Math.round(Math.min(2, Math.max(0, dominance.score))));
  return {
    ok: true,
    dominance: dominance.score,
    label: labels[nearest] ?? "clear winner",
    lesson: lesson.choice,
    confidence: dominance.confidence,
  };
}

export async function appraiseCatch(snap: CatchSnap): Promise<
  | { ok: true; value: number; blurb: string; train: string }
  | { ok: false; error: string }
> {
  const answers = await systemOne(
    {
      game: "Spider Fight hunt — player just pulled an orbweaver off a line",
      spider: snap,
      circuit_rank: snap.rank,
    },
    {
      value: {
        type: "score",
        instructions: "How useful is this spider on the stick circuit at the player's current rank?",
        criteria: [
          "Release bait — better as feed than a fighter",
          "Yard filler — will do for alley bouts",
          "Keeper — belongs on the traveling team",
          "Ace — protect this one, molt it up",
        ],
      },
      train: {
        type: "choice",
        instructions: "If they keep it, what should they drill first?",
        criteria: {
          power: "Hits",
          speed: "Tells and timing",
          grit: "Taking a beating",
          venom: "Fang work",
          silk: "Line control",
        },
      },
    },
  );
  if (!answers) return { ok: false, error: "jev_unavailable" };
  const value = answers.value;
  const train = answers.train;
  if (!value || value.type !== "score" || !train || train.type !== "choice") {
    return { ok: false, error: "bad_answer" };
  }
  const blurbs = value.legend ?? {
    "0": "Better as feed than a fighter",
    "1": "Will do for alley bouts",
    "2": "Belongs on the traveling team",
    "3": "Protect this one, molt it up",
  };
  const nearest = String(Math.round(Math.min(3, Math.max(0, value.score))));
  return {
    ok: true,
    value: value.score,
    blurb: blurbs[nearest] ?? "Yard filler",
    train: train.choice,
  };
}
