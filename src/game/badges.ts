import { trainingTotal } from "./spiders";
import type { CareerLog, Spider } from "./types";

export type BadgeId = "first-molt" | "drill-five" | "yard-five" | "field-guide" | "first-clutch" | "glass-shell" | "rafter-one" | "world-title";

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
  { id: "first-clutch", name: "Porch bloodline", detail: "Set a clutch in the yard.", reward: 18 },
  { id: "glass-shell", name: "Glass shell", detail: "Guide a spider through a perfect molt.", reward: 22 },
  { id: "rafter-one", name: "Hung in the rafters", detail: "Hang a veteran where the yard can see her.", reward: 20 },
  { id: "world-title", name: "World Stick", detail: "Carry the World Stick into a new year.", reward: 50 },
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
    if (badge.id === "first-clutch") return progress.career.clutches >= 1;
    if (badge.id === "glass-shell") return progress.career.perfectMolts >= 1;
    if (badge.id === "rafter-one") return progress.spiders.some((spider) => spider.retired);
    if (badge.id === "world-title") return progress.career.worldTitles >= 1;
    return progress.seen.length >= 4;
  });
}

export function badgeReward(badges: readonly Badge[]): number {
  return badges.reduce((total, badge) => total + badge.reward, 0);
}
