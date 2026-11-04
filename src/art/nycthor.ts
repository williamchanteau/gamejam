import Phaser from 'phaser';
import { canvasTex, crescent, OUTLINE } from './pixel';

// Nycthor : créature sombre aux membres trop longs ; ces pièces fixes sont assemblées par art/nycthorRig.ts.
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

/** Tête 26×38 : une lanterne morte de fer rouillé en guise de crâne, toit pointu et anneau ; dedans, un long crâne à la mâchoire pendante. */
export function drawHead(c: Ctx) {
  const cx = 13, rust = '#5a4434';
  // Anneau et toit.
  px(c, N.iron, cx - 2, 0, 5, 1); px(c, N.iron, cx - 2, 1, 1, 2); px(c, N.iron, cx + 2, 1, 1, 2); px(c, N.ironL, cx - 1, 3, 3, 1);
  for (let y = 4; y < 10; y++) {
    const hw = 1 + (y - 4) * 1.9;
    for (let x = -Math.round(hw); x <= Math.round(hw); x++) px(c, x > hw * 0.45 ? N.ironL : x < -hw * 0.5 ? N.d : (x + y) % 5 === 0 ? rust : N.iron, cx + x, y);
  }
  // Intérieur noir de la cage, qui se resserre vers le cou.
  for (let y = 10; y < 34; y++) {
    const hw = y < 29 ? 11 : 11 - (y - 28) * 1.6;
    for (let x = -Math.round(hw); x <= Math.round(hw); x++) px(c, N.k, cx + x, y);
  }
  // Long crâne : boîte crânienne, joues creuses.
  for (let y = 11; y < 25; y++) {
    const hw = y < 19 ? 6.5 * Math.sqrt(Math.max(0, 1 - ((19 - y) / 8.5) ** 2)) : 6.5 - (y - 19) * 0.55;
    for (let x = -Math.round(hw); x <= Math.round(hw); x++) px(c, x < -hw * 0.45 ? N.s0 : x < hw * 0.35 ? N.s1 : N.s2, cx + x, y);
  }
  px(c, N.s3, cx + 1, 12, 3, 2);
  // Orbites et fosse nasale.
  for (const sx of [-1, 1]) { px(c, N.k, cx + (sx < 0 ? -5 : 2), 16, 4, 4); px(c, N.k, cx + (sx < 0 ? -4 : 2), 15, 3, 1); }
  px(c, N.k, cx, 21, 1, 3); px(c, N.k, cx - 1, 22, 3, 1);
  // Dents, puis mâchoire qui pend, décrochée d'un côté.
  for (let x = -4; x <= 4; x += 2) px(c, N.s3, cx + x, 25, 1, 2);
  for (let y = 28; y < 33; y++) {
    const hw = 4 - (y - 28) * 0.5, dx = y >= 30 ? 1 : 0;
    for (let x = -Math.round(hw); x <= Math.round(hw); x++) px(c, x < 0 ? N.s0 : N.s1, cx + x + dx, y);
  }
  for (let x = -3; x <= 3; x += 2) px(c, N.s3, cx + x, 27, 1, 1);
  // Fêlure.
  for (const [x, y] of [[3, 11], [4, 12], [3, 13], [4, 14], [-3, 12], [-4, 13]]) px(c, N.s0, cx + x, y);
  // Barreaux devant le crâne, cerclages, base qui prend le cou.
  for (const x of [-11, -8, 8, 11]) for (let y = 10; y < 29; y++) px(c, y % 7 === 3 ? rust : x > 0 ? N.ironL : N.iron, cx + x, y);
  for (let x = -11; x <= 11; x++) { px(c, N.iron, cx + x, 10); px(c, x > 4 ? N.ironL : N.iron, cx + x, 28); }
  for (let y = 29; y < 38; y++) {
    const hw = Math.max(2, 10 - (y - 29) * 1.25);
    for (const sx of [-1, 1]) px(c, sx > 0 ? N.ironL : N.iron, cx + sx * Math.round(hw), y);
  }
  px(c, N.iron, cx - 3, 36, 7, 2);
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

export const LAMP_ON = ['nyc_lamp1', 'nyc_lamp2'];
export const LAMPS_ON = ['nyc_lampS1', 'nyc_lampS2'];
export const HOLES = [20, 62, 96, 130];

export function makeNycthorArt(s: Phaser.Scene) {
  if (s.textures.exists('nyc_torso')) return;
  canvasTex(s, 'nyc_torso', 32, 44, drawTorso, OUTLINE);
  canvasTex(s, 'nyc_ribs', 23, 17, drawRibs);
  canvasTex(s, 'nyc_head', 26, 38, drawHead, OUTLINE);
  canvasTex(s, 'nyc_lamp0', 15, 24, (c) => drawLamp(c, 0), OUTLINE);
  LAMP_ON.forEach((k, i) => canvasTex(s, k, 15, 24, (c) => drawLamp(c, i + 1), OUTLINE));
  canvasTex(s, 'nyc_lampS0', 9, 15, (c) => drawLampS(c, 0), OUTLINE);
  LAMPS_ON.forEach((k, i) => canvasTex(s, k, 9, 15, (c) => drawLampS(c, i + 1), OUTLINE));
  canvasTex(s, 'nyc_flame0', 5, 8, (c) => flame(c, 0));
  canvasTex(s, 'nyc_flame1', 5, 8, (c) => flame(c, 1));
  canvasTex(s, 'nyc_eyes', 7, 2, (c) => { px(c, '#fff', 0, 0, 2, 2); px(c, '#fff', 5, 0, 2, 2); });
  // Sillage de la lanterne : bord de danger, cœur de flamme, de plus en plus fin.
  canvasTex(s, 'nyc_slash', 112, 104, (c) => {
    crescent(c, 44, 52, 50, 12, 46, '#c0144a', '#ff2a5a');
    crescent(c, 44, 52, 48, 12, 47, '#ff8a2a', '#ff8a2a');
    crescent(c, 44, 52, 46, 12, 48, '#ffd08a', '#fff0b0');
  });
  for (const r of HOLES) canvasTex(s, `nyc_hole${r}`, r * 2, r * 2, (c) => hole(c, r));
}
