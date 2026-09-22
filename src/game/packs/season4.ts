import type { Habitat, Item, Rival, Species } from "../types.ts";

/** Silk National pack. The last two ranks get their own spider pool and crews. */
export const SEASON4_SPECIES: Record<string, Species> = {
  bowl: {
    id: "bowl", common: "Bowl and Doily Spider", latin: "Frontinella pyramitela", rarity: "rare",
    blurb: "A hammock of silk under a lace roof. It turns a loose line into a trap.",
    portraits: { default: "/images/spiders/cross.jpg" },
    colors: { abdomen: "#53655a", abdomenLight: "#9eb79e", folium: "#f0ead8", speckle: "#d8e6d2", cephalothorax: "#3d4b42", legDark: "#26332c", legLight: "#a8bda8", fang: "#172019" },
    bases: { power: 8, speed: 10, grit: 9, venom: 6, silk: 12, size: 6 },
    spread: { power: 2, speed: 3, grit: 3, venom: 2, silk: 3, size: 2 },
    traits: ["Bowl keeper", "Doily maker", "Quiet pull"], habitats: ["motel", "gate"],
    web: { name: "Doily curtain", style: "sheet", move: "yank", ability: "Yank tightens the sheet" }, season: 4,
  },
  starbellied: {
    id: "starbellied", common: "Starbellied Orbweaver", latin: "Acanthepeira stellata", rarity: "legendary",
    blurb: "A hard little star on the abdomen. It waits beneath highway lights until the whole line hums.",
    portraits: { default: "/images/spiders/spiny.jpg" },
    colors: { abdomen: "#4b3427", abdomenLight: "#b58552", folium: "#f2df9a", speckle: "#fff4c6", cephalothorax: "#3a2a20", legDark: "#201713", legLight: "#c89d68", fang: "#17100d" },
    bases: { power: 11, speed: 8, grit: 10, venom: 7, silk: 10, size: 8 },
    spread: { power: 3, speed: 2, grit: 3, venom: 2, silk: 3, size: 2 },
    traits: ["Star belly", "Gate glare", "Late hitter"], habitats: ["gate"],
    web: { name: "Stadium spokes", style: "spoked", move: "lunge", ability: "Lunge snaps the web tight" }, season: 4,
  },
  longjaw: {
    id: "longjaw", common: "Long-jawed Orbweaver", latin: "Tetragnatha elongata", rarity: "uncommon",
    blurb: "Thin as a grass blade and all reach. It makes the far end of the stick feel close.",
    portraits: { default: "/images/spiders/arrowhead.jpg" },
    colors: { abdomen: "#7f8a52", abdomenLight: "#c1ce82", folium: "#566438", speckle: "#e4e9a8", cephalothorax: "#526039", legDark: "#303d22", legLight: "#b5c477", fang: "#202916" },
    bases: { power: 6, speed: 13, grit: 6, venom: 9, silk: 10, size: 5 },
    spread: { power: 2, speed: 3, grit: 2, venom: 3, silk: 3, size: 1 },
    traits: ["Long jaw", "Rail runner", "River thread"], habitats: ["motel", "gate"],
    web: { name: "Rail bridge", style: "golden", move: "drop", ability: "Drop pays out a golden line" }, season: 4,
  },
};

export const SEASON4_HABITATS: Habitat[] = [
  { id: "motel", name: "Motel Eave", blurb: "Ice-machine hum, sodium lights, silk tucked under every balcony rail.", image: "/images/bg/barn.jpg", rank: 6, cost: 60, energy: 23, weights: { uncommon: 35, rare: 45, legendary: 20 }, species: ["longjaw", "bowl", "joro", "golden"], night: true, season: 4 },
  { id: "gate", name: "Stadium Service Gate", blurb: "After the lights cut, the national line is just chain-link and big silk.", image: "/images/bg/fair.jpg", rank: 7, cost: 82, energy: 25, weights: { uncommon: 25, rare: 40, legendary: 35 }, species: ["bowl", "starbellied", "longjaw", "golden", "joro"], night: true, season: 4 },
];

export const SEASON4_ITEMS: Record<string, Item> = {
  "national-mail": { id: "national-mail", name: "National Mail", kind: "wraps", slot: "wraps", price: 390, blurb: "Braid over shell from a stable that made the papers.", bonus: { grit: 10, silk: 2 }, rank: 6, season: 4 },
  "relay-resin": { id: "relay-resin", name: "Relay Resin", kind: "silk", slot: "silk", price: 330, blurb: "Clear tack pulled off the service-gate wire.", bonus: { silk: 10, speed: 3 }, rank: 6, season: 4 },
  "bracket-tag": { id: "bracket-tag", name: "Bracket Tag", kind: "charm", slot: "charm", price: 460, blurb: "A numbered tag from a night nobody expected to win.", bonus: { luck: 10, power: 2 }, rank: 7, season: 4 },
};

export const SEASON4_RIVALS: Rival[] = [
  { id: "motelledger", name: "Motel Ledger", rank: 6, quote: "Every purse gets counted twice.", bias: ["bowl", "longjaw", "joro"], teamSize: 3, grit: 1.52, style: "brace", season: 4 },
  { id: "gateseven", name: "Gate Seven", rank: 7, quote: "The lights go out. We don't.", bias: ["starbellied", "bowl", "golden"], teamSize: 3, grit: 1.66, style: "lunge", season: 4 },
];
