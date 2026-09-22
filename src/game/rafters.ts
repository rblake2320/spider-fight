import type { Spider, Stats } from "./types.ts";

export function activeSpiders(spiders: Spider[]): Spider[] {
  return spiders.filter((spider) => !spider.retired);
}

export function rafterSpiders(spiders: Spider[]): Spider[] {
  return spiders.filter((spider) => spider.retired);
}

export function canRetire(spider: Spider, activeCount: number): string | null {
  if (spider.retired) return "Already in the rafters";
  if (activeCount <= 1) return "Keep one on the stick";
  const grown = spider.stage === "veteran" || spider.stage === "champion" || spider.stage === "legend";
  if (!grown && spider.wins < 5) return "Not enough nights on the stick";
  return null;
}

export function retire(spider: Spider): Spider {
  return {
    ...spider,
    retired: true,
    injury: null,
    morale: 100,
    energy: Math.max(spider.energy, 40),
  };
}

export function canRelease(spider: Spider, activeCount: number): string | null {
  if (!spider.retired && activeCount <= 1) return "Keep one on the stick";
  return null;
}

export function releaseCash(spider: Spider): number {
  const stagePay = spider.stage === "nymph" || spider.stage === "juvenile" ? 0 : 4;
  return 4 + spider.wins * 2 + stagePay;
}

/** Hung veterans watch the yard. Same bloodline lends a little power. */
export function rafterBonus(roster: Spider[], fighter: Spider): Partial<Stats> {
  const hung = rafterSpiders(roster);
  if (!hung.length) return {};
  const sameLine = fighter.line ? hung.filter((spider) => spider.line === fighter.line).length : 0;
  return {
    grit: Math.min(2, hung.length),
    power: sameLine > 0 ? 1 : 0,
  };
}
