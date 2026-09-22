import { useEffect, useRef } from "react";
import { bobPos, stepFight, type StickFight } from "@/game/combat";
import { drawParticles, drawSilk, drawSpider, drawStick } from "@/game/spider-draw";

// A fight can be rendered by more than one canvas briefly during development
// remounts. The simulation belongs to the shared fight, so exactly one canvas
// owns its animation loop at a time. Store this on globalThis so a Vite hot
// reload cannot leave an older module's loop advancing the same fight.
const simulationOwners = (() => {
  const host = globalThis as typeof globalThis & {
    __spiderFightSimulationOwners?: WeakMap<StickFight, symbol>;
  };
  return host.__spiderFightSimulationOwners ??= new WeakMap<StickFight, symbol>();
})();

export function FightCanvas({ fight, className, reduceMotion = false }: { fight: StickFight; className?: string; reduceMotion?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bg = useRef<HTMLImageElement | null>(null);
  const fightRef = useRef(fight);
  fightRef.current = fight;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/images/bg/arena.jpg";
    img.onload = () => {
      bg.current = img;
    };
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const fight = fightRef.current;
    if (simulationOwners.has(fight)) return;
    const owner = Symbol("fight-canvas");
    simulationOwners.set(fight, owner);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      simulationOwners.delete(fight);
      return;
    }
    let raf = 0;
    const tick = window.setInterval(() => {
      if (simulationOwners.get(fight) === owner) stepFight(fightRef.current, 0.05);
    }, 75);
    const loop = (now: number) => {
      if (simulationOwners.get(fight) !== owner) return;
      const f = fightRef.current;

      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 360;
      const h = parent?.clientHeight ?? 320;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const shx = reduceMotion ? 0 : (Math.random() - 0.5) * f.shake * 10;
      const shy = reduceMotion ? 0 : (Math.random() - 0.5) * f.shake * 8;
      ctx.save();
      ctx.translate(shx, shy);

      if (bg.current) {
        const im = bg.current;
        const scale = Math.max(w / im.width, h / im.height);
        const dw = im.width * scale;
        const dh = im.height * scale;
        ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.fillStyle = "rgba(12,8,6,0.12)";
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = "#3a2a1c";
        ctx.fillRect(0, 0, w, h);
      }

      const stickY = h * 0.28;
      drawStick(ctx, w, stickY);

      const p = f.player;
      const e = f.enemy;
      const pb = bobPos(p);
      const eb = bobPos(e);
      const px = pb.x * w;
      const py = stickY + pb.y * h * 0.55;
      const ex = eb.x * w;
      const ey = stickY + eb.y * h * 0.55;
      const pAttach = p.attachX * w;
      const eAttach = e.attachX * w;
      const trainedP = Object.values(p.spider.trained).reduce((sum, value) => sum + value, 0);
      const trainedE = Object.values(e.spider.trained).reduce((sum, value) => sum + value, 0);

      drawSilk(ctx, pAttach, stickY + 4, px, py - 8, 0.85, p.web.style, trainedP);
      drawSilk(ctx, eAttach, stickY + 4, ex, ey - 8, 0.85, e.web.style, trainedE);

      const scale = Math.min(w, h) / 140;
      const plumpP = Math.min(1, p.stats.size / 16);
      const plumpE = Math.min(1, e.stats.size / 16);

      drawSpider(ctx, {
        x: px,
        y: py,
        angle: p.angle * 0.5,
        scale: scale * (0.85 + plumpP * 0.25),
        facing: 1,
        colors: p.colors,
        pose: p.pose,
        t: reduceMotion ? 0 : now / 1000,
        plump: plumpP,
        training: trainedP,
        hurtFlash: p.hurtFlash,
        mark: p.spider.speciesId === "widow" ? "hourglass" : undefined,
        gear: p.spider.gear,
      });
      drawSpider(ctx, {
        x: ex,
        y: ey,
        angle: e.angle * 0.5,
        scale: scale * (0.85 + plumpE * 0.25),
        facing: -1,
        colors: e.colors,
        pose: e.pose,
        t: reduceMotion ? 1.7 : now / 1000 + 1.7,
        plump: plumpE,
        training: trainedE,
        hurtFlash: e.hurtFlash,
        mark: e.spider.speciesId === "widow" ? "hourglass" : undefined,
        gear: e.spider.gear,
      });

      // particles were spawned in normalized-ish coords; convert on draw
      drawParticles(
        ctx,
        f.particles.map((pt) => ({
          ...pt,
          x: pt.x > 2 ? pt.x : pt.x * w,
          y: pt.y > 2 ? pt.y : stickY + pt.y * h * 0.55,
        })),
      );

      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
      if (simulationOwners.get(fight) === owner) {
        simulationOwners.delete(fight);
      }
    };
  }, [reduceMotion]);

  return <canvas ref={ref} className={className} style={{ touchAction: "none" }} />;
}
