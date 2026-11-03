import { unlockAudio } from './audio/sfx';

export type Action =
  | 'left' | 'right' | 'down' | 'up' | 'jump' | 'attack' | 'dash' | 'spell' | 'ok' | 'pause' | 'debug1' | 'debug2';

// Liaison par touche PHYSIQUE (e.code) : flèches pour bouger, rangée du haut à gauche pour les actions
// (A Z E en AZERTY = Q W E en QWERTY, même emplacement). L'option CLAVIER ne change que les lettres affichées.
const MAP: Record<string, Action[]> = {
  ArrowLeft: ['left'], ArrowRight: ['right'], ArrowDown: ['down'],
  ArrowUp: ['jump', 'up'], Space: ['jump', 'ok'], Enter: ['ok'], NumpadEnter: ['ok'],
  KeyQ: ['attack'], KeyW: ['dash'], KeyE: ['spell'],
  Escape: ['pause'], KeyP: ['pause'],
  F1: ['debug1'], F2: ['debug2'],
};

export type Layout = 'AZERTY' | 'QWERTY';
let layout: Layout = 'AZERTY';
try { if (localStorage.getItem('ashenborn.layout') === 'QWERTY') layout = 'QWERTY'; } catch { /* file:// ou stockage bloqué */ }
export const getLayout = () => layout;
export function setLayout(l: Layout) {
  layout = l;
  try { localStorage.setItem('ashenborn.layout', l); } catch { /* ignoré */ }
}
const LETTERS: Record<Layout, Record<'attack' | 'dash' | 'spell', string>> = {
  AZERTY: { attack: 'A', dash: 'Z', spell: 'E' },
  QWERTY: { attack: 'Q', dash: 'W', spell: 'E' },
};
/** Lettre affichée pour une action selon le clavier choisi. */
export const keyLabel = (a: 'attack' | 'dash' | 'spell') => LETTERS[layout][a];

const held = new Map<string, Action[]>();
const pressedAt: Partial<Record<Action, number>> = {};

addEventListener('keydown', (e) => {
  unlockAudio();
  firstFullscreen();
  const acts = MAP[e.code];
  if (!acts) return;
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
