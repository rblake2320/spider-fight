import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ITEMS, ITEM_LIST, MOVES, RANKS, RIVALS, SLOT_LABEL, SPECIES, SPECIES_LIST, xpToNext } from "@/game/content";
import { BUILD, careerSeasonId, SEASONS, SHIPPED_SEASON, isShipped, seasonName } from "@/game/catalog";
import { BADGES, FIELD_GUIDE_MILESTONES } from "@/game/badges";
import { webSurgeHint } from "@/game/combat";
import { circuitDay, listCircuitBoard, listDailyCircuitBoard, postCircuitScore, postDailyCircuitScore, type CircuitEntry, type CircuitPlacement } from "@/lib/circuit-board";
import { useGame, formatCash, rankName } from "@/game/store";
import { tonightSky } from "@/game/sky";
import { canClutch, clutchCost } from "@/game/clutch";
import { BAY_JOBS, BAY_SLOTS, bayJobOf, bayKitLine, canFit, canSplice, graftsOf, spliceCost } from "@/game/bay";
import { canFight, canMolt, effective, moltLine, portraitOf, recoveryRests, spiderScore, STAGE_LABEL, STAT_LABEL, trainingLook, trainingTotal } from "@/game/spiders";
import { traitBlurb, traitTrainCost } from "@/game/traits";
import { activeSpiders, canRelease, canRetire, rafterSpiders, releaseCash } from "@/game/rafters";
import type { BaySlot, GearSlot, ItemKind, Stats } from "@/game/types";
import { jevStatus } from "@/lib/jev";
import { cn } from "@/lib/utils";
import { heldRivalTrophies, RIVAL_TROPHIES } from "@/game/rewards";
import { DAILY_STREAK_CAP, dailyStreakBonus } from "@/game/daily-streak";
import { archiveShareText } from "@/game/share";
import { shareMatchCard } from "@/game/share-client";
import { SpiderBuildCanvas } from "./SpiderBuildCanvas";

const CompetitionSignIn = lazy(() => import("./CompetitionSignIn").then((module) => ({ default: module.CompetitionSignIn })));

export function Yard() {
  const name = useGame((s) => s.stableName);
  const cash = useGame((s) => s.cash);
  const rank = useGame((s) => s.rank);
  const points = useGame((s) => s.rankPoints);
  const spiders = useGame((s) => s.spiders);
  const wins = useGame((s) => s.wins);
  const losses = useGame((s) => s.losses);
  const setScreen = useGame((s) => s.setScreen);
  const collect = useGame((s) => s.collectDaily);
  const contract = useGame((s) => s.dailyContract);
  const claimContract = useGame((s) => s.claimDailyContract);
  const webChallenge = useGame((s) => s.dailyWebChallenge);
  const claimWebChallenge = useGame((s) => s.claimDailyWebChallenge);
  const weeklyCircuit = useGame((s) => s.weeklyCircuit);
  const claimWeeklyCircuit = useGame((s) => s.claimWeeklyCircuit);
  const flags = useGame((s) => s.flags);
  const tutorial = useGame((s) => s.tutorial);
  const paper = useGame((s) => s.paper);
  const lead = spiders.find((s) => !s.retired) ?? spiders[0];
  const next = RANKS[rank + 1];
  const firstNight = FIRST_NIGHT[tutorial];
  const sky = tonightSky();
  const streak = Math.max(0, Number(flags.dailyStreak ?? 0));
  const nextStreak = Math.min(DAILY_STREAK_CAP, Math.max(1, streak + 1));
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-auto">
      <div className="relative h-52 shrink-0">
        <img src="/images/bg/garden.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="relative z-10 flex h-full flex-col justify-end p-4">
          <p className="text-xs uppercase tracking-widest text-dust">{rankName(rank)} circuit · {sky.name}</p>
          <h1 className="font-display text-4xl font-semibold leading-tight">{name}</h1>
          <p className="tabular text-sm text-paper/80">
            {formatCash(cash)} · {wins}–{losses}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4 pb-24">
        {lead ? (
          <button
            type="button"
            onClick={() => useGame.getState().selectSpider(lead.id)}
            className="flex items-center gap-3 rounded-xl bg-raised p-3 text-left"
          >
            <img src={portraitOf(lead)} alt="" className="size-20 rounded-lg object-cover" />
            <div>
              <p className="font-display text-2xl">{lead.name}</p>
              <p className="text-xs text-dust">
                {SPECIES[lead.speciesId]?.common} · {STAGE_LABEL[lead.stage]}
              </p>
              <p className="text-xs text-mute">{canFight(lead) ?? `${lead.wins} wins on the stick`}</p>
            </div>
          </button>
        ) : null}
        {next ? (
          <p className="text-xs text-dust">
            {points}/{next.points} to {next.name}
          </p>
        ) : (
          <p className="text-xs text-dust">World Stick. Hold it.</p>
        )}
        <section className="rounded-xl bg-raised p-3">
          <p className="text-xs uppercase tracking-widest text-dust">Tonight’s sky</p>
          <p className="mt-1 font-display text-2xl">{sky.name}</p>
          <p className="text-sm text-mute">{sky.blurb}</p>
        </section>
        {paper?.length ? (
          <section className="rounded-xl border border-line bg-raised p-3">
            <p className="text-xs uppercase tracking-widest text-dust">Stick paper</p>
            <ul className="mt-2 space-y-1">
              {paper.slice(0, 4).map((clip, index) => (
                <li key={`${clip.date}-${clip.headline}-${index}`} className="text-sm">
                  <span className={clip.won ? "text-paper" : "text-dust"}>{clip.headline}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Action label="Hunt" onClick={() => setScreen("hunt")} />
          <Action label="Fight" onClick={() => setScreen("fight")} />
          <Action label="Train" onClick={() => setScreen("train")} />
          <Action label="Shop" onClick={() => setScreen("shop")} />
          <Action label="Bay" onClick={() => setScreen("bay")} />
          <Action label="Team" onClick={() => setScreen("team")} />
          <Action label="Circuit" onClick={() => setScreen("career")} />
        </div>
        {firstNight ? (
          <section className="rounded-xl border border-moss/50 bg-raised p-3">
            <p className="text-xs uppercase tracking-widest text-moss">First night · {firstNight.step}/4</p>
            <p className="mt-1 font-medium">{firstNight.title}</p>
            <p className="mt-1 text-xs text-dust">{firstNight.detail}</p>
            {firstNight.screen ? (
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setScreen(firstNight.screen!)}>
                {firstNight.action}
              </Button>
            ) : null}
          </section>
        ) : null}
        <section className="rounded-xl border border-rust/50 bg-raised p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs uppercase tracking-widest text-rust">Tonight's bounty</p>
            <p className="tabular text-xs text-moss">${contract.reward}</p>
          </div>
          <p className="mt-1 font-medium">{contract.title}</p>
          <p className="mt-1 text-xs text-dust">{contract.detail}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="tabular text-sm text-paper">
              {Math.min(contract.progress, contract.target)}/{contract.target}
              {contract.claimed ? " · collected" : ""}
            </p>
            {contract.claimed ? null : (
              <Button size="sm" variant="rust" disabled={contract.progress < contract.target} onClick={() => claimContract()}>
                Collect
              </Button>
            )}
          </div>
        </section>
        <section className="rounded-xl border border-moss/50 bg-raised p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs uppercase tracking-widest text-moss">Daily web challenge</p>
            <p className="tabular text-xs text-moss">${webChallenge.reward} · +{webChallenge.points} pts</p>
          </div>
          <p className="mt-1 font-medium">
            {lead ? `${SPECIES[lead.speciesId]?.web.name} showcase` : "Land a web showcase"}
          </p>
          <p className="mt-1 text-xs text-dust">
            {lead
              ? `Read two tells, then win with ${MOVES[SPECIES[lead.speciesId]?.web.move ?? "lunge"].name} to spend its charged web. Different species pay off in different ways.`
              : "Keep a spider, build two reads, then spend its charged species web."}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="tabular text-sm text-paper">
              {webChallenge.progress}/{webChallenge.target}
              {webChallenge.claimed ? " · collected" : ""}
            </p>
            {webChallenge.claimed ? null : (
              <Button size="sm" variant="outline" disabled={webChallenge.progress < webChallenge.target} onClick={() => claimWebChallenge()}>
                Collect web mark
              </Button>
            )}
          </div>
        </section>
        <section className="rounded-xl border border-paper/35 bg-panel p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs uppercase tracking-widest text-paper">Weekly Circuit</p>
            <p className="tabular text-xs text-moss">${weeklyCircuit.reward} · +{weeklyCircuit.points} pts</p>
          </div>
          <p className="mt-1 font-medium">{weeklyCircuit.title}</p>
          <p className="mt-1 text-xs text-dust">{weeklyCircuit.detail}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <p className="rounded bg-raised px-1 py-2 text-paper"><span className="block text-dust">Hunts</span>{weeklyCircuit.hunts}/{weeklyCircuit.huntTarget}</p>
            <p className="rounded bg-raised px-1 py-2 text-paper"><span className="block text-dust">Drills</span>{weeklyCircuit.trains}/{weeklyCircuit.trainTarget}</p>
            <p className="rounded bg-raised px-1 py-2 text-paper"><span className="block text-dust">Wins</span>{weeklyCircuit.wins}/{weeklyCircuit.winTarget}</p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-dust">Week of {weeklyCircuit.week}</p>
            {weeklyCircuit.claimed ? <p className="text-xs text-moss">Collected</p> : (
              <Button size="sm" variant="outline" disabled={weeklyCircuit.hunts < weeklyCircuit.huntTarget || weeklyCircuit.trains < weeklyCircuit.trainTarget || weeklyCircuit.wins < weeklyCircuit.winTarget} onClick={() => claimWeeklyCircuit()}>
                Collect Circuit purse
              </Button>
            )}
          </div>
        </section>
        <Button variant="outline" onClick={collect} disabled={flags.daily === todayHint()}>
          {flags.daily === todayHint() ? "Morning purse collected" : "Collect morning purse"}
        </Button>
        <p className="text-center text-xs text-moss">Morning streak {streak}/{DAILY_STREAK_CAP} · next purse +${dailyStreakBonus(nextStreak)}</p>
      </div>
    </div>
  );
}

const FIRST_NIGHT: Partial<Record<number, { step: number; title: string; detail: string; action: string; screen?: "hunt" | "train" | "fight" }>> = {
  1: {
    step: 1,
    title: "Walk the Night Porch",
    detail: "Take one free hunt. Every species carries its own web and signature move.",
    action: "Go hunting",
    screen: "hunt",
  },
  3: {
    step: 2,
    title: "Put in a drill",
    detail: "Training changes your spider's body and lifts its yard score.",
    action: "Open training",
    screen: "train",
  },
  4: {
    step: 3,
    title: "Call the first fight",
    detail: "Watch the rival's style, use your web move, and keep the rounds timed.",
    action: "Find a rival",
    screen: "fight",
  },
};

function todayHint(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-14 rounded-xl bg-panel font-display text-xl hover:bg-line">
      {label}
    </button>
  );
}

export function Stable() {
  const spiders = useGame((s) => s.spiders);
  const cap = useGame((s) => s.rosterCap);
  const select = useGame((s) => s.selectSpider);
  const team = useGame((s) => s.activeTeam);
  const active = activeSpiders(spiders);
  const hung = rafterSpiders(spiders);
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Stable</p>
        <h2 className="font-display text-3xl font-semibold">
          Roster {active.length}/{cap}
        </h2>
        {hung.length ? <p className="text-xs text-moss">{hung.length} hung in the rafters</p> : null}
      </header>
      <div className="grid grid-cols-2 gap-2">
        {active.map((s) => (
          <button key={s.id} type="button" onClick={() => select(s.id)} className="overflow-hidden rounded-xl bg-raised text-left">
            <img src={portraitOf(s)} alt="" className="h-28 w-full object-cover" />
            <div className="p-2">
              <p className="truncate font-medium">{s.name}</p>
              <p className="truncate text-[11px] text-dust">
                {SPECIES[s.speciesId]?.common}
                {team.includes(s.id) ? " · team" : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
      {hung.length ? (
        <section>
          <p className="mb-2 text-xs uppercase tracking-widest text-dust">Rafters</p>
          <div className="grid grid-cols-2 gap-2">
            {hung.map((s) => (
              <button key={s.id} type="button" onClick={() => select(s.id)} className="overflow-hidden rounded-xl border border-line bg-panel text-left">
                <img src={portraitOf(s)} alt="" className="h-20 w-full object-cover opacity-80" />
                <div className="p-2">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate text-[11px] text-moss">{s.line ?? "Watching the yard"}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {spiders.length === 0 ? <p className="text-dust">The crates are empty. Hunt the porch.</p> : null}
    </div>
  );
}

export function SpiderDetail() {
  const id = useGame((s) => s.selectedId);
  const spider = useGame((s) => s.spiders.find((x) => x.id === id));
  const spiders = useGame((s) => s.spiders);
  const cap = useGame((s) => s.rosterCap);
  const rank = useGame((s) => s.rank);
  const cash = useGame((s) => s.cash);
  const setClutch = useGame((s) => s.setClutch);
  const retireSpider = useGame((s) => s.retireSpider);
  const releaseSpider = useGame((s) => s.releaseSpider);
  const setScreen = useGame((s) => s.setScreen);
  const rename = useGame((s) => s.renameSpider);
  const unequip = useGame((s) => s.unequip);
  const setTeam = useGame((s) => s.setTeamSlot);
  const team = useGame((s) => s.activeTeam);
  const [mateId, setMateId] = useState<string | null>(null);
  const [clutchMsg, setClutchMsg] = useState<string | null>(null);
  const [yardMsg, setYardMsg] = useState<string | null>(null);
  if (!spider) {
    return (
      <div className="p-6">
        <Button onClick={() => setScreen("stable")}>Back to roster</Button>
      </div>
    );
  }
  const e = effective(spider);
  const spec = SPECIES[spider.speciesId];
  const build = trainingLook(spider);
  return (
    <div className="flex h-full flex-col overflow-auto pb-24">
      <div className="relative h-64">
        <img src={portraitOf(spider)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30" />
        <button type="button" onClick={() => setScreen("stable")} className="absolute left-3 top-3 rounded-md bg-ink/70 px-3 py-1 text-sm">
          Back
        </button>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <input
          defaultValue={spider.name}
          maxLength={18}
          onBlur={(ev) => rename(spider.id, ev.target.value)}
          className="bg-transparent font-display text-4xl font-semibold outline-none"
        />
        <p className="text-sm text-dust">
          {spec?.common} · {spec?.latin} · {STAGE_LABEL[spider.stage]} lv {spider.level}
        </p>
        <p className="text-sm text-mute">{spec?.blurb}</p>
        {spider.retired ? <p className="text-sm text-moss">Hung in the rafters. Breeding stock. She watches the yard.</p> : null}
        <ul className="space-y-1">
          {spider.traits.map((trait) => (
            <li key={trait} className="text-xs">
              <span className="text-paper">{trait}</span>
              {traitBlurb(trait) ? <span className="text-dust"> · {traitBlurb(trait)}</span> : null}
            </li>
          ))}
        </ul>
        <p className="text-xs text-dust">
          {spider.origin} · {spider.wins}–{spider.losses}
          {spider.lastMolt ? ` · last molt ${spider.lastMolt}` : ""}
        </p>
        {spider.bredFrom ? <p className="text-xs text-moss">Out of {spider.bredFrom}{spider.line ? ` · ${spider.line}` : ""}</p> : spider.line ? <p className="text-xs text-moss">{spider.line}</p> : null}
        {spider.injury ? <p className="text-sm text-rust">{spider.injury.label}</p> : null}
        {spec ? (
          <section className="rounded-xl border border-moss/40 bg-moss/10 p-3">
            <p className="text-xs uppercase tracking-widest text-moss">Web kit</p>
            <p className="mt-1 font-medium">{spec.web.name} · {spec.web.style} web</p>
            <p className="mt-1 text-xs text-dust">Signature: {MOVES[spec.web.move].name} · {spec.web.ability}</p>
            <p className="mt-1 text-xs text-paper">At two web charge: {webSurgeHint(spec.web)}.</p>
          </section>
        ) : null}
        <section className="rounded-xl border border-rust/40 bg-raised p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs uppercase tracking-widest text-rust">Yard build</p>
            <p className="text-xs text-moss">{trainingTotal(spider)} drills</p>
          </div>
          <p className="mt-1 font-medium">{build.title}</p>
          <p className="mt-1 text-xs text-dust">{build.detail}</p>
          <p className="mt-1 text-xs text-moss">{bayKitLine(spider)}</p>
          <div className="mt-3"><SpiderBuildCanvas spider={spider} /></div>
        </section>
        <XpBar level={spider.level} xp={spider.xp} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {(Object.keys(STAT_LABEL) as Array<keyof Stats>).map((k) => (
            <StatLine key={k} label={STAT_LABEL[k]} value={e[k]} trained={spider.trained[k]} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SLOT_LABEL) as GearSlot[]).map((slot) => {
            const gid = spider.gear[slot];
            return (
              <button key={slot} type="button" onClick={() => gid && unequip(spider.id, slot)} className="rounded-lg border border-line bg-raised p-2 text-left">
                <p className="text-[10px] uppercase tracking-wide text-dust">{SLOT_LABEL[slot]}</p>
                <p className="text-sm">{gid ? ITEMS[gid]?.name : "Empty"}</p>
              </button>
            );
          })}
        </div>
        {spider.retired ? null : (
          <>
            <Button variant="outline" onClick={() => setScreen("train")}>
              Train
            </Button>
            <Button variant="outline" onClick={() => setScreen("bay")}>
              Open the bay
            </Button>
            <Button
              variant={team.includes(spider.id) ? "outline" : "primary"}
              onClick={() => {
                if (team.includes(spider.id)) setTeam(team.indexOf(spider.id), null);
                else setTeam(Math.min(team.length, 2), spider.id);
              }}
            >
              {team.includes(spider.id) ? "Remove from traveling team" : "Put on traveling team"}
            </Button>
          </>
        )}
        {spiders.length > 1 ? (
        <section className="rounded-xl border border-line bg-raised p-3">
          <p className="text-xs uppercase tracking-widest text-dust">Set a clutch</p>
          <p className="mt-1 text-xs text-mute">
            Two adults, a hen on the line, ${clutchCost(rank)}. The nymph keeps a yard name.
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {spiders
              .filter((s) => s.id !== spider.id)
              .map((s) => (
                <button key={s.id} type="button" onClick={() => setMateId(s.id)} className="shrink-0">
                  <img
                    src={portraitOf(s)}
                    alt=""
                    className={cn("size-12 rounded-lg object-cover", mateId === s.id && "ring-2 ring-paper")}
                  />
                </button>
              ))}
          </div>
          <Button
            className="mt-3 w-full"
            variant="outline"
            disabled={!mateId || cash < clutchCost(rank)}
            onClick={() => {
              if (!mateId) return;
              const mate = spiders.find((s) => s.id === mateId);
              const blocked = mate ? canClutch(spider, mate, activeSpiders(spiders).length, cap) : "Pick a mate";
              setClutchMsg(blocked ?? setClutch(spider.id, mateId) ?? `Clutch set. ${clutchCost(rank)} gone.`);
            }}
          >
            Set clutch · ${clutchCost(rank)}
          </Button>
          {clutchMsg ? <p className="mt-2 text-xs text-paper">{clutchMsg}</p> : null}
        </section>
        ) : (
          <p className="text-xs text-dust">Catch a second adult before you set a clutch in the yard.</p>
        )}
        {spider.retired ? null : (
          <section className="rounded-xl border border-line bg-raised p-3">
            <p className="text-xs uppercase tracking-widest text-dust">Yard decisions</p>
            <p className="mt-1 text-xs text-mute">
              Hang a veteran in the rafters and she still throws a clutch. Let one go and the wraps come home.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                disabled={Boolean(canRetire(spider, activeSpiders(spiders).length))}
                onClick={() => setYardMsg(retireSpider(spider.id) ?? `${spider.name} hangs in the rafters.`)}
              >
                Hang in rafters
              </Button>
              <Button
                className="flex-1"
                variant="ghost"
                disabled={Boolean(canRelease(spider, activeSpiders(spiders).length))}
                onClick={() => setYardMsg(releaseSpider(spider.id) ?? `Let go. +$${releaseCash(spider)}`)}
              >
                Let go · ${releaseCash(spider)}
              </Button>
            </div>
            {canRetire(spider, activeSpiders(spiders).length) ? (
              <p className="mt-2 text-xs text-dust">{canRetire(spider, activeSpiders(spiders).length)}</p>
            ) : null}
            {yardMsg ? <p className="mt-2 text-xs text-paper">{yardMsg}</p> : null}
          </section>
        )}
        {spider.retired ? (
          <Button
            variant="ghost"
            onClick={() => setYardMsg(releaseSpider(spider.id) ?? `Taken down. +$${releaseCash(spider)}`)}
          >
            Take down · ${releaseCash(spider)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function XpBar({ level, xp }: { level: number; xp: number }) {
  const need = xpToNext(level);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-dust">
        <span>Level {level}</span>
        <span className="tabular">
          {xp}/{need}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-stick" style={{ width: `${Math.min(100, (xp / need) * 100)}%` }} />
      </div>
    </div>
  );
}

function StatLine({ label, value, trained }: { label: string; value: number; trained: number }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-dust">{label}</span>
      <span className="tabular">
        {value}
        {trained > 0 ? <span className="text-moss"> +{trained}</span> : null}
      </span>
    </div>
  );
}

export function TrainView() {
  const spiders = useGame((s) => s.spiders);
  const selectedId = useGame((s) => s.selectedId);
  const select = useGame((s) => s.selectSpider);
  const train = useGame((s) => s.train);
  const rest = useGame((s) => s.restSpider);
  const tryMolt = useGame((s) => s.tryMolt);
  const cash = useGame((s) => s.cash);
  const live = activeSpiders(spiders);
  const s = live.find((x) => x.id === selectedId) ?? live[0];
  const [msg, setMsg] = useState<string | null>(null);
  if (!s) return <p className="p-6 text-dust">Catch someone first.</p>;
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Train</p>
        <h2 className="font-display text-3xl font-semibold">{s.name}</h2>
        <p className="text-sm text-dust">
          Energy {s.energy} · molt {s.moltReady}/100 · {formatCash(cash)}
        </p>
        {recoveryRests(s) ? <p className="mt-1 text-xs text-rust">{s.injury?.label} · {recoveryRests(s)} rest{recoveryRests(s) === 1 ? "" : "s"} to clear</p> : null}
      </header>
      <div className="flex gap-2 overflow-x-auto">
        {live.map((sp) => (
          <button key={sp.id} type="button" onClick={() => select(sp.id)} className="shrink-0">
            <img src={portraitOf(sp)} alt="" className={cn("size-14 rounded-lg object-cover", sp.id === s.id && "ring-2 ring-paper")} />
          </button>
        ))}
      </div>
      {(Object.keys(STAT_LABEL) as Array<keyof Stats>).map((k) => {
        const cost = traitTrainCost(s.traits, 10 + s.trained[k] * 6);
        return (
          <button
            key={k}
            type="button"
            onClick={() => setMsg(train(s.id, k) ?? `Drilled ${STAT_LABEL[k]}`)}
            className="flex items-center justify-between rounded-xl bg-raised px-3 py-3"
          >
            <span>
              {STAT_LABEL[k]}
              <span className="ml-2 text-dust">trained {s.trained[k]}</span>
            </span>
            <span className="tabular text-sm text-dust">${cost}</span>
          </button>
        );
      })}
      <div className="flex gap-2">
        <Button className="flex-1" variant="outline" onClick={() => setMsg(rest(s.id) ?? "Rested")}>
          Rest $6{recoveryRests(s) ? ` · ${recoveryRests(s)} left` : ""}
        </Button>
        <Button
          className="flex-1"
          variant="rust"
          onClick={() => {
            const err = tryMolt(s.id);
            if (err) {
              setMsg(err);
              return;
            }
            const next = useGame.getState().spiders.find((x) => x.id === s.id);
            setMsg(moltLine(s.name, next?.lastMolt ?? "clean"));
          }}
        >
          Molt
        </Button>
      </div>
      <p className="text-sm text-mute">
        A loss strips gear and peels training. Drills put it back. A molt can come out glass-clean — or split.
      </p>
      {msg ? <p className="text-sm text-paper">{msg}</p> : null}
      {canMolt(s) === "Not ready to molt" ? <p className="text-xs text-dust">Feed and fight until the molt bar fills.</p> : null}
    </div>
  );
}

export function BayView() {
  const spiders = useGame((s) => s.spiders);
  const selectedId = useGame((s) => s.selectedId);
  const select = useGame((s) => s.selectSpider);
  const cash = useGame((s) => s.cash);
  const rank = useGame((s) => s.rank);
  const fitBay = useGame((s) => s.fitBay);
  const spliceDna = useGame((s) => s.spliceDna);
  const live = activeSpiders(spiders);
  const host = live.find((s) => s.id === selectedId) ?? live[0];
  const donors = spiders.filter((s) => s.id !== host?.id);
  const [slot, setSlot] = useState<BaySlot>("legs");
  const [donorId, setDonorId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!host) return <p className="p-6 text-dust">Catch someone first.</p>;
  const jobs = BAY_JOBS.filter((job) => job.slot === slot);
  const fitted = graftsOf(host);
  const donor = donors.find((s) => s.id === donorId);
  const splicePrice = spliceCost(rank);
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">The bay</p>
        <h2 className="font-display text-3xl font-semibold">Chassis work</h2>
        <p className="text-sm text-dust">
          Gear walks off a loss. This stays bolted — until the stick cracks it. {formatCash(cash)}
        </p>
      </header>
      <div className="flex gap-2 overflow-x-auto">
        {live.map((sp) => (
          <button key={sp.id} type="button" onClick={() => select(sp.id)} className="shrink-0">
            <img src={portraitOf(sp)} alt="" className={cn("size-14 rounded-lg object-cover", sp.id === host.id && "ring-2 ring-paper")} />
          </button>
        ))}
      </div>
      <p className="font-display text-2xl">{host.name}</p>
      <p className="text-xs text-moss">{bayKitLine(host)}</p>
      <SpiderBuildCanvas spider={host} />
      <div className="grid grid-cols-2 gap-2">
        {BAY_SLOTS.map((entry) => {
          const current = bayJobOf(fitted[entry.id]);
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSlot(entry.id)}
              className={cn("rounded-xl border p-3 text-left", slot === entry.id ? "border-paper bg-panel" : "border-line bg-raised")}
            >
              <p className="text-[10px] uppercase tracking-wide text-dust">{entry.label}</p>
              <p className="text-sm">{current?.name ?? "Stock"}</p>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-mute">{BAY_SLOTS.find((entry) => entry.id === slot)?.blurb}</p>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => {
          const blocked = canFit(job, host, cash, rank);
          const current = fitted[job.slot] === job.id;
          return (
            <div key={job.id} className="rounded-xl border border-line bg-raised p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{job.name}</p>
                <p className="tabular text-sm text-dust">${job.price}</p>
              </div>
              <p className="mt-1 text-xs text-mute">{job.blurb}</p>
              <p className="mt-1 text-[11px] text-dust">
                {current ? "Running this kit" : blocked ?? `${job.energy} energy · ${RANKS[job.rank]?.name ?? "Alley"}`}
              </p>
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                disabled={Boolean(blocked)}
                onClick={() => setMsg(fitBay(host.id, job.id) ?? `Bolted ${job.name}.`)}
              >
                Bolt on
              </Button>
            </div>
          );
        })}
      </div>
      <section className="rounded-xl border border-rust/40 bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-rust">DNA splice</p>
        <p className="mt-1 text-xs text-mute">
          District and up. Copy a donor trait onto the mill. Hung rafters still count as stock. ${splicePrice}.
        </p>
        {donors.length ? (
          <>
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {donors.map((s) => (
                <button key={s.id} type="button" onClick={() => setDonorId(s.id)} className="shrink-0">
                  <img
                    src={portraitOf(s)}
                    alt=""
                    className={cn("size-12 rounded-lg object-cover", donorId === s.id && "ring-2 ring-paper")}
                  />
                </button>
              ))}
            </div>
            <Button
              className="mt-3 w-full"
              variant="outline"
              disabled={!donor || Boolean(canSplice(host, donor, cash, rank))}
              onClick={() => {
                if (!donorId) return;
                setMsg(spliceDna(host.id, donorId) ?? `Spliced ${donor?.name ?? "stock"} into ${host.name}.`);
              }}
            >
              Splice · ${splicePrice}
            </Button>
            {donor && canSplice(host, donor, cash, rank) ? (
              <p className="mt-2 text-xs text-dust">{canSplice(host, donor, cash, rank)}</p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-xs text-dust">Catch a second spider before you mix blood.</p>
        )}
      </section>
      {msg ? <p className="text-sm text-paper">{msg}</p> : null}
    </div>
  );
}

export function ShopView() {
  const cash = useGame((s) => s.cash);
  const rank = useGame((s) => s.rank);
  const inv = useGame((s) => s.inventory);
  const buy = useGame((s) => s.buy);
  const selectedId = useGame((s) => s.selectedId);
  const equip = useGame((s) => s.equip);
  const feed = useGame((s) => s.feed);
  const tonic = useGame((s) => s.useTonic);
  const setHuntBait = useGame((s) => s.setHuntBait);
  const [tab, setTab] = useState<ItemKind | "gear">("gear");
  const [msg, setMsg] = useState<string | null>(null);
  const kinds: Array<ItemKind | "gear"> = ["gear", "feed", "tonic", "bait", "upgrade"];
  const list = useMemo(() => {
    const live = ITEM_LIST.filter((item) => isShipped(item) && (!item.rewardOnly || (inv[item.id] ?? 0) > 0));
    if (tab === "gear") return live.filter((i) => i.slot);
    return live.filter((i) => i.kind === tab);
  }, [tab, inv]);
  return (
    <div className="flex h-full flex-col overflow-auto p-4 pb-24">
      <header className="mb-3">
        <p className="text-xs uppercase tracking-widest text-dust">Shop</p>
        <h2 className="font-display text-3xl font-semibold">The crate</h2>
        <p className="tabular text-sm text-dust">{formatCash(cash)}</p>
        <button type="button" onClick={() => useGame.getState().setScreen("bay")} className="mt-2 min-h-11 text-sm text-moss">
          Open the bay for chassis work
        </button>
      </header>
      <div className="mb-3 flex gap-1 overflow-x-auto">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn("h-9 shrink-0 rounded-full px-3 text-sm capitalize", tab === k ? "bg-paper text-ink" : "bg-raised text-dust")}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {list.map((item) => {
          const locked = rank < item.rank;
          const have = inv[item.id] ?? 0;
          return (
            <div key={item.id} className="rounded-xl border border-line bg-raised p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{item.name}</p>
                <p className="tabular text-sm text-dust">{item.rewardOnly ? "Trophy" : `$${item.price}`}</p>
              </div>
              <p className="mt-1 text-xs text-mute">{item.blurb}</p>
              <p className="mt-1 text-[11px] text-dust">{have ? `In crate ${have}` : locked ? `Needs ${RANKS[item.rank]?.name}` : "\u00a0"}</p>
              <div className="mt-2 flex gap-2">
                {!item.rewardOnly ? (
                  <Button size="sm" variant="outline" disabled={locked} onClick={() => setMsg(buy(item.id) ?? `Bought ${item.name}`)}>
                    Buy
                  </Button>
                ) : null}
                {item.slot && have > 0 && selectedId ? (
                  <Button size="sm" variant="ghost" onClick={() => setMsg(equip(selectedId, item.id))}>
                    Equip
                  </Button>
                ) : null}
                {item.kind === "feed" && have > 0 && selectedId ? (
                  <Button size="sm" variant="ghost" onClick={() => setMsg(feed(selectedId, item.id))}>
                    Feed
                  </Button>
                ) : null}
                {item.kind === "tonic" && have > 0 && selectedId ? (
                  <Button size="sm" variant="ghost" onClick={() => setMsg(tonic(selectedId, item.id))}>
                    Use
                  </Button>
                ) : null}
                {item.kind === "bait" && have > 0 ? (
                  <Button size="sm" variant="ghost" onClick={() => setMsg(setHuntBait(item.id) ?? `${item.name} set for the next hunt`)}>
                    Set bait
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
        {ITEM_LIST.some((i) => !isShipped(i)) ? (
          <p className="text-xs text-mute">More gear sits in {seasonName(2)} — Circuit lists the pack.</p>
        ) : null}
      </div>
      {msg ? <p className="mt-3 text-sm text-paper">{msg}</p> : null}
    </div>
  );
}

export function TeamView() {
  const spiders = useGame((s) => s.spiders);
  const team = useGame((s) => s.activeTeam);
  const setTeam = useGame((s) => s.setTeamSlot);
  const slots = [0, 1, 2];
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Traveling team</p>
        <h2 className="font-display text-3xl font-semibold">Three on the stick</h2>
        <p className="text-sm text-dust">Bench spiders lend the lead +1 grit each and +1 silk per web style. Hung veterans in the rafters lend grit. Same bloodline lends power.</p>
      </header>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((i) => {
          const sp = spiders.find((s) => s.id === team[i]);
          return (
            <div key={i} className="rounded-xl bg-raised p-2 text-center">
              {sp ? (
                <>
                  <img src={portraitOf(sp)} alt="" className="mx-auto size-16 rounded-lg object-cover" />
                  <p className="mt-1 truncate text-xs">{sp.name}</p>
                </>
              ) : (
                <p className="py-6 text-xs text-mute">Open</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {activeSpiders(spiders).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              const empty = slots.find((i) => !team[i]);
              setTeam(empty ?? 2, s.id);
            }}
            className="flex items-center gap-2 rounded-lg bg-panel p-2 text-left"
          >
            <img src={portraitOf(s)} alt="" className="size-10 rounded object-cover" />
            <span className="truncate text-sm">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CareerView() {
  const rank = useGame((s) => s.rank);
  const points = useGame((s) => s.rankPoints);
  const stableName = useGame((s) => s.stableName);
  const wins = useGame((s) => s.wins);
  const losses = useGame((s) => s.losses);
  const winStreak = useGame((s) => s.winStreak);
  const seen = useGame((s) => s.seen);
  const spiders = useGame((s) => s.spiders);
  const inventory = useGame((s) => s.inventory);
  const season = useGame((s) => s.season);
  const career = useGame((s) => s.career);
  const earnedBadges = useGame((s) => s.earnedBadges);
  const paper = useGame((s) => s.paper);
  const fightArchive = useGame((s) => s.fightArchive);
  const rollYear = useGame((s) => s.rollYear);
  const [msg, setMsg] = useState<string | null>(null);
  const [circuitBoard, setCircuitBoard] = useState<CircuitEntry[]>([]);
  const [boardState, setBoardState] = useState<"loading" | "ready" | "error">("loading");
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardPlacement, setBoardPlacement] = useState<CircuitPlacement | null>(null);
  const [dailyCircuitBoard, setDailyCircuitBoard] = useState<CircuitEntry[]>([]);
  const [dailyBoardState, setDailyBoardState] = useState<"loading" | "ready" | "error">("loading");
  const [dailyBoardError, setDailyBoardError] = useState<string | null>(null);
  const [dailyPlacement, setDailyPlacement] = useState<CircuitPlacement | null>(null);
  const [archiveShared, setArchiveShared] = useState<string | null>(null);
  const next = RANKS[rank + 1];
  const board = [...spiders].sort((a, b) => spiderScore(b) - spiderScore(a));
  const current = SEASONS.find((s) => s.id === careerSeasonId(season)) ?? SEASONS[0]!;
  const day = useMemo(() => circuitDay(), []);
  const fieldGuide = SPECIES_LIST.filter(isShipped);
  const foundSpecies = fieldGuide.filter((species) => seen.includes(species.id)).length;
  const nextFieldGuideMark = FIELD_GUIDE_MILESTONES.find((milestone) => !earnedBadges.includes(milestone.id));
  const trophies = heldRivalTrophies(inventory, spiders);
  const trophyRows = Object.entries(RIVAL_TROPHIES).map(([rivalId, itemId]) => ({ rival: RIVALS.find((rival) => rival.id === rivalId), item: ITEMS[itemId], held: trophies.includes(itemId) }));

  useEffect(() => {
    let alive = true;
    void listCircuitBoard({ data: { season } })
      .then((entries) => {
        if (!alive) return;
        setCircuitBoard(entries);
        setBoardState("ready");
        setBoardError(null);
      })
      .catch(() => {
        if (alive) {
          setBoardState("error");
          setBoardError("Board unavailable. Your yard still saves locally.");
        }
      });
    return () => {
      alive = false;
    };
  }, [season]);

  useEffect(() => {
    let alive = true;
    void listDailyCircuitBoard({ data: { season, day } })
      .then((entries) => {
        if (!alive) return;
        setDailyCircuitBoard(entries);
        setDailyBoardState("ready");
        setDailyBoardError(null);
      })
      .catch(() => {
        if (alive) {
          setDailyBoardState("error");
          setDailyBoardError("Daily board unavailable. Your yard still saves locally.");
        }
      });
    return () => {
      alive = false;
    };
  }, [day, season]);

  const postScore = () => {
    setBoardState("loading");
    setBoardError(null);
    void postCircuitScore({ data: { stableName, score: points, wins, rank, season } })
      .then(async (placement) => ({ placement, entries: await listCircuitBoard({ data: { season } }) }))
      .then(({ placement, entries }) => {
        setCircuitBoard(entries);
        setBoardPlacement(placement);
        setBoardState("ready");
        setBoardError(null);
      })
      .catch((error: unknown) => {
        setBoardState("error");
        setBoardError(error instanceof Error && error.message === "Unauthorized" ? "Sign in to post a score." : "Could not post this score. Try again.");
      });
  };

  const postDailyScore = () => {
    setDailyBoardState("loading");
    setDailyBoardError(null);
    void postDailyCircuitScore({ data: { stableName, score: points, wins, rank, season, day } })
      .then(async (placement) => ({ placement, entries: await listDailyCircuitBoard({ data: { season, day } }) }))
      .then(({ placement, entries }) => {
        setDailyCircuitBoard(entries);
        setDailyPlacement(placement);
        setDailyBoardState("ready");
        setDailyBoardError(null);
      })
      .catch((error: unknown) => {
        setDailyBoardState("error");
        setDailyBoardError(error instanceof Error && error.message === "Unauthorized" ? "Sign in to post a score." : "Could not post this score. Try again.");
      });
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Circuit</p>
        <h2 className="font-display text-3xl font-semibold">{rankName(rank)}</h2>
        <p className="text-sm text-dust">
          Year {season} · {current.name} · {wins}–{losses} on the stick{winStreak ? ` · ${winStreak} straight` : ""}
        </p>
        <p className="text-xs text-moss">
          Circuit score {points}
          {next ? ` · ${Math.max(0, next.points - points)} to ${next.name}` : " · World Stick"}
        </p>
      </header>

      <Suspense fallback={null}><CompetitionSignIn /></Suspense>

      <section className="rounded-xl border border-line bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-dust">Yard leaderboard</p>
        <ol className="mt-2 space-y-2">
          {board.map((spider, index) => (
            <li key={spider.id} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-dust">{index + 1}</span>
              <img src={portraitOf(spider)} alt="" className="size-8 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate">{spider.name}</span>
              <span className="tabular text-moss">{spiderScore(spider)} pts</span>
              <span className="text-xs text-dust">+{trainingTotal(spider)} drilled</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-moss/50 bg-raised p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs uppercase tracking-widest text-moss">Year {season} circuit board</p>
          <Button size="sm" variant="outline" disabled={boardState === "loading"} onClick={postScore}>
            Post score
          </Button>
        </div>
        <p className="mt-1 text-xs text-mute">Post this stable's circuit score for other yards to chase.</p>
        {boardPlacement ? <p className="mt-2 text-xs text-moss">Your latest post: #{boardPlacement.position} of {boardPlacement.total} active yards.</p> : null}
        {boardState === "error" ? <p className="mt-2 text-xs text-rust">{boardError}</p> : null}
        {boardState === "loading" ? <p className="mt-2 text-xs text-dust">Reading the board…</p> : null}
        {boardState === "ready" && circuitBoard.length === 0 ? <p className="mt-2 text-xs text-dust">Be the first yard on the line.</p> : null}
        {circuitBoard.length ? (
          <ol className="mt-2 space-y-2">
            {circuitBoard.map((entry, index) => (
              <li key={`${entry.stableName}-${entry.updatedAt}`} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-dust">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{entry.stableName}</span>
                <span className="text-xs text-dust">{rankName(entry.rank)} · {entry.wins}W</span>
                <span className="tabular text-moss">{entry.score} pts</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <div className="rounded-xl bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-dust">Yard book</p>
        <p className="mt-1 tabular text-sm text-paper">
          {career?.hunts ?? 0} hunts · {career?.bouts ?? 0} bouts · {career?.molts ?? 0} molts ·{" "}
          {career?.stripped ?? 0} wraps walked
          {(career?.clutches ?? 0) > 0 ? ` · ${career.clutches} clutches` : ""}
          {(career?.perfectMolts ?? 0) > 0 ? ` · ${career.perfectMolts} glass shells` : ""}
          {(career?.worldTitles ?? 0) > 0 ? ` · ${career.worldTitles} World title${career.worldTitles === 1 ? "" : "s"}` : ""}
          {(career?.bayJobs ?? 0) > 0 ? ` · ${career.bayJobs} bay jobs` : ""}
          {(career?.splices ?? 0) > 0 ? ` · ${career.splices} splices` : ""}
        </p>
      </div>

      <section className="rounded-xl border border-moss/50 bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-moss">Trophy case</p>
        <p className="mt-1 text-xs text-dust">{trophies.length}/{trophyRows.length} key crews beaten. Trophies can be equipped from the crate.</p>
        <ul className="mt-2 space-y-1 text-sm">
          {trophyRows.map(({ rival, item, held }) => (
            <li key={item?.id} className={held ? "text-paper" : "text-dust"}>
              {held ? "●" : "○"} {held ? item?.name : rival?.name ?? "Unknown crew"}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-rust/50 bg-raised p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs uppercase tracking-widest text-rust">Daily circuit · {day}</p>
          <Button size="sm" variant="outline" disabled={dailyBoardState === "loading"} onClick={postDailyScore}>
            Enter today
          </Button>
        </div>
        <p className="mt-1 text-xs text-mute">Fresh board at midnight UTC. Your current Circuit score is your entry.</p>
        {dailyPlacement ? <p className="mt-2 text-xs text-moss">Today’s placement: #{dailyPlacement.position} of {dailyPlacement.total} active yards.</p> : null}
        {dailyBoardState === "error" ? <p className="mt-2 text-xs text-rust">{dailyBoardError}</p> : null}
        {dailyBoardState === "loading" ? <p className="mt-2 text-xs text-dust">Reading today’s board…</p> : null}
        {dailyBoardState === "ready" && dailyCircuitBoard.length === 0 ? <p className="mt-2 text-xs text-dust">Set the first mark today.</p> : null}
        {dailyCircuitBoard.length ? (
          <ol className="mt-2 space-y-2">
            {dailyCircuitBoard.map((entry, index) => (
              <li key={`${entry.stableName}-${entry.updatedAt}`} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-dust">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{entry.stableName}</span>
                <span className="text-xs text-dust">{rankName(entry.rank)} · {entry.wins}W</span>
                <span className="tabular text-moss">{entry.score} pts</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {paper?.length ? (
        <section className="rounded-xl border border-line bg-raised p-3">
          <p className="text-xs uppercase tracking-widest text-dust">Stick paper</p>
          <ul className="mt-2 space-y-1 text-sm">
            {paper.map((clip, index) => (
              <li key={`${clip.date}-${index}`} className={clip.won ? "text-paper" : "text-dust"}>
                {clip.headline}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {fightArchive.length ? (
        <section className="rounded-xl border border-line bg-raised p-3">
          <p className="text-xs uppercase tracking-widest text-dust">Yard archive</p>
          <p className="mt-1 text-xs text-mute">Your last {fightArchive.length} complete tapes. Read what worked, then share a finished card.</p>
          <ol className="mt-2 space-y-3">
            {fightArchive.slice(0, 6).map((tape, index) => (
              <li key={`${tape.date}-${tape.fighter}-${tape.rivalId}-${index}`} className="border-t border-line pt-2 first:border-0 first:pt-0">
                <p className={tape.won ? "text-sm text-paper" : "text-sm text-dust"}>
                  {tape.fighter} {tape.won ? "held" : "dropped"} vs {tape.enemyName}
                  {tape.practice ? " · practice" : tape.points === undefined ? "" : ` · ${tape.points > 0 ? "+" : ""}${tape.points} pts`}
                </p>
                <p className="mt-1 text-xs text-dust">
                  {tape.rounds.map((round) => `R${round.round} ${MOVES[round.playerMove].name}/${MOVES[round.enemyMove].name} ${round.result}`).join(" · ") || "No exchanges recorded"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    void shareMatchCard(archiveShareText(stableName, tape)).then((status) => {
                      setArchiveShared(status === "shared" ? "Match card shared." : status === "copied" ? "Match card copied." : status === "cancelled" ? "Share cancelled." : "Could not share match card.");
                    });
                  }}
                >
                  Share match card
                </Button>
              </li>
            ))}
          </ol>
          {archiveShared ? <p className="mt-2 text-xs text-dust">{archiveShared}</p> : null}
        </section>
      ) : null}

      {rafterSpiders(spiders).length ? (
        <section className="rounded-xl border border-line bg-raised p-3">
          <p className="text-xs uppercase tracking-widest text-dust">Rafters</p>
          <ul className="mt-2 space-y-1 text-sm">
            {rafterSpiders(spiders).map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span className="truncate">{s.name}</span>
                <span className="truncate text-xs text-moss">{s.line ?? STAGE_LABEL[s.stage]} · {s.wins}W</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {spiders.some((s) => s.line || s.bredFrom) ? (
        <section className="rounded-xl border border-line bg-raised p-3">
          <p className="text-xs uppercase tracking-widest text-dust">Bloodlines</p>
          <ul className="mt-2 space-y-1 text-sm">
            {spiders
              .filter((s) => s.line || s.bredFrom)
              .map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="truncate">{s.name}</span>
                  <span className="truncate text-xs text-moss">{s.bredFrom ?? s.line}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-line bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-dust">Web marks</p>
        <p className="mt-1 text-xs text-mute">Each mark grants its listed circuit points once.</p>
        <ol className="mt-2 space-y-2">
          {BADGES.map((badge) => {
            const earned = earnedBadges.includes(badge.id);
            return (
              <li key={badge.id} className={cn("rounded-lg bg-panel p-2", !earned && "opacity-55")}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{earned ? "✓ " : "○ "}{badge.name}</span>
                  <span className="tabular text-xs text-moss">+{badge.reward} pts</span>
                </div>
                <p className="mt-0.5 text-xs text-dust">{badge.detail}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-widest text-dust">Seasons</p>
        <ol className="space-y-2">
          {SEASONS.map((pack) => {
            const open = pack.id <= SHIPPED_SEASON;
            return (
              <li
                key={pack.id}
                className={cn(
                  "rounded-xl border p-3",
                  pack.id === SHIPPED_SEASON ? "border-paper bg-panel" : "border-line bg-raised",
                  !open && "opacity-70",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {pack.id}. {pack.name}
                  </p>
                  <span className="text-xs text-dust">{open ? "Open" : "In the crate"}</span>
                </div>
                <p className="mt-1 text-sm text-dust">{pack.blurb}</p>
                <p className="mt-1 text-xs text-mute">{pack.adds.join(" · ")}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-widest text-dust">Ranks</p>
        <ol className="space-y-2">
          {RANKS.map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-xl border p-3",
                r.id === rank ? "border-paper bg-panel" : "border-line bg-raised",
                r.id > rank && "opacity-50",
              )}
            >
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-dust">{r.blurb}</p>
              <p className="tabular text-xs text-mute">
                {points}/{r.points} · purse ${r.purse}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-widest text-dust">Almanac</p>
        <p className="mb-2 text-sm text-dust">{foundSpecies}/{fieldGuide.length} species logged · each reveals a new web answer.</p>
        <p className="mb-3 text-xs text-moss">
          {nextFieldGuideMark
            ? `${nextFieldGuideMark.name}: ${Math.min(foundSpecies, nextFieldGuideMark.target)}/${nextFieldGuideMark.target} · +${nextFieldGuideMark.reward} circuit pts`
            : "Whole yard logged · every released web answer is yours."}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {fieldGuide.map((sp) => {
            const known = seen.includes(sp.id);
            return (
              <div
                key={sp.id}
                className={cn("rounded-xl border border-line bg-raised p-2", !known && "opacity-60")}
              >
                {known ? (
                  <img src={Object.values(sp.portraits)[0]} alt="" className="mb-2 h-16 w-full rounded object-cover" />
                ) : (
                  <div className="mb-2 h-16 rounded bg-ink" />
                )}
                <p className="truncate text-sm font-medium">{known ? sp.common : "???"}</p>
                <p className="truncate text-xs text-moss">{known ? `${sp.web.name} · ${MOVES[sp.web.move].name}` : "Unlogged"}</p>
                {known ? <p className="mt-1 text-[11px] text-dust">{sp.web.ability}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      {rank >= 7 ? (
        <Button
          onClick={() => {
            const err = rollYear();
            setMsg(err ?? "World title stamped. New year, Regional again. Keep the spiders.");
          }}
        >
          Roll the next year
        </Button>
      ) : (
        <p className="text-sm text-mute">Hold World Stick to roll a new year. Packs drop when the circuit opens them.</p>
      )}
      {msg ? <p className="text-sm text-paper">{msg}</p> : null}
    </div>
  );
}


export function SettingsView() {
  const settings = useGame((s) => s.settings);
  const setSetting = useGame((s) => s.setSetting);
  const reset = useGame((s) => s.resetAll);
  const name = useGame((s) => s.stableName);
  const rename = useGame((s) => s.renameStable);
  const setScreen = useGame((s) => s.setScreen);
  const [mind, setMind] = useState<"checking" | "live" | "dark">("checking");

  useEffect(() => {
    void jevStatus()
      .then((s) => setMind(s?.live ? "live" : "dark"))
      .catch(() => setMind("dark"));
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Settings</p>
        <h2 className="font-display text-3xl font-semibold">The crate lid</h2>
      </header>
      <div className="rounded-xl bg-raised p-3 text-sm">
        <p className="text-xs uppercase tracking-widest text-dust">Stick mind</p>
        <p className="mt-1 text-paper">
          {mind === "checking"
            ? "Checking the line…"
            : mind === "live"
              ? "Jev is live. Call the Black Widow on the fight card — she hangs on the far silk and the stick mind throws for her. Other crews also pick with it. Hunts get a keep/release read."
              : "Stick mind is dark. You can still call the Black Widow; she falls back to yard instinct until the line comes up."}
        </p>
        <p className="mt-2 text-xs text-mute">
          Build {BUILD} · {seasonName(SHIPPED_SEASON)} shipped. Later packs sit in Circuit until they open.
        </p>
      </div>
      <label className="text-sm text-dust">
        Stable name
        <input
          defaultValue={name}
          onBlur={(e) => rename(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-line bg-raised px-3 text-paper"
        />
      </label>
      {(["sfx", "music", "reduceMotion", "timingAssist"] as const).map((k) => (
        <label key={k} className="flex items-center justify-between rounded-xl bg-raised px-3 py-3">
          <span className="capitalize">{k === "sfx" ? "Sound" : k === "music" ? "Yard hum" : k === "reduceMotion" ? "Less motion" : "Focus timing · 2.5s reads"}</span>
          <input type="checkbox" checked={settings[k]} onChange={(e) => setSetting(k, e.target.checked)} className="size-5 accent-rust" />
        </label>
      ))}
      <Button variant="outline" onClick={() => setScreen("train")}>
        Train
      </Button>
      <Button variant="outline" onClick={() => setScreen("team")}>
        Traveling team
      </Button>
      <Button variant="danger" onClick={reset}>
        Wipe this save
      </Button>
    </div>
  );
}
