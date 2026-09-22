import assert from "node:assert/strict";
import test from "node:test";
import { HABITATS, ITEMS, RIVALS, SPECIES } from "./content.ts";
import { SEASONS, SHIPPED_SEASON, isShipped, seasonOf, speciesOf } from "./catalog.ts";
import { migrateSave } from "./migrate.ts";

test("every habitat species exists", () => {
  for (const h of HABITATS) {
    for (const id of h.species) {
      assert.ok(SPECIES[id], `${h.id} points at missing species ${id}`);
    }
  }
});

test("every rival bias exists", () => {
  for (const r of RIVALS) {
    for (const id of r.bias) {
      assert.ok(SPECIES[id], `${r.id} bias missing ${id}`);
    }
  }
});

test("item and species ids match their keys", () => {
  for (const [id, sp] of Object.entries(SPECIES)) assert.equal(sp.id, id);
  for (const [id, item] of Object.entries(ITEMS)) assert.equal(item.id, id);
});

test("season 2 content is live and available to the circuit", () => {
  assert.equal(SHIPPED_SEASON, 2);
  assert.ok(SPECIES.brownwidow);
  assert.equal(seasonOf(SPECIES.brownwidow!), 2);
  assert.equal(isShipped(SPECIES.brownwidow!), true);
  assert.ok(HABITATS.some((h) => h.id === "creek" && isShipped(h)));
  assert.ok(SEASONS.some((s) => s.id === 2));
});

test("the Widow Knot is a boss-only reward", () => {
  assert.equal(ITEMS["widow-knot"]?.rewardOnly, true);
});

test("migrate keeps unknown species from crashing", () => {
  const next = migrateSave(
    {
      version: 1,
      spiders: [{ id: "x", name: "Ghost", speciesId: "nope", gear: { wraps: "not-an-item" } }],
      inventory: { cricket: 2, "culvert-silk": 9, bogus: 1 },
      seen: ["hentz", "ghost"],
      rivalRecords: { tom: { wins: 2, losses: 1, streak: 2 }, ghost: { wins: 99, losses: 0, streak: 99 } },
    },
    1,
  );
  assert.equal(next.version, 3);
  assert.equal(next.spiders[0]?.speciesId, "hentz");
  assert.equal(next.spiders[0]?.gear.wraps, undefined);
  assert.equal(next.inventory.cricket, 2);
  assert.equal(next.inventory["culvert-silk"], 9);
  assert.ok(next.career);
  assert.equal(next.dailyContract.progress, 0);
  assert.deepEqual(next.rivalRecords.tom, { wins: 2, losses: 1, streak: 2 });
  assert.equal(next.rivalRecords.ghost, undefined);
  speciesOf("nope");
});
