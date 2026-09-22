import assert from "node:assert/strict";
import test from "node:test";
import { canRelease, canRetire, rafterBonus, releaseCash, retire } from "./rafters.ts";
import { mulberry32 } from "./rng.ts";
import { rollSpider } from "./spiders.ts";

test("a veteran can hang if the yard keeps one on the stick", () => {
  const vet = rollSpider(mulberry32(7), { speciesId: "hentz", stage: "veteran" });
  const pup = rollSpider(mulberry32(8), { speciesId: "hentz", stage: "juvenile" });
  assert.equal(canRetire(vet, 2), null);
  assert.match(canRetire(vet, 1) ?? "", /Keep one/);
  assert.match(canRetire(pup, 2) ?? "", /nights/);
  pup.wins = 5;
  assert.equal(canRetire(pup, 2), null);
  const hung = retire(vet);
  assert.equal(hung.retired, true);
  assert.equal(canRetire(hung, 2), "Already in the rafters");
});

test("rafters lend grit, and a shared line lends power", () => {
  const fighter = rollSpider(mulberry32(9), { speciesId: "hentz", stage: "adult" });
  fighter.line = "Porch Crew line";
  const hung = retire({ ...rollSpider(mulberry32(10), { speciesId: "cross", stage: "champion" }), line: "Porch Crew line" });
  const bonus = rafterBonus([fighter, hung], fighter);
  assert.equal(bonus.grit, 1);
  assert.equal(bonus.power, 1);
  assert.equal(canRelease(fighter, 1), "Keep one on the stick");
  assert.equal(canRelease(hung, 1), null);
  assert.ok(releaseCash(hung) >= 4);
});
