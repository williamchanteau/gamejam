import { ac, gain, route, osc, mtof, type Out } from './core';

// ── VOLUMES DE LA MUSIQUE (à régler ici) ─────────────────────────────────────────────
// Gain de crête par instrument, avant AUDIO.music (config.ts) et le curseur OPTIONS > SON.
export const VOL = {
  /** Gain général de toutes les pistes chiptune. */
  all: 0.24,
  lead: 0.27, leadHi: 0.13, pad: 0.1, arp: 0.11, bass: 0.46, bell: 0.2,
  kick: 0.52, snare: 0.24, hat: 0.1, hat2: 0.06, crash: 0.22,
};
// ─────────────────────────────────────────────────────────────────────────────────────

/** Synthé chiptune : carrés (rapport cyclique 12,5 / 25 / 50 %), triangle, bruit. Pas de filtre par note. */
export type Duty = 'p12' | 'p25' | 'p50';
export type Inst = Duty | 'tri' | 'bell' | 'drum';
export type DrumKind = 'K' | 'S' | 'H' | 'O' | 'C' | 'T';

const DUTY: Record<Duty, number> = { p12: 0.125, p25: 0.25, p50: 0.5 };

/** Formes d'onde et bruit, créés une fois par contexte audio. */
let bank: { c: BaseAudioContext; w: Record<Duty, PeriodicWave>; lfsr: AudioBuffer } | null = null;
function B() {
  const c = ac!;
  if (bank?.c === c) return bank;
  const wave = (d: number) => {
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 * Math.sin(Math.PI * n * d)) / (Math.PI * n);
    return c.createPeriodicWave(re, im);
  };
  // Bruit de registre à décalage 15 bits, échantillon tenu : le grain des consoles 8 bits.
  const lfsr = c.createBuffer(1, c.sampleRate, c.sampleRate), d = lfsr.getChannelData(0), hold = Math.max(1, Math.round(c.sampleRate / 16000));
  let r = 1, y = 1;
  for (let i = 0; i < d.length; i++) {
    if (i % hold === 0) { const b = (r ^ (r >> 1)) & 1; r = (r >> 1) | (b << 14); y = r & 1 ? 1 : -1; }
    d[i] = y;
  }
  bank = { c, w: { p12: wave(DUTY.p12), p25: wave(DUTY.p25), p50: wave(DUTY.p50) }, lfsr };
  return bank;
}

/** Enveloppe de note : attaque nette, léger déclin vers la tenue, fin courte sans clic. */
function adsr(at: number, dur: number, vol: number, o: Out, wet: number, pluck: boolean) {
  const g = ac!.createGain(), p = g.gain, rel = Math.min(0.02, dur * 0.3);
  p.setValueAtTime(0, at);
  p.linearRampToValueAtTime(vol, at + 0.002);
  if (pluck) p.exponentialRampToValueAtTime(Math.max(vol * 0.03, 0.0001), at + dur);
  else {
    const s = vol * 0.72;
    p.linearRampToValueAtTime(s, at + Math.min(0.07, dur * 0.5));
    p.setValueAtTime(s, at + dur - rel);
  }
  p.linearRampToValueAtTime(0, at + dur);
  route(g, o, wet);
  return g;
}

export interface ToneOpt { wet?: number; vib?: boolean; pluck?: boolean }

/** Une note au carré ou au triangle. Vibrato (2 nœuds de plus) réservé aux notes longues. */
export function tone(o: Out, inst: Duty | 'tri', m: number, at: number, dur: number, vol: number, opt: ToneOpt = {}) {
  const g = adsr(at, dur, vol, o, opt.wet ?? 0, !!opt.pluck);
  const n = osc(inst === 'tri' ? 'triangle' : B().w[inst], mtof(m), at, at + dur + 0.01, g);
  if (opt.vib && dur > 0.35) {
    const l = ac!.createOscillator(), d = ac!.createGain();
    l.frequency.value = 5.5;
    d.gain.setValueAtTime(0, at + 0.18); d.gain.linearRampToValueAtTime(14, at + 0.32);
    l.connect(d).connect(n.detune); l.start(at); l.stop(at + dur + 0.01);
  }
}

/** Cloche 8 bits : triangle + deux carrés inharmoniques, longue chute. */
export function chipBell(o: Out, m: number, at: number, vol: number, len = 1.8) {
  const f = mtof(m), g = gain(1);
  route(g, o, 0.45);
  const part = (w: Duty | 'tri', r: number, a: number, k: number) => {
    const e = ac!.createGain(), end = at + len * k;
    e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(vol * a, at + 0.002);
    e.gain.exponentialRampToValueAtTime(0.0001, end);
    e.connect(g);
    osc(w === 'tri' ? 'triangle' : B().w[w], f * r, at, end + 0.01, e);
  };
  part('tri', 1, 1, 1); part('p12', 2.76, 0.32, 0.55); part('p12', 5.4, 0.14, 0.28);
}

function nz(o: Out, at: number, len: number, vol: number, rate: number) {
  const e = ac!.createGain(), s = ac!.createBufferSource();
  e.gain.setValueAtTime(vol, at);
  e.gain.exponentialRampToValueAtTime(Math.max(vol * 0.02, 0.0001), at + len);
  e.connect(o.d);
  s.buffer = B().lfsr; s.playbackRate.value = rate;
  s.connect(e); s.start(at, Math.random() * 0.9); s.stop(at + len + 0.005);
}
function thump(o: Out, f0: number, f1: number, at: number, len: number, vol: number) {
  const e = ac!.createGain();
  e.gain.setValueAtTime(vol, at);
  e.gain.exponentialRampToValueAtTime(0.0001, at + len);
  e.connect(o.d);
  osc('triangle', f0, at, at + len + 0.005, e, f1, len * 0.8);
}

/** Batterie : K grosse caisse, S caisse claire, H charleston, O charleston ouvert, C cymbale, T tom. k = nuance. */
export function drum(o: Out, kind: DrumKind, at: number, k = 1, hat = VOL.hat) {
  switch (kind) {
    case 'K': thump(o, 165, 46, at, 0.12, VOL.kick * k); nz(o, at, 0.012, VOL.snare * 0.35 * k, 0.5); break;
    case 'S': nz(o, at, 0.13, VOL.snare * k, 0.55); thump(o, 220, 130, at, 0.07, VOL.kick * 0.5 * k); break;
    case 'T': thump(o, 240, 90, at, 0.15, VOL.kick * 0.8 * k); nz(o, at, 0.05, VOL.snare * 0.45 * k, 0.3); break;
    case 'H': nz(o, at, 0.03, hat * k, 1); break;
    case 'O': nz(o, at, 0.13, hat * 1.3 * k, 1); break;
    case 'C': nz(o, at, 0.8, VOL.crash * k, 0.8); break;
  }
}

/** Bourdon : note tenue qui monte en douceur (annonce du boss). */
export function drone(o: Out, inst: Duty | 'tri', m: number, at: number, dur: number, vol: number, rise = 0.5) {
  const e = ac!.createGain(), p = e.gain;
  p.setValueAtTime(0, at); p.linearRampToValueAtTime(vol, at + rise);
  p.setValueAtTime(vol, at + dur - 0.03); p.linearRampToValueAtTime(0, at + dur);
  e.connect(o.d);
  osc(inst === 'tri' ? 'triangle' : B().w[inst], mtof(m), at, at + dur + 0.01, e);
}

/** Montée de bruit : volume et hauteur grimpent ensemble, coupée net à la fin. */
export function riser(o: Out, at: number, dur: number, vol: number) {
  const e = ac!.createGain(), s = ac!.createBufferSource();
  e.gain.setValueAtTime(0.0001, at);
  e.gain.exponentialRampToValueAtTime(vol, at + dur - 0.01);
  e.gain.linearRampToValueAtTime(0, at + dur);
  e.connect(o.d);
  s.buffer = B().lfsr; s.loop = true;
  s.playbackRate.setValueAtTime(0.12, at); s.playbackRate.exponentialRampToValueAtTime(1, at + dur);
  s.connect(e); s.start(at, Math.random() * 0.9); s.stop(at + dur + 0.01);
}
