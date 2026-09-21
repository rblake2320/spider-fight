export type Screen =
  | "title"
  | "onboard"
  | "yard"
  | "stable"
  | "spider"
  | "hunt"
  | "train"
  | "shop"
  | "fight"
  | "team"
  | "career"
  | "settings";

export type Stage = "nymph" | "juvenile" | "adult" | "veteran" | "champion" | "legend";
export type Sex = "female" | "male";
export type Rarity = "common" | "uncommon" | "rare" | "legendary";
export type MoveId = "lunge" | "grapple" | "feint" | "brace" | "yank" | "drop";
export type GearSlot = "wraps" | "fang" | "silk" | "stim" | "charm";
export type ItemKind = GearSlot | "feed" | "bait" | "tonic" | "upgrade";
export type ShopTab = "gear" | "feed" | "tonics" | "bait" | "stable";

export type Stats = {
  power: number;
  speed: number;
  grit: number;
  venom: number;
  silk: number;
  size: number;
};

export type Gear = Partial<Record<GearSlot, string>>;

export type Injury = {
  label: string;
  fightsLeft: number;
};

export type Spider = {
  id: string;
  name: string;
  speciesId: string;
  morph: string;
  sex: Sex;
  stage: Stage;
  level: number;
  xp: number;
  base: Stats;
  trained: Stats;
  hp: number;
  energy: number;
  morale: number;
  gear: Gear;
  stimFights: number;
  injury: Injury | null;
  origin: string;
  traits: string[];
  wins: number;
  losses: number;
  streak: number;
  caughtAt: number;
  moltReady: number;
  retired: boolean;
};

export type Species = {
  id: string;
  common: string;
  latin: string;
  rarity: Rarity;
  blurb: string;
  portraits: Record<string, string>;
  hanging?: string;
  colors: MorphColors;
  maleColors?: MorphColors;
  bases: Stats;
  spread: Stats;
  traits: string[];
  habitats: string[];
};

export type MorphColors = {
  abdomen: string;
  abdomenLight: string;
  folium: string;
  speckle: string;
  cephalothorax: string;
  legDark: string;
  legLight: string;
  fang: string;
};

export type Item = {
  id: string;
  name: string;
  kind: ItemKind;
  slot?: GearSlot;
  price: number;
  blurb: string;
  bonus?: Partial<Stats & { luck: number }>;
  stimFights?: number;
  rank: number;
};

export type Habitat = {
  id: string;
  name: string;
  blurb: string;
  image: string;
  rank: number;
  cost: number;
  energy: number;
  weights: Partial<Record<Rarity, number>>;
  species: string[];
  night?: boolean;
};

export type RankInfo = {
  id: number;
  name: string;
  blurb: string;
  points: number;
  purse: number;
};

export type Rival = {
  id: string;
  name: string;
  rank: number;
  quote: string;
  bias: string[];
  teamSize: number;
  grit: number;
};

export type FightOutcome = {
  won: boolean;
  wager: number;
  purse: number;
  xp: number;
  stripped: string[];
  decay: Partial<Stats>;
  loot: string | null;
  injury: Injury | null;
  koMove: MoveId | null;
  playerHp: number;
  enemyHp: number;
  enemyName: string;
  rivalId: string;
  jevReads?: number;
};

export type SaveState = {
  version: number;
  season: number;
  stableName: string;
  cash: number;
  rank: number;
  rankPoints: number;
  spiders: Spider[];
  inventory: Record<string, number>;
  rosterCap: number;
  activeTeam: string[];
  selectedId: string | null;
  huntsLeft: number;
  dayStamp: string;
  wins: number;
  losses: number;
  tutorial: number;
  settings: { sfx: boolean; music: boolean; reduceMotion: boolean };
  seen: string[];
  flags: Record<string, string | boolean>;
};
