import type { FightRound, MoveId, RivalRecord } from "./types";

export function recordRivalMoves(previous: RivalRecord["moves"], rounds: readonly FightRound[]): NonNullable<RivalRecord["moves"]> {
  const moves = { ...(previous ?? {}) } as NonNullable<RivalRecord["moves"]>;
  for (const round of rounds) moves[round.enemyMove] = (moves[round.enemyMove] ?? 0) + 1;
  return moves;
}

export function rivalIntel(moves: RivalRecord["moves"]): Array<{ move: MoveId; count: number }> {
  return (Object.entries(moves ?? {}) as Array<[MoveId, number]>)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([move, count]) => ({ move, count }));
}
