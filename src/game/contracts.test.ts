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

test("daily web challenge only advances from a charged species-web surge", () => {
  const card = makeDailyWebChallenge("2026-9-21", 2);
  assert.equal(advanceWebChallenge(card, [{ playerSurge: undefined }]).progress, 0);
  const surged = advanceWebChallenge(card, [{ playerSurge: "orb web catches hard" }]);
  assert.equal(surged.progress, 1);
  assert.equal(canClaimWebChallenge(surged), true);
  assert.equal(surged.reward, 20);
  assert.equal(surged.points, 8);
});
