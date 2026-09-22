import { mulberry32, seedFrom } from "./rng";
import type { ContractKind, DailyContract } from "./types";

type ContractTemplate = Pick<DailyContract, "kind" | "title" | "detail" | "target" | "reward">;

const CARDS: ContractTemplate[] = [
  { kind: "hunt", title: "Porch sweep", detail: "Run two hunt lights and bring something back to the yard.", target: 2, reward: 16 },
  { kind: "train", title: "Drill night", detail: "Put two honest drills into any spider.", target: 2, reward: 18 },
  { kind: "win", title: "Hold the stick", detail: "Win one called fight before the porch light dies.", target: 1, reward: 24 },
];

export function makeDailyContract(date: string, rank: number): DailyContract {
  const rng = mulberry32(seedFrom(`contract:${date}:${rank}`));
  const card = rng.pick(CARDS);
  const reward = card.reward + rank * 4;
  return { ...card, date, reward, progress: 0, claimed: false };
}

export function advanceContract(contract: DailyContract, kind: ContractKind): DailyContract {
  if (contract.claimed || contract.kind !== kind) return contract;
  return { ...contract, progress: Math.min(contract.target, contract.progress + 1) };
}

export function canClaimContract(contract: DailyContract): boolean {
  return !contract.claimed && contract.progress >= contract.target;
}
