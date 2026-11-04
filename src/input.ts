import { unlockAudio } from './audio/sfx';
import { music } from './audio/music';
import { G } from './art/font';

export type Action =
  | 'left' | 'right' | 'down' | 'jump' | 'attack' | 'dash' | 'spell'
  | 'up' | 'mdown' | 'mleft' | 'mright' | 'ok' | 'clear' | 'pause' | 'debug1' | 'debug2';

/** Actions de jeu réattribuables (OPTIONS > TOUCHES), 2 touches chacune. Liaison par touche PHYSIQUE (e.code). */
export type Bind = 'left' | 'right' | 'jump' | 'down' | 'attack' | 'dash' | 'spell';
export const BINDS: Bind[] = ['left', 'right', 'jump', 'down', 'attack', 'dash', 'spell'];
/** c = e.code ; l = libellé lu au moment du choix (e.key, donc juste quel que soit le clavier). */
export type Key = { c: string; l?: string } | null;
const DEFAULT: Record<Bind, Key[]> = {
  left: [{ c: 'ArrowLeft' }, null], right: [{ c: 'ArrowRight' }, null], jump: [{ c: 'ArrowUp' }, { c: 'Space' }],
  down: [{ c: 'ArrowDown' }, null], attack: [{ c: 'KeyQ' }, null], dash: [{ c: 'KeyW' }, null], spell: [{ c: 'KeyE' }, null],
};
// Menus : flèches + Entrée/Espace toujours, Échap = pause/retour (non attribuable).
const FIXED: Record<string, Action[]> = {
  ArrowUp: ['up'], ArrowDown: ['mdown'], ArrowLeft: ['mleft'], ArrowRight: ['mright'],
  Space: ['ok'], Enter: ['ok'], NumpadEnter: ['ok'], Backspace: ['clear'], Delete: ['clear'], Escape: ['pause'], F1: ['debug1'], F2: ['debug2'],
};
// Les touches de jeu naviguent aussi dans les menus (sauf saut sur une touche de validation).
const MENU: Partial<Record<Bind, Action>> = { left: 'mleft', right: 'mright', down: 'mdown', jump: 'up' };
const RESERVED = ['Escape', 'Backspace', 'Delete', 'F1', 'F2', 'F5', 'F11', 'F12', 'MetaLeft', 'MetaRight', 'ContextMenu', 'OSLeft', 'OSRight'];
export const isReserved = (c: string) => RESERVED.includes(c);

const clone = (b: Record<Bind, Key[]>) => JSON.parse(JSON.stringify(b)) as Record<Bind, Key[]>;
let binds = clone(DEFAULT);
try {
  const s = JSON.parse(localStorage.getItem('ashenborn.keys') ?? 'null');
  if (s) for (const b of BINDS) if (Array.isArray(s[b]) && s[b].length === 2)
    binds[b] = s[b].map((k: Key) => (k && typeof k.c === 'string' ? { c: k.c, l: typeof k.l === 'string' ? k.l : undefined } : null));
} catch { /* file:// ou stockage bloqué */ }
const save = () => { try { localStorage.setItem('ashenborn.keys', JSON.stringify(binds)); } catch { /* ignoré */ } };

let MAP: Record<string, Action[]> = {};
let ver = 0;
/** Change à chaque modification des touches ou du clavier (HUD / panneaux à réécrire). */
export const bindVer = () => ver;
function rebuild() {
  MAP = {};
  const push = (c: string, a: Action) => { (MAP[c] ??= []).includes(a) || MAP[c].push(a); };
  for (const [c, acts] of Object.entries(FIXED)) for (const a of acts) push(c, a);
  for (const b of BINDS) for (const k of binds[b]) if (k) {
    push(k.c, b);
    const m = MENU[b];
    if (m && !(m === 'up' && FIXED[k.c]?.includes('ok'))) push(k.c, m);
  }
  if (!MAP.KeyP) push('KeyP', 'pause');
  ver++;
  held.clear();
}

export type Layout = 'AZERTY' | 'QWERTY';
let layout: Layout = 'AZERTY';
try { if (localStorage.getItem('ashenborn.layout') === 'QWERTY') layout = 'QWERTY'; } catch { /* file:// ou stockage bloqué */ }
export const getLayout = () => layout;
export function setLayout(l: Layout) {
  layout = l;
  ver++;
  try { localStorage.setItem('ashenborn.layout', l); } catch { /* ignoré */ }
}

const NAMES: Record<string, string> = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'ESPACE', Enter: 'ENTRÉE', NumpadEnter: 'ENTRÉE',
  ShiftLeft: 'MAJ', ShiftRight: 'MAJ D', ControlLeft: 'CTRL', ControlRight: 'CTRL D', AltLeft: 'ALT', AltRight: 'ALT GR',
  Tab: 'TAB', CapsLock: 'VERR MAJ', Insert: 'INSER', Home: 'DÉBUT', End: 'FIN', PageUp: 'PAGE ↑', PageDown: 'PAGE ↓',
};
const AZ: Record<string, string> = { KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W', Semicolon: 'M', KeyM: ',' };
const inFont = (ch: string) => ch.length === 1 && (ch in G || 'ÉÈÊËÀÂÇÙÛÎÏÔ'.includes(ch));
function fromCode(c: string) {
  const m = /^(?:Key|Digit)(.)$/.exec(c);
  if (m) return m[1];
  if (c.startsWith('Numpad')) return 'PAVÉ ' + c.slice(6).toUpperCase().replace('ADD', '+').replace('SUBTRACT', '-').replace('MULTIPLY', '*').replace('DIVIDE', '/').replace('DECIMAL', '.');
  return [...c.toUpperCase()].filter(inFont).join('');
}
/** Libellé d'une touche au moment où on l'appuie. */
function nameOf(c: string, key: string) {
  if (NAMES[c]) return NAMES[c];
  const k = key.toUpperCase();
  if (c.startsWith('Numpad')) return inFont(k) ? 'PAVÉ ' + k : fromCode(c);
  return inFont(k) ? k : fromCode(c);
}
export const keyText = (k: Key) => (k ? k.l ?? NAMES[k.c] ?? (layout === 'AZERTY' ? AZ[k.c] : undefined) ?? fromCode(k.c) : '');
/** Touches d'une action pour l'affichage (« ↑/ESPACE »). */
export const keyLabel = (b: Bind) => binds[b].filter(Boolean).map(keyText).join('/') || '-';
/** « ←→ » pour les flèches, sinon « Q D ». */
export const moveLabel = () => { const l = keyLabel('left'), r = keyLabel('right'); return l === '←' && r === '→' ? '←→' : `${l} ${r}`; };
export const getBind = (b: Bind, i: number) => binds[b][i];
/** Attribue une touche ; si elle servait ailleurs, l'autre emplacement reçoit l'ancienne touche (échange).
 *  Rend l'action échangée, null, ou false si l'échange laisserait l'autre action sans touche (refusé). */
export function setBind(b: Bind, i: number, code: string, label: string): Bind | null | false {
  const old = binds[b][i];
  let other: Bind | null = null;
  for (const o of BINDS) if (o !== b && binds[o].some((k) => k?.c === code)) other = o;
  if (other && !old && binds[other].filter(Boolean).length <= 1) return false;
  for (const o of BINDS) binds[o].forEach((k, j) => { if (k?.c === code && !(o === b && j === i)) binds[o][j] = old; });
  binds[b][i] = { c: code, l: label };
  save(); rebuild();
  return other;
}
/** Efface une touche (refusé si c'est la dernière de l'action). */
export function clearBind(b: Bind, i: number) {
  if (!binds[b][i] || binds[b].filter(Boolean).length <= 1) return false;
  binds[b][i] = null;
  save(); rebuild();
  return true;
}
export function resetBinds() { binds = clone(DEFAULT); save(); rebuild(); }
let capture: ((code: string, label: string) => void) | null = null;
/** La prochaine touche appuyée va à `cb` au lieu du jeu (Échap compris, pour annuler). */
export function captureKey(cb: (code: string, label: string) => void) { capture = cb; held.clear(); }
export const cancelCapture = () => { capture = null; };

const held = new Map<string, Action[]>();
const pressedAt: Partial<Record<Action, number>> = {};

rebuild();

addEventListener('keydown', (e) => {
  unlockAudio();
  firstFullscreen();
  if (capture) {
    e.preventDefault();
    if (e.repeat) return;
    const cb = capture;
    capture = null;
    return cb(e.code, nameOf(e.code, e.key));
  }
  const acts = MAP[e.code];
  if (!acts) {
    // M : la lettre imprimée (e.key), pas l'emplacement : sur AZERTY elle n'est pas en KeyM.
    if (!e.repeat && e.key.toLowerCase() === 'm') music.mute();
    return;
  }
  e.preventDefault();
  if (e.repeat) return;
  held.set(e.code, acts);
  for (const a of acts) pressedAt[a] = performance.now();
});
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear());
addEventListener('pointerdown', () => { unlockAudio(); firstFullscreen(); });

/** Plein écran (doit être appelé depuis un geste utilisateur). Échap verrouillé si possible. */
export function goFullscreen() {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement.requestFullscreen()
    .then(() => (navigator as unknown as { keyboard?: { lock?: (k: string[]) => Promise<void> } }).keyboard?.lock?.(['Escape']))
    .catch(() => {});
}
let fsTried = false;
function firstFullscreen() { if (!fsTried) { fsTried = true; goFullscreen(); } }

export const input = {
  isDown(a: Action) {
    for (const v of held.values()) if (v.includes(a)) return true;
    return false;
  },
  /** Vrai si `a` a été pressé dans les `win` dernières secondes ; consomme l'appui. */
  take(a: Action, win = 0.1) {
    const t = pressedAt[a];
    if (t === undefined || performance.now() - t > win * 1000) return false;
    delete pressedAt[a];
    return true;
  },
  /** Vide les appuis en mémoire (au restart). */
  reset() {
    for (const k in pressedAt) delete pressedAt[k as Action];
  },
};
