import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEnemyTell, createFight, queuePlayerMove, stepFight } from "./combat";
import { MOVES } from "./content";
import { mulberry32 } from "./rng";
import { applyRivalGrit, rollSpider } from "./spiders";

function makeFight() {
  const player = rollSpider(mulberry32(11), { speciesId: "hentz", stage: "adult" });
  const enemy = rollSpider(mulberry32(22), { speciesId: "cross", stage: "adult", asRival: true });
  return createFight(player, enemy, 10, "tom", "Alley Tom");
}

test("a Jev-selected opening move survives the intro and is visible to the player", () => {
  const fight = makeFight();
  assert.equal(applyEnemyTell(fight, "lunge"), true);

  for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);

  assert.equal(fight.phase, "telegraph");
  assert.equal(fight.enemy.tell, "lunge");
  assert.equal(fight.tellReady, true);
  assert.equal(fight.lastText, MOVES.lunge.tell);
  assert.equal(fight.jevReads, 1);
});

test("a selected move locks the player input and resolves as that move", () => {
  const fight = makeFight();
  for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);

  queuePlayerMove(fight, "grapple");
  assert.equal(fight.playerLocked, true);
  assert.equal(fight.player.queued, "grapple");
  for (let i = 0; i < 30 && fight.phase !== "resolve"; i += 1) stepFight(fight, 0.05);

  assert.equal(fight.phase, "resolve");
  assert.equal(fight.lastPlayerMove, "grapple");
  assert.equal(fight.roundLog.length, 1);
  assert.equal(fight.roundLog[0]?.playerMove, "grapple");
  assert.equal(fight.roundLog[0]?.enemyMove, fight.lastEnemyMove);
});

test("a species web changes its signature move outcome", () => {
  const cross = rollSpider(mulberry32(33), { speciesId: "cross", stage: "adult" });
  const enemy = rollSpider(mulberry32(44), { speciesId: "hentz", stage: "adult", asRival: true });
  const fight = createFight(cross, enemy, 10, "tom", "Alley Tom");
  for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);

  fight.player.stam = 50;
  assert.equal(applyEnemyTell(fight, "lunge", false), true);
  queuePlayerMove(fight, "brace");
  for (let i = 0; i < 30 && fight.phase !== "resolve"; i += 1) stepFight(fight, 0.05);

  assert.equal(fight.player.web.name, "Cross brace");
  assert.equal(fight.player.stam, 59); // 50 - 8, regular brace +10, Cross brace +7
});

test("crew style is carried into the fallback stick AI", () => {
  const player = rollSpider(mulberry32(55), { speciesId: "hentz", stage: "adult" });
  const enemy = rollSpider(mulberry32(66), { speciesId: "cross", stage: "adult", asRival: true });
  const fight = createFight(player, enemy, 10, "tom", "Alley Tom", "brace");
  assert.equal(fight.rivalStyle, "brace");
});

test("crew grit changes the rolled opponent strength", () => {
  const spider = rollSpider(mulberry32(77), { speciesId: "hentz", stage: "adult", asRival: true });
  const tougher = applyRivalGrit(spider, 1.4);
  const softer = applyRivalGrit(spider, 0.7);
  assert.ok(tougher.base.power > spider.base.power);
  assert.ok(softer.base.power < spider.base.power);
  assert.ok(tougher.hp > softer.hp);
});
