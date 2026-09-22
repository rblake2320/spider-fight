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
import {
  applyXp,
  applyRivalGrit,
  canFight,
  effective,
  filledHp,
  molt,
  rollSpider,
  starterSpider,
  teamSupport,
} from "./spiders";
import { unlockAudio, setMusicEnabled, setSfxEnabled } from "./audio";
import { isShipped } from "./catalog";
import { EMPTY_CAREER, migrateSave } from "./migrate";
import { advanceContract, canClaimContract, makeDailyContract } from "./contracts";
import { firstWinTrophy } from "./rewards";
import { applyBait } from "./bait";
import { badgeReward, newlyEarnedBadges } from "./badges";
import { nightlyReward, nightlyRival } from "./night-card";
import { SERIES_BONUS_CASH, SERIES_BONUS_POINTS, yardSeriesLineup } from "./series";
import { recordRivalMoves } from "./rival-intel";

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
  tutorial: 0,
  settings: { sfx: true, music: true, reduceMotion: false },
  seen: ["hentz"],
  flags: {},
  career: { ...EMPTY_CAREER },
  dailyContract: makeDailyContract(todayStamp(), 0),
  rivalRecords: {},
  earnedBadges: [],
  yardSeries: null,
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
    prepareFight: (rivalId: string, playerId: string, wager: number) => string | null;
    startYardSeries: (playerId: string) => string | null;
    continueYardSeries: () => string | null;
    applyResult: (out: FightOutcome, finalSpider: Spider) => void;
    clearResult: () => void;
    collectDaily: () => void;
    claimDailyContract: () => string | null;
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
        if (s.dayStamp !== todayStamp() || s.dailyContract.date !== todayStamp()) {
          set({
            huntsLeft: HUNTS_PER_DAY,
            dayStamp: todayStamp(),
            dailyContract: makeDailyContract(todayStamp(), s.rank),
            yardSeries: s.yardSeries?.date === todayStamp() ? s.yardSeries : null,
          });
        }
        if (!s.career) set({ career: { ...EMPTY_CAREER } });
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
        const cost = 10 + s.trained[stat] * 6;
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
        set({
          cash: g.cash - cost,
          dailyContract: advanceContract(g.dailyContract, "train"),
          tutorial: g.tutorial === 3 ? 4 : g.tutorial,
          spiders,
          ...badgeProgress(g, { spiders, career: g.career, wins: g.wins, seen: g.seen }),
        });
        return null;
      },

      restSpider: (spiderId) => {
        const g = get();
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
        const next = molt(s);
        if (!next) return s.moltReady < 70 ? "Not ready to molt" : "Already at the top";
        const g = get();
        const spiders = patchSpider(g.spiders, spiderId, () => next);
        const career = { ...(g.career ?? EMPTY_CAREER), molts: (g.career?.molts ?? 0) + 1 };
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
        if (!isShipped(hab)) return "Night Circuit isn't open yet";
        const g = get();
        if (g.rank < hab.rank) return "Rank locked";
        if (g.huntsLeft <= 0) return "That's all the light tonight";
        if (g.cash < hab.cost) return "Can't cover the trip";
        const lead = g.spiders.find((s) => s.id === g.selectedId) ?? g.spiders[0];
        if (lead && lead.energy < hab.energy) return "Your lead spider is spent";
        const inventory = g.huntBait ? takeInv(g.inventory, g.huntBait) : g.inventory;
        if (!inventory) return "That bait is gone";
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
          career: { ...g.career, hunts: g.career.hunts + 1 },
          dailyContract: advanceContract(g.dailyContract, "hunt"),
          spiders: lead
            ? patchSpider(g.spiders, lead.id, (s) => ({ ...s, energy: s.energy - hab.energy }))
            : g.spiders,
        });
        return null;
      },

      resolveHuntTap: (quality) => {
        const g = get();
        const hab = HABITATS.find((h) => h.id === g.huntHabitat);
        if (!hab) return null;
        const rng = mulberry32(seedFrom(g.stableName + String(Date.now())));
        const bait = applyBait(g.activeBait, hab.weights);
        if (rng.next() > 0.28 + quality * 0.5 + bait.chanceBonus) return null;
        const caught = rollSpider(rng, { habitat: { ...hab, weights: bait.weights }, rank: g.rank });
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
        if (g.spiders.length >= g.rosterCap) return "Stable is full";
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

      prepareFight: (rivalId, playerId, wager) => {
        const g = get();
        const player = g.spiders.find((s) => s.id === playerId);
        if (!player) return "Pick a fighter";
        const reason = canFight(player);
        if (reason) return reason;
        if (g.cash < wager) return "Can't cover the wager";
        const rival = RIVALS.find((r) => r.id === rivalId) ?? RIVALS[0]!;
        if (!isShipped(rival)) return "That crew isn't on this year's circuit";
        const fightRank = rival.always ? Math.max(g.rank, rival.rank) : rival.rank;
        const rng = mulberry32(seedFrom(rival.id + String(g.rank) + player.id.slice(0, 4)));
        const bias = rng.pick(rival.bias.filter((id) => SPECIES[id]) as string[]) || "hentz";
        const stage =
          fightRank < 1 ? "juvenile" : fightRank < 3 ? "adult" : fightRank < 5 ? "veteran" : "champion";
        const enemy = applyRivalGrit(rollSpider(rng, { speciesId: bias, rank: fightRank, stage, asRival: true }), rival.grit);
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
            enemy,
            teamBonus: teamSupport(player, g.spiders, g.activeTeam),
            headline: nightlyRival(g.dayStamp, g.rank).id === rivalId,
            seriesStage: null,
          },
          result: null,
          screen: "fight",
          cash: g.cash - wager,
          tutorial: g.tutorial === 4 ? 5 : g.tutorial,
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

      applyResult: (out, finalSpider) => {
        const g = get();
        let cash = g.cash;
        let rankPoints = g.rankPoints;
        const rank = g.rank;
        let wins = g.wins;
        let losses = g.losses;
        let inventory = { ...g.inventory };
        const headlineReward = nightlyReward(g.fight?.headline === true);
        const seriesStage = g.fight?.seriesStage;
        const isSeries = seriesStage !== null && seriesStage !== undefined && g.yardSeries?.date === g.dayStamp;
        const priorRival = g.rivalRecords[out.rivalId] ?? { wins: 0, losses: 0, streak: 0 };
        const scoutedMoves = recordRivalMoves(priorRival.moves, out.rounds);
        const rivalRecord = out.won
          ? { ...priorRival, wins: priorRival.wins + 1, streak: priorRival.streak + 1, moves: scoutedMoves }
          : { ...priorRival, losses: priorRival.losses + 1, streak: 0, moves: scoutedMoves };
        if (out.won) {
          const prize = (RANKS[g.rank]?.purse ?? 18) + out.wager + headlineReward.cash;
          cash += prize;
          out.purse = prize;
          rankPoints += 12 + Math.round(out.wager / 8) + headlineReward.points;
          if (headlineReward.cash) out.headlineBonus = headlineReward.cash;
          if (isSeries) {
            const bonusCash = SERIES_BONUS_CASH[seriesStage] ?? 0;
            const bonusPoints = SERIES_BONUS_POINTS[seriesStage] ?? 0;
            cash += bonusCash;
            rankPoints += bonusPoints;
            out.seriesBonus = bonusCash;
          }
          wins += 1;
          if (out.loot) inventory = addInv(inventory, out.loot);
          const trophy = firstWinTrophy(out.rivalId, inventory, g.spiders);
          if (trophy) {
            inventory = addInv(inventory, trophy);
            out.loot = trophy;
          }
        } else {
          losses += 1;
          rankPoints = Math.max(0, rankPoints - 6);
        }
        const spider = applyXp(finalSpider, out.xp);
        const hpMax = filledHp(spider);
        const patched = { ...spider, hp: clamp(spider.hp, 0, hpMax) };
        const spiders = patchSpider(g.spiders, patched.id, () => patched);
        const career = {
          ...g.career,
          bouts: g.career.bouts + 1,
          stripped: g.career.stripped + out.stripped.length,
        };
        const badges = badgeProgress(
          { ...g, rank, rankPoints },
          { spiders, career, wins, seen: g.seen },
        );
        const nextSeries = isSeries && out.won && g.yardSeries
          ? { ...g.yardSeries, stage: g.yardSeries.stage + 1 }
          : null;
        const seriesFinished = isSeries && (!out.won || !nextSeries || nextSeries.stage >= nextSeries.rivals.length);
        set({
          cash,
          rank: badges.rank,
          rankPoints: badges.rankPoints,
          wins,
          losses,
          inventory,
          spiders,
          fight: null,
          result: out,
          career,
          dailyContract: out.won ? advanceContract(g.dailyContract, "win") : g.dailyContract,
          rivalRecords: { ...g.rivalRecords, [out.rivalId]: rivalRecord },
          earnedBadges: badges.earnedBadges,
          yardSeries: seriesFinished ? null : nextSeries,
          flags: seriesFinished ? { ...g.flags, yardSeries: g.dayStamp } : g.flags,
          tutorial: g.tutorial === 5 ? 6 : g.tutorial,
        });
      },

      clearResult: () => set({ result: null, screen: "yard" }),

      collectDaily: () => {
        const g = get();
        if (g.flags.daily === todayStamp()) return;
        set({
          cash: g.cash + 12 + g.rank * 4,
          huntsLeft: HUNTS_PER_DAY,
          flags: { ...g.flags, daily: todayStamp() },
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
        set({
          season: g.season + 1,
          rank: 5,
          rankPoints: 0,
          huntsLeft: HUNTS_PER_DAY,
          cash: g.cash + 80 + g.wins,
          career: { ...g.career },
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
        tutorial: s.tutorial,
        settings: s.settings,
        seen: s.seen,
        flags: s.flags,
        career: s.career,
        dailyContract: s.dailyContract,
        rivalRecords: s.rivalRecords,
        earnedBadges: s.earnedBadges,
        yardSeries: s.yardSeries,
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
