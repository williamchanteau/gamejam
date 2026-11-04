import { ac, osc, noise, filt, env, route, gain, lfo, rnd, type Out } from './core';

// Instruments synthétisés (sons et musique) : cordes pincées, cloches, chœur, orgue, cordes frottées, cuivres, percussions.

const ks = new Map<string, AudioBuffer>();
const PL = { harp: [0.55, 2.6, 5000], lute: [0.32, 1.7, 3800], harpsi: [0.95, 1.3, 7500] } as const;
/** Corde pincée (Karplus-Strong, tampon mis en cache par hauteur). */
export function pluck(o: Out, f: number, at: number, vol: number, kind: keyof typeof PL = 'harp', wet = 0.35) {
  const [bright, sec, cut] = PL[kind], sr = 22050, N = Math.max(2, Math.round(sr / f)), key = kind + N;
  let b = ks.get(key);
  if (!b) {
    const L = Math.floor(sr * sec), ring = new Float32Array(N);
    b = ac!.createBuffer(1, L, sr);
    let p = 0, m = 0;
    for (let i = 0; i < N; i++) { p += (Math.random() * 2 - 1 - p) * bright; ring[i] = p; m = Math.max(m, Math.abs(p)); }
    for (let i = 0; i < N; i++) ring[i] /= m || 1;
    const d = b.getChannelData(0), damp = Math.pow(0.001, 1 / ((sr / N) * sec));
    const lp = 1 - Math.exp((-2 * Math.PI * cut) / sr);
    for (let i = 0, j = 0, y = 0; i < L; i++) { y += (ring[j] - y) * lp; d[i] = y; const k = (j + 1) % N; ring[j] = (ring[j] + ring[k]) * 0.5 * damp; j = k; }
    ks.set(key, b);
  }
  const s = ac!.createBufferSource();
  s.buffer = b; s.playbackRate.value = f / (sr / N);
  const g = gain(vol); route(g, o, wet);
  s.connect(g); s.start(at);
}

/** Cloche : bourdon, fondamentale, harmoniques presque justes (son rond, pas de tierce qui frise). */
const BELL = [[0.5, 0.7, 1], [1, 1.2, 0.8], [2, 0.45, 0.5], [3, 0.2, 0.32], [4.2, 0.1, 0.2], [5.4, 0.05, 0.12]];
/** Cristal : fondamentale pure, deux harmoniques discrètes. */
const GLASS = [[1, 1, 1], [2, 0.22, 0.5], [3, 0.08, 0.3]];
export function bell(o: Out, f: number, at: number, vol: number, dur = 4, wet = 0.5, P = BELL, np = P.length) {
  const g = gain(1); route(g, o, wet);
  for (const [r, a, k] of P.slice(0, np)) {
    const e = env(at, 0.002, vol * a, 0, dur * k); e.connect(g);
    osc('sine', f * r * (1 + rnd(-0.002, 0.002)), at, at + dur * k + 0.05, e);
  }
  const n = env(at, 0.001, vol * 0.2, 0, 0.03); n.connect(g);
  noise(at, at + 0.04, filt('highpass', 3000, 0.7, n));
}
export const glass = (o: Out, f: number, at: number, vol: number, dur = 1.2, wet = 0.6) => bell(o, f, at, vol, dur, wet, GLASS);

/** Formants de voyelles (fréquence, gain, Q) pour les voix parlées. */
const VOW = {
  a: [[730, 1, 8], [1090, 0.5, 10], [2440, 0.2, 12]],
  o: [[480, 1, 8], [830, 0.45, 10], [2600, 0.1, 12]],
  u: [[330, 1, 8], [700, 0.3, 10], [2400, 0.08, 12]],
};
type Vow = keyof typeof VOW;
function formants(v: Vow, out: AudioNode) {
  const bus = gain(1);
  for (const [f, a, q] of VOW[v]) { const g = gain(a * 4); g.connect(out); bus.connect(filt('bandpass', f, q, g)); }
  return bus;
}

/** Couleur du chœur selon la voyelle : [coupure du passe-bas, bosse de présence] (u sombre → a clair). */
const PAD = { u: [800, 380], o: [1300, 560], a: [2000, 850] };
/** Chœur / nappe de cordes : 2 scies désaccordées par note, passe-bas doux, léger vibrato, attaque et release lentes. */
export function choir(o: Out, fs: number[], at: number, dur: number, vol: number, vw: Vow = 'o', wet = 0.6) {
  const [cut, bump] = PAD[vw], a = Math.min(1.4, dur * 0.4), end = at + dur + 1.6;
  const e = env(at, a, vol * 0.45, Math.max(0, dur - a), 1.4); route(e, o, wet);
  const pk = filt('peaking', bump, 1, e); pk.gain.value = 4;
  const lp = filt('lowpass', cut, 0.5, pk);
  for (const f of fs) {
    const ox = [-7, 6].map((d) => osc('sawtooth', f, at, end, lp, 0, 0, d));
    lfo(4.6 + rnd(-0.3, 0.3), 5, ox[0].detune, at, end, 1).g.connect(ox[1].detune);
  }
}

let orgW: PeriodicWave | null = null, orgC: BaseAudioContext | null = null;
/** Orgue : jeux de fonds (8', 4', 2 2/3', 2'…) + rang céleste légèrement désaccordé. */
export function organ(o: Out, fs: number[], at: number, dur: number, vol: number, wet = 0.5) {
  if (orgC !== ac) {
    orgC = ac;
    const im = new Float32Array([0, 1, 0.55, 0.32, 0.3, 0.06, 0.14, 0, 0.1]);
    orgW = ac!.createPeriodicWave(new Float32Array(im.length), im);
  }
  const out = gain(1); route(out, o, wet);
  const e = env(at, 0.12, vol, dur, 0.9), end = at + dur + 1.1;
  e.connect(filt('lowpass', 2800, 0.4, out));
  for (const f of fs) { osc(orgW!, f, at, end, e, 0, 0, rnd(-2, 2)); osc(orgW!, f, at, end, e, 0, 0, 7); }
}

/** Corde frottée (violoncelle, alto) : 2 scies, caisse de résonance, vibrato qui arrive, trémolo optionnel. */
export function bow(o: Out, f: number, at: number, dur: number, vol: number, p: { a?: number; wet?: number; vib?: number; trem?: number; bright?: number } = {}) {
  const a = p.a ?? 0.15, end = at + dur + 0.3, short = dur < 0.5;
  const e = env(at, a, vol, Math.max(0, dur - a), 0.22); route(e, o, p.wet ?? 0.35);
  let dst: AudioNode = e;
  if (!short) { const body = filt('peaking', 300, 1.2, e); body.gain.value = 5; dst = body; }
  if (p.trem) { const tg = gain(0.6); lfo(p.trem, 0.4, tg.gain, at, end); tg.connect(dst); dst = tg; }
  const lp = filt('lowpass', Math.min(6000, f * (p.bright ?? 5)), 0.8, dst);
  // notes courtes (spiccato) : une seule scie, pas de vibrato ; notes tenues : 2 scies, vibrato commun.
  const ox = (short ? [0] : [-5, 6]).map((d) => osc('sawtooth', f, at, end, lp, 0, 0, d));
  if (!short && p.vib !== 0) lfo(5.3 + rnd(-0.3, 0.3), p.vib ?? 12, ox[0].detune, at, end, 0.4).g.connect(ox[1].detune);
}

/** Cuivre : le filtre s'ouvre à l'attaque (le « blat »), retombe, vibrato léger. horn = cor sombre (attaque douce, son couvert). */
export function brass(o: Out, f: number, at: number, dur: number, vol: number, wet = 0.35, horn = false) {
  const a = horn ? Math.min(0.25, dur * 0.3) : 0.035, [o1, o2] = horn ? [3, 2] : [7, 3.5];
  const e = env(at, a, vol, Math.max(0, dur - a), horn ? 0.4 : 0.16); route(e, o, wet);
  const lp = filt('lowpass', f * 1.2, horn ? 0.7 : 1.4, e), fr = lp.frequency, end = at + dur + 0.5;
  fr.setValueAtTime(f * 1.2, at); fr.exponentialRampToValueAtTime(Math.min(9000, f * o1), at + a + 0.03); fr.exponentialRampToValueAtTime(Math.min(6000, f * o2), at + a + 0.3);
  const ox = [-6, 5].map((d) => osc('sawtooth', f, at, end, lp, 0, 0, d));
  if (dur > 0.5) lfo(5.5, 7, ox[0].detune, at, end, 0.5).g.connect(ox[1].detune);
}

/** Voix parlée / cri : scie glissante dans les formants, rugosité (modulation d'amplitude) optionnelle. */
export function voice(o: Out, at: number, f0: number, f1: number, dur: number, vol: number, vw: Vow = 'a', wet = 0.25, a = 0.02, rough = 0) {
  const out = gain(1); route(out, o, wet);
  const e = env(at, a, vol, Math.max(0, dur - a - 0.06), 0.08), end = at + dur + 0.1;
  e.connect(formants(vw, out));
  let dest: AudioNode = e;
  if (rough) { const am = gain(0.6); lfo(rough, 0.4, am.gain, at, end); am.connect(e); dest = am; }
  osc('sawtooth', f0, at, end, dest, f1 !== f0 ? f1 : 0, dur);
}

// Percussions pré-calculées (un tampon par son, joué tel quel) : quasi gratuites à rejouer.
const SR = 44100, perc = new Map<string, AudioBuffer>();
function bake(key: string, sec: number, gen: (d: Float32Array) => void) {
  let b = perc.get(key);
  if (!b) { b = ac!.createBuffer(1, Math.floor(SR * sec), SR); gen(b.getChannelData(0)); perc.set(key, b); }
  return b;
}
/** Sinus glissant f0 → f1 (constante tf) à décroissance exponentielle (constante ta), ajouté à d. */
function sweep(d: Float32Array, f0: number, f1: number, tf: number, ta: number, vol: number, tri = false) {
  for (let i = 0, ph = 0; i < d.length; i++) {
    const t = i / SR; ph += (f1 + (f0 - f1) * Math.exp(-t / tf)) / SR;
    const x = tri ? 1 - 4 * Math.abs((ph % 1) - 0.5) : Math.sin(2 * Math.PI * ph);
    d[i] += x * vol * Math.exp(-t / ta);
  }
}
/** Bruit filtré (passe-bas à un pôle ; hp = garde l'aigu) à décroissance exponentielle, ajouté à d. */
function hiss(d: Float32Array, cut: number, ta: number, vol: number, hp = false) {
  const a = 1 - Math.exp((-2 * Math.PI * cut) / SR);
  for (let i = 0, y = 0; i < d.length; i++) { const x = Math.random() * 2 - 1; y += (x - y) * a; d[i] += (hp ? x - y : y) * vol * Math.exp(-i / SR / ta); }
}
function play(o: Out, b: AudioBuffer, at: number, vol: number, wet: number, rate = 1) {
  const s = ac!.createBufferSource(), g = gain(vol);
  s.buffer = b; s.playbackRate.value = rate; s.connect(g); route(g, o, wet); s.start(at);
}

/** Timbale (tampon à 100 Hz, rejoué à la hauteur voulue) : sinus qui se pose, partiel de quinte, frappe feutrée. */
export function timp(o: Out, f: number, at: number, vol: number, wet = 0.4) {
  const b = bake('timp', 2, (d) => { sweep(d, 140, 100, 0.015, 0.16, 1); sweep(d, 150, 150, 1, 0.06, 0.35); hiss(d, 700, 0.01, 1.6); });
  play(o, b, at, vol, wet, f / 100);
}

/** Percussions : tambour grave (« low »), claquement de bois (« tak »), caisse claire (« snare »). */
export function drum(o: Out, at: number, vol: number, kind: 'low' | 'tak' | 'snare', wet = 0.25) {
  const b = kind === 'low' ? bake('low', 0.35, (d) => { sweep(d, 120, 52, 0.035, 0.03, 1); hiss(d, 500, 0.008, 1); })
    : kind === 'tak' ? bake('tak', 0.12, (d) => { sweep(d, 910, 910, 1, 0.006, 1, true); hiss(d, 2400, 0.003, 0.8, true); })
      : bake('snare', 0.3, (d) => { hiss(d, 1400, 0.016, 1.2, true); sweep(d, 190, 150, 0.02, 0.008, 0.5, true); });
  play(o, b, at, vol, wet, kind === 'tak' ? rnd(0.96, 1.04) : rnd(0.98, 1.02));
}
