import Phaser from 'phaser';
import { canvasTex, crescent, OUTLINE } from './pixel';

// Noctis : créature sombre aux membres trop longs ; ces pièces fixes sont assemblées par art/noctisRig.ts.
type Ctx = CanvasRenderingContext2D;
export const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
export const N = {
  k: '#07060e', d: '#110e1e', m: '#1e1933', b: '#2e2749', l: '#463c66', r: '#6a5a8c',
  g0: '#3a2a1c', g1: '#6e4d22', g2: '#b0812f', g3: '#e8c25a', g4: '#fff0b0',
  s0: '#6f6a62', s1: '#a39d8e', s2: '#d6cfbc', s3: '#f4eedc',
  iron: '#3d4052', ironL: '#6a6e88',
};

// Pointes déchirées de la pèlerine.
const TATTER = [3, 0, 5, 2, 7, 1, 4, 8, 2, 6, 0, 3, 7, 1, 5, 2, 8, 3, 0, 6, 2, 4, 1, 7, 3, 0, 5, 2, 6, 1, 4, 2];

/** Buste creux, 32×44 : pèlerine en lambeaux, cage ouverte, taille vertébrée, bassin. */
export function drawTorso(c: Ctx) {
  const cx = 16;
  // Bassin et vertèbres.
  for (let y = 34; y < 44; y++) {
    const hw = Math.round(4 + (y - 34) * 0.55);
    for (let x = -hw; x <= hw; x++) px(c, x > hw * 0.4 ? N.l : x < -hw * 0.4 ? N.d : N.b, cx + x, y);
  }
  px(c, N.s0, cx - 5, 34, 11, 1); px(c, N.s1, cx + 1, 34, 4, 1);
  for (let y = 26; y < 34; y++) {
    px(c, N.k, cx - 4, y, 9, 1);
    px(c, y % 2 ? N.s1 : N.s0, cx - 2, y, 5, 1);
  }
  // Cage : creux noir, côtes dessinées à part pour passer devant la lanterne.
  for (let y = 8; y < 27; y++) {
    const hw = Math.round(11 - Math.abs(y - 14) * 0.26);
    for (let x = -hw; x <= hw; x++) px(c, Math.abs(x) >= hw ? N.m : N.k, cx + x, y);
  }
  // Pèlerine : col en V ouvert sur la cage.
  for (let y = 0; y < 19; y++) {
    const hw = Math.min(15, 6 + Math.sqrt(y) * 3.6), hole = (y - 4) * 0.95;
    for (let x = -Math.floor(hw); x <= Math.floor(hw); x++) {
      if (x > -hole && x < hole) continue;
      if (y > 10 + TATTER[(x + 16) & 31]) continue;
      const t = x / hw;
      px(c, t > 0.6 ? N.l : t > 0.1 ? N.b : t > -0.55 ? N.m : N.d, cx + x, y);
    }
  }
  // Pointes d'os aux épaules.
  px(c, N.s1, cx - 13, 4, 2, 2); px(c, N.s1, cx - 14, 2, 1, 2);
  px(c, N.s2, cx + 12, 4, 2, 2); px(c, N.s2, cx + 14, 2, 1, 2);
}

/** Côtes, 23×17 : passent devant la lanterne logée dans la poitrine. */
export function drawRibs(c: Ctx) {
  for (let r = 0; r < 4; r++) for (let x = -11; x <= 11; x++) {
    const hw = 11 - r, y = 1 + r * 4 + Math.round((Math.abs(x) / hw) ** 2 * 2);
    if (Math.abs(x) > hw) continue;
    px(c, N.k, 11 + x, y + 1);
    px(c, x > 3 ? N.s2 : x > -3 ? N.s1 : N.s0, 11 + x, y);
  }
}

/** Tête 24×32 : voile pointu et masque de théâtre mi-noir, mi-porcelaine, au rictus fendu jusqu'aux joues. */
export function drawHead(c: Ctx) {
  const cx = 13;
  for (let y = 1; y < 32; y++) {
    const t = y / 31, hw = 1 + 9 * Math.sin(Math.PI * t ** 0.75), m = cx - 3 - (1 - t) ** 2 * 6;
    for (let x = Math.ceil(m - hw); x <= Math.floor(m + hw); x++) px(c, x < m - hw * 0.4 ? N.d : N.m, x, y);
  }
  // Épines de fer autour du masque.
  for (const [x, top] of [[cx - 7, 2], [cx - 2, 0], [cx + 3, 1], [cx + 8, 4]]) {
    for (let y = top; y < top + 7; y++) { px(c, N.iron, x, y); if (y > top + 3) px(c, N.ironL, x + 1, y); }
  }
  for (let y = 5; y < 32; y++) {
    const hw = y <= 15 ? 8 * Math.sqrt(Math.max(0, 1 - ((15 - y) / 10.5) ** 2)) : 8 * (1 - ((y - 15) / 17) ** 1.7);
    const seam = Math.round(Math.sin(y * 1.1) * 1.2);
    for (let x = -Math.round(hw); x <= Math.round(hw); x++) {
      const light = x >= seam;
      const col = light ? (x > hw - 2 ? N.s1 : x > 3 ? N.s3 : N.s2) : (x < 1 - hw ? N.m : N.l);
      px(c, col, cx + x, y);
    }
  }
  // Orbites obliques : les yeux (noc_eyes) brillent dedans.
  for (let i = 0; i < 5; i++) { px(c, N.k, cx + 1 + i, 14 - (i >> 1), 1, 3); px(c, N.k, cx - 1 - i, 14 - (i >> 1), 1, 3); }
  // Rictus : coins relevés, dents.
  for (let x = -6; x <= 6; x++) {
    const y = Math.round(24 - (x / 6) ** 2 * 4);
    px(c, N.k, cx + x, y, 1, 2);
    if (x % 2 === 0 && Math.abs(x) < 6) px(c, N.s3, cx + x, y, 1, 1);
  }
  // Fêlure.
  for (const [x, y] of [[6, 7], [5, 8], [5, 9], [4, 10], [6, 17], [5, 18], [5, 19]]) px(c, N.s0, cx + x, y);
}

/** Lanterne de laiton (salle et mains) : éteinte, ou deux images de flamme. */
export function drawLamp(c: Ctx, on: number) {
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

/** Petite lanterne 9×15 : tentacules, flottantes, poitrine. */
export function drawLampS(c: Ctx, on: number) {
  px(c, N.g2, 3, 0, 3, 1); px(c, N.g1, 4, 1);
  px(c, N.g2, 2, 2, 5, 1); px(c, N.g3, 1, 3, 7, 1);
  for (let y = 4; y <= 11; y++) for (let x = 1; x <= 7; x++) {
    const bar = x === 1 || x === 7;
    px(c, bar ? (x === 7 ? N.g2 : N.g1) : on ? (y > 9 ? '#ff9a3a' : '#ffb84c') : y < 6 ? '#2e2749' : '#1a1528', x, y);
  }
  if (on) { for (let y = on === 1 ? 5 : 6; y <= 10; y++) px(c, N.g4, y < 8 ? 4 : 3, y, y < 8 ? 1 : 3, 1); px(c, '#ffffff', 4, 9); }
  px(c, N.g3, 1, 12, 7, 1); px(c, N.g1, 2, 13, 5, 1); px(c, N.g2, 4, 14);
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

/** Onde : trois tentacules jaillissent du sol, courbés vers l'avant, cernés de danger. */
function wave(c: Ctx, f: number) {
  const W = 34, H = 36;
  const spikes = [[[9, 21, 5], [20, 33, 9], [26, 14, 5]], [[8, 25, 7], [19, 29, 12], [27, 18, 4]], [[10, 18, 4], [18, 34, 7], [26, 22, 6]]][f];
  for (const [bx, h, curl] of spikes) {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= h; i++) { const s = i / h; pts.push([Math.round(bx + curl * s * s), H - 1 - i, Math.round(6 * (1 - s) + 1)]); }
    for (const [x, y, w] of pts) px(c, '#ff2a5a', x - (w >> 1) - 1, y - 1, w + 2, 3);
    for (const [x, y, w] of pts) px(c, y < H - h + 3 ? '#ffd6e0' : '#2a0a1e', x - (w >> 1), y, w, 1);
  }
  for (let x = 2; x < W - 2; x += 3) px(c, x % 2 ? '#c0144a' : '#ff2a5a', x, H - 2 - (x + f) % 3, 2, 2 + (x + f) % 3);
}

export const LAMP_ON = ['noc_lamp1', 'noc_lamp2'];
export const LAMPS_ON = ['noc_lampS1', 'noc_lampS2'];
export const HOLES = [20, 62, 96, 130];

export function makeNoctisArt(s: Phaser.Scene) {
  if (s.textures.exists('noc_torso')) return;
  canvasTex(s, 'noc_torso', 32, 44, drawTorso, OUTLINE);
  canvasTex(s, 'noc_ribs', 23, 17, drawRibs);
  canvasTex(s, 'noc_head', 24, 32, drawHead, OUTLINE);
  canvasTex(s, 'noc_lamp0', 15, 24, (c) => drawLamp(c, 0), OUTLINE);
  LAMP_ON.forEach((k, i) => canvasTex(s, k, 15, 24, (c) => drawLamp(c, i + 1), OUTLINE));
  canvasTex(s, 'noc_lampS0', 9, 15, (c) => drawLampS(c, 0), OUTLINE);
  LAMPS_ON.forEach((k, i) => canvasTex(s, k, 9, 15, (c) => drawLampS(c, i + 1), OUTLINE));
  canvasTex(s, 'noc_flame0', 5, 8, (c) => flame(c, 0));
  canvasTex(s, 'noc_flame1', 5, 8, (c) => flame(c, 1));
  canvasTex(s, 'noc_eyes', 7, 2, (c) => { px(c, '#fff', 0, 0, 2, 2); px(c, '#fff', 5, 0, 2, 2); });
  // Sillage de la lanterne : bord de danger, cœur de flamme, de plus en plus fin.
  canvasTex(s, 'noc_slash', 112, 104, (c) => {
    crescent(c, 44, 52, 50, 12, 46, '#c0144a', '#ff2a5a');
    crescent(c, 44, 52, 48, 12, 47, '#ff8a2a', '#ff8a2a');
    crescent(c, 44, 52, 46, 12, 48, '#ffd08a', '#fff0b0');
  });
  for (let f = 0; f < 3; f++) canvasTex(s, `noc_wave${f}`, 34, 36, (c) => wave(c, f));
  for (const r of HOLES) canvasTex(s, `noc_hole${r}`, r * 2, r * 2, (c) => hole(c, r));
}
