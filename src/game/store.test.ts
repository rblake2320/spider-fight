import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_CAREER } from "./migrate.ts";

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
