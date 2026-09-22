import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FightCanvas } from "./FightCanvas";
import { applyEnemyTell, createFight, queuePlayerMove, type StickFight } from "@/game/combat";
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
  const selectedId = useGame((s) => s.selectedId);
  const prepare = useGame((s) => s.prepareFight);
  const setScreen = useGame((s) => s.setScreen);
  const [wager, setWager] = useState(10);
  const [err, setErr] = useState<string | null>(null);
  const [mind, setMind] = useState<"checking" | "live" | "dark">("checking");
  const player = spiders.find((s) => s.id === selectedId) ?? spiders.find((s) => !canFight(s)) ?? spiders[0];
  const windowed = RIVALS.filter(
    (r) => isShipped(r) && !r.always && r.rank <= rank + 1 && r.rank >= Math.max(0, rank - 1),
  );
  const rivals = [...RIVALS.filter((r) => r.always && isShipped(r)), ...windowed];
  const purse = RANKS[rank]?.purse ?? 18;

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
            <span className="text-mute"> · purse ~${purse + wager}</span>
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
        {rivals.map((r) => (
          <button
            key={r.id}
            type="button"
            className={cn(
              "rounded-xl border bg-panel p-3 text-left",
              r.mind ? "border-rust/70" : "border-line",
            )}
            onClick={() => {
              if (!player) return;
              const msg = prepare(r.id, player.id, wager);
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
            {r.mind ? (
              <p className="mt-1 text-xs text-dust">
                Always on the line. Scales with your rank. The Widow hangs on the far silk. Stick mind throws for her.
              </p>
            ) : null}
          </button>
        ))}
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
  const setScreen = useGame((s) => s.setScreen);
  const player = spiders.find((s) => s.id === fightMeta?.playerId);
  const sim = useRef<StickFight | null>(null);
  const [, bump] = useState(0);
  const askedRound = useRef(0);
  const jevDead = useRef(false);

  if (fightMeta && player && !sim.current && !result) {
    const crew = RIVALS.find((r) => r.id === fightMeta.rivalId);
    sim.current = createFight(
      player,
      fightMeta.enemy,
      fightMeta.wager,
      fightMeta.rivalId,
      crew?.name ?? fightMeta.enemy.name,
    );
    askedRound.current = 0;
    jevDead.current = false;
  }

  useEffect(() => {
    if (!fightMeta || !player) return;
    if (!sim.current) {
      sim.current = createFight(
        player,
        fightMeta.enemy,
        fightMeta.wager,
        fightMeta.rivalId,
        RIVALS.find((r) => r.id === fightMeta.rivalId)?.name ?? fightMeta.enemy.name,
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

  if (result) return <ResultCard />;
  if (!fightMeta || !player || !sim.current) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Button onClick={() => setScreen("fight")}>Back</Button>
      </div>
    );
  }
  const f = sim.current;
  const locked = f.phase !== "telegraph" || f.playerLocked;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-ink">
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <Hp name={f.player.name} hp={f.player.hp} max={f.player.max} side="left" />
        <p className="shrink-0 text-dust">Rd {f.round}</p>
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
        {f.player.web.name} · {f.player.web.ability}
      </p>
      <div className="relative min-h-[240px] flex-1">
        <FightCanvas fight={f} className="absolute inset-0 h-full w-full" />
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
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-paper"
            style={{ width: `${Math.round(f.player.stam)}%` }}
          />
        </div>
        <p className="mt-1 text-center text-[11px] text-dust">
          {f.timingHit ? "Sweet timing" : "Hit the window as you pick"}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-3 pb-4">
        {MOVE_ORDER.map((m) => (
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
            {MOVES[m].name}
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
  const clear = useGame((s) => s.clearResult);
  const [read, setRead] = useState<{ label: string; lesson: string } | null>(null);

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
      <p className="text-xs uppercase tracking-widest text-dust">{result.won ? "You hold it" : "You dropped it"}</p>
      <h2 className="font-display text-4xl font-semibold">{result.won ? "Win" : "Loss"}</h2>
      <p className="text-dust">vs {result.enemyName}</p>
      <ul className="space-y-1 text-sm">
        <li>Wager {result.won ? "returned in purse" : "gone"} · ${result.wager}</li>
        {result.won ? <li className="text-moss">Purse ${result.purse}</li> : null}
        <li>+{result.xp} xp</li>
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
        {result.won
          ? "Gear holds. Train the edge they just earned."
          : "What they learned on the stick walked off with the other yard. Drill it back."}
      </p>
      <Button variant="primary" onClick={clear}>
        Back to the yard
      </Button>
    </div>
  );
}

export { SLOT_LABEL };
