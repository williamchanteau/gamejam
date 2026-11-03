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
  ting: () => { tone(2300, 2600, 0.16, 'triangle', 0.07); tone(3400, 3600, 0.1, 'sine', 0.04, 0.03); },
  crack: () => noise(0.07, 0.22, 1300, 1.5),
  scrape: () => noise(0.22, 0.1, 3600, 4),
  death: () => { tone(300, 40, 0.7, 'sawtooth', 0.25); noise(0.5, 0.3, 300); },
};
