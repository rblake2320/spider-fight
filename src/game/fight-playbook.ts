import type { FightRound, MoveId } from "./types";

export type TapePlay = {
  enemyMove: MoveId;
  playerMove: MoveId;
  edges: number;
  hits: number;
};

/**
 * Turns the recorded tape into one concrete next-read recommendation.
 * It only recommends an answer that actually earned an edge in this fight.
 */
export function strongestTapePlay(rounds: FightRound[]): TapePlay | null {
  const plays = new Map<string, TapePlay>();
  for (const round of rounds) {
    const key = `${round.enemyMove}:${round.playerMove}`;
    const current = plays.get(key) ?? { enemyMove: round.enemyMove, playerMove: round.playerMove, edges: 0, hits: 0 };
    if (round.result === "edge" && round.enemyDamage > 0) current.edges += 1;
    if (round.result === "hit" && round.playerDamage > 0) current.hits += 1;
    plays.set(key, current);
  }
  const successful = [...plays.values()].filter((play) => play.edges > 0);
  if (!successful.length) return null;
  return successful.sort((a, b) =>
    b.edges - a.edges || a.hits - b.hits || a.enemyMove.localeCompare(b.enemyMove) || a.playerMove.localeCompare(b.playerMove),
  )[0] ?? null;
}
