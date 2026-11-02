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
  death: () => { tone(300, 40, 0.7, 'sawtooth', 0.25); noise(0.5, 0.3, 300); },
};
