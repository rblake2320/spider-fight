import assert from "node:assert/strict";
import test from "node:test";
import { NIGHTLY_BONUS_CASH, NIGHTLY_BONUS_POINTS, nightlyReward, nightlyRival } from "./night-card.ts";

test("night card is stable for a day and gives a real rival", () => {
  const first = nightlyRival("2026-9-21", 0);
  assert.equal(nightlyRival("2026-9-21", 0).id, first.id);
  assert.equal(first.always, undefined);
  assert.equal(NIGHTLY_BONUS_CASH, 8);
  assert.equal(NIGHTLY_BONUS_POINTS, 8);
  assert.deepEqual(nightlyReward(true), { cash: 8, points: 8 });
  assert.deepEqual(nightlyReward(false), { cash: 0, points: 0 });
});
