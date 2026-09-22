import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_CAREER } from "./migrate.ts";
import { rollSpider } from "./spiders.ts";
import { mulberry32 } from "./rng.ts";
import type { FightOutcome } from "./types.ts";

const data = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  },
});

const { useGame } = await import("./store.ts");

test("rolling a World Stick year records the title and grants its circuit badge", () => {
  const before = useGame.getState();
  try {
    useGame.setState({
      rank: 7,
      rankPoints: 1180,
      season: 1,
      cash: 100,
      wins: 4,
      spiders: [],
      seen: ["hentz"],
      career: { ...EMPTY_CAREER },
      earnedBadges: [],
    });
    assert.equal(useGame.getState().rollYear(), null);
    const after = useGame.getState();
    assert.equal(after.season, 2);
    assert.equal(after.rank, 5);
    assert.equal(after.rankPoints, 50);
    assert.equal(after.cash, 184);
    assert.equal(after.career.worldTitles, 1);
    assert.ok(after.earnedBadges.includes("world-title"));
  } finally {
    useGame.setState(before, true);
  }
});

test("fighting an unknown species adds its web to the field guide, even in practice", () => {
  const before = useGame.getState();
  try {
    const player = rollSpider(mulberry32(31), { speciesId: "hentz", stage: "adult" });
    const enemy = rollSpider(mulberry32(32), { speciesId: "cross", stage: "adult", asRival: true });
    const outcome: FightOutcome = {
      won: false, practice: true, wager: 0, purse: 0, xp: 0, stripped: [], decay: {}, loot: null,
      injury: null, koMove: null, playerHp: 10, enemyHp: 10, enemyName: enemy.name, rivalId: "tom", rounds: [],
    };
    useGame.setState({
      spiders: [player], selectedId: player.id, seen: ["hentz"],
      fight: { rivalId: "tom", playerId: player.id, wager: 0, practice: true, enemy, teamBonus: {}, headline: false, seriesStage: null },
      career: { ...EMPTY_CAREER }, earnedBadges: [],
    });
    useGame.getState().applyResult(outcome, player);
    const after = useGame.getState();
    assert.ok(after.seen.includes("cross"));
    assert.deepEqual(outcome.discovery, {
      species: "Cross Orbweaver", web: "Cross brace", ability: "Brace restores extra stamina",
    });
  } finally {
    useGame.setState(before, true);
  }
});
