import type { MorphColors, MoveId, WebStyle } from "./types";

export type DrawPose = MoveId | "idle" | "hurt" | "ko" | "intro";

export type SpiderDraw = {
  x: number;
  y: number;
  angle: number;
  scale: number;
  facing: 1 | -1;
  colors: MorphColors;
  pose: DrawPose;
  t: number;
  plump: number;
  training: number;
  hurtFlash: number;
  mark?: "hourglass";
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

type Leg = { lift: number; sweep: number; bend: number; z: number };

function poseLegs(pose: DrawPose, facing: number, t: number): Leg[] {
  const idle = (i: number): Leg => {
    const side = i < 4 ? -1 : 1;
    const pair = i % 4;
    const sweep0 = [-0.95, -0.35, 0.45, 1.05][pair]!;
    return {
      lift: 0.18 + pair * 0.04,
      sweep: sweep0 * side,
      bend: 0.72 + Math.sin(t * 2 + i) * 0.04,
      z: pair === 0 || pair === 3 ? 1 : 0,
    };
  };
  const base = Array.from({ length: 8 }, (_, i) => idle(i));
  const pulse = Math.sin(t * 6) * 0.08;
  if (pose === "lunge" || pose === "intro") {
    base.forEach((l, i) => {
      const pair = i % 4;
      if (pair <= 1) {
        l.sweep += facing * 0.55;
        l.lift += 0.25;
        l.bend -= 0.15;
      } else {
        l.sweep -= facing * 0.2;
      }
    });
  } else if (pose === "grapple") {
    base.forEach((l, i) => {
      const pair = i % 4;
      l.lift += pair <= 1 ? 0.45 : 0.1;
      l.sweep += facing * (pair <= 1 ? 0.7 : -0.15);
      l.bend -= 0.2;
    });
  } else if (pose === "feint") {
    base.forEach((l, i) => {
      l.sweep -= facing * 0.25;
      l.lift += Math.sin(t * 14 + i) * 0.12;
    });
  } else if (pose === "brace") {
    base.forEach((l) => {
      l.lift -= 0.12;
      l.bend += 0.25;
      l.sweep *= 0.72;
    });
  } else if (pose === "yank") {
    base.forEach((l, i) => {
      l.bend += 0.1 + pulse;
      if (i % 4 >= 2) l.sweep += facing * 0.2;
    });
  } else if (pose === "drop") {
    base.forEach((l) => {
      l.lift += 0.3;
      l.bend += 0.15;
    });
  } else if (pose === "hurt" || pose === "ko") {
    base.forEach((l, i) => {
      l.lift += 0.2;
      l.sweep += (i < 4 ? -1 : 1) * 0.4;
      l.bend += 0.2;
    });
  }
  return base;
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  colors: MorphColors,
  originX: number,
  originY: number,
  leg: Leg,
  scale: number,
  facing: number,
): void {
  const len1 = 22 * scale;
  const len2 = 20 * scale;
  const len3 = 16 * scale;
  const ang0 = -Math.PI / 2 + leg.sweep * facing + (facing < 0 ? Math.PI : 0);
  // origin at cephalothorax side
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
    [x0, y0, x1, y1, 3.1 * scale],
    [x1, y1, x2, y2, 2.3 * scale],
    [x2, y2, x3, y3, 1.4 * scale],
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
  // tarsus tip
  ctx.beginPath();
  ctx.arc(x3, y3, 0.8 * scale, 0, Math.PI * 2);
  ctx.fillStyle = colors.legDark;
  ctx.fill();
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  colors: MorphColors,
  plump: number,
  scale: number,
  facing: number,
  pose: DrawPose,
  mark?: "hourglass",
  training = 0,
): void {
  const edge = Math.min(1, training / 36);
  const abdW = 16 * scale * lerp(0.85, 1.25, plump) * (1 + edge * 0.08);
  const abdH = 20 * scale * lerp(0.9, 1.2, plump) * (1 + edge * 0.06);
  const cephW = 8.5 * scale * (1 + edge * 0.14);
  const cephH = 10 * scale * (1 + edge * 0.12);

  // abdomen
  ctx.save();
  ctx.translate(-2 * scale * facing, 2 * scale);
  ctx.rotate(-0.15 * facing);
  ctx.beginPath();
  ctx.ellipse(0, 0, abdW, abdH, 0, 0, Math.PI * 2);
  const ag = ctx.createRadialGradient(-abdW * 0.3, -abdH * 0.3, 2, 0, 0, abdH);
  ag.addColorStop(0, colors.abdomenLight);
  ag.addColorStop(0.55, colors.abdomen);
  ag.addColorStop(1, shade(colors.abdomen, -30));
  ctx.fillStyle = ag;
  ctx.fill();
  ctx.strokeStyle = shade(colors.folium, -10);
  ctx.lineWidth = 0.7 * scale;
  ctx.stroke();

  // folium leaf
  if (mark !== "hourglass") {
    ctx.beginPath();
    ctx.moveTo(0, -abdH * 0.72);
    ctx.bezierCurveTo(abdW * 0.28, -abdH * 0.2, abdW * 0.22, abdH * 0.3, 0, abdH * 0.7);
    ctx.bezierCurveTo(-abdW * 0.22, abdH * 0.3, -abdW * 0.28, -abdH * 0.2, 0, -abdH * 0.72);
    ctx.fillStyle = `${colors.folium}cc`;
    ctx.fill();
  } else {
    ctx.fillStyle = "#e02020";
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
  }

  // speckles
  if (mark !== "hourglass") {
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

  // spinnerets
  ctx.beginPath();
  ctx.ellipse(0, abdH * 0.82, 2.2 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(colors.cephalothorax, 10);
  ctx.fill();
  ctx.restore();

  // cephalothorax
  ctx.save();
  ctx.translate(abdW * 0.55 * facing, -abdH * 0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, cephW, cephH, 0, 0, Math.PI * 2);
  const cg = ctx.createRadialGradient(-2, -2, 1, 0, 0, cephH);
  cg.addColorStop(0, shade(colors.cephalothorax, 30));
  cg.addColorStop(1, colors.cephalothorax);
  ctx.fillStyle = cg;
  ctx.fill();

  // palps
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

  // chelicerae
  ctx.fillStyle = colors.fang;
  ctx.beginPath();
  ctx.ellipse(cephW * 0.7 * facing, cephH * 0.55, 1.4 * scale, 2.2 * scale, 0.4 * facing, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pose === "lunge" || pose === "grapple" ? "#8a1c14" : shade(colors.fang, 20);
  ctx.beginPath();
  ctx.ellipse(cephW * 0.95 * facing, cephH * 0.72, 0.7 * scale, 1.4 * scale, 0.5 * facing, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#1a100c";
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
  ctx.fillStyle = "rgba(255,220,180,0.7)";
  ctx.beginPath();
  ctx.arc(0.38 * cephW * facing, -0.2 * cephH, 0.28 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
): void {
  ctx.save();
  ctx.beginPath();
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + (1 - taut) * 10;
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.strokeStyle = "rgba(232,220,198,0.55)";
  ctx.lineWidth = 1.15;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,245,0.25)";
  ctx.lineWidth = 0.5;
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
  }
  if (style === "golden") {
    ctx.strokeStyle = "rgba(240,196,60,0.58)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  const knots = Math.min(4, Math.floor(training / 6));
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
  const x0 = w * 0.06;
  const x1 = w * 0.94;
  const h = Math.max(10, w * 0.018);
  const g = ctx.createLinearGradient(0, y - h, 0, y + h);
  g.addColorStop(0, "#e8d7b0");
  g.addColorStop(0.4, "#c4a878");
  g.addColorStop(0.55, "#8a6a40");
  g.addColorStop(1, "#5a4028");
  ctx.beginPath();
  ctx.roundRect(x0, y - h / 2, x1 - x0, h, 4);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(40,24,10,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let x = x0 + 40; x < x1 - 20; x += 70) {
    ctx.beginPath();
    ctx.ellipse(x, y, 4, h * 0.55, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(90,60,30,0.45)";
    ctx.stroke();
  }
  // end wrap
  ctx.fillStyle = "#efe6d4";
  ctx.fillRect(x1 - 28, y - h * 0.85, 26, h * 1.7);
  ctx.fillStyle = "rgba(40,24,10,0.2)";
  ctx.fillRect(x1 - 28, y - 2, 26, 3);
}

export function drawSpider(ctx: CanvasRenderingContext2D, d: SpiderDraw): void {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle);
  ctx.scale(d.facing, 1);
  if (d.hurtFlash > 0) ctx.globalAlpha = 0.65 + Math.sin(d.t * 40) * 0.35;

  const legs = poseLegs(d.pose, 1, d.t);
  const back = legs.filter((l) => l.z === 0);
  const front = legs.filter((l) => l.z === 1);
  const ox = 6 * d.scale;
  const oy = -2 * d.scale;
  back.forEach((l, i) => drawLeg(ctx, d.colors, ox, oy + (i - 1.5) * 2 * d.scale, l, d.scale, 1));
  drawBody(ctx, d.colors, d.plump, d.scale, 1, d.pose, d.mark, d.training);
  front.forEach((l, i) => drawLeg(ctx, d.colors, ox, oy + (i - 1.5) * 2.4 * d.scale, l, d.scale, 1));

  ctx.restore();
}

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "silk" | "dust" | "ichor";
};

export function burst(x: number, y: number, kind: Particle["kind"], n = 10): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 20 + Math.random() * 80;
    out.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 20,
      life: 0.35 + Math.random() * 0.4,
      max: 0.6,
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
      ctx.strokeStyle = "rgba(240,230,210,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      ctx.stroke();
    } else if (p.kind === "ichor") {
      ctx.fillStyle = "#8a2a1c";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(180,150,110,0.8)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
