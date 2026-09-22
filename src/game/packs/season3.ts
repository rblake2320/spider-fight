import type { Habitat, Item, Rival, Species } from "../types.ts";

/** County Brackets pack. Live when SHIPPED_SEASON >= 3. */

export const SEASON3_SPECIES: Record<string, Species> = {
  fishing: {
    id: "fishing", common: "Fishing Spider", latin: "Dolomedes triton", rarity: "rare",
    blurb: "Long-legged creek runner. Looks too big for the line until it drops.",
    portraits: { default: "/images/spiders/catface.jpg" },
    colors: { abdomen: "#62564a", abdomenLight: "#a69a80", folium: "#473d34", speckle: "#d8cdb5", cephalothorax: "#4e4438", legDark: "#302820", legLight: "#b5a889", fang: "#211b16" },
    bases: { power: 10, speed: 9, grit: 9, venom: 5, silk: 7, size: 9 },
    spread: { power: 3, speed: 2, grit: 3, venom: 2, silk: 2, size: 2 },
    traits: ["Water runner", "Long reach", "County creek"], habitats: ["feedstore", "pavilion"],
    web: { name: "Creek drop", style: "spoked", move: "drop", ability: "Drop tightens own silk" }, season: 3,
  },
  lynx: {
    id: "lynx", common: "Green Lynx", latin: "Peucetia viridans", rarity: "uncommon",
    blurb: "Leaf-green legs and a mean feint. County kids call it the grass knife.",
    portraits: { default: "/images/spiders/spiny.jpg" },
    colors: { abdomen: "#6f9c3a", abdomenLight: "#b6d46a", folium: "#e8ec88", speckle: "#f4f0ba", cephalothorax: "#608b32", legDark: "#405f25", legLight: "#bfd879", fang: "#2b401a" },
    bases: { power: 6, speed: 13, grit: 6, venom: 8, silk: 6, size: 4 },
    spread: { power: 2, speed: 3, grit: 2, venom: 3, silk: 2, size: 1 },
    traits: ["Grass knife", "Leaf blind", "Quick turn"], habitats: ["feedstore", "garden"],
    web: { name: "Leaf feint", style: "cross", move: "feint", ability: "Feint hits harder" }, season: 3,
  },
  house: {
    id: "house", common: "Southern House Spider", latin: "Kukulcania hibernalis", rarity: "common",
    blurb: "Plain brown, heavy in the middle, hard to move once it braces.",
    portraits: { default: "/images/spiders/cross.jpg" },
    colors: { abdomen: "#4c382b", abdomenLight: "#80624a", folium: "#2d211a", speckle: "#b99c7c", cephalothorax: "#3e2d22", legDark: "#241912", legLight: "#9a785c", fang: "#1e140f" },
    bases: { power: 8, speed: 5, grit: 12, venom: 5, silk: 9, size: 7 },
    spread: { power: 2, speed: 2, grit: 3, venom: 2, silk: 3, size: 2 },
    traits: ["Crevice keeper", "Heavy brace", "Patient"], habitats: ["pavilion", "barn"],
    web: { name: "Crevice hold", style: "tangle", move: "brace", ability: "Brace restores stamina" }, season: 3,
  },
};

export const SEASON3_HABITATS: Habitat[] = [
  { id: "feedstore", name: "County Feed Store", blurb: "Seed sacks, grass clippings, a light left over the loading bay.", image: "/images/bg/garden.jpg", rank: 4, cost: 30, energy: 19, weights: { uncommon: 45, rare: 40, legendary: 15 }, species: ["lynx", "fishing", "golden", "marbled"], season: 3 },
  { id: "pavilion", name: "Fair Pavilion", blurb: "After judging ends, webs bloom beneath the folding chairs.", image: "/images/bg/fair.jpg", rank: 5, cost: 42, energy: 21, weights: { common: 20, uncommon: 35, rare: 35, legendary: 10 }, species: ["house", "fishing", "joro", "spiny"], season: 3 },
];

export const SEASON3_ITEMS: Record<string, Item> = {
  "creek-braid": { id: "creek-braid", name: "Creek Braid", kind: "silk", slot: "silk", price: 155, blurb: "River-thread braid with a hard pull.", bonus: { silk: 7, speed: 2 }, rank: 4, season: 3 },
  "feed-sack-wraps": { id: "feed-sack-wraps", name: "Feed Sack Wraps", kind: "wraps", slot: "wraps", price: 185, blurb: "Canvas at the joints. Ugly but stubborn.", bonus: { grit: 5, size: 1 }, rank: 4, season: 3 },
  "pavilion-luck": { id: "pavilion-luck", name: "Pavilion Lucky Pin", kind: "charm", slot: "charm", price: 255, blurb: "A blue-ribbon pin from a bad county year.", bonus: { luck: 7, venom: 1 }, rank: 5, season: 3 },
};

export const SEASON3_RIVALS: Rival[] = [
  { id: "feedlot", name: "Feed Lot Three", rank: 4, quote: "We weigh ours before we wager.", bias: ["lynx", "fishing", "house"], teamSize: 3, grit: 1.32, style: "drop", season: 3 },
  { id: "pavilioncrew", name: "Pavilion Crew", rank: 5, quote: "Blue ribbon or nothing.", bias: ["house", "fishing", "joro"], teamSize: 3, grit: 1.4, style: "brace", season: 3 },
];
