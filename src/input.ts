import { unlockAudio } from './audio/sfx';

export type Action =
  | 'left' | 'right' | 'down' | 'jump' | 'attack' | 'dash' | 'spell' | 'pause' | 'debug1' | 'debug2';

// Liaison par lettre affichée (e.key), donc AZERTY natif.
const MAP: Record<string, Action> = {
  q: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
  s: 'down', arrowdown: 'down',
  z: 'jump', arrowup: 'jump', ' ': 'jump',
  j: 'attack', w: 'attack',
  k: 'dash', x: 'dash',
  l: 'spell', c: 'spell',
  escape: 'pause',
  f1: 'debug1', f2: 'debug2',
};

const held = new Map<string, Action>();
const pressedAt: Partial<Record<Action, number>> = {};

addEventListener('keydown', (e) => {
  unlockAudio();
  const a = MAP[e.key.toLowerCase()];
  if (!a) return;
  e.preventDefault();
  if (e.repeat) return;
  held.set(e.key.toLowerCase(), a);
  pressedAt[a] = performance.now();
});
addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
addEventListener('blur', () => held.clear());
addEventListener('pointerdown', unlockAudio);

export const input = {
  isDown(a: Action) {
    for (const v of held.values()) if (v === a) return true;
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
