import assert from "node:assert/strict";
import { test } from "node:test";
import { recordRivalMoves, rivalIntel } from "./rival-intel";

test("rival intel carries a crew's prior tape into its next call", () => {
  const moves = recordRivalMoves({ brace: 2 }, [
    { round: 1, playerMove: "lunge", enemyMove: "feint", result: "edge", playerDamage: 0, enemyDamage: 10 },
    { round: 2, playerMove: "grapple", enemyMove: "brace", result: "lock", playerDamage: 3, enemyDamage: 3 },
  ]);
  assert.deepEqual(moves, { brace: 3, feint: 1 });
  assert.deepEqual(rivalIntel(moves), [{ move: "brace", count: 3 }, { move: "feint", count: 1 }]);
});
