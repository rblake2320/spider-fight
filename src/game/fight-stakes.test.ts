import test from "node:test";
import assert from "node:assert/strict";
import { fightStakes } from "./fight-stakes.ts";

test("ranked stakes show the same purse and points a winning call awards", () => {
  assert.deepEqual(fightStakes(0, 10), {
    basePurse: 28,
    purse: 28,
    points: 13,
    lossPoints: 6,
    headlineCash: 0,
    headlinePoints: 0,
    skyCash: 0,
  });
});

test("headliner and sky bonuses are shown before the call", () => {
  const stakes = fightStakes(2, 24, true, 12);
  assert.equal(stakes.basePurse, 79);
  assert.equal(stakes.purse, 99);
  assert.equal(stakes.points, 23);
  assert.equal(stakes.headlineCash, 8);
  assert.equal(stakes.skyCash, 12);
});
