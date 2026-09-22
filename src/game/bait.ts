import type { Rarity } from "./types";

export type BaitResult = { chanceBonus: number; weights: Partial<Record<Rarity, number>> };

export function applyBait(itemId: string | null, weights: Partial<Record<Rarity, number>>): BaitResult {
  const next = { ...weights };
  if (itemId === "sugar-water") {
    next.uncommon = (next.uncommon ?? 0) + 18;
    return { chanceBonus: 0.08, weights: next };
  }
  if (itemId === "porch-bulb") {
    next.uncommon = (next.uncommon ?? 0) + 10;
    next.rare = (next.rare ?? 0) + 8;
    return { chanceBonus: 0.14, weights: next };
  }
  if (itemId === "pheromone") {
    next.legendary = (next.legendary ?? 0) + 16;
    return { chanceBonus: 0.22, weights: next };
  }
  return { chanceBonus: 0, weights: next };
}
