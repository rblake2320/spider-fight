import type { Gear, MorphColors, MoveId, WebStyle } from "./types";
import type { BayLook } from "./bay";
import { millLookOf, type MillLook } from "./mill-look";

export type DrawPose = MoveId | "idle" | "hurt" | "ko" | "intro";

export type SpiderDraw = {
  x: number;
  y: number;
  angle: number;
  scale: number;
  facing: 1 | -1;
  colors: MorphColors;
  pose: DrawPose;
  prevPose?: DrawPose;
  poseT?: number;
  t: number;
  plump: number;
  training: number;
  hurtFlash: number;
  mark?: "hourglass";
  gear?: Gear;
  look?: BayLook;
  brood?: boolean;
  hatchlings?: number;
  /** Cooked hide picture. Swings and poses with the mill. */
  hideSrc?: string;
  spin?: number;
  mill?: MillLook;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

type Leg = { lift: number; sweep: number; bend: number; z: number; pair: number };

export function poseBlend(poseT: number, pose: DrawPose): number {
  const dur = pose === "hurt" || pose === "ko" ? 0.1 : pose === "feint" ? 0.2 : pose === "intro" ? 0.28 : 0.14;
  const t = Math.max(0, Math.min(1, poseT / dur));
  return 1 - (1 - t) ** 3;
}

function mixLeg(a: Leg, b: Leg, t: number): Leg {
  return {
    lift: lerp(a.lift, b.lift, t),
    sweep: lerp(a.sweep, b.sweep, t),
    bend: lerp(a.bend, b.bend, t),
    z: t < 0.5 ? a.z : b.z,
    pair: b.pair,
  };
}

export function poseLegs(pose: DrawPose, t: number, mill?: MillLook): Leg[] {
  const spread = mill?.legSpread ?? 1;
  const idle = (i: number): Leg => {
    const side = i < 4 ? -1 : 1;
    const pair = i % 4;
    const sweep0 = [-1.05, -0.42, 0.48, 1.12][pair]! * spread;
    const gait = Math.sin(t * 3.4 + i * 0.95) * 0.055;
    return {
      lift: 0.22 + pair * 0.045 + gait,
      sweep: sweep0 * side + Math.sin(t * 1.6 + i) * 0.03,
      bend: 0.78 + Math.sin(t * 2.2 + i) * 0.05,
      z: pair === 0 || pair === 3 ? 1 : 0,
      pair,
    };
  };
  const base = Array.from({ length: 8 }, (_, i) => idle(i));
  const pulse = Math.sin(t * 7) * 0.1;
  if (pose === "intro") {
    base.forEach((l, i) => {
      const pair = i % 4;
      l.lift += pair <= 1 ? 0.32 : 0.08;
      l.sweep += pair <= 1 ? 0.4 : -0.12;
      l.bend -= 0.08;
    });
  } else if (pose === "lunge") {
    base.forEach((l, i) => {
      const pair = i % 4;
      if (pair <= 1) {
        l.sweep += 0.95;
        l.lift += 0.42;
        l.bend -= 0.32;
      } else {
        l.sweep -= 0.48;
        l.lift -= 0.04;
        l.bend += 0.22;
      }
    });
  } else if (pose === "grapple") {
    base.forEach((l, i) => {
      const pair = i % 4;
      l.lift += pair <= 1 ? 0.62 : 0.18;
      l.sweep += pair <= 1 ? 1.05 : -0.22;
      l.bend -= 0.28;
    });
  } else if (pose === "feint") {
    const snap = Math.sin(t * 16);
    base.forEach((l) => {
      l.sweep += snap * 0.42 - 0.18;
      l.lift += Math.abs(snap) * 0.18;
      l.bend += snap * 0.12;
    });
  } else if (pose === "brace") {
    base.forEach((l) => {
      l.lift -= 0.18;
      l.bend += 0.38;
      l.sweep *= 0.62;
    });
  } else if (pose === "yank") {
    base.forEach((l, i) => {
      l.bend += 0.16 + pulse;
      if (i % 4 >= 2) l.sweep += 0.32;
      l.lift += Math.abs(pulse) * 0.2;
    });
  } else if (pose === "drop") {
    base.forEach((l) => {
      l.lift += 0.48;
      l.bend += 0.22;
      l.sweep *= 0.82;
    });
  } else if (pose === "hurt") {
    base.forEach((l, i) => {
      l.lift += 0.28;
      l.sweep += (i < 4 ? -1 : 1) * 0.55;
      l.bend += 0.28;
    });
  } else if (pose === "ko") {
    base.forEach((l) => {
      l.lift += 0.55;
      l.bend += 0.45;
      l.sweep *= 0.45;
    });
  }
  return base;
}

function posedLegs(pose: DrawPose, prev: DrawPose | undefined, poseT: number, t: number, mill?: MillLook): Leg[] {
  const next = poseLegs(pose, t, mill);
  if (!prev || prev === pose) return next;
  const u = poseBlend(poseT, pose);
  if (u >= 1) return next;
  const from = poseLegs(prev, t, mill);
  return next.map((leg, i) => mixLeg(from[i]!, leg, u));
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  colors: MorphColors,
  originX: number,
  originY: number,
  leg: Leg,
  scale: number,
  facing: number,
  look?: BayLook,
  mill?: MillLook,
): void {
  const thick = (look?.legs ?? 1) * (mill?.legThick ?? 1);
  const long = (look?.length ?? 1) * (mill?.legLen ?? 1);
  const crab = mill && (mill.abdShape === "crab" || mill.eyes === "huntsman") && leg.pair <= 1 ? 1.32 : 1;
  const len1 = 22 * scale * long * crab;
  const len2 = 20 * scale * long * crab;
  const len3 = 16 * scale * long;
  const ang0 = -Math.PI / 2 + leg.sweep * facing + (facing < 0 ? Math.PI : 0);
  const x0 = originX;
  const y0 = originY;
  const a1 = ang0 + (facing > 0 ? -leg.lift : leg.lift);
  const x1 = x0 + Math.cos(a1) * len1;
  const y1 = y0 + Math.sin(a1) * len1;
  const a2 = a1 + (facing > 0 ? leg.bend : -leg.bend);
  const x2 = x1 + Math.cos(a2) * len2;
  const y2 = y1 + Math.sin(a2) * len2;
  const a3 = a2 + (facing > 0 ? 0.35 : -0.35);
  const x3 = x2 + Math.cos(a3) * len3;
  const y3 = y2 + Math.sin(a3) * len3;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const segs = [
    [x0, y0, x1, y1, 3.1 * scale * thick],
    [x1, y1, x2, y2, 2.3 * scale * thick],
    [x2, y2, x3, y3, 1.4 * scale * thick],
  ] as const;
  segs.forEach((s, i) => {
    ctx.beginPath();
    ctx.moveTo(s[0], s[1]);
    ctx.lineTo(s[2], s[3]);
    ctx.strokeStyle = i % 2 === 0 ? colors.legDark : colors.legLight;
    ctx.lineWidth = s[4];
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s[0], s[1]);
    ctx.lineTo(s[2], s[3]);
    ctx.strokeStyle = shade(i % 2 === 0 ? colors.legDark : colors.legLight, 28);
    ctx.lineWidth = s[4] * 0.35;
    ctx.stroke();
  });
  if ((mill?.bands ?? 0) > 0.4) {
    ctx.strokeStyle = colors.legLight;
    ctx.lineWidth = 1.1 * scale * thick;
    ctx.globalAlpha = 0.7;
    for (const [ax, ay, bx, by] of [
      [x0, y0, x1, y1],
      [x1, y1, x2, y2],
    ] as const) {
      const px = ax + (bx - ax) * 0.42;
      const py = ay + (by - ay) * 0.42;
      ctx.beginPath();
      ctx.arc(px, py, 1.35 * scale * thick, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if ((mill?.hair ?? 0) > 0.08) {
    ctx.strokeStyle = shade(colors.legLight, 18);
    ctx.lineWidth = 0.45 * scale;
    ctx.globalAlpha = 0.4 + mill!.hair * 0.4;
    const ticks = 2 + Math.floor(mill!.hair * 3);
    for (const [ax, ay, bx, by] of segs) {
      for (let i = 1; i <= ticks; i++) {
        const u = i / (ticks + 1);
        const px = ax + (bx - ax) * u;
        const py = ay + (by - ay) * u;
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * 3.2 * scale * mill!.hair;
        const ny = (dx / len) * 3.2 * scale * mill!.hair;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + nx, py + ny);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  if (mill?.tufts) {
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 1.05 * scale;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      const a = a1 + (i - 2) * 0.38;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + Math.cos(a) * 5.2 * scale, y1 + Math.sin(a) * 5.2 * scale);
      ctx.stroke();
    }
  }
  // tarsus tip + claw
  ctx.beginPath();
  ctx.arc(x3, y3, 0.9 * scale, 0, Math.PI * 2);
  ctx.fillStyle = colors.legDark;
  ctx.fill();
  ctx.strokeStyle = shade(colors.fang, 10);
  ctx.lineWidth = 0.7 * scale;
  ctx.beginPath();
  ctx.moveTo(x3, y3);
  ctx.lineTo(x3 + Math.cos(a3 + 0.5) * 3.2 * scale, y3 + Math.sin(a3 + 0.5) * 3.2 * scale);
  ctx.stroke();
  if (look?.chrome) {
    ctx.fillStyle = "rgba(214, 196, 148, 0.9)";
    ctx.beginPath();
    ctx.arc(x1, y1, 1.15 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, 0.95 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function abdomenPath(ctx: CanvasRenderingContext2D, shape: MillLook["abdShape"], w: number, h: number): void {
  ctx.beginPath();
  if (shape === "triangle") {
    ctx.moveTo(0, -h);
    ctx.lineTo(w * 0.95, h * 0.42);
    ctx.lineTo(0, h);
    ctx.lineTo(-w * 0.95, h * 0.42);
    ctx.closePath();
  } else if (shape === "crab") {
    ctx.ellipse(0, 0, w * 1.32, h * 0.62, 0, 0, Math.PI * 2);
  } else if (shape === "star") {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? Math.max(w, h) : Math.min(w, h) * 0.72;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * (h / w);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape === "long") {
    ctx.ellipse(0, 0, w * 0.62, h * 1.28, 0, 0, Math.PI * 2);
  } else if (shape === "bulb") {
    ctx.ellipse(0, h * 0.04, w * 1.08, h * 1.02, 0, 0, Math.PI * 2);
  } else if (shape === "flat") {
    ctx.ellipse(0, 0, w * 1.18, h * 0.68, 0, 0, Math.PI * 2);
  } else if (shape === "drop") {
    ctx.ellipse(0, h * 0.08, w * 0.9, h * 0.92, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
  }
}

function paintAbdMark(
  ctx: CanvasRenderingContext2D,
  mill: MillLook,
  colors: MorphColors,
  abdW: number,
  abdH: number,
  scale: number,
): void {
  const mark = mill.mark;
  if (mark === "hourglass") {
    ctx.fillStyle = colors.folium;
    ctx.beginPath();
    ctx.moveTo(0, -abdH * 0.42);
    ctx.lineTo(abdW * 0.34, -abdH * 0.04);
    ctx.lineTo(-abdW * 0.34, -abdH * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, abdH * 0.48);
    ctx.lineTo(abdW * 0.34, abdH * 0.1);
    ctx.lineTo(-abdW * 0.34, abdH * 0.1);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (mark === "cross") {
    ctx.strokeStyle = colors.speckle;
    ctx.lineWidth = 2.2 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -abdH * 0.55);
    ctx.lineTo(0, abdH * 0.55);
    ctx.moveTo(-abdW * 0.38, -abdH * 0.12);
    ctx.lineTo(abdW * 0.38, -abdH * 0.12);
    ctx.stroke();
    return;
  }
  if (mark === "clover") {
    ctx.fillStyle = `${colors.folium}dd`;
    for (const [x, y] of [
      [0, -abdH * 0.28],
      [-abdW * 0.28, 0],
      [abdW * 0.28, 0],
      [0, abdH * 0.28],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(x, y, abdW * 0.22, abdH * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (mark === "catface") {
    ctx.fillStyle = colors.folium;
    ctx.beginPath();
    ctx.moveTo(-abdW * 0.22, -abdH * 0.72);
    ctx.lineTo(-abdW * 0.02, -abdH * 0.18);
    ctx.lineTo(-abdW * 0.42, -abdH * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(abdW * 0.22, -abdH * 0.72);
    ctx.lineTo(abdW * 0.02, -abdH * 0.18);
    ctx.lineTo(abdW * 0.42, -abdH * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `${colors.folium}aa`;
    ctx.beginPath();
    ctx.ellipse(0, abdH * 0.12, abdW * 0.22, abdH * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (mark === "marble") {
    ctx.fillStyle = `${colors.folium}cc`;
    ctx.beginPath();
    ctx.ellipse(0, 0, abdW * 0.42, abdH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.speckle;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(-abdW * 0.18, -abdH * 0.2, abdW * 0.18, abdH * 0.16, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  if (mark === "arrow") {
    ctx.fillStyle = `${colors.folium}bb`;
    ctx.beginPath();
    ctx.moveTo(0, -abdH * 0.7);
    ctx.lineTo(abdW * 0.28, abdH * 0.35);
    ctx.lineTo(0, abdH * 0.15);
    ctx.lineTo(-abdW * 0.28, abdH * 0.35);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (mark === "spines") {
    ctx.fillStyle = colors.folium;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI - 0.2;
      const x = Math.cos(a) * abdW * 1.15;
      const y = Math.sin(a) * abdH * 0.15 - abdH * 0.05;
      ctx.beginPath();
      ctx.moveTo(x * 0.4, y);
      ctx.lineTo(x, y - abdH * 0.55);
      ctx.lineTo(x * 0.55, y + abdH * 0.08);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = colors.speckle;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(((i - 2) / 2.4) * abdW * 0.7, 0, 1.4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (mark === "star") {
    ctx.fillStyle = colors.speckle;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? abdW * 0.42 : abdW * 0.16;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * (abdH / abdW);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (mark === "bands") {
    ctx.strokeStyle = colors.folium;
    ctx.lineWidth = 2.4 * scale;
    ctx.globalAlpha = 0.8;
    for (const y of [-0.38, -0.08, 0.22, 0.48]) {
      ctx.beginPath();
      ctx.moveTo(-abdW * 0.72, abdH * y);
      ctx.quadraticCurveTo(0, abdH * (y + 0.06), abdW * 0.72, abdH * y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (mark === "stripe") {
    ctx.fillStyle = `${colors.folium}cc`;
    ctx.beginPath();
    ctx.ellipse(0, 0, abdW * 0.18, abdH * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (mark === "chevron") {
    ctx.fillStyle = colors.speckle;
    ctx.beginPath();
    ctx.moveTo(0, -abdH * 0.35);
    ctx.lineTo(abdW * 0.38, abdH * 0.05);
    ctx.lineTo(0, -abdH * 0.08);
    ctx.lineTo(-abdW * 0.38, abdH * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, abdH * 0.32, abdW * 0.22, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (mark === "spots") {
    ctx.fillStyle = colors.speckle;
    ctx.globalAlpha = 0.7;
    for (const [x, y, r] of [
      [0, -0.2, 0.18],
      [-0.32, 0.15, 0.14],
      [0.32, 0.15, 0.14],
      [0, 0.42, 0.12],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(abdW * x, abdH * y, abdW * r, abdH * r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (mark === "debris") {
    ctx.fillStyle = shade(colors.folium, -10);
    for (const [x, y, rw, rh, rot] of [
      [0, -0.35, 0.22, 0.18, -0.4],
      [-0.22, 0.05, 0.18, 0.22, 0.5],
      [0.2, 0.22, 0.16, 0.2, -0.2],
      [0, 0.48, 0.28, 0.12, 0.1],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(abdW * x, abdH * y, abdW * rw, abdH * rh, rot, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (mark === "none" || mark === "violin" || mark === "knobs") return;
  ctx.beginPath();
  ctx.moveTo(0, -abdH * 0.72);
  ctx.bezierCurveTo(abdW * 0.28, -abdH * 0.2, abdW * 0.22, abdH * 0.3, 0, abdH * 0.7);
  ctx.bezierCurveTo(-abdW * 0.22, abdH * 0.3, -abdW * 0.28, -abdH * 0.2, 0, -abdH * 0.72);
  ctx.fillStyle = `${colors.folium}cc`;
  ctx.fill();
}

function paintEyes(
  ctx: CanvasRenderingContext2D,
  mill: MillLook,
  colors: MorphColors,
  cephW: number,
  cephH: number,
  scale: number,
  facing: number,
  pose: DrawPose,
  look?: BayLook,
): void {
  ctx.fillStyle = "#1a100c";
  const set = mill.eyes;
  if (set === "jumper") {
    ctx.beginPath();
    ctx.arc(0.42 * cephW * facing, -0.08 * cephH, 2.4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.12 * cephW * facing, -0.22 * cephH, 1.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.speckle;
    ctx.beginPath();
    ctx.arc(0.46 * cephW * facing, -0.12 * cephH, 1.15 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,240,220,0.9)";
    ctx.beginPath();
    ctx.arc(0.5 * cephW * facing, -0.16 * cephH, 0.45 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a100c";
    ctx.beginPath();
    ctx.arc(-0.15 * cephW * facing, 0.18 * cephH, 0.7 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.55 * cephW * facing, 0.22 * cephH, 0.55 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else if (set === "wolf") {
    for (const [ex, ey, r] of [
      [0.38, -0.28, 0.85],
      [0.18, -0.38, 0.7],
      [0.52, -0.08, 0.7],
      [0.05, -0.18, 0.55],
      [-0.18, 0.12, 0.5],
      [0.42, 0.22, 0.5],
    ] as const) {
      ctx.beginPath();
      ctx.arc(ex * cephW * facing, ey * cephH, r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (set === "recluse") {
    for (const [ex, ey] of [
      [0.42, -0.12],
      [0.22, -0.28],
      [0.08, -0.08],
      [-0.12, 0.05],
      [0.55, 0.12],
      [0.32, 0.22],
    ] as const) {
      ctx.beginPath();
      ctx.arc(ex * cephW * facing, ey * cephH, 0.55 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (set === "huntsman") {
    for (const [ex, ey, r] of [
      [0.48, -0.12, 1.15],
      [0.22, -0.32, 0.85],
      [0.08, -0.08, 0.55],
      [-0.12, 0.1, 0.45],
    ] as const) {
      ctx.beginPath();
      ctx.arc(ex * cephW * facing, ey * cephH, r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (set === "tarantula") {
    for (const [ex, ey] of [
      [0.12, -0.18],
      [0.28, -0.08],
      [0.05, 0.05],
      [-0.08, -0.05],
      [0.22, 0.12],
      [0.38, 0.02],
    ] as const) {
      ctx.beginPath();
      ctx.arc(ex * cephW * facing, ey * cephH, 0.48 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (const [ex, ey] of [
      [0.35, -0.15],
      [0.15, -0.35],
      [0.45, 0.1],
      [-0.05, -0.2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(ex * cephW * facing, ey * cephH, 0.7 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const eyeGrade = look?.eye ?? 0;
  if (eyeGrade > 0) {
    ctx.beginPath();
    ctx.arc(0.42 * cephW * facing, -0.22 * cephH, 1.55 * scale, 0, Math.PI * 2);
    ctx.fillStyle = eyeGrade >= 2 ? "#6a1010" : "#3a2a10";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.42 * cephW * facing, -0.22 * cephH, 1.05 * scale, 0, Math.PI * 2);
    ctx.fillStyle = eyeGrade >= 2 ? "#e03828" : "#e8a030";
    ctx.fill();
    ctx.fillStyle = eyeGrade >= 2 ? "rgba(255, 180, 140, 0.95)" : "rgba(255, 236, 180, 0.95)";
    ctx.beginPath();
    ctx.arc(0.46 * cephW * facing, -0.26 * cephH, 0.4 * scale, 0, Math.PI * 2);
    ctx.fill();
    if (eyeGrade >= 2 && (pose === "lunge" || pose === "grapple")) {
      ctx.strokeStyle = "rgba(255, 70, 40, 0.75)";
      ctx.lineWidth = 1.15 * scale;
      ctx.beginPath();
      ctx.moveTo(cephW * 0.58 * facing, -cephH * 0.22);
      ctx.lineTo(cephW * 2.6 * facing, -cephH * 0.4);
      ctx.stroke();
    }
  } else if (set === "orb") {
    ctx.fillStyle = "rgba(255,220,180,0.7)";
    ctx.beginPath();
    ctx.arc(0.38 * cephW * facing, -0.2 * cephH, 0.28 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  colors: MorphColors,
  plump: number,
  scale: number,
  facing: number,
  pose: DrawPose,
  mill: MillLook,
  training: number,
  look: BayLook | undefined,
  t: number,
): void {
  const edge = Math.min(1, training / 36);
  const bodyPlump = plump + (look?.plump ?? 0);
  const abdW = 16 * scale * lerp(0.85, 1.25, bodyPlump) * (1 + edge * 0.08) * mill.abdW;
  const abdH = 20 * scale * lerp(0.9, 1.2, bodyPlump) * (1 + edge * 0.06) * mill.abdH;
  const cephW = 8.5 * scale * (1 + edge * 0.14) * mill.cephW;
  const cephH = 10 * scale * (1 + edge * 0.12) * mill.cephH;
  const fangMul = (look?.fangs ?? 1) * mill.fangs;
  let lean = 0;
  let stretch = 1;
  let drop = 0;
  if (pose === "lunge" || pose === "intro") {
    lean = -0.32;
    stretch = 1.2;
  } else if (pose === "grapple") {
    lean = -0.16;
    drop = 5 * scale;
    stretch = 1.06;
  } else if (pose === "feint") {
    lean = Math.sin(t * 14) * 0.22;
  } else if (pose === "brace") {
    stretch = 0.84;
    drop = 3.5 * scale;
  } else if (pose === "yank") {
    drop = Math.sin(t * 10) * 2.4 * scale;
  } else if (pose === "drop") {
    lean = 0.22;
    drop = 9 * scale;
    stretch = 0.92;
  } else if (pose === "hurt") {
    lean = 0.28;
    stretch = 0.9;
  } else if (pose === "ko") {
    lean = 0.55;
    drop = 10 * scale;
    stretch = 0.78;
  }
  ctx.save();
  ctx.translate(0, drop);
  ctx.rotate(lean * facing);
  ctx.scale(1 / Math.sqrt(stretch), stretch);

  ctx.save();
  ctx.translate(-2 * scale * facing, 2 * scale);
  ctx.rotate(-0.15 * facing);
  abdomenPath(ctx, mill.abdShape, abdW, abdH);
  const ag = ctx.createRadialGradient(-abdW * 0.3, -abdH * 0.3, 2, 0, 0, abdH);
  ag.addColorStop(0, mill.shiny > 0.4 ? shade(colors.abdomenLight, 40) : colors.abdomenLight);
  ag.addColorStop(0.55, colors.abdomen);
  ag.addColorStop(1, shade(colors.abdomen, -30));
  ctx.fillStyle = ag;
  ctx.fill();
  if (mill.shiny > 0.2) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + mill.shiny * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(-abdW * 0.22, -abdH * 0.28, abdW * 0.32, abdH * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = shade(colors.folium, -10);
  ctx.lineWidth = 0.7 * scale;
  ctx.stroke();

  const skin = primedHide(mill.skin);
  if (skin) {
    ctx.save();
    abdomenPath(ctx, mill.abdShape, abdW, abdH);
    ctx.clip();
    ctx.globalAlpha = 0.82;
    ctx.drawImage(skin, -abdW * 1.05, -abdH * 1.05, abdW * 2.1, abdH * 2.1);
    ctx.restore();
  }

  paintAbdMark(ctx, mill, colors, abdW, abdH, scale);

  if (mill.mark === "folium" || mill.mark === "marble") {
    ctx.fillStyle = colors.speckle;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rx = Math.cos(a) * abdW * 0.45;
      const ry = Math.sin(a) * abdH * 0.4;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 1.1 * scale, 0.7 * scale, a, 0, Math.PI * 2);
      ctx.globalAlpha = 0.55;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.ellipse(0, abdH * 0.82, 2.2 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(colors.cephalothorax, 10);
  ctx.fill();
  if ((look?.sacs ?? 0) > 0) {
    ctx.fillStyle = shade(colors.abdomenLight, 20);
    ctx.beginPath();
    ctx.ellipse(-abdW * 0.38, abdH * 0.28, 3.4 * scale, 4.6 * scale, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(abdW * 0.38, abdH * 0.28, 3.4 * scale, 4.6 * scale, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(colors.folium, 10);
    ctx.lineWidth = 0.5 * scale;
    ctx.stroke();
  }
  if (look?.splice) {
    ctx.beginPath();
    ctx.ellipse(0, 0, abdW * 0.72, abdH * 0.62, 0, 0, Math.PI * 2);
    ctx.strokeStyle = colors.speckle;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.6 * scale;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  ctx.save();
  ctx.translate(abdW * 0.55 * facing, -abdH * 0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, cephW, cephH, 0, 0, Math.PI * 2);
  const cg = ctx.createRadialGradient(-2, -2, 1, 0, 0, cephH);
  cg.addColorStop(0, shade(colors.cephalothorax, 30));
  cg.addColorStop(1, colors.cephalothorax);
  ctx.fillStyle = cg;
  ctx.fill();

  if (mill.mark === "violin") {
    ctx.fillStyle = colors.folium;
    ctx.beginPath();
    ctx.moveTo(0.12 * cephW * facing, -cephH * 0.55);
    ctx.quadraticCurveTo(0.02 * cephW * facing, -cephH * 0.05, 0.18 * cephW * facing, cephH * 0.45);
    ctx.lineTo(-0.02 * cephW * facing, cephH * 0.48);
    ctx.quadraticCurveTo(-0.12 * cephW * facing, 0, 0.02 * cephW * facing, -cephH * 0.52);
    ctx.closePath();
    ctx.fill();
  }
  if (mill.mark === "knobs") {
    ctx.fillStyle = shade(colors.cephalothorax, 18);
    ctx.beginPath();
    ctx.ellipse(-cephW * 0.42, -cephH * 0.55, 2.8 * scale, 2.2 * scale, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cephW * 0.18, -cephH * 0.62, 2.8 * scale, 2.2 * scale, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mill.mark === "stripe" && mill.eyes === "wolf") {
    ctx.fillStyle = `${colors.folium}bb`;
    ctx.beginPath();
    ctx.ellipse(0, 0, cephW * 0.18, cephH * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mill.hair > 0.4) {
    ctx.strokeStyle = shade(colors.legLight, 10);
    ctx.lineWidth = 0.45 * scale;
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * cephW * 0.7, Math.sin(a) * cephH * 0.7);
      ctx.lineTo(Math.cos(a) * cephW * 1.15, Math.sin(a) * cephH * 1.15);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = colors.legDark;
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.moveTo(cephW * 0.3 * facing, cephH * 0.2);
  ctx.quadraticCurveTo(cephW * 0.9 * facing, cephH * 0.6, cephW * 1.1 * facing, cephH * 0.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cephW * 0.25 * facing, cephH * 0.45);
  ctx.quadraticCurveTo(cephW * 0.8 * facing, cephH * 0.9, cephW * 1.05 * facing, cephH * 0.4);
  ctx.stroke();

  ctx.fillStyle = colors.fang;
  ctx.beginPath();
  ctx.ellipse(cephW * 0.7 * facing, cephH * 0.55, 1.4 * scale * fangMul, 2.2 * scale * fangMul, 0.4 * facing, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pose === "lunge" || pose === "grapple" ? "#8a1c14" : shade(colors.fang, 20);
  ctx.beginPath();
  ctx.ellipse(cephW * 0.95 * facing, cephH * 0.72, 0.7 * scale * fangMul, 1.4 * scale * fangMul, 0.5 * facing, 0, Math.PI * 2);
  ctx.fill();

  paintEyes(ctx, mill, colors, cephW, cephH, scale, facing, pose, look);
  ctx.restore();
  ctx.restore();
}

export function silkTaut(angle: number, spin: number, pose: DrawPose): number {
  const sag = Math.abs(angle) * 0.28 + Math.abs(spin) * 0.05;
  const poseSag = pose === "drop" || pose === "ko" ? 0.28 : pose === "yank" ? 0.12 : 0;
  return Math.max(0.28, 1 - sag - poseSag);
}

export function drawSilk(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  taut: number,
  style: WebStyle = "orb",
  training = 0,
  silkBoost = 0,
  sticky = 0,
): void {
  ctx.save();
  const sag = (1 - taut) * 18;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + sag;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.strokeStyle = sticky ? "rgba(214, 168, 72, 0.82)" : "rgba(236,226,204,0.7)";
  ctx.lineWidth = 1.55 + silkBoost * 0.55 + sticky * 0.7;
  ctx.stroke();
  ctx.strokeStyle = sticky ? "rgba(255, 220, 130, 0.42)" : "rgba(255,255,245,0.38)";
  ctx.lineWidth = 0.65 + silkBoost * 0.2 + sticky * 0.25;
  ctx.stroke();
  if (style === "cross" || style === "spoked") {
    ctx.beginPath();
    ctx.moveTo(x0 + (style === "cross" ? -5 : 5), y0 + 2);
    ctx.quadraticCurveTo(mx, my + 7, x1 + (style === "cross" ? 5 : -5), y1 - 3);
    ctx.strokeStyle = "rgba(232,220,198,0.26)";
    ctx.lineWidth = 0.65;
    ctx.stroke();
  } else if (style === "tangle") {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 4);
    ctx.lineTo(mx - 5, my - 3);
    ctx.lineTo(mx + 4, my + 5);
    ctx.lineTo(x1, y1 - 4);
    ctx.strokeStyle = "rgba(232,220,198,0.32)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  } else if (style === "sheet") {
    ctx.strokeStyle = "rgba(184,224,207,0.38)";
    ctx.lineWidth = 0.65;
    for (const offset of [-5, 0, 5]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + offset);
      ctx.quadraticCurveTo(mx, my + offset * 0.4, x1, y1 + offset);
      ctx.stroke();
    }
  }
  if (style === "golden") {
    ctx.strokeStyle = "rgba(240,196,60,0.58)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  const knots = Math.min(5, Math.floor(training / 6) + silkBoost);
  for (let i = 1; i <= knots; i += 1) {
    const t = i / (knots + 1);
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + (1 - taut) * 10 * 4 * t * (1 - t);
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = style === "golden" ? "rgba(240,196,60,0.9)" : "rgba(248,240,220,0.8)";
    ctx.fill();
  }
  ctx.restore();
}

export function drawStick(ctx: CanvasRenderingContext2D, w: number, y: number): void {
  const x0 = w * 0.05;
  const x1 = w * 0.95;
  const h = Math.max(12, w * 0.022);
  ctx.save();
  ctx.fillStyle = "rgba(12, 8, 4, 0.35)";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, y + h * 2.4, w * 0.42, h * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y - h, 0, y + h);
  g.addColorStop(0, "#f0e0b8");
  g.addColorStop(0.35, "#d4b07a");
  g.addColorStop(0.55, "#9a7044");
  g.addColorStop(1, "#4a3018");
  ctx.beginPath();
  ctx.roundRect(x0, y - h / 2, x1 - x0, h, 5);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(40,24,10,0.4)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (let x = x0 + 36; x < x1 - 20; x += 58) {
    ctx.beginPath();
    ctx.ellipse(x, y, 5, h * 0.62, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(90,60,30,0.5)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, 2.2, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(40,24,10,0.18)";
    ctx.fill();
  }
  ctx.fillStyle = "#efe6d4";
  ctx.fillRect(x0, y - h * 0.9, 22, h * 1.8);
  ctx.fillRect(x1 - 28, y - h * 0.9, 26, h * 1.8);
  ctx.fillStyle = "rgba(40,24,10,0.22)";
  ctx.fillRect(x0, y - 2, 22, 3);
  ctx.fillRect(x1 - 28, y - 2, 26, 3);
  ctx.restore();
}

const hideCache = new Map<string, HTMLImageElement | "load" | "fail">();

function primedHide(src: string | undefined): HTMLImageElement | undefined {
  if (!src) return undefined;
  const hit = hideCache.get(src);
  if (hit instanceof HTMLImageElement && hit.complete && hit.naturalWidth > 0) return hit;
  if (hit === "load" || hit === "fail" || typeof Image === "undefined") return undefined;
  const img = new Image();
  img.crossOrigin = "anonymous";
  hideCache.set(src, "load");
  img.onload = () => hideCache.set(src, img);
  img.onerror = () => hideCache.set(src, "fail");
  img.src = src;
  return undefined;
}

function drawHide(ctx: CanvasRenderingContext2D, img: HTMLImageElement, d: SpiderDraw): void {
  const s = d.scale;
  let ox = 0;
  let oy = 2 * s;
  let rot = 0;
  let squash = 1;
  let stretch = 1;
  if (d.pose === "lunge" || d.pose === "intro") {
    ox = 8 * s;
    rot = -0.28;
    stretch = 1.18;
  } else if (d.pose === "grapple") {
    oy = -1 * s;
    rot = -0.14;
    ox = 4 * s;
  } else if (d.pose === "feint") {
    ox = Math.sin(d.t * 16) * 5 * s;
    rot = ox * 0.03;
  } else if (d.pose === "brace") {
    oy = 4 * s;
    squash = 0.82;
  } else if (d.pose === "yank") {
    oy = Math.sin(d.t * 10) * 3.2 * s;
  } else if (d.pose === "drop") {
    oy = 11 * s;
    rot = 0.32;
    squash = 0.9;
  } else if (d.pose === "hurt") {
    rot = 0.38;
    oy = 6 * s;
    squash = 0.88;
  } else if (d.pose === "ko") {
    rot = 0.62;
    oy = 12 * s;
    squash = 0.78;
  }
  const spin = d.spin ?? 0;
  rot += spin * 0.04;
  const iw = 36 * s * stretch;
  const ih = 42 * s * squash;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(rot);
  ctx.shadowColor = "rgba(20, 10, 4, 0.55)";
  ctx.shadowBlur = 10 * s;
  ctx.drawImage(img, -iw, -ih * 0.55, iw * 2, ih * 1.55);
  ctx.restore();
}

function contactShadow(ctx: CanvasRenderingContext2D, d: SpiderDraw): void {
  const s = d.scale;
  ctx.save();
  ctx.fillStyle = "rgba(12, 8, 4, 0.28)";
  ctx.beginPath();
  ctx.ellipse(2 * s, 18 * s, 16 * s, 4.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSpider(ctx: CanvasRenderingContext2D, d: SpiderDraw): void {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle);
  ctx.scale(d.facing, 1);
  if (d.hurtFlash > 0) {
    ctx.shadowColor = "rgba(255, 210, 170, 0.85)";
    ctx.shadowBlur = 18 * d.scale;
    ctx.globalAlpha = 0.72 + Math.sin(d.t * 48) * 0.28;
  }

  const mill = d.mill ?? (d.mark === "hourglass" ? millLookOf("widow") : millLookOf("hentz"));
  const legs = posedLegs(d.pose, d.prevPose, d.poseT ?? 1, d.t, mill);
  const back = legs.filter((l) => l.z === 0);
  const front = legs.filter((l) => l.z === 1);
  const ox = 6 * d.scale;
  const oy = -2 * d.scale;
  const hide = primedHide(d.hideSrc);
  contactShadow(ctx, d);
  if ((d.pose === "lunge" || d.pose === "grapple") && Math.abs(d.spin ?? 0) > 1.2) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.translate(-8 * d.scale, 0);
    ctx.rotate(-0.08);
    if (hide) drawHide(ctx, hide, d);
    else drawBody(ctx, d.colors, d.plump, d.scale, 1, d.pose, mill, d.training, d.look, d.t);
    ctx.restore();
  }
  ctx.save();
  if (hide) ctx.globalAlpha *= 0.42;
  back.forEach((l, i) => drawLeg(ctx, d.colors, ox, oy + (i - 1.5) * 2 * d.scale, l, d.scale, 1, d.look, mill));
  ctx.restore();
  if (hide) drawHide(ctx, hide, d);
  else drawBody(ctx, d.colors, d.plump, d.scale, 1, d.pose, mill, d.training, d.look, d.t);
  drawBrood(ctx, d);
  drawGear(ctx, d);
  ctx.save();
  if (hide) ctx.globalAlpha *= 0.5;
  front.forEach((l, i) => drawLeg(ctx, d.colors, ox, oy + (i - 1.5) * 2.4 * d.scale, l, d.scale, 1, d.look, mill));
  ctx.restore();

  ctx.restore();
}

/** Egg sac and spiderlings ride the abdomen until they scatter into the yard. */
function drawBrood(ctx: CanvasRenderingContext2D, d: SpiderDraw): void {
  const s = d.scale;
  if (d.brood) {
    ctx.save();
    ctx.translate(-8 * s, 8 * s);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.2 * s, 7.4 * s, -0.2, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(-2 * s, -2 * s, 1, 0, 0, 8 * s);
    g.addColorStop(0, "#f0e2c4");
    g.addColorStop(1, "#c4a878");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 60, 30, 0.45)";
    ctx.lineWidth = 0.6 * s;
    ctx.stroke();
    ctx.restore();
  }
  const n = d.hatchlings ?? 0;
  if (n <= 0) return;
  for (let i = 0; i < Math.min(7, n); i += 1) {
    const a = (i / Math.max(1, n)) * Math.PI * 1.6 - 0.7;
    const x = Math.cos(a) * 7 * s;
    const y = Math.sin(a) * 8 * s + 2 * s;
    ctx.fillStyle = d.colors.cephalothorax;
    ctx.beginPath();
    ctx.arc(x, y, 1.15 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = d.colors.legDark;
    ctx.lineWidth = 0.45 * s;
    ctx.beginPath();
    ctx.moveTo(x - 1.6 * s, y);
    ctx.lineTo(x + 1.6 * s, y);
    ctx.moveTo(x, y - 1.4 * s);
    ctx.lineTo(x, y + 1.4 * s);
    ctx.stroke();
  }
}

/** Small readable silhouettes make equipped kit feel earned in a fast fight. */
function drawGear(ctx: CanvasRenderingContext2D, d: SpiderDraw): void {
  const gear = d.gear;
  if (!gear) return;
  const s = d.scale;
  if (gear.wraps) {
    ctx.save();
    ctx.strokeStyle = gear.wraps === "chitin-plates" ? "#c9b58a" : gear.wraps === "silk-mail" ? "#d9d1bc" : "#8a5a36";
    ctx.lineWidth = Math.max(1, s * 2.3);
    ctx.beginPath();
    ctx.ellipse(7 * s, 2 * s, 11 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (gear.fang) {
    ctx.fillStyle = gear.fang === "black-drop" ? "#b42028" : "#d9bb72";
    ctx.beginPath();
    ctx.moveTo(-7 * s, -2 * s);
    ctx.lineTo(-11 * s, 4 * s);
    ctx.lineTo(-4 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
  }
  if (gear.silk) {
    ctx.strokeStyle = gear.silk === "golden-wind" ? "rgba(236,190,66,0.85)" : "rgba(220,235,235,0.78)";
    ctx.lineWidth = Math.max(0.8, s * 0.8);
    ctx.beginPath();
    ctx.arc(5 * s, 0, 15 * s, d.t * 2, d.t * 2 + Math.PI * 1.45);
    ctx.stroke();
  }
  if (gear.stim) {
    ctx.fillStyle = gear.stim === "night-moth" ? "rgba(124,194,255,0.85)" : "rgba(230,100,56,0.8)";
    ctx.beginPath();
    ctx.arc(-1 * s, -6 * s, Math.max(1, s * 1.8), 0, Math.PI * 2);
    ctx.fill();
  }
  if (gear.charm) {
    ctx.fillStyle = gear.charm === "widow-knot" ? "#181318" : gear.charm === "fair-ribbon" ? "#3975c7" : "#b48634";
    ctx.fillRect(13 * s, -4 * s, Math.max(2, s * 3), Math.max(2, s * 5));
  }
  if (d.look?.silk) {
    ctx.strokeStyle = "rgba(232,220,198,0.55)";
    ctx.lineWidth = Math.max(0.8, s * 0.7);
    ctx.beginPath();
    ctx.arc(5 * s, 2 * s, 13 * s, d.t, d.t + Math.PI * 1.15);
    ctx.stroke();
  }
}

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "silk" | "dust" | "ichor" | "spark";
};

export function burst(x: number, y: number, kind: Particle["kind"], n = 10): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = kind === "spark" ? 70 + Math.random() * 140 : 28 + Math.random() * 110;
    out.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - (kind === "dust" ? 8 : 28),
      life: (kind === "ichor" ? 0.5 : 0.32) + Math.random() * 0.45,
      max: kind === "ichor" ? 0.9 : 0.7,
      kind,
    });
  }
  return out;
}

export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]): void {
  for (const p of ps) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if (p.kind === "silk") {
      ctx.strokeStyle = "rgba(240,230,210,0.95)";
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      ctx.stroke();
    } else if (p.kind === "ichor") {
      ctx.fillStyle = "#8a2a1c";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(160, 40, 28, 0.45)";
      ctx.beginPath();
      ctx.arc(p.x, p.y + 3, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "spark") {
      ctx.strokeStyle = "rgba(255, 220, 140, 0.95)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(180,150,110,0.85)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
