import test from "node:test";
import assert from "node:assert/strict";
import { RIVALS } from "./content.ts";
import { rivalWebProfiles } from "./rival-scout.ts";

test("rival scouting exposes each crew's real possible spider webs", () => {
  const profiles = rivalWebProfiles(RIVALS.find((rival) => rival.id === "june")!);
  assert.deepEqual(profiles.map((profile) => [profile.species, profile.web, profile.move]), [
    ["Hentz Orbweaver", "Porch snare", "Lunge"],
    ["Cross Orbweaver", "Cross brace", "Brace"],
  ]);
});

test("rival scouting ignores duplicate or unknown lineup ids", () => {
  const profiles = rivalWebProfiles({ bias: ["hentz", "hentz", "missing"] });
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0]?.speciesId, "hentz");
});

test("Threshold Circuit's final crew shows its actual web answers", () => {
  const profiles = rivalWebProfiles(RIVALS.find((rival) => rival.id === "lastlight")!);
  assert.deepEqual(profiles.map((profile) => [profile.species, profile.web, profile.move]), [
    ["Bolas Spider", "Moth bolas", "Lunge"],
    ["Giant House Spider", "Funnel sheet", "Brace"],
    ["Starbellied Orbweaver", "Stadium spokes", "Lunge"],
  ]);
});
