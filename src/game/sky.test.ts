import assert from "node:assert/strict";
import test from "node:test";
import { mixHunt, skyFightEffects, tonightSky } from "./sky.ts";

test("the sky is seeded to the calendar day", () => {
  const a = tonightSky("2026-9-21");
  const b = tonightSky("2026-9-21");
  const c = tonightSky("2026-9-22");
  assert.equal(a.id, b.id);
  assert.equal(a.name, b.name);
  assert.ok(c.id);
});

test("stick conditions expose the actual positive and negative fight modifiers", () => {
  assert.deepEqual(skyFightEffects({ fight: { silk: 2, speed: -1 } }), ["+2 silk", "-1 speed"]);
  assert.deepEqual(skyFightEffects({ fight: {} }), []);
});

test("harvest and storm rewrite hunt weights without wiping the base", () => {
  const mixed = mixHunt({ common: 70, rare: 6 }, {
    id: "harvest",
    name: "Big moon",
    blurb: "",
    hunt: { legendary: 14, rare: 8 },
    chance: 0.06,
    fight: {},
    purse: 12,
    energy: -2,
    tint: "",
  });
  assert.equal(mixed.common, 70);
  assert.equal(mixed.rare, 14);
  assert.equal(mixed.legendary, 14);
});
