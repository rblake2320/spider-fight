import assert from "node:assert/strict";
import test from "node:test";
import { firstWinTrophy, WIDOW_KNOT } from "./rewards.ts";

test("the Black Widow awards one trophy, including when it is equipped", () => {
  assert.equal(firstWinTrophy("widow", {}, []), WIDOW_KNOT);
  assert.equal(firstWinTrophy("widow", { [WIDOW_KNOT]: 1 }, []), null);
  assert.equal(firstWinTrophy("widow", {}, [{ gear: { charm: WIDOW_KNOT } } as never]), null);
  assert.equal(firstWinTrophy("tom", {}, []), null);
});
