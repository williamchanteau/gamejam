import { AUDIO } from '../config';

let ctx: AudioContext | null = null;
let master: GainNode;
let noiseBuf: AudioBuffer;

export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = AUDIO.volume;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function env(vol: number, dur: number, at: number) {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  g.connect(master);
  return g;
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType = 'square', vol = 0.2, delay = 0) {
  if (!ctx) return;
  const at = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  o.connect(env(vol, dur, at));
  o.start(at);
  o.stop(at + dur);
}

function noise(dur: number, vol: number, freq: number, q = 1, delay = 0) {
  if (!ctx) return;
  const at = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  s.connect(f).connect(env(vol, dur, at));
  s.start(at, Math.random() * 0.2, dur);
}

export const sfx = {
  jump: () => tone(260, 520, 0.09, 'square', 0.08),
  land: () => noise(0.06, 0.15, 500),
  dash: () => { noise(0.2, 0.3, 1500, 0.7); tone(700, 300, 0.12, 'sine', 0.08); },
  swing: (i: number) => noise(0.08, 0.22, 2600 + i * 600, 2),
  hit: () => { tone(200, 70, 0.1, 'square', 0.18); noise(0.07, 0.3, 900); },
  hurt: () => { tone(420, 90, 0.28, 'sawtooth', 0.22); noise(0.15, 0.25, 400); },
  spell: () => { tone(500, 1500, 0.3, 'triangle', 0.25); tone(750, 2200, 0.3, 'sine', 0.12, 0.04); },
  manaFull: () => { tone(880, 880, 0.08, 'triangle', 0.15); tone(1320, 1320, 0.14, 'triangle', 0.15, 0.09); },
  warn: () => tone(330, 340, 0.15, 'sawtooth', 0.06),
  shoot: () => tone(300, 150, 0.15, 'square', 0.08),
  tick: () => tone(660, 700, 0.04, 'square', 0.05),
  select: () => { tone(440, 880, 0.12, 'triangle', 0.15); tone(660, 1320, 0.16, 'triangle', 0.1, 0.06); },
  roar: () => { tone(110, 50, 0.9, 'sawtooth', 0.3); tone(165, 70, 0.8, 'square', 0.1); noise(0.8, 0.3, 250); },
  slam: () => { tone(120, 35, 0.4, 'square', 0.3); noise(0.45, 0.5, 180, 0.6); },
  clank: () => { tone(900, 620, 0.06, 'square', 0.08); noise(0.08, 0.22, 3200, 3); },
  whoosh: () => noise(0.2, 0.32, 800, 0.8),
  blade: () => { tone(900, 380, 0.2, 'sawtooth', 0.06); noise(0.15, 0.15, 2200, 2); },
  leap: () => tone(140, 320, 0.25, 'triangle', 0.18),
  bossDeath: () => { tone(220, 30, 1.6, 'sawtooth', 0.3); noise(1.3, 0.35, 350); },
  victory: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.35, 'triangle', 0.15, i * 0.14)),
  step: () => tone(70, 45, 0.1, 'sine', 0.12),
  thud: () => { tone(80, 45, 0.14, 'sine', 0.22); noise(0.08, 0.15, 220); },
  rumble: () => noise(0.55, 0.22, 110, 0.5),
  portal: () => { tone(180, 900, 0.6, 'sine', 0.14); tone(270, 1350, 0.6, 'triangle', 0.06, 0.05); noise(0.5, 0.18, 700, 0.8); },
  ting: () => { tone(2300, 2600, 0.16, 'triangle', 0.07); tone(3400, 3600, 0.1, 'sine', 0.04, 0.03); },
  crack: () => noise(0.07, 0.22, 1300, 1.5),
  scrape: () => noise(0.22, 0.1, 3600, 4),
  death: () => { tone(300, 40, 0.7, 'sawtooth', 0.25); noise(0.5, 0.3, 300); },
  chomp: () => { noise(0.07, 0.4, 900, 1.2); tone(240, 130, 0.07, 'square', 0.1); },
  gulp: () => tone(320, 90, 0.24, 'sine', 0.24),
  burp: () => { tone(92, 58, 0.8, 'sawtooth', 0.32); tone(130, 74, 0.7, 'square', 0.1); noise(0.7, 0.2, 220, 0.8); },
  splat: () => { noise(0.13, 0.36, 620, 0.7); tone(170, 60, 0.1, 'sine', 0.16); },
  bell: () => { tone(1320, 1300, 0.5, 'triangle', 0.14); tone(1980, 1960, 0.32, 'sine', 0.07); },
  /** Foule : rafales de bruit filtré et voix qui montent (« hourra »). */
  crowd: (vol = 1) => {
    for (let i = 0; i < 8; i++) noise(0.3, 0.1 * vol * (0.6 + Math.random() * 0.6), 600 + Math.random() * 1100, 0.7, i * 0.16);
    for (let i = 0; i < 7; i++) { const f = 170 + Math.random() * 190; tone(f, f * 1.3, 0.28, 'sawtooth', 0.016 * vol, Math.random() * 1.1); }
  },
  rooster: () => {
    tone(520, 760, 0.1, 'square', 0.06); tone(740, 660, 0.09, 'square', 0.06, 0.13);
    tone(680, 980, 0.3, 'square', 0.07, 0.25); tone(960, 560, 0.34, 'square', 0.06, 0.56);
  },
  /** Fanfare royale : cuivres en accord, notes tenues à la fin. */
  fanfare: () => {
    for (const [f, at, d] of [[392, 0, 0.14], [392, 0.15, 0.1], [523, 0.27, 0.16], [659, 0.45, 0.16], [784, 0.63, 0.7]]) {
      tone(f, f, d, 'sawtooth', 0.075, at); tone(f / 2, f / 2, d, 'square', 0.05, at);
    }
    tone(659, 659, 0.7, 'sawtooth', 0.05, 0.63); tone(523, 523, 0.7, 'sawtooth', 0.05, 0.63);
  },
  powerUp: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.02, 0.22, 'triangle', 0.15, i * 0.07)),
  /** GAME OVER : impact au claquement du titre, glas grave, motif mineur descendant. */
  gameOver: () => {
    tone(90, 30, 0.6, 'square', 0.25, 0.4); noise(0.5, 0.4, 160, 0.6, 0.4);
    for (const [f, v] of [[110, 0.22], [303.6, 0.06], [594, 0.03]]) tone(f, f * 0.99, 2.2, 'sine', v, 0.4);
    [440, 415.3, 349.2, 293.7].forEach((f, i) => tone(f, f, i === 3 ? 1.3 : 0.4, 'triangle', 0.12, 0.8 + i * 0.32));
  },
};
