export type Screen =
  | "title"
  | "onboard"
  | "yard"
  | "stable"
  | "spider"
  | "hunt"
  | "train"
  | "shop"
  | "bay"
  | "hides"
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
/** Chassis work. Like tires/engine/body kit — stays on the spider, shows on the stick. */
export type BaySlot = "legs" | "fangs" | "gut" | "gland" | "eye";
export type ItemKind = GearSlot | "feed" | "bait" | "tonic" | "upgrade";
export type ShopTab = "gear" | "feed" | "tonics" | "bait" | "stable";
export type MoltQuality = "perfect" | "clean" | "rough";
/** Ranked cards match inside one class and the neighbors. Pit never farms Thread. */
export type SizeClass = "thread" | "stick" | "floor" | "pit";

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

export type BroodSac = {
  mateName?: string;
  fightsLeft: number;
  speciesId: string;
};

export type Infestation = {
  speciesId: string;
  nights: number;
  count: number;
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
  grafts?: Partial<Record<BaySlot, string>>;
  splicedFrom?: string;
  spliceMark?: string;
  brood?: BroodSac | null;
  hatchlings?: number;
  /** A custom hide draped from the rack — a picture of a 3D mill, hung on the stick. */
  hideId?: string;
};

export type Hide = {
  id: string;
  name: string;
  /** Cooked PNG data URL. Small enough to persist with the yard. */
  src: string;
  madeAt: number;
  /** Millwright who sculpted it. Stamped on tickets. */
  maker?: string;
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
  /** Override for ranked matching. Defaults from bases.size. */
  weight?: SizeClass;
};

export type WebProfile = {
  name: string;
  style: WebStyle;
  move: MoveId;
  ability: string;
  /** An authored payoff layered onto the web-style surge. */
  surge?: "harden" | "reel" | "ambush";
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
  /** Actual circuit-score change, including bonuses unlocked by this bout. */
  points?: number;
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
  /** Bay chassis work that cracked on a loss, like totaling a bumper. */
  cracked?: string;
  /** First opponent species observed at the stick; shown as a field-guide unlock. */
  discovery?: { species: string; web: string; ability: string };
  /** Circuit marks earned by this ranked bout, including their actual point reward. */
  badges?: { name: string; reward: number }[];
  /** The rank crossed during this bout, so the result card can make progression tangible. */
  rankUp?: { name: string; blurb: string };
  /** Egg sac finished incubating on the fighter this bout. */
  broodHatch?: number;
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
  worldTitles: number;
  bayJobs: number;
  splices: number;
  hatches: number;
  hides: number;
  millwrights: number;
  houseCut: number;
  millPaid: number;
};

export type PaperClip = {
  date: string;
  headline: string;
  won: boolean;
  fighter: string;
  rival: string;
};

/** A compact, persistent tape so a player can revisit and share old calls. */
export type FightArchive = {
  date: string;
  fighter: string;
  enemyName: string;
  rivalId: string;
  won: boolean;
  practice: boolean;
  wager: number;
  purse: number;
  points?: number;
  rounds: FightRound[];
};

export type ContractKind = "hunt" | "train" | "win";
export type CircuitActivity = ContractKind;

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

/** Daily tactical card that rewards completing a charged species-web showcase. */
export type DailyWebChallenge = {
  date: string;
  target: number;
  progress: number;
  reward: number;
  points: number;
  claimed: boolean;
};

/** A multi-night Circuit card. Unlike daily cards, it survives until the next Monday. */
export type WeeklyCircuit = {
  week: string;
  title: string;
  detail: string;
  huntTarget: number;
  trainTarget: number;
  winTarget: number;
  hunts: number;
  trains: number;
  wins: number;
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
  settings: { sfx: boolean; music: boolean; reduceMotion: boolean; timingAssist: boolean; readHints: boolean };
  seen: string[];
  flags: Record<string, string | boolean>;
  career: CareerLog;
  dailyContract: DailyContract;
  dailyWebChallenge: DailyWebChallenge;
  weeklyCircuit: WeeklyCircuit;
  rivalRecords: Record<string, RivalRecord>;
  earnedBadges: string[];
  yardSeries: YardSeries | null;
  paper: PaperClip[];
  fightArchive: FightArchive[];
  infestation: Infestation | null;
  hides: Hide[];
};
