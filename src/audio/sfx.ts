import { ac, now, fx, level, env, route, osc, noise, filt, gain, lfo, mtof, rnd, v } from './core';
import { pluck, bell, glass, choir, brass, bow, voice } from './inst';
import { tone } from './chip';
export { unlockAudio } from './core';

// Bruitages synthétisés : couches (impact + corps + queue), variations aléatoires, réverb de nef dosée par son.

/** Souffle filtré : bruit → filtre (balayage f0 → f1) → enveloppe. */
function nz(at: number, a: number, r: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1, wet = 0.15) {
  const e = env(at, a, vol, 0, r); route(e, fx(), wet);
  noise(at, at + a + r + 0.05, filt(type, f0, q, e, f1 !== f0 ? f1 : 0, at, a + r));
}
/** Ton : oscillateur glissant f0 → f1. */
function tn(at: number, a: number, r: number, vol: number, type: OscillatorType, f0: number, f1 = f0, wet = 0.15) {
  const e = env(at, a, vol, 0, r); route(e, fx(), wet);
  osc(type, f0, at, at + a + r + 0.05, e, f1 !== f0 ? f1 : 0, a + r);
}
/** Métal frappé : partiels inharmoniques à décroissances différentes. */
const ARMOR = [[1, 1, 1], [1.47, 0.6, 0.7], [2.09, 0.5, 0.55], [2.56, 0.35, 0.4], [3.37, 0.25, 0.3]];
const GLINT = [[1, 1, 1], [2, 0.3, 0.5], [3, 0.1, 0.3]];
function metal(at: number, f: number, vol: number, dur: number, wet = 0.3, P = ARMOR) {
  const g = gain(1); route(g, fx(), wet);
  for (const [r, a, k] of P) { const e = env(at, 0.001, vol * a, 0, dur * k); e.connect(g); osc('sine', f * r, at, at + dur * k + 0.05, e); }
}
/** Éclats / gravats : petits grains de bruit éparpillés. */
function debris(at: number, n: number, spread: number, vol: number) {
  for (let i = 0; i < n; i++) { const f = rnd(1800, 5000); nz(at + rnd(0, spread) * (i / n), 0.001, rnd(0.015, 0.045), vol * rnd(0.5, 1), 'bandpass', f, f, 2, 0.15); }
}
function impact(at: number, vol: number) {
  tn(at, 0.002, 0.55, 0.42 * vol, 'sine', 70, 27, 0.25);
  nz(at, 0.002, 0.42, 0.5 * vol, 'lowpass', 900, 150, 0.6, 0.3);
  nz(at, 0.001, 0.05, 0.2 * vol, 'bandpass', 1900, 1900, 1.2, 0.1);
}
/** Ne joue que si l'audio est débloqué ; t = maintenant. */
function go<A extends unknown[]>(f: (t: number, ...a: A) => void, k = 1) { return (...a: A) => { if (ac) level(k, () => f(now() + 0.004, ...a)); }; }

/** Pluie et vent en continu (bus des bruitages, pas de la musique). Rend de quoi l'arrêter. */
export function stormSound() {
  if (!ac) return null;
  const t = now(), end = t + 3600, m = gain(0), o = fx();
  m.gain.setValueAtTime(0, t); m.gain.linearRampToValueAtTime(1, t + 0.8);
  m.connect(o.d);
  const hiss = gain(0.05), body = gain(0.075), wind = gain(0.05), wf = filt('bandpass', 420, 1.1, wind);
  hiss.connect(m); body.connect(m); wind.connect(m);
  const nodes = [
    noise(t, end, filt('highpass', 2800, 0.5, hiss)), noise(t, end, filt('bandpass', 900, 0.6, body), 0.8), noise(t, end, wf, 0.5),
    lfo(0.09, 220, wf.frequency, t, end).o, lfo(0.13, 0.02, wind.gain, t, end).o,
  ];
  return {
    stop(fade = 0.5) {
      const at = now();
      m.gain.cancelScheduledValues(at); m.gain.setValueAtTime(m.gain.value, at); m.gain.linearRampToValueAtTime(0, at + fade);
      for (const n of nodes) n.stop(at + fade + 0.05);
    },
    /** Pause : la pluie passe au loin. */
    duck(on: boolean) { m.gain.setTargetAtTime(on ? 0.25 : 1, now(), 0.08); },
    /** Rafale (0..1) : le vent monte, la pluie frappe plus fort. */
    gust(x: number) { const at = now(); wind.gain.setTargetAtTime(0.03 + x * 0.09, at, 0.6); body.gain.setTargetAtTime(0.065 + x * 0.03, at, 0.6); },
  };
}

export const sfx = {
  jump: go((t) => { nz(t, 0.01, 0.09, 0.09, 'bandpass', v(900), 2200, 1.2, 0.08); tn(t, 0.004, 0.05, 0.025, 'sine', v(190), 280, 0.05); }, 5),
  land: go((t) => { nz(t, 0.002, 0.07, 0.2, 'lowpass', 520, 200, 0.7, 0.08); tn(t, 0.002, 0.08, 0.12, 'sine', v(95), 48, 0.05); nz(t, 0.001, 0.03, 0.035, 'highpass', 3500, 3500, 0.7, 0); }, 0.7),
  dash: go((t) => {
    nz(t, 0.02, 0.2, 0.3, 'bandpass', v(2600), 520, 0.9, 0.2); nz(t, 0.01, 0.14, 0.12, 'lowpass', 700, 300, 0.7, 0.1);
    tn(t + 0.02, 0.01, 0.2, 0.012, 'sine', 1900, 1100, 0.6);
  }, 1.5),
  swing: go((t, i: number) => {
    const f = v(1500 + i * 350); nz(t, 0.025, 0.09, 0.22, 'bandpass', f, f * 2.4, 1.6, 0.12);
    if (i >= 2) metal(t + 0.03, v(2900, 0.04), 0.016, 0.25, 0.35, GLINT);
  }, 1.25),
  hit: go((t) => { tn(t, 0.002, 0.09, 0.22, 'sine', v(170), 55, 0.1); nz(t, 0.001, 0.06, 0.28, 'lowpass', 2200, 700, 0.8, 0.1); nz(t, 0.001, 0.025, 0.09, 'bandpass', 4200, 4200, 2.5, 0); }, 2.5),
  hurt: go((t) => {
    tn(t, 0.002, 0.18, 0.34, 'sine', 140, 40, 0.12); nz(t, 0.001, 0.12, 0.3, 'lowpass', 1500, 280, 0.7, 0.15);
    nz(t, 0.001, 0.02, 0.1, 'highpass', 3500, 3500, 0.7, 0);
  }, 1.4),
  spell: go((t) => {
    nz(t, 0.08, 0.35, 0.13, 'bandpass', 500, 5200, 1.1, 0.4); tn(t, 0.005, 0.3, 0.14, 'sine', 210, 85, 0.2);
    glass(fx(), 1175, t, 0.04, 1.8); glass(fx(), 1568, t + 0.03, 0.045, 1.6); glass(fx(), 2093, t + 0.07, 0.03, 1.4);
  }),
  manaFull: go((t) => { [81, 86, 93].forEach((m, i) => tone(fx(), 'p12', m, t + i * 0.06, 0.22, 0.09, { pluck: true, wet: 0.35 })); }),
  /** Télégraphe : pouls grave (gong sourd) + reflet net, souffle qui monte. */
  warn: go((t) => {
    tn(t, 0.004, 0.32, 0.075, 'sine', 98, 92, 0.35); tn(t, 0.004, 0.22, 0.03, 'sine', 196, 186, 0.35);
    glass(fx(), v(1760, 0.02), t + 0.01, 0.022, 0.5, 0.5); nz(t, 0.08, 0.06, 0.04, 'highpass', 4000, 7000, 0.7, 0.3);
  }, 0.8),
  shoot: go((t) => { tn(t, 0.005, 0.14, 0.09, 'sine', v(380), 170, 0.3); nz(t, 0.005, 0.1, 0.08, 'bandpass', 1100, 500, 1, 0.2); }, 1.4),
  /** Menus : petits bips au synthé de la musique (chip.ts). */
  tick: go((t) => { tone(fx(), 'p25', 86, t, 0.035, 0.05, { pluck: true }); }),
  select: go((t) => { tone(fx(), 'p25', 74, t, 0.07, 0.09, { pluck: true }); tone(fx(), 'p25', 81, t + 0.06, 0.13, 0.09, { pluck: true, wet: 0.2 }); tone(fx(), 'tri', 50, t, 0.1, 0.2, { pluck: true }); }),
  /** Rugissement : grondement (souffle grave haché), cors très sombres en quinte, infra. */
  roar: go((t) => {
    const g = env(t, 0.2, 0.2, 0.4, 0.6); route(g, fx(), 0.35);
    const am = gain(0.55); lfo(17, 0.45, am.gain, t, t + 1.3); am.connect(g); noise(t, t + 1.3, filt('lowpass', 260, 1.2, am, 640, t, 0.5));
    brass(fx(), mtof(38), t + 0.05, 0.9, 0.1, 0.4, true); brass(fx(), mtof(33), t + 0.05, 1, 0.1, 0.4, true);
    tn(t, 0.15, 1, 0.2, 'sine', 50, 36, 0.2);
  }, 0.6),
  slam: go((t) => { impact(t, 1); debris(t + 0.04, 6, 0.4, 0.05); }),
  clank: go((t) => { metal(t, v(560, 0.08), 0.05, 0.28); nz(t, 0.001, 0.02, 0.18, 'highpass', 2500, 2500, 0.7, 0.05); }, 1.4),
  whoosh: go((t) => { const f = v(380, 0.15); nz(t, 0.09, 0.2, 0.36, 'bandpass', f, f * 2.6, 1.1, 0.2); nz(t, 0.06, 0.2, 0.14, 'lowpass', 500, 220, 0.7, 0.1); }),
  blade: go((t) => { nz(t, 0.03, 0.25, 0.14, 'bandpass', v(2800), 1300, 9, 0.45); tn(t, 0.02, 0.22, 0.02, 'sine', 1400, 700, 0.45); }, 2),
  leap: go((t) => { nz(t, 0.08, 0.22, 0.22, 'lowpass', 300, 1100, 0.8, 0.15); tn(t, 0.04, 0.22, 0.12, 'sine', 85, 170, 0.15); }),
  bossDeath: go((t) => {
    impact(t, 1.1); debris(t + 0.1, 14, 1.4, 0.06); nz(t + 0.2, 0.3, 1.4, 0.2, 'lowpass', 600, 120, 0.7, 0.4);
    bell(fx(), mtof(50), t + 0.15, 0.12, 7, 0.7); choir(fx(), [50, 57, 62].map(mtof), t + 0.3, 2.4, 0.03, 'o', 0.8);
  }),
  step: go((t) => { tn(t, 0.003, 0.12, 0.16, 'sine', v(68), 40, 0.1); nz(t, 0.002, 0.08, 0.14, 'lowpass', 320, 180, 0.7, 0.1); }, 1.6),
  thud: go((t) => { tn(t, 0.002, 0.16, 0.26, 'sine', v(88), 42, 0.15); nz(t, 0.002, 0.1, 0.2, 'lowpass', 420, 200, 0.7, 0.15); }, 1.8),
  rumble: go((t) => { nz(t, 0.12, 0.6, 0.38, 'lowpass', 160, 90, 0.7, 0.3); tn(t, 0.1, 0.55, 0.1, 'sine', 42, 36, 0.2); debris(t + 0.05, 5, 0.5, 0.03); }),
  /** Portail : souffle tourbillonnant (filtre balayé + modulé), glissando, éclat de cristal. */
  portal: go((t) => {
    const e = env(t, 0.15, 0.2, 0.3, 0.5); route(e, fx(), 0.6);
    const f = filt('bandpass', 300, 4, e, 2400, t, 0.6); lfo(7, 500, f.frequency, t, t + 1); noise(t, t + 1, f);
    const g = env(t, 0.1, 0.05, 0, 0.6); route(g, fx(), 0.6); lfo(9, 25, osc('sine', 160, t, t + 0.8, g, 640, 0.6).detune, t, t + 0.8);
    glass(fx(), 1318, t + 0.35, 0.025, 1.2);
  }),
  /** Tonnerre : claquement si proche, puis roulement grave qui s'éloigne. */
  thunder: go((t, near: number = 0.5) => {
    if (near > 0.5) { nz(t, 0.002, 0.14, 0.5, 'highpass', 1400, 600, 0.7, 0.3); debris(t + 0.02, 6, 0.2, 0.05); }
    nz(t + 0.03, 0.12, 1.1, 0.75 * near + 0.2, 'lowpass', 520, 120, 0.7, 0.35);
    nz(t + 0.5, 0.35, 1.9, 0.55, 'lowpass', 220, 60, 0.7, 0.4);
    nz(t + 1.1, 0.4, 1.6, 0.3, 'lowpass', 300, 70, 0.7, 0.4);
    tn(t + 0.02, 0.1, 1.6, 0.32 * (near + 0.3), 'sine', 58, 30, 0.2);
  }),
  ting: go((t) => metal(t, v(2400, 0.05), 0.035, 0.35, 0.35, GLINT), 1.3),
  crack: go((t) => { nz(t, 0.001, 0.045, 0.3, 'highpass', 1100, 1100, 0.8, 0.15); debris(t + 0.01, 3, 0.08, 0.06); tn(t, 0.001, 0.06, 0.08, 'sine', 120, 60, 0.1); }),
  /** Pointe d'épée qui racle : bruit aigu haché. */
  scrape: go((t) => {
    const g = gain(0); route(g, fx(), 0.15);
    g.gain.setValueCurveAtTime(Float32Array.from({ length: 24 }, (_, i) => (0.3 + Math.random() * 0.7) * 0.11 * (1 - i / 24)), t, 0.24);
    noise(t, t + 0.26, filt('bandpass', v(3400), 3, g));
  }, 1.2),
  /** Mort du joueur : choc, cendres qui s'envolent et crépitent, quinte vide aux cordes graves. */
  death: go((t) => {
    tn(t, 0.002, 0.25, 0.25, 'sine', 110, 40, 0.2);
    nz(t + 0.2, 0.5, 1, 0.07, 'bandpass', 2500, 6000, 0.6, 0.5); debris(t + 0.3, 8, 0.9, 0.025);
    bow(fx(), mtof(38), t + 0.1, 1.4, 0.045, { a: 0.4, wet: 0.5, vib: 4, bright: 3 }); bow(fx(), mtof(45), t + 0.15, 1.3, 0.03, { a: 0.4, wet: 0.5, vib: 4, bright: 3 });
  }),
  chomp: go((t) => { nz(t, 0.001, 0.05, 0.38, 'bandpass', v(1000), 700, 1.2, 0.08); debris(t + 0.02, 3, 0.07, 0.07); tn(t, 0.001, 0.06, 0.1, 'sine', 190, 100, 0.05); }, 1.8),
  gulp: go((t) => { tn(t, 0.01, 0.17, 0.22, 'sine', v(280), 105, 0.1); tn(t + 0.12, 0.003, 0.05, 0.06, 'sine', 480, 900, 0.1); }),
  burp: go((t) => { voice(fx(), t, v(96), 68, 0.75, 0.22, 'o', 0.25, 0.03, 19); nz(t, 0.03, 0.6, 0.1, 'lowpass', 400, 200, 0.7, 0.2); }),
  splat: go((t) => {
    nz(t, 0.002, 0.14, 0.38, 'lowpass', 900, 300, 0.7, 0.15); tn(t, 0.002, 0.1, 0.15, 'sine', 160, 55, 0.1);
    nz(t + 0.01, 0.002, 0.08, 0.1, 'bandpass', 1800, 700, 4, 0.1); debris(t + 0.02, 4, 0.12, 0.04);
  }, 1.6),
  bell: go((t) => bell(fx(), v(mtof(69), 0.01), t, 0.1, 4, 0.5), 0.6),
  /** Foule : rumeur de voix mêlées (bruit en 3 bandes qui ondulent), sans voix synthétiques. */
  crowd: go((t, vol: number = 1) => {
    for (const [f, a] of [[500, 1], [1100, 0.6], [2200, 0.25]]) {
      const e = env(t, 0.25, 0.07 * vol * a, 0.4, 0.6); route(e, fx(), 0.4);
      const am = gain(0.6); lfo(rnd(5, 8), 0.4, am.gain, t, t + 1.4); am.connect(e); noise(t, t + 1.4, filt('bandpass', f, 1.2, am));
    }
  }, 3),
  rooster: go((t) => {
    voice(fx(), t, 520, 760, 0.12, 0.05, 'a', 0.3); voice(fx(), t + 0.14, 740, 660, 0.1, 0.05, 'a', 0.3);
    voice(fx(), t + 0.26, 680, 980, 0.32, 0.06, 'o', 0.3); voice(fx(), t + 0.6, 960, 560, 0.38, 0.05, 'a', 0.3);
  }),
  powerUp: go((t) => {
    [74, 78, 81, 86, 90, 93].forEach((m, i) => tone(fx(), 'p25', m, t + i * 0.055, 0.14, 0.08, { pluck: true, wet: 0.3 }));
    tone(fx(), 'tri', 62, t, 0.3, 0.2, { pluck: true }); glass(fx(), mtof(93), t + 0.34, 0.03, 1.5);
  }),
  /** GAME OVER : le choc au claquement du titre ; le glas et la descente sont dans le jingle (tracks.ts, defeat). */
  gameOver: go((t) => { const s = t + 0.4; impact(s, 1); debris(s, 6, 0.4, 0.04); }, 0.75),
};
