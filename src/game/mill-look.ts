import { SPECIES } from "./content.ts";
import type { Sex, SizeClass } from "./types.ts";
import { sizeClassOfSpecies } from "./weight.ts";

/** How the mill hangs: not a recolored Hentz. */
export type AbdShape = "orb" | "drop" | "triangle" | "crab" | "star" | "long" | "bulb" | "flat";
export type EyeSet = "orb" | "jumper" | "wolf" | "recluse" | "huntsman" | "tarantula";
export type MillMark =
  | "folium"
  | "hourglass"
  | "cross"
  | "clover"
  | "catface"
  | "marble"
  | "violin"
  | "bands"
  | "spines"
  | "stripe"
  | "chevron"
  | "spots"
  | "star"
  | "arrow"
  | "debris"
  | "knobs"
  | "none";

export type MillLook = {
  plan: string;
  abdW: number;
  abdH: number;
  abdShape: AbdShape;
  cephW: number;
  cephH: number;
  legLen: number;
  legThick: number;
  legSpread: number;
  hair: number;
  bands: number;
  tufts: boolean;
  eyes: EyeSet;
  mark: MillMark;
  shiny: number;
  fangs: number;
  scale: number;
  /** Unique dorsal photo, clipped to the abdomen. Shared portraits stay off. */
  skin?: string;
};

export const CLASS_SCALE: Record<SizeClass, number> = {
  thread: 0.64,
  stick: 0.96,
  floor: 1.22,
  pit: 1.52,
};

type MillDraft = Partial<Omit<MillLook, "scale" | "plan">> & { size?: number };

const OWNED_SKIN: Record<string, string> = {
  cross: "/images/spiders/cross.jpg",
  shamrock: "/images/spiders/shamrock.jpg",
  catface: "/images/spiders/catface.jpg",
  marbled: "/images/spiders/marbled.jpg",
  arrowhead: "/images/spiders/arrowhead.jpg",
  spiny: "/images/spiders/spiny.jpg",
  golden: "/images/spiders/golden.jpg",
  joro: "/images/spiders/joro.jpg",
  recluse: "/images/spiders/recluse.jpg",
  huntsman: "/images/spiders/huntsman.jpg",
  trapdoor: "/images/spiders/trapdoor.jpg",
  tarantula: "/images/spiders/tarantula.jpg",
  birdeater: "/images/spiders/birdeater.jpg",
};

/** Authored silhouettes. Pack species that borrowed another portrait still get their own mill. */
const DRAFTS: Record<string, MillDraft> = {
  hentz: { abdW: 1, abdH: 1.02, bands: 1.2, mark: "folium" },
  cross: { abdW: 1.08, abdH: 1.1, mark: "cross", bands: 0.8 },
  shamrock: { abdW: 1.22, abdH: 1.18, mark: "clover", legThick: 1.15, size: 1.08 },
  catface: { abdW: 1.12, abdH: 1.05, mark: "catface", cephW: 1.08 },
  marbled: { abdW: 1.14, abdH: 1.12, mark: "marble", shiny: 0.25 },
  arrowhead: {
    abdShape: "triangle",
    abdW: 0.92,
    abdH: 1.18,
    mark: "arrow",
    legLen: 0.92,
    size: 0.9,
  },
  spiny: {
    abdShape: "crab",
    abdW: 1.35,
    abdH: 0.62,
    mark: "spines",
    legLen: 0.72,
    legThick: 0.85,
    legSpread: 1.35,
    size: 0.82,
  },
  golden: {
    abdShape: "long",
    abdW: 0.78,
    abdH: 1.22,
    mark: "stripe",
    legLen: 1.42,
    legThick: 0.78,
    tufts: true,
    bands: 0.4,
    size: 1.08,
  },
  joro: {
    abdShape: "long",
    abdW: 0.82,
    abdH: 1.18,
    mark: "bands",
    legLen: 1.38,
    tufts: true,
    bands: 1.4,
    shiny: 0.2,
  },
  widow: {
    abdShape: "bulb",
    abdW: 1.18,
    abdH: 1.22,
    cephW: 0.7,
    cephH: 0.68,
    mark: "hourglass",
    legLen: 1.32,
    legThick: 0.52,
    legSpread: 0.88,
    bands: 0,
    shiny: 0.88,
    size: 0.92,
  },
  brownwidow: {
    abdShape: "bulb",
    abdW: 1.08,
    abdH: 1.12,
    cephW: 0.74,
    mark: "hourglass",
    legLen: 1.22,
    legThick: 0.58,
    bands: 0.3,
    shiny: 0.45,
    size: 0.88,
  },
  wolf: {
    abdShape: "drop",
    abdW: 0.92,
    abdH: 0.95,
    cephW: 1.22,
    cephH: 1.15,
    mark: "stripe",
    eyes: "wolf",
    legLen: 1.08,
    legThick: 1.12,
    hair: 0.28,
    bands: 0.6,
  },
  jumper: {
    abdShape: "drop",
    abdW: 0.68,
    abdH: 0.7,
    cephW: 1.38,
    cephH: 1.22,
    mark: "chevron",
    eyes: "jumper",
    legLen: 0.68,
    legThick: 1.18,
    legSpread: 0.68,
    shiny: 0.35,
    size: 0.92,
  },
  fishing: {
    abdShape: "flat",
    abdW: 1.05,
    abdH: 0.78,
    cephW: 1.12,
    mark: "spots",
    eyes: "wolf",
    legLen: 1.28,
    legThick: 0.92,
    hair: 0.18,
    size: 1.05,
  },
  lynx: {
    abdShape: "long",
    abdW: 0.72,
    abdH: 1.05,
    mark: "none",
    legLen: 1.18,
    legThick: 0.72,
    hair: 0.62,
    fangs: 1.15,
    size: 0.95,
  },
  house: {
    abdShape: "drop",
    abdW: 1.08,
    abdH: 1.02,
    cephW: 1.15,
    mark: "none",
    legLen: 0.88,
    legThick: 1.22,
    hair: 0.22,
    bands: 0.2,
  },
  bowl: {
    abdShape: "drop",
    abdW: 0.82,
    abdH: 0.88,
    mark: "spots",
    legLen: 0.9,
    shiny: 0.12,
    size: 0.9,
  },
  starbellied: {
    abdShape: "star",
    abdW: 1.12,
    abdH: 0.92,
    mark: "star",
    legLen: 0.85,
    legSpread: 1.12,
  },
  longjaw: {
    abdShape: "long",
    abdW: 0.48,
    abdH: 1.48,
    cephW: 0.72,
    cephH: 0.85,
    mark: "none",
    legLen: 1.25,
    legThick: 0.55,
    fangs: 1.85,
    size: 0.92,
  },
  bandedgarden: {
    abdW: 1.2,
    abdH: 1.28,
    mark: "bands",
    legLen: 1.15,
    bands: 1.6,
    shiny: 0.18,
    size: 1.06,
  },
  trashline: {
    abdShape: "drop",
    abdW: 0.78,
    abdH: 1.08,
    mark: "debris",
    legLen: 0.88,
    size: 0.86,
  },
  barkcrab: {
    abdShape: "crab",
    abdW: 1.28,
    abdH: 0.7,
    cephW: 1.18,
    mark: "none",
    eyes: "huntsman",
    legLen: 1.12,
    legSpread: 1.42,
    hair: 0.2,
    size: 1.04,
  },
  gianthouse: {
    abdShape: "flat",
    abdW: 1.02,
    abdH: 0.82,
    mark: "stripe",
    eyes: "wolf",
    legLen: 1.36,
    legThick: 0.88,
    hair: 0.16,
    size: 1.06,
  },
  labyrinth: {
    abdW: 0.88,
    abdH: 0.9,
    mark: "folium",
    legLen: 0.86,
    bands: 0.5,
    size: 0.84,
  },
  bolas: {
    abdShape: "drop",
    abdW: 1.15,
    abdH: 1.05,
    cephW: 1.22,
    mark: "knobs",
    fangs: 1.2,
    shiny: 0.15,
  },
  recluse: {
    abdShape: "long",
    abdW: 0.7,
    abdH: 1.08,
    cephW: 1.18,
    cephH: 1.12,
    mark: "violin",
    eyes: "recluse",
    legLen: 1.05,
    legThick: 0.62,
    bands: 0,
    fangs: 1.1,
  },
  huntsman: {
    abdShape: "flat",
    abdW: 1.08,
    abdH: 0.68,
    cephW: 1.28,
    cephH: 1.08,
    mark: "stripe",
    eyes: "huntsman",
    legLen: 1.55,
    legThick: 0.82,
    legSpread: 1.55,
    hair: 0.12,
    size: 1.08,
  },
  trapdoor: {
    abdShape: "orb",
    abdW: 1.18,
    abdH: 1.05,
    cephW: 1.35,
    cephH: 1.22,
    mark: "none",
    eyes: "tarantula",
    legLen: 0.72,
    legThick: 1.55,
    legSpread: 0.82,
    hair: 0.55,
    fangs: 1.7,
    bands: 0,
  },
  tarantula: {
    abdW: 1.28,
    abdH: 1.12,
    cephW: 1.42,
    cephH: 1.28,
    mark: "none",
    eyes: "tarantula",
    legLen: 0.98,
    legThick: 1.85,
    legSpread: 1.12,
    hair: 1,
    fangs: 1.45,
    bands: 0,
  },
  birdeater: {
    abdW: 1.38,
    abdH: 1.18,
    cephW: 1.5,
    cephH: 1.32,
    mark: "none",
    eyes: "tarantula",
    legLen: 1.08,
    legThick: 2.05,
    legSpread: 1.18,
    hair: 1,
    fangs: 1.7,
    bands: 0,
    size: 1.12,
  },
};

export function millLookOf(speciesId: string, sex: Sex = "female"): MillLook {
  const spec = SPECIES[speciesId];
  const draft = DRAFTS[speciesId] ?? {};
  const cls = spec ? sizeClassOfSpecies(spec) : "stick";
  const look: MillLook = {
    plan: speciesId,
    abdW: 1,
    abdH: 1,
    abdShape: "orb",
    cephW: 1,
    cephH: 1,
    legLen: 1,
    legThick: 1,
    legSpread: 1,
    hair: 0,
    bands: 1,
    tufts: false,
    eyes: "orb",
    mark: "folium",
    shiny: 0,
    fangs: 1,
    ...draft,
    scale: CLASS_SCALE[cls] * (draft.size ?? 1),
  };
  if (speciesId === "hentz") {
    look.skin = sex === "male" ? "/images/spiders/hentz-m.jpg" : "/images/spiders/hentz-f.jpg";
  } else if (OWNED_SKIN[speciesId]) {
    look.skin = OWNED_SKIN[speciesId];
  }
  return look;
}

/** Compact visual identity — two species with the same fingerprint are clones. */
export function millFingerprint(look: MillLook): string {
  return [
    look.abdShape,
    look.mark,
    look.eyes,
    look.tufts ? "tuft" : "bare",
    look.legLen.toFixed(2),
    look.legThick.toFixed(2),
    look.legSpread.toFixed(2),
    look.hair.toFixed(2),
    look.bands.toFixed(2),
    look.shiny.toFixed(2),
    look.abdW.toFixed(2),
    look.abdH.toFixed(2),
    look.cephW.toFixed(2),
    look.fangs.toFixed(2),
    look.scale.toFixed(2),
  ].join("|");
}
