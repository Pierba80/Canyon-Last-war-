/**
 * Background music + synthesized sci-fi UI sounds (Web Audio, no extra assets).
 * Browsers block audio until the user interacts, so music starts on the first pointer/key press.
 */

export type Sfx = "open" | "close" | "on" | "off" | "switch" | "export" | "success" | "confirm" | "error";

interface SoundSettings { music: boolean; sfx: boolean }

const KEY = "canyon_tactical_planner_sound_v1";
const MUSIC_SRC = "/audio/bg-music.mp3";
const MUSIC_VOLUME = 0.3;

function load(): SoundSettings {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<SoundSettings>;
    return { music: p.music ?? true, sfx: p.sfx ?? true };
  } catch {
    return { music: true, sfx: true };
  }
}

let settings = load();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let music: HTMLAudioElement | null = null;
let unlocked = false;

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
};

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 6000;
    master.connect(lp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function whoosh(dur: number, f0: number, f1: number, gain: number) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 2.5;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
}

/** Play a themed interface sound (no-op when sound effects are off). */
export function sfx(name: Sfx) {
  if (!settings.sfx) return;
  switch (name) {
    case "open": // holo panel opening: rising sweep + shimmer
      tone(420, 980, 0.14, "sine", 0.09);
      tone(980, 1480, 0.1, "triangle", 0.04, 0.06);
      break;
    case "close": // panel collapsing
      tone(900, 300, 0.16, "sine", 0.08);
      break;
    case "on": // route / item enabled: two bright blips
      tone(1200, 1250, 0.05, "square", 0.025);
      tone(1650, 1700, 0.06, "square", 0.025, 0.06);
      break;
    case "off": // disabled: descending blips
      tone(950, 900, 0.05, "square", 0.025);
      tone(620, 580, 0.07, "square", 0.025, 0.06);
      break;
    case "switch": // map / team change: filtered whoosh + low pulse
      whoosh(0.32, 300, 2600, 0.12);
      tone(160, 320, 0.25, "sine", 0.07);
      break;
    case "export": // data uplink arpeggio
      [523, 659, 784, 1046].forEach((f, i) => tone(f, f * 1.01, 0.09, "triangle", 0.06, i * 0.07));
      break;
    case "success":
      tone(880, 880, 0.22, "sine", 0.07);
      tone(1320, 1320, 0.3, "sine", 0.05, 0.1);
      break;
    case "confirm": // schedule locked in
      tone(660, 660, 0.08, "sine", 0.08);
      tone(990, 990, 0.16, "sine", 0.07, 0.08);
      break;
    case "error":
      tone(220, 120, 0.25, "sawtooth", 0.04);
      break;
  }
}

function musicEl() {
  if (!music) {
    music = new Audio(MUSIC_SRC);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
    music.preload = "auto";
  }
  return music;
}

function syncMusic() {
  if (!unlocked) return;
  const m = musicEl();
  if (settings.music && document.visibilityState === "visible") void m.play().catch(() => {});
  else m.pause();
}

/** Call once at app start: unlocks audio on first interaction and pauses music in background tabs. */
export function initSound() {
  const unlock = () => {
    unlocked = true;
    audio();
    syncMusic();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  const onVis = () => syncMusic();
  document.addEventListener("visibilitychange", onVis);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    document.removeEventListener("visibilitychange", onVis);
    music?.pause();
  };
}

export const getSoundSettings = (): SoundSettings => ({ ...settings });

export function setSoundSettings(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  save();
  syncMusic();
  return getSoundSettings();
}
