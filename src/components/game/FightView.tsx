import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FightCanvas } from "./FightCanvas";
import { applyEnemyTell, bestCounterFor, countersFor, createFight, moveForKey, queuePlayerMove, readWindowPercent, readWindowSeconds, webSurgeHint, type StickFight } from "@/game/combat";
import { MOVES } from "@/game/content";
import { playHit, playLose, playSilk, playWin } from "@/game/audio";
import { useGame } from "@/game/store";
import { canFight, portraitOf, STAGE_LABEL } from "@/game/spiders";
import { SPECIES, RIVALS, RANKS, SLOT_LABEL, ITEMS } from "@/game/content";
import { isShipped } from "@/game/catalog";
import type { MoveId } from "@/game/types";
import { askRivalMove, judgeBout, jevStatus } from "@/lib/jev";
import type { StickSnapshot } from "@/lib/jev-types";
import { cn } from "@/lib/utils";
import { fightShareText } from "@/game/share";
import { shareMatchCard } from "@/game/share-client";
import { NIGHTLY_BONUS_CASH, NIGHTLY_BONUS_POINTS, nightlyRival } from "@/game/night-card";
import { skyFightEffects, tonightSky } from "@/game/sky";
import { rivalIntel } from "@/game/rival-intel";
import { WIDOW_UNLOCK_RANK, widowCallMode } from "@/game/boss";
import { RIVAL_TROPHIES } from "@/game/rewards";
import { todayStamp } from "@/game/rng";
import { fightStakes } from "@/game/fight-stakes";
import { nextStreakReward } from "@/game/streak";
import { rivalWebProfiles } from "@/game/rival-scout";

const MOVE_ORDER: MoveId[] = ["lunge", "grapple", "feint", "brace", "yank", "drop"];

function packFight(f: StickFight): StickSnapshot {
  const spec = (id: string) => SPECIES[id];
  const rival = RIVALS.find((r) => r.id === f.rivalId);
  const snap = (side: StickFight["player"]) => ({
    name: side.name,
    species: spec(side.spider.speciesId)?.common ?? side.spider.speciesId,
    latin: spec(side.spider.speciesId)?.latin,
    hpPct: Math.round((side.hp / Math.max(1, side.max)) * 100),
    stam: Math.round(side.stam),
    last: (side === f.player ? f.lastPlayerMove : f.lastEnemyMove) as string | null,
    stats: side.stats,
  });
  return {
    round: f.round,
    rival: { name: f.rivalName, grit: rival?.grit ?? 1, mind: !!rival?.mind },
    player: snap(f.player),
    enemy: snap(f.enemy),
  };
}

export function FightSelect() {
  const spiders = useGame((s) => s.spiders);
  const rank = useGame((s) => s.rank);
  const cash = useGame((s) => s.cash);
  const winStreak = useGame((s) => s.winStreak);
  const selectedId = useGame((s) => s.selectedId);
  const prepare = useGame((s) => s.prepareFight);
  const startPractice = useGame((s) => s.startPractice);
  const rivalRecords = useGame((s) => s.rivalRecords);
  const setScreen = useGame((s) => s.setScreen);
  const startYardSeries = useGame((s) => s.startYardSeries);
  const continueYardSeries = useGame((s) => s.continueYardSeries);
  const yardSeries = useGame((s) => s.yardSeries);
  const seriesCalled = useGame((s) => s.flags.yardSeries === s.dayStamp);
  const [wager, setWager] = useState(10);
  const [err, setErr] = useState<string | null>(null);
  const [mind, setMind] = useState<"checking" | "live" | "dark">("checking");
  const player = spiders.find((s) => s.id === selectedId && !s.retired) ?? spiders.find((s) => !s.retired && !canFight(s)) ?? spiders.find((s) => !s.retired);
  const windowed = RIVALS.filter(
    (r) => isShipped(r) && !r.always && r.rank <= rank + 1 && r.rank >= Math.max(0, rank - 1),
  );
  const rivals = [...RIVALS.filter((r) => r.always && isShipped(r)), ...windowed];
  const purse = RANKS[rank]?.purse ?? 18;
  const headline = nightlyRival(todayStamp(), rank);
  const sky = tonightSky();
  const stickEffects = skyFightEffects(sky);
  const nextHeater = nextStreakReward(winStreak);

  useEffect(() => {
    void jevStatus()
      .then((s) => setMind(s?.live ? "live" : "dark"))
      .catch(() => setMind("dark"));
  }, []);

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">The stick</p>
        <h2 className="font-display text-3xl font-semibold">Call a fight</h2>
        <p className="mt-1 text-sm text-dust">Lose the wager. Lose the wraps. Train them back.</p>
      </header>
      <section className="rounded-xl border border-moss/50 bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-moss">Tonight's headliner</p>
        <p className="mt-1 font-medium">{headline.name}</p>
        <p className="mt-1 text-xs text-dust">Win this call for +${NIGHTLY_BONUS_CASH} and +{NIGHTLY_BONUS_POINTS} circuit points.</p>
      </section>
      <section className="rounded-xl border border-line bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-dust">Tonight's stick</p>
        <p className="mt-1 font-medium">{sky.name}</p>
        <p className="mt-1 text-xs text-dust">
          {stickEffects.length ? `${stickEffects.join(" · ")} to both spiders.` : "No stat shift. Read the stick clean."}
        </p>
      </section>
      <section className="rounded-xl border border-line bg-raised p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-dust">Practice thread</p>
            <p className="mt-1 text-xs text-dust">No cash, gear, rank, or daily progress on the line. Read real tells and keep the tape.</p>
          </div>
          <Button size="sm" variant="outline" disabled={!player} onClick={() => setErr(player ? startPractice(player.id) : "Pick a fighter")}>
            Practice
          </Button>
        </div>
      </section>
      <section className="rounded-xl border border-rust/45 bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-rust">Yard heater</p>
        <p className="mt-1 text-sm text-paper">{winStreak ? `${winStreak} ranked wins straight` : "Start a ranked win streak."}</p>
        <p className="mt-1 text-xs text-dust">
          {nextHeater.wins - winStreak === 1 ? "Next ranked win" : `${nextHeater.wins - winStreak} more ranked wins`} lifts {nextHeater.label}: +${nextHeater.cash} and +{nextHeater.points} circuit points.
        </p>
      </section>
      <section className="rounded-xl border border-paper/25 bg-panel p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-paper">Yard series</p>
            <p className="mt-1 text-xs text-dust">Three crews. No entry wager. Win all three for +$50 and +30 circuit points.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!player || seriesCalled}
            onClick={() => setErr(yardSeries ? continueYardSeries() : player ? startYardSeries(player.id) : "Pick a fighter")}
          >
            {seriesCalled ? "Called" : yardSeries ? `Resume ${yardSeries.stage + 1}/3` : "Run card"}
          </Button>
        </div>
      </section>
      {player ? (
        <button
          type="button"
          onClick={() => setScreen("stable")}
          className="flex items-center gap-3 rounded-xl bg-raised p-3 text-left"
        >
          <img src={portraitOf(player)} alt="" className="size-16 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="font-medium">{player.name}</p>
            <p className="truncate text-xs text-dust">
              {SPECIES[player.speciesId]?.common} · {STAGE_LABEL[player.stage]}
            </p>
            <p className="text-xs text-rust">{canFight(player) ?? "Ready"}</p>
          </div>
        </button>
      ) : (
        <p className="text-dust">Catch a spider first.</p>
      )}
      <label className="flex flex-col gap-1 text-sm text-dust">
        <span className="flex items-baseline justify-between">
          <span>Wager</span>
          <span className="tabular text-paper">
            ${wager}
            <span className="text-mute"> · base purse ${purse + wager}</span>
          </span>
        </span>
        <input
          type="range"
          min={5}
          max={Math.max(5, Math.min(cash, purse * 2))}
          value={wager}
          onChange={(e) => setWager(Number(e.target.value))}
          className="w-full accent-rust"
        />
      </label>
      <div className="grid gap-2">
        {rivals.map((r) => {
          const widowMode = r.mind ? widowCallMode(rank) : null;
          const stakes = fightStakes(rank, wager, r.id === headline.id, sky.purse);
          const rankedCall = !r.mind || widowMode === "challenge";
          const webProfiles = rivalWebProfiles(r);
          return (
          <button
            key={r.id}
            type="button"
            className={cn(
              "rounded-xl border bg-panel p-3 text-left",
              r.mind ? "border-rust/70" : "border-line",
              r.id === headline.id && "border-moss/70",
            )}
            disabled={!player}
            onClick={() => {
              if (!player) return;
              const msg = widowMode === "shadow" ? startPractice(player.id, r.id) : prepare(r.id, player.id, wager);
              setErr(msg);
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{r.name}</span>
              <span className="text-xs text-dust">
                {r.mind
                  ? mind === "live"
                    ? "Boss · live"
                    : mind === "checking"
                      ? "Boss"
                      : "Boss · local"
                  : RANKS[r.rank]?.name}
              </span>
            </div>
            <p className="mt-1 text-sm italic text-mute">“{r.quote}”</p>
            {r.style ? <p className="mt-1 text-xs text-dust">Tends toward {MOVES[r.style].name.toLowerCase()}.</p> : null}
            {r.style && bestCounterFor(r.style) ? (
              <p className="mt-1 text-xs text-moss">
                First read: if {MOVES[r.style].name.toLowerCase()} shows, lead {MOVES[bestCounterFor(r.style)!].name}.
              </p>
            ) : null}
            {webProfiles.length ? (
              <p className="mt-1 text-xs text-dust">
                Possible webs: {webProfiles.map((profile) => `${profile.species} · ${profile.web} (${profile.move})`).join(" / ")}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-dust">{Math.round(r.grit * 100)}% grit</p>
            {rankedCall ? (
              <p className="mt-1 text-xs text-paper">
                Win ${stakes.purse} · +{stakes.points} pts <span className="text-mute">· loss up to −{stakes.lossPoints} pts</span>
                {stakes.headlineCash ? <span className="text-moss"> · headliner included</span> : null}
                {stakes.skyCash ? <span className="text-moss"> · +${stakes.skyCash} {sky.name}</span> : null}
              </p>
            ) : null}
            {(() => {
              const record = rivalRecords[r.id];
              const intel = rivalIntel(record?.moves);
              return record ? (
                <>
                  <p className="mt-1 text-xs text-moss">
                    Yard card: {record.wins}–{record.losses}
                    {record.streak > 1 ? ` · ${record.streak} straight` : ""}
                  </p>
                  {intel.length ? <p className="mt-1 text-xs text-dust">Tape says: {intel.map((entry) => `${MOVES[entry.move].name} ×${entry.count}`).join(" · ")}</p> : null}
                  {intel[0] && bestCounterFor(intel[0].move) ? (
                    <p className="mt-1 text-xs text-moss">
                      Tape counter: when {MOVES[intel[0].move].name.toLowerCase()} shows, lead {MOVES[bestCounterFor(intel[0].move)!].name}.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-xs text-dust">No calls on this crew yet.</p>
              );
            })()}
            {RIVAL_TROPHIES[r.id] && (rivalRecords[r.id]?.wins ?? 0) === 0 ? (
              <p className="mt-1 text-xs text-moss">First win lifts {ITEMS[RIVAL_TROPHIES[r.id]!]?.name}.</p>
            ) : null}
            {r.mind ? (
              <p className="mt-1 text-xs text-dust">
                {widowMode === "challenge"
                  ? "Always on the line. Scales with your rank. The Widow hangs on the far silk. Stick mind throws for her."
                  : `Shadow spar · no stakes. Read the Widow's tells now; reach ${RANKS[WIDOW_UNLOCK_RANK]?.name ?? "District"} to make the ranked call.`}
              </p>
            ) : null}
          </button>
          );
        })}
      </div>
      {err ? <p className="text-sm text-rust">{err}</p> : null}
    </div>
  );
}

export function FightArena() {
  const fightMeta = useGame((s) => s.fight);
  const spiders = useGame((s) => s.spiders);
  const applyResult = useGame((s) => s.applyResult);
  const result = useGame((s) => s.result);
  const reduceMotion = useGame((s) => s.settings.reduceMotion);
  const setScreen = useGame((s) => s.setScreen);
  const player = spiders.find((s) => s.id === fightMeta?.playerId);
  const sim = useRef<StickFight | null>(null);
  const [, bump] = useState(0);
  const askedRound = useRef(0);
  const jevDead = useRef(false);

  if (fightMeta && player && !sim.current && !result) {
    const crew = RIVALS.find((r) => r.id === fightMeta.rivalId);
    const sky = tonightSky();
    sim.current = createFight(
      player,
      fightMeta.enemy,
      fightMeta.wager,
      fightMeta.rivalId,
      crew?.name ?? fightMeta.enemy.name,
      crew?.style ?? null,
      fightMeta.teamBonus,
      sky.fight,
      sky.id,
      fightMeta.practice,
    );
    askedRound.current = 0;
    jevDead.current = false;
  }

  useEffect(() => {
    if (!fightMeta || !player) return;
    if (!sim.current) {
      const sky = tonightSky();
    sim.current = createFight(
        player,
        fightMeta.enemy,
        fightMeta.wager,
        fightMeta.rivalId,
        RIVALS.find((r) => r.id === fightMeta.rivalId)?.name ?? fightMeta.enemy.name,
        RIVALS.find((r) => r.id === fightMeta.rivalId)?.style ?? null,
        fightMeta.teamBonus,
        sky.fight,
        sky.id,
        fightMeta.practice,
      );
    }
    const pullJev = (f: StickFight) => {
      if (jevDead.current || f.failedJev) return;
      const round = Math.max(1, f.round);
      void askRivalMove({ data: packFight(f) })
        .then((res) => {
          const live = sim.current;
          if (!live) return;
          if (live.round !== 0 && live.round !== round) return;
          if (!res || !res.ok) return;
          if (applyEnemyTell(live, res.move, res.usedJev !== false)) bump((n) => n + 1);
        })
        .catch(() => {
          const live = sim.current;
          if (live) live.failedJev = true;
          jevDead.current = true;
        });
    };
    const id = window.setInterval(() => {
      const f = sim.current;
      if (!f) return;
      bump((n) => n + 1);
      if (f.phase === "intro" && askedRound.current === 0) {
        askedRound.current = 1;
        pullJev(f);
      }
      if (f.phase === "telegraph" && f.round !== askedRound.current) {
        askedRound.current = f.round;
        pullJev(f);
      }
      if (f.phase === "resolve" && f.phaseT < 0.05) playHit();
      if (f.phase === "telegraph" && f.phaseT < 0.05) playSilk();
      if (f.phase === "done" && f.outcome) {
        applyResult(f.outcome, f.player.spider);
        if (f.outcome.won) playWin();
        else playLose();
        sim.current = null;
      }
    }, 80);
    return () => clearInterval(id);
  }, [applyResult, fightMeta, player]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const move = moveForKey(event.key);
      const fight = sim.current;
      if (!move || !fight || fight.phase !== "telegraph" || !fight.tellReady || fight.playerLocked) return;
      event.preventDefault();
      queuePlayerMove(fight, move);
      bump((n) => n + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (result) return <ResultCard />;
  if (!fightMeta || !player || !sim.current) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Button onClick={() => setScreen("fight")}>Back</Button>
      </div>
    );
  }
  const f = sim.current;
  // A choice before the read is just a blind guess. Open the buttons when the
  // actual tell is visible, then keep the round genuinely timed from there.
  const locked = f.phase !== "telegraph" || !f.tellReady || f.playerLocked;
  const readMoves = f.phase === "telegraph" && f.tellReady && f.enemy.tell ? countersFor(f.enemy.tell) : [];
  const readWindow = readWindowPercent(f);
  const readSeconds = Math.ceil(readWindowSeconds(f) * 10) / 10;
  const stickEffects = skyFightEffects(tonightSky());

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-ink">
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <Hp name={f.player.name} hp={f.player.hp} max={f.player.max} side="left" />
        <p className="shrink-0 text-dust">{fightMeta.seriesStage !== null ? `Series ${fightMeta.seriesStage + 1}/3 · ` : ""}Rd {f.round}</p>
        <Hp name={f.enemy.name} hp={f.enemy.hp} max={f.enemy.max} side="right" />
      </div>
      {RIVALS.find((r) => r.id === f.rivalId)?.mind ? (
        <p className="px-3 pb-1 text-center text-[10px] uppercase tracking-widest text-rust">
          {f.jevMinded ? "The Widow on the far silk" : "The Widow hanging — waiting on the line"}
        </p>
      ) : f.jevMinded ? (
        <p className="px-3 pb-1 text-center text-[10px] uppercase tracking-widest text-dust">Reads the stick</p>
      ) : null}
      <p className="px-3 pb-1 text-center text-[10px] text-dust">
        Your web · {f.player.web.name} · {f.player.web.ability}
      </p>
      <p className="px-3 pb-1 text-center text-[10px] text-rust">
        Opponent · {SPECIES[f.enemy.spider.speciesId]?.common ?? f.enemy.spider.speciesId} · {f.enemy.web.name} · {f.enemy.web.ability}
      </p>
      {stickEffects.length ? <p className="px-3 pb-1 text-center text-[10px] text-dust">{tonightSky().name} · {stickEffects.join(" · ")} to both</p> : null}
      <p className="px-3 pb-1 text-center text-[10px] uppercase tracking-widest text-moss">
        Web charge {"●".repeat(f.player.webCharge)}{"○".repeat(3 - f.player.webCharge)} · two reads prime: {webSurgeHint(f.player.web)}
      </p>
      {f.enemy.tell && readMoves.length ? (
        <p className="mx-3 rounded-md border border-moss/40 bg-moss/10 px-2 py-1 text-center text-[11px] text-paper">
          Read {MOVES[f.enemy.tell].name} · counter with {readMoves.map((move) => MOVES[move].name).join(" or ")}
        </p>
      ) : (
        <p className="px-3 pb-1 text-center text-[11px] text-dust">Watch the tell. A correct counter earns web charge.</p>
      )}
      {(f.teamBonus.grit || f.teamBonus.silk) ? (
        <p className="px-3 pb-1 text-center text-[10px] text-moss">
          Crew web +{f.teamBonus.grit ?? 0} grit · +{f.teamBonus.silk ?? 0} silk
        </p>
      ) : null}
      <div className="relative min-h-[240px] flex-1">
        <FightCanvas fight={f} className="absolute inset-0 h-full w-full" reduceMotion={reduceMotion} />
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center font-display text-lg text-paper drop-shadow">
          {f.lastText}
        </p>
        <button
          type="button"
          className="absolute right-2 top-2 rounded-md bg-ink/70 px-2 py-1 text-[11px] text-dust"
          onClick={() => {
            f.player.hp = 0;
            f.phase = "ko";
            f.phaseT = 0;
            f.lastText = "Dropped the stick.";
          }}
        >
          Forfeit
        </button>
      </div>
      <div className="px-3 pt-2">
        <div className="mb-2" aria-live="polite">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-dust">
            <span>Read window</span>
            <span className={cn(readWindow > 0 && readWindow < 35 && "text-rust")}>{readWindow > 0 ? `${readSeconds.toFixed(1)}s` : "Watch"}</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Read window remaining"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(readWindow)}
          >
            <div className={cn("h-full bg-moss transition-[width,background-color] duration-75", readWindow > 0 && readWindow < 35 && "bg-rust")} style={{ width: `${readWindow}%` }} />
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-paper"
            style={{ width: `${Math.round(f.player.stam)}%` }}
          />
        </div>
        <p className="mt-1 text-center text-[11px] text-dust">
          {f.timingHit ? "Sweet timing" : "Hit the window as you pick"} · desktop keys 1–6
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-3 pb-4">
        {MOVE_ORDER.map((m, index) => (
          <button
            key={m}
            type="button"
            disabled={locked}
            onClick={() => queuePlayerMove(f, m)}
            className={cn(
              "h-12 rounded-lg border border-line bg-raised text-sm font-medium",
              f.player.queued === m && "border-paper bg-panel",
              locked && "opacity-50",
            )}
          >
            <span className="inline-flex items-center gap-1">
              <span className="text-[10px] text-dust">{index + 1}</span>
              {MOVES[m].name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Hp({ name, hp, max, side }: { name: string; hp: number; max: number; side: "left" | "right" }) {
  const pct = Math.max(0, (hp / max) * 100);
  return (
    <div className={cn("min-w-0 flex-1", side === "right" && "text-right")}>
      <p className="truncate text-paper">{name}</p>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div
          className={cn("h-full bg-rust", side === "right" && "ml-auto")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ResultCard() {
  const result = useGame((s) => s.result)!;
  const stableName = useGame((s) => s.stableName);
  const spiders = useGame((s) => s.spiders);
  const selectedId = useGame((s) => s.selectedId);
  const clear = useGame((s) => s.clearResult);
  const prepareFight = useGame((s) => s.prepareFight);
  const startPractice = useGame((s) => s.startPractice);
  const continueYardSeries = useGame((s) => s.continueYardSeries);
  const yardSeries = useGame((s) => s.yardSeries);
  const [read, setRead] = useState<{ label: string; lesson: string } | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const [rematchError, setRematchError] = useState<string | null>(null);
  const fighter = spiders.find((spider) => spider.id === selectedId && !spider.retired) ?? spiders.find((spider) => !spider.retired);

  useEffect(() => {
    let alive = true;
    void judgeBout({
      data: {
        won: result.won,
        rounds: Math.max(1, Math.round((result.xp - (result.won ? 28 : 10)) / (result.won ? 4 : 2))),
        playerName: "You",
        enemyName: result.enemyName,
        playerHp: result.playerHp,
        enemyHp: result.enemyHp,
        stripped: result.stripped,
        wager: result.wager,
      },
    })
      .then((res) => {
        if (!alive || !res || !res.ok) return;
        if (res.confidence < 0.18) return;
        setRead({ label: res.label, lesson: res.lesson });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [result.enemyName, result.won, result.playerHp, result.enemyHp, result.wager, result.xp, result.stripped]);

  return (
    <div className="flex h-full flex-col items-stretch justify-center gap-4 p-6">
      <p className="text-xs uppercase tracking-widest text-dust">{result.practice ? "Practice thread" : result.won ? "You hold it" : "You dropped it"}</p>
      <h2 className="font-display text-4xl font-semibold">{result.practice ? "Practice complete" : result.won ? "Win" : "Loss"}</h2>
      <p className="text-dust">vs {result.enemyName}</p>
      <ul className="space-y-1 text-sm">
        {result.practice ? <li className="text-moss">No stakes. Your yard stays exactly as it was.</li> : <li>Wager {result.won ? "returned in purse" : "gone"} · ${result.wager}</li>}
        {result.won && !result.practice ? <li className="text-moss">Purse ${result.purse}</li> : null}
        {!result.practice && result.points !== undefined ? (
          <li className={result.points > 0 ? "text-moss" : result.points < 0 ? "text-rust" : "text-dust"}>
            Circuit {result.points > 0 ? "+" : result.points < 0 ? "−" : ""}{Math.abs(result.points)} pts
          </li>
        ) : null}
        {result.headlineBonus ? <li className="text-moss">Headliner bonus +${result.headlineBonus} · +{NIGHTLY_BONUS_POINTS} circuit</li> : null}
        {result.seriesBonus ? <li className="text-moss">Yard series bonus +${result.seriesBonus}</li> : null}
        {result.streakBonus ? <li className="text-moss">{result.streakBonus.label} +${result.streakBonus.cash} · +{result.streakBonus.points} circuit</li> : null}
        {result.badges?.map((badge) => <li key={badge.name} className="text-moss">{badge.name} mark +{badge.reward} circuit pts</li>)}
        {result.sky ? <li className="text-dust">{tonightSky().name} on the stick</li> : null}
        {result.practice ? null : <li>+{result.xp} xp</li>}
        {result.stripped.map((id) => (
          <li key={id} className="text-rust">
            Stripped {ITEMS[id]?.name ?? id}
          </li>
        ))}
        {Object.entries(result.decay).map(([k, v]) => (
          <li key={k} className="text-rust">
            {k} training −{v}
          </li>
        ))}
        {result.loot ? <li className="text-moss">Lifted {ITEMS[result.loot]?.name}</li> : null}
        {result.injury ? <li className="text-rust">{result.injury.label}</li> : null}
      </ul>
      {result.discovery ? (
        <section className="rounded-xl border border-moss/50 bg-moss/10 p-3 text-sm text-paper">
          <p className="text-xs uppercase tracking-widest text-moss">Field guide updated</p>
          <p className="mt-1 font-medium">{result.discovery.species} · {result.discovery.web}</p>
          <p className="mt-1 text-xs text-dust">{result.discovery.ability}</p>
        </section>
      ) : null}
      {result.rankUp ? (
        <section className="rounded-xl border border-paper/50 bg-panel p-3 text-paper">
          <p className="text-xs uppercase tracking-widest text-moss">Circuit promotion</p>
          <p className="mt-1 font-display text-2xl">{result.rankUp.name}</p>
          <p className="mt-1 text-xs text-dust">{result.rankUp.blurb}</p>
        </section>
      ) : null}
      {result.rounds.length ? (
        <section className="rounded-xl bg-raised p-3">
          <p className="text-xs uppercase tracking-widest text-dust">Fight tape</p>
          <ol className="mt-2 space-y-1 text-xs text-paper">
            {result.rounds.slice(-6).map((round) => (
              <li key={round.round} className="flex items-center justify-between gap-2">
                <span className="text-dust">Rd {round.round}</span>
                <span>{MOVES[round.playerMove].name}</span>
                <span className={round.result === "edge" ? "text-moss" : round.result === "hit" ? "text-rust" : "text-dust"}>
                  {round.result === "edge" ? `edge +${round.enemyDamage}` : round.result === "hit" ? `hit −${round.playerDamage}` : "lock"}
                </span>
                <span>{MOVES[round.enemyMove].name}</span>
                {round.playerSurge ? <span className="text-moss">web surge</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {read ? (
        <p className="rounded-xl bg-raised p-3 text-sm text-paper">
          <span className="text-xs uppercase tracking-widest text-dust">Stick mind</span>
          <br />
          {read.label}. Drill {read.lesson} before the next call.
        </p>
      ) : result.jevReads ? (
        <p className="text-xs text-dust">
          {result.enemyName === "Black Widow" || result.rivalId === "widow"
            ? `The Widow read the stick ${result.jevReads} times.`
            : `Rival read the stick ${result.jevReads} times.`}
        </p>
      ) : null}
      <p className="text-sm text-mute">
        {result.practice
          ? "You read a real opponent with nothing on the line. Use the tape, then call a wagered fight when ready."
          : result.won
          ? "Gear holds. Train the edge they just earned."
          : "What they learned on the stick walked off with the other yard. Drill it back."}
      </p>
      <Button
        variant="outline"
        onClick={() => {
          const text = fightShareText(stableName, result);
          void shareMatchCard(text).then((status) => {
            setShared(status === "shared" ? "Match card shared." : status === "copied" ? "Match card copied." : status === "cancelled" ? "Share cancelled." : "Could not share match card.");
          });
        }}
      >
        Share match card
      </Button>
      {shared ? <p className="text-center text-xs text-dust">{shared}</p> : null}
      {!yardSeries ? (
        <Button
          variant="primary"
          disabled={!fighter}
          onClick={() => {
            if (!fighter) {
              setRematchError("Pick a fighter before calling a rematch.");
              return;
            }
            const error = result.practice
              ? startPractice(fighter.id, result.rivalId)
              : prepareFight(result.rivalId, fighter.id, result.wager);
            setRematchError(error);
          }}
        >
          {result.practice ? "Practice again" : `Run it back · $${result.wager}`}
        </Button>
      ) : null}
      {rematchError ? <p className="text-center text-xs text-rust">{rematchError}</p> : null}
      <Button variant="outline" onClick={clear}>
        Back to the yard
      </Button>
      {result.won && yardSeries ? (
        <Button variant="outline" onClick={() => { const error = continueYardSeries(); if (error) clear(); }}>
          Continue yard series · {yardSeries.stage + 1}/3
        </Button>
      ) : null}
    </div>
  );
}

export { SLOT_LABEL };
