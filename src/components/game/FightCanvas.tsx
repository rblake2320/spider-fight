import { useEffect, useRef } from "react";
import { bobPos, stepFight, type StickFight } from "@/game/combat";
import { drawParticles, drawSilk, drawSpider, drawStick } from "@/game/spider-draw";

export function FightCanvas({ fight, className }: { fight: StickFight; className?: string }) {
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const raw = (now - last) / 1000;
      last = now;
      const dt = Math.min(raw, 0.1);
      const f = fightRef.current;
      stepFight(f, dt);

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

      const shx = (Math.random() - 0.5) * f.shake * 10;
      const shy = (Math.random() - 0.5) * f.shake * 8;
      ctx.save();
      ctx.translate(shx, shy);

      if (bg.current) {
        const im = bg.current;
        const scale = Math.max(w / im.width, h / im.height);
        const dw = im.width * scale;
        const dh = im.height * scale;
        ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.fillStyle = "rgba(12,8,6,0.28)";
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = "#1a1410";
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

      drawSilk(ctx, pAttach, stickY + 4, px, py - 8, 0.85);
      drawSilk(ctx, eAttach, stickY + 4, ex, ey - 8, 0.85);

      const scale = Math.min(w, h) / 210;
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
        t: now / 1000,
        plump: plumpP,
        hurtFlash: p.hurtFlash,
      });
      drawSpider(ctx, {
        x: ex,
        y: ey,
        angle: e.angle * 0.5,
        scale: scale * (0.85 + plumpE * 0.25),
        facing: -1,
        colors: e.colors,
        pose: e.pose,
        t: now / 1000 + 1.7,
        plump: plumpE,
        hurtFlash: e.hurtFlash,
      });

      f.particles.forEach((pt) => {
        pt.x = pt.x; // already pixel-ish from burst in fighter space — remap if needed
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
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={className} style={{ touchAction: "none" }} />;
}
