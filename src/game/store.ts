import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FightOutcome, SaveState, Screen, Spider, Stats } from "./types";
import {
  HABITATS,
  HUNTS_PER_DAY,
  ITEMS,
  RANKS,
  RIVALS,
  SAVE_VERSION,
  SPECIES,
  TEAM_SIZE,
  maxEnergy,
  maxHp,
  xpToNext,
} from "./content";
import { clamp, mulberry32, seedFrom, todayStamp, uid } from "./rng";
import { mixHunt, tonightSky } from "./sky";
import { canClutch, clutchCost, makeClutch } from "./clutch";
import { canSetSac, mergeInfestation, sacCost, scatterBrood, setSac, tickBrood, tickInfestation } from "./brood";
import { pickRivalSpecies, sizeClassOfSpider } from "./weight";
import {
  applyXp,
  applyRivalGrit,
  canFight,
  canMolt,
  effective,
  filledHp,
  molt,
  rollSpider,
  STAT_LABEL,
  starterSpider,
  teamSupport,
} from "./spiders";
import { unlockAudio, setMusicEnabled, setSfxEnabled } from "./audio";
import { isShipped } from "./catalog";
import { EMPTY_CAREER, migrateSave } from "./migrate";
import {
  advanceContract,
  advanceWebChallenge,
  canClaimContract,
  canClaimWebChallenge,
  makeDailyContract,
  makeDailyWebChallenge,
} from "./contracts";
import { firstWinTrophy } from "./rewards";
import { fightStakes } from "./fight-stakes";
import { applyBait } from "./bait";
import { badgeReward, newlyEarnedBadges } from "./badges";
import { nightlyRival } from "./night-card";
import { SERIES_BONUS_CASH, SERIES_BONUS_POINTS, yardSeriesLineup } from "./series";
import { recordRivalMoves } from "./rival-intel";
import { canCallWidow } from "./boss";
import { traitHuntChance, traitTrainCost } from "./traits";
import { applyJob, bayJobOf, canFit, canSplice, splice, spliceCost } from "./bay";
import { applyMillKits, canDrape, canLicenseStall, decodeAnyTicket, drape, HIDE_COST, makeHide, millwrightFee, splitPurse, stallMillOf, stripHide } from "./hides";
import { activeSpiders, canRelease, canRetire, releaseCash, retire } from "./rafters";
import { pushPaper, writeClip } from "./paper";
import { dailyStreakBonus, nextDailyStreak } from "./daily-streak";
import { streakReward } from "./streak";
import { archiveFight, pushFightArchive } from "./fight-archive";
import { advanceWeeklyCircuit, canClaimWeeklyCircuit, makeWeeklyCircuit, weekStamp } from "./weekly-circuit";

const emptySave = (): SaveState => ({
  version: SAVE_VERSION,
  season: 1,
  stableName: "",
  cash: 48,
  rank: 0,
  rankPoints: 0,
  spiders: [],
  inventory: { cricket: 3, "porch-twine": 1, "dew-oil": 1 },
  rosterCap: 6,
  activeTeam: [],
  selectedId: null,
  huntsLeft: HUNTS_PER_DAY,
  dayStamp: todayStamp(),
  wins: 0,
  losses: 0,
  winStreak: 0,
  tutorial: 0,
  settings: { sfx: true, music: true, reduceMotion: false, timingAssist: false },
  seen: ["hentz"],
  flags: {},
  career: { ...EMPTY_CAREER },
  dailyContract: makeDailyContract(todayStamp(), 0),
  dailyWebChallenge: makeDailyWebChallenge(todayStamp(), 0),
  weeklyCircuit: makeWeeklyCircuit(todayStamp(), 0),
  rivalRecords: {},
  earnedBadges: [],
  yardSeries: null,
  paper: [],
  fightArchive: [],
  infestation: null,
  hides: [],
});

type Session = {
  screen: Screen;
  hydrated: boolean;
  huntHabitat: string | null;
  huntBait: string | null;
  activeBait: string | null;
  pendingCatch: Spider | null;
  fight: {
    rivalId: string;
    playerId: string;
    wager: number;
    practice: boolean;
    enemy: Spider;
    teamBonus: Partial<Stats>;
    headline: boolean;
    seriesStage: number | null;
  } | null;
  result: FightOutcome | null;
};

type Game = SaveState &
  Session & {
    hydrate: () => void;
    setScreen: (s: Screen) => void;
    startGame: (name: string) => void;
    selectSpider: (id: string | null) => void;
    renameSpider: (id: string, name: string) => void;
    renameStable: (name: string) => void;
    buy: (itemId: string) => string | null;
    equip: (spiderId: string, itemId: string) => string | null;
    unequip: (spiderId: string, slot: keyof Spider["gear"]) => void;
    feed: (spiderId: string, itemId: string) => string | null;
    useTonic: (spiderId: string, itemId: string) => string | null;
    setHuntBait: (itemId: string | null) => string | null;
    train: (spiderId: string, stat: keyof Stats) => string | null;
    restSpider: (spiderId: string) => string | null;
    tryMolt: (spiderId: string) => string | null;
    setTeamSlot: (index: number, spiderId: string | null) => void;
    startHunt: (habitatId: string) => string | null;
    resolveHuntTap: (quality: number) => Spider | null;
    keepCatch: () => string | null;
    releaseCatch: () => void;
    leaveHunt: () => void;
    prepareFight: (rivalId: string, playerId: string, wager: number, practice?: boolean) => string | null;
    startPractice: (playerId: string, rivalId?: string) => string | null;
    startYardSeries: (playerId: string) => string | null;
    continueYardSeries: () => string | null;
    setClutch: (aId: string, bId: string) => string | null;
    setSac: (motherId: string, mateId?: string | null) => string | null;
    shakeBrood: (motherId: string) => string | null;
    retireSpider: (id: string) => string | null;
    releaseSpider: (id: string) => string | null;
    fitBay: (spiderId: string, jobId: string) => string | null;
    spliceDna: (hostId: string, donorId: string) => string | null;
    addHide: (name: string, src: string, maker?: string) => string | null;
    importHide: (ticket: string) => string | null;
    licenseMill: (mill: import("./hides").Millwright) => string | null;
    licenseStall: (id: string) => string | null;
    drapeHide: (spiderId: string, hideId: string) => string | null;
    stripHide: (spiderId: string) => string | null;
    releaseHide: (hideId: string) => string | null;
    applyResult: (out: FightOutcome, finalSpider: Spider) => void;
    clearResult: () => void;
    collectDaily: () => void;
    claimDailyContract: () => string | null;
    claimDailyWebChallenge: () => string | null;
    claimWeeklyCircuit: () => string | null;
    setSetting: (k: keyof SaveState["settings"], v: boolean) => void;
    resetAll: () => void;
    rollYear: () => string | null;
    spiderById: (id: string) => Spider | undefined;
  };

function patchSpider(spiders: Spider[], id: string, fn: (s: Spider) => Spider): Spider[] {
  return spiders.map((s) => (s.id === id ? fn(s) : s));
}

function addInv(inv: Record<string, number>, id: string, n = 1): Record<string, number> {
  return { ...inv, [id]: (inv[id] ?? 0) + n };
}

function takeInv(inv: Record<string, number>, id: string, n = 1): Record<string, number> | null {
  const have = inv[id] ?? 0;
  if (have < n) return null;
  const next = { ...inv, [id]: have - n };
  if (next[id] === 0) delete next[id];
  return next;
}

function badgeProgress(
  save: Pick<SaveState, "earnedBadges" | "rank" | "rankPoints">,
  progress: Pick<SaveState, "spiders" | "career" | "wins" | "seen">,
) {
  const unlocked = newlyEarnedBadges(save.earnedBadges, progress);
  const rankPoints = save.rankPoints + badgeReward(unlocked);
  let rank = save.rank;
  while (rank < RANKS.length - 1 && rankPoints >= RANKS[rank + 1]!.points) rank += 1;
  return { earnedBadges: [...save.earnedBadges, ...unlocked.map((badge) => badge.id)], rankPoints, rank };
}

export const useGame = create<Game>()(
  persist(
    (set, get) => ({
      ...emptySave(),
      screen: "title",
      hydrated: false,
      huntHabitat: null,
      huntBait: null,
      activeBait: null,
      pendingCatch: null,
      fight: null,
      result: null,

      hydrate: () => {
        const s = get();
        const today = todayStamp();
        const refreshDay = s.dayStamp !== today || s.dailyContract.date !== today || s.dailyWebChallenge?.date !== today;
        const refreshWeek = s.weeklyCircuit?.week !== weekStamp(today);
        if (refreshDay || refreshWeek) {
          set({
            ...(refreshDay ? {
              huntsLeft: HUNTS_PER_DAY,
              dayStamp: today,
              dailyContract: makeDailyContract(today, s.rank),
              dailyWebChallenge: makeDailyWebChallenge(today, s.rank),
              yardSeries: s.yardSeries?.date === today ? s.yardSeries : null,
              infestation: tickInfestation(s.infestation),
            } : {}),
            ...(refreshWeek ? { weeklyCircuit: makeWeeklyCircuit(today, s.rank) } : {}),
          });
        }
        if (!s.career) set({ career: { ...EMPTY_CAREER } });
        if (!s.paper) set({ paper: [] });
        if (!s.hides) set({ hides: [] });
        set({ hydrated: true });
        setSfxEnabled(s.settings.sfx);
        setMusicEnabled(s.settings.music);
      },

      setScreen: (screen) => set({ screen }),

      startGame: (name) => {
        unlockAudio();
        const starter = starterSpider();
        set({
          ...emptySave(),
          stableName: name.trim() || "Porch Crew",
          spiders: [starter],
          selectedId: starter.id,
          activeTeam: [starter.id],
          tutorial: 1,
          screen: "yard",
          hydrated: true,
        });
      },

      selectSpider: (id) => set({ selectedId: id, screen: id ? "spider" : "stable" }),

      renameSpider: (id, name) =>
        set({ spiders: patchSpider(get().spiders, id, (s) => ({ ...s, name: name.trim().slice(0, 18) || s.name })) }),

      renameStable: (name) => set({ stableName: name.trim().slice(0, 22) || get().stableName }),

      buy: (itemId) => {
        const item = ITEMS[itemId];
        if (!item) return "Unknown item";
        if (item.rewardOnly) return "Earn that from the stick";
        const g = get();
        if (!isShipped(item)) return "Not in this year's crate";
        if (g.rank < item.rank) return "Rank locked";
        if (g.cash < item.price) return "Not enough cash";
        if (item.kind === "upgrade") {
          set({ cash: g.cash - item.price, rosterCap: g.rosterCap + 2 });
          return null;
        }
        set({ cash: g.cash - item.price, inventory: addInv(g.inventory, itemId) });
        return null;
      },

      equip: (spiderId, itemId) => {
        const item = ITEMS[itemId];
        if (!item || !item.slot) return "Can't wear that";
        const g = get();
        const inv = takeInv(g.inventory, itemId);
        if (!inv) return "None in the crate";
        const spider = g.spiders.find((s) => s.id === spiderId);
        if (!spider) return "No spider";
        const prev = spider.gear[item.slot];
        let inventory = inv;
        if (prev) inventory = addInv(inventory, prev);
        const stimFights = item.slot === "stim" ? (item.stimFights ?? 3) : spider.stimFights;
        set({
          inventory,
          spiders: patchSpider(g.spiders, spiderId, (s) => ({
            ...s,
            gear: { ...s.gear, [item.slot!]: itemId },
            stimFights,
          })),
        });
        return null;
      },

      unequip: (spiderId, slot) => {
        const g = get();
        const spider = g.spiders.find((s) => s.id === spiderId);
        const id = spider?.gear[slot];
        if (!spider || !id) return;
        const gear = { ...spider.gear };
        delete gear[slot];
        set({
          inventory: addInv(g.inventory, id),
          spiders: patchSpider(g.spiders, spiderId, (s) => ({ ...s, gear })),
        });
      },

      feed: (spiderId, itemId) => {
        const item = ITEMS[itemId];
        if (!item || item.kind !== "feed") return "Not feed";
        const g = get();
        const inv = takeInv(g.inventory, itemId);
        if (!inv) return "None left";
        const energyGain = itemId === "hopper" ? 48 : itemId === "moth" ? 36 : itemId === "wasp" ? 32 : 28;
        const moltGain = itemId === "moth" || itemId === "hopper" ? 10 : 5;
        const venom = itemId === "wasp" ? 1 : 0;
        set({
          inventory: inv,
          spiders: patchSpider(g.spiders, spiderId, (s) => ({
            ...s,
            energy: clamp(s.energy + energyGain, 0, maxEnergy(effective(s).size)),
            moltReady: clamp(s.moltReady + moltGain, 0, 100),
            morale: clamp(s.morale + 4, 0, 100),
            trained: { ...s.trained, venom: s.trained.venom + venom },
            hp: Math.min(filledHp(s), s.hp + 8),
          })),
        });
        return null;
      },

      useTonic: (spiderId, itemId) => {
        const item = ITEMS[itemId];
        if (!item || item.kind !== "tonic") return "Not a tonic";
        const g = get();
        const inv = takeInv(g.inventory, itemId);
        if (!inv) return "None left";
        set({
          inventory: inv,
          spiders: patchSpider(g.spiders, spiderId, (s) => {
            if (itemId === "field-salve") return { ...s, injury: null, hp: filledHp(s) };
            if (itemId === "morale-tea") return { ...s, morale: 100 };
            if (itemId === "molt-tonic") return { ...s, moltReady: clamp(s.moltReady + 40, 0, 100) };
            return s;
          }),
        });
        return null;
      },

      train: (spiderId, stat) => {
        const g = get();
        const s = g.spiders.find((x) => x.id === spiderId);
        if (!s) return "No spider";
        if (s.retired) return "Hung in the rafters";
        const cost = traitTrainCost(s.traits, 10 + s.trained[stat] * 6);
        if (g.cash < cost) return "Not enough cash";
        if (s.energy < 16) return "Too tired";
        if (s.injury) return "Injured";
        if (s.trained[stat] >= 18) return "That's as far as drills go. They need a molt.";
        const spiders = patchSpider(g.spiders, spiderId, (sp) => ({
            ...sp,
            trained: { ...sp.trained, [stat]: sp.trained[stat] + 1 },
            energy: sp.energy - 16,
            moltReady: clamp(sp.moltReady + 4, 0, 100),
            xp: sp.xp + 8,
          }));
        const unlocked = newlyEarnedBadges(g.earnedBadges, { spiders, career: g.career, wins: g.wins, seen: g.seen });
        set({
          cash: g.cash - cost,
          dailyContract: advanceContract(g.dailyContract, "train"),
          weeklyCircuit: advanceWeeklyCircuit(g.weeklyCircuit, "train"),
          tutorial: g.tutorial === 3 ? 4 : g.tutorial,
          spiders,
          ...badgeProgress(g, { spiders, career: g.career, wins: g.wins, seen: g.seen }),
        });
        return unlocked.length
          ? `Drilled ${STAT_LABEL[stat]} · ${unlocked.map((badge) => `${badge.name} +${badge.reward} circuit pts`).join(" · ")}`
          : null;
      },

      restSpider: (spiderId) => {
        const g = get();
        const spider = g.spiders.find((s) => s.id === spiderId);
        if (spider?.retired) return "Hung in the rafters";
        const cost = 6;
        if (g.cash < cost) return "Not enough cash";
        set({
          cash: g.cash - cost,
          spiders: patchSpider(g.spiders, spiderId, (s) => ({
            ...s,
            energy: maxEnergy(effective(s).size),
            hp: filledHp(s),
            morale: clamp(s.morale + 10, 0, 100),
            injury: s.injury ? { ...s.injury, fightsLeft: Math.max(0, s.injury.fightsLeft - 1) } : null,
          })),
        });
        const s = get().spiders.find((x) => x.id === spiderId);
        if (s?.injury && s.injury.fightsLeft <= 0) {
          set({ spiders: patchSpider(get().spiders, spiderId, (x) => ({ ...x, injury: null })) });
        }
        return null;
      },

      tryMolt: (spiderId) => {
        const s = get().spiders.find((x) => x.id === spiderId);
        if (!s) return "No spider";
        const blocked = canMolt(s);
        if (blocked) return blocked;
        const g = get();
        const next = molt(s, mulberry32(seedFrom(s.id + String(s.moltReady) + String(Date.now()))));
        if (!next) return "Already at the top";
        const spiders = patchSpider(g.spiders, spiderId, () => next.spider);
        const career = {
          ...(g.career ?? EMPTY_CAREER),
          molts: (g.career?.molts ?? 0) + 1,
          perfectMolts: (g.career?.perfectMolts ?? 0) + (next.quality === "perfect" ? 1 : 0),
        };
        set({ spiders, career, ...badgeProgress(g, { spiders, career, wins: g.wins, seen: g.seen }) });
        return null;
      },

      setTeamSlot: (index, spiderId) => {
        const team = [...get().activeTeam];
        if (spiderId && team.includes(spiderId)) {
          const old = team.indexOf(spiderId);
          if (old >= 0) team[old] = team[index] ?? "";
        }
        if (spiderId) team[index] = spiderId;
        else team.splice(index, 1);
        set({ activeTeam: team.filter(Boolean).slice(0, TEAM_SIZE) });
      },

      startHunt: (habitatId) => {
        const hab = HABITATS.find((h) => h.id === habitatId);
        if (!hab) return "No such ground";
        if (!isShipped(hab)) return "Not on this year's circuit";
        const g = get();
        if (g.rank < hab.rank) return "Rank locked";
        if (g.huntsLeft <= 0) return "That's all the light tonight";
        if (g.cash < hab.cost) return "Can't cover the trip";
        const lead = g.spiders.find((s) => s.id === g.selectedId && !s.retired) ?? g.spiders.find((s) => !s.retired);
        const sky = tonightSky();
        const energyCost = hab.energy + sky.energy;
        if (lead && lead.energy < energyCost) return "Your lead spider is spent";
        const inventory = g.huntBait ? takeInv(g.inventory, g.huntBait) : g.inventory;
        if (!inventory) return "That bait is gone";
        let spiders = g.spiders;
        let infestation = g.infestation;
        const career = { ...g.career, hunts: g.career.hunts + 1 };
        let seen = g.seen;
        const rider = spiders.find((s) => (s.hatchlings ?? 0) > 0);
        if (rider) {
          const result = scatterBrood(
            rider,
            mulberry32(seedFrom(rider.id + habitatId + String(g.dayStamp))),
            g.stableName,
            activeSpiders(spiders).length,
            g.rosterCap,
          );
          spiders = [...patchSpider(spiders, rider.id, () => result.mother), ...result.kept];
          infestation = mergeInfestation(infestation, result.speciesId, result.escaped);
          seen = result.kept.reduce((list, nymph) => (list.includes(nymph.speciesId) ? list : [...list, nymph.speciesId]), seen);
        }
        set({
          cash: g.cash - hab.cost,
          huntsLeft: g.huntsLeft - 1,
          huntHabitat: habitatId,
          huntBait: null,
          activeBait: g.huntBait,
          pendingCatch: null,
          inventory,
          screen: "hunt",
          tutorial: g.tutorial === 1 ? 2 : g.tutorial,
          career,
          seen,
          infestation,
          dailyContract: advanceContract(g.dailyContract, "hunt"),
          weeklyCircuit: advanceWeeklyCircuit(g.weeklyCircuit, "hunt"),
          spiders: lead
            ? patchSpider(spiders, lead.id, (s) => ({ ...s, energy: s.energy - energyCost }))
            : spiders,
          ...badgeProgress(g, { spiders, career, wins: g.wins, seen }),
        });
        return null;
      },

      resolveHuntTap: (quality) => {
        const g = get();
        const hab = HABITATS.find((h) => h.id === g.huntHabitat);
        if (!hab) return null;
        const rng = mulberry32(seedFrom(g.stableName + String(Date.now())));
        const sky = tonightSky();
        const bait = applyBait(g.activeBait, mixHunt(hab.weights, sky));
        const lead = g.spiders.find((s) => s.id === g.selectedId && !s.retired) ?? g.spiders.find((s) => !s.retired);
        const luck = lead ? traitHuntChance(lead.traits) : 0;
        if (rng.next() > 0.28 + quality * 0.5 + bait.chanceBonus + sky.chance + luck) return null;
        const infested = g.infestation && SPECIES[g.infestation.speciesId] ? g.infestation : null;
        const ground = infested && !hab.species.includes(infested.speciesId)
          ? { ...hab, species: [infested.speciesId, ...hab.species], weights: bait.weights }
          : { ...hab, weights: bait.weights };
        const forceBrood = infested && rng.chance(0.38);
        const caught = rollSpider(rng, {
          habitat: ground,
          rank: g.rank,
          speciesId: forceBrood ? infested.speciesId : undefined,
        });
        const seen = g.seen.includes(caught.speciesId) ? g.seen : [...g.seen, caught.speciesId];
        set({
          pendingCatch: caught,
          seen,
          tutorial: g.tutorial === 2 ? 3 : g.tutorial,
          ...badgeProgress(g, { spiders: g.spiders, career: g.career, wins: g.wins, seen }),
        });
        return caught;
      },

      keepCatch: () => {
        const g = get();
        if (!g.pendingCatch) return "Nothing in the jar";
        if (activeSpiders(g.spiders).length >= g.rosterCap) return "Stable is full. Hang a veteran or let one go.";
        const caught = g.pendingCatch;
        set({
          spiders: [...g.spiders, caught],
          pendingCatch: null,
          selectedId: caught.id,
          screen: "spider",
        });
        return null;
      },

      releaseCatch: () => set({ pendingCatch: null }),

      leaveHunt: () => set({ huntHabitat: null, activeBait: null, pendingCatch: null, screen: "hunt" }),

      prepareFight: (rivalId, playerId, wager, practice = false) => {
        const g = get();
        const player = g.spiders.find((s) => s.id === playerId);
        if (!player) return "Pick a fighter";
        const reason = canFight(player);
        if (reason) return reason;
        if (g.cash < wager) return "Can't cover the wager";
        const rival = RIVALS.find((r) => r.id === rivalId) ?? RIVALS[0]!;
        if (!isShipped(rival)) return "That crew isn't on this year's circuit";
        if (rival.mind && !practice && !canCallWidow(g.rank)) return "Reach District before calling the Widow";
        const fightRank = rival.always ? Math.max(g.rank, rival.rank) : rival.rank;
        const rng = mulberry32(seedFrom(rival.id + String(g.rank) + player.id.slice(0, 4)));
        const stage =
          fightRank < 1 ? "juvenile" : fightRank < 3 ? "adult" : fightRank < 5 ? "veteran" : "champion";
        const speciesId = rival.mind ? "widow" : pickRivalSpecies(rng, rival.bias, sizeClassOfSpider(player));
        const enemy = applyRivalGrit(rollSpider(rng, { speciesId, rank: fightRank, stage, asRival: true }), rival.grit);
        if (rival.mind) {
          enemy.name = "Black Widow";
          enemy.sex = "female";
          enemy.speciesId = "widow";
          enemy.traits = ["Hourglass", "Venom queen", "Doesn't blink"];
        }
        set({
          fight: {
            rivalId,
            playerId,
            wager,
            practice,
            enemy,
            teamBonus: teamSupport(player, g.spiders, g.activeTeam),
            headline: nightlyRival(g.dayStamp, g.rank).id === rivalId,
            seriesStage: null,
          },
          result: null,
          screen: "fight",
          cash: g.cash - wager,
          tutorial: !practice && g.tutorial === 4 ? 5 : g.tutorial,
        });
        return null;
      },

      startYardSeries: (playerId) => {
        const g = get();
        if (g.flags.yardSeries === g.dayStamp) return "That yard series is called for today";
        if (g.yardSeries?.date === g.dayStamp && g.yardSeries.stage < g.yardSeries.rivals.length) {
          return "A yard series is already waiting";
        }
        const player = g.spiders.find((spider) => spider.id === playerId);
        if (!player) return "Pick a fighter";
        const reason = canFight(player);
        if (reason) return reason;
        const lineup = yardSeriesLineup(g.dayStamp, g.rank);
        set({ yardSeries: { date: g.dayStamp, playerId, rivals: lineup.map((rival) => rival.id), stage: 0 } });
        return get().continueYardSeries();
      },

      continueYardSeries: () => {
        const g = get();
        const run = g.yardSeries;
        if (!run || run.date !== g.dayStamp || run.stage >= run.rivals.length) return "No yard series is waiting";
        const rivalId = run.rivals[run.stage];
        if (!rivalId) return "No crew on this card";
        const message = get().prepareFight(rivalId, run.playerId, 0);
        if (message) return message;
        const fight = get().fight;
        if (fight) set({ fight: { ...fight, seriesStage: run.stage } });
        return null;
      },

      setClutch: (aId, bId) => {
        const g = get();
        const a = g.spiders.find((s) => s.id === aId);
        const b = g.spiders.find((s) => s.id === bId);
        if (!a || !b) return "Pick two";
        const reason = canClutch(a, b, activeSpiders(g.spiders).length, g.rosterCap);
        if (reason) return reason;
        const cost = clutchCost(g.rank);
        if (g.cash < cost) return "Not enough cash";
        const baby = makeClutch(a, b, mulberry32(seedFrom(a.id + b.id + String(Date.now()))), g.stableName);
        const rest = (s: Spider) =>
          s.retired ? s : { ...s, energy: s.energy - 28, moltReady: clamp(s.moltReady + 6, 0, 100) };
        const spiders = [...patchSpider(patchSpider(g.spiders, a.id, rest), b.id, rest), baby];
        const career = { ...g.career, clutches: (g.career.clutches ?? 0) + 1 };
        const seen = g.seen.includes(baby.speciesId) ? g.seen : [...g.seen, baby.speciesId];
        set({
          cash: g.cash - cost,
          spiders,
          seen,
          selectedId: baby.id,
          screen: "spider",
          career,
          ...badgeProgress(g, { spiders, career, wins: g.wins, seen }),
        });
        return null;
      },

      setSac: (motherId, mateId) => {
        const g = get();
        const mother = g.spiders.find((s) => s.id === motherId);
        if (!mother) return "Pick a hen";
        const blocked = canSetSac(mother);
        if (blocked) return blocked;
        const cost = sacCost(g.rank);
        if (g.cash < cost) return "Not enough cash";
        const mate = mateId ? g.spiders.find((s) => s.id === mateId) ?? null : null;
        const spiders = patchSpider(g.spiders, motherId, () => setSac(mother, mate));
        set({ cash: g.cash - cost, spiders });
        return null;
      },

      shakeBrood: (motherId) => {
        const g = get();
        const mother = g.spiders.find((s) => s.id === motherId);
        if (!mother) return "No spider";
        if (!(mother.hatchlings ?? 0)) return "Nothing riding her";
        const result = scatterBrood(
          mother,
          mulberry32(seedFrom(mother.id + String(Date.now()))),
          g.stableName,
          activeSpiders(g.spiders).length,
          g.rosterCap,
        );
        const spiders = [...patchSpider(g.spiders, motherId, () => result.mother), ...result.kept];
        const seen = result.kept.reduce((list, nymph) => (list.includes(nymph.speciesId) ? list : [...list, nymph.speciesId]), g.seen);
        set({
          spiders,
          seen,
          infestation: mergeInfestation(g.infestation, result.speciesId, result.escaped),
          selectedId: result.kept[0]?.id ?? g.selectedId,
          ...badgeProgress(g, { spiders, career: g.career, wins: g.wins, seen }),
        });
        const kept = result.kept.length ? `Kept ${result.kept[0]!.name} in the crate.` : "Stable is full — they all ran.";
        const ran = result.escaped ? ` ${result.escaped} went everywhere.` : "";
        return `${kept}${ran}`;
      },

      retireSpider: (id) => {
        const g = get();
        const spider = g.spiders.find((s) => s.id === id);
        if (!spider) return "No spider";
        const reason = canRetire(spider, activeSpiders(g.spiders).length);
        if (reason) return reason;
        const spiders = patchSpider(g.spiders, id, retire);
        set({
          spiders,
          activeTeam: g.activeTeam.filter((slot) => slot !== id),
          selectedId: g.selectedId === id ? (spiders.find((s) => !s.retired)?.id ?? id) : g.selectedId,
          ...badgeProgress(g, { spiders, career: g.career, wins: g.wins, seen: g.seen }),
        });
        return null;
      },

      releaseSpider: (id) => {
        const g = get();
        const spider = g.spiders.find((s) => s.id === id);
        if (!spider) return "No spider";
        const reason = canRelease(spider, activeSpiders(g.spiders).length);
        if (reason) return reason;
        let inventory = { ...g.inventory };
        for (const itemId of Object.values(spider.gear)) {
          if (itemId) inventory = addInv(inventory, itemId);
        }
        const spiders = g.spiders.filter((s) => s.id !== id);
        const pay = releaseCash(spider);
        set({
          cash: g.cash + pay,
          inventory,
          spiders,
          activeTeam: g.activeTeam.filter((slot) => slot !== id),
          selectedId: g.selectedId === id ? (spiders.find((s) => !s.retired)?.id ?? null) : g.selectedId,
          screen: g.selectedId === id ? "stable" : g.screen,
        });
        return null;
      },

      fitBay: (spiderId, jobId) => {
        const g = get();
        const spider = g.spiders.find((s) => s.id === spiderId);
        if (!spider) return "No spider";
        const job = bayJobOf(jobId);
        if (!job) return "No such kit";
        const blocked = canFit(job, spider, g.cash, g.rank);
        if (blocked) return blocked;
        const spiders = patchSpider(g.spiders, spiderId, () => applyJob(spider, job));
        const career = { ...g.career, bayJobs: (g.career.bayJobs ?? 0) + 1 };
        set({
          cash: g.cash - job.price,
          spiders,
          career,
          ...badgeProgress(g, { spiders, career, wins: g.wins, seen: g.seen }),
        });
        return null;
      },

      spliceDna: (hostId, donorId) => {
        const g = get();
        const host = g.spiders.find((s) => s.id === hostId);
        const donor = g.spiders.find((s) => s.id === donorId);
        if (!host || !donor) return "Pick two";
        const blocked = canSplice(host, donor, g.cash, g.rank);
        if (blocked) return blocked;
        const cost = spliceCost(g.rank);
        const result = splice(host, donor, mulberry32(seedFrom(host.id + donor.id + String(Date.now()))));
        const spiders = patchSpider(g.spiders, hostId, () => result.host);
        const career = { ...g.career, splices: (g.career.splices ?? 0) + 1 };
        set({
          cash: g.cash - cost,
          spiders,
          career,
          ...badgeProgress(g, { spiders, career, wins: g.wins, seen: g.seen }),
        });
        return result.fever ? "Graft fever. She'll sit a night." : null;
      },

      addHide: (name, src, maker) => {
        const g = get();
        const made = makeHide(name, src, g.hides, maker ?? g.stableName);
        if ("error" in made) return made.error;
        const hides = [...g.hides, made.hide];
        const career = { ...g.career, hides: (g.career.hides ?? 0) + 1 };
        set({
          hides,
          career,
          ...badgeProgress(g, { spiders: g.spiders, career, wins: g.wins, seen: g.seen }),
        });
        return null;
      },

      licenseMill: (mill) => {
        const g = get();
        const fee = millwrightFee(mill, g.stableName);
        if (fee > g.cash) return `Need $${fee}`;
        const made = makeHide(mill.name, mill.src, g.hides, mill.maker || g.stableName);
        if ("error" in made) return made.error;
        const split = splitPurse(fee);
        let spiders = g.spiders;
        const host = spiders.find((s) => s.id === g.selectedId && !s.retired) ?? spiders.find((s) => !s.retired);
        if (host && (Object.keys(mill.kits).length || fee > 0)) {
          let next = host;
          if (Object.keys(mill.kits).length) next = applyMillKits(next, mill.kits);
          if (fee > 0) next = drape(next, made.hide);
          spiders = patchSpider(spiders, host.id, () => next);
        }
        const licensed = fee > 0;
        const career = {
          ...g.career,
          hides: (g.career.hides ?? 0) + 1,
          millwrights: (g.career.millwrights ?? 0) + (licensed ? 1 : 0),
          houseCut: (g.career.houseCut ?? 0) + split.house,
          millPaid: (g.career.millPaid ?? 0) + split.maker,
        };
        set({
          cash: g.cash - fee,
          hides: [...g.hides, made.hide],
          spiders,
          career,
          ...badgeProgress(g, { spiders, career, wins: g.wins, seen: g.seen }),
        });
        return null;
      },

      importHide: (ticket) => {
        const mill = decodeAnyTicket(ticket);
        if ("error" in mill) return mill.error;
        return get().licenseMill(mill);
      },

      licenseStall: (id) => {
        const mill = stallMillOf(id);
        if (!mill) return "No such mill on the stall.";
        const g = get();
        const blocked = canLicenseStall(mill, g.cash, g.rank, g.hides, g.stableName);
        if (blocked) return blocked;
        return get().licenseMill(mill);
      },

      drapeHide: (spiderId, hideId) => {
        const g = get();
        const spider = g.spiders.find((s) => s.id === spiderId);
        const hide = g.hides.find((entry) => entry.id === hideId);
        if (!spider) return "No spider";
        const blocked = canDrape(spider, hide, g.cash, g.rank);
        if (blocked) return blocked;
        if (!hide) return "Pick a hide";
        const spiders = patchSpider(g.spiders, spiderId, () => drape(spider, hide));
        set({ cash: g.cash - HIDE_COST, spiders });
        return null;
      },

      stripHide: (spiderId) => {
        const g = get();
        const spider = g.spiders.find((s) => s.id === spiderId);
        if (!spider?.hideId) return "No hide on that mill";
        set({ spiders: patchSpider(g.spiders, spiderId, stripHide) });
        return null;
      },

      releaseHide: (hideId) => {
        const g = get();
        if (!g.hides.some((hide) => hide.id === hideId)) return "No such hide";
        set({
          hides: g.hides.filter((hide) => hide.id !== hideId),
          spiders: g.spiders.map((spider) => (spider.hideId === hideId ? stripHide(spider) : spider)),
        });
        return null;
      },

      applyResult: (out, finalSpider) => {
        const g = get();
        const practice = g.fight?.practice === true;
        const enemySpeciesId = g.fight?.enemy.speciesId;
        const seen = enemySpeciesId && SPECIES[enemySpeciesId] && !g.seen.includes(enemySpeciesId)
          ? [...g.seen, enemySpeciesId]
          : g.seen;
        if (seen !== g.seen && enemySpeciesId) {
          const species = SPECIES[enemySpeciesId]!;
          out.discovery = { species: species.common, web: species.web.name, ability: species.web.ability };
        }
        let cash = g.cash;
        let rankPoints = g.rankPoints;
        const rank = g.rank;
        let wins = g.wins;
        let losses = g.losses;
        let winStreak = g.winStreak;
        let inventory = { ...g.inventory };
        const seriesStage = g.fight?.seriesStage;
        const isSeries = seriesStage !== null && seriesStage !== undefined && g.yardSeries?.date === g.dayStamp;
        const priorRival = g.rivalRecords[out.rivalId] ?? { wins: 0, losses: 0, streak: 0 };
        const scoutedMoves = recordRivalMoves(priorRival.moves, out.rounds);
        const rivalRecord = practice
          ? { ...priorRival, moves: scoutedMoves }
          : out.won
          ? { ...priorRival, wins: priorRival.wins + 1, streak: priorRival.streak + 1, moves: scoutedMoves }
          : { ...priorRival, losses: priorRival.losses + 1, streak: 0, moves: scoutedMoves };
        if (!practice && out.won) {
          const sky = tonightSky();
          const stakes = fightStakes(g.rank, out.wager, g.fight?.headline === true, sky.purse);
          cash += stakes.purse;
          out.purse = stakes.purse;
          rankPoints += stakes.points;
          winStreak += 1;
          const heater = streakReward(winStreak);
          if (heater) {
            cash += heater.cash;
            rankPoints += heater.points;
            out.streakBonus = { cash: heater.cash, points: heater.points, label: heater.label };
          }
          if (stakes.headlineCash) out.headlineBonus = stakes.headlineCash;
          if (isSeries) {
            const bonusCash = SERIES_BONUS_CASH[seriesStage] ?? 0;
            const bonusPoints = SERIES_BONUS_POINTS[seriesStage] ?? 0;
            cash += bonusCash;
            rankPoints += bonusPoints;
            out.seriesBonus = bonusCash;
          }
          out.sky = sky.id;
          wins += 1;
          if (out.loot) inventory = addInv(inventory, out.loot);
          const trophy = firstWinTrophy(out.rivalId, inventory, g.spiders);
          if (trophy) {
            inventory = addInv(inventory, trophy);
            out.loot = trophy;
          }
        } else if (!practice) {
          losses += 1;
          winStreak = 0;
          rankPoints = Math.max(0, rankPoints - 6);
        }
        const originalSpider = g.spiders.find((spider) => spider.id === finalSpider.id) ?? finalSpider;
        const spider = practice ? originalSpider : applyXp(finalSpider, out.xp);
        const hpMax = filledHp(spider);
        let patched = { ...spider, hp: clamp(spider.hp, 0, hpMax) };
        let career = {
          ...g.career,
          bouts: g.career.bouts + (practice ? 0 : 1),
          stripped: g.career.stripped + (practice ? 0 : out.stripped.length),
        };
        if (!practice) {
          const broodTick = tickBrood(patched, mulberry32(seedFrom(patched.id + String(career.bouts))));
          patched = broodTick.spider;
          if (broodTick.hatched) {
            out.broodHatch = broodTick.hatched;
            career = { ...career, hatches: (career.hatches ?? 0) + 1 };
          }
        }
        const spiders = patchSpider(g.spiders, patched.id, () => patched);
        // Practice can reveal a web but must never change competitive score.
        // Any newly eligible Circuit mark is picked up by the next ranked result.
        const unlockedBadges = practice ? [] : newlyEarnedBadges(g.earnedBadges, { spiders, career, wins, seen });
        const badges = practice
          ? { earnedBadges: g.earnedBadges, rankPoints, rank }
          : badgeProgress({ ...g, rank, rankPoints }, { spiders, career, wins, seen });
        if (unlockedBadges.length) {
          out.badges = unlockedBadges.map((badge) => ({ name: badge.name, reward: badge.reward }));
        }
        if (!practice) out.points = badges.rankPoints - g.rankPoints;
        if (!practice && badges.rank > g.rank) {
          const promoted = RANKS[badges.rank];
          if (promoted) out.rankUp = { name: promoted.name, blurb: promoted.blurb };
        }
        const nextSeries = isSeries && out.won && g.yardSeries
          ? { ...g.yardSeries, stage: g.yardSeries.stage + 1 }
          : null;
        const seriesFinished = isSeries && (!out.won || !nextSeries || nextSeries.stage >= nextSeries.rivals.length);
        const clip = writeClip({
          date: g.dayStamp,
          fighter: patched.name,
          rival: out.rivalId,
          out: { ...out, sky: tonightSky().name },
        });
        set({
          cash,
          rank: badges.rank,
          rankPoints: badges.rankPoints,
          wins,
          losses,
          winStreak,
          inventory,
          spiders,
          fight: null,
          result: out,
          career,
          seen,
          dailyContract: !practice && out.won ? advanceContract(g.dailyContract, "win") : g.dailyContract,
          dailyWebChallenge: practice ? g.dailyWebChallenge : advanceWebChallenge(g.dailyWebChallenge ?? makeDailyWebChallenge(g.dayStamp, g.rank), out.rounds),
          weeklyCircuit: !practice && out.won ? advanceWeeklyCircuit(g.weeklyCircuit, "win") : g.weeklyCircuit,
          rivalRecords: { ...g.rivalRecords, [out.rivalId]: rivalRecord },
          earnedBadges: badges.earnedBadges,
          yardSeries: seriesFinished ? null : nextSeries,
          flags: seriesFinished ? { ...g.flags, yardSeries: g.dayStamp } : g.flags,
          tutorial: g.tutorial === 5 ? 6 : g.tutorial,
          paper: practice ? (g.paper ?? []) : pushPaper(g.paper ?? [], clip),
          fightArchive: pushFightArchive(g.fightArchive ?? [], archiveFight(g.dayStamp, patched.name, out)),
        });
      },

      clearResult: () => set({ result: null, screen: "yard" }),

      collectDaily: () => {
        const g = get();
        const today = todayStamp();
        if (g.flags.daily === today) return;
        const streak = nextDailyStreak(typeof g.flags.daily === "string" ? g.flags.daily : undefined, Number(g.flags.dailyStreak ?? 0), today);
        set({
          cash: g.cash + 12 + g.rank * 4 + dailyStreakBonus(streak),
          huntsLeft: HUNTS_PER_DAY,
          flags: { ...g.flags, daily: today, dailyStreak: String(streak) },
        });
      },

      setHuntBait: (itemId) => {
        if (itemId === null) {
          set({ huntBait: null });
          return null;
        }
        const item = ITEMS[itemId];
        if (!item || item.kind !== "bait") return "That's not hunt bait";
        if ((get().inventory[itemId] ?? 0) < 1) return "None in the crate";
        set({ huntBait: itemId });
        return null;
      },

      claimDailyContract: () => {
        const g = get();
        if (!canClaimContract(g.dailyContract)) return "Finish the card first";
        set({
          cash: g.cash + g.dailyContract.reward,
          dailyContract: { ...g.dailyContract, claimed: true },
        });
        return null;
      },

      startPractice: (playerId, rivalId = "tom") => get().prepareFight(rivalId, playerId, 0, true),

      claimDailyWebChallenge: () => {
        const g = get();
        if (!canClaimWebChallenge(g.dailyWebChallenge)) return "Land your web move first";
        const rankPoints = g.rankPoints + g.dailyWebChallenge.points;
        let rank = g.rank;
        while (rank < RANKS.length - 1 && rankPoints >= RANKS[rank + 1]!.points) rank += 1;
        set({
          cash: g.cash + g.dailyWebChallenge.reward,
          rank,
          rankPoints,
          dailyWebChallenge: { ...g.dailyWebChallenge, claimed: true },
        });
        return null;
      },

      claimWeeklyCircuit: () => {
        const g = get();
        if (!canClaimWeeklyCircuit(g.weeklyCircuit)) return "Finish the Circuit card first";
        const rankPoints = g.rankPoints + g.weeklyCircuit.points;
        let rank = g.rank;
        while (rank < RANKS.length - 1 && rankPoints >= RANKS[rank + 1]!.points) rank += 1;
        set({
          cash: g.cash + g.weeklyCircuit.reward,
          rank,
          rankPoints,
          weeklyCircuit: { ...g.weeklyCircuit, claimed: true },
        });
        return null;
      },

      setSetting: (k, v) => {
        const settings = { ...get().settings, [k]: v };
        set({ settings });
        if (k === "sfx") setSfxEnabled(v);
        if (k === "music") setMusicEnabled(v);
      },

      resetAll: () => set({ ...emptySave(), screen: "title", hydrated: true, fight: null, result: null }),

      rollYear: () => {
        const g = get();
        if (g.rank < 7) return "Hold the World Stick first";
        const career = { ...g.career, worldTitles: (g.career.worldTitles ?? 0) + 1 };
        const badges = badgeProgress({ ...g, rank: 5, rankPoints: 0 }, { spiders: g.spiders, career, wins: g.wins, seen: g.seen });
        set({
          season: g.season + 1,
          rank: badges.rank,
          rankPoints: badges.rankPoints,
          huntsLeft: HUNTS_PER_DAY,
          cash: g.cash + 80 + g.wins,
          career,
          earnedBadges: badges.earnedBadges,
        });
        return null;
      },

      spiderById: (id) => get().spiders.find((s) => s.id === id),
    }),
    {
      name: "spider-fight-v1",
      version: SAVE_VERSION,
      skipHydration: true,
      migrate: (persisted, from) => migrateSave(persisted, from),
      partialize: (s) => ({
        version: s.version,
        season: s.season,
        stableName: s.stableName,
        cash: s.cash,
        rank: s.rank,
        rankPoints: s.rankPoints,
        spiders: s.spiders,
        inventory: s.inventory,
        rosterCap: s.rosterCap,
        activeTeam: s.activeTeam,
        selectedId: s.selectedId,
        huntsLeft: s.huntsLeft,
        dayStamp: s.dayStamp,
        wins: s.wins,
        losses: s.losses,
        winStreak: s.winStreak,
        tutorial: s.tutorial,
        settings: s.settings,
        seen: s.seen,
        flags: s.flags,
        career: s.career,
        dailyContract: s.dailyContract,
        dailyWebChallenge: s.dailyWebChallenge,
        weeklyCircuit: s.weeklyCircuit,
        rivalRecords: s.rivalRecords,
        earnedBadges: s.earnedBadges,
        yardSeries: s.yardSeries,
        paper: s.paper,
        fightArchive: s.fightArchive,
        infestation: s.infestation,
        hides: s.hides,
      }),
    },
  ),
);

export function liveSpider(id: string | null): Spider | undefined {
  const g = useGame.getState();
  return g.spiders.find((s) => s.id === (id ?? g.selectedId ?? g.spiders[0]?.id));
}

export function formatCash(n: number): string {
  return `$${n}`;
}

export function rankName(r: number): string {
  return RANKS[r]?.name ?? "Alley";
}

export { xpToNext, maxHp, HABITATS, uid };
