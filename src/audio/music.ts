import { AUDIO } from '../config';
import { ac, now, gain, musBus, musVerb, musLP, type Out } from './core';
import { VOL, tone, chipBell, drum, type Duty, type DrumKind } from './chip';
import { TRACKS, type Track, type Ch } from './tracks';

// Séquenceur chiptune : écrit les pas un peu en avance sur l'horloge audio (donc boucles sans coupure, hors boucle de jeu).
// Une seule piste vivante à la fois ; l'ancienne s'éteint par son propre gain.

const STEPS = 16;
/** Avance d'écriture (s) ; plus large onglet masqué, où les minuteries ralentissent. */
const AHEAD = 0.3, AHEAD_HIDDEN = 1.6;

type Ev = { m?: number; d?: DrumKind; len: number } | null;
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(tok: string) {
  const s = /^([A-G])([#b]?)(\d)$/.exec(tok);
  if (!s) return null;
  return 12 * (+s[3] + 1) + SEMI[s[1]] + (s[2] === '#' ? 1 : s[2] === 'b' ? -1 : 0);
}
function parsePat(src: string, name: string): Ev[] {
  const t = src.trim().split(/\s+/), out: Ev[] = new Array(STEPS).fill(null);
  if (import.meta.env.DEV && t.length !== STEPS) console.error(`pattern ${name} : ${t.length} pas au lieu de ${STEPS}`);
  for (let i = 0; i < STEPS; i++) {
    const k = t[i];
    if (!k || k === '.' || k === '-') continue;
    let len = 1;
    while (t[i + len] === '-') len++;
    const m = midi(k);
    out[i] = m !== null ? { m, len } : { d: k as DrumKind, len };
  }
  return out;
}
type Comp = { def: Ch; bars: (Ev[] | null)[] };
const compiled = new Map<Track, { chs: Comp[]; bars: number }>();
function compile(tr: Track) {
  let c = compiled.get(tr);
  if (c) return c;
  const cache = new Map<string, Ev[]>();
  const pat = (n: string) => {
    if (n === '_') return null;
    if (!(n in tr.pats)) { if (import.meta.env.DEV) console.error(`pattern inconnu : ${n}`); return null; }
    let p = cache.get(n);
    if (!p) cache.set(n, (p = parsePat(tr.pats[n], n)));
    return p;
  };
  const chs = tr.ch.map((def) => ({ def, bars: def.seq.split(' ').flatMap((w) => { const [n, x] = w.split('*'); return Array.from({ length: +(x ?? 1) }, () => pat(n)); }) }));
  c = { chs, bars: Math.max(1, ...chs.map((x) => x.bars.length)) };
  compiled.set(tr, c);
  return c;
}

interface Run {
  name: string; tr: Track; chs: Comp[]; bars: number; o: Out; g: GainNode; w: GainNode;
  spb: number; next: number; bar: number; step: number; phase: number;
  /** Phase 2 demandée : fill sur la fin de la mesure, bascule à la suivante. */
  toP2: boolean;
  /** Tout est écrit, reste la queue. */
  end: number;
  /** Stinger : piste à enchaîner à la fin. */
  then: string;
}

const SEND = 0.5; // réverb de nef : une pointe seulement, le chiptune reste sec
let cur: Run | null = null;
/** Piste en attente du déblocage audio. */
let want = '';
/** Changement demandé pour le prochain début de mesure. */
let pending: { name: string; fade: number } | null = null;

// Étage de coupure (touche M) : indépendant du curseur OPTIONS et de l'étouffement de pause.
let muted = false;
try { muted = localStorage.getItem('ashenborn.mute') === '1'; } catch { /* file:// ou stockage bloqué */ }
let stage: { c: BaseAudioContext; d: GainNode; w: GainNode } | null = null;
function outStage() {
  if (stage?.c === ac) return stage;
  const k = muted ? 0 : 1, d = gain(k), w = gain(k);
  d.connect(musBus); w.connect(musVerb);
  return (stage = { c: ac!, d, w });
}

const running = () => !!ac && ac.state === 'running';

function fadeOut(r: Run | null, sec: number) {
  if (!r) return;
  const t = now();
  for (const n of [r.g, r.w]) { n.gain.cancelScheduledValues(t); n.gain.setValueAtTime(n.gain.value, t); n.gain.linearRampToValueAtTime(0, t + sec); }
  setTimeout(() => { r.g.disconnect(); r.w.disconnect(); }, (sec + 3) * 1000);
}

/** Lance une piste maintenant (ou à `at`), en fondu d'entrée `fade`, depuis la mesure `bar`. */
function start(name: string, fade: number, at = now() + 0.03, bar = 0, then = '') {
  const tr = TRACKS[name];
  if (!tr) return null;
  const s = outStage(), g = gain(0), w = gain(0), k = (tr.vol ?? 1) * VOL.all, { chs, bars } = compile(tr);
  g.connect(s.d); w.connect(s.w);
  for (const n of [g, w]) {
    n.gain.setValueAtTime(fade > 0.02 ? 0 : k, at);
    if (fade > 0.02) n.gain.linearRampToValueAtTime(k, at + fade);
  }
  const spb = 60 / tr.bpm / 4;
  const r: Run = { name, tr, chs, bars, o: { d: g, w }, g, w, spb, next: at, bar, step: 0, phase: 1, toP2: false, end: 0, then };
  tr.once?.(r.o, at);
  return r;
}

const FILL: [DrumKind, number][] = [['S', 0.5], ['S', 0.6], ['T', 0.75], ['S', 0.8], ['T', 0.9], ['S', 1]];

/** Écrit un pas de la piste à l'instant `at`. */
function writeStep(r: Run, at: number) {
  const fillAt = r.toP2 ? r.step - (STEPS - FILL.length) : -1;
  for (const { def, bars } of r.chs) {
    if (def.p && def.p !== r.phase) continue;
    if (def.i === 'drum' && fillAt >= 0) continue;
    const p = bars[r.bar % bars.length];
    const e = p?.[r.step];
    if (!e) continue;
    if (def.i === 'drum') { drum(r.o, e.d!, at, def.v); continue; }
    let m = e.m! + (def.tr ?? 0);
    if (def.max && m > def.max) m -= 12;
    const dur = e.len * r.spb * (def.gate ?? 1);
    if (def.i === 'bell') chipBell(r.o, m, at, def.v);
    else tone(r.o, def.i as Duty | 'tri', m, at, dur, def.v, { wet: def.wet && def.wet * SEND, vib: def.vib, pluck: def.pluck });
  }
  if (fillAt >= 0) { const [k, v] = FILL[fillAt]; drum(r.o, k, at, v); }
}

/** Avance d'un pas ; en début de mesure, applique ce qui attendait la barre de mesure. */
function advance(r: Run) {
  r.next += r.spb;
  if (++r.step < STEPS) return;
  r.step = 0;
  r.bar++;
  if (r.toP2) { r.toP2 = false; r.phase = 2; r.bar = 0; drum(r.o, 'C', r.next); drum(r.o, 'K', r.next); return; }
  const j = r.tr.jump?.[r.bar];
  if (j !== undefined) r.bar = j;
  else if (r.bar >= r.bars) {
    if (r.tr.loop !== undefined) r.bar = r.tr.loop;
    else r.end = r.tr.len !== undefined ? r.next - r.bars * STEPS * r.spb + r.tr.len : r.next;
  }
}

function tick() {
  if (!running()) return;
  if (want) { const w = want; want = ''; cur = start(w, 0.5); }
  const t = now(), ahead = document.hidden ? AHEAD_HIDDEN : AHEAD;
  let r = cur;
  if (!r) return;
  // Onglet gelé : on reste sur la grille en sautant les pas perdus.
  while (r.next < t - 0.02 && !r.end) advance(r);
  while (r && !r.end && r.next < t + ahead) {
    if (r.step === 0 && pending) {
      const p = pending; pending = null;
      fadeOut(r, p.fade);
      cur = r = start(p.name, p.fade, r.next);
      if (!r) return;
    }
    writeStep(r, r.next);
    advance(r);
  }
  if (r?.end && r.end < t + ahead) {
    if (r.then) { const n = r.then, at = Math.max(r.end, t + 0.02); fadeOut(r, 0.3); cur = start(n, 0.02, at); }
    else if (r.end < t) { fadeOut(r, 2); cur = null; }
  }
}
setInterval(tick, 40);

/** Piste de chaque scène ; '' = silence ; absente = garde ce qui joue (combats : gérés par BossScene). */
const BY_SCENE: Record<string, string> = { Menu: 'menu', Outside: '', Test: 'library', Transit: 'explore', Dawn: 'dawn', Throne: 'throne' };
const FIGHT: Record<string, string> = { Boss1: 'boss1', Boss2: 'boss2', Boss3: 'boss3' };

export const music = {
  /** Piste en boucle, en fondu. Sans `immediate`, attend le début de mesure si l'ancienne boucle sur des mesures courtes. */
  play(name: string, fade = 0.8, immediate = false) {
    pending = null;
    if (!running()) { want = name; return; }
    want = '';
    if (cur?.name === name && !cur.tr.boss && !immediate) return;
    if (cur && !immediate && cur.tr.loop !== undefined && cur.spb * STEPS <= 2) { pending = { name, fade }; return; }
    fadeOut(cur, cur?.end ? 0.3 : fade);
    cur = start(name, fade);
    tick();
  },
  stop(fade = 0.8) {
    want = ''; pending = null;
    if (running()) fadeOut(cur, fade);
    cur = null;
  },
  /** Morceau non bouclé par-dessus rien : coupe la piste en 0,3 s. `then` s'enchaîne à sa fin. */
  stinger(name: string, then = '') {
    pending = null;
    if (!running()) { want = then; return; }
    want = '';
    fadeOut(cur, 0.3);
    cur = start(name, 0.02, now() + 0.02, 0, then);
    tick();
  },
  /** Phase du boss : couches en plus à la mesure suivante, avec un fill sur la fin de celle-ci. */
  setPhase(n: number) {
    if (n === 2 && cur?.tr.boss && cur.phase === 1) cur.toP2 = true;
  },
  /** Saute à une mesure, tout de suite (sections d'une cinématique). */
  cue(bar: number) {
    if (!running() || !cur) return;
    const name = cur.name;
    fadeOut(cur, 0.03);
    cur = start(name, 0.02, now() + 0.02, bar);
    tick();
  },
  /** Coupe ou remet la musique (touche M). */
  mute(on = !muted) {
    muted = on;
    try { localStorage.setItem('ashenborn.mute', on ? '1' : '0'); } catch { /* ignoré */ }
    if (!stage || stage.c !== ac) return;
    for (const n of [stage.d, stage.w]) n.gain.setTargetAtTime(on ? 0 : 1, now(), 0.02);
  },
  /** Combat de la salle `key`, tout de suite, depuis la phase 1. */
  fight(key: string, fade = 0.3) { if (FIGHT[key]) this.play(FIGHT[key], fade, true); },
  /** Pause : musique plus basse et étouffée. */
  duck(on: boolean) {
    if (!ac) return;
    const t = now(), k = on ? 0.35 : 1;
    musBus.gain.setTargetAtTime(AUDIO.music * k, t, 0.08); musVerb.gain.setTargetAtTime(AUDIO.music * k, t, 0.08);
    musLP.frequency.setTargetAtTime(on ? 700 : 18000, t, 0.08);
  },
  /** Appelé à la création de chaque scène (main.ts). */
  scene(key: string) {
    if (key === 'Pause') return this.duck(true);
    if (key === 'GameOver') return this.stinger('defeat');
    if (!(key in BY_SCENE)) return;
    this.duck(false);
    const n = BY_SCENE[key];
    if (!n) return this.stop(1);
    // La cinématique se cale sur la scène ; le retour au menu coupe le combat tout de suite.
    this.play(n, key === 'Throne' ? 0.3 : 0.6, key === 'Dawn' || key === 'Throne' || (key === 'Menu' && !!cur?.tr.boss));
  },
  /** DEV : écrit une piste dans le contexte courant (rendu hors ligne), passage en phase 2 à p2At secondes. */
  render(name: string, sec: number, p2At = 0) {
    const r = start(name, 0.02, 0.01);
    if (!r) return;
    while (r.next < sec && !r.end) { if (p2At && r.next >= p2At && r.phase === 1) r.toP2 = true; writeStep(r, r.next); advance(r); }
  },
  /** Mode debug. */
  names: () => Object.keys(TRACKS),
  track: (n: string) => TRACKS[n],
  info: () => ({ name: cur?.name ?? '', bar: cur?.bar ?? 0, step: cur?.step ?? 0, phase: cur?.phase ?? 0, muted, running: running() }),
};
