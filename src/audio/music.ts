import { AUDIO } from '../config';
import { ac, now, gain, mtof, rnd, filt, noise, lfo, musBus, musVerb, musLP, type Out } from './core';
import { pluck, bell, choir, organ, bow, brass, timp, drum } from './inst';

// Musique générative : chaque piste écrit une mesure à la fois (un peu en avance), avec rubato et nuances
// aléatoires. Un même thème (THEME) revient d'une piste à l'autre : harpe au menu, alto en combat, majeur à l'aube.

type St = { phase: number };
interface Track { bar: number; /** niveau relatif de la piste */ vol?: number; play(o: Out, t: number, i: number, s: St): void; amb?(o: Out, t: number): (at: number) => void }

const hum = (s = 0.01) => rnd(-s, s);
const vel = (x: number) => x * rnd(0.9, 1.08);
const F = (ms: number[]) => ms.map(mtof);

/** Thème (ré mineur), 8 mesures : [temps, note midi, durée en temps]. */
const THEME: [number, number, number][][] = [
  [[0, 69, 1.5], [1.5, 70, 0.5], [2, 69, 1], [3, 65, 1]],
  [[0, 62, 2], [2.5, 65, 0.5], [3, 67, 1]],
  [[0, 70, 1.5], [1.5, 69, 0.5], [2, 67, 1], [3, 74, 1]],
  [[0, 73, 3], [3, 69, 1]],
  [[0, 74, 1.5], [1.5, 76, 0.5], [2, 77, 1], [3, 76, 0.5], [3.5, 74, 0.5]],
  [[0, 72, 2], [2, 69, 1], [3, 72, 1]],
  [[0, 70, 1], [1, 69, 1], [2, 67, 1.5], [3.5, 65, 0.5]],
  [[0, 64, 1], [1, 61, 1], [2, 69, 2]],
];
/** Harmonie du thème : basse, accord du chœur. Dm Bb Gm A | Dm F/C Gm/Bb A. */
const CH: [number, number[]][] = [
  [38, [57, 62, 65]], [34, [58, 62, 65]], [43, [58, 62, 67]], [33, [57, 61, 64]],
  [38, [57, 62, 65]], [36, [57, 60, 65]], [34, [55, 62, 67]], [33, [57, 61, 64]],
];
/** Le thème passé en ré majeur (fa, si bémol, do haussés). */
const MAJ = (m: number) => ([5, 10, 0].includes(m % 12) ? m + 1 : m);

/** Accord brisé lent et clairsemé à la harpe (jamais deux fois pareil). */
function arp(o: Out, bass: number, ch: number[], t: number, q: number, vol: number, kind: 'harp' | 'lute' = 'harp') {
  const ns = [bass + 12, ...ch, ch[1] + 12], pos = [0, 0.5, 1, 2, 2.5, 3];
  pos.forEach((p, j) => pluck(o, mtof(ns[Math.min(j, ns.length - 1)]), t + p * q + hum(), vel(vol * (j ? 0.75 : 1)), kind, 0.45));
}

/** Vent de nuit : bruit filtré dont la couleur et le souffle ondulent lentement. */
function wind(o: Out, t: number) {
  const g = gain(0.05), f = filt('bandpass', 520, 0.8, g);
  g.connect(o.d); g.connect(gain(0.6)).connect(o.w);
  const ls = [lfo(0.07, 260, f.frequency, t, t + 3600).o, lfo(0.11, 0.03, g.gain, t, t + 3600).o, noise(t, t + 3600, f, 0.7)];
  return (at: number) => ls.forEach((n) => n.stop(at));
}
const TRACKS: Record<string, Track> = {
  /** Menu : orgue, chœur, cloche lointaine ; le thème à la harpe puis au violoncelle. */
  menu: {
    bar: 4.6,
    play(o, t, i) {
      const k = i % 8, cyc = Math.floor(i / 8) % 4, [bass, ch] = CH[k], q = this.bar / 4;
      organ(o, F([bass, bass + 12]), t, this.bar + 0.2, 0.03, 0.6);
      if (cyc || k > 1) choir(o, F(ch), t + hum(0.05), this.bar + 0.6, 0.02, k % 4 === 3 ? 'a' : 'o');
      if (k === 0) bell(o, mtof(50), t, 0.05, 6, 0.8);
      if (cyc % 2) THEME[k].forEach(([b, m]) => pluck(o, mtof(m), t + b * q + hum(0.035), vel(0.1), 'harp', 0.5));
      else if (cyc === 2) THEME[k].forEach(([b, m, d]) => bow(o, mtof(m - 12), t + b * q + hum(0.02), d * q, 0.045, { a: 0.3, wet: 0.5 }));
      else arp(o, bass, ch, t, q, 0.06);
    },
  },
  /** Dehors, la nuit : vent, bourdon d'orgue, luth, cloche du château. */
  night: {
    vol: 1.5,
    bar: 4.6,
    amb: wind,
    play(o, t, i) {
      const k = i % 8, [bass, ch] = CH[k], q = this.bar / 4;
      if (k % 2 === 0) organ(o, F([38, 45]), t, this.bar * 2 + 0.2, 0.016, 0.7);
      if (i % 16 === 0) bell(o, mtof(50), t + 1, 0.035, 6, 0.9);
      if (i % 16 >= 8 && k < 4) THEME[k].forEach(([b, m]) => pluck(o, mtof(m - 12), t + b * q + hum(), vel(0.09), 'lute', 0.4));
      else if (k % 2 === 0) arp(o, bass - 12, ch.map((m) => m - 12), t, q, 0.06, 'lute');
    },
  },
  /** Tuto : ostinato de luth, violoncelle tenu, notes de harpe éparses (ré dorien). */
  tuto: {
    vol: 1.4,
    bar: 3.2,
    play(o, t, i) {
      const PR: [number, number[]][] = [[38, [50, 57, 62, 65]], [36, [48, 55, 60, 64]], [34, [46, 53, 58, 62]], [36, [48, 55, 60, 64]]];
      const [bass, ch] = PR[i % 4], e = this.bar / 8;
      [0, 1, 2, 3, 2, 1, 2, 1].forEach((n, j) => pluck(o, mtof(ch[n]), t + j * e + hum(0.012), vel(j % 4 ? 0.045 : 0.07), 'lute', 0.3));
      bow(o, mtof(bass), t, this.bar, 0.035, { a: 0.4, wet: 0.4, vib: 8, bright: 3 });
    },
  },
  /** Ysolde : ostinato de cordes (3+3+2), timbales, chœur, le thème à l'alto ; phase 2 : tambours, cuivres, cloche. */
  boss1: {
    vol: 0.6,
    bar: 2.14,
    play(o, t, i, s) {
      const k = i % 4, sec = i % 16, p2 = s.phase > 1, e = this.bar / 8, q = this.bar / 4;
      const BB = [38, 34, 31, 33][k], ch = CH[k][1];
      [0, 0, 12, 0, 0, 12, 0, 7].forEach((d, j) => bow(o, mtof(BB + 12 + d), t + j * e + hum(0.006), e * 0.8, [0, 3, 6].includes(j) ? 0.07 : 0.042, { a: 0.012, wet: 0.2, vib: 0, bright: 6 }));
      bow(o, mtof(BB), t, this.bar, 0.06, { a: 0.05, wet: 0.3, vib: 4, bright: 4 });
      const tp = mtof(BB < 36 ? BB + 12 : BB);
      timp(o, tp, t, 0.22); timp(o, tp, t + 3 * e, 0.11);
      if (k === 3) for (let j = 12; j < 16; j++) timp(o, tp, t + j * e / 2, 0.05 + j * 0.01);
      choir(o, F(ch), t, this.bar, p2 ? 0.026 : 0.018, 'o', 0.5);
      if (k % 2 === 0) for (const m of [BB + 12, BB + 19]) brass(o, mtof(m), t, this.bar * 2, 0.03, 0.4, true);
      if (sec >= 8) THEME[k].forEach(([b, m, d]) => brass(o, mtof(m - 12), t + b * q + hum(0.006), d * q * 0.95, 0.045, 0.4, true));
      if (p2 && sec >= 4) THEME[k].forEach(([b, m, d]) => bow(o, mtof(m), t + b * q + hum(0.006), d * q * 0.95, 0.045, { a: 0.06, wet: 0.45, vib: 10, bright: 6 }));
      if (p2) {
        for (let j = 0; j < 16; j++) if (j % 4 === 0 || j === 10) drum(o, t + j * e / 2, 0.2, 'low'); else if ([2, 6, 7, 11, 14, 15].includes(j)) drum(o, t + j * e / 2, j % 2 ? 0.035 : 0.06, 'tak');
        for (const m of ch) brass(o, mtof(m - 12), t, e * 1.4, 0.022, 0.4);
        if (k === 0) bell(o, mtof(74), t, 0.025, 2.5, 0.6);
      }
    },
  },
  /** Nycthor : 12/8 lent, mi phrygien, cœur qui bat, cloches des lanternes ; phase 2 : ostinato pincé, timbales. */
  boss2: {
    vol: 0.75,
    bar: 2.86,
    play(o, t, i, s) {
      const k = i % 4, p2 = s.phase > 1, e = this.bar / 12;
      const [bass, ch] = ([[40, [59, 64, 67]], [41, [60, 65, 69]], [40, [59, 64, 67]], [38, [57, 62, 65]]] as [number, number[]][])[k];
      organ(o, F([bass - 12, bass]), t, this.bar + 0.1, 0.035, 0.5);
      choir(o, F(ch), t, this.bar + 0.3, 0.018, 'u', 0.7);
      for (const b of p2 ? [0, 3, 6, 9] : [0, 6]) { drum(o, t + b * e, 0.22, 'low'); drum(o, t + (b + 0.7) * e, 0.13, 'low'); }
      if (k % 2 === 0 || p2) for (const [b, m] of [[0, 76], [3, 79], [5, 77], [8, 71]]) bell(o, mtof(m + (k === 3 ? -2 : 0)), t + b * e + hum(0.012), 0.016, 2.4, 0.6, undefined, 5);
      if (k === 1) bow(o, mtof(53), t, this.bar, 0.03, { trem: 11, a: 0.4, wet: 0.5 });
      if (p2) {
        [0, 7, 12, 13, 12, 7, 0, 7, 12, 13, 15, 13].forEach((d, j) => pluck(o, mtof(bass + 12 + d), t + j * e + hum(0.008), vel(j % 3 ? 0.04 : 0.06), 'lute', 0.3));
        timp(o, mtof(bass), t, 0.18); timp(o, mtof(bass), t + 6 * e, 0.12);
      }
    },
  },
  /** McKING : petite marche de banquet pompeuse (fa majeur, 2/4) : tuba, clavecin, bois ; phase 2 : cuivres, caisse claire. */
  feast: {
    vol: 0.85,
    bar: 0.9375,
    play(o, t, i, s) {
      const k = i % 8, p2 = s.phase > 1, e = this.bar / 4;
      const BS = [41, 36, 41, 34, 36, 36, 41, 36][k];
      const CF = [[65, 69, 72], [64, 67, 70], [65, 69, 72], [62, 65, 70], [65, 69, 72], [64, 67, 70], [65, 69, 72], [64, 67, 70]][k];
      const MEL = [
        [[0, 72], [1, 77], [2, 76], [3, 77]], [[0, 79], [1, 76], [2, 72], [3, 70]], [[0, 69], [1, 72], [2, 77], [3, 81]], [[0, 82, 2], [2, 81], [3, 79]],
        [[0, 77], [1, 81], [2, 79], [3, 77]], [[0, 76], [1, 79], [2, 70], [3, 76]], [[0, 77, 2], [2, 72], [3, 69]], [[0, 67], [1, 64], [2, 65, 2]],
      ][k];
      brass(o, mtof(BS), t, e * 1.5, 0.06, 0.15); brass(o, mtof(BS + 7), t + 2 * e, e * 1.5, 0.05, 0.15);
      for (const at of [1, 3]) for (const m of CF) pluck(o, mtof(m - 12), t + at * e + hum(0.005), 0.03, 'harpsi', 0.15);
      for (const [b, m, d = 1] of MEL) {
        pluck(o, mtof(m), t + b * e + hum(0.005), vel(0.075), 'harpsi', 0.2);
        if (p2) brass(o, mtof(m - 12), t + b * e, d * e * 0.85, 0.03, 0.3);
      }
      for (const j of [1, 3]) drum(o, t + j * e + e / 2, 0.05, 'tak');
      if (k === 0 && i % 16 === 0) timp(o, mtof(41), t, 0.2);
      if (p2 && k === 7) for (let j = 0; j < 8; j++) drum(o, t + j * e / 2, 0.04 + j * 0.012, 'snare');
    },
  },
  /** Escalier de la tour : orgue sourd, chœur fermé. */
  tower: {
    bar: 4,
    play(o, t, i) {
      const [bass, ch] = CH[(i % 2) * 2];
      organ(o, F([bass, bass + 12]), t, this.bar + 0.2, 0.025, 0.7);
      choir(o, F(ch), t + 0.2, this.bar, 0.014, 'u', 0.8);
    },
  },
  /** Après un boss : ré majeur (tierce picarde) et sol mineur, harpe très calme. */
  calm: {
    vol: 1.2,
    bar: 4.6,
    play(o, t, i) {
      const ch = i % 2 ? [50, 58, 62, 67] : [50, 57, 62, 66];
      organ(o, F([38]), t, this.bar + 0.2, 0.02, 0.7);
      choir(o, F(ch), t, this.bar + 0.5, 0.016, 'o', 0.8);
      arp(o, 38, ch.slice(1), t, this.bar / 4, 0.045);
    },
  },
  /** Aube, couronnement : le thème en ré majeur à la harpe, orgue et chœur doux. */
  dawn: {
    bar: 3.4,
    play(o, t, i) {
      const k = i % 8, q = this.bar / 4;
      const [bass, ch] = ([[38, [62, 66, 69]], [35, [62, 66, 71]], [31, [62, 67, 71]], [33, [61, 64, 69]], [38, [62, 66, 69]], [37, [61, 66, 69]], [35, [62, 67, 71]], [33, [61, 64, 69]]] as [number, number[]][])[k];
      organ(o, F([bass, bass + 12]), t, this.bar + 0.2, 0.024, 0.5);
      choir(o, F(ch), t, this.bar + 0.4, 0.013, 'o', 0.6);
      if (Math.floor(i / 8) % 2) THEME[k].forEach(([b, m]) => pluck(o, mtof(MAJ(m)), t + b * q + hum(0.03), vel(0.09), 'harp', 0.5));
      else arp(o, bass, ch, t, q, 0.055);
      if (i % 16 === 0) bell(o, mtof(62), t, 0.03, 5, 0.8);
    },
  },
};

/** Piste par scène (les scènes absentes gardent la piste en cours). */
const BY_SCENE: Record<string, string> = { Menu: 'menu', Outside: 'night', Test: 'tuto', Boss1: 'boss1', Boss2: 'boss2', Boss3: 'feast', Transit: 'tower', Dawn: 'dawn', Throne: 'dawn' };

let want = '', fade = 1.5;
let cur: { name: string; tr: Track; g: GainNode; w: GainNode; next: number; i: number; stop?: (at: number) => void } | null = null;
const st: St = { phase: 1 };

function swap() {
  const t = now();
  if (cur) {
    const c = cur;
    for (const n of [c.g, c.w]) { n.gain.cancelScheduledValues(t); n.gain.setValueAtTime(n.gain.value, t); n.gain.linearRampToValueAtTime(0, t + fade); }
    c.stop?.(t + fade + 0.1);
    setTimeout(() => { c.g.disconnect(); c.w.disconnect(); }, (fade + 9) * 1000);
  }
  cur = null;
  const tr = TRACKS[want];
  if (!tr) return;
  const g = gain(0), w = gain(0);
  g.connect(musBus); w.connect(musVerb);
  for (const n of [g, w]) { n.gain.setValueAtTime(0, t); n.gain.linearRampToValueAtTime(tr.vol ?? 1, t + 1.2); }
  cur = { name: want, tr, g, w, next: t + 0.1, i: 0, stop: tr.amb?.({ d: g, w }, t) };
}

/** Planificateur : écrit les mesures qui commencent dans moins de 0,6 s. */
function tick() {
  if (!ac || ac.state !== 'running') return;
  if (want !== (cur?.name ?? '')) swap();
  if (!cur) return;
  const t = now();
  if (cur.next < t) cur.next = t + 0.05; // onglet en arrière-plan : on saute plutôt que d'empiler
  while (cur.next < t + 0.6) { cur.tr.play({ d: cur.g, w: cur.w }, cur.next, cur.i++, st); cur.next += cur.tr.bar; }
}
setInterval(tick, 100);

export const music = {
  play(name: string, sec = 1.5) { want = name; fade = sec; },
  stop(sec = 1.5) { want = ''; fade = sec; },
  /** Phase du boss : les pistes de combat ajoutent leurs couches à la mesure suivante. */
  phase(n: number) { st.phase = n; },
  /** Pause : musique plus basse et étouffée. */
  duck(on: boolean) {
    if (!ac) return;
    const t = now(), k = on ? 0.35 : 1;
    musBus.gain.setTargetAtTime(AUDIO.music * k, t, 0.08); musVerb.gain.setTargetAtTime(AUDIO.music * k, t, 0.08);
    musLP.frequency.setTargetAtTime(on ? 700 : 18000, t, 0.08);
  },
  /** Appelé à la création de chaque scène. */
  scene(key: string) {
    if (key === 'Pause') return this.duck(true);
    if (key === 'GameOver') return this.stop(0.3);
    if (!(key in BY_SCENE)) return;
    this.duck(false); st.phase = 1;
    this.play(BY_SCENE[key]);
  },
  /** DEV : rendu hors ligne d'une piste (pour mesurer les niveaux). */
  track: (name: string) => TRACKS[name],
};
