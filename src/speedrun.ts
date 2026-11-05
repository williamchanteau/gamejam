// Speedrun local : chrono du départ (JOUER) à la couronne de McKing, pauses et tuto exclus (main.ts).
// Records : 5 meilleurs temps par difficulté dans le navigateur (localStorage, try/catch). Aucun réseau.
import { run } from './floors';

export type Diff = 'easy' | 'normal' | 'hard';
export interface Rec { t: number; d: number; s: number[] }
export const DIFFS: [Diff, string][] = [['easy', 'VRAIMENT FACILE'], ['normal', 'NORMAL'], ['hard', 'DIFFICILE']];
const KEY = 'ashenborn.records', SHOW = 'ashenborn.chrono', TOP = 5;

/** Partie chronométrée : t en ms, splits[étage] = temps à la chute du boss, last = résultat de la dernière partie finie. */
export const sr = { running: false, t: 0, deaths: 0, splits: [] as number[], last: null as null | { rec: Rec; diff: Diff; rank: number } };

export function records(): Record<Diff, Rec[]> {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { easy: o.easy || [], normal: o.normal || [], hard: o.hard || [] };
  } catch { return { easy: [], normal: [], hard: [] }; }
}

let shown = (() => { try { return localStorage.getItem(SHOW) === '1'; } catch { return false; } })();
export const chronoShown = () => shown;
export function setChrono(on: boolean) {
  shown = on;
  try { localStorage.setItem(SHOW, on ? '1' : '0'); } catch { /* stockage indisponible */ }
}

export const diffOf = (): Diff => (run.easy ? 'easy' : run.hard ? 'hard' : 'normal');
export function srStart() { Object.assign(sr, { running: true, t: 0, deaths: 0, splits: [], last: null }); }
export function srSplit(floor: number) { if (sr.running) sr.splits[floor] = sr.t; }
export function srDeath() { if (sr.running) sr.deaths++; }
export function srAbort() { sr.running = false; }

/** Fin de partie : range le temps dans le top 5 de la difficulté, garde le rang (-1 = hors classement). */
export function srFinish() {
  if (!sr.running) return;
  sr.running = false;
  const rec: Rec = { t: Math.round(sr.t), d: sr.deaths, s: sr.splits.map((x) => Math.round(x ?? 0)) };
  const diff = diffOf(), all = records();
  all[diff] = [...all[diff], rec].sort((a, b) => a.t - b.t).slice(0, TOP);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* stockage indisponible */ }
  sr.last = { rec, diff, rank: all[diff].indexOf(rec) };
}

/** 754321 ms → « 12:34.32 » (centièmes en option). */
export function fmt(ms: number, cs = true) {
  const c = Math.floor(Math.max(0, ms) / 10), s = Math.floor(c / 100) % 60, m = Math.floor(c / 6000);
  return `${m}:${String(s).padStart(2, '0')}` + (cs ? `.${String(c % 100).padStart(2, '0')}` : '');
}
