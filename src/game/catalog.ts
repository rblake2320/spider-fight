import { HABITATS, ITEMS, ITEM_LIST, RIVALS, SPECIES, SPECIES_LIST } from "./content.ts";
import type { Habitat, Item, Rival, Species } from "./types.ts";

/** Shipped content year. Bump this when a pack goes live — old saves keep working. */
export const SHIPPED_SEASON = 5;
export const BUILD = "1.6.0";

export type SeasonPack = {
  id: number;
  name: string;
  blurb: string;
  adds: string[];
};

export const SEASONS: SeasonPack[] = [
  {
    id: 1,
    name: "Porch Year",
    blurb: "Alley sticks, five hunt lights, and the Widow on the far silk.",
    adds: ["Hentz circuit", "Night porch to fairgrounds", "Black Widow boss", "Stick mind (Jev)"],
  },
  {
    id: 2,
    name: "Night Circuit",
    blurb: "After the bulb dies. Culverts, brown widows, wolves in the ditch.",
    adds: ["Creek Culvert", "Attic Window", "Brown Widow", "Ditch Wolf", "Bold Jumper", "Culvert Crew"],
  },
  {
    id: 3,
    name: "County Circuit",
    blurb: "Feed stores, fair pavilions, and crews who bring three to the stick.",
    adds: ["County Feed Store", "Fair Pavilion", "Fishing Spider", "Green Lynx", "Southern House Spider", "Feed Lot Three"],
  },
  {
    id: 4,
    name: "Silk National",
    blurb: "Motel balconies, service gates, and crews that have done this before.",
    adds: ["Motel Eave", "Stadium Service Gate", "Bowl and Doily", "Starbellied", "Long-jawed", "Gate Seven"],
  },
  {
    id: 5,
    name: "World Tour",
    blurb: "Freight yards, rooftop beacons, and the crews who travel farther than the stick.",
    adds: ["Freight Depot", "Rooftop Water Tower", "Banded Garden Spider", "Trashline Orbweaver", "Tower Line"],
  },
];

export function seasonOf(entry: { season?: number }): number {
  return entry.season ?? 1;
}

export function isShipped(entry: { season?: number }): boolean {
  return seasonOf(entry) <= SHIPPED_SEASON;
}

export function seasonName(id: number): string {
  return SEASONS.find((s) => s.id === id)?.name ?? `Season ${id}`;
}

/**
 * A player's career year is separate from the newest content pack. New yards
 * begin in Porch Year even when later packs have shipped; after the last
 * released pack, keep the latest available circuit name until a new one opens.
 */
export function careerSeasonId(year: number): number {
  return Math.max(1, Math.min(Math.floor(year), SHIPPED_SEASON));
}

export function speciesOf(id: string): Species {
  return SPECIES[id] ?? SPECIES.hentz!;
}

export function itemOf(id: string): Item | undefined {
  return ITEMS[id];
}

export function liveSpecies(): Species[] {
  return SPECIES_LIST.filter(isShipped);
}

export function liveHabitats(): Habitat[] {
  return HABITATS.filter(isShipped);
}

export function liveItems(): Item[] {
  return ITEM_LIST.filter(isShipped);
}

export function liveRivals(): Rival[] {
  return RIVALS.filter(isShipped);
}

export function comingHabitats(): Habitat[] {
  return HABITATS.filter((h) => !isShipped(h));
}

export function comingRivals(): Rival[] {
  return RIVALS.filter((r) => !isShipped(r) && !r.always);
}
