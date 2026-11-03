import Phaser from 'phaser';
import { canvasTex, crescent, OUTLINE } from './pixel';

// Noctis : allumeur de lanternes encapuchonné, couronne de cierges, masque de porcelaine, longue perche à crochet.
type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const N = {
  k: '#07060e', d: '#110e1e', m: '#1e1933', b: '#2e2749', l: '#463c66', r: '#6a5a8c',
  g0: '#3a2a1c', g1: '#6e4d22', g2: '#b0812f', g3: '#e8c25a', g4: '#fff0b0',
  s0: '#6f6a62', s1: '#a39d8e', s2: '#d6cfbc', s3: '#f4eedc',
  wax: '#d8cfb0', waxD: '#8f866c', wood: '#33261e', woodL: '#574033', iron: '#3d4052', ironL: '#6a6e88',
};

// Pointes déchirées de l'ourlet : le décalage fait onduler le tissu entre les deux images.
const TATTER = [0, 2, 5, 9, 12, 8, 3, 1, 4, 9, 14, 11, 6, 2, 0, 3, 7, 13, 9, 4, 1, 5, 11, 7, 2];

function robe(c: Ctx, shift: number) {
  const W = 66, H = 78, cx = 33, FOLDS = [-20, -11, -2, 7, 16];
  for (let y = 12; y < H; y++) {
    const k = y / (H - 1);
    const hw = y < 26 ? 14 - ((y - 12) / 14) * 3 : 11 + ((y - 26) / (H - 27)) ** 1.25 * 16;
    for (let x = -Math.floor(hw); x <= Math.floor(hw); x++) {
      const bottom = H - 1 - TATTER[(x + 30 + shift) % TATTER.length];
      if (y > bottom) continue;
      const t = x / hw;
      let col = t > 0.82 ? N.l : t > 0.34 ? N.b : t < -0.55 ? N.d : N.m;
      if (y > 26) for (const f of FOLDS) {
        const fx = Math.round(f * (0.35 + 0.65 * k));
        if (x === fx) col = N.k;
        else if (x === fx + 1) col = t > 0 ? N.l : N.b;
      }
      if (y >= bottom - 1) col = N.d; // ourlet brûlé
      px(c, col, cx + x, y);
    }
    // Liseré chaud : la lanterne éclaire le flanc avant.
    if (y > 28 && y < 60) px(c, N.g0, cx + Math.floor(hw), y);
  }
  // Ceinture de corde et clef pendante.
  for (let x = -11; x <= 11; x++) { px(c, (x + 40) % 3 === 0 ? N.g1 : N.g2, cx + x, 28); px(c, N.g0, cx + x, 29); }
  px(c, N.g3, cx + 3, 28, 3, 2); px(c, N.g2, cx + 4, 30, 1, 9); px(c, N.g3, cx + 3, 39, 3, 3); px(c, N.k, cx + 4, 40);
  // Pèlerine de fer : pans superposés, rivets de laiton.
  for (let y = 0; y <= 17; y++) {
    const hw = 12 + Math.sqrt(y) * 2.2;
    for (let x = -Math.floor(hw); x <= Math.floor(hw); x++) {
      const sc = 15 + (((x + 40) % 8) < 4 ? 2 : 0);
      if (y > sc) continue;
      const t = x / hw;
      px(c, y === sc ? N.g1 : y === sc - 1 ? N.k : t > 0.45 ? N.l : t > -0.2 ? N.b : t > -0.7 ? N.m : N.d, cx + x, y);
    }
  }
  for (const x of [-16, -8, 0, 8, 16]) px(c, N.g3, cx + x, 11);
  // Fermoir en éclipse sur la poitrine.
  px(c, N.g2, cx - 2, 18, 5, 1); px(c, N.g2, cx - 2, 22, 5, 1); px(c, N.g2, cx - 3, 19, 1, 3); px(c, N.g2, cx + 3, 19, 1, 3);
  px(c, N.k, cx - 2, 19, 5, 3); px(c, N.g4, cx + 1, 20, 2, 1);
}

function hood(c: Ctx) {
  const OX = 19;
  for (let y = 12; y < 46; y++) {
    const t = (y - 12) / 33, hw = 2 + 15 * Math.sqrt(t), cx = OX - 5 * (1 - t) ** 2;
    for (let x = Math.ceil(cx - hw); x <= Math.floor(cx + hw); x++) {
      const u = (x - cx) / hw;
      px(c, u > 0.68 ? N.l : u > 0.1 ? N.b : u > -0.55 ? N.m : N.d, x, y);
    }
  }
  // Ouverture, liseré et masque de porcelaine fêlé.
  const fx = 24, fy = 33;
  const inside = (x: number, y: number, rx: number, ry: number) => ((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2 <= 1;
  for (let y = 20; y < 46; y++) for (let x = 12; x < 36; x++) {
    if (inside(x, y, 7.6, 10.4)) px(c, N.k, x, y);
    else if (inside(x, y, 8.8, 11.6)) px(c, y % 3 === 0 ? N.g3 : N.g1, x, y);
  }
  for (let y = 25; y < 43; y++) for (let x = 18; x < 31; x++) {
    if (!inside(x, y + 1, 5.6, 8.4)) continue;
    const u = x - fx;
    px(c, u < -3 ? N.s0 : u < -1 ? N.s1 : u > 2 ? N.s3 : N.s2, x, y);
  }
  // Orbites, fêlure, fente de la bouche.
  px(c, N.k, 21, 31, 3, 2); px(c, N.k, 26, 31, 3, 2);
  for (const [x, y] of [[27, 26], [27, 27], [26, 28], [26, 29], [25, 30], [25, 33], [26, 34], [26, 35]]) px(c, N.s0, x, y);
  px(c, N.k, 24, 37, 2, 1); px(c, N.s0, 24, 38, 2, 1); px(c, N.k, 24, 39, 2, 1);
  // Couronne de fer et trois cierges fondus.
  const band = 17, cx = OX - 5 * (1 - (band - 12) / 33) ** 2;
  for (let x = -10; x <= 10; x++) { px(c, x % 3 === 0 ? N.g3 : N.g2, Math.round(cx) + x, band); px(c, N.g0, Math.round(cx) + x, band + 1); }
  for (const [dx, top] of [[-9, 8], [0, 3], [9, 8]] as const) {
    const x = Math.round(cx) + dx - 1;
    px(c, N.wax, x, top, 3, band - top);
    px(c, N.waxD, x, top, 1, band - top);
    px(c, N.s3, x + 2, top, 1, 3);
    px(c, N.wax, x - 1, band - 3, 1, 3); px(c, N.wax, x + 3, band - 5, 1, 4); // coulures
    px(c, N.k, x + 1, top - 1); // mèche
  }
}

function arm(c: Ctx, dark: boolean) {
  const [a, b, e] = dark ? [N.k, N.d, N.m] : [N.d, N.m, N.b];
  for (let y = 0; y <= 28; y++) {
    const hw = 3 + (y / 28) * 4;
    for (let x = -Math.floor(hw); x <= Math.floor(hw); x++) px(c, x > hw * 0.4 ? e : x < -hw * 0.3 ? a : b, 8 + x, y);
  }
  px(c, dark ? N.g0 : N.g2, 1, 27, 15, 1);
  // Main décharnée, doigts séparés.
  const s = dark ? N.s0 : N.s1, h = dark ? N.s1 : N.s3;
  px(c, s, 5, 29, 7, 3);
  px(c, h, 9, 29, 3, 2);
  for (const x of [5, 7, 9, 11]) px(c, x === 11 ? h : s, x, 32, 1, 4);
}

function pole(c: Ctx) {
  // Hampe de bois cerclée de fer ; crochet recourbé vers l'avant en haut.
  for (let y = 10; y < 114; y++) { px(c, N.wood, 5, y); px(c, N.woodL, 6, y); px(c, N.k, 7, y); }
  for (const y of [18, 42, 78, 100, 111]) px(c, N.ironL, 4, y, 5, 2);
  for (let a = 180; a <= 360; a += 8) {
    const r = (a * Math.PI) / 180, x = Math.round(13 + Math.cos(r) * 7), y = Math.round(9 + Math.sin(r) * 7);
    px(c, N.iron, x, y, 2, 2); px(c, N.ironL, x, y, 1, 1);
  }
  px(c, N.iron, 20, 9, 2, 5); px(c, N.ironL, 20, 9, 1, 5);
  px(c, N.g3, 5, 2, 3, 1); px(c, N.g2, 4, 3, 5, 2); // fleuron
}

/** Lanterne de laiton (salle et perche) : éteinte, ou deux images de flamme. */
function lamp(c: Ctx, on: number) {
  px(c, N.g2, 6, 0, 3, 1); px(c, N.k, 7, 1); px(c, N.g1, 5, 1, 1, 2); px(c, N.g1, 9, 1, 1, 2); px(c, N.g2, 6, 2, 3, 1);
  for (let y = 3; y <= 5; y++) { const w = y - 1; px(c, N.g2, 7 - w, y, w * 2 + 1, 1); px(c, N.g3, 7, y, w, 1); }
  px(c, N.g3, 1, 6, 13, 1); px(c, N.g1, 1, 7, 13, 1);
  for (let y = 8; y <= 18; y++) {
    for (let x = 2; x <= 12; x++) {
      const bar = x === 2 || x === 12 || x === 7;
      px(c, bar ? (x === 12 ? N.g2 : N.g1) : on ? (y > 15 ? '#ff9a3a' : '#ffb84c') : y < 11 ? '#2e2749' : '#1a1528', x, y);
    }
    if (!on && y < 14) px(c, '#463c66', 10, y);
  }
  if (on) {
    // Flamme vive, cachée en partie par le montant central.
    const top = on === 1 ? 10 : 11;
    for (let y = top; y <= 16; y++) { const w = y < 13 ? 1 : 2; px(c, N.g4, 7 - w, y, w * 2 + 1, 1); }
    px(c, '#ffffff', 6, 14, 3, 2);
    px(c, N.g1, 7, 8, 1, 2);
  }
  px(c, N.g3, 1, 19, 13, 1); px(c, N.g1, 2, 20, 11, 1); px(c, N.g2, 5, 21, 5, 1); px(c, N.g1, 6, 22, 3, 1);
}

function flame(c: Ctx, f: number) {
  const hot = f === 0 ? [[2, 0, 1], [2, 1, 1], [1, 2, 2], [1, 3, 3], [1, 4, 3], [1, 5, 3], [2, 6, 1]] : [[1, 1, 1], [2, 2, 1], [1, 3, 2], [1, 4, 3], [1, 5, 3], [2, 6, 1]];
  for (const [x, y, w] of hot) px(c, '#ff8a2a', x, y, w, 1);
  px(c, '#ffc45c', 2, 4, 1, 2); px(c, N.g4, 2, 5);
}

/** Trou de lumière : anneaux à paliers et bord tramé, pour effacer l'obscurité sans dégradé baveux. */
function hole(c: Ctx, r: number) {
  const size = r * 2, img = c.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r + ((x + y) & 1 ? 0.018 : -0.018);
    const a = d < 0.5 ? 1 : d < 0.66 ? 0.84 : d < 0.8 ? 0.62 : d < 0.91 ? 0.36 : d < 1 ? 0.15 : 0;
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255;
  }
  c.putImageData(img, 0, 0);
}

function wave(c: Ctx, f: number) {
  // Lame de lumière rasante : cœur blanc, bords de danger.
  const prof = f ? [6, 12, 20, 26, 30, 28, 22, 15, 9, 5, 2] : [4, 10, 16, 24, 28, 30, 26, 18, 11, 6, 3];
  prof.forEach((h, i) => {
    const x = i * 2;
    px(c, '#c0144a', x, 30 - h, 2, h);
    if (h > 5) px(c, '#ff2a5a', x, 32 - h, 2, h - 2);
    if (h > 12) px(c, '#ffd6e0', x, 38 - h, 2, h - 8);
  });
}

export const LAMP_ON = ['noc_lamp1', 'noc_lamp2'];
export const HOLES = [20, 62, 96, 130];

export function makeNoctisArt(s: Phaser.Scene) {
  if (s.textures.exists('noc_robe0')) return;
  canvasTex(s, 'noc_robe0', 66, 78, (c) => robe(c, 0), OUTLINE);
  canvasTex(s, 'noc_robe1', 66, 78, (c) => robe(c, 1), OUTLINE);
  canvasTex(s, 'noc_hood', 38, 46, hood, OUTLINE);
  canvasTex(s, 'noc_arm', 17, 38, (c) => arm(c, false), OUTLINE);
  canvasTex(s, 'noc_armb', 17, 38, (c) => arm(c, true), OUTLINE);
  canvasTex(s, 'noc_pole', 24, 114, pole, OUTLINE);
  canvasTex(s, 'noc_lamp0', 15, 24, (c) => lamp(c, 0), OUTLINE);
  LAMP_ON.forEach((k, i) => canvasTex(s, k, 15, 24, (c) => lamp(c, i + 1), OUTLINE));
  canvasTex(s, 'noc_flame0', 5, 8, (c) => flame(c, 0));
  canvasTex(s, 'noc_flame1', 5, 8, (c) => flame(c, 1));
  canvasTex(s, 'noc_eyes', 7, 2, (c) => { px(c, '#fff', 0, 0, 2, 2); px(c, '#fff', 5, 0, 2, 2); });
  canvasTex(s, 'noc_slash', 112, 104, (c) => crescent(c, 44, 52, 50, 20, 46, '#190a24', '#ff2a5a'));
  canvasTex(s, 'noc_bolt', 13, 13, (c) => {
    for (const [r, col] of [[6, '#c0144a'], [4, '#ff2a5a'], [2, '#ffd6e0']] as const)
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) px(c, col, 6 + x, 6 + y);
  }, OUTLINE);
  canvasTex(s, 'noc_wave0', 22, 30, (c) => wave(c, 0));
  canvasTex(s, 'noc_wave1', 22, 30, (c) => wave(c, 1));
  for (const r of HOLES) canvasTex(s, `noc_hole${r}`, r * 2, r * 2, (c) => hole(c, r));
}
