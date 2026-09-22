import { MOVES } from "./content";
import type { FightOutcome } from "./types";

export function fightShareText(stableName: string, result: FightOutcome): string {
  const header = `${stableName} ${result.won ? "held" : "dropped"} the stick vs ${result.enemyName}.`;
  const tape = result.rounds
    .slice(-3)
    .map((round) => `R${round.round}: ${MOVES[round.playerMove].name}/${MOVES[round.enemyMove].name}`)
    .join(" · ");
  const reward = result.won ? `Purse $${result.purse} · +${result.xp} xp` : `+${result.xp} xp`;
  return [header, reward, tape ? `Fight tape: ${tape}` : "", "#SpiderFight"].filter(Boolean).join("\n");
}
