import type { FightOutcome, PaperClip } from "./types.ts";

export function writeClip(args: {
  date: string;
  fighter: string;
  rival: string;
  out: Pick<FightOutcome, "won" | "enemyName" | "stripped" | "sky">;
}): PaperClip {
  const skyBit = args.out.sky ? ` under ${args.out.sky}` : "";
  let headline: string;
  if (args.out.won) {
    headline = `${args.fighter} took ${args.out.enemyName}${skyBit}.`;
  } else if (args.out.stripped.length) {
    headline = `${args.fighter} dropped the wraps to ${args.out.enemyName}.`;
  } else {
    headline = `${args.out.enemyName} sent ${args.fighter} home rattling.`;
  }
  return {
    date: args.date,
    headline,
    won: args.out.won,
    fighter: args.fighter,
    rival: args.rival,
  };
}

export function pushPaper(paper: PaperClip[], clip: PaperClip, cap = 8): PaperClip[] {
  return [clip, ...paper.filter((old) => old.headline !== clip.headline || old.date !== clip.date)].slice(0, cap);
}
