import assert from "node:assert/strict";
import test from "node:test";
import { applyBait } from "./bait.ts";

test("bait changes catch chance and actual rarity weights", () => {
  const normal = { common: 70, uncommon: 25, rare: 5 };
  const sugar = applyBait("sugar-water", normal);
  const bulb = applyBait("porch-bulb", normal);
  const pheromone = applyBait("pheromone", normal);
  assert.equal(sugar.chanceBonus, 0.08);
  assert.equal(sugar.weights.uncommon, 43);
  assert.equal(bulb.weights.rare, 13);
  assert.equal(pheromone.weights.legendary, 16);
  assert.deepEqual(normal, { common: 70, uncommon: 25, rare: 5 });
});
