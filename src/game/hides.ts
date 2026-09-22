import { uid } from "./rng";
import type { Hide, Spider } from "./types";

/** Rack cap. Pictures live in the save; six keeps local storage honest. */
export const MAX_HIDES = 6;
export const HIDE_COST = 24;
export const HIDE_RANK = 0;
export const HIDE_TICKET_PREFIX = "SFHIDE.1.";
const MAX_SRC = 140_000;
const MODEL_RE = /\.(glb|gltf|obj|fbx|blend|stl|usdz|vrm|3ds|dae|max|usd|abc)$/i;

export function isHideSrc(src: string): boolean {
  return /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/.test(src) && src.length <= MAX_SRC;
}

export function hideOf(hides: Hide[], id: string | undefined): Hide | undefined {
  if (!id) return undefined;
  return hides.find((hide) => hide.id === id);
}

export function hideSrcOf(spider: Spider, hides: Hide[]): string | undefined {
  return hideOf(hides, spider.hideId)?.src;
}

/** 3D files cannot be auto-rigged onto an eight-leg mill. Ask for a picture. */
export function rejectModelFile(file: { name: string; type: string; size: number }): string | null {
  if (MODEL_RE.test(file.name) || file.type.startsWith("model/")) {
    return "A model file sits in a crate. Export a picture of the spider from the front — PNG or JPEG — and bring that.";
  }
  if (file.type && !file.type.startsWith("image/")) return "Bring a picture, not that.";
  if (file.size > 8 * 1024 * 1024) return "That picture is too heavy for the rack.";
  if (file.size === 0) return "Empty crate.";
  return null;
}

export function canDrape(spider: Spider, hide: Hide | undefined, cash: number, rank: number): string | null {
  if (!hide) return "Pick a hide";
  if (spider.stage === "nymph") return "Let the nymph harden first";
  if (spider.hideId === hide.id) return "Already wearing that hide";
  if (rank < HIDE_RANK) return "The rack opens after the first night";
  if (cash < HIDE_COST) return `Need $${HIDE_COST}`;
  return null;
}

export function drape(spider: Spider, hide: Hide): Spider {
  return { ...spider, hideId: hide.id };
}

export function stripHide(spider: Spider): Spider {
  if (!spider.hideId) return spider;
  const next = { ...spider };
  delete next.hideId;
  return next;
}

export function makeHide(name: string, src: string, existing: Hide[]): { hide: Hide } | { error: string } {
  if (!isHideSrc(src)) return { error: "That ticket is not a picture this yard can hang." };
  if (existing.length >= MAX_HIDES) return { error: "Rack is full. Let one hide go." };
  if (existing.some((hide) => hide.src === src)) return { error: "Already on the rack." };
  const trimmed = name.trim().slice(0, 18) || "Yard hide";
  return { hide: { id: uid(), name: trimmed, src, madeAt: Date.now() } };
}

function b64encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function b64decode(value: string): string {
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeHideTicket(hide: Pick<Hide, "name" | "src">): string {
  return HIDE_TICKET_PREFIX + b64encode(JSON.stringify({ n: hide.name.slice(0, 18), s: hide.src }));
}

export function decodeHideTicket(raw: string): { name: string; src: string } | { error: string } {
  const ticket = raw.trim().replace(/\s+/g, "");
  if (!ticket) return { error: "Paste a hide ticket." };
  if (!ticket.startsWith(HIDE_TICKET_PREFIX)) {
    return { error: "That is not a hide ticket. It should start with SFHIDE." };
  }
  try {
    const parsed: unknown = JSON.parse(b64decode(ticket.slice(HIDE_TICKET_PREFIX.length)));
    const record = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const name = typeof record.n === "string" ? record.n : "Yard hide";
    const src = typeof record.s === "string" ? record.s : "";
    if (!isHideSrc(src)) return { error: "Ticket picture would not hang." };
    return { name, src };
  } catch {
    return { error: "Ticket tore on the way over." };
  }
}

type Bitmap = CanvasImageSource & { width: number; height: number; close?: () => void };

async function loadBitmap(file: File): Promise<Bitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

function sample(data: ImageData, x: number, y: number): [number, number, number, number] {
  const i = (y * data.width + x) * 4;
  return [data.data[i] ?? 0, data.data[i + 1] ?? 0, data.data[i + 2] ?? 0, data.data[i + 3] ?? 0];
}

function punchBackdrop(data: ImageData): void {
  const w = data.width;
  const h = data.height;
  const corners = [sample(data, 0, 0), sample(data, w - 1, 0), sample(data, 0, h - 1), sample(data, w - 1, h - 1)];
  const avg = corners.reduce(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2], acc[3] + c[3]] as [number, number, number, number],
    [0, 0, 0, 0],
  ).map((n) => n / 4);
  const spread = corners.reduce((m, c) => m + Math.abs(c[0] - avg[0]) + Math.abs(c[1] - avg[1]) + Math.abs(c[2] - avg[2]), 0) / 4;
  if (spread > 28) return;
  const thresh = 38;
  for (let i = 0; i < data.data.length; i += 4) {
    const dr = Math.abs((data.data[i] ?? 0) - avg[0]);
    const dg = Math.abs((data.data[i + 1] ?? 0) - avg[1]);
    const db = Math.abs((data.data[i + 2] ?? 0) - avg[2]);
    if (dr + dg + db < thresh * 3) data.data[i + 3] = 0;
  }
}

function alphaBox(data: ImageData): { x: number; y: number; w: number; h: number } {
  let minX = data.width;
  let minY = data.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < data.height; y += 1) {
    for (let x = 0; x < data.width; x += 1) {
      if ((data.data[(y * data.width + x) * 4 + 3] ?? 0) < 18) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return { x: 0, y: 0, w: data.width, h: data.height };
  const pad = 4;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  return { x, y, w: Math.min(data.width - x, maxX - minX + 1 + pad * 2), h: Math.min(data.height - y, maxY - minY + 1 + pad * 2) };
}

function packCanvas(source: HTMLCanvasElement): string | null {
  let canvas = source;
  for (const size of [192, 160, 128, 96]) {
    if (canvas.width > size || canvas.height > size) {
      const next = document.createElement("canvas");
      const scale = Math.min(size / canvas.width, size / canvas.height);
      next.width = Math.max(1, Math.round(canvas.width * scale));
      next.height = Math.max(1, Math.round(canvas.height * scale));
      const ctx = next.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(canvas, 0, 0, next.width, next.height);
      canvas = next;
    }
    const src = canvas.toDataURL("image/png");
    if (src.length <= MAX_SRC) return src;
  }
  return null;
}

function punchAndPack(img: Bitmap): string | null {
  if (typeof document === "undefined") return null;
  const max = 192;
  const scale = Math.min(max / Math.max(1, img.width), max / Math.max(1, img.height), 1);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  punchBackdrop(data);
  ctx.putImageData(data, 0, 0);
  const box = alphaBox(data);
  const cropped = document.createElement("canvas");
  cropped.width = Math.max(1, box.w);
  cropped.height = Math.max(1, box.h);
  const cut = cropped.getContext("2d");
  if (!cut) return null;
  cut.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return packCanvas(cropped);
}

/** Cook a photo of a 3D model (or any spider picture) into a hangable hide. */
export async function cookHide(file: File): Promise<{ name: string; src: string } | { error: string }> {
  const blocked = rejectModelFile(file);
  if (blocked) return { error: blocked };
  try {
    const bitmap = await loadBitmap(file);
    const src = punchAndPack(bitmap);
    bitmap.close?.();
    if (!src) return { error: "Could not read that picture." };
    const name = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 18) || "Yard hide";
    return { name, src };
  } catch {
    return { error: "Could not read that picture. JPEG or PNG from the front of the model." };
  }
}
