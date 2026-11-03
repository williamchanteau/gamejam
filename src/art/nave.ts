import Phaser from 'phaser';
import { W, H, ARENA } from '../config';
import { canvasTex, mapTex } from './pixel';
import { hash, stoneBlocks, stainedWindow, column, inArch } from './room';
import { paintStairs, pool } from './outside';

const FY = ARENA.floorY, WW = ARENA.bossW;
/** Facteurs de parallaxe des couches (0 = fond, 3 = premier plan) ; les accessoires au sol sont à 1. */
export const NAVE_F = [0.3, 0.55, 0.8, 1, 1.2];
/** Largeur nécessaire d'une couche de facteur f pour couvrir toute l'arène. */
export const layerW = (f: number) => Math.ceil(W + f * (WW - W)) + 8;
type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

/** Piliers isolés de la couche 2 (devant le mur). */
const COLS = (w: number) => { const r: number[] = []; for (let x = 70; x < w; x += 290) r.push(x); return r; };
/** Coordonnées des éléments animés, en repère de leur couche. */
export const NAVE = {
  torches: COLS(layerW(0.8)), // couche 2, une torche par pilier
  candles: [60, 250, 470, 700, 852].map((x) => [x, FY - 2]), // accessoires (monde)
  pumpkins: [[140, FY - 1], [560, FY - 1], [830, FY - 1]],
  lanterns: [[130, 74], [478, 58], [860, 70]], // couche premier plan
};

/** Rosace : rayons + pétales + anneaux plombés. */
function rose(c: Ctx, cx: number, cy: number, r: number, glass: string[]) {
  for (let y = -r - 3; y <= r + 3; y++)
    for (let x = -r - 3; x <= r + 3; x++) {
      const d = Math.hypot(x, y), a = Math.atan2(y, x);
      if (d > r + 3) continue;
      if (d > r) { px(c, x < 0 ? '#2a2744' : '#3a3858', cx + x, cy + y); continue; }
      const petal = Math.abs(Math.sin(a * 6)), ring = Math.abs(d - r * 0.55) < 1 || Math.abs(d - r * 0.25) < 1;
      const lead = d > r - 1.5 || ring || (d > r * 0.25 && petal < 0.12) || (d > r * 0.55 && Math.abs(Math.sin(a * 12)) < 0.1);
      const i = Math.min(glass.length - 1, Math.floor(hash(Math.round(a * 6), Math.round(d / 6)) * 3 + (1 - d / r) * 3));
      px(c, lead ? '#0d0b18' : d < 4 ? '#a6fcff' : glass[i], cx + x, cy + y);
    }
}

function candle(c: Ctx, x: number, y: number, h: number) {
  px(c, '#d8d0b8', x, y - h, 2, h); px(c, '#f0ecd8', x, y - h, 1, h - 1); px(c, '#b8b098', x + 1, y - h + 2, 1, 2);
  px(c, '#ffd36a', x, y - h - 2, 1, 2); px(c, '#ff8a2a', x + 1, y - h - 1, 1, 1);
}

export function makeNaveArt(scene: Phaser.Scene) {
  const glass = ['#14204a', '#1c2c55', '#223563', '#2a4580', '#35558f', '#5a7ec0'];
  // Un seul édifice : couche 0 = voûte lointaine (visible au-dessus de la corniche), couche 1 = mur gouttereau
  // (travées régulières : pilastres + vitraux, rosace au centre), couche 2 = piliers isolés plus proches (ombrés).
  const w0 = layerW(NAVE_F[0]), w1 = layerW(NAVE_F[1]), w2 = layerW(NAVE_F[2]), w3 = layerW(NAVE_F[4]);
  const wallTop = 34;
  canvasTex(scene, 'nave0', w0, H, (c) => {
    px(c, '#0a0914', 0, 0, w0, H);
    for (let ax = 0; ax < w0 + 100; ax += 100) // nervures de voûte qui se croisent
      for (let x = -50; x <= 50; x++) {
        const y = Math.round(44 - 40 * Math.sqrt(1 - (x / 50) ** 2));
        px(c, '#1d1a33', ax + x, y, 1, 2); px(c, '#2a2744', ax + x, y, 1, 1);
      }
    for (let ax = 50; ax < w0; ax += 100) { px(c, '#2a2744', ax - 2, 3, 5, 4); px(c, '#3d4463', ax - 1, 4, 3, 2); } // clés de voûte
  });
  canvasTex(scene, 'nave1', w1, H, (c) => {
    const L = w1, mid = Math.round(L / 2), bay = 125;
    for (let y = wallTop; y < H; y++) {
      const t = (y - wallTop) / (H - wallTop), d = (y % 2) * 0.5;
      c.fillStyle = `rgb(${25 - 12 * t + d | 0},${22 - 10 * t + d | 0},${44 - 22 * t + d | 0})`;
      c.fillRect(0, y, L, 1);
    }
    c.save(); c.globalAlpha = 0.35; c.translate(0, wallTop);
    stoneBlocks(c, L, H - wallTop, 28, 14, ['#0b0a14', '#141226', '#191730', '#221f3c', ''], 11);
    c.restore();
    const pil: number[] = [];
    for (let x = mid - bay / 2 - bay * 3; x < L + bay; x += bay) pil.push(Math.round(x));
    // Formerets : arcs brisés entre pilastres, sous la corniche.
    for (let i = 0; i < pil.length - 1; i++) {
      const a = pil[i], b2 = pil[i + 1], m = (a + b2) / 2, hw = (b2 - a) / 2;
      for (let x = a; x <= b2; x++) {
        const k = Math.abs(x - m) / hw, y = Math.round(wallTop + 4 + 22 * (1 - Math.sqrt(1 - Math.min(1, k * k))) ** 0.8);
        px(c, '#2e2b45', x, y, 1, 3); px(c, '#45425e', x, y, 1, 1); px(c, '#14121f', x, y + 3, 1, 1);
      }
    }
    // Travées : un grand vitrail chacune, la rosace au centre au-dessus d'une arcature aveugle.
    for (let i = 0; i < pil.length - 1; i++) {
      const bx = Math.round((pil[i] + pil[i + 1]) / 2);
      if (Math.abs(bx - mid) < 3) {
        rose(c, bx, 104, 40, glass);
        for (const k of [-1, 0, 1]) {
          const ax = bx + k * 20;
          for (let y = 160; y < 196; y++) for (let x = ax - 8; x <= ax + 8; x++)
            if (inArch(x, y, ax, 172, 7)) px(c, '#100e1c', x, y); else if (inArch(x, y, ax, 172, 8)) px(c, '#2e2b45', x, y);
        }
        px(c, '#4a4868', bx - 36, 196, 72, 2);
      } else stainedWindow(c, bx, 66, 188, 20, glass);
    }
    // Rayons de lune qui tombent des vitraux.
    c.fillStyle = 'rgba(127,170,255,0.05)';
    for (let i = 0; i < pil.length - 1; i++) {
      const bx = (pil[i] + pil[i + 1]) / 2;
      c.beginPath(); c.moveTo(bx - 18, 100); c.lineTo(bx + 18, 100); c.lineTo(bx + 78, FY); c.lineTo(bx + 14, FY); c.fill();
    }
    for (const x of pil) column(c, x, wallTop, FY, 8); // pilastres engagés
    // Corniche, soubassement.
    px(c, '#06050c', 0, wallTop - 2, L, 2); px(c, '#3d3a58', 0, wallTop, L, 2); px(c, '#2a2744', 0, wallTop + 2, L, 3); px(c, '#14121f', 0, wallTop + 5, L, 1);
    for (let y = FY - 38; y < FY; y++) { c.fillStyle = `rgba(6,5,12,${((y - FY + 38) / 38) * 0.45})`; c.fillRect(0, y, L, 1); }
    px(c, '#2e2b45', 0, FY - 40, L, 2); px(c, '#45425e', 0, FY - 40, L, 1);
  });
  canvasTex(scene, 'nave2', w2, H, (c) => {
    const cols = COLS(w2);
    for (const cx of cols) {
      column(c, cx, 0, FY, 13);
      c.fillStyle = 'rgba(6,5,12,0.35)'; c.fillRect(cx - 13, 0, 26, FY); // plus proches, à contre-jour
    }
    for (const x of NAVE.torches) pool(c, x, 116, 64, '255,138,42', 0.2);
    for (const cx of cols) { // bannière en lambeaux accrochée au pilier
      for (let y = 30; y < 92; y++)
        for (let x = cx - 9; x < cx + 9; x++) {
          if (y > 84 && (x * 3 + y) % 4 < y - 84) continue;
          px(c, x === cx - 9 ? '#0e1630' : x > cx + 6 ? '#2a3d70' : '#1c2c55', x, y + Math.round(Math.sin(x * 0.5) * 0.6));
        }
      px(c, '#3d4463', cx - 11, 28, 22, 3);
      for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { // croissant pâle
        const d = Math.hypot(x, y), d2 = Math.hypot(x - 3, y - 1);
        if (d <= 6 && d2 > 5) px(c, '#9aa6c8', cx + x, 56 + y);
      }
    }
    c.fillStyle = 'rgba(200,207,232,0.2)'; // toiles entre pilier et voûte
    for (const [sx, dir] of cols.flatMap((x) => [[x + 13, 1], [x - 13, -1]])) {
      for (let i = 0; i < 4; i++) for (let k = 0; k < 22; k++) c.fillRect(Math.round(sx + dir * k * Math.cos(i * 0.45)), Math.round(4 + k * Math.sin(i * 0.45 + 0.1)), 1, 1);
      for (const r of [7, 13, 19]) for (let a = 0; a < 1.5; a += 0.09) c.fillRect(Math.round(sx + dir * r * Math.cos(a)), Math.round(4 + r * Math.sin(a) * 0.9), 1, 1);
    }
  });
  // Accessoires posés au sol (facteur 1, largeur du monde).
  canvasTex(scene, 'nave_props', WW, H, (c) => {
    paintStairs(c);
    for (const [x, y] of NAVE.candles) pool(c, x, y - 20, 34, '255,160,70', 0.2);
    for (const [x, y] of NAVE.pumpkins) pool(c, x, y - 6, 26, '255,138,42', 0.18);
    for (const [x, y] of NAVE.candles) { // chandelier de fer + 3 bougies
      px(c, '#1a1828', x - 1, y - 16, 2, 16); px(c, '#1a1828', x - 5, y - 1, 10, 1); px(c, '#2a2838', x - 8, y - 17, 17, 2); px(c, '#45425e', x - 8, y - 17, 17, 1);
      candle(c, x - 6, y - 17, 7); candle(c, x - 1, y - 17, 10); candle(c, x + 4, y - 17, 5);
    }
    for (const [x, y] of NAVE.pumpkins) {
      for (let yy = 0; yy < 12; yy++)
        for (let xx = -9; xx <= 9; xx++) {
          const dx = xx / 9.5, dy = (yy - 6) / 6;
          if (dx * dx + dy * dy > 1) continue;
          px(c, Math.abs(xx) % 4 === 1 ? '#9a3f12' : dx < -0.2 && dy < 0 ? '#f08a2a' : '#d9661c', x + xx, y - 12 + yy);
        }
      px(c, '#4c5a2a', x - 1, y - 15, 2, 3);
      px(c, '#ffd36a', x - 5, y - 9, 3, 2); px(c, '#ffd36a', x + 2, y - 9, 3, 2); px(c, '#ffd36a', x - 5, y - 5, 10, 2);
      px(c, '#fff0b0', x - 4, y - 8, 1, 1); px(c, '#fff0b0', x + 3, y - 8, 1, 1);
      for (let xx = -4; xx < 5; xx += 3) px(c, '#9a3f12', x + xx, y - 5, 1, 1);
    }
  });
  // Couche premier plan : chaînes + lanternes suspendues.
  canvasTex(scene, 'nave3', w3, H, (c) => {
    for (const [x, y] of NAVE.lanterns) {
      for (let yy = 0; yy < y - 8; yy += 4) { px(c, '#06050c', x - 1, yy, 3, 3); px(c, '#1a1828', x, yy + 1, 1, 1); }
      px(c, '#06050c', x - 5, y - 8, 11, 2); px(c, '#06050c', x - 4, y - 6, 9, 12); px(c, '#06050c', x - 5, y + 6, 11, 2);
      px(c, '#ff8a2a', x - 2, y - 4, 5, 8); px(c, '#ffd36a', x - 1, y - 2, 3, 4); px(c, '#06050c', x, y - 4, 1, 8);
    }
  });
  // Chauve-souris (2 frames) et vignette.
  mapTex(scene, 'bat0', ['x.......x', 'xx.x.x.xx', '.xxxxxxx.', '...xxx...'], { x: '#06050c' }, null);
  mapTex(scene, 'bat1', ['...x.x...', '..xxxxx..', '.xxxxxxx.', 'xx.....xx'], { x: '#06050c' }, null);
  canvasTex(scene, 'vignette', W, H, (c) => {
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(6,5,12,0)'); g.addColorStop(1, 'rgba(6,5,12,0.7)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
}
