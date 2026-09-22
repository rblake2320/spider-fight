import assert from "node:assert/strict";
import test from "node:test";
import { badgeReward, newlyEarnedBadges } from "./badges.ts";
import { starterSpider } from "./spiders.ts";

const spider = starterSpider();

test("badges unlock once and award their circuit points", () => {
  const badges = newlyEarnedBadges([], {
    spiders: [{ ...spider, trained: { ...spider.trained, power: 5 } }],
    career: { hunts: 0, bouts: 5, molts: 1, stripped: 0, clutches: 0, perfectMolts: 0 },
    wins: 5,
    seen: ["hentz", "argiope", "bold", "widow"],
  });
  assert.deepEqual(badges.map((badge) => badge.id), ["first-molt", "drill-five", "yard-five", "field-guide"]);
  assert.equal(badgeReward(badges), 50);
  assert.deepEqual(newlyEarnedBadges(badges.map((badge) => badge.id), {
    spiders: [spider], career: { hunts: 0, bouts: 0, molts: 0, stripped: 0, clutches: 0, perfectMolts: 0 }, wins: 0, seen: [],
  }), []);
});
