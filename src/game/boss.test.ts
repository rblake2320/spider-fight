import assert from "node:assert/strict";
import { test } from "node:test";
import { canCallWidow, WIDOW_UNLOCK_RANK, widowCallMode } from "./boss";

test("the Black Widow opens at District, after the first-night circuit", () => {
  assert.equal(canCallWidow(WIDOW_UNLOCK_RANK - 1), false);
  assert.equal(canCallWidow(WIDOW_UNLOCK_RANK), true);
});

test("every yard can shadow spar the Widow without opening the ranked boss call", () => {
  assert.equal(widowCallMode(WIDOW_UNLOCK_RANK - 1), "shadow");
  assert.equal(widowCallMode(WIDOW_UNLOCK_RANK), "challenge");
});
