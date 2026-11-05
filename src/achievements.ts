// Succès et skins du héros, gardés dans le navigateur (localStorage, try/catch). Aucun réseau.
// Les noms ne citent aucun boss : le dernier reste une surprise.

export type SkinId = 'base' | 'cendre' | 'citrouille' | 'argent';
export interface Ach { id: string; name: string; desc: string; skin?: SkinId }

export const ACHS: Ach[] = [
  { id: 'boss1', name: 'LA DAME TOMBE', desc: 'VAINCRE LE PREMIER BOSS' },
  { id: 'boss2', name: 'LUMIÈRES ÉTEINTES', desc: 'VAINCRE LE DEUXIÈME BOSS' },
  { id: 'crown', name: 'COURONNÉ', desc: 'FINIR LE JEU', skin: 'cendre' },
  { id: 'nohit', name: 'INTOUCHABLE', desc: 'VAINCRE UN BOSS SANS ÊTRE TOUCHÉ', skin: 'citrouille' },
  { id: 'hard', name: 'INFLEXIBLE', desc: 'FINIR LE JEU EN DIFFICILE', skin: 'argent' },
  { id: 'fast', name: 'ÉCLAIR', desc: 'FINIR EN MOINS DE 7 MIN (NORMAL OU DIFFICILE)' },
  { id: 'deathless', name: 'IMMORTEL', desc: 'FINIR LE JEU SANS MOURIR' },
];
export const SKINS: { id: SkinId; name: string }[] = [
  { id: 'base', name: 'VEILLEUR' }, { id: 'cendre', name: 'CENDRE' }, { id: 'citrouille', name: 'CITROUILLE' }, { id: 'argent', name: 'ARGENT' },
];

const KEY = 'ashenborn.ach', SKIN_KEY = 'ashenborn.skin';
const load = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } };
const got = load();
const listeners: ((a: Ach) => void)[] = [];

export const hasAch = (id: string) => got.has(id);
export const onUnlock = (f: (a: Ach) => void) => listeners.push(f);
/** Débloque un succès (une seule fois) et prévient les abonnés (bandeau de ChronoScene). */
export function unlock(id: string) {
  const a = ACHS.find((x) => x.id === id);
  if (!a || got.has(id)) return;
  got.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...got])); } catch { /* stockage indisponible */ }
  listeners.forEach((f) => f(a));
}

/** DEV (#Succes) : tout débloquer sans bandeau. */
export function devUnlockAll() {
  ACHS.forEach((a) => got.add(a.id));
  try { localStorage.setItem(KEY, JSON.stringify([...got])); } catch { /* stockage indisponible */ }
}

export const skinUnlocked = (s: SkinId) => s === 'base' || ACHS.some((a) => a.skin === s && got.has(a.id));
export const skinAch = (s: SkinId) => ACHS.find((a) => a.skin === s);
let skin: SkinId = (() => { try { return (localStorage.getItem(SKIN_KEY) as SkinId) || 'base'; } catch { return 'base'; } })();
if (!skinUnlocked(skin)) skin = 'base';
export const currentSkin = () => skin;
export function setSkin(s: SkinId) {
  skin = s;
  try { localStorage.setItem(SKIN_KEY, s); } catch { /* stockage indisponible */ }
}
