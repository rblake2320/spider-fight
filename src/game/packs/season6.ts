import type { Habitat, Item, Rival, Species } from "../types.ts";

/** Threshold Circuit. House corners, signal yards, and webs built to disappear into the dark. */
export const SEASON6_SPECIES: Record<string, Species> = {
  gianthouse: {
    id: "gianthouse", common: "Giant House Spider", latin: "Eratigena atrica", rarity: "rare",
    blurb: "A long-legged runner from the deep corner. It reads the tremble through a flat sheet, then braces before the hit lands.",
    portraits: { default: "/images/spiders/cross.jpg" },
    colors: { abdomen: "#554638", abdomenLight: "#947a5e", folium: "#30251e", speckle: "#c9b593", cephalothorax: "#3b3028", legDark: "#211b17", legLight: "#8f795f", fang: "#17120f" },
    bases: { power: 8, speed: 11, grit: 11, venom: 5, silk: 10, size: 9 },
    spread: { power: 3, speed: 3, grit: 3, venom: 2, silk: 3, size: 3 },
    traits: ["Crevice keeper", "Heavy brace", "Night eyes"], habitats: ["underpass", "switchback"],
    web: { name: "Funnel sheet", style: "sheet", move: "brace", ability: "Brace hardens the retreat", surge: "harden" }, season: 6,
  },
  labyrinth: {
    id: "labyrinth", common: "Labyrinth Orbweaver", latin: "Metepeira labyrinthea", rarity: "uncommon",
    blurb: "A small orb hangs beside a messy retreat. It listens from cover, then steals the line before the other spider sees it move.",
    portraits: { default: "/images/spiders/arrowhead.jpg" },
    colors: { abdomen: "#6b5b46", abdomenLight: "#b69b76", folium: "#e1d1a7", speckle: "#f5eaca", cephalothorax: "#504333", legDark: "#2b241c", legLight: "#9d8868", fang: "#1d1812" },
    bases: { power: 6, speed: 12, grit: 8, venom: 8, silk: 12, size: 5 },
    spread: { power: 2, speed: 3, grit: 3, venom: 3, silk: 3, size: 1 },
    traits: ["Quiet pull", "Silk hoarder", "Patient"], habitats: ["underpass", "switchback"],
    web: { name: "Retreat tether", style: "tangle", move: "feint", ability: "Feint steals tempo through the retreat", surge: "reel" }, season: 6,
  },
  bolas: {
    id: "bolas", common: "Bolas Spider", latin: "Mastophora cornigera", rarity: "legendary",
    blurb: "One sticky line, no wasted motion. It calls the night close and snaps a single hard answer into the opening.",
    portraits: { default: "/images/spiders/spiny.jpg" },
    colors: { abdomen: "#d6c39b", abdomenLight: "#f2e6c7", folium: "#8b5f3d", speckle: "#fff2d3", cephalothorax: "#765037", legDark: "#3a291d", legLight: "#c99f73", fang: "#25180f" },
    bases: { power: 10, speed: 9, grit: 7, venom: 12, silk: 11, size: 7 },
    spread: { power: 3, speed: 3, grit: 2, venom: 3, silk: 3, size: 2 },
    traits: ["Night eyes", "Quick fang", "Showboat"], habitats: ["switchback"],
    web: { name: "Moth bolas", style: "spoked", move: "lunge", ability: "Lunge pins the opening", surge: "ambush" }, season: 6,
  },
};

export const SEASON6_HABITATS: Habitat[] = [
  { id: "underpass", name: "Signal Underpass", blurb: "Wet concrete, old utility boxes, and sheet webs tuned to every passing truck.", image: "/images/bg/underpass.webp", rank: 6, cost: 88, energy: 25, weights: { uncommon: 42, rare: 42, legendary: 16 }, species: ["labyrinth", "gianthouse", "trashline", "bowl"], night: true, season: 6 },
  { id: "switchback", name: "Last-Light Switchback", blurb: "A road above the river, moths in the beam, and one final line between the guardrails.", image: "/images/bg/switchback.webp", rank: 7, cost: 112, energy: 28, weights: { uncommon: 20, rare: 40, legendary: 40 }, species: ["bolas", "gianthouse", "labyrinth", "starbellied", "barkcrab"], night: true, season: 6 },
];

export const SEASON6_ITEMS: Record<string, Item> = {
  "funnel-wraps": { id: "funnel-wraps", name: "Funnel Wraps", kind: "wraps", slot: "wraps", price: 590, blurb: "Flat-weave wraps that make a planted shell hard to move.", bonus: { grit: 12, silk: 3 }, rank: 6, season: 6 },
  "tether-silk": { id: "tether-silk", name: "Retreat Tether", kind: "silk", slot: "silk", price: 650, blurb: "A pale line that keeps tension while the body stays hidden.", bonus: { silk: 12, speed: 4 }, rank: 7, season: 6 },
  "night-signal": { id: "night-signal", name: "Night Signal Charm", kind: "charm", slot: "charm", price: 710, blurb: "A reflector bead from the last light on the road.", bonus: { luck: 12, venom: 3 }, rank: 7, season: 6 },
};

export const SEASON6_RIVALS: Rival[] = [
  { id: "concreteghosts", name: "Concrete Ghosts", rank: 6, quote: "You saw the web. You never saw us.", bias: ["labyrinth", "gianthouse", "trashline"], teamSize: 3, grit: 1.66, style: "feint", season: 6 },
  { id: "lastlight", name: "Last Light Line", rank: 7, quote: "When the lamp goes dark, hold your read.", bias: ["bolas", "gianthouse", "starbellied"], teamSize: 3, grit: 1.8, style: "lunge", season: 6 },
];
