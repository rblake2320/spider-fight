import assert from "node:assert/strict";
import test from "node:test";
import { strongestTapePlay } from "./fight-playbook.ts";

test("the tape recommends an observed counter that earned the most real edges", () => {
  const play = strongestTapePlay([
    { round: 1, playerMove: "grapple", enemyMove: "lunge", result: "edge", playerDamage: 0, enemyDamage: 9 },
    { round: 2, playerMove: "grapple", enemyMove: "lunge", result: "edge", playerDamage: 0, enemyDamage: 8 },
    { round: 3, playerMove: "feint", enemyMove: "grapple", result: "edge", playerDamage: 0, enemyDamage: 10 },
    { round: 4, playerMove: "lunge", enemyMove: "brace", result: "hit", playerDamage: 7, enemyDamage: 0 },
  ]);
  assert.deepEqual(play, { enemyMove: "lunge", playerMove: "grapple", edges: 2, hits: 0 });
});

test("the tape stays quiet when no player answer earned an edge", () => {
  assert.equal(strongestTapePlay([
    { round: 1, playerMove: "lunge", enemyMove: "brace", result: "hit", playerDamage: 7, enemyDamage: 0 },
  ]), null);
});
