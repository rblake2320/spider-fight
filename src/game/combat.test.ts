import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEnemyTell, arenaOpponentName, ASSIST_READ_WINDOW_SECONDS, bestCounterFor, countersFor, createFight, hasSweetTiming, MAX_ROUNDS, moveForKey, openingReadWindow, queuePlayerMove, readWindowPercent, readWindowSeconds, READ_WINDOW_SECONDS, stepFight, SWEET_TIMING_CENTER, SWEET_TIMING_TOLERANCE, webSurgeHint } from "./combat";
import { MOVES } from "./content";
import { mulberry32 } from "./rng";
import { applyRivalGrit, effective, rollSpider, teamSupport } from "./spiders";

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

  // The opening beat is the silhouette only; a move cannot be committed until
  // the rival's actual tell is visible.
  queuePlayerMove(fight, "grapple");
  assert.equal(fight.playerLocked, false);
  assert.equal(fight.player.queued, null);
  for (let i = 0; i < 6; i += 1) stepFight(fight, 0.05);
  assert.equal(fight.tellReady, true);

  queuePlayerMove(fight, "grapple");
  assert.equal(fight.playerLocked, true);
  assert.equal(fight.player.queued, "grapple");
  for (let i = 0; i < 40 && fight.phase !== "resolve"; i += 1) stepFight(fight, 0.05);

  assert.equal(fight.phase, "resolve");
  assert.equal(fight.lastPlayerMove, "grapple");
  assert.equal(fight.roundLog.length, 1);
  assert.equal(fight.roundLog[0]?.playerMove, "grapple");
  assert.equal(fight.roundLog[0]?.enemyMove, fight.lastEnemyMove);
});

test("the reaction timer starts only once the tell is readable and runs down", () => {
  const fight = makeFight();
  assert.equal(readWindowPercent(fight), 0);
  for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);
  assert.equal(readWindowPercent(fight), 0);
  for (let i = 0; i < 6; i += 1) stepFight(fight, 0.05);
  const opening = readWindowPercent(fight);
  assert.ok(opening > 70 && opening < 100);
  assert.ok(readWindowSeconds(fight) > 1.2 && readWindowSeconds(fight) < 1.7);
  for (let i = 0; i < 10; i += 1) stepFight(fight, 0.05);
  assert.ok(readWindowPercent(fight) < opening);
});

test("focus timing extends the visible read window without changing the standard fight default", () => {
  const player = rollSpider(mulberry32(130), { speciesId: "hentz", stage: "adult" });
  const enemy = rollSpider(mulberry32(131), { speciesId: "cross", stage: "adult", asRival: true });
  const standard = createFight(player, enemy, 10, "tom", "Alley Tom");
  const assisted = createFight(player, enemy, 10, "tom", "Alley Tom", null, {}, {}, null, false, ASSIST_READ_WINDOW_SECONDS);
  assert.ok(assisted.readWindow > standard.readWindow);
  assisted.phase = "telegraph";
  assisted.tellReady = true;
  assert.equal(readWindowSeconds(assisted), ASSIST_READ_WINDOW_SECONDS);
});

test("a first ranked call gets focus timing, while practice and later calls keep their selected pace", () => {
  assert.equal(openingReadWindow(0, 0, false, false), ASSIST_READ_WINDOW_SECONDS);
  assert.equal(openingReadWindow(1, 0, false, false), READ_WINDOW_SECONDS);
  assert.equal(openingReadWindow(0, 1, false, false), READ_WINDOW_SECONDS);
  assert.equal(openingReadWindow(0, 0, true, false), READ_WINDOW_SECONDS);
  assert.equal(openingReadWindow(4, 3, false, true), ASSIST_READ_WINDOW_SECONDS);
});

test("sweet timing is only awarded inside the player-visible moss band", () => {
  assert.equal(hasSweetTiming(SWEET_TIMING_CENTER), true);
  assert.equal(hasSweetTiming(SWEET_TIMING_CENTER - SWEET_TIMING_TOLERANCE + 0.001), true);
  assert.equal(hasSweetTiming(SWEET_TIMING_CENTER + SWEET_TIMING_TOLERANCE), false);
  assert.equal(hasSweetTiming(0.1), false);
});

test("the live arena labels the called crew when two spiders share a name", () => {
  const player = rollSpider(mulberry32(141), { speciesId: "hentz", stage: "adult" });
  const enemy = rollSpider(mulberry32(142), { speciesId: "hentz", stage: "adult", asRival: true });
  enemy.name = player.name;
  const fight = createFight(player, enemy, 0, "tom", "Alley Tom", "brace", {}, {}, null, true);
  assert.equal(arenaOpponentName(fight), "Alley Tom");
});

test("the live read guide only recommends moves that win the exchange", () => {
  assert.deepEqual(countersFor("lunge"), ["grapple", "drop"]);
  assert.deepEqual(countersFor("grapple"), ["feint"]);
  assert.ok(countersFor("brace").includes("lunge"));
  assert.deepEqual(countersFor("yank"), ["brace"]);
  assert.ok(!countersFor("brace").includes("yank"));
});

test("scout cards lead with the highest-impact legal counter", () => {
  assert.equal(bestCounterFor("lunge"), "grapple");
  assert.equal(bestCounterFor("brace"), "lunge");
  assert.equal(bestCounterFor("grapple"), "feint");
  assert.equal(bestCounterFor("yank"), "brace");
});

test("a species web changes its signature move outcome", () => {
  const cross = rollSpider(mulberry32(33), { speciesId: "cross", stage: "adult" });
  const enemy = rollSpider(mulberry32(44), { speciesId: "hentz", stage: "adult", asRival: true });
  const fight = createFight(cross, enemy, 10, "tom", "Alley Tom");
  for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);

  fight.player.stam = 50;
  assert.equal(applyEnemyTell(fight, "lunge", false), true);
  queuePlayerMove(fight, "brace");
  for (let i = 0; i < 40 && fight.phase !== "resolve"; i += 1) stepFight(fight, 0.05);

  assert.equal(fight.player.web.name, "Cross brace");
  assert.equal(fight.player.stam, 59); // 50 - 8, regular brace +10, Cross brace +7
});

test("two correct reads prime a visible species-web surge", () => {
  const cross = rollSpider(mulberry32(133), { speciesId: "cross", stage: "adult" });
  const enemy = rollSpider(mulberry32(144), { speciesId: "hentz", stage: "adult", asRival: true });
  const fight = createFight(cross, enemy, 10, "tom", "Alley Tom");
  fight.player.webCharge = 2;
  fight.player.hp = Math.round(fight.player.max * 0.55);
  for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);
  assert.equal(applyEnemyTell(fight, "brace", false), true);
  queuePlayerMove(fight, "brace");
  for (let i = 0; i < 40 && fight.phase !== "resolve"; i += 1) stepFight(fight, 0.05);

  assert.equal(fight.player.webCharge, 0);
  assert.ok(fight.player.hp > Math.round(fight.player.max * 0.55));
  assert.equal(fight.roundLog[0]?.playerSurge, "cross brace restores shell");
});

test("desktop move keys match the visible six-move grid", () => {
  assert.equal(moveForKey("1"), "lunge");
  assert.equal(moveForKey("4"), "brace");
  assert.equal(moveForKey("6"), "drop");
  assert.equal(moveForKey("0"), null);
  assert.equal(moveForKey("q"), null);
});

test("the Bowl and Doily spends its sheet web to recover stamina and tighten the rival line", () => {
  const bowl = rollSpider(mulberry32(153), { speciesId: "bowl", stage: "adult" });
  const enemy = rollSpider(mulberry32(154), { speciesId: "hentz", stage: "adult", asRival: true });
  const fight = createFight(bowl, enemy, 10, "tom", "Alley Tom");
  for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);

  fight.player.webCharge = 2;
  fight.player.stam = 50;
  fight.enemy.silk = 0.22;
  assert.equal(applyEnemyTell(fight, "drop", false), true);
  queuePlayerMove(fight, "yank");
  for (let i = 0; i < 40 && fight.phase !== "resolve"; i += 1) stepFight(fight, 0.05);

  assert.equal(fight.player.webCharge, 0);
  assert.equal(fight.player.stam, 54); // 50 - 14 for yank, then +18 from the sheet surge
  assert.equal(fight.enemy.silk, 0.4); // yank, its signature pull, then the sheet surge caps the rival line
  assert.equal(fight.roundLog[0]?.playerSurge, "sheet web tightens the line");
});

test("World Tour spiders add their own payoff after the base web surge", () => {
  const resolve = (speciesId: "bandedgarden" | "trashline" | "barkcrab", playerMove: "brace" | "feint" | "lunge", enemyMove: "yank" | "grapple" | "brace") => {
    const player = rollSpider(mulberry32(201), { speciesId, stage: "adult" });
    const enemy = rollSpider(mulberry32(202), { speciesId: "hentz", stage: "adult", asRival: true });
    const fight = createFight(player, enemy, 10, "tom", "Alley Tom");
    fight.player.webCharge = 2;
    fight.player.hp = Math.round(fight.player.max * 0.5);
    for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);
    assert.equal(applyEnemyTell(fight, enemyMove, false), true);
    queuePlayerMove(fight, playerMove);
    for (let i = 0; i < 40 && fight.phase !== "resolve"; i += 1) stepFight(fight, 0.05);
    return fight;
  };

  const banded = resolve("bandedgarden", "brace", "yank");
  assert.match(banded.roundLog[0]?.playerSurge ?? "", /shell hardens/);
  assert.ok(banded.player.hp > banded.player.max * 0.5);
  assert.equal(banded.enemy.stam, 68); // yank costs 14, freight lattice drains another 18.

  const trashline = resolve("trashline", "feint", "grapple");
  assert.match(trashline.roundLog[0]?.playerSurge ?? "", /steals tempo/);
  assert.equal(trashline.enemy.stam, 73); // Grapple costs 18, Scrap cross steals 9 more.

  const barkcrab = resolve("barkcrab", "lunge", "brace");
  assert.match(barkcrab.roundLog[0]?.playerSurge ?? "", /pins the line/);
  assert.equal(barkcrab.enemy.stam, 94); // Brace recovers to full, then Cedar snare pins 6.
  assert.match(webSurgeHint(barkcrab.player.web), /pin the line/);
});

test("Threshold Circuit spiders carry their named charged web payoffs", () => {
  const resolve = (speciesId: "gianthouse" | "labyrinth" | "bolas", playerMove: "brace" | "feint" | "lunge", enemyMove: "yank" | "grapple" | "brace") => {
    const player = rollSpider(mulberry32(231), { speciesId, stage: "adult" });
    const enemy = rollSpider(mulberry32(232), { speciesId: "hentz", stage: "adult", asRival: true });
    const fight = createFight(player, enemy, 10, "lastlight", "Last Light Line");
    fight.player.webCharge = 2;
    for (let i = 0; i < 24; i += 1) stepFight(fight, 0.05);
    assert.equal(applyEnemyTell(fight, enemyMove, false), true);
    queuePlayerMove(fight, playerMove);
    for (let i = 0; i < 40 && fight.phase !== "resolve"; i += 1) stepFight(fight, 0.05);
    return fight;
  };

  assert.match(resolve("gianthouse", "brace", "yank").roundLog[0]?.playerSurge ?? "", /shell hardens/);
  assert.match(resolve("labyrinth", "feint", "grapple").roundLog[0]?.playerSurge ?? "", /steals tempo/);
  assert.match(resolve("bolas", "lunge", "brace").roundLog[0]?.playerSurge ?? "", /pins the line/);
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

test("bench spiders add temporary team support without changing the spider save", () => {
  const lead = rollSpider(mulberry32(88), { speciesId: "hentz", stage: "adult" });
  const bench = rollSpider(mulberry32(89), { speciesId: "cross", stage: "adult" });
  const bonus = teamSupport(lead, [lead, bench], [lead.id, bench.id]);
  const fight = createFight(lead, bench, 10, "tom", "Alley Tom", null, bonus);
  assert.equal(bonus.grit, 1);
  assert.equal(bonus.silk, 1);
  assert.equal(fight.player.stats.grit, effective(lead).grit + 1);
  assert.equal(lead.base.grit + (lead.trained.grit ?? 0), lead.base.grit);
});

test("a twelve-round fight ends on a visible judges decision", () => {
  const fight = makeFight();
  fight.phase = "resolve";
  fight.phaseT = 1;
  fight.round = MAX_ROUNDS;
  fight.player.hp = Math.round(fight.player.max * 0.7);
  fight.enemy.hp = Math.round(fight.enemy.max * 0.2);
  stepFight(fight, 0.05);

  assert.equal(fight.phase, "ko");
  assert.equal(fight.decisionWinner, "player");
  assert.match(fight.lastText, /judges' decision/);
});

test("a practice loss preserves gear, record, and competitive rewards", () => {
  const player = rollSpider(mulberry32(177), { speciesId: "hentz", stage: "adult" });
  player.gear = { wraps: "porch-twine" };
  const enemy = rollSpider(mulberry32(178), { speciesId: "cross", stage: "adult", asRival: true });
  const fight = createFight(player, enemy, 0, "tom", "Alley Tom", null, {}, {}, null, true);
  fight.player.hp = 0;
  fight.phase = "ko";
  fight.phaseT = 1.21;
  stepFight(fight, 0.05);

  assert.equal(fight.outcome?.practice, true);
  assert.equal(fight.outcome?.enemyName, "Alley Tom");
  assert.equal(fight.outcome?.xp, 8);
  assert.deepEqual(fight.outcome?.stripped, []);
  assert.equal(fight.outcome?.injury, null);
  assert.equal(fight.player.spider.gear.wraps, "porch-twine");
  assert.equal(fight.player.spider.losses, 0);
});
