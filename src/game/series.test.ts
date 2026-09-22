import assert from "node:assert/strict";
import { test } from "node:test";
import { RIVALS } from "./content";
import { yardSeriesLineup } from "./series";

test("yard series is a stable three-crew daily card with no boss crew", () => {
  const first = yardSeriesLineup("2026-09-22", 0);
  const replay = yardSeriesLineup("2026-09-22", 0);
  assert.equal(first.length, 3);
  assert.deepEqual(first.map((rival) => rival.id), replay.map((rival) => rival.id));
  assert.ok(first.every((rival) => !rival.always && RIVALS.includes(rival)));
});
