import assert from "node:assert/strict";
import test from "node:test";
import { mulberry32 } from "./rng.ts";
import { canMolt, molt, recoveryRests, rollMoltQuality, rollSpider } from "./spiders.ts";

test("molt quality is seeded, and a ready adult can shed", () => {
  assert.equal(rollMoltQuality({ ...mulberry32(1), next: () => 0.01 }, ["Molt glutton"]), "perfect");
  assert.equal(rollMoltQuality({ ...mulberry32(1), next: () => 0.5 }, []), "clean");
  assert.equal(rollMoltQuality({ ...mulberry32(1), next: () => 0.99 }, ["Skittish"]), "rough");

  const spider = rollSpider(mulberry32(21), { speciesId: "hentz", stage: "adult" });
  spider.moltReady = 80;
  spider.traits = ["Molt glutton", "Yard-bred"];
  assert.equal(canMolt(spider), null);
  const result = molt(spider, { ...mulberry32(3), next: () => 0.01 });
  assert.ok(result);
  assert.equal(result.quality, "perfect");
  assert.equal(result.spider.injury, null);
  assert.equal(result.spider.stage, "veteran");
  assert.ok(result.spider.base.power > spider.base.power);

  const rough = molt({ ...spider, moltReady: 80 }, { ...mulberry32(4), next: () => 0.99 });
  assert.equal(rough?.quality, "rough");
  assert.equal(rough?.spider.injury?.label, "Split coming out");
});

test("a hung spider and an unready nymph cannot molt", () => {
  const spider = rollSpider(mulberry32(5), { speciesId: "hentz", stage: "nymph" });
  spider.retired = true;
  spider.moltReady = 100;
  assert.match(canMolt(spider) ?? "", /rafters/i);
  spider.retired = false;
  spider.moltReady = 10;
  assert.match(canMolt(spider) ?? "", /ready/i);
});

test("injury recovery tells the yard exactly how many rests remain", () => {
  const spider = rollSpider(mulberry32(6), { speciesId: "hentz" });
  spider.injury = { label: "Split femur", fightsLeft: 3 };
  assert.equal(recoveryRests(spider), 3);
  spider.injury.fightsLeft = 0;
  assert.equal(recoveryRests(spider), 0);
});
