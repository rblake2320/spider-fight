import assert from "node:assert/strict";
import test from "node:test";
import { dailyStreakBonus, nextDailyStreak } from "./daily-streak.ts";

test("a morning streak advances only across consecutive calendar days and caps its bonus", () => {
  assert.equal(nextDailyStreak(undefined, 0, "2026-9-21"), 1);
  assert.equal(nextDailyStreak("2026-9-21", 3, "2026-9-22"), 4);
  assert.equal(nextDailyStreak("2026-9-21", 3, "2026-9-24"), 1);
  assert.equal(nextDailyStreak("2026-9-21", 99, "2026-9-22"), 7);
  assert.equal(dailyStreakBonus(1), 2);
  assert.equal(dailyStreakBonus(99), 14);
});
