import assert from "node:assert/strict";
import test from "node:test";
import { archiveShareText, fightShareText } from "./share.ts";

test("fight share text includes result, reward, and the recent tape", () => {
  const text = fightShareText("Night Yard", {
    won: true,
    wager: 10,
    purse: 28,
    points: 16,
    xp: 36,
    stripped: [],
    decay: {},
    loot: null,
    injury: null,
    koMove: null,
    playerHp: 20,
    enemyHp: 0,
    enemyName: "Black Widow",
    rivalId: "widow",
    rounds: [{ round: 3, playerMove: "grapple", enemyMove: "lunge", result: "edge", playerDamage: 0, enemyDamage: 12 }],
  });
  assert.match(text, /Night Yard held the stick vs Black Widow/);
  assert.match(text, /Purse \$28/);
  assert.match(text, /Circuit \+16 pts/);
  assert.match(text, /R3: Grapple\/Lunge/);
});

test("practice share text never claims a purse or xp", () => {
  const text = fightShareText("Porch Crew", {
    won: false,
    practice: true,
    wager: 0,
    purse: 0,
    xp: 8,
    stripped: [],
    decay: {},
    loot: null,
    injury: null,
    koMove: null,
    playerHp: 0,
    enemyHp: 12,
    enemyName: "Alley Tom",
    rivalId: "tom",
    rounds: [],
  });
  assert.match(text, /no-stakes practice thread/);
  assert.match(text, /Practice tape saved · no stakes/);
  assert.ok(!text.includes("xp"));
  assert.ok(!text.includes("Purse"));
});

test("an archived tape can be shared without inventing current rewards", () => {
  const text = archiveShareText("Porch Crew", {
    date: "2026-9-21", fighter: "Cinder", enemyName: "Alley Tom", rivalId: "tom", won: true, practice: false,
    wager: 10, purse: 36, points: 21, rounds: [{ round: 2, playerMove: "lunge", enemyMove: "feint", result: "edge", playerDamage: 0, enemyDamage: 12 }],
  });
  assert.match(text, /Purse \$36/);
  assert.match(text, /Circuit \+21 pts/);
  assert.match(text, /R2: Lunge\/Feint/);
});
