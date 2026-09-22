import assert from "node:assert/strict";
import test from "node:test";
import { applyJob, BAY_BY_ID, bayBonusLine, bayLook, bayStats, canFit, canSplice, crackGraft, splice, spliceCost } from "./bay.ts";
import { sanitizeSpider } from "./migrate.ts";
import { mulberry32 } from "./rng.ts";
import { colorsOf, effective, rollSpider } from "./spiders.ts";
import { SPECIES } from "./content.ts";

function adult(seed = 11) {
  const spider = rollSpider(mulberry32(seed), { speciesId: "hentz", stage: "adult" });
  spider.energy = 80;
  spider.injury = null;
  return spider;
}

test("bay jobs bolt to a slot, stack stats, and show on the silhouette", () => {
  const spider = adult();
  const job = BAY_BY_ID["bulk-femurs"]!;
  assert.equal(canFit(job, spider, 100, 1), null);
  const fitted = applyJob(spider, job);
  assert.equal(fitted.grafts?.legs, "bulk-femurs");
  assert.equal(fitted.energy, spider.energy - job.energy);
  assert.equal(bayStats(fitted).power, 2);
  assert.ok((bayLook(fitted).legs ?? 1) > 1);
  assert.ok(effective(fitted).power > effective(spider).power);
});

test("bay cards state every upside and tradeoff before the player bolts a kit on", () => {
  assert.equal(bayBonusLine(BAY_BY_ID["bulk-femurs"]!.bonus), "+2 power · -1 speed · +1 size");
  assert.equal(bayBonusLine(BAY_BY_ID["spinner-press"]!.bonus), "+1 speed · +3 silk");
});

test("the bay gates rank, cash, energy, nymph guts, and duplicate kits", () => {
  const spider = adult();
  spider.grafts = { legs: "joint-tape" };
  assert.equal(canFit(BAY_BY_ID["joint-tape"]!, spider, 100, 0), "Already running that kit");
  assert.equal(canFit(BAY_BY_ID["world-mill"]!, spider, 1000, 0), "Need World Stick");
  assert.equal(canFit(BAY_BY_ID["joint-tape"]!, { ...spider, grafts: {} }, 4, 0), "Not enough cash");
  const nymph = rollSpider(mulberry32(3), { speciesId: "hentz", stage: "nymph" });
  nymph.energy = 80;
  assert.equal(canFit(BAY_BY_ID["brick-gut"]!, nymph, 200, 3), "Let her grow first");
});

test("a splice copies donor blood, marks the mill, and can fever", () => {
  const host = adult(21);
  const donor = rollSpider(mulberry32(22), { speciesId: "widow", stage: "veteran" });
  donor.traits = ["Hourglass", "Venom queen"];
  donor.retired = true;
  host.traits = ["Porch-bred"];
  assert.equal(canSplice(host, donor, 200, 2), null);
  assert.match(canSplice(host, donor, 200, 1) ?? "", /District/);
  const clean = splice(host, donor, { ...mulberry32(1), next: () => 0.9, chance: () => false });
  assert.equal(clean.fever, false);
  assert.ok(clean.host.traits.includes("Yard-spliced"));
  assert.ok(clean.host.traits.includes("Hourglass") || clean.host.traits.includes("Venom queen"));
  assert.equal(clean.host.spliceMark, "widow");
  assert.equal(clean.host.splicedFrom, donor.name);
  assert.equal(colorsOf(clean.host).speckle, SPECIES.widow!.colors.speckle);
  const sick = splice(host, donor, { ...mulberry32(1), next: () => 0.01, chance: () => true });
  assert.equal(sick.fever, true);
  assert.equal(sick.host.injury?.label, "Graft fever");
  assert.equal(spliceCost(2), 52);
});

test("a hard loss can crack one graft off the chassis", () => {
  const spider = adult(9);
  spider.grafts = { legs: "bulk-femurs", fangs: "whet-fangs" };
  const cracked = crackGraft(spider, mulberry32(1));
  assert.ok(cracked.cracked === "Bulk femurs" || cracked.cracked === "Whet fangs");
  assert.equal(Object.keys(cracked.spider.grafts ?? {}).length, 1);
});

test("saves drop unknown grafts and keep a real slot job", () => {
  const clean = sanitizeSpider({
    id: "cinder",
    name: "Cinder",
    speciesId: "hentz",
    grafts: { legs: "not-real", fangs: "whet-fangs", junk: "x" },
    spliceMark: "nope",
  });
  assert.deepEqual(clean?.grafts, { fangs: "whet-fangs" });
  assert.equal(clean?.spliceMark, undefined);
});
