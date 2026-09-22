/** The Widow is a career target, not a first-night cash trap. */
export const WIDOW_UNLOCK_RANK = 2;

export function canCallWidow(rank: number): boolean {
  return rank >= WIDOW_UNLOCK_RANK;
}

/** The boss stays rank-gated, but every yard can safely read her tells. */
export function widowCallMode(rank: number): "shadow" | "challenge" {
  return canCallWidow(rank) ? "challenge" : "shadow";
}
