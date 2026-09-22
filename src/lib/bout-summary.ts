import type { BoutSnap } from "./jev-types";

/** A side that won an exchange cannot truthfully be described as never having the stick. */
export function maximumBoutDominance(snap: Pick<BoutSnap, "won" | "playerEdges" | "enemyEdges">): 1 | 2 {
  const losingEdges = snap.won ? snap.enemyEdges : snap.playerEdges;
  return losingEdges > 0 ? 1 : 2;
}
