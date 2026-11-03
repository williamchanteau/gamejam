import { unlockAudio } from './audio/sfx';

export type Action =
  | 'left' | 'right' | 'down' | 'up' | 'jump' | 'attack' | 'dash' | 'spell' | 'ok' | 'pause' | 'debug1' | 'debug2';

// Liaison par lettre affichée (e.key), donc AZERTY natif. Une touche peut porter plusieurs actions (jeu + menus).
const MAP: Record<string, Action[]> = {
  q: ['left'], arrowleft: ['left'],
  d: ['right'], arrowright: ['right'],
  s: ['down'], arrowdown: ['down'],
  z: ['jump', 'up'], arrowup: ['jump', 'up'], ' ': ['jump', 'ok'],
  j: ['attack', 'ok'], w: ['attack', 'ok'], enter: ['ok'],
  k: ['dash'], x: ['dash'],
  l: ['spell'], c: ['spell'],
  escape: ['pause'], p: ['pause'],
  f1: ['debug1'], f2: ['debug2'],
};

const held = new Map<string, Action[]>();
const pressedAt: Partial<Record<Action, number>> = {};

addEventListener('keydown', (e) => {
  unlockAudio();
  firstFullscreen();
  const acts = MAP[e.key.toLowerCase()];
  if (!acts) return;
  e.preventDefault();
  if (e.repeat) return;
  held.set(e.key.toLowerCase(), acts);
  for (const a of acts) pressedAt[a] = performance.now();
});
addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
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
