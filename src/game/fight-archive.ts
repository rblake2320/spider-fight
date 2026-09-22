import type { FightArchive, FightOutcome } from "./types.ts";

export function archiveFight(date: string, fighter: string, out: FightOutcome): FightArchive {
  return {
    date,
    fighter,
    enemyName: out.enemyName,
    rivalId: out.rivalId,
    won: out.won,
    practice: out.practice === true,
    wager: out.wager,
    purse: out.purse,
    points: out.points,
    rounds: out.rounds.slice(-12).map((round) => ({ ...round })),
  };
}

/** Keep enough complete tapes to show a developing career without bloating saves. */
export function pushFightArchive(history: FightArchive[], tape: FightArchive, cap = 12): FightArchive[] {
  return [tape, ...history].slice(0, cap);
}
