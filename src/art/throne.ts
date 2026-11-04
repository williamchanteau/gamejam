import Phaser from 'phaser';
import { W, H } from '../config';
import { canvasTex, ell, OUTLINE, poly } from './pixel';
import { hash, inArch } from './room';

type Ctx = CanvasRenderingContext2D;
const R = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const GOLD = '#ffd36a', GOLDM = '#c8902a', GOLDD = '#8a5c1c', GOLDL = '#fff0b0';
const VEL = '#3a1f5a', VELD = '#28143f', VELL = '#54307c';
const FLOOR = 200, DARK = '#06050c';
/** Salle du trône (coordonnées monde). `steps` = bords gauches et dessus des marches de l'estrade. */
export const THR = {
  w: 760, lane: 242, stand: 548, x: 640,
  steps: [[572, 235], [586, 228], [600, 221]] as number[][],
  windows: [70, 190, 310, 430], chandeliers: [130, 370],
};
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

function windowAt(c: Ctx, cx: number) {
  const hw = 18, top = 54, bot = 158, yb = top + Math.round(Math.sqrt(3) * hw);
  for (let y = top - 4; y <= bot + 3; y++)
    for (let x = cx - hw - 4; x <= cx + hw + 4; x++) {
      if (inArch(x, y, cx, yb, hw) && y <= bot) {
        const gx = Math.floor((x - cx + 60) / 7), gy = Math.floor((y - top) / 11), lead = (x - cx + 60) % 7 === 0 || (y - top) % 11 === 0;
        R(c, lead ? '#3a2a44' : ['#fff0c0', '#bfe0d8', '#d8c4f4', '#ffe0a0'][(gx + gy * 3) % 4], x, y);
      } else if (inArch(x, y, cx, yb, hw + 3) && y <= bot + 3) R(c, x < cx ? '#7a769a' : '#4a4664', x, y);
    }
  R(c, '#8a86aa', cx - hw - 5, bot + 3, hw * 2 + 10, 2); R(c, '#2c2a44', cx - hw - 5, bot + 5, hw * 2 + 10, 1);
}

function pilaster(c: Ctx, x: number) {
  R(c, '#5e5a7c', x - 8, 44, 16, FLOOR - 44); R(c, '#7a769a', x - 8, 44, 3, FLOOR - 44); R(c, '#3c3856', x + 5, 44, 3, FLOOR - 44);
  R(c, GOLDM, x - 11, 42, 22, 4); R(c, GOLD, x - 11, 42, 22, 1); R(c, GOLDD, x - 10, 46, 20, 1);
  R(c, '#6e6a8c', x - 10, 190, 20, 10); R(c, '#8a86aa', x - 10, 190, 20, 1);
}

function banner(c: Ctx, x: number) {
  for (let y = 48; y < 124; y++) {
    R(c, VEL, x - 11, y, 22, 1); R(c, VELD, x - 11, y, 3, 1); R(c, VELL, x + 6, y, 3, 1); R(c, GOLD, x - 12, y, 1, 1); R(c, GOLD, x + 11, y, 1, 1);
  }
  poly(c, '#5e5a7c', [x - 8, 124, x, 112, x + 8, 124]); // queue d'aronde
  R(c, GOLDM, x - 13, 46, 26, 3); R(c, GOLD, x - 13, 46, 26, 1);
  // Couronne brodée.
  poly(c, GOLD, [x - 7, 86, x - 8, 72, x - 3, 78, x, 70, x + 3, 78, x + 8, 72, x + 7, 86]);
  R(c, GOLDM, x - 7, 84, 14, 2);
}

function apse(c: Ctx) {
  const x0 = 562, x1 = 718, m = 640;
  R(c, '#2a1f48', x0, 0, x1 - x0, FLOOR);
  // Rosace : lumière du matin derrière le trône.
  const ry = 72, rr = 44;
  for (let y = -rr; y <= rr; y++)
    for (let x = -rr; x <= rr; x++) {
      const d = Math.hypot(x, y), a = Math.atan2(y, x);
      if (d > rr) continue;
      const sec = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16);
      const lead = d > rr - 2 || d < 5 || Math.abs(d - 18) < 1 || Math.abs(d - 32) < 1 || Math.abs(Math.sin((a * 16) / 2)) < 0.05;
      R(c, lead ? GOLDD : d < 18 ? '#fff0c0' : d < 32 ? (sec % 2 ? '#ffe0a0' : '#d8c4f4') : (sec % 2 ? '#bfe0d8' : '#fff0c0'), m + x, ry + y);
    }
  // Rideaux violets à plis, cantonnière d'or.
  for (const [a, b] of [[x0, x0 + 34], [x1 - 34, x1]])
    for (let x = a; x < b; x++) {
      const f = Math.sin((x - a) * 0.75);
      R(c, f > 0.45 ? VELL : f < -0.35 ? VELD : VEL, x, 16, 1, FLOOR - 16);
    }
  for (let x = x0; x < x1; x++) {
    const s = Math.round(Math.sin((x - x0) * 0.2) * 3);
    R(c, VEL, x, 8, 1, 12 + s); R(c, GOLDM, x, 20 + s, 1, 2); if (x % 4 === 0) R(c, GOLD, x, 22 + s, 1, 2);
  }
  R(c, GOLDM, x0, 6, x1 - x0, 3); R(c, GOLD, x0, 6, x1 - x0, 1);
  for (const x of [x0 + 28, x1 - 34]) { R(c, GOLD, x, 118, 8, 4); R(c, GOLDM, x + 1, 122, 6, 10); } // embrasses
}

export function makeThroneArt(scene: Phaser.Scene) {
  const WW = THR.w;
  canvasTex(scene, 'thr_bg', WW, H, (c) => {
    // Mur de pierre, plus clair vers le bas (lumière du matin).
    for (let y = 0; y < FLOOR; y++) {
      const t = y / FLOOR;
      R(c, `rgb(${lerp(38, 92, t)},${lerp(35, 86, t)},${lerp(62, 118, t)})`, 0, y, WW, 1);
    }
    for (let y = 0; y < FLOOR; y += 12) {
      R(c, 'rgba(20,18,36,0.45)', 0, y, WW, 1); R(c, 'rgba(255,240,210,0.07)', 0, y + 1, WW, 1);
      for (let x = (y / 12) % 2 ? 0 : 16; x < WW; x += 32) { R(c, 'rgba(20,18,36,0.4)', x, y, 1, 12); if (hash(x, y) > 0.7) R(c, 'rgba(20,18,36,0.1)', x + 1, y + 2, 30, 9); }
    }
    for (let y = 0; y < 40; y++) R(c, `rgba(6,5,12,${0.55 * (1 - y / 40)})`, 0, y, WW, 1);
    for (const x of THR.windows) windowAt(c, x);
    for (let x = 130; x < 560; x += 120) pilaster(c, x);
    // Frise d'or et lambris de bois.
    R(c, GOLDM, 0, 38, WW, 3); R(c, GOLD, 0, 38, WW, 1);
    for (let x = 4; x < WW; x += 12) R(c, GOLDL, x, 39, 2, 1);
    R(c, '#4a2e1c', 0, 170, WW, 30); R(c, '#6a4428', 0, 170, WW, 2); R(c, GOLDM, 0, 168, WW, 2);
    for (let x = 6; x < WW; x += 28) { R(c, '#2c1a10', x, 175, 22, 21); R(c, '#5a3a22', x + 1, 176, 20, 19); R(c, '#4a2e1c', x + 3, 178, 16, 15); }
    for (let x = 130; x < 560; x += 120) { R(c, '#5e5a7c', x - 8, 168, 16, 22); R(c, '#7a769a', x - 8, 168, 3, 22); R(c, '#3c3856', x + 5, 168, 3, 22); banner(c, x); }
    apse(c);
    // Sol de marbre en damier : rangées plus hautes vers le spectateur.
    const rows = [200, 206, 214, 224, 236, 252, 270];
    for (let i = 0; i < rows.length - 1; i++) {
      const w = 16 + i * 7, y = rows[i], h = rows[i + 1] - y;
      for (let n = -1, x = -(i * 5) % w; x < WW; x += w, n++) {
        R(c, (n + i) % 2 ? '#6a6688' : '#52506e', x, y, w, h);
        R(c, (n + i) % 2 ? '#8a86a8' : '#66627e', x, y, w, 1);
      }
    }
    R(c, 'rgba(6,5,12,0.45)', 0, FLOOR, WW, 2);
    // Reflets des fenêtres sur le marbre.
    for (const x of THR.windows) for (let y = FLOOR; y < H; y++) R(c, 'rgba(255,230,180,0.1)', x - 16 + (y - FLOOR), y, 42, 1);
    // Tapis royal jusqu'à l'estrade.
    const [sx] = THR.steps[0], t0 = 226, t1 = 254;
    R(c, DARK, 0, t0, sx, t1 - t0); R(c, GOLDM, 0, t0 + 1, sx, 2); R(c, GOLD, 0, t0 + 1, sx, 1); R(c, GOLDM, 0, t1 - 3, sx, 2); R(c, GOLD, 0, t1 - 2, sx, 1);
    R(c, VEL, 0, t0 + 3, sx, t1 - t0 - 6);
    for (let x = 0; x < sx; x += 18) { poly(c, VELL, [x + 9, t0 + 6, x + 17, t0 + 14, x + 9, t0 + 22, x + 1, t0 + 14]); poly(c, VEL, [x + 9, t0 + 10, x + 13, t0 + 14, x + 9, t0 + 18, x + 5, t0 + 14]); R(c, GOLD, x + 9, t0 + 13, 1, 2); }
    for (let y = t0 + 3; y < t1 - 3; y += 8) R(c, VELD, 0, y, sx, 1);
    // Estrade à trois marches : marbre clair à lèvre d'or, tapis violet sur le dessus.
    const ends = [708, 694, 680], bot = [245, 235, 228];
    THR.steps.forEach(([x, y], i) => {
      R(c, DARK, x - 1, y - 1, ends[i] - x + 2, bot[i] - y + 2);
      R(c, '#6e6a8c', x, y, ends[i] - x, bot[i] - y); R(c, '#4a4664', x, y + 3, ends[i] - x, bot[i] - y - 3);
      R(c, GOLD, x, y, ends[i] - x, 1); R(c, GOLDM, x, y + 1, ends[i] - x, 1);
    });
    for (let y = FLOOR; y < H; y++) if (y > 256) R(c, `rgba(6,5,12,${((y - 256) / 14) * 0.45})`, 0, y, WW, 1);
  });

  // Rai de lumière additif (du vitrail vers le sol, en biais).
  canvasTex(scene, 'thr_shaft', 104, 190, (c) => {
    for (let y = 0; y < 190; y++) R(c, `rgba(255,226,170,${0.2 * (1 - y / 190) ** 0.6})`, Math.round(y * 0.33), y, 38, 1);
  });

  // Lustre : chaîne, anneau d'or, bougies.
  canvasTex(scene, 'thr_chand', 60, 44, (c) => {
    R(c, GOLDD, 29, 0, 2, 22);
    ell(c, GOLDD, 30, 30, 26, 6); ell(c, GOLD, 30, 29, 25, 5); ell(c, GOLDD, 30, 27.5, 21, 3);
    ell(c, GOLDM, 30, 34, 4, 3);
    for (const x of [8, 19, 30, 41, 52]) { R(c, '#f0ecdc', x - 1, 18, 3, 8); R(c, '#ffb050', x - 1, 13, 3, 4); R(c, GOLDL, x, 14, 1, 3); }
  });

  // Trône de face (64×96) : dossier capitonné, cimier, accoudoirs, siège.
  canvasTex(scene, 'thr_throne', 64, 96, (c) => {
    poly(c, GOLDM, [32, 0, 42, 10, 54, 8, 54, 80, 10, 80, 10, 8, 22, 10]);
    poly(c, GOLD, [32, 3, 41, 12, 52, 10, 52, 14, 12, 14, 12, 10, 23, 12]);
    R(c, VEL, 14, 16, 36, 60); R(c, VELD, 14, 16, 4, 60); R(c, VELL, 46, 16, 4, 60);
    for (let y = 22; y < 74; y += 11) for (let x = 20 + ((y - 22) % 22 ? 5 : 0); x < 46; x += 10) { R(c, VELD, x, y, 2, 2); R(c, VELL, x, y - 1, 2, 1); }
    R(c, GOLDD, 12, 76, 40, 1);
    for (const [x, y] of [[32, 2], [10, 7], [54, 7]]) { ell(c, GOLDD, x, y, 3.5, 3.5); ell(c, GOLD, x, y - 0.5, 2.5, 2.5); }
    ell(c, '#7ff6ff', 32, 11, 2, 2);
    // Siège, façade et pieds.
    R(c, VEL, 8, 76, 48, 8); R(c, VELL, 8, 76, 48, 2); for (let x = 8; x < 56; x += 3) R(c, GOLD, x, 84, 2, 2);
    R(c, GOLDM, 8, 84, 48, 12); R(c, GOLDD, 11, 87, 42, 9); R(c, '#2a1f48', 13, 88, 38, 8);
    for (const x of [2, 54]) {
      R(c, GOLDD, x, 66, 8, 30); R(c, GOLDM, x + 1, 66, 5, 30); R(c, GOLD, x + 1, 66, 1, 30);
      ell(c, GOLDD, x + 4, 66, 6, 4); ell(c, GOLD, x + 4, 65, 5, 3);
    }
  }, OUTLINE);

  // Coussin royal à glands d'or.
  canvasTex(scene, 'thr_cushion', 34, 13, (c) => {
    ell(c, VEL, 17, 7, 15, 5.5); ell(c, '#7a4aa8', 17, 6, 14.5, 4.5); ell(c, '#9a6ac8', 15, 4.5, 9, 2);
    R(c, GOLD, 3, 9, 28, 1); R(c, GOLDM, 5, 10, 24, 1);
    for (const x of [1, 31]) { R(c, GOLD, x, 6, 2, 3); R(c, GOLDM, x, 9, 2, 3); R(c, GOLDL, x, 6, 1, 1); }
  }, OUTLINE);

  // Panneau des crédits : sombre à gauche, s'efface vers le trône.
  canvasTex(scene, 'thr_panel', W, H, (c) => {
    for (let x = 0; x < 320; x++) R(c, `rgba(6,5,12,${x < 262 ? 0.84 : 0.84 * (1 - (x - 262) / 58)})`, x, 0, 1, H);
  });
}
