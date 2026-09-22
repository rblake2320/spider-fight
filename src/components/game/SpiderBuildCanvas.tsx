import { useEffect, useRef } from "react";
import { SPECIES } from "@/game/content";
import { bayLook } from "@/game/bay";
import { hideSrcOf } from "@/game/hides";
import { drawSilk, drawSpider } from "@/game/spider-draw";
import { millLookOf } from "@/game/mill-look";
import { colorsOf, effective, trainingTotal } from "@/game/spiders";
import { useGame } from "@/game/store";
import type { Spider } from "@/game/types";

/** A stable-side rendering of the same trained body, web, gear, and bay kit used during fights. */
export function SpiderBuildCanvas({ spider }: { spider: Spider }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useGame((s) => s.settings.reduceMotion);
  const hides = useGame((s) => s.hides);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const width = 320;
    const height = 150;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = "100%";
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const paint = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#171211");
      gradient.addColorStop(1, "#302016");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      const training = trainingTotal(spider);
      const stats = effective(spider);
      const look = bayLook(spider);
      const mill = millLookOf(spider.speciesId, spider.sex);
      const web = SPECIES[spider.speciesId]?.web;
      drawSilk(ctx, width * 0.16, 12, width * 0.5, height * 0.7, 0.75, web?.style ?? "orb", training, look.silk, look.sticky);
      drawSpider(ctx, {
        x: width * 0.5,
        y: height * 0.75,
        angle: 0,
        scale: (2.3 + Math.min(training, 24) * 0.035) * mill.scale,
        facing: 1,
        colors: colorsOf(spider),
        pose: "idle",
        t: reduceMotion ? 1.2 : now / 1000,
        plump: Math.min(1, stats.size / 16),
        training,
        hurtFlash: 0,
        gear: spider.gear,
        look,
        mill,
        brood: Boolean(spider.brood?.fightsLeft),
        hatchlings: spider.hatchlings,
        hideSrc: hideSrcOf(spider, hides),
      });
      if (!reduceMotion) raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [spider, reduceMotion, hides]);
  return <canvas ref={ref} aria-label={`${spider.name}'s trained yard build`} className="w-full rounded-lg border border-line" />;
}
