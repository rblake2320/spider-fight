import type { Spider } from "./types";

export const WIDOW_KNOT = "widow-knot";

export function firstWinTrophy(rivalId: string, inventory: Record<string, number>, spiders: Spider[]): string | null {
  if (rivalId !== "widow") return null;
  const alreadyHeld = (inventory[WIDOW_KNOT] ?? 0) > 0 || spiders.some((spider) => Object.values(spider.gear).includes(WIDOW_KNOT));
  return alreadyHeld ? null : WIDOW_KNOT;
}
