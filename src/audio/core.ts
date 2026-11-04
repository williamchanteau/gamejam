import { AUDIO } from '../config';

/** Moteur audio partagé (sons + musique) : tout est synthétisé, rien n'est chargé. */
export let ac: BaseAudioContext | null = null;
export let sfxBus: GainNode, musBus: GainNode, musVerb: GainNode, verbIn: GainNode, musLP: BiquadFilterNode;
let noiseBuf: AudioBuffer;
const ready: (() => void)[] = [];
export const onReady = (f: () => void) => ready.push(f);

export function unlockAudio() {
  if (!ac) {
    try { setup(new AudioContext({ latencyHint: 'interactive' })); } catch { return; }
  }
  if (ac instanceof AudioContext && ac.state === 'suspended') ac.resume();
}

/** Réponse impulsionnelle de nef : bruit qui s'assombrit en décroissant + premières réflexions. */
function impulse(c: BaseAudioContext, sec: number, k: number) {
  const sr = c.sampleRate, n = Math.floor(sr * sec), b = c.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      lp += (Math.random() * 2 - 1 - lp) * (0.9 - 0.84 * t);
      d[i] = lp * Math.pow(1 - t, k);
    }
    for (let j = 0; j < 10; j++) d[Math.floor(sr * (0.006 + Math.random() * 0.08))] += (Math.random() < 0.5 ? -1 : 1) * (0.6 - j * 0.05);
  }
  return b;
}

/** Câblage : sons / musique (+ envoi réverb) → compresseur → sortie. Exporté pour le rendu hors ligne (DEV). */
export function setup(c: BaseAudioContext) {
  ac = c;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.22;
  const master = gain(AUDIO.volume);
  master.connect(comp).connect(c.destination);
  sfxBus = gain(1); sfxBus.connect(master);
  musLP = c.createBiquadFilter(); musLP.type = 'lowpass'; musLP.frequency.value = 18000; musLP.Q.value = 0.5;
  musBus = gain(AUDIO.music); musBus.connect(musLP).connect(master);
  const pre = c.createDelay(0.1); pre.delayTime.value = 0.022;
  const conv = c.createConvolver(); conv.buffer = impulse(c, 3.6, 3);
  verbIn = gain(AUDIO.reverb); verbIn.connect(pre).connect(conv).connect(master);
  musVerb = gain(AUDIO.music); musVerb.connect(verbIn);
  noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ready.forEach((f) => f());
}

/** Sortie d'une voix : sèche (d) + envoi réverb (w). */
export type Out = { d: AudioNode; w: AudioNode };
let fxOut: Out | null = null;
export const fx = (): Out => fxOut ?? { d: sfxBus, w: verbIn };
/** Joue f avec un niveau propre (k) : toutes les voix créées par fx() passent par ce gain. */
export function level(k: number, f: () => void) {
  const d = gain(k), w = gain(k); d.connect(sfxBus); w.connect(verbIn);
  fxOut = { d, w };
  try { f(); } finally { fxOut = null; }
}
export const now = () => ac!.currentTime;
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
/** Variation aléatoire ±s (jamais deux fois le même son). */
export const v = (x: number, s = 0.08) => x * (1 + rnd(-s, s));

export function gain(x = 1) { const g = ac!.createGain(); g.gain.value = x; return g; }

/** Enveloppe : attaque linéaire a, tenue h, chute exponentielle r. */
export function env(at: number, a: number, peak: number, h: number, r: number) {
  const g = ac!.createGain(), p = g.gain;
  p.setValueAtTime(0, at); p.linearRampToValueAtTime(peak, at + a);
  if (h > 0) p.setValueAtTime(peak, at + a + h);
  p.exponentialRampToValueAtTime(0.0001, at + a + h + r);
  return g;
}

/** Envois réverb partagés (un par sortie et par dose) : un nœud de moins par note. */
const sends = new WeakMap<AudioNode, Map<number, GainNode>>();
export function route(n: AudioNode, o: Out, wet = 0.2) {
  n.connect(o.d);
  if (!wet) return;
  let m = sends.get(o.w);
  if (!m) sends.set(o.w, (m = new Map()));
  let s = m.get(wet);
  if (!s) { s = gain(wet); s.connect(o.w); m.set(wet, s); }
  n.connect(s);
}

export function osc(type: OscillatorType | PeriodicWave, f: number, at: number, end: number, dest: AudioNode, f1 = 0, glide = 0, det = 0) {
  const o = ac!.createOscillator();
  if (type instanceof PeriodicWave) o.setPeriodicWave(type); else o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + glide);
  if (det) o.detune.value = det;
  o.connect(dest); o.start(at); o.stop(end);
  return o;
}

export function noise(at: number, end: number, dest: AudioNode, rate = 1) {
  const s = ac!.createBufferSource();
  s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate;
  s.connect(dest); s.start(at, Math.random() * 1.8); s.stop(end);
  return s;
}

export function filt(type: BiquadFilterType, f: number, q: number, dest: AudioNode, f1 = 0, at = 0, glide = 0) {
  const b = ac!.createBiquadFilter();
  b.type = type; b.frequency.value = f; b.Q.value = q;
  if (f1) { b.frequency.setValueAtTime(f, at); b.frequency.exponentialRampToValueAtTime(f1, at + glide); }
  b.connect(dest);
  return b;
}

/** Oscillateur lent branché sur un paramètre (vibrato, trémolo, vent), montée progressive fadeIn. */
export function lfo(rate: number, depth: number, param: AudioParam, at: number, end: number, fadeIn = 0) {
  const o = ac!.createOscillator(), g = ac!.createGain();
  o.frequency.value = rate;
  if (fadeIn) { g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(depth, at + fadeIn); } else g.gain.value = depth;
  o.connect(g).connect(param); o.start(at); o.stop(end);
  return { o, g };
}
