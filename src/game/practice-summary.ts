import type { FightOutcome } from "./types";

export function practiceSummary(result: Pick<FightOutcome, "won" | "enemyName">) {
  if (result.won) {
    return {
      kicker: "Practice thread · you held it",
      title: "Practice win",
      detail: `You held the practice thread against ${result.enemyName}. No stakes; the tape is yours.`,
    };
  }

  return {
    kicker: `Practice thread · ${result.enemyName} held it`,
    title: "Practice loss",
    detail: `${result.enemyName} held the practice thread. No stakes; use the tape to set up the next call.`,
  };
}
