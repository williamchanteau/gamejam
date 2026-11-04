import Phaser from 'phaser';
import { H, ARENA } from '../config';
import { beam, canvasTex, ell, OUTLINE, poly } from './pixel';
import { NAVE_F, layerW } from './nave';
import { paintStairs, pool, STAIRS } from './outside';
import { inArch } from './room';

type Ctx = CanvasRenderingContext2D;
const FY = ARENA.floorY, WW = ARENA.bossW, WT = 36, RAIL = 158;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const GOLD = '#ffd36a', GOLDM = '#c8902a', GOLDD = '#8a5c1c', GOLDL = '#fff0b0';
const VEL = '#3a1f5a', VELD = '#28143f', VELL = '#54307c';
const WAL = '#4a2e1c', WALD = '#2c1a10', WALL = '#6a4428', WALX = '#180d08';
const TEAL = '#17403e', TEALD = '#0e2a2c', TEALL = '#256058';
const TABLE_H = 32, TABLE_X0 = 320, TABLE_X1 = 872, TOP_ROOM = 34;

/** Tout est en coordonnées monde, sauf `columns` (couche 2, facteur NAVE_F[2]). */
export const DINING = {
  table: { x0: TABLE_X0, x1: TABLE_X1, h: TABLE_H },
  king: 752,
  platter: 676,
  guests: [378, 442, 506, 570, 634],
  candles: [410, 538, 642, 848], // candélabres sur la table
  lustres: [262, 470, 660, 850],
  torcheres: [34, 272],
  fire: 158,
  columns: (w: number) => { const r: number[] = []; for (let x = 70; x < w; x += 290) r.push(x); return r; },
};

const inRound = (x: number, y: number, cx: number, base: number, hw: number) => (y >= base ? Math.abs(x - cx) <= hw : Math.hypot(x - cx, y - base) <= hw);

const MOTIF = ['.....#.....', '....###....', '...#.#.#...', '.##..#..##.', '#.#.###.#.#', '#..#####..#', '.#...#...#.', '...#.#.#...', '....###....', '.....#.....'];
function damask(c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string) {
  c.fillStyle = col;
  let row = 0;
  for (let y = y0; y < y1; y += 15, row++)
    for (let x = (row % 2 ? -13 : 0) + x0 - (x0 % 26); x < x1; x += 26)
      MOTIF.forEach((r, j) => { for (let i = 0; i < 11; i++) if (r[i] === '#' && y + j < y1) c.fillRect(x + i, y + j, 1, 1); });
}

/** Mur noble : damas prune, corniche dorée, cimaise, lambris de noyer à filets d'or. */
function paintWall(c: Ctx, x0: number, x1: number) {
  const w = x1 - x0;
  for (let y = WT; y < RAIL; y++) {
    const t = (y - WT) / (RAIL - WT);
    px(c, `rgb(${46 - 14 * t | 0},${28 - 9 * t | 0},${70 - 22 * t | 0})`, x0, y, w, 1);
  }
  damask(c, x0, WT + 8, x1, RAIL, 'rgba(120,88,170,0.32)');
  // Lambris.
  px(c, WALD, x0, RAIL, w, FY - RAIL);
  for (let x = x0 - (x0 % 46); x < x1; x += 46) {
    px(c, WALX, x, RAIL + 8, 40, FY - RAIL - 16); px(c, WAL, x + 1, RAIL + 9, 38, FY - RAIL - 18);
    px(c, WALL, x + 1, RAIL + 9, 38, 1); px(c, WALL, x + 1, RAIL + 9, 1, FY - RAIL - 18);
    c.strokeStyle = GOLDD; c.strokeRect(x + 4.5, RAIL + 12.5, 31, FY - RAIL - 25);
    px(c, GOLDM, x + 4, RAIL + 12, 9, 1);
    px(c, WALX, x + 41, RAIL, 5, FY - RAIL); px(c, WAL, x + 42, RAIL, 2, FY - RAIL);
  }
  px(c, '#06050c', x0, RAIL - 1, w, 1); px(c, GOLDM, x0, RAIL, w, 2); px(c, GOLDL, x0, RAIL, w, 1); px(c, WALL, x0, RAIL + 2, w, 3); px(c, WALX, x0, RAIL + 5, w, 2);
  // Plinthe, ombre au sol.
  px(c, WALX, x0, FY - 7, w, 7); px(c, GOLDD, x0, FY - 7, w, 1);
  // Corniche : oves dorés sur bande de noyer.
  px(c, '#06050c', x0, WT - 8, w, 1); px(c, WAL, x0, WT - 7, w, 9); px(c, WALL, x0, WT - 7, w, 1);
  px(c, GOLDD, x0, WT - 5, w, 5);
  for (let x = x0 - (x0 % 6); x < x1; x += 6) { ell(c, GOLDM, x + 3, WT - 3, 2, 2); px(c, GOLD, x + 2, WT - 4, 2, 1); }
  px(c, GOLDL, x0, WT - 5, w, 1); px(c, WALX, x0, WT + 2, w, 2);
  for (let y = WT + 4; y < WT + 12; y++) px(c, `rgba(6,5,12,${0.34 * (1 - (y - WT - 4) / 8)})`, x0, y, w, 1);
}

/** Pilastre de noyer cannelé, chapiteau et base d'or. */
function pilaster(c: Ctx, x: number, hw: number) {
  px(c, WALX, x - hw - 1, WT + 2, hw * 2 + 3, FY - WT - 2); px(c, WAL, x - hw, WT + 2, hw * 2 + 1, FY - WT - 2);
  px(c, WALL, x - hw, WT + 2, 2, FY - WT - 2);
  for (let k = x - hw + 3; k < x + hw - 1; k += 3) px(c, WALD, k, WT + 16, 1, RAIL - WT - 22);
  px(c, GOLDD, x - hw - 3, WT + 2, hw * 2 + 7, 8); px(c, GOLD, x - hw - 3, WT + 2, hw * 2 + 7, 1); px(c, GOLDM, x - hw - 2, WT + 4, hw * 2 + 5, 3);
  px(c, GOLDD, x - hw - 2, RAIL, hw * 2 + 5, 6); px(c, GOLD, x - hw - 2, RAIL, hw * 2 + 5, 1);
  px(c, GOLDD, x - hw - 3, FY - 12, hw * 2 + 7, 12); px(c, GOLD, x - hw - 3, FY - 12, hw * 2 + 7, 1);
}

/** Haute fenêtre en plein cintre, nuit bleue et lune, rideaux sarcelle retenus par un embrasse d'or. */
function bigWindow(c: Ctx, cx: number, moon: boolean) {
  const hw = 24, base = 76, bot = 150;
  for (let y = base - hw - 4; y <= bot + 3; y++)
    for (let x = cx - hw - 4; x <= cx + hw + 4; x++) {
      if (y > bot || !inRound(x, y, cx, base, hw)) { if (y <= bot + 3 && inRound(x, Math.min(y, bot), cx, base, hw + 3)) px(c, (x + y) % 5 ? GOLDM : GOLDD, x, y); continue; }
      const t = (y - (base - hw)) / (bot - base + hw), lead = (x - cx + 48) % 12 === 0 || (y + 200) % 14 === 0;
      px(c, lead ? '#0b0a18' : `rgb(${18 + 22 * t | 0},${30 + 34 * t | 0},${72 + 62 * t | 0})`, x, y);
    }
  if (moon) { // lune froide et étoiles
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) if (Math.hypot(x, y) <= 9 && (x + 48) % 12 && (y + 300) % 14) px(c, Math.hypot(x + 2, y - 2) < 3 ? '#b4c4e8' : '#dfe8ff', cx + x, 100 + y);
  }
  for (const [x, y] of [[-14, 62], [-8, 92], [12, 104], [-16, 124], [15, 84]]) px(c, '#dfe8ff', cx + x, y);
  px(c, GOLDL, cx - hw - 4, bot + 1, hw * 2 + 8, 1);
  // Rideaux : plis verticaux, resserrés à l'embrasse.
  for (const s of [-1, 1]) {
    for (let y = 44; y < RAIL - 1; y++) {
      const tie = 118, k = y < tie ? 1 - ((y - 44) / (tie - 44)) ** 2 * 0.55 : 0.45 + ((y - tie) / (RAIL - tie)) * 0.35, wd = Math.round(26 * k);
      for (let i = 0; i < wd; i++) {
        const x = s < 0 ? cx - hw - 7 + i : cx + hw + 7 - i, f = Math.sin((i / Math.max(1, wd)) * 11);
        px(c, f > 0.45 ? TEALL : f > -0.4 ? TEAL : TEALD, x, y);
      }
      px(c, '#06050c', s < 0 ? cx - hw - 7 + wd : cx + hw + 7 - wd, y);
    }
    px(c, GOLD, s < 0 ? cx - hw - 7 : cx + hw - 3, 117, 11, 3); px(c, GOLDD, s < 0 ? cx - hw - 7 : cx + hw - 3, 120, 11, 1);
  }
  // Lambrequin et tringle.
  for (let x = cx - hw - 12; x <= cx + hw + 12; x++) {
    const h = 8 + Math.round(5 * Math.abs(Math.sin(((x - cx) / 18) * Math.PI)));
    px(c, VEL, x, 42, 1, h); px(c, GOLDM, x, 42 + h, 1, 1); if (x % 2) px(c, GOLDD, x, 43 + h, 1, 1);
  }
  px(c, GOLD, cx - hw - 14, 40, hw * 2 + 28, 2); px(c, GOLDD, cx - hw - 14, 42, hw * 2 + 28, 1);
  c.fillStyle = 'rgba(127,170,255,0.05)'; // rayon de lune
  c.beginPath(); c.moveTo(cx - 20, 150); c.lineTo(cx + 20, 150); c.lineTo(cx + 58, FY); c.lineTo(cx + 8, FY); c.fill();
}

/** Cadre doré ouvragé. `paint` dessine l'intérieur (ox, oy, w, h). */
function frame(c: Ctx, cx: number, y: number, w: number, h: number, paint: (ox: number, oy: number, w: number, h: number) => void) {
  const x = cx - (w >> 1);
  px(c, '#06050c', x - 1, y - 1, w + 2, h + 2); px(c, GOLDD, x, y, w, h); px(c, GOLD, x, y, w, 1); px(c, GOLD, x, y, 1, h); px(c, GOLDM, x + 1, y + 1, w - 2, h - 2);
  for (let i = 3; i < w - 3; i += 4) { px(c, GOLDL, x + i, y + 1, 1, 1); px(c, GOLDD, x + i, y + h - 3, 2, 1); }
  for (let i = 3; i < h - 3; i += 4) { px(c, GOLDL, x + 1, y + i, 1, 1); px(c, GOLDD, x + w - 3, y + i, 1, 2); }
  for (const [qx, qy] of [[x, y], [x + w - 5, y], [x, y + h - 5], [x + w - 5, y + h - 5]]) { px(c, GOLDL, qx, qy, 5, 5); px(c, GOLDM, qx + 1, qy + 1, 3, 3); }
  px(c, GOLDD, x + 3, y + 3, w - 6, h - 6); px(c, '#0f0a18', x + 4, y + 4, w - 8, h - 8);
  c.save(); c.beginPath(); c.rect(x + 4, y + 4, w - 8, h - 8); c.clip(); paint(x + 4, y + 4, w - 8, h - 8); c.restore();
}

function pumpkin(c: Ctx, x: number, y: number) {
  for (let yy = 0; yy < 12; yy++) for (let xx = -9; xx <= 9; xx++) {
    const dx = xx / 9.5, dy = (yy - 6) / 6;
    if (dx * dx + dy * dy <= 1) px(c, Math.abs(xx) % 4 === 1 ? '#9a3f12' : dx < -0.2 && dy < 0 ? '#f08a2a' : '#d9661c', x + xx, y - 12 + yy);
  }
  px(c, '#4c5a2a', x - 1, y - 15, 2, 3);
  px(c, GOLD, x - 5, y - 9, 3, 2); px(c, GOLD, x + 2, y - 9, 3, 2); px(c, GOLD, x - 5, y - 5, 10, 2);
  for (let xx = -4; xx < 5; xx += 3) px(c, '#9a3f12', x + xx, y - 5);
}

function plate(c: Ctx, x: number, y: number) {
  ell(c, '#6a708a', x, y, 13, 2.8); ell(c, '#e8ecf6', x, y - 0.5, 12, 2); ell(c, '#c4cadc', x, y - 0.5, 8, 1); px(c, GOLD, x - 11, y - 1, 1, 1); px(c, GOLD, x + 11, y - 1, 1, 1);
}

/** Longue table de banquet (hauteur TABLE_H) : nappe de velours à galons d'or, couverts, candélabres. */
function longTable(c: Ctx, src: (k: string) => CanvasImageSource) {
  const w = TABLE_X1 - TABLE_X0, T = TOP_ROOM, h = T + TABLE_H + 1, X = (wx: number) => wx - TABLE_X0;
  // Pied de table qui dépasse et plateau sculpté.
  for (let x = 0; x < w; x++) {
    const f = Math.sin(x * 0.42) + 0.6 * Math.sin(x * 0.17);
    px(c, f > 0.75 ? VELL : f > -0.55 ? VEL : VELD, x, T + 4, 1, h - T - 4);
  }
  px(c, '#06050c', 0, T - 1, w, 1); px(c, WALL, 0, T, w, 1); px(c, VELL, 0, T + 1, w, 1); px(c, VEL, 0, T + 2, w, 2);
  // Chemin de table crème.
  px(c, '#cfc6b0', 6, T + 2, w - 12, 1); px(c, '#f0ecd8', 6, T + 1, w - 12, 1);
  // Galons : bandeau festonné, couronnes brodées, frange au sol.
  px(c, GOLD, 0, T + 4, w, 1); px(c, GOLDD, 0, T + 5, w, 1);
  for (let x = 0; x < w; x += 12) {
    for (let i = 0; i < 12; i++) { const yy = T + 6 + Math.round(4 * Math.sin((i / 12) * Math.PI)); px(c, VELD, x + i, T + 6, 1, yy - T - 6); px(c, GOLDM, x + i, yy, 1, 1); }
    px(c, GOLD, x, T + 6, 1, 2); ell(c, GOLD, x + 6, T + 7, 1, 1);
  }
  for (let x = 46; x < w; x += 92) {
    const y0 = T + 14;
    for (const [dx, hh] of [[-4, 5], [-2, 3], [0, 5], [2, 3], [4, 5]]) px(c, GOLD, x + dx, y0 + 5 - hh, 1, hh);
    px(c, GOLD, x - 4, y0 + 5, 9, 3); px(c, GOLDD, x - 4, y0 + 8, 9, 1);
    px(c, GOLDD, x - 7, y0 + 10, 15, 1);
  }
  px(c, GOLDD, 0, h - 5, w, 1);
  for (let x = 0; x < w; x++) px(c, x % 2 ? GOLDM : GOLDD, x, h - 4, 1, x % 4 === 0 ? 4 : 3);
  // Bouts de table : ombre et chute de la nappe.
  px(c, '#06050c', 0, T, 1, h - T); px(c, '#06050c', w - 1, T, 1, h - T);
  // Couverts et centres de table.
  const put = (k: string, wx: number, dy = 0) => { const s = src(k) as HTMLCanvasElement; c.drawImage(s, Math.round(X(wx) - s.width / 2), T + 1 - s.height + dy); };
  for (const x of DINING.guests) { plate(c, X(x), T + 1); }
  for (const x of [440, 568]) put('din_bone', x, -2);
  for (const x of [372, 470, 600, 826]) put('din_goblet', x);
  for (const x of DINING.candles) put('din_cande', x);
  put('din_cloche', 506); put('din_fruit', 476); put('din_pumpkin', 606);
  put('burger_b2', 806);
}

/** Grande chaise de noyer, haut dossier de velours capitonné, boules d'or : une chaise, pas un trône. */
function kingChair(c: Ctx) {
  const X = 52;
  // Montants + traverses.
  for (const x of [6, 88]) { px(c, WALD, x, 16, 10, 174); px(c, WAL, x + 2, 16, 6, 174); px(c, WALL, x + 2, 16, 1, 174); ell(c, GOLDM, x + 5, 12, 6, 6); ell(c, GOLD, x + 4, 11, 4, 4); ell(c, GOLDL, x + 3, 9, 1.5, 1.5); }
  poly(c, WALD, [10, 18, 28, 6, 52, 0, 76, 6, 94, 18, 94, 36, 10, 36]);
  poly(c, WAL, [14, 19, 30, 9, 52, 3, 74, 9, 90, 19, 90, 33, 14, 33]);
  poly(c, WALL, [30, 9, 52, 3, 74, 9, 74, 10, 52, 5, 30, 10]);
  // Crête sculptée, dorée.
  ell(c, GOLDD, X, 20, 10, 8); ell(c, GOLDM, X, 19, 8, 6); ell(c, GOLD, X - 1, 18, 5, 3.5);
  for (const s of [-1, 1]) { beam(c, GOLDD, X + s * 12, 20, X + s * 30, 25, 2); beam(c, GOLDM, X + s * 12, 19, X + s * 30, 24, 1); }
  // Velours capitonné.
  px(c, GOLDD, 14, 36, 76, 136); px(c, VELD, 16, 37, 72, 134); px(c, VEL, 18, 38, 68, 132);
  for (let y = 44; y < 168; y += 14) for (let x = 25 + ((y - 44) % 28 ? 9 : 0); x < 84; x += 18) { ell(c, VELL, x, y, 1.5, 1.5); px(c, VELD, x, y + 2); px(c, VELD, x - 3, y + 3, 2, 1); }
  px(c, VELL, 18, 38, 68, 1);
  px(c, WALD, 14, 172, 76, 10); px(c, WALL, 14, 172, 76, 1);
}

/** Grand plat creux d'argent à bord d'or, pyramide de burgers (quelques-uns entamés). */
function heap(c: Ctx, src: (k: string) => CanvasImageSource) {
  const X = 56, base = 66;
  ell(c, '#06050c', X, base + 1, 55, 8); ell(c, '#8a90a8', X, base + 1, 54, 7); ell(c, '#e8ecf6', X, base, 52, 6); ell(c, '#aeb4c8', X, base, 46, 4.5);
  const rows = [[-33, -11, 11, 33], [-22, 0, 22], [-11, 11], [0]];
  for (let lvl = rows.length - 1; lvl >= 0; lvl--) rows[lvl].forEach((dx, i) => {
    const s = src((lvl + i * 3) % 7 === 5 ? 'burger_b1' : 'burger') as HTMLCanvasElement;
    c.drawImage(s, Math.round(X + dx - s.width / 2 + ((i * 5 + lvl) % 3) - 1), base - 16 - lvl * 14 + ((i + lvl) % 2));
  });
  // Bord avant, par-dessus les burgers du bas.
  for (let x = -54; x <= 54; x++) {
    const y = base + 1 + Math.round(7 * Math.sqrt(1 - (x / 54) ** 2));
    px(c, '#e8ecf6', X + x, y - 2); px(c, GOLD, X + x, y - 1); px(c, GOLDD, X + x, y); px(c, '#06050c', X + x, y + 1);
  }
  px(c, GOLDD, X - 16, base + 9, 32, 1);
}

function lustre(c: Ctx) {
  const X = 60;
  for (let y = 0; y < 20; y += 3) { px(c, '#2a2238', X - 1, y, 2, 2); px(c, GOLDD, X, y, 1, 1); }
  ell(c, GOLDD, X, 22, 4, 4); ell(c, GOLD, X - 1, 21, 2, 2);
  ell(c, GOLDD, X, 32, 7, 5); ell(c, GOLD, X - 1, 31, 4, 3);
  ell(c, GOLDD, X, 46, 4, 6); ell(c, GOLDM, X - 1, 45, 2, 4);
  for (let k = -3; k <= 3; k++) {
    if (k === 0) continue;
    const x = X + k * 16, sag = 6 + Math.abs(k);
    for (let t = 0; t <= 1; t += 0.03) {
      const ax = X + (x - X) * t, ay = 32 + sag * 4 * t * (1 - t) + (6 - Math.abs(k) * 2) * t;
      px(c, t < 0.1 ? GOLDD : GOLDM, Math.round(ax), Math.round(ay), 1, 2);
    }
    const cy = 38 - Math.abs(k) * 2;
    px(c, GOLDD, x - 3, cy, 7, 2); px(c, GOLD, x - 3, cy, 7, 1);
    px(c, '#efe6d0', x - 1, cy - 8, 3, 8); px(c, '#c8c0a8', x + 1, cy - 8, 1, 8);
    px(c, '#ff8a2a', x, cy - 12, 1, 4); px(c, GOLDL, x, cy - 10, 1, 2);
    for (const [dx, l] of [[-3, 5], [0, 8], [3, 5]]) { px(c, '#dfe6ff', x + dx, cy + 2, 1, l); px(c, '#fff', x + dx, cy + 2 + l, 1, 1); }
  }
  for (let t = 0; t <= 1; t += 0.05) { const ax = X - 26 + 52 * t; px(c, '#dfe6ff', Math.round(ax), Math.round(44 + 8 * Math.sin(t * Math.PI))); }
  px(c, '#dfe6ff', X - 1, 52, 2, 4); px(c, '#fff', X, 56, 1, 2);
}

/** Cheminée de marbre clair à manteau doré (repère monde), le portrait du roi au-dessus. */
function fireplace(c: Ctx, cx: number, src: (k: string) => CanvasImageSource) {
  const M = ['#3e3a54', '#5e5a78', '#7e7a98', '#9c98b4'], top = FY - 88;
  pool(c, cx, FY - 30, 86, '255,138,42', 0.3);
  px(c, '#06050c', cx - 56, top + 8, 112, FY - top - 8); px(c, M[1], cx - 55, top + 8, 110, FY - top - 8);
  // Jambages.
  for (const x of [cx - 55, cx + 37]) {
    px(c, M[2], x, top + 8, 18, FY - top - 8); px(c, M[3], x + 2, top + 8, 2, FY - top - 8); px(c, M[0], x + 15, top + 8, 3, FY - top - 8);
    for (const dx of [7, 10, 13]) px(c, M[1], x + dx, top + 16, 1, FY - top - 28);
    px(c, GOLDD, x, FY - 10, 18, 10); px(c, GOLD, x, FY - 10, 18, 1);
  }
  // Foyer en anse de panier.
  for (let y = top + 16; y < FY; y++) for (let x = cx - 37; x <= cx + 37; x++) {
    if (inRound(x, y, cx, top + 52, 36)) px(c, y > FY - 26 ? '#120a0c' : '#0a0710', x, y);
    else if (inRound(x, y, cx, top + 52, 37)) px(c, GOLDM, x, y);
    else if (x > cx - 37 && x < cx + 37) px(c, M[2], x, y);
  }
  ell(c, GOLD, cx, top + 17, 6, 4); ell(c, GOLDM, cx, top + 17, 4, 2.5); // clé du foyer
  // Chenets, bûches.
  px(c, '#2c1a10', cx - 26, FY - 7, 52, 5); px(c, '#4a2e1c', cx - 26, FY - 7, 52, 1); beam(c, '#2c1a10', cx - 22, FY - 11, cx + 20, FY - 6, 3);
  for (const x of [cx - 30, cx + 28]) { px(c, GOLDD, x, FY - 13, 2, 13); ell(c, GOLD, x + 1, FY - 14, 2, 2); }
  // Manteau.
  px(c, '#06050c', cx - 64, top - 1, 128, 11); px(c, M[3], cx - 63, top, 126, 2); px(c, M[2], cx - 63, top + 2, 126, 3); px(c, GOLD, cx - 63, top + 5, 126, 1); px(c, GOLDD, cx - 61, top + 6, 122, 3);
  const put = (k: string, x: number, y: number, flip = false) => {
    const s = src(k) as HTMLCanvasElement;
    if (flip) { c.save(); c.scale(-1, 1); c.drawImage(s, -x - s.width, y); c.restore(); } else c.drawImage(s, x, y);
  };
  // Portrait du roi : le joueur l'a sous les yeux avant de manger son burger.
  const fw = 96, fh = 90, fy = top - 3 - fh;
  pool(c, cx, fy + 20, 70, '255,190,110', 0.14);
  frame(c, cx, fy, fw, fh, (ox, oy, w2, h2) => {
    for (let i = 0; i < h2; i++) px(c, `rgb(${40 - i * 0.2 | 0},${22 - i * 0.1 | 0},${60 - i * 0.3 | 0})`, ox, oy + i, w2, 1);
    const mid = ox + (w2 >> 1), bot = oy + 60; // bas de la tête
    put('mck_torso', mid - 42, bot - 6);
    put('mck_head', mid - 30, bot - 44);
    put('mck_crown', mid - 16, bot - 58);
    for (let i = 0; i < 90; i++) { const x = ox + (i * 37) % w2, y = oy + (i * 53) % h2; if ((x + y) % 7 === 0) px(c, 'rgba(255,255,255,0.05)', x, y); } // craquelures
  });
  for (const x of [cx - 56, cx + 55]) { // bougeoirs de part et d'autre du tableau
    px(c, GOLDD, x - 3, top - 2, 7, 2); px(c, GOLD, x - 1, top - 6, 3, 4);
    px(c, '#efe6d0', x, top - 15, 2, 9); px(c, '#ff8a2a', x, top - 19, 1, 4); px(c, GOLDL, x, top - 17, 1, 2);
  }
  pumpkin(c, cx + 80, FY);
}

/** Torchère d'or sur pied (repère monde), 5 bougies. */
function torchere(c: Ctx, x: number) {
  const y = FY;
  pool(c, x, y - 92, 52, '255,160,70', 0.2);
  px(c, '#06050c', x - 2, y - 84, 5, 84); px(c, GOLDM, x - 1, y - 84, 3, 84); px(c, GOLDL, x - 1, y - 84, 1, 84);
  for (const yy of [y - 24, y - 56, y - 74]) { ell(c, GOLDD, x, yy, 4, 2); ell(c, GOLD, x, yy - 1, 3, 1); }
  poly(c, GOLDD, [x - 10, y, x - 4, y - 8, x + 4, y - 8, x + 10, y]); poly(c, GOLD, [x - 7, y - 1, x - 3, y - 7, x, y - 7, x - 3, y - 1]);
  for (let k = -2; k <= 2; k++) {
    const bx = x + k * 6, by = y - 88 + Math.abs(k) * 2;
    px(c, GOLDM, bx - 2, by, 5, 2); px(c, GOLD, bx - 2, by, 5, 1);
    px(c, '#efe6d0', bx, by - 8, 2, 8); px(c, '#ff8a2a', bx, by - 11, 1, 3); px(c, GOLDL, bx, by - 10, 1, 1);
  }
  px(c, GOLDD, x - 14, y - 86, 28, 2);
}

export function makeDiningArt(scene: Phaser.Scene) {
  const src = (k: string) => scene.textures.get(k).getSourceImage() as CanvasImageSource;
  const w0 = layerW(NAVE_F[0]), w1 = layerW(NAVE_F[1]), w2 = layerW(NAVE_F[2]), w3 = layerW(NAVE_F[4]);
  // Petits objets, repris ensuite dans la table et sur la cheminée.
  canvasTex(scene, 'din_pumpkin', 22, 18, (c) => pumpkin(c, 11, 17), OUTLINE);
  canvasTex(scene, 'din_cloche', 30, 22, (c) => {
    px(c, '#8a90a8', 1, 18, 28, 3); px(c, '#e8ecf6', 1, 18, 28, 1);
    ell(c, '#8a90a8', 15, 18, 12, 13); c.clearRect(0, 19, 30, 3); px(c, '#8a90a8', 1, 18, 28, 3); px(c, '#e8ecf6', 1, 18, 28, 1);
    ell(c, '#c4cadc', 14, 17, 10, 11); c.clearRect(0, 18, 30, 1); px(c, '#e8ecf6', 1, 18, 28, 1);
    px(c, '#fff', 9, 9, 4, 1); px(c, '#fff', 8, 10, 2, 3); ell(c, GOLD, 15, 4, 2, 2);
  }, OUTLINE);
  canvasTex(scene, 'din_fruit', 32, 22, (c) => {
    ell(c, '#4c2a72', 10, 9, 5, 5); for (const [x, y] of [[6, 7], [9, 5], [12, 7], [8, 10], [11, 11], [14, 10]]) { ell(c, '#6a3ea0', x, y, 2, 2); px(c, '#9a70d0', x - 1, y - 1); }
    ell(c, '#b8a02c', 21, 8, 5, 6); ell(c, '#dcc850', 20, 7, 3, 4); px(c, WALD, 21, 1, 1, 3);
    ell(c, '#e07a1c', 15, 11, 4, 4); px(c, GOLD, 14, 9, 2, 1);
    ell(c, GOLDD, 15, 15, 14, 3.5); ell(c, GOLD, 15, 14, 13, 2); px(c, GOLDD, 12, 18, 6, 2); px(c, GOLDM, 9, 20, 12, 2);
  }, OUTLINE);
  // Plafond à caissons dorés (lointain).
  canvasTex(scene, 'din0', w0, H, (c) => {
    px(c, '#0e0916', 0, 0, w0, H);
    for (let x = 0; x < w0; x += 46) for (const [y, h] of [[0, 14], [14, 18]]) {
      px(c, WALD, x, y, 46, h); px(c, WALX, x + 3, y + 2, 40, h - 3); px(c, '#241636', x + 5, y + 4, 36, h - 7);
      px(c, '#4a3216', x + 4, y + 3, 38, 1); px(c, '#4a3216', x + 4, y + 3, 1, h - 5);
      ell(c, '#4a3216', x + 23, y + (h >> 1) + 1, 4, 2.5); ell(c, '#6e5020', x + 23, y + (h >> 1), 2, 1.2);
    }
  });
  // Mur : travées égales, fenêtres et grands tableaux en alternance.
  canvasTex(scene, 'din1', w1, H, (c) => {
    paintWall(c, 0, w1);
    const bay = 125, pil: number[] = [];
    for (let x = -20; x < w1 + bay; x += bay) pil.push(x);
    pil.slice(0, -1).forEach((a, i) => {
      const bx = a + (bay >> 1);
      if (i % 2) {
        pool(c, bx, 56, 64, '255,190,110', 0.16);
        frame(c, bx, 54, 74, 92, (ox, oy, w, h) => {
          for (let k = 0; k < h; k++) px(c, `rgb(${30 - k * 0.15 | 0},${18 - k * 0.08 | 0},${44 - k * 0.2 | 0})`, ox, oy + k, w, 1);
          const mid = ox + (w >> 1), which = (i >> 1) % 3;
          c.imageSmoothingEnabled = false;
          if (which === 0) { // nature morte au burger, en majesté
            ell(c, '#c4cadc', mid, oy + 58, 26, 3); c.drawImage(src('burger') as HTMLCanvasElement, mid - 26, oy + 16, 52, 42);
          } else if (which === 1) { // la couronne sur son coussin
            ell(c, VEL, mid, oy + 56, 24, 8); ell(c, VELL, mid - 3, oy + 53, 14, 3);
            for (const s of [-1, 1]) { px(c, GOLD, mid + s * 24, oy + 56, 2, 6); }
            c.drawImage(src('mck_crown') as HTMLCanvasElement, mid - 17, oy + 32);
          } else { // citrouille d'automne
            c.drawImage(src('din_pumpkin') as HTMLCanvasElement, mid - 26, oy + 18, 52, 44);
          }
        });
        px(c, '#06050c', bx - 11, 148, 22, 6); px(c, GOLD, bx - 10, 149, 20, 4); px(c, GOLDD, bx - 7, 150, 14, 1); // cartouche
      } else bigWindow(c, bx, i % 4 === 0);
    });
    for (const x of pil) pilaster(c, x, 7);
    for (let y = FY - 40; y < FY; y++) px(c, `rgba(6,5,12,${((y - FY + 40) / 40) * 0.5})`, 0, y, w1, 1);
  });
  // Colonnes de marbre noir veiné d'or, appliques à bougies.
  canvasTex(scene, 'din2', w2, H, (c) => {
    for (const cx of DINING.columns(w2)) {
      const hw = 13, top = 44;
      for (let x = -hw; x <= hw; x++) {
        const k = x / hw, l = 1 - k * k * 0.72 + (x < -3 && x > -8 ? 0.28 : 0);
        px(c, `rgb(${18 + 30 * l | 0},${15 + 26 * l | 0},${30 + 40 * l | 0})`, cx + x, top, 1, FY - top);
      }
      for (let i = 0; i < 34; i++) { // veines
        let vx = cx - hw + ((i * 73) % (hw * 2)), vy = top + ((i * 131) % (FY - top - 16));
        for (let s = 0; s < 8 && Math.abs(vx - cx) < hw; s++) { px(c, i % 3 ? 'rgba(138,92,28,0.4)' : 'rgba(255,211,106,0.28)', vx, vy); vx += (i + s) % 3 === 0 ? 1 : (i + s) % 3 === 1 ? -1 : 0; vy++; }
      }
      // Entablement sombre (le HUD passe dessus), chapiteau à feuilles d'or, socle à tores.
      px(c, '#06050c', cx - 22, 0, 44, 25); px(c, WALD, cx - 21, 0, 42, 24); px(c, WAL, cx - 19, 0, 38, 22);
      px(c, GOLD, cx - 23, 24, 46, 1); px(c, GOLDD, cx - 23, 25, 46, 2);
      poly(c, GOLDD, [cx - 19, 27, cx + 19, 27, cx + 15, 44, cx - 15, 44]); poly(c, GOLDM, [cx - 17, 27, cx + 15, 27, cx + 12, 43, cx - 13, 43]);
      for (const dx of [-11, -4, 3, 10]) { ell(c, GOLD, cx + dx, 37, 2.5, 6); ell(c, GOLDD, cx + dx + 1, 39, 1, 4); }
      for (const q of [-1, 1]) { ell(c, GOLDD, cx + q * 18, 30, 4, 4); ell(c, GOLD, cx + q * 18, 30, 2.5, 2.5); px(c, GOLDD, cx + q * 18, 30); }
      px(c, GOLD, cx - 15, 43, 30, 1); px(c, '#06050c', cx - 14, 44, 28, 1);
      px(c, '#06050c', cx - 19, FY - 20, 38, 20); px(c, '#2a2640', cx - 18, FY - 19, 36, 19); px(c, '#3e3a5a', cx - 18, FY - 19, 36, 1);
      c.strokeStyle = GOLDD; c.strokeRect(cx - 13.5, FY - 14.5, 27, 10);
      px(c, GOLDD, cx - 16, FY - 25, 32, 5); px(c, GOLD, cx - 16, FY - 25, 32, 1); px(c, GOLDM, cx - 16, FY - 24, 32, 2);
      // Applique à trois bougies.
      pool(c, cx, 106, 62, '255,160,70', 0.24);
      for (const s of [-1, 0, 1]) {
        const bx = cx + s * 15, by = 118 - Math.abs(s) * 3;
        beam(c, GOLDD, cx, 124, bx, by + 2, 2); beam(c, GOLD, cx, 123, bx, by + 1, 1);
        px(c, GOLD, bx - 3, by, 7, 2);
        px(c, '#efe6d0', bx - 1, by - 9, 3, 9); px(c, '#ff8a2a', bx, by - 13, 1, 4); px(c, GOLDL, bx, by - 11, 1, 2);
      }
      ell(c, GOLD, cx, 124, 4, 4); ell(c, GOLDM, cx, 124, 2, 2);
    }
  });
  // Décor au sol (repère monde) : cheminée, torchères, porte de l'escalier encadrée d'or dans le même mur.
  canvasTex(scene, 'din_props', WW, H, (c) => {
    c.imageSmoothingEnabled = false;
    paintStairs(c);
    const { x: sx, hw, base } = STAIRS, x0 = sx - hw - 22, wall = document.createElement('canvas');
    wall.width = WW - x0; wall.height = FY;
    const k = wall.getContext('2d')!;
    k.translate(-x0, 0); paintWall(k, x0, WW);
    k.fillStyle = '#0e0916'; k.fillRect(x0, 0, WW - x0, WT - 8);
    for (let y = 100; y < FY; y++) for (let x = sx - hw - 8; x <= sx + hw + 8; x++) if (inArch(x, y, sx, base, hw + 6)) k.clearRect(x, y, 1, 1);
    c.drawImage(wall, x0, 0);
    for (let y = 100; y < FY; y++) for (let x = sx - hw - 8; x <= sx + hw + 8; x++)
      if (inArch(x, y, sx, base, hw + 6) && !inArch(x, y, sx, base, hw)) px(c, Math.floor((x + y) / 5) % 2 ? GOLDM : GOLDD, x, y);
    const kt = base - Math.round(Math.sqrt(3) * hw);
    px(c, GOLD, sx - 4, kt - 7, 8, 9); px(c, GOLDL, sx - 3, kt - 6, 6, 1);
    pilaster(c, x0 + 2, 5);
    fireplace(c, DINING.fire, src);
    for (const x of DINING.torcheres) torchere(c, x);
  });
  // Premier plan : lambrequins de velours à franges d'or qui encadrent le haut de l'écran.
  canvasTex(scene, 'din3', w3, H, (c) => {
    for (let x = 0; x < w3; x++) {
      const t = (x % 118) / 118, h = 3 + Math.round(9 * Math.sin(t * Math.PI));
      px(c, x % 7 < 2 ? '#1a0e28' : '#120a1e', x, 0, 1, h); px(c, '#4a3216', x, h, 1, 1); if (x % 2) px(c, '#4a3216', x, h + 1, 1, 1);
    }
    for (let x = 0; x < w3; x += 118) { px(c, '#06050c', x - 3, 0, 7, 5); px(c, '#4a3216', x - 2, 2, 5, 3); for (let d = -2; d <= 2; d++) px(c, '#4a3216', x + d, 5, 1, 7 - Math.abs(d)); }
  });
  canvasTex(scene, 'din_lustre', 120, 62, lustre);
  // Sol de marbre en damier, à filets d'or ; tapis royal.
  canvasTex(scene, 'din_floor', 48, H - FY, (c) => {
    const rows = [[0, 8], [8, 12], [20, 16]];
    rows.forEach(([y, h], r) => { for (let i = 0; i < 4; i++) {
      const light = (i + r) % 2 === 0;
      px(c, light ? '#4a4460' : '#1e1a2c', i * 12, y, 12, h);
      if (light) { px(c, '#5a5470', i * 12, y, 12, 1); beam(c, '#3a3450', i * 12 + 2, y + 2, i * 12 + 9, y + h - 2, 1); }
      else { px(c, '#2c2640', i * 12, y, 12, 1); }
    } });
    px(c, GOLDM, 0, 0, 48, 1); px(c, '#06050c', 0, 1, 48, 1);
  });
  canvasTex(scene, 'din_rug', 860, 19, (c) => {
    const w = 860, h = 19;
    px(c, '#06050c', 3, 0, w - 6, h); px(c, VELD, 4, 1, w - 8, h - 2);
    px(c, GOLDM, 4, 2, w - 8, 1); px(c, GOLDM, 4, h - 3, w - 8, 1); px(c, GOLDD, 4, 4, w - 8, 1); px(c, GOLDD, 4, h - 5, w - 8, 1);
    for (let x = 16; x < w - 12; x += 24) {
      poly(c, GOLDD, [x, 6, x + 6, 9.5, x, 13, x - 6, 9.5]); poly(c, VEL, [x, 7.5, x + 3.5, 9.5, x, 11.5, x - 3.5, 9.5]); px(c, GOLD, x, 9, 1, 1);
    }
    for (let y = 1; y < h - 1; y += 2) { px(c, GOLDM, 0, y, 4, 1); px(c, GOLDM, w - 4, y, 4, 1); }
  });
  // Foyer : 3 images de flammes.
  for (let f = 0; f < 3; f++) canvasTex(scene, 'din_fire' + f, 50, 36, (c) => {
    for (let x = 2; x < 48; x++) {
      const e = 1 - Math.abs(x - 25) / 24, a = Math.sin(x * 0.55 + f * 2.1) * 0.5 + 0.5, b = Math.sin(x * 1.3 - f * 1.7) * 0.5 + 0.5, hh = Math.round(e * (10 + a * 18 + b * 7));
      px(c, '#c85a14', x, 36 - hh, 1, hh); px(c, '#ff8a2a', x, 36 - Math.round(hh * 0.75), 1, Math.round(hh * 0.75));
      px(c, '#ffb050', x, 36 - Math.round(hh * 0.48), 1, Math.round(hh * 0.48)); px(c, '#ffe6a8', x, 36 - Math.round(hh * 0.22), 1, Math.round(hh * 0.22));
    }
  });
  // La grande chaise, la table, le plat.
  canvasTex(scene, 'din_kingchair', 104, 190, kingChair, OUTLINE);
  canvasTex(scene, 'din_chair', 26, 64, (c) => {
    px(c, WALD, 2, 4, 22, 60); px(c, WAL, 4, 6, 18, 58); px(c, GOLDD, 6, 10, 14, 54); px(c, VEL, 7, 11, 12, 53); px(c, VELL, 7, 11, 12, 1);
    for (const [x, y] of [[10, 18], [16, 26], [10, 34]]) { px(c, VELL, x, y, 1, 1); }
    for (const x of [3, 23]) { ell(c, GOLDM, x, 3, 2.5, 2.5); px(c, GOLD, x - 1, 2, 1, 1); }
    px(c, WALL, 4, 4, 18, 1);
  }, OUTLINE);
  canvasTex(scene, 'din_longtable', TABLE_X1 - TABLE_X0, TOP_ROOM + TABLE_H + 1, (c) => longTable(c, src));
  canvasTex(scene, 'din_heap', 112, 76, (c) => heap(c, src));
}
