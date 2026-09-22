import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_CAREER } from "./migrate.ts";
import { rollSpider } from "./spiders.ts";
import { mulberry32 } from "./rng.ts";
import { makeWeeklyCircuit } from "./weekly-circuit.ts";
import { encodeMillwright, stallMillOf } from "./hides.ts";
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
    assert.equal(after.rankPoints, 0);
    assert.deepEqual(after.earnedBadges, []);
    assert.deepEqual(outcome.discovery, {
      species: "Cross Orbweaver", web: "Cross brace", ability: "Brace restores extra stamina",
    });
  } finally {
    useGame.setState(before, true);
  }
});

test("a counter-free ranked win earns its visible Circuit read bonus", () => {
  const before = useGame.getState();
  try {
    const player = rollSpider(mulberry32(36), { speciesId: "hentz", stage: "adult" });
    const enemy = rollSpider(mulberry32(37), { speciesId: "hentz", stage: "adult", asRival: true });
    const outcome: FightOutcome = {
      won: true, wager: 10, purse: 0, xp: 0, stripped: [], decay: {}, loot: null,
      injury: null, koMove: null, playerHp: 10, enemyHp: 0, enemyName: enemy.name, rivalId: "tom", readGuideOff: true, rounds: [],
    };
    useGame.setState({
      spiders: [player], selectedId: player.id, seen: ["hentz"], rank: 0, rankPoints: 0, wins: 0, losses: 0, winStreak: 0,
      fight: { rivalId: "tom", playerId: player.id, wager: 10, practice: false, enemy, teamBonus: {}, headline: false, seriesStage: null },
      career: { ...EMPTY_CAREER }, earnedBadges: [],
    });
    useGame.getState().applyResult(outcome, player);
    assert.equal(outcome.readBonus, 3);
    assert.equal(useGame.getState().rankPoints, outcome.points);
    assert.ok((outcome.points ?? 0) >= 3);
  } finally {
    useGame.setState(before, true);
  }
});

test("a ranked web discovery shows the earned field-guide Circuit mark", () => {
  const before = useGame.getState();
  try {
    const player = rollSpider(mulberry32(41), { speciesId: "hentz", stage: "adult" });
    const enemy = rollSpider(mulberry32(42), { speciesId: "cross", stage: "adult", asRival: true });
    const outcome: FightOutcome = {
      won: false, wager: 0, purse: 0, xp: 0, stripped: [], decay: {}, loot: null,
      injury: null, koMove: null, playerHp: 0, enemyHp: 10, enemyName: enemy.name, rivalId: "tom", rounds: [],
    };
    useGame.setState({
      spiders: [player], selectedId: player.id, seen: ["hentz", "catface", "shamrock"], rank: 0, rankPoints: 0,
      fight: { rivalId: "tom", playerId: player.id, wager: 0, practice: false, enemy, teamBonus: {}, headline: false, seriesStage: null },
      career: { ...EMPTY_CAREER }, earnedBadges: [],
    });
    useGame.getState().applyResult(outcome, player);
    const after = useGame.getState();
    assert.equal(after.rankPoints, 12); // Score cannot go below zero, so the +12 mark is fully retained.
    assert.ok(after.earnedBadges.includes("field-guide"));
    assert.deepEqual(outcome.badges, [{ name: "Field guide", reward: 12 }]);
  } finally {
    useGame.setState(before, true);
  }
});

test("the drill that earns a Circuit mark returns its name and reward to the training screen", () => {
  const before = useGame.getState();
  try {
    const spider = rollSpider(mulberry32(51), { speciesId: "hentz", stage: "adult" });
    spider.trained.power = 4;
    useGame.setState({
      spiders: [spider], selectedId: spider.id, cash: 100, rank: 0, rankPoints: 0,
      career: { ...EMPTY_CAREER }, seen: ["hentz"], earnedBadges: [],
    });
    assert.equal(useGame.getState().train(spider.id, "power"), "Drilled Power · Five honest drills +12 circuit pts");
    const after = useGame.getState();
    assert.equal(after.rankPoints, 12);
    assert.ok(after.earnedBadges.includes("drill-five"));
  } finally {
    useGame.setState(before, true);
  }
});

test("a ranked win that crosses a threshold records the new Circuit division on the result", () => {
  const before = useGame.getState();
  try {
    const player = rollSpider(mulberry32(61), { speciesId: "hentz", stage: "adult" });
    const enemy = rollSpider(mulberry32(62), { speciesId: "cross", stage: "adult", asRival: true });
    const outcome: FightOutcome = {
      won: true, wager: 0, purse: 0, xp: 0, stripped: [], decay: {}, loot: null,
      injury: null, koMove: null, playerHp: 10, enemyHp: 0, enemyName: enemy.name, rivalId: "june", rounds: [],
    };
    useGame.setState({
      spiders: [player], selectedId: player.id, cash: 100, rank: 0, rankPoints: 35,
      career: { ...EMPTY_CAREER }, seen: ["hentz", "cross"], earnedBadges: [],
      fight: { rivalId: "june", playerId: player.id, wager: 0, practice: false, enemy, teamBonus: {}, headline: false, seriesStage: null },
    });
    useGame.getState().applyResult(outcome, player);
    assert.equal(useGame.getState().rank, 1);
    assert.deepEqual(outcome.rankUp, { name: "Backyard", blurb: "Kids on the fence, cash in a coffee can." });
  } finally {
    useGame.setState(before, true);
  }
});

test("fitting a bay job spends cash, bolts the graft, and stamps a Circuit mark", () => {
  const before = useGame.getState();
  try {
    const spider = rollSpider(mulberry32(71), { speciesId: "hentz", stage: "adult" });
    spider.energy = 80;
    useGame.setState({
      spiders: [spider], selectedId: spider.id, cash: 50, rank: 0, rankPoints: 0,
      career: { ...EMPTY_CAREER }, seen: ["hentz"], earnedBadges: [],
    });
    assert.equal(useGame.getState().fitBay(spider.id, "joint-tape"), null);
    const after = useGame.getState();
    assert.equal(after.cash, 28);
    assert.equal(after.spiders[0]?.grafts?.legs, "joint-tape");
    assert.equal(after.career.bayJobs, 1);
    assert.ok(after.earnedBadges.includes("bay-one"));
    assert.equal(after.rankPoints, 14);
    assert.equal(useGame.getState().fitBay(spider.id, "joint-tape"), "Already running that kit");
  } finally {
    useGame.setState(before, true);
  }
});

test("a District splice mixes donor blood and spends the graft purse", () => {
  const before = useGame.getState();
  try {
    const host = rollSpider(mulberry32(81), { speciesId: "hentz", stage: "adult" });
    const donor = rollSpider(mulberry32(82), { speciesId: "widow", stage: "veteran" });
    host.energy = 80;
    host.traits = ["Porch-bred"];
    donor.traits = ["Hourglass"];
    donor.retired = true;
    useGame.setState({
      spiders: [host, donor], selectedId: host.id, cash: 80, rank: 2, rankPoints: 110,
      career: { ...EMPTY_CAREER }, seen: ["hentz", "widow"], earnedBadges: [],
    });
    const message = useGame.getState().spliceDna(host.id, donor.id);
    assert.ok(message === null || message.includes("fever"));
    const after = useGame.getState();
    assert.equal(after.cash, 80 - (40 + 2 * 6));
    assert.equal(after.career.splices, 1);
    assert.ok(after.spiders[0]?.traits.includes("Yard-spliced"));
    assert.equal(after.spiders[0]?.spliceMark, "widow");
    assert.ok(after.earnedBadges.includes("splice-one"));
  } finally {
    useGame.setState(before, true);
  }
});

test("a hide ticket hangs on the rack and drapes onto a mill for cash", () => {
  const before = useGame.getState();
  try {
    const spider = rollSpider(mulberry32(91), { speciesId: "hentz", stage: "adult" });
    const src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    useGame.setState({
      spiders: [spider], selectedId: spider.id, cash: 48, rank: 0, rankPoints: 0,
      career: { ...EMPTY_CAREER }, seen: ["hentz"], earnedBadges: [], hides: [],
    });
    assert.equal(useGame.getState().addHide("Clay mill", src), null);
    const hung = useGame.getState();
    assert.equal(hung.hides.length, 1);
    assert.equal(hung.career.hides, 1);
    assert.ok(hung.earnedBadges.includes("hide-one"));
    const hideId = hung.hides[0]!.id;
    assert.equal(useGame.getState().drapeHide(spider.id, hideId), null);
    const draped = useGame.getState();
    assert.equal(draped.spiders[0]?.hideId, hideId);
    assert.equal(draped.cash, 24);
    assert.equal(useGame.getState().drapeHide(spider.id, hideId), "Already wearing that hide");
  } finally {
    useGame.setState(before, true);
  }
});

test("a millwright license pays the house cut and bolts the listed steel", () => {
  const before = useGame.getState();
  try {
    const spider = rollSpider(mulberry32(92), { speciesId: "hentz", stage: "adult" });
    const src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const ticket = encodeMillwright({
      name: "Pit mill",
      src,
      maker: "Other Yard",
      kits: { eye: "bonnet-eye" },
      price: 40,
    });
    useGame.setState({
      spiders: [spider], selectedId: spider.id, cash: 80, rank: 0, rankPoints: 0, stableName: "Porch Crew",
      career: { ...EMPTY_CAREER }, seen: ["hentz"], earnedBadges: [], hides: [],
    });
    assert.equal(useGame.getState().importHide(ticket), null);
    const after = useGame.getState();
    assert.equal(after.cash, 40);
    assert.equal(after.career.houseCut, 6);
    assert.equal(after.career.millPaid, 34);
    assert.equal(after.career.millwrights, 1);
    assert.ok(after.earnedBadges.includes("millwright-one"));
    assert.equal(after.spiders[0]?.grafts?.eye, "bonnet-eye");
    assert.equal(after.hides[0]?.maker, "Other Yard");
  } finally {
    useGame.setState(before, true);
  }
});

test("a house mill license hangs the stall hide, bolts steel, and pays the house cut", () => {
  const before = useGame.getState();
  try {
    const spider = rollSpider(mulberry32(93), { speciesId: "hentz", stage: "adult" });
    const mill = stallMillOf("tape-mill");
    assert.ok(mill);
    useGame.setState({
      spiders: [spider], selectedId: spider.id, cash: 48, rank: 0, rankPoints: 0, stableName: "Porch Crew",
      career: { ...EMPTY_CAREER }, seen: ["hentz"], earnedBadges: [], hides: [],
    });
    assert.equal(useGame.getState().licenseStall("optic-mill"), "Need State Circuit");
    assert.equal(useGame.getState().licenseStall("tape-mill"), null);
    const after = useGame.getState();
    assert.equal(after.cash, 12);
    assert.equal(after.career.houseCut, 5);
    assert.equal(after.career.millPaid, 31);
    assert.equal(after.career.millwrights, 1);
    assert.ok(after.earnedBadges.includes("millwright-one"));
    assert.equal(after.spiders[0]?.grafts?.legs, "joint-tape");
    assert.equal(after.spiders[0]?.hideId, after.hides[0]?.id);
    assert.equal(after.hides[0]?.maker, "The Circuit");
    assert.equal(useGame.getState().licenseStall("tape-mill"), "Already on the rack.");
  } finally {
    useGame.setState(before, true);
  }
});

test("a completed weekly Circuit card pays cash and points exactly once", () => {
  const before = useGame.getState();
  try {
    const weeklyCircuit = {
      ...makeWeeklyCircuit("2026-9-21", 0),
      huntTarget: 1, trainTarget: 1, winTarget: 1,
      hunts: 1, trains: 1, wins: 1,
      reward: 52, points: 16,
    };
    useGame.setState({ cash: 10, rank: 0, rankPoints: 35, weeklyCircuit });
    assert.equal(useGame.getState().claimWeeklyCircuit(), null);
    assert.equal(useGame.getState().cash, 62);
    assert.equal(useGame.getState().rankPoints, 51);
    assert.equal(useGame.getState().rank, 1);
    assert.equal(useGame.getState().weeklyCircuit.claimed, true);
    assert.equal(useGame.getState().claimWeeklyCircuit(), "Finish the Circuit card first");
    assert.equal(useGame.getState().cash, 62);
  } finally {
    useGame.setState(before, true);
  }
});
