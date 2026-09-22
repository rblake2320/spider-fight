import assert from "node:assert/strict";
import test from "node:test";
import { maximumBoutDominance } from "./bout-summary.ts";

test("a losing side with tape edges cannot receive a domination verdict", () => {
  assert.equal(maximumBoutDominance({ won: false, playerEdges: 2, enemyEdges: 8 }), 1);
  assert.equal(maximumBoutDominance({ won: true, playerEdges: 8, enemyEdges: 1 }), 1);
  assert.equal(maximumBoutDominance({ won: false, playerEdges: 0, enemyEdges: 8 }), 2);
});
