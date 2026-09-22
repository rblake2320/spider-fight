import assert from "node:assert/strict";
import test from "node:test";
import { badgeReward, FIELD_GUIDE_MILESTONES, newlyEarnedBadges } from "./badges.ts";
import { SPECIES_LIST } from "./content.ts";
import { starterSpider } from "./spiders.ts";

const spider = starterSpider();

test("badges unlock once and award their circuit points", () => {
  const badges = newlyEarnedBadges([], {
    spiders: [{ ...spider, trained: { ...spider.trained, power: 5 } }],
    career: { hunts: 0, bouts: 5, molts: 1, stripped: 0, clutches: 0, perfectMolts: 0, worldTitles: 0, bayJobs: 0, splices: 0, hatches: 0, hides: 0 },
    wins: 5,
    seen: ["hentz", "argiope", "bold", "widow"],
  });
  assert.deepEqual(badges.map((badge) => badge.id), ["first-molt", "drill-five", "yard-five", "field-guide"]);
  assert.equal(badgeReward(badges), 50);
  assert.deepEqual(newlyEarnedBadges(badges.map((badge) => badge.id), {
    spiders: [spider], career: { hunts: 0, bouts: 0, molts: 0, stripped: 0, clutches: 0, perfectMolts: 0, worldTitles: 0, bayJobs: 0, splices: 0, hatches: 0, hides: 0 }, wins: 0, seen: [],
  }), []);
});


test("a World Stick title unlocks once after carrying the circuit into a new year", () => {
  const badges = newlyEarnedBadges([], {
    spiders: [spider],
    career: { hunts: 0, bouts: 0, molts: 0, stripped: 0, clutches: 0, perfectMolts: 0, worldTitles: 1, bayJobs: 0, splices: 0, hatches: 0, hides: 0 },
    wins: 0,
    seen: [],
  });
  assert.deepEqual(badges.map((badge) => badge.id), ["world-title"]);
  assert.equal(badgeReward(badges), 50);
});

test("field-guide milestones keep rewarding discovery through the complete released catalog", () => {
  const base = { spiders: [spider], career: { hunts: 0, bouts: 0, molts: 0, stripped: 0, clutches: 0, perfectMolts: 0, worldTitles: 0, bayJobs: 0, splices: 0, hatches: 0, hides: 0 }, wins: 0 };
  assert.deepEqual(newlyEarnedBadges(["field-guide"], { ...base, seen: SPECIES_LIST.slice(0, 10).map((species) => species.id) }).map((badge) => badge.id), ["web-scholar"]);
  assert.deepEqual(
    newlyEarnedBadges(["field-guide", "web-scholar"], { ...base, seen: SPECIES_LIST.map((species) => species.id) }).map((badge) => badge.id),
    ["whole-yard"],
  );
  assert.equal(FIELD_GUIDE_MILESTONES.at(-1)?.target, SPECIES_LIST.length);
});

test("bay work and a yard splice each stamp their Circuit mark once", () => {
  const bay = newlyEarnedBadges([], {
    spiders: [spider],
    career: { hunts: 0, bouts: 0, molts: 0, stripped: 0, clutches: 0, perfectMolts: 0, worldTitles: 0, bayJobs: 1, splices: 1, hatches: 0, hides: 0 },
    wins: 0,
    seen: [],
  });
  assert.deepEqual(bay.map((badge) => badge.id), ["bay-one", "splice-one"]);
  assert.equal(badgeReward(bay), 32);
});

test("hanging a hide stamps Brought hide once", () => {
  const badges = newlyEarnedBadges([], {
    spiders: [spider],
    career: { hunts: 0, bouts: 0, molts: 0, stripped: 0, clutches: 0, perfectMolts: 0, worldTitles: 0, bayJobs: 0, splices: 0, hatches: 0, hides: 1 },
    wins: 0,
    seen: [],
  });
  assert.deepEqual(badges.map((badge) => badge.id), ["hide-one"]);
  assert.equal(badgeReward(badges), 12);
});
