import { MOVES } from "./content.ts";
import type { MoveId } from "./types.ts";

export type CallRoundOpts = {
  player: string;
  enemy: string;
  result: "edge" | "hit" | "lock";
  move: MoveId;
  timing: boolean;
  signature: boolean;
  venom: boolean;
  round: number;
};

function pick(lines: string[], salt: number): string {
  return lines[Math.abs(salt) % lines.length]!;
}

export function callRound(opts: CallRoundOpts): string {
  const move = MOVES[opts.move].name.toLowerCase();
  if (opts.venom) return pick(["The hourglass works.", "Venom on the line.", "She's carrying the bite."], opts.round);
  if (opts.result === "lock") {
    return pick(["They lock.", "Silk on silk. Nobody gives.", "Hung even. Wait on the next tell."], opts.round);
  }
  if (opts.result === "edge") {
    if (opts.timing && opts.signature) return `${opts.player} times the ${move}. That's her web.`;
    if (opts.timing) return pick([`${opts.player} catches the window.`, `Sweet timing. ${opts.player} hangs it.`], opts.round);
    if (opts.signature) return `${opts.player} throws the ${move} — her own silk.`;
    return pick(
      [`${opts.player} — ${MOVES[opts.move].name}.`, `${opts.player} puts her on the far silk.`, `The ${move} lands.`],
      opts.round,
    );
  }
  if (opts.timing) return `${opts.enemy} still takes it.`;
  return pick(
    [`${opts.enemy} — ${MOVES[opts.move].name}.`, `${opts.enemy} walks the wraps.`, `She eats the ${move}.`],
    opts.round,
  );
}

export function callKo(won: boolean, player: string, enemy: string): string {
  return won ? `${player} holds the stick.` : `${enemy} takes it.`;
}
