import { createServerFn } from "@tanstack/react-start";
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

type CircuitSeason = { season: number };
type CircuitSubmission = Pick<CircuitEntry, "stableName" | "score" | "wins" | "rank"> & CircuitSeason;

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
