import { SPECIES } from "./content.ts";
import { isShipped } from "./catalog.ts";
import type { SizeClass, Species, Spider } from "./types.ts";
import type { Rng } from "./rng.ts";

export const SIZE_CLASSES: SizeClass[] = ["thread", "stick", "floor", "pit"];

export const CLASS_LABEL: Record<SizeClass, string> = {
  thread: "Thread",
  stick: "Stick",
  floor: "Floor",
  pit: "Pit",
};

export const CLASS_BLURB: Record<SizeClass, string> = {
  thread: "Jumpers, recluses, widows. Small mill, mean venom.",
  stick: "Porch orb-weavers. The original card.",
  floor: "Hunters, trapdoors, wall-runners. They don't hang pretty.",
  pit: "Tarantulas and bird-eaters. The heavy mill.",
};

export function classIndex(weight: SizeClass): number {
  return SIZE_CLASSES.indexOf(weight);
}

export function sizeClassOfSpecies(spec: Species): SizeClass {
  if (spec.weight) return spec.weight;
  const size = spec.bases.size;
  if (size <= 5) return "thread";
  if (size <= 8) return "stick";
  if (size <= 11) return "floor";
  return "pit";
}

export function sizeClassOfSpider(spider: Pick<Spider, "speciesId">): SizeClass {
  const spec = SPECIES[spider.speciesId];
  return spec ? sizeClassOfSpecies(spec) : "stick";
}

export function classesMeet(a: SizeClass, b: SizeClass): boolean {
  return Math.abs(classIndex(a) - classIndex(b)) <= 1;
}

export function meetingClasses(weight: SizeClass): SizeClass[] {
  return SIZE_CLASSES.filter((other) => classesMeet(weight, other));
}

export function meetingLine(weight: SizeClass): string {
  return meetingClasses(weight).map((entry) => CLASS_LABEL[entry]).join(" & ");
}

/** Ranked calls pick inside the fighter's class and its neighbors. Pit never farms Thread. */
export function pickRivalSpecies(rng: Rng, bias: string[], playerClass: SizeClass): string {
  const live = (id: string) => {
    const spec = SPECIES[id];
    return Boolean(spec && isShipped(spec));
  };
  const matchingBias = bias.filter((id) => live(id) && classesMeet(playerClass, sizeClassOfSpecies(SPECIES[id]!)));
  if (matchingBias.length) return rng.pick(matchingBias);
  const pool = Object.values(SPECIES).filter((spec) => isShipped(spec) && classesMeet(playerClass, sizeClassOfSpecies(spec)));
  return rng.pick(pool.map((spec) => spec.id)) || "hentz";
}
