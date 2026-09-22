import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceContract,
  advanceWebChallenge,
  canClaimContract,
  canClaimWebChallenge,
  makeDailyContract,
  makeDailyWebChallenge,
} from "./contracts.ts";

test("daily contract is deterministic for one yard day", () => {
  assert.deepEqual(makeDailyContract("2026-9-21", 2), makeDailyContract("2026-9-21", 2));
});

test("only the matching activity advances and the reward becomes claimable at target", () => {
  const card = { ...makeDailyContract("2026-9-21", 0), kind: "train" as const, target: 2, progress: 0 };
  assert.equal(advanceContract(card, "hunt").progress, 0);
  const one = advanceContract(card, "train");
  assert.equal(canClaimContract(one), false);
  assert.equal(canClaimContract(advanceContract(one, "train")), true);
});

test("daily web challenge only advances from a landed signature move", () => {
  const card = makeDailyWebChallenge("2026-9-21", 2);
  assert.equal(advanceWebChallenge(card, false).progress, 0);
  const landed = advanceWebChallenge(card, true);
  assert.equal(landed.progress, 1);
  assert.equal(canClaimWebChallenge(landed), true);
  assert.equal(landed.reward, 20);
  assert.equal(landed.points, 8);
});
