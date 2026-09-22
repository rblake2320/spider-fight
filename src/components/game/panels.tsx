import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ITEMS, ITEM_LIST, MOVES, RANKS, SLOT_LABEL, SPECIES, SPECIES_LIST, xpToNext } from "@/game/content";
import { BUILD, SEASONS, SHIPPED_SEASON, isShipped, seasonName } from "@/game/catalog";
import { BADGES } from "@/game/badges";
import { webSurgeHint } from "@/game/combat";
import { listCircuitBoard, postCircuitScore, type CircuitEntry } from "@/lib/circuit-board";
import { useGame, formatCash, rankName } from "@/game/store";
import { tonightSky } from "@/game/sky";
import { canClutch, clutchCost } from "@/game/clutch";
import { canFight, effective, molt, portraitOf, spiderScore, STAGE_LABEL, STAT_LABEL, trainingTotal } from "@/game/spiders";
import type { GearSlot, ItemKind, Stats } from "@/game/types";
import { jevStatus } from "@/lib/jev";
import { cn } from "@/lib/utils";

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
  const flags = useGame((s) => s.flags);
  const tutorial = useGame((s) => s.tutorial);
  const lead = spiders[0];
  const next = RANKS[rank + 1];
  const firstNight = FIRST_NIGHT[tutorial];
  const sky = tonightSky();
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
        <div className="grid grid-cols-2 gap-2">
          <Action label="Hunt" onClick={() => setScreen("hunt")} />
          <Action label="Fight" onClick={() => setScreen("fight")} />
          <Action label="Train" onClick={() => setScreen("train")} />
          <Action label="Shop" onClick={() => setScreen("shop")} />
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
        <Button variant="outline" onClick={collect} disabled={flags.daily === todayHint()}>
          {flags.daily === todayHint() ? "Morning purse collected" : "Collect morning purse"}
        </Button>
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
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Stable</p>
        <h2 className="font-display text-3xl font-semibold">
          Roster {spiders.length}/{cap}
        </h2>
      </header>
      <div className="grid grid-cols-2 gap-2">
        {spiders.map((s) => (
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
  const setScreen = useGame((s) => s.setScreen);
  const rename = useGame((s) => s.renameSpider);
  const unequip = useGame((s) => s.unequip);
  const setTeam = useGame((s) => s.setTeamSlot);
  const team = useGame((s) => s.activeTeam);
  const [mateId, setMateId] = useState<string | null>(null);
  const [clutchMsg, setClutchMsg] = useState<string | null>(null);
  if (!spider) {
    return (
      <div className="p-6">
        <Button onClick={() => setScreen("stable")}>Back to roster</Button>
      </div>
    );
  }
  const e = effective(spider);
  const spec = SPECIES[spider.speciesId];
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
        <p className="text-xs text-dust">
          {spider.origin} · {spider.traits.join(" · ")} · {spider.wins}–{spider.losses}
        </p>
        {spider.bredFrom ? <p className="text-xs text-moss">Out of {spider.bredFrom}{spider.line ? ` · ${spider.line}` : ""}</p> : spider.line ? <p className="text-xs text-moss">{spider.line}</p> : null}
        {spider.injury ? <p className="text-sm text-rust">{spider.injury.label}</p> : null}
        {spec ? (
          <section className="rounded-xl border border-moss/40 bg-moss/10 p-3">
            <p className="text-xs uppercase tracking-widest text-moss">Web kit</p>
            <p className="mt-1 font-medium">{spec.web.name} · {spec.web.style} web</p>
            <p className="mt-1 text-xs text-dust">Signature: {MOVES[spec.web.move].name} · {spec.web.ability}</p>
            <p className="mt-1 text-xs text-paper">At two web charge: {webSurgeHint(spec.web.style)}.</p>
          </section>
        ) : null}
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
        <Button variant="outline" onClick={() => setScreen("train")}>
          Train
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
              const blocked = mate ? canClutch(spider, mate, spiders.length, cap) : "Pick a mate";
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
  const s = spiders.find((x) => x.id === selectedId) ?? spiders[0];
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
      </header>
      <div className="flex gap-2 overflow-x-auto">
        {spiders.map((sp) => (
          <button key={sp.id} type="button" onClick={() => select(sp.id)} className="shrink-0">
            <img src={portraitOf(sp)} alt="" className={cn("size-14 rounded-lg object-cover", sp.id === s.id && "ring-2 ring-paper")} />
          </button>
        ))}
      </div>
      {(Object.keys(STAT_LABEL) as Array<keyof Stats>).map((k) => {
        const cost = 10 + s.trained[k] * 6;
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
          Rest $6
        </Button>
        <Button className="flex-1" variant="rust" onClick={() => setMsg(tryMolt(s.id) ?? `${s.name} molted`)}>
          Molt
        </Button>
      </div>
      <p className="text-sm text-mute">
        A loss strips gear and peels training. Drills put it back. A molt is the only real jump in size.
      </p>
      {msg ? <p className="text-sm text-paper">{msg}</p> : null}
      {molt(s) === null && s.moltReady < 70 ? <p className="text-xs text-dust">Feed and fight until the molt bar fills.</p> : null}
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
    const live = ITEM_LIST.filter((item) => isShipped(item) && !item.rewardOnly);
    if (tab === "gear") return live.filter((i) => i.slot);
    return live.filter((i) => i.kind === tab);
  }, [tab]);
  return (
    <div className="flex h-full flex-col overflow-auto p-4 pb-24">
      <header className="mb-3">
        <p className="text-xs uppercase tracking-widest text-dust">Shop</p>
        <h2 className="font-display text-3xl font-semibold">The crate</h2>
        <p className="tabular text-sm text-dust">{formatCash(cash)}</p>
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
                <p className="tabular text-sm text-dust">${item.price}</p>
              </div>
              <p className="mt-1 text-xs text-mute">{item.blurb}</p>
              <p className="mt-1 text-[11px] text-dust">{have ? `In crate ${have}` : locked ? `Needs ${RANKS[item.rank]?.name}` : "\u00a0"}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" disabled={locked} onClick={() => setMsg(buy(item.id) ?? `Bought ${item.name}`)}>
                  Buy
                </Button>
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
        <p className="text-sm text-dust">Bench spiders lend the lead +1 grit each and +1 silk per web style. Tap a slot, then a spider.</p>
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
        {spiders.map((s) => (
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
  const seen = useGame((s) => s.seen);
  const spiders = useGame((s) => s.spiders);
  const season = useGame((s) => s.season);
  const career = useGame((s) => s.career);
  const earnedBadges = useGame((s) => s.earnedBadges);
  const rollYear = useGame((s) => s.rollYear);
  const [msg, setMsg] = useState<string | null>(null);
  const [circuitBoard, setCircuitBoard] = useState<CircuitEntry[]>([]);
  const [boardState, setBoardState] = useState<"loading" | "ready" | "error">("loading");
  const [boardError, setBoardError] = useState<string | null>(null);
  const next = RANKS[rank + 1];
  const board = [...spiders].sort((a, b) => spiderScore(b) - spiderScore(a));
  const current = SEASONS.find((s) => s.id === SHIPPED_SEASON) ?? SEASONS[0]!;

  useEffect(() => {
    let alive = true;
    void listCircuitBoard()
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
  }, []);

  const postScore = () => {
    setBoardState("loading");
    setBoardError(null);
    void postCircuitScore({ data: { stableName, score: points, wins, rank } })
      .then(() => listCircuitBoard())
      .then((entries) => {
        setCircuitBoard(entries);
        setBoardState("ready");
        setBoardError(null);
      })
      .catch((error: unknown) => {
        setBoardState("error");
        setBoardError(error instanceof Error && error.message === "Unauthorized" ? "Sign in to post a score." : "Could not post this score. Try again.");
      });
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Circuit</p>
        <h2 className="font-display text-3xl font-semibold">{rankName(rank)}</h2>
        <p className="text-sm text-dust">
          Year {season} · {current.name} · {wins}–{losses} on the stick
        </p>
        <p className="text-xs text-moss">
          Circuit score {points}
          {next ? ` · ${Math.max(0, next.points - points)} to ${next.name}` : " · World Stick"}
        </p>
      </header>

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
          <p className="text-xs uppercase tracking-widest text-moss">Circuit board</p>
          <Button size="sm" variant="outline" disabled={boardState === "loading"} onClick={postScore}>
            Post score
          </Button>
        </div>
        <p className="mt-1 text-xs text-mute">Post this stable's circuit score for other yards to chase.</p>
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
        </p>
      </div>

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
        <p className="mb-2 text-sm text-dust">{seen.length} species logged</p>
        <div className="grid grid-cols-2 gap-2">
          {SPECIES_LIST.map((sp) => {
            const known = seen.includes(sp.id);
            const open = isShipped(sp);
            return (
              <div
                key={sp.id}
                className={cn("rounded-xl border border-line bg-raised p-2", !known && "opacity-60")}
              >
                {known && open ? (
                  <img src={Object.values(sp.portraits)[0]} alt="" className="mb-2 h-16 w-full rounded object-cover" />
                ) : (
                  <div className="mb-2 h-16 rounded bg-ink" />
                )}
                <p className="truncate text-sm font-medium">{open ? (known ? sp.common : "???") : sp.common}</p>
                <p className="text-xs text-mute">
                  {open ? (known ? sp.latin : "Unlogged") : seasonName(sp.season ?? 2)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {rank >= 7 ? (
        <Button
          onClick={() => {
            const err = rollYear();
            setMsg(err ?? "New year. Regional again. Keep the spiders.");
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
      {(["sfx", "music", "reduceMotion"] as const).map((k) => (
        <label key={k} className="flex items-center justify-between rounded-xl bg-raised px-3 py-3">
          <span className="capitalize">{k === "sfx" ? "Sound" : k === "music" ? "Yard hum" : "Less motion"}</span>
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
