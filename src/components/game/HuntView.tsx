import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HABITATS, ITEM_LIST, ITEMS, RANKS, SPECIES } from "@/game/content";
import { isShipped, seasonName } from "@/game/catalog";
import { tonightSky } from "@/game/sky";
import { playCatch } from "@/game/audio";
import { useGame } from "@/game/store";
import { portraitOf, STAGE_LABEL } from "@/game/spiders";
import { appraiseCatch } from "@/lib/jev";
import { cn } from "@/lib/utils";

export function HuntSelect() {
  const rank = useGame((s) => s.rank);
  const cash = useGame((s) => s.cash);
  const huntsLeft = useGame((s) => s.huntsLeft);
  const startHunt = useGame((s) => s.startHunt);
  const huntBait = useGame((s) => s.huntBait);
  const inventory = useGame((s) => s.inventory);
  const buy = useGame((s) => s.buy);
  const setHuntBait = useGame((s) => s.setHuntBait);
  const bait = ITEM_LIST.filter((item) => item.kind === "bait" && isShipped(item) && item.rank <= rank);
  const [err, setErr] = useState<string | null>(null);
  const sky = tonightSky();
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-dust">Hunt</p>
        <h2 className="font-display text-3xl font-semibold">Walk the web</h2>
        <p className="mt-1 text-sm text-dust">{huntsLeft} lights left tonight.</p>
        <p className="mt-1 text-xs text-moss">{sky.name}. {sky.blurb}</p>
        <p className="mt-1 text-xs text-moss">{huntBait ? `${ITEMS[huntBait]?.name} set for this hunt.` : "No bait set."}</p>
      </header>
      <section className="rounded-xl bg-raised p-3">
        <p className="text-xs uppercase tracking-widest text-dust">Hunt shelf · ${cash}</p>
        <div className="mt-2 grid gap-2">
          {bait.map((item) => {
            const have = inventory[item.id] ?? 0;
            return (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-panel p-2">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-[11px] text-dust">{item.blurb}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" disabled={cash < item.price} onClick={() => setErr(buy(item.id))}>
                    Buy ${item.price}
                  </Button>
                  {have ? (
                    <Button size="sm" variant={huntBait === item.id ? "rust" : "outline"} onClick={() => setErr(setHuntBait(item.id))}>
                      {huntBait === item.id ? "Set" : `Set ${have}`}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {HABITATS.map((h) => {
        const coming = !isShipped(h);
        const locked = coming || rank < h.rank;
        return (
          <button
            key={h.id}
            type="button"
            disabled={locked}
            onClick={() => setErr(startHunt(h.id))}
            className="overflow-hidden rounded-xl border border-line text-left disabled:opacity-40"
          >
            <div className="relative h-28">
              <img src={h.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3">
                <p className="font-display text-xl">{h.name}</p>
                <p className="text-xs text-dust">
                  {coming
                    ? `${seasonName(h.season ?? 2)} — not open yet`
                    : locked
                      ? `Needs ${RANKS[h.rank]?.name ?? `rank ${h.rank}`}`
                      : h.cost
                        ? `$${h.cost} trip`
                        : "Free walk"}{" "}
                  · {h.blurb}
                </p>
                <p className="mt-1 line-clamp-1 text-[11px] text-moss">
                  On this line: {h.species.map((id) => SPECIES[id]?.common ?? id).join(" · ")}
                </p>
              </div>
            </div>
          </button>
        );
      })}
      {err ? <p className="text-sm text-rust">{err}</p> : null}
    </div>
  );
}

export function HuntPlay() {
  const habitatId = useGame((s) => s.huntHabitat);
  const activeBait = useGame((s) => s.activeBait);
  const reduceMotion = useGame((s) => s.settings.reduceMotion);
  const pending = useGame((s) => s.pendingCatch);
  const resolve = useGame((s) => s.resolveHuntTap);
  const keep = useGame((s) => s.keepCatch);
  const release = useGame((s) => s.releaseCatch);
  const leaveHunt = useGame((s) => s.leaveHunt);
  const hab = HABITATS.find((h) => h.id === habitatId);
  const [phase, setPhase] = useState<"seek" | "window" | "miss" | "caught">("seek");
  const [msg, setMsg] = useState("Watch the eave.");
  const t = useRef(0);
  const [meter, setMeter] = useState(0);
  const [read, setRead] = useState<string | null>(null);
  const appraised = useRef<string | null>(null);

  useEffect(() => {
    if (pending) setPhase("caught");
  }, [pending]);

  useEffect(() => {
    if (!pending || !hab || appraised.current === pending.id) return;
    appraised.current = pending.id;
    const spec = SPECIES[pending.speciesId];
    void appraiseCatch({
      data: {
        name: pending.name,
        species: spec?.common ?? pending.speciesId,
        latin: spec?.latin,
        rarity: spec?.rarity ?? "common",
        stage: pending.stage,
        habitat: hab.name,
        rank: useGame.getState().rank,
        stats: { ...pending.base },
      },
    })
      .then((res) => {
        if (!res || !res.ok) return;
        setRead(`${res.blurb}. If you keep it, drill ${res.train}.`);
      })
      .catch(() => undefined);
  }, [pending, hab]);

  useEffect(() => {
    if (phase !== "seek" && phase !== "window") return;
    if (reduceMotion) {
      setMeter(0.72);
      setPhase("window");
      return;
    }
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let windowOn = false;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      elapsed += dt;
      t.current = elapsed;
      if (!windowOn && elapsed > 1.1) {
        windowOn = true;
        setPhase("window");
      }
      if (windowOn) {
        const m = (Math.sin(elapsed * 3.2) * 0.5 + 0.5);
        setMeter(m);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduceMotion]);

  if (!hab) return null;

  if (phase === "caught" && pending) {
    return (
      <div className="relative flex h-full flex-col justify-end">
        <img src={hab.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-ink/70" />
        <div className="relative z-10 flex flex-col items-center gap-3 p-5 pb-10">
          <img src={portraitOf(pending)} alt="" className="size-40 rounded-2xl object-cover shadow-lg" />
          <p className="text-xs uppercase tracking-widest text-dust">{SPECIES[pending.speciesId]?.rarity}</p>
          <h3 className="font-display text-3xl">{pending.name}</h3>
          <p className="text-sm text-dust">
            {SPECIES[pending.speciesId]?.common} · {STAGE_LABEL[pending.stage]}
          </p>
          <p className="text-center text-sm text-mute">{SPECIES[pending.speciesId]?.blurb}</p>
          {read ? <p className="text-center text-sm text-paper/90">{read}</p> : null}
          <div className="flex w-full gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                release();
                leaveHunt();
              }}
            >
              Let it go
            </Button>
            <Button
              className="flex-1"
              variant="rust"
              onClick={() => {
                const err = keep();
                if (err) setMsg(err);
              }}
            >
              Keep
            </Button>
          </div>
          <p className="text-xs text-rust">{msg !== "Watch the eave." ? msg : ""}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <img src={hab.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-ink/35" />
      <div className="relative z-10 flex h-full flex-col p-4">
        <p className="text-xs uppercase tracking-widest text-dust">{hab.name}</p>
        {activeBait ? <p className="mt-1 text-xs text-moss">{ITEMS[activeBait]?.name} is on the line.</p> : null}
        <h2 className="font-display text-2xl">{phase === "miss" ? "Gone" : "In the silk"}</h2>
        <p className="text-sm text-paper/80" aria-live="polite">{msg}</p>
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label={phase === "window" ? "Catch spider when the rust bead swells" : phase === "miss" ? "Leave hunt" : "Wait for the catch window"}
            className={cn(
              "relative size-40 rounded-full border-2 border-paper/50 bg-ink/30",
              phase === "window" && "border-rust",
            )}
            onClick={() => {
              if (phase === "miss") {
                leaveHunt();
                return;
              }
              const quality = phase === "window" ? 1 - Math.abs(meter - 0.72) : 0.15;
              const got = resolve(quality);
              if (got) {
                playCatch();
                setPhase("caught");
              } else {
                setPhase("miss");
                setMsg("It dropped the line. Walk another eave.");
              }
            }}
          >
            <span className="absolute inset-4 rounded-full border border-paper/20" />
            <span
              className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rust shadow-[0_0_18px_rgba(196,92,56,0.9)]"
              style={{ transform: `translate(-50%, -50%) scale(${0.7 + meter * 1.6})` }}
            />
          </button>
        </div>
        <p className="mb-8 text-center text-xs text-dust" aria-live="polite">
          {phase === "window" ? "Tap when the rust bead swells" : phase === "miss" ? "Tap to leave" : "Wait for the twitch"}
        </p>
      </div>
    </div>
  );
}
