import { trainingTotal } from "./spiders";
import type { CareerLog, Spider } from "./types";

export type BadgeId = "first-molt" | "drill-five" | "yard-five" | "field-guide";

export type Badge = {
  id: BadgeId;
  name: string;
  detail: string;
  reward: number;
};

export const BADGES: readonly Badge[] = [
  { id: "first-molt", name: "Fresh shell", detail: "Guide a spider through its first molt.", reward: 10 },
  { id: "drill-five", name: "Five honest drills", detail: "Put five training marks across your stable.", reward: 12 },
  { id: "yard-five", name: "Yard regular", detail: "Win five bouts on the stick.", reward: 16 },
  { id: "field-guide", name: "Field guide", detail: "Spot four species around the circuit.", reward: 12 },
];

type BadgeProgress = {
  spiders: Spider[];
  career: CareerLog;
  wins: number;
  seen: string[];
};

export function newlyEarnedBadges(earned: string[], progress: BadgeProgress): Badge[] {
  const done = new Set(earned);
  const training = progress.spiders.reduce((total, spider) => total + trainingTotal(spider), 0);
  return BADGES.filter((badge) => {
    if (done.has(badge.id)) return false;
    if (badge.id === "first-molt") return progress.career.molts >= 1;
    if (badge.id === "drill-five") return training >= 5;
    if (badge.id === "yard-five") return progress.wins >= 5;
    return progress.seen.length >= 4;
  });
}

export function badgeReward(badges: readonly Badge[]): number {
  return badges.reduce((total, badge) => total + badge.reward, 0);
}
