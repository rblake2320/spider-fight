import assert from "node:assert/strict";
import test from "node:test";
import { practiceSummary } from "./practice-summary.ts";

test("practice results name the winning side instead of a neutral completion", () => {
  assert.deepEqual(practiceSummary({ won: true, enemyName: "Black Widow" }), {
    kicker: "Practice thread · you held it",
    title: "Practice win",
    detail: "You held the practice thread against Black Widow. No stakes; the tape is yours.",
  });
  assert.deepEqual(practiceSummary({ won: false, enemyName: "Black Widow" }), {
    kicker: "Practice thread · Black Widow held it",
    title: "Practice loss",
    detail: "Black Widow held the practice thread. No stakes; use the tape to set up the next call.",
  });
});
