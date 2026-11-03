import Phaser from 'phaser';
import { W, H } from '../config';
import { canvasTex } from './pixel';
import { hash } from './room';

type Ctx = CanvasRenderingContext2D;
/** Tour en colimaçon (écran de montée) : centre cx, rayon du mur rw, marches de rc (noyau) à rs, inclinaison k, contremarche rise. */
export const TOWER = { cx: 240, rw: 150, rs: 134, rc: 15, k: 0.2, rise: 11, perTurn: 20, course: 12 };

const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const rgb = (v: number[], f: number) => `rgb(${v.map((x) => Math.round(Math.min(255, x * f))).join(',')})`;

/** Assises de pierre courbées sur un cylindre (bow = flèche de la courbe), ombrées vers les bords. */
function cylinder(c: Ctx, w: number, bow: number, joints: number, light: number) {
  const C = TOWER.course, r = w / 2;
  for (let y = 0; y < C * 2; y++)
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5 - r) / r, s = Math.sqrt(Math.max(0, 1 - u * u)), a = Math.acos(Math.max(-1, Math.min(1, u)));
      const yy = (((y + Math.round(bow * s)) % (C * 2)) + C * 2) % (C * 2), row = Math.floor(yy / C);
      const b = (a / Math.PI) * joints + row * 0.5, bi = Math.floor(b), v = hash(bi * 7, row * 13 + 1);
      const mortar = yy % C === 0 || b - bi < 0.08;
      let col = mortar ? [16, 14, 26] : v < 0.3 ? [34, 31, 52] : v < 0.7 ? [44, 41, 64] : [56, 52, 82];
      if (!mortar && yy % C === 1) col = col.map((q) => q + 14);
      px(c, rgb(col, (0.3 + 0.7 * Math.sqrt(s)) * (1 - light * u * 0.25)), x, y);
    }
}

export function makeTowerArt(scene: Phaser.Scene) {
  const { rw, rc, k } = TOWER;
  // Mur du fond (moitié arrière du cylindre) : assises en ∩ vues d'un peu au-dessus.
  canvasTex(scene, 'tower_wall', rw * 2, TOWER.course * 2, (c) => cylinder(c, rw * 2, k * rw, 18, 0));
  // Noyau central (pilier) : assises en ∪, éclairé à gauche.
  canvasTex(scene, 'newel', rc * 2, TOWER.course * 2, (c) => cylinder(c, rc * 2, -k * rc, 4, 1));
  // Mur coupé (épaisseur de la tour) : gros blocs en tranche.
  canvasTex(scene, 'tower_cut', 16, TOWER.course * 2, (c) => {
    for (let y = 0; y < TOWER.course * 2; y++) for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / TOWER.course), j = (x + row * 8) % 16;
      px(c, y % TOWER.course === 0 || j === 0 ? '#0d0b16' : x === 15 ? '#4a4868' : y % TOWER.course === 1 ? '#3d3a58' : '#29263c', x, y);
    }
  });
  // Ciel nocturne vu par la coupe (étoiles, tuile verticale).
  canvasTex(scene, 'tower_sky', 64, 96, (c) => {
    px(c, '#0b0a14', 0, 0, 64, 96);
    for (let i = 0; i < 14; i++) px(c, hash(i, 3) > 0.7 ? '#d8d0ff' : '#6a6890', Math.floor(hash(i, 1) * 64), Math.floor(hash(i, 2) * 96));
  });
  // Meurtrière : ogive étroite, nuit bleue + étoile.
  canvasTex(scene, 'slit', 8, 26, (c) => {
    for (let y = 0; y < 26; y++) for (let x = 0; x < 8; x++) {
      const top = Math.abs(x - 3.5) > 2.5 ? 4 : Math.abs(x - 3.5) > 1.5 ? 2 : 0;
      if (y < top) continue;
      const inner = x > 0 && x < 7 && y > top && y < 25;
      px(c, !inner ? '#55526e' : y < 10 ? '#24386a' : '#1a2a50', x, y);
    }
    px(c, '#d8fbff', 4, 8); px(c, '#8fb0ff', 2, 15);
  }, '#06050c');
  // Ombre douce sur les bords hauts/bas (lisibilité du titre).
  canvasTex(scene, 'tower_shade', W, H, (c) => {
    for (let y = 0; y < H; y++) {
      const a = Math.max(0, 1 - y / 90) * 0.85 + Math.max(0, (y - H + 50) / 50) * 0.7;
      c.fillStyle = `rgba(6,5,12,${a})`; c.fillRect(0, y, W, 1);
    }
  });
}
