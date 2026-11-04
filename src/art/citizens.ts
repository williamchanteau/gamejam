import Phaser from 'phaser';
import { beam, canvasTex, ell, OUTLINE, poly } from './pixel';

type Ctx = CanvasRenderingContext2D;
export type Kind = 'human' | 'goblin' | 'mosquito' | 'bull';
/** Citoyens : textures `${key}_0` (repos) et `${key}_1` (bras levés), tournés vers la droite, pieds en bas du canevas. */
export interface Citizen { key: string; kind: Kind; h: number }
export const CITIZENS: Citizen[] = [];
const R = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
type Hum = { skin: string; skinD: string; tun: string; tunD: string; leg: string; hair: string; style: 'cap' | 'long' | 'bald' | 'hood' | 'short' | 'coif'; cap?: string };

const HUMANS: Hum[] = [
  { skin: '#e8b890', skinD: '#c08a60', tun: '#4a7a5a', tunD: '#335a44', leg: '#3a2a22', hair: '#4a2e1c', style: 'cap', cap: '#c8902a' },
  { skin: '#c08a60', skinD: '#8a5c3c', tun: '#c8a050', tunD: '#8a6a2c', leg: '#2c2848', hair: '#1a1420', style: 'long' },
  { skin: '#7a4e34', skinD: '#553420', tun: '#3f6aa8', tunD: '#2c4a7a', leg: '#3a2a22', hair: '#14101c', style: 'short' },
  { skin: '#e8b890', skinD: '#c08a60', tun: '#7a5aa8', tunD: '#54407a', leg: '#2c2848', hair: '#e8e4d8', style: 'bald' },
  { skin: '#d8a880', skinD: '#a87c58', tun: '#a8a08a', tunD: '#7a7462', leg: '#4a3a2c', hair: '#6a4428', style: 'coif', cap: '#f0ecdc' },
  { skin: '#c08a60', skinD: '#8a5c3c', tun: '#2f6a7a', tunD: '#204a58', leg: '#3a2a22', hair: '#3a2418', style: 'hood', cap: '#54688a' },
];

/** Humain en 28×48 : `up` = bras levés. */
function human(c: Ctx, p: Hum, up: boolean) {
  const arms = (back: boolean) => {
    const col = back ? p.tunD : p.tun, skin = back ? p.skinD : p.skin;
    if (up) {
      const [sx, hx] = back ? [9, 5] : [18, 22];
      beam(c, col, sx, 29, hx, 20, 3); R(c, skin, hx - 1, 17, 3, 3);
    } else {
      const x = back ? 7 : 18;
      R(c, col, x, 28, 3, 9); R(c, skin, x, 37, 3, 2);
    }
  };
  arms(true);
  R(c, p.leg, 10, 40, 3, 8); R(c, p.leg, 15, 40, 3, 8); R(c, '#1a1420', 10, 45, 4, 3); R(c, '#1a1420', 15, 45, 4, 3);
  R(c, p.tun, 9, 27, 10, 14); R(c, p.tunD, 9, 27, 3, 14); R(c, p.tunD, 9, 34, 10, 2); R(c, '#c8902a', 14, 34, 2, 2);
  R(c, p.skin, 10, 17, 9, 10); R(c, p.skinD, 10, 17, 2, 10); R(c, p.skin, 19, 21, 1, 2); // visage, nez
  R(c, '#14101c', 16, 20, 2, 2); R(c, '#14101c', 15, 25, 3, 1); // œil, bouche ouverte
  if (p.style === 'cap') { R(c, p.hair, 10, 17, 3, 6); R(c, p.cap!, 9, 14, 11, 4); R(c, p.cap!, 8, 17, 13, 1); }
  else if (p.style === 'long') { R(c, p.hair, 10, 15, 9, 3); R(c, p.hair, 8, 16, 4, 16); }
  else if (p.style === 'short') { R(c, p.hair, 10, 15, 9, 3); R(c, p.hair, 9, 16, 3, 5); }
  else if (p.style === 'bald') { R(c, p.hair, 9, 20, 2, 4); R(c, p.hair, 13, 25, 6, 3); R(c, '#14101c', 15, 25, 3, 1); } // barbe blanche
  else if (p.style === 'coif') { R(c, p.cap!, 9, 14, 10, 5); R(c, p.cap!, 8, 16, 3, 9); }
  else { R(c, p.cap!, 9, 14, 10, 4); R(c, p.cap!, 8, 15, 4, 13); R(c, p.cap!, 11, 25, 4, 3); }
  arms(false);
}

const GOB = [['#6a9a3c', '#4a7028', '#6a4428', '#4a2e1c'], ['#4a8a58', '#336440', '#4a4a6a', '#2e2e4a'], ['#8a9a3c', '#667028', '#7a5a34', '#54401c']];
/** Gobelin en 32×48 : petit, grosse tête, longues oreilles et grand nez. */
function goblin(c: Ctx, [sk, skD, tu, tuD]: string[], up: boolean) {
  const limb = (back: boolean) => {
    if (up) { const [sx, hx] = back ? [11, 5] : [19, 25]; beam(c, back ? skD : sk, sx, 35, hx, 25, 2); R(c, back ? skD : sk, hx - 1, 22, 3, 3); }
    else { const x = back ? 8 : 20; R(c, back ? skD : sk, x, 34, 2, 8); R(c, back ? skD : sk, x, 42, 3, 2); }
  };
  limb(true);
  R(c, skD, 12, 42, 3, 6); R(c, skD, 17, 42, 3, 6); R(c, sk, 12, 46, 5, 2); R(c, sk, 17, 46, 5, 2);
  R(c, tu, 10, 33, 11, 10); R(c, tuD, 10, 33, 3, 10);
  for (let x = 10; x < 21; x += 3) R(c, tuD, x, 42, 2, 2); // bas en lambeaux
  poly(c, sk, [9, 25, 1, 21, 9, 29]); poly(c, sk, [23, 25, 31, 21, 23, 29]); // oreilles
  ell(c, sk, 16, 26, 8, 7.5); ell(c, skD, 11, 26, 3, 6);
  poly(c, sk, [22, 26, 28, 30, 22, 30]); // nez
  R(c, '#ffd36a', 18, 23, 3, 3); R(c, '#14101c', 20, 24, 1, 2); // œil
  R(c, '#14101c', 16, 30, 6, 2); R(c, '#f0ecdc', 17, 30, 1, 1); R(c, '#f0ecdc', 20, 30, 1, 1); // sourire
  limb(false);
}

const MOS = [['#4a4a5a', '#74748a', '#54307c'], ['#5a4a3c', '#8a7a64', '#2f6a7a']];
/** Moustique humanoïde en 34×50 : corps fin rayé, gros œil à facettes, trompe, ailes pâles. */
function mosquito(c: Ctx, [dk, lt, vest]: string[], up: boolean) {
  // Ailes grises translucides (battent entre les deux images).
  c.globalAlpha = 0.6;
  if (up) { ell(c, '#d8dce6', 7, 20, 6, 11); ell(c, '#c0c4d2', 3, 25, 3, 8); }
  else { ell(c, '#d8dce6', 6, 28, 6, 8); ell(c, '#c0c4d2', 5, 34, 4, 5); }
  c.globalAlpha = 1;
  const arm = (back: boolean) => {
    const col = back ? dk : lt;
    if (up) { const [sx, hx] = back ? [13, 8] : [18, 25]; beam(c, col, sx, 26, hx, 13, 1.6); }
    else { const x = back ? 11 : 19; beam(c, col, x, 26, x + (back ? -2 : 3), 33, 1.6); beam(c, col, x + (back ? -2 : 3), 33, x + (back ? -1 : 4), 38, 1.6); }
  };
  arm(true);
  beam(c, dk, 15, 37, 12, 43, 1.6); beam(c, dk, 12, 43, 14, 50, 1.6); beam(c, lt, 18, 37, 21, 43, 1.6); beam(c, lt, 21, 43, 19, 50, 1.6); // jambes coudées
  for (let y = 26; y < 38; y++) { R(c, y % 3 === 0 ? lt : dk, 14, y, 6, 1); } // abdomen rayé
  R(c, vest, 14, 25, 6, 6); R(c, '#c8902a', 16, 25, 1, 6); // gilet
  ell(c, dk, 17, 18, 4.5, 5);
  ell(c, '#c8a830', 19, 17, 3, 3.5); R(c, '#fff0b0', 19, 15, 1, 1); for (const [x, y] of [[18, 17], [20, 18], [19, 19]]) R(c, '#8a7418', x, y); // œil à facettes
  beam(c, '#14101c', 21, 21, 30, 24, 1.2); // trompe
  beam(c, dk, 15, 14, 11, 7, 1); beam(c, dk, 18, 13, 20, 6, 1); // antennes
  arm(false);
}

const BUL = [['#6a4428', '#4a2e1c', '#8a6038', '#3f6aa8'], ['#8a7458', '#5e4e3c', '#b09a7c', '#54307c']];
/** Taureau humanoïde en 40×58 : large torse, cornes, museau, anneau d'or. */
function bull(c: Ctx, [fur, furD, furL, sash]: string[], up: boolean) {
  const limb = (back: boolean) => {
    const col = back ? furD : fur;
    if (up) { const [sx, hx] = back ? [9, 3] : [30, 36]; beam(c, col, sx, 29, hx, 15, 5); R(c, '#1a1420', hx - 2, 10, 5, 4); }
    else { const x = back ? 3 : 31; R(c, col, x, 28, 6, 14); R(c, '#1a1420', x, 42, 6, 3); }
  };
  limb(true);
  R(c, furD, 11, 44, 7, 14); R(c, fur, 22, 44, 7, 14); R(c, '#1a1420', 11, 54, 7, 4); R(c, '#1a1420', 22, 54, 7, 4); // jambes, sabots
  R(c, fur, 8, 26, 24, 20); R(c, furD, 8, 26, 5, 20); R(c, furL, 18, 29, 11, 10);
  beam(c, sash, 12, 26, 30, 44, 3); R(c, '#4a2e1c', 8, 42, 24, 3); R(c, '#ffd36a', 18, 42, 4, 3); // écharpe, ceinture
  poly(c, '#f0e8d0', [15, 12, 8, 2, 7, 9]); poly(c, '#f0e8d0', [26, 10, 31, 1, 33, 8]); // cornes
  R(c, fur, 13, 9, 15, 17); R(c, furD, 13, 9, 4, 17); R(c, furD, 10, 14, 4, 3); // tête, oreille
  R(c, furL, 22, 17, 10, 9); R(c, furD, 29, 19, 2, 2); R(c, '#14101c', 24, 24, 7, 1); // museau
  R(c, '#ffd36a', 28, 25, 3, 3); R(c, furL, 29, 26, 1, 1); // anneau d'or
  R(c, '#14101c', 23, 13, 3, 2); R(c, '#ffd36a', 24, 13, 1, 1); // œil
  limb(false);
}

/** Valet en livrée violette et or (28×48), bras tendus devant : porte le coussin. Images 0/1 = marche. */
function servant(c: Ctx, f: number) {
  R(c, '#2c2848', f ? 9 : 10, 40, 3, 8); R(c, '#2c2848', f ? 16 : 15, 40, 3, 8);
  R(c, '#14101c', f ? 9 : 10, 45, 4, 3); R(c, '#14101c', f ? 16 : 15, 45, 4, 3);
  R(c, '#54307c', 9, 27, 10, 14); R(c, '#3a1f5a', 9, 27, 3, 14); R(c, '#ffd36a', 14, 27, 1, 14); R(c, '#ffd36a', 9, 40, 10, 1);
  R(c, '#e8b890', 10, 17, 9, 10); R(c, '#c08a60', 10, 17, 2, 10); R(c, '#e8b890', 19, 21, 1, 2);
  R(c, '#14101c', 16, 20, 2, 1); R(c, '#e8e4d8', 10, 15, 8, 3); R(c, '#e8e4d8', 9, 16, 2, 5); // perruque blanche
  R(c, '#6a4428', 15, 24, 4, 1); // moustache
  beam(c, '#54307c', 17, 29, 25, 31, 3); R(c, '#f0ecdc', 24, 30, 3, 2);
}

export function makeCitizenArt(scene: Phaser.Scene) {
  CITIZENS.length = 0;
  const add = (key: string, kind: Kind, h: number, w: number, hh: number, d: (c: Ctx, up: boolean) => void) => {
    CITIZENS.push({ key, kind, h });
    [false, true].forEach((up, i) => canvasTex(scene, `${key}_${i}`, w, hh, (c) => d(c, up), OUTLINE));
  };
  HUMANS.forEach((p, i) => add(`cz_h${i}`, 'human', 34, 28, 48, (c, up) => human(c, p, up)));
  GOB.forEach((p, i) => add(`cz_g${i}`, 'goblin', 30, 32, 48, (c, up) => goblin(c, p, up)));
  MOS.forEach((p, i) => add(`cz_m${i}`, 'mosquito', 44, 34, 50, (c, up) => mosquito(c, p, up)));
  BUL.forEach((p, i) => add(`cz_b${i}`, 'bull', 56, 40, 58, (c, up) => bull(c, p, up)));
  [0, 1].forEach((f) => canvasTex(scene, `sv_${f}`, 28, 48, (c) => servant(c, f), OUTLINE));
}
