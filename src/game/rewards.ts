import type { Spider } from "./types";

export const WIDOW_KNOT = "widow-knot";

export const RIVAL_TROPHIES: Readonly<Record<string, string>> = {
  widow: WIDOW_KNOT,
  tom: "tom-tab",
  kudzu: "kudzu-cord",
  clay: "clay-ribbon",
  circuit: "state-pass",
  gateseven: "silk-key",
  world: "world-seal",
};

export function firstWinTrophy(rivalId: string, inventory: Record<string, number>, spiders: Spider[]): string | null {
  const trophy = RIVAL_TROPHIES[rivalId];
  if (!trophy) return null;
  const alreadyHeld = (inventory[trophy] ?? 0) > 0 || spiders.some((spider) => Object.values(spider.gear).includes(trophy));
  return alreadyHeld ? null : trophy;
}

export function heldRivalTrophies(inventory: Record<string, number>, spiders: Spider[]): string[] {
  return [...new Set(Object.values(RIVAL_TROPHIES))].filter(
    (trophy) => (inventory[trophy] ?? 0) > 0 || spiders.some((spider) => Object.values(spider.gear).includes(trophy)),
  );
}
