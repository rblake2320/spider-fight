import assert from "node:assert/strict";
import test from "node:test";
import { firstWinTrophy, heldRivalTrophies, RIVAL_TROPHIES, WIDOW_KNOT } from "./rewards.ts";

test("the Black Widow awards one trophy, including when it is equipped", () => {
  assert.equal(firstWinTrophy("widow", {}, []), WIDOW_KNOT);
  assert.equal(firstWinTrophy("widow", { [WIDOW_KNOT]: 1 }, []), null);
  assert.equal(firstWinTrophy("widow", {}, [{ gear: { charm: WIDOW_KNOT } } as never]), null);
  assert.equal(firstWinTrophy("tom", {}, []), RIVAL_TROPHIES.tom);
  assert.equal(firstWinTrophy("tom", { [RIVAL_TROPHIES.tom!]: 1 }, []), null);
  assert.equal(firstWinTrophy("tom", {}, [{ gear: { charm: RIVAL_TROPHIES.tom } } as never]), null);
  assert.equal(firstWinTrophy("june", {}, []), null);
});

test("trophy case counts rewards in the crate and equipped on a spider once", () => {
  assert.deepEqual(
    heldRivalTrophies({ [RIVAL_TROPHIES.tom!]: 1 }, [{ gear: { charm: RIVAL_TROPHIES.tom, wraps: RIVAL_TROPHIES.kudzu } } as never]),
    [RIVAL_TROPHIES.tom!, RIVAL_TROPHIES.kudzu!],
  );
});
