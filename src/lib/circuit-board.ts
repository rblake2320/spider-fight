import { createServerFn } from "@tanstack/react-start";
import { mulberry32, seedFrom } from "@/game/rng";
import { authMiddleware } from "./auth/middleware";

export type CircuitEntry = {
  stableName: string;
  score: number;
  wins: number;
  rank: number;
  updatedAt: string;
};

export type CircuitPlacement = {
  position: number;
  total: number;
};

export type CircuitChase = {
  entry: CircuitEntry;
  /** The smallest score gain that beats this yard under the board's score-first order. */
  pointsNeeded: number;
};

type CircuitSeason = { season: number };
type CircuitSubmission = Pick<CircuitEntry, "stableName" | "score" | "wins" | "rank"> & CircuitSeason;
type DailyCircuit = CircuitSeason & { day: string };
type DailyCircuitSubmission = CircuitSubmission & DailyCircuit;

/** Shared daily cards reset at midnight UTC, so every yard sees the same race. */
export function circuitDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const PORCH_LADDER_NAMES = ["Fence Line", "Porch Saints", "Culvert Kids", "Backstep Silk", "Moth Crew", "Rafter Rats"];

/** A daily, offline rival ladder keeps every new yard chasing a real score before the shared board fills. */
export function porchCircuitLadder(season: number, day = circuitDay()): CircuitEntry[] {
  const rng = mulberry32(seedFrom(`porch-ladder:${day}:${season}`));
  return PORCH_LADDER_NAMES.map((stableName, index) => ({
    stableName,
    score: 12 + season * 7 + index * 6 + rng.int(0, 16),
    wins: 1 + rng.int(0, Math.max(1, season + 2)),
    rank: Math.min(7, Math.floor((season - 1) / 2)),
    updatedAt: day,
  })).sort((a, b) => b.score - a.score || b.wins - a.wins || a.stableName.localeCompare(b.stableName));
}

/** Gives a player one reachable yard to pass instead of an inert list of scores. */
export function nextCircuitChase(entries: CircuitEntry[], score: number, wins: number, stableName: string): CircuitChase | null {
  const ahead = entries.filter((entry) =>
    entry.stableName !== stableName && (entry.score > score || (entry.score === score && entry.wins > wins)),
  );
  if (!ahead.length) return null;
  return ahead
    .map((entry) => ({ entry, pointsNeeded: Math.max(1, entry.score - score + 1) }))
    .sort((a, b) => a.pointsNeeded - b.pointsNeeded || a.entry.wins - b.entry.wins || a.entry.stableName.localeCompare(b.entry.stableName))[0] ?? null;
}

function validSeason(input: CircuitSeason): CircuitSeason {
  if (!Number.isInteger(input.season) || input.season < 1 || input.season > 10000) throw new Error("Invalid circuit year");
  return { season: input.season };
}

function validSubmission(input: CircuitSubmission): CircuitSubmission {
  const stableName = input.stableName.trim().slice(0, 22);
  if (!stableName) throw new Error("Stable name is required");
  for (const value of [input.score, input.wins, input.rank]) {
    if (!Number.isInteger(value) || value < 0) throw new Error("Invalid circuit score");
  }
  if (input.score > 100000 || input.wins > 10000 || input.rank > 7) throw new Error("Circuit score exceeds board limits");
  return { stableName, score: input.score, wins: input.wins, rank: input.rank, ...validSeason(input) };
}

function validDaily(input: DailyCircuit): DailyCircuit {
  const day = typeof input.day === "string" ? input.day : "";
  if (day !== circuitDay()) throw new Error("Daily board is open for today only");
  return { ...validSeason(input), day };
}

function validDailySubmission(input: DailyCircuitSubmission): DailyCircuitSubmission {
  return { ...validSubmission(input), ...validDaily(input) };
}

export const listCircuitBoard = createServerFn({ method: "GET" })
  .validator((input: CircuitSeason) => validSeason(input))
  .handler(async ({ data }): Promise<CircuitEntry[]> => {
  const { getSql } = await import("./db");
  const sql = await getSql();
  return sql<CircuitEntry>`
    select stable_name as "stableName", score, wins, rank, updated_at::text as "updatedAt"
    from circuit_leaderboard
    where season = ${data.season}
    order by score desc, wins desc, updated_at desc
    limit 20
  `;
  });

export const postCircuitScore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CircuitSubmission) => validSubmission(input))
  .handler(async ({ data, context }): Promise<CircuitPlacement> => {
    const { getSql } = await import("./db");
    const sql = await getSql();
    await sql`
      insert into circuit_leaderboard (user_id, season, stable_name, score, wins, rank)
      values (${context.userId}, ${data.season}, ${data.stableName}, ${data.score}, ${data.wins}, ${data.rank})
      on conflict (user_id, season) do update set
        stable_name = excluded.stable_name,
        score = excluded.score,
        wins = excluded.wins,
        rank = excluded.rank,
        updated_at = now()
    `;
    const [placement] = await sql<CircuitPlacement>`
      with mine as (
        select score, wins, updated_at
        from circuit_leaderboard
        where user_id = ${context.userId} and season = ${data.season}
      )
      select
        (1 + count(board.user_id))::int as position,
        (select count(*)::int from circuit_leaderboard where season = ${data.season}) as total
      from circuit_leaderboard board
      cross join mine
      where board.season = ${data.season} and (
        board.score > mine.score
        or (board.score = mine.score and board.wins > mine.wins)
        or (board.score = mine.score and board.wins = mine.wins and board.updated_at > mine.updated_at)
      )
    `;
    return placement ?? { position: 1, total: 1 };
  });

export const listDailyCircuitBoard = createServerFn({ method: "GET" })
  .validator((input: DailyCircuit) => validDaily(input))
  .handler(async ({ data }): Promise<CircuitEntry[]> => {
    const { getSql } = await import("./db");
    const sql = await getSql();
    return sql<CircuitEntry>`
      select stable_name as "stableName", score, wins, rank, updated_at::text as "updatedAt"
      from daily_circuit_board
      where day = ${data.day}::date and season = ${data.season}
      order by score desc, wins desc, updated_at desc
      limit 20
    `;
  });

export const postDailyCircuitScore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: DailyCircuitSubmission) => validDailySubmission(input))
  .handler(async ({ data, context }): Promise<CircuitPlacement> => {
    const { getSql } = await import("./db");
    const sql = await getSql();
    await sql`
      insert into daily_circuit_board (user_id, day, season, stable_name, score, wins, rank)
      values (${context.userId}, ${data.day}::date, ${data.season}, ${data.stableName}, ${data.score}, ${data.wins}, ${data.rank})
      on conflict (user_id, day, season) do update set
        stable_name = excluded.stable_name,
        score = excluded.score,
        wins = excluded.wins,
        rank = excluded.rank,
        updated_at = now()
    `;
    const [placement] = await sql<CircuitPlacement>`
      with mine as (
        select score, wins, updated_at
        from daily_circuit_board
        where user_id = ${context.userId} and day = ${data.day}::date and season = ${data.season}
      )
      select
        (1 + count(board.user_id))::int as position,
        (select count(*)::int from daily_circuit_board where day = ${data.day}::date and season = ${data.season}) as total
      from daily_circuit_board board
      cross join mine
      where board.day = ${data.day}::date and board.season = ${data.season} and (
        board.score > mine.score
        or (board.score = mine.score and board.wins > mine.wins)
        or (board.score = mine.score and board.wins = mine.wins and board.updated_at > mine.updated_at)
      )
    `;
    return placement ?? { position: 1, total: 1 };
  });
