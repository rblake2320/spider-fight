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
export type WebStyle = "orb" | "cross" | "tangle" | "spoked" | "golden" | "sheet";
export type GearSlot = "wraps" | "fang" | "silk" | "stim" | "charm";
export type ItemKind = GearSlot | "feed" | "bait" | "tonic" | "upgrade";
export type ShopTab = "gear" | "feed" | "tonics" | "bait" | "stable";
export type MoltQuality = "perfect" | "clean" | "rough";

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
  bredFrom?: string;
  line?: string;
  lastMolt?: MoltQuality;
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
  web: WebProfile;
  season?: number;
};

export type WebProfile = {
  name: string;
  style: WebStyle;
  move: MoveId;
  ability: string;
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
  rewardOnly?: boolean;
  rank: number;
  season?: number;
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
  season?: number;
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
  style?: MoveId;
  always?: boolean;
  mind?: boolean;
  season?: number;
};

export type FightOutcome = {
  won: boolean;
  /** Practice bouts teach the stick without changing competitive progression. */
  practice?: boolean;
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
  headlineBonus?: number;
  seriesBonus?: number;
  streakBonus?: { cash: number; points: number; label: string };
  sky?: string;
  rounds: FightRound[];
};

export type FightRound = {
  round: number;
  playerMove: MoveId;
  enemyMove: MoveId;
  result: "edge" | "hit" | "lock";
  playerDamage: number;
  enemyDamage: number;
  /** A charged species web fired this round. Kept on the tape so wins are explainable. */
  playerSurge?: string;
  enemySurge?: string;
};

export type CareerLog = {
  hunts: number;
  molts: number;
  bouts: number;
  stripped: number;
  clutches: number;
  perfectMolts: number;
};

export type PaperClip = {
  date: string;
  headline: string;
  won: boolean;
  fighter: string;
  rival: string;
};

export type ContractKind = "hunt" | "train" | "win";

export type DailyContract = {
  date: string;
  kind: ContractKind;
  title: string;
  detail: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
};

/** Daily tactical card that rewards using the active spider's own web move. */
export type DailyWebChallenge = {
  date: string;
  target: number;
  progress: number;
  reward: number;
  points: number;
  claimed: boolean;
};

export type RivalRecord = {
  wins: number;
  losses: number;
  streak: number;
  moves?: Partial<Record<MoveId, number>>;
};

export type YardSeries = {
  date: string;
  playerId: string;
  rivals: string[];
  stage: number;
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
  winStreak: number;
  tutorial: number;
  settings: { sfx: boolean; music: boolean; reduceMotion: boolean };
  seen: string[];
  flags: Record<string, string | boolean>;
  career: CareerLog;
  dailyContract: DailyContract;
  dailyWebChallenge: DailyWebChallenge;
  rivalRecords: Record<string, RivalRecord>;
  earnedBadges: string[];
  yardSeries: YardSeries | null;
  paper: PaperClip[];
};
