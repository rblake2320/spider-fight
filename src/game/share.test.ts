import assert from "node:assert/strict";
import test from "node:test";
import { fightShareText } from "./share.ts";

test("fight share text includes result, reward, and the recent tape", () => {
  const text = fightShareText("Night Yard", {
    won: true,
    wager: 10,
    purse: 28,
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
  assert.match(text, /R3: Grapple\/Lunge/);
});
