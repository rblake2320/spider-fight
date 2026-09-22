import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ITEMS, ITEM_LIST, RANKS, SLOT_LABEL, SPECIES, xpToNext } from "@/game/content";
import { useGame, formatCash, rankName } from "@/game/store";
import { canFight, effective, molt, portraitOf, STAGE_LABEL, STAT_LABEL } from "@/game/spiders";
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
  const flags = useGame((s) => s.flags);
  const lead = spiders[0];
  const next = RANKS[rank + 1];
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-auto">
      <div className="relative h-52 shrink-0">
        <img src="/images/bg/garden.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="relative z-10 flex h-full flex-col justify-end p-4">
          <p className="text-xs uppercase tracking-widest text-dust">{rankName(rank)} circuit</p>
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
        <div className="grid grid-cols-2 gap-2">
          <Action label="Hunt" onClick={() => setScreen("hunt")} />
          <Action label="Fight" onClick={() => setScreen("fight")} />
          <Action label="Train" onClick={() => setScreen("train")} />
          <Action label="Shop" onClick={() => setScreen("shop")} />
          <Action label="Team" onClick={() => setScreen("team")} />
          <Action label="Circuit" onClick={() => setScreen("career")} />
        </div>
        <Button variant="outline" onClick={collect} disabled={flags.daily === todayHint()}>
          {flags.daily === todayHint() ? "Morning purse collected" : "Collect morning purse"}
        </Button>
      </div>
    </div>
  );
}

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
  const setScreen = useGame((s) => s.setScreen);
  const rename = useGame((s) => s.renameSpider);
  const unequip = useGame((s) => s.unequip);
  const setTeam = useGame((s) => s.setTeamSlot);
  const team = useGame((s) => s.activeTeam);
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
        {spider.injury ? <p className="text-sm text-rust">{spider.injury.label}</p> : null}
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
  const [tab, setTab] = useState<ItemKind | "gear">("gear");
  const [msg, setMsg] = useState<string | null>(null);
  const kinds: Array<ItemKind | "gear"> = ["gear", "feed", "tonic", "bait", "upgrade"];
  const list = useMemo(() => {
    if (tab === "gear") return ITEM_LIST.filter((i) => i.slot);
    return ITEM_LIST.filter((i) => i.kind === tab);
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
              </div>
            </div>
          );
        })}
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
        <p className="text-sm text-dust">Best of the crate. Tap a slot, then a spider.</p>
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
  const wins = useGame((s) => s.wins);
  const seen = useGame((s) => s.seen);
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Circuit</p>
        <h2 className="font-display text-3xl font-semibold">{rankName(rank)}</h2>
        <p className="text-sm text-dust">
          {wins} stick wins · {seen.length} species logged
        </p>
      </header>
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
            <p className="tabular text-[11px] text-mute">
              {points}/{r.points} · purse ${r.purse}
            </p>
          </li>
        ))}
      </ol>
      <p className="text-sm text-mute">Later seasons add night circuits, county brackets, and species packs. This save already carries a season number.</p>
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
              ? "Jev is live. Call Jev out on the fight card — Jev hangs on the far silk and throws for itself. Other crews also pick with it. Hunts get a keep/release read."
              : "Stick mind is dark. You can still call Jev out; Jev falls back to yard instinct until the line comes up."}
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
