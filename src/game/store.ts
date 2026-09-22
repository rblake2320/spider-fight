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
} from "./spiders";
import { unlockAudio, setMusicEnabled, setSfxEnabled } from "./audio";
import { isShipped } from "./catalog";
import { EMPTY_CAREER, migrateSave } from "./migrate";
import { advanceContract, canClaimContract, makeDailyContract } from "./contracts";
import { firstWinTrophy } from "./rewards";

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
});

type Session = {
  screen: Screen;
  hydrated: boolean;
  huntHabitat: string | null;
  pendingCatch: Spider | null;
  fight: {
    rivalId: string;
    playerId: string;
    wager: number;
    enemy: Spider;
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

export const useGame = create<Game>()(
  persist(
    (set, get) => ({
      ...emptySave(),
      screen: "title",
      hydrated: false,
      huntHabitat: null,
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
        set({
          cash: g.cash - cost,
          dailyContract: advanceContract(g.dailyContract, "train"),
          spiders: patchSpider(g.spiders, spiderId, (sp) => ({
            ...sp,
            trained: { ...sp.trained, [stat]: sp.trained[stat] + 1 },
            energy: sp.energy - 16,
            moltReady: clamp(sp.moltReady + 4, 0, 100),
            xp: sp.xp + 8,
          })),
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
        set({
          spiders: patchSpider(g.spiders, spiderId, () => next),
          career: { ...(g.career ?? EMPTY_CAREER), molts: (g.career?.molts ?? 0) + 1 },
        });
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
        set({
          cash: g.cash - hab.cost,
          huntsLeft: g.huntsLeft - 1,
          huntHabitat: habitatId,
          pendingCatch: null,
          screen: "hunt",
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
        const bait = (g.flags.bait === true ? 0.08 : 0) + quality * 0.5;
        if (rng.next() > 0.28 + bait) return null;
        const weights = { ...hab.weights };
        if (g.inventory["sugar-water"]) weights.uncommon = (weights.uncommon ?? 0) + 18;
        if (g.inventory.pheromone) weights.legendary = (weights.legendary ?? 0) + 16;
        const caught = rollSpider(rng, { habitat: hab, rank: g.rank });
        set({ pendingCatch: caught, seen: g.seen.includes(caught.speciesId) ? g.seen : [...g.seen, caught.speciesId] });
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

      leaveHunt: () => set({ huntHabitat: null, pendingCatch: null, screen: "hunt" }),

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
          fight: { rivalId, playerId, wager, enemy },
          result: null,
          screen: "fight",
          cash: g.cash - wager,
        });
        return null;
      },

      applyResult: (out, finalSpider) => {
        const g = get();
        let cash = g.cash;
        let rankPoints = g.rankPoints;
        let rank = g.rank;
        let wins = g.wins;
        let losses = g.losses;
        let inventory = { ...g.inventory };
        const priorRival = g.rivalRecords[out.rivalId] ?? { wins: 0, losses: 0, streak: 0 };
        const rivalRecord = out.won
          ? { ...priorRival, wins: priorRival.wins + 1, streak: priorRival.streak + 1 }
          : { ...priorRival, losses: priorRival.losses + 1, streak: 0 };
        if (out.won) {
          const prize = (RANKS[g.rank]?.purse ?? 18) + out.wager;
          cash += prize;
          out.purse = prize;
          rankPoints += 12 + Math.round(out.wager / 8);
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
        while (rank < RANKS.length - 1 && rankPoints >= RANKS[rank + 1]!.points) rank += 1;
        const spider = applyXp(finalSpider, out.xp);
        const hpMax = filledHp(spider);
        const patched = { ...spider, hp: clamp(spider.hp, 0, hpMax) };
        set({
          cash,
          rank,
          rankPoints,
          wins,
          losses,
          inventory,
          spiders: patchSpider(g.spiders, patched.id, () => patched),
          fight: null,
          result: out,
          career: {
            ...g.career,
            bouts: g.career.bouts + 1,
            stripped: g.career.stripped + out.stripped.length,
          },
          dailyContract: out.won ? advanceContract(g.dailyContract, "win") : g.dailyContract,
          rivalRecords: { ...g.rivalRecords, [out.rivalId]: rivalRecord },
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
