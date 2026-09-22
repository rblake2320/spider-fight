import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { circuitPosition, nextCircuitChase, porchCircuitLadder, type CircuitEntry } from "./circuit-board.ts";

test("the circuit board offers the nearest other yard to chase", () => {
  const board: CircuitEntry[] = [
    { stableName: "Porch Crew", score: 20, wins: 2, rank: 0, updatedAt: "now" },
    { stableName: "Silk House", score: 23, wins: 1, rank: 0, updatedAt: "now" },
    { stableName: "Fence Line", score: 31, wins: 1, rank: 1, updatedAt: "now" },
  ];
  assert.deepEqual(nextCircuitChase(board, 20, 2, "Porch Crew"), {
    entry: board[1],
    pointsNeeded: 4,
  });
  assert.deepEqual(nextCircuitChase(board, 23, 0, "Porch Crew"), {
    entry: board[1],
    pointsNeeded: 1,
  });
  assert.equal(nextCircuitChase(board, 32, 0, "Porch Crew"), null);
  assert.equal(circuitPosition(board, 20, 2), 3);
  assert.equal(circuitPosition(board, 23, 2), 1);
});

test("the offline Porch Ladder is stable for a circuit day and offers distinct yards", () => {
  const first = porchCircuitLadder(2, "2026-09-22");
  assert.deepEqual(first, porchCircuitLadder(2, "2026-09-22"));
  assert.equal(first.length, 6);
  assert.equal(new Set(first.map((entry) => entry.stableName)).size, first.length);
  assert.ok(first.every((entry, index) => index === 0 || first[index - 1]!.score >= entry.score));
});

test("the circuit board keeps one score per yard for each year", async () => {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(await readFile(fileURLToPath(new URL("../../migrations/0001_circuit_leaderboard.sql", import.meta.url)), "utf8"));
  await db.exec(await readFile(fileURLToPath(new URL("../../migrations/0002_circuit_seasons.sql", import.meta.url)), "utf8"));
  await db.exec(await readFile(fileURLToPath(new URL("../../migrations/0003_daily_circuit_board.sql", import.meta.url)), "utf8"));
  const userId = "season-board-test-yard";
  try {
    await db.query("insert into circuit_leaderboard (user_id, season, stable_name, score, wins, rank) values ($1, 1, 'Season Test', 90, 4, 1)", [userId]);
    await db.query("insert into circuit_leaderboard (user_id, season, stable_name, score, wins, rank) values ($1, 1, 'Season Test', 120, 5, 2) on conflict (user_id, season) do update set score = excluded.score, wins = excluded.wins, rank = excluded.rank", [userId]);
    await db.query("insert into circuit_leaderboard (user_id, season, stable_name, score, wins, rank) values ($1, 2, 'Season Test', 10, 1, 0)", [userId]);
    const rows = await db.query<{ season: number; score: number; wins: number }>("select season, score, wins from circuit_leaderboard where user_id = $1 order by season", [userId]);
    assert.deepEqual(rows.rows, [{ season: 1, score: 120, wins: 5 }, { season: 2, score: 10, wins: 1 }]);
  } finally {
    await db.close();
  }
});

test("the daily circuit board keeps one live entry per yard, day, and year", async () => {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(await readFile(fileURLToPath(new URL("../../migrations/0003_daily_circuit_board.sql", import.meta.url)), "utf8"));
  try {
    await db.query("insert into daily_circuit_board (user_id, day, season, stable_name, score, wins, rank) values ($1, $2, 1, 'Day Yard', 30, 2, 0)", ["day-yard", "2026-09-21"]);
    await db.query("insert into daily_circuit_board (user_id, day, season, stable_name, score, wins, rank) values ($1, $2, 1, 'Day Yard', 46, 3, 1) on conflict (user_id, day, season) do update set score = excluded.score, wins = excluded.wins, rank = excluded.rank", ["day-yard", "2026-09-21"]);
    await db.query("insert into daily_circuit_board (user_id, day, season, stable_name, score, wins, rank) values ($1, $2, 2, 'Day Yard', 9, 1, 0)", ["day-yard", "2026-09-21"]);
    const rows = await db.query<{ day: string; season: number; score: number; wins: number }>("select day::text, season, score, wins from daily_circuit_board where user_id = $1 order by season", ["day-yard"]);
    assert.deepEqual(rows.rows, [{ day: "2026-09-21", season: 1, score: 46, wins: 3 }, { day: "2026-09-21", season: 2, score: 9, wins: 1 }]);
  } finally {
    await db.close();
  }
});
