import { trainingTotal } from "./spiders";
import { SPECIES_LIST } from "./content";
import type { CareerLog, Spider } from "./types";

export type BadgeId = "first-molt" | "drill-five" | "yard-five" | "field-guide" | "web-scholar" | "whole-yard" | "first-clutch" | "glass-shell" | "rafter-one" | "bay-one" | "splice-one" | "first-brood" | "world-title" | "hide-one" | "millwright-one";

export type Badge = {
  id: BadgeId;
  name: string;
  detail: string;
  reward: number;
};

export const FIELD_GUIDE_MILESTONES: readonly { id: BadgeId; name: string; detail: string; reward: number; target: number }[] = [
  { id: "field-guide", name: "Field guide", detail: "Spot four species around the circuit.", reward: 12, target: 4 },
  { id: "web-scholar", name: "Web scholar", detail: "Log ten different species and their web answers.", reward: 24, target: 10 },
  { id: "whole-yard", name: "Whole yard", detail: "Complete the field guide for every released species.", reward: 60, target: SPECIES_LIST.length },
];

export const BADGES: readonly Badge[] = [
  { id: "first-molt", name: "Fresh shell", detail: "Guide a spider through its first molt.", reward: 10 },
  { id: "drill-five", name: "Five honest drills", detail: "Put five training marks across your stable.", reward: 12 },
  { id: "yard-five", name: "Yard regular", detail: "Win five bouts on the stick.", reward: 16 },
  ...FIELD_GUIDE_MILESTONES,
  { id: "first-clutch", name: "Porch bloodline", detail: "Set a clutch in the yard.", reward: 18 },
  { id: "glass-shell", name: "Glass shell", detail: "Guide a spider through a perfect molt.", reward: 22 },
  { id: "rafter-one", name: "Hung in the rafters", detail: "Hang a veteran where the yard can see her.", reward: 20 },
  { id: "bay-one", name: "Bay kit", detail: "Bolt the first chassis job onto a fighter.", reward: 14 },
  { id: "splice-one", name: "Yard splice", detail: "Mix blood on the mill.", reward: 18 },
  { id: "first-brood", name: "Sac on the mill", detail: "Hatch a sac on a hen's back.", reward: 16 },
  { id: "hide-one", name: "Brought hide", detail: "Hang a custom hide on the rack.", reward: 12 },
  { id: "millwright-one", name: "Millwright license", detail: "Hang another yard's mill and pay the house cut.", reward: 14 },
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
    if (badge.id === "bay-one") return progress.career.bayJobs >= 1;
    if (badge.id === "splice-one") return progress.career.splices >= 1;
    if (badge.id === "first-brood") return (progress.career.hatches ?? 0) >= 1;
    if (badge.id === "hide-one") return (progress.career.hides ?? 0) >= 1;
    if (badge.id === "millwright-one") return (progress.career.millwrights ?? 0) >= 1;
    if (badge.id === "world-title") return progress.career.worldTitles >= 1;
    const fieldGuide = FIELD_GUIDE_MILESTONES.find((milestone) => milestone.id === badge.id);
    return fieldGuide ? progress.seen.length >= fieldGuide.target : false;
  });
}

export function badgeReward(badges: readonly Badge[]): number {
  return badges.reduce((total, badge) => total + badge.reward, 0);
}
