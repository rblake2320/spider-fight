import assert from "node:assert/strict";
import test from "node:test";
import { advanceWeeklyCircuit, canClaimWeeklyCircuit, makeWeeklyCircuit, weekStamp } from "./weekly-circuit.ts";

test("a weekly Circuit card stays stable from Monday through Sunday", () => {
  assert.equal(weekStamp("2026-9-21"), "2026-9-21");
  assert.equal(weekStamp("2026-9-27"), "2026-9-21");
  assert.deepEqual(makeWeeklyCircuit("2026-9-21", 2), makeWeeklyCircuit("2026-9-27", 2));
});

test("weekly Circuit progress requires every kind of yard work and caps each lane", () => {
  const card = makeWeeklyCircuit("2026-9-21", 0);
  const hunted = Array.from({ length: card.huntTarget + 2 }, (value, index) => index).reduce((current) => advanceWeeklyCircuit(current, "hunt"), card);
  const trained = Array.from({ length: card.trainTarget }, (value, index) => index).reduce((current) => advanceWeeklyCircuit(current, "train"), hunted);
  assert.equal(hunted.hunts, card.huntTarget);
  assert.equal(canClaimWeeklyCircuit(trained), false);
  const complete = Array.from({ length: card.winTarget }, (value, index) => index).reduce((current) => advanceWeeklyCircuit(current, "win"), trained);
  assert.equal(canClaimWeeklyCircuit(complete), true);
  assert.deepEqual(advanceWeeklyCircuit({ ...complete, claimed: true }, "win"), { ...complete, claimed: true });
});
