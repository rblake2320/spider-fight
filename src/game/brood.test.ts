import assert from "node:assert/strict";
import test from "node:test";
import { canSetSac, mergeInfestation, sacCost, scatterBrood, setSac, tickBrood } from "./brood.ts";
import { mulberry32 } from "./rng.ts";
import { rollSpider } from "./spiders.ts";

function hen(seed = 4) {
  const spider = rollSpider(mulberry32(seed), { speciesId: "tarantula", stage: "adult" });
  spider.sex = "female";
  spider.energy = 80;
  spider.morale = 80;
  spider.injury = null;
  return spider;
}

test("a hen can carry a sac, hatch on her back, then scatter into the yard", () => {
  const mother = hen();
  assert.equal(canSetSac(mother), null);
  assert.equal(canSetSac({ ...mother, sex: "male" }), "Need a hen on the line");
  assert.match(canSetSac({ ...mother, stage: "juvenile" }) ?? "", /grow/);
  assert.equal(sacCost(0), 16);
  const carrying = setSac(mother, null);
  assert.equal(carrying.brood?.fightsLeft, 2);
  assert.equal(carrying.brood?.speciesId, "tarantula");
  const mid = tickBrood(carrying, mulberry32(1));
  assert.equal(mid.hatched, 0);
  assert.equal(mid.spider.brood?.fightsLeft, 1);
  const done = tickBrood(mid.spider, mulberry32(2));
  assert.ok(done.hatched >= 4);
  assert.equal(done.spider.brood, null);
  assert.equal(done.spider.hatchlings, done.hatched);
  const scatter = scatterBrood(done.spider, mulberry32(3), "Pit Crew", 5, 6);
  assert.equal(scatter.kept.length, 1);
  assert.equal(scatter.kept[0]?.stage, "nymph");
  assert.equal(scatter.kept[0]?.origin, `Hatched on ${mother.name}`);
  assert.ok(scatter.escaped >= 3);
  assert.equal(scatter.mother.hatchlings, 0);
  const inf = mergeInfestation(null, scatter.speciesId, scatter.escaped);
  assert.equal(inf?.speciesId, "tarantula");
  assert.ok((inf?.count ?? 0) >= 3);
});
