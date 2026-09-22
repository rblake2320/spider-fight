import test from "node:test";
import assert from "node:assert/strict";
import { nextStreakReward, streakReward } from "./streak.ts";

test("ranked win streaks reward the three, five, and recurring eight-call heaters", () => {
  assert.deepEqual(streakReward(3), { wins: 3, cash: 10, points: 6, label: "Three-call heater" });
  assert.deepEqual(streakReward(5), { wins: 5, cash: 18, points: 10, label: "Five-call heater" });
  assert.deepEqual(streakReward(8), { wins: 8, cash: 32, points: 16, label: "Eight-call heater" });
  assert.deepEqual(streakReward(16), { wins: 8, cash: 32, points: 16, label: "Eight-call heater" });
  assert.equal(streakReward(4), null);
});

test("the next streak target stays visible after the initial ladder", () => {
  assert.deepEqual(nextStreakReward(2), { wins: 3, cash: 10, points: 6, label: "Three-call heater" });
  assert.equal(nextStreakReward(8).wins, 16);
});
