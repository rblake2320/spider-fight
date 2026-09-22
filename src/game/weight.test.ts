import assert from "node:assert/strict";
import test from "node:test";
import { SPECIES } from "./content.ts";
import { mulberry32 } from "./rng.ts";
import { classesMeet, CLASS_LABEL, pickRivalSpecies, sizeClassOfSpecies, sizeClassOfSpider } from "./weight.ts";

test("species land in the right mill class from size and authored weight", () => {
  assert.equal(sizeClassOfSpecies(SPECIES.jumper!), "thread");
  assert.equal(sizeClassOfSpecies(SPECIES.recluse!), "thread");
  assert.equal(sizeClassOfSpecies(SPECIES.hentz!), "stick");
  assert.equal(sizeClassOfSpecies(SPECIES.huntsman!), "floor");
  assert.equal(sizeClassOfSpecies(SPECIES.trapdoor!), "floor");
  assert.equal(sizeClassOfSpecies(SPECIES.tarantula!), "pit");
  assert.equal(sizeClassOfSpecies(SPECIES.birdeater!), "pit");
});

test("pit never meets thread; neighbors still share a card", () => {
  assert.equal(classesMeet("thread", "stick"), true);
  assert.equal(classesMeet("stick", "floor"), true);
  assert.equal(classesMeet("floor", "pit"), true);
  assert.equal(classesMeet("thread", "pit"), false);
  assert.equal(classesMeet("thread", "floor"), false);
  assert.equal(classesMeet("stick", "pit"), false);
  assert.equal(CLASS_LABEL.pit, "Pit");
});

test("a thread fighter pulls thread or stick rivals, never a bird-eater", () => {
  const rng = mulberry32(12);
  for (let i = 0; i < 24; i += 1) {
    const id = pickRivalSpecies(rng, ["tarantula", "birdeater", "hentz", "jumper"], "thread");
    const weight = sizeClassOfSpecies(SPECIES[id]!);
    assert.ok(weight === "thread" || weight === "stick", `${id} is ${weight}`);
  }
});

test("a pit fighter cannot be fed a jumper just because the crew's bias is porch stock", () => {
  const rng = mulberry32(44);
  for (let i = 0; i < 16; i += 1) {
    const id = pickRivalSpecies(rng, ["hentz", "jumper"], "pit");
    const weight = sizeClassOfSpecies(SPECIES[id]!);
    assert.ok(weight === "floor" || weight === "pit", `${id} is ${weight}`);
  }
});

test("size class follows species, not trained bulk", () => {
  assert.equal(sizeClassOfSpider({ speciesId: "jumper" }), "thread");
  assert.equal(sizeClassOfSpider({ speciesId: "tarantula" }), "pit");
});
