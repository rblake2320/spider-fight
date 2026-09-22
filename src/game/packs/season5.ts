import type { Habitat, Item, Rival, Species } from "../types.ts";

/** World Tour pack. New travel grounds for yards that have already held a title. */
export const SEASON5_SPECIES: Record<string, Species> = {
  bandedgarden: {
    id: "bandedgarden", common: "Banded Garden Spider", latin: "Argiope trifasciata", rarity: "rare",
    blurb: "Tall silver bands and a web that feels bolted to the rail. She wins late by refusing to give ground.",
    portraits: { default: "/images/spiders/golden.jpg" },
    colors: { abdomen: "#d7d0b4", abdomenLight: "#f5efd2", folium: "#433e32", speckle: "#fff7cf", cephalothorax: "#5c5748", legDark: "#29271f", legLight: "#ded8bc", fang: "#181710" },
    bases: { power: 9, speed: 7, grit: 12, venom: 5, silk: 11, size: 8 },
    spread: { power: 3, speed: 2, grit: 3, venom: 2, silk: 3, size: 2 },
    traits: ["Banded crown", "Rail brace", "Late hitter"], habitats: ["depot", "rooftop"],
    web: { name: "Freight lattice", style: "tangle", move: "brace", ability: "Brace restores stamina and hardens shell", surge: "harden" }, season: 5,
  },
  trashline: {
    id: "trashline", common: "Trashline Orbweaver", latin: "Cyclosa turbinata", rarity: "uncommon",
    blurb: "A scrap bundle hides the body in plain sight. By the time the opponent reads it, the feint is already home.",
    portraits: { default: "/images/spiders/arrowhead.jpg" },
    colors: { abdomen: "#5a5b50", abdomenLight: "#a7a893", folium: "#34352d", speckle: "#d8d2b4", cephalothorax: "#45463c", legDark: "#24251f", legLight: "#969780", fang: "#171811" },
    bases: { power: 6, speed: 12, grit: 7, venom: 9, silk: 10, size: 5 },
    spread: { power: 2, speed: 3, grit: 2, venom: 3, silk: 3, size: 1 },
    traits: ["Scrap blind", "Quick turn", "Silk hoarder"], habitats: ["depot", "rooftop"],
    web: { name: "Scrap cross", style: "cross", move: "feint", ability: "Feint hits harder and steals tempo", surge: "reel" }, season: 5,
  },
  barkcrab: {
    id: "barkcrab", common: "Bark Crab Spider", latin: "Bassaniana versicolor", rarity: "legendary",
    blurb: "Flat against old cedar until the whole body bursts forward. The rooftop crews call it a bad surprise.",
    portraits: { default: "/images/spiders/catface.jpg" },
    colors: { abdomen: "#6e5945", abdomenLight: "#b98a61", folium: "#46372b", speckle: "#e7c78e", cephalothorax: "#513f30", legDark: "#2d221a", legLight: "#a97853", fang: "#20150e" },
    bases: { power: 12, speed: 10, grit: 9, venom: 8, silk: 6, size: 9 },
    spread: { power: 3, speed: 3, grit: 3, venom: 3, silk: 2, size: 3 },
    traits: ["Bark runner", "Ground hunter", "Hot-blooded"], habitats: ["rooftop"],
    web: { name: "Cedar snare", style: "orb", move: "lunge", ability: "Lunge hits harder and pins the line", surge: "ambush" }, season: 5,
  },
};

export const SEASON5_HABITATS: Habitat[] = [
  { id: "depot", name: "Freight Depot", blurb: "Rail dust, stacked pallets, and silk stretched between the couplers.", image: "/images/bg/barn.jpg", rank: 6, cost: 72, energy: 24, weights: { uncommon: 38, rare: 42, legendary: 20 }, species: ["trashline", "bandedgarden", "longjaw", "bowl"], night: true, season: 5 },
  { id: "rooftop", name: "Rooftop Water Tower", blurb: "Wind over the city, one red beacon, and nowhere for a weak line to hide.", image: "/images/bg/fair.jpg", rank: 7, cost: 96, energy: 27, weights: { uncommon: 22, rare: 38, legendary: 40 }, species: ["barkcrab", "bandedgarden", "trashline", "starbellied", "golden"], night: true, season: 5 },
];

export const SEASON5_ITEMS: Record<string, Item> = {
  "depot-wraps": { id: "depot-wraps", name: "Depot Wraps", kind: "wraps", slot: "wraps", price: 470, blurb: "Rail-canvas wraps that keep a hard shell planted.", bonus: { grit: 11, size: 2 }, rank: 6, season: 5 },
  "beacon-silk": { id: "beacon-silk", name: "Beacon Silk", kind: "silk", slot: "silk", price: 520, blurb: "Red-thread resin pulled from a tower line at dawn.", bonus: { silk: 11, speed: 4 }, rank: 7, season: 5 },
  "tour-pass": { id: "tour-pass", name: "World Tour Pass", kind: "charm", slot: "charm", price: 640, blurb: "A stamped pass from the yards that let you through.", bonus: { luck: 11, venom: 3 }, rank: 7, season: 5 },
};

export const SEASON5_RIVALS: Rival[] = [
  { id: "switchyard", name: "Switchyard Saints", rank: 6, quote: "Every rail goes somewhere. So do you.", bias: ["trashline", "bandedgarden", "longjaw"], teamSize: 3, grit: 1.58, style: "feint", season: 5 },
  { id: "towerline", name: "Tower Line", rank: 7, quote: "Look down. We don't.", bias: ["barkcrab", "bandedgarden", "starbellied"], teamSize: 3, grit: 1.72, style: "brace", season: 5 },
];
