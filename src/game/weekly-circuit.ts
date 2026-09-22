import { mulberry32, seedFrom } from "./rng";
import type { CircuitActivity, WeeklyCircuit } from "./types";

type WeeklyTemplate = Pick<WeeklyCircuit, "title" | "detail" | "huntTarget" | "trainTarget" | "winTarget">;

const CARDS: readonly WeeklyTemplate[] = [
  { title: "Scout the yard", detail: "Bring new ground, honest drills, and one called win into the week.", huntTarget: 3, trainTarget: 2, winTarget: 1 },
  { title: "Hold the line", detail: "Build the fighter before asking them to carry two real calls.", huntTarget: 1, trainTarget: 3, winTarget: 2 },
  { title: "Thread the circuit", detail: "Keep every part of the yard moving before the porch lights change.", huntTarget: 2, trainTarget: 2, winTarget: 2 },
];

/** Monday's local-yard stamp. A whole week shares one card without needing a server clock. */
export function weekStamp(date: string): string {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date);
  if (!match) return "1970-1-5";
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (!Number.isFinite(value.getTime())) return "1970-1-5";
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
  return `${value.getUTCFullYear()}-${value.getUTCMonth() + 1}-${value.getUTCDate()}`;
}

export function makeWeeklyCircuit(date: string, rank: number): WeeklyCircuit {
  const week = weekStamp(date);
  const card = mulberry32(seedFrom(`weekly-circuit:${week}:${rank}`)).pick(CARDS) ?? CARDS[0]!;
  return { week, ...card, hunts: 0, trains: 0, wins: 0, reward: 44 + rank * 8, points: 16 + rank * 2, claimed: false };
}

export function advanceWeeklyCircuit(card: WeeklyCircuit, activity: CircuitActivity): WeeklyCircuit {
  if (card.claimed) return card;
  if (activity === "hunt") return { ...card, hunts: Math.min(card.huntTarget, card.hunts + 1) };
  if (activity === "train") return { ...card, trains: Math.min(card.trainTarget, card.trains + 1) };
  return { ...card, wins: Math.min(card.winTarget, card.wins + 1) };
}

export function canClaimWeeklyCircuit(card: WeeklyCircuit): boolean {
  return !card.claimed && card.hunts >= card.huntTarget && card.trains >= card.trainTarget && card.wins >= card.winTarget;
}
