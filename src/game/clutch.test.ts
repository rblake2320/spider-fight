import assert from "node:assert/strict";
import test from "node:test";
import { canClutch, clutchCost, makeClutch } from "./clutch.ts";
import { mulberry32 } from "./rng.ts";
import { rollSpider } from "./spiders.ts";

function grown(seed: number, sex: "female" | "male") {
  const spider = rollSpider(mulberry32(seed), { speciesId: "hentz", stage: "adult" });
  spider.sex = sex;
  spider.energy = 80;
  spider.morale = 80;
  spider.injury = null;
  spider.retired = false;
  return spider;
}

test("a clutch needs two grown spiders and a hen", () => {
  const hen = grown(1, "female");
  const rooster = grown(2, "male");
  const nymph = { ...hen, id: "n", stage: "nymph" as const };
  assert.equal(canClutch(hen, rooster, 2, 6), null);
  assert.equal(canClutch(hen, hen, 2, 6), "Need two spiders");
  assert.match(canClutch(nymph, rooster, 2, 6) ?? "", /adult/i);
  assert.match(canClutch(grown(3, "male"), rooster, 2, 6) ?? "", /hen/i);
  assert.equal(clutchCost(0), 28);
  assert.equal(clutchCost(3), 40);
});

test("offspring carry both names and sit under a yard line", () => {
  const hen = grown(11, "female");
  hen.name = "Cinder";
  hen.line = "Porch Crew line";
  const rooster = grown(22, "male");
  rooster.name = "Rusty";
  const baby = makeClutch(hen, rooster, mulberry32(99), "Porch Crew");
  assert.equal(baby.stage, "nymph");
  assert.equal(baby.bredFrom, "Cinder × Rusty");
  assert.equal(baby.line, "Porch Crew line");
  assert.equal(baby.origin, "Set in the yard");
  assert.ok(baby.base.power < hen.base.power || baby.stage === "nymph");
  assert.ok(baby.traits.includes("Yard-bred"));
});
