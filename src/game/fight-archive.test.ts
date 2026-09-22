import assert from "node:assert/strict";
import test from "node:test";
import { archiveFight, pushFightArchive } from "./fight-archive.ts";
import type { FightOutcome } from "./types.ts";

const result: FightOutcome = {
  won: true, wager: 10, purse: 36, points: 21, xp: 32, stripped: [], decay: {}, loot: null, injury: null,
  koMove: "lunge", playerHp: 40, enemyHp: 0, enemyName: "Alley Tom", rivalId: "tom",
  rounds: [{ round: 1, playerMove: "lunge", enemyMove: "feint", result: "edge", playerDamage: 0, enemyDamage: 12 }],
};

test("a fight archive keeps the full, bounded tape separate from the live result", () => {
  const tape = archiveFight("2026-9-21", "Cinder", result);
  result.rounds[0]!.enemyDamage = 99;
  assert.equal(tape.rounds[0]?.enemyDamage, 12);
  assert.equal(tape.fighter, "Cinder");
  assert.equal(tape.points, 21);
  assert.equal(pushFightArchive(Array.from({ length: 12 }, () => tape), tape).length, 12);
});
