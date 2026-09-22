import { useEffect, useRef } from "react";
import { bobPos, stepFight, type StickFight } from "@/game/combat";
import { bayLook } from "@/game/bay";
import { hideSrcOf } from "@/game/hides";
import { drawParticles, drawSilk, drawSpider, drawStick, silkTaut } from "@/game/spider-draw";
import { tonightSky } from "@/game/sky";
import { useGame } from "@/game/store";

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

const STEP = 1 / 60;

function paintArena(ctx: CanvasRenderingContext2D, w: number, h: number, bg: HTMLImageElement | null): void {
  if (bg) {
    const scale = Math.max(w / bg.width, h / bg.height);
    const dw = bg.width * scale;
    const dh = bg.height * scale;
    ctx.drawImage(bg, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = tonightSky().tint;
  ctx.fillRect(0, 0, w, h);
  const veil = ctx.createLinearGradient(0, 0, 0, h);
  veil.addColorStop(0, "rgba(12, 8, 6, 0.28)");
  veil.addColorStop(0.35, "rgba(12, 8, 6, 0)");
  veil.addColorStop(1, "rgba(8, 5, 3, 0.45)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, w, h);
}

export function FightCanvas({ fight, className, reduceMotion = false }: { fight: StickFight; className?: string; reduceMotion?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bg = useRef<HTMLImageElement | null>(null);
  const fightRef = useRef(fight);
  fightRef.current = fight;
  const hides = useGame((s) => s.hides);
  const hidesRef = useRef(hides);
  hidesRef.current = hides;

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
    let last = 0;
    let acc = 0;
    const loop = (now: number) => {
      if (simulationOwners.get(fight) !== owner) return;
      const f = fightRef.current;
      if (!last) last = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      while (acc >= STEP) {
        stepFight(f, STEP);
        acc -= STEP;
      }

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

      const trauma = reduceMotion ? 0 : f.shake;
      const mag = trauma * trauma;
      const clock = now / 1000;
      const shx = mag * 16 * Math.sin(clock * 47);
      const shy = mag * 11 * Math.sin(clock * 41 + 1.3);
      const rot = mag * 0.045 * Math.sin(clock * 29);
      ctx.save();
      ctx.translate(w / 2 + shx, h / 2 + shy);
      ctx.rotate(rot);
      ctx.scale(1 + mag * 0.05, 1 + mag * 0.05);
      ctx.translate(-w / 2, -h / 2);

      paintArena(ctx, w, h, bg.current);

      const stickY = h * 0.26;
      drawStick(ctx, w, stickY);

      const p = f.player;
      const e = f.enemy;
      const pb = bobPos(p);
      const eb = bobPos(e);
      const px = pb.x * w;
      const py = stickY + pb.y * h * 0.52;
      const ex = eb.x * w;
      const ey = stickY + eb.y * h * 0.52;
      const pAttach = p.attachX * w;
      const eAttach = e.attachX * w;
      const trainedP = Object.values(p.spider.trained).reduce((sum, value) => sum + value, 0);
      const trainedE = Object.values(e.spider.trained).reduce((sum, value) => sum + value, 0);
      const lookP = bayLook(p.spider);
      const lookE = bayLook(e.spider);
      const hides = hidesRef.current;
      const t = reduceMotion ? 0 : clock;

      drawSilk(ctx, pAttach, stickY + 4, px, py - 8, silkTaut(p.angle, p.aVel, p.pose), p.web.style, trainedP, lookP.silk, lookP.sticky);
      drawSilk(ctx, eAttach, stickY + 4, ex, ey - 8, silkTaut(e.angle, e.aVel, e.pose), e.web.style, trainedE, lookE.silk, lookE.sticky);

      const scale = Math.min(w, h) / 128;
      const plumpP = Math.min(1, p.stats.size / 16);
      const plumpE = Math.min(1, e.stats.size / 16);

      drawSpider(ctx, {
        x: px,
        y: py,
        angle: p.angle,
        scale: scale * (0.88 + plumpP * 0.28),
        facing: 1,
        colors: p.colors,
        pose: p.pose,
        prevPose: p.prevPose,
        poseT: p.poseT,
        t,
        plump: plumpP,
        training: trainedP,
        hurtFlash: p.hurtFlash,
        mark: p.spider.speciesId === "widow" ? "hourglass" : undefined,
        gear: p.spider.gear,
        look: lookP,
        brood: Boolean(p.spider.brood?.fightsLeft),
        hatchlings: p.spider.hatchlings,
        hideSrc: hideSrcOf(p.spider, hides),
        spin: p.aVel,
      });
      drawSpider(ctx, {
        x: ex,
        y: ey,
        angle: e.angle,
        scale: scale * (0.88 + plumpE * 0.28),
        facing: -1,
        colors: e.colors,
        pose: e.pose,
        prevPose: e.prevPose,
        poseT: e.poseT,
        t: reduceMotion ? 1.7 : clock + 1.7,
        plump: plumpE,
        training: trainedE,
        hurtFlash: e.hurtFlash,
        mark: e.spider.speciesId === "widow" ? "hourglass" : undefined,
        gear: e.spider.gear,
        look: lookE,
        brood: Boolean(e.spider.brood?.fightsLeft),
        hatchlings: e.spider.hatchlings,
        hideSrc: hideSrcOf(e.spider, hides),
        spin: e.aVel,
      });

      drawParticles(
        ctx,
        f.particles.map((pt) => ({
          ...pt,
          x: pt.x > 2 ? pt.x : pt.x * w,
          y: pt.y > 2 ? pt.y : stickY + pt.y * h * 0.52,
        })),
      );

      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (simulationOwners.get(fight) === owner) {
        simulationOwners.delete(fight);
      }
    };
  }, [reduceMotion]);

  return <canvas ref={ref} className={className} style={{ touchAction: "none" }} />;
}
