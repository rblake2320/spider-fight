let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let unlocked = false;
let musicTimer: number | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    music = ctx.createGain();
    sfx.gain.value = 0.7;
    music.gain.value = 0.18;
    master.gain.value = 0.85;
    sfx.connect(master);
    music.connect(master);
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unlocked = true;
}

export function setSfxEnabled(on: boolean): void {
  const c = ac();
  const bus = sfx;
  if (c && bus) bus.gain.setTargetAtTime(on ? 0.7 : 0, c.currentTime, 0.02);
}

export function setMusicEnabled(on: boolean): void {
  const c = ac();
  const bus = music;
  if (c && bus) bus.gain.setTargetAtTime(on ? 0.18 : 0, c.currentTime, 0.04);
  if (on) startYardHum();
  else stopYardHum();
}

function envGain(c: AudioContext, dest: AudioNode, attack: number, decay: number, peak = 0.2): GainNode {
  const g = c.createGain();
  g.gain.value = 0;
  g.connect(dest);
  const t = c.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

export function playHit(): void {
  if (!unlocked) return;
  const c = ac();
  const bus = sfx;
  if (!c || !bus) return;
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = 90 + Math.random() * 40;
  const g = envGain(c, bus, 0.008, 0.18, 0.22);
  o.connect(g);
  o.start();
  o.stop(c.currentTime + 0.22);
  noiseBurst(c, bus, 0.05, 0.12);
}

export function playSilk(): void {
  if (!unlocked) return;
  const c = ac();
  const bus = sfx;
  if (!c || !bus) return;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.value = 420 + Math.random() * 80;
  const g = envGain(c, bus, 0.01, 0.15, 0.08);
  o.connect(g);
  o.start();
  o.stop(c.currentTime + 0.16);
}

export function playWin(): void {
  if (!unlocked) return;
  const c = ac();
  const bus = sfx;
  if (!c || !bus) return;
  [220, 277, 330].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = envGain(c, bus, 0.02, 0.35, 0.1);
    o.connect(g);
    o.start(c.currentTime + i * 0.07);
    o.stop(c.currentTime + 0.5 + i * 0.07);
  });
}

export function playLose(): void {
  if (!unlocked) return;
  const c = ac();
  const bus = sfx;
  if (!c || !bus) return;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = 160;
  o.frequency.exponentialRampToValueAtTime(70, c.currentTime + 0.4);
  const g = envGain(c, bus, 0.02, 0.45, 0.12);
  o.connect(g);
  o.start();
  o.stop(c.currentTime + 0.5);
}

export function playCatch(): void {
  if (!unlocked) return;
  const c = ac();
  const bus = sfx;
  if (!c || !bus) return;
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.value = 180;
  o.frequency.exponentialRampToValueAtTime(320, c.currentTime + 0.12);
  const g = envGain(c, bus, 0.005, 0.14, 0.09);
  o.connect(g);
  o.start();
  o.stop(c.currentTime + 0.16);
}

function noiseBurst(c: AudioContext, dest: AudioNode, dur: number, peak: number): void {
  const n = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = n;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 800;
  const g = envGain(c, dest, 0.002, dur, peak);
  src.connect(f);
  f.connect(g);
  src.start();
}

function startYardHum(): void {
  const c = ac();
  const bus = music;
  if (!c || !bus || musicTimer != null) return;
  const tick = () => {
    if (!bus || !unlocked) return;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = 55 + Math.random() * 8;
    const g = c.createGain();
    g.gain.value = 0;
    o.connect(g);
    g.connect(bus);
    const t = c.currentTime;
    g.gain.linearRampToValueAtTime(0.05, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 4.5);
    o.start();
    o.stop(t + 4.6);
    musicTimer = window.setTimeout(tick, 3800);
  };
  tick();
}

function stopYardHum(): void {
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const c = ac();
      if (c && c.state === "suspended") void c.resume();
    }
  });
}
