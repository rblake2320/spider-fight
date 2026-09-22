import assert from "node:assert/strict";
import test from "node:test";
import { SPECIES_LIST, TRAIT_POOL } from "./content.ts";
import { TRAITS, traitAi, traitBlurb, traitHeat, traitHuntChance, traitStats, traitTrainCost } from "./traits.ts";

test("every species trait and pool trait has a live definition", () => {
  for (const species of SPECIES_LIST) {
    for (const trait of species.traits) {
      assert.ok(TRAITS[trait], `${species.id} is missing live trait "${trait}"`);
    }
  }
  for (const trait of TRAIT_POOL) {
    assert.ok(TRAITS[trait], `pool is missing live trait "${trait}"`);
  }
  assert.ok(TRAITS["Yard-bred"]);
  assert.ok(TRAITS["First stick"]);
});

test("known traits change stats, hunt luck, heat, and drill cost", () => {
  const stats = traitStats(["Porch-bred", "Crushing", "110% grit"]);
  assert.equal(stats.grit, 1);
  assert.equal(stats.power, 1);
  assert.equal(traitBlurb("Porch-bred"), "Home silk holds.");
  assert.equal(traitBlurb("110% grit"), "");
  assert.ok(traitHuntChance(["Night feeder", "Night eyes"]) > 0.07);
  assert.equal(traitHeat(["Hot-blooded"], 0.2) > 1, true);
  assert.equal(traitHeat(["Hot-blooded"], 0.8), 1);
  assert.ok(traitTrainCost(["Stubborn"], 10) > 10);
  assert.ok(traitTrainCost(["First stick"], 10) < 10);
  assert.equal(traitAi(["Patient", "Crushing"]).brace, 2);
  assert.equal(traitAi(["Patient", "Crushing"]).grapple, 2);
});
