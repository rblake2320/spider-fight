import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SpiderMark } from "./mark";
import { Yard, Stable, SpiderDetail, TrainView, ShopView, TeamView, CareerView, SettingsView } from "./panels";
import { HuntPlay, HuntSelect } from "./HuntView";
import { FightArena, FightSelect } from "./FightView";
import { useGame } from "@/game/store";
import { unlockAudio } from "@/game/audio";
import { cn } from "@/lib/utils";
import type { Screen } from "@/game/types";

const TABS: { id: Screen; label: string }[] = [
  { id: "yard", label: "Yard" },
  { id: "stable", label: "Stable" },
  { id: "hunt", label: "Hunt" },
  { id: "fight", label: "Fight" },
  { id: "shop", label: "Shop" },
];

export function GameApp() {
  const hydrate = useGame((s) => s.hydrate);
  const screen = useGame((s) => s.screen);
  const fight = useGame((s) => s.fight);
  const result = useGame((s) => s.result);
  const reduceMotion = useGame((s) => s.settings.reduceMotion);
  const hydrated = useGame((s) => s.hydrated);

  useEffect(() => {
    void Promise.resolve(useGame.persist.rehydrate()).then(() => hydrate());
  }, [hydrate]);

  if (!hydrated) return <LoadingYard />;

  const hideNav = screen === "title" || screen === "onboard" || Boolean(fight) || Boolean(result);

  return (
    <div data-reduce-motion={reduceMotion ? "true" : undefined} className="mx-auto flex h-dvh min-h-dvh w-full max-w-lg flex-col bg-ink text-paper">
      {screen !== "title" && screen !== "onboard" && !fight && !result ? <TopBar /> : null}
      <main className="flex min-h-0 flex-1 flex-col">
        {screen === "title" ? <TitleScreen /> : null}
        {screen === "onboard" ? <Onboard /> : null}
        {screen === "yard" ? <Yard /> : null}
        {screen === "stable" ? <Stable /> : null}
        {screen === "spider" ? <SpiderDetail /> : null}
        {screen === "hunt" ? <HuntGate /> : null}
        {screen === "train" ? <TrainView /> : null}
        {screen === "shop" ? <ShopView /> : null}
        {screen === "fight" && (fight || result) ? <FightArena /> : null}
        {screen === "fight" && !fight && !result ? <FightSelect /> : null}
        {screen === "team" ? <TeamView /> : null}
        {screen === "career" ? <CareerView /> : null}
        {screen === "settings" ? <SettingsView /> : null}
      </main>
      {hideNav ? null : <NavBar />}
    </div>
  );
}

function LoadingYard() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink text-paper">
      <SpiderMark className="size-12" />
      <p className="text-xs uppercase tracking-[0.28em] text-dust">Opening the yard</p>
    </div>
  );
}

function HuntGate() {
  const habitat = useGame((s) => s.huntHabitat);
  const pending = useGame((s) => s.pendingCatch);
  if (habitat || pending) return <HuntPlay />;
  return <HuntSelect />;
}

function TopBar() {
  const cash = useGame((s) => s.cash);
  const rank = useGame((s) => s.rank);
  const setScreen = useGame((s) => s.setScreen);
  const ranks = ["Alley", "Backyard", "District", "County Fair", "State", "Regional", "National", "World"];
  return (
    <header className="safe-t flex items-center justify-between gap-2 border-b border-line px-3 py-2">
      <button type="button" onClick={() => setScreen("career")} className="flex items-center gap-2">
        <SpiderMark className="size-7" />
        <span className="text-sm text-dust">{ranks[rank] ?? "Alley"}</span>
      </button>
      <div className="flex items-center gap-3">
        <span className="tabular text-sm">${cash}</span>
        <button type="button" onClick={() => setScreen("settings")} className="text-sm text-dust">
          Menu
        </button>
      </div>
    </header>
  );
}

function NavBar() {
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const mapped: Screen = screen === "spider" ? "stable" : screen === "train" ? "yard" : screen;
  return (
    <nav className="safe-b grid grid-cols-5 border-t border-line bg-raised">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setScreen(t.id)}
          className={cn("h-14 text-xs font-medium", mapped === t.id ? "text-paper" : "text-dust")}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function TitleScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const stableName = useGame((s) => s.stableName);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <img src="/images/photos/grapple.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/30" />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-end px-6 pb-16 text-center">
        <SpiderMark className="mb-4 size-14" />
        <p className="text-xs uppercase tracking-[0.35em] text-dust">Hold the stick</p>
        <h1 className="font-display text-6xl font-semibold leading-none">Spider Fight</h1>
        <p className="mt-4 max-w-sm text-sm text-paper/80">
          Catch porch orb-weavers. Drill them. Wager cash. Lose a bout and the wraps walk off with the
          other yard.
        </p>
        <Button
          className="mt-8 w-full max-w-xs"
          size="lg"
          onClick={() => {
            unlockAudio();
            setScreen(stableName ? "yard" : "onboard");
          }}
        >
          {stableName ? "Enter the yard" : "Open a crate"}
        </Button>
      </div>
    </div>
  );
}

function Onboard() {
  const start = useGame((s) => s.startGame);
  const [name, setName] = useState("Porch Crew");
  return (
    <div className="flex min-h-dvh flex-col justify-end gap-4 bg-ink p-6 pb-16">
      <p className="text-xs uppercase tracking-widest text-dust">New stable</p>
      <h1 className="font-display text-4xl font-semibold">Name the yard</h1>
      <p className="text-sm text-dust">
        You found one on the eave this morning — banded legs, rust abdomen, already mean.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={22}
        className="h-12 rounded-lg border border-line bg-raised px-3 font-display text-xl text-paper outline-none"
      />
      <Button
        size="lg"
        onClick={() => {
          unlockAudio();
          start(name);
        }}
      >
        Take the stick
      </Button>
    </div>
  );
}
