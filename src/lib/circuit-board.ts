import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";

export type CircuitEntry = {
  stableName: string;
  score: number;
  wins: number;
  rank: number;
  updatedAt: string;
};

type CircuitSubmission = Pick<CircuitEntry, "stableName" | "score" | "wins" | "rank">;

function validSubmission(input: CircuitSubmission): CircuitSubmission {
  const stableName = input.stableName.trim().slice(0, 22);
  if (!stableName) throw new Error("Stable name is required");
  for (const value of [input.score, input.wins, input.rank]) {
    if (!Number.isInteger(value) || value < 0) throw new Error("Invalid circuit score");
  }
  if (input.score > 100000 || input.wins > 10000 || input.rank > 7) throw new Error("Circuit score exceeds board limits");
  return { stableName, score: input.score, wins: input.wins, rank: input.rank };
}

export const listCircuitBoard = createServerFn({ method: "GET" }).handler(async (): Promise<CircuitEntry[]> => {
  const { getSql } = await import("./db");
  const sql = await getSql();
  return sql<CircuitEntry>`
    select stable_name as "stableName", score, wins, rank, updated_at::text as "updatedAt"
    from circuit_leaderboard
    order by score desc, wins desc, updated_at desc
    limit 20
  `;
});

export const postCircuitScore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CircuitSubmission) => validSubmission(input))
  .handler(async ({ data, context }): Promise<void> => {
    const { getSql } = await import("./db");
    const sql = await getSql();
    await sql`
      insert into circuit_leaderboard (user_id, stable_name, score, wins, rank)
      values (${context.userId}, ${data.stableName}, ${data.score}, ${data.wins}, ${data.rank})
      on conflict (user_id) do update set
        stable_name = excluded.stable_name,
        score = excluded.score,
        wins = excluded.wins,
        rank = excluded.rank,
        updated_at = now()
    `;
  });
