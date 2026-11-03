import Phaser from 'phaser';
import { W, H, ARENA } from '../config';
import { canvasTex } from './pixel';

type Ctx = CanvasRenderingContext2D;
/** Bruit déterministe 0..1. */
export const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

/** Pierre taillée : blocs avec biseau clair/sombre, mouchetures et fissures. */
export function stoneBlocks(c: Ctx, w: number, h: number, bw: number, bh: number, pal: string[], seed = 0) {
  const [mortar, dark, base, light, lip] = pal;
  px(c, mortar, 0, 0, w, h);
  for (let row = 0; row * bh < h; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let bx = -bw; bx < w + bw; bx += bw) {
      const x0 = bx + off, y0 = row * bh, v = hash(x0 + seed, y0);
      px(c, v < 0.25 ? dark : base, x0 + 1, y0 + 1, bw - 1, bh - 1);
      px(c, light, x0 + 1, y0 + 1, bw - 2, 1);
      px(c, light, x0 + 1, y0 + 1, 1, bh - 2);
      px(c, dark, x0 + 1, y0 + bh - 1, bw - 1, 1);
      px(c, dark, x0 + bw - 1, y0 + 1, 1, bh - 1);
      for (let i = 0; i < 4; i++) {
        const sx = x0 + 2 + Math.floor(hash(x0 + i, y0 + seed) * (bw - 4)), sy = y0 + 2 + Math.floor(hash(y0 + i, x0) * (bh - 4));
        px(c, hash(sx, sy) < 0.5 ? dark : light, sx, sy);
      }
      if (v > 0.8) { // fissure
        let fx = x0 + 3 + Math.floor(v * 10) % (bw - 6), fy = y0 + 2;
        for (; fy < y0 + bh - 2; fy++) { px(c, mortar, fx, fy); if (hash(fx, fy) > 0.6) fx++; }
      }
    }
  }
  if (lip) px(c, lip, 0, 0, w, 1);
}

/** Arc brisé (gothique) : vrai si (x, y) est dans la fenêtre. */
const inArch = (x: number, y: number, cx: number, yb: number, hw: number) =>
  Math.abs(x - cx) <= hw && (y >= yb || (Math.hypot(x - (cx + hw), y - yb) <= 2 * hw && Math.hypot(x - (cx - hw), y - yb) <= 2 * hw));

/** Vitrail : verre en losanges plombés, rosace en haut. */
export function stainedWindow(c: Ctx, cx: number, top: number, bottom: number, hw: number, glass: string[]) {
  const yb = top + Math.round(Math.sqrt(3) * hw);
  for (let y = top - 4; y <= bottom + 3; y++)
    for (let x = cx - hw - 4; x <= cx + hw + 4; x++) {
      if (inArch(x, y, cx, yb, hw)) {
        const lead = (x - cx) % 8 === 0 || (y - top) % 10 === 0 || ((x - cx) + (y - top)) % 16 === 0;
        const cell = hash(Math.floor((x - cx + 64) / 8), Math.floor((y - top) / 10) + Math.floor((x - cx + y) / 16));
        const lightK = 1 - (y - top) / (bottom - top);
        const i = Math.min(glass.length - 1, Math.floor(cell * (glass.length - 1) + lightK * 1.2));
        px(c, lead ? '#0d0b18' : glass[i], x, y);
      } else if (inArch(x, y, cx, yb, hw + 3) && y <= bottom) px(c, x < cx ? '#2a2744' : '#3a3858', x, y);
    }
  // Rosace sous la pointe.
  const ry = yb - 4;
  for (let y = -7; y <= 7; y++)
    for (let x = -7; x <= 7; x++) {
      const d = Math.hypot(x, y);
      if (d > 7) continue;
      const a = Math.atan2(y, x);
      px(c, d > 6 || d < 1.5 || Math.abs(Math.sin(a * 3)) < 0.18 ? '#0d0b18' : d < 4 ? glass[glass.length - 1] : glass[2], cx + x, ry + y);
    }
  px(c, '#0d0b18', cx - 1, yb + 4, 2, bottom - yb - 4); // meneau
  px(c, '#4a4868', cx - hw - 4, bottom + 1, hw * 2 + 8, 2); // appui
  px(c, '#24223a', cx - hw - 4, bottom + 3, hw * 2 + 8, 1);
}

/** Colonne : fût cannelé + chapiteau + base. */
export function column(c: Ctx, cx: number, top: number, bottom: number, hw: number) {
  for (let x = -hw; x < hw; x++) {
    const u = (x + hw) / (2 * hw);
    px(c, u < 0.2 ? '#14121f' : u < 0.45 ? '#1f1c30' : u < 0.75 ? '#2a273f' : u < 0.9 ? '#363350' : '#1a1828', cx + x, top, 1, bottom - top);
    if ((x + hw) % 5 === 0) px(c, '#121020', cx + x, top + 8, 1, bottom - top - 16);
  }
  for (const [y, w2] of [[top, hw + 4], [top + 4, hw + 2], [bottom - 6, hw + 2], [bottom - 3, hw + 4]]) {
    px(c, '#2e2b45', cx - w2, y, w2 * 2, 3);
    px(c, '#45425e', cx - w2, y, w2 * 2, 1);
  }
}

function drawDummy(c: Ctx) {
  // Poteau + socle.
  px(c, '#3e2c22', 11, 20, 4, 20); px(c, '#5a4030', 12, 20, 2, 20); px(c, '#7a5a40', 12, 20, 1, 20);
  px(c, '#3e2c22', 7, 38, 12, 3); px(c, '#5a4030', 8, 38, 10, 1);
  // Traverse + manches en toile.
  px(c, '#3e2c22', 1, 17, 24, 3); px(c, '#5a4030', 1, 17, 24, 1);
  for (const sx of [1, 20]) { px(c, '#6a5a40', sx, 18, 5, 4); px(c, '#8a7a5a', sx, 18, 5, 1); }
  for (const [x, y] of [[0, 22], [2, 23], [4, 22], [21, 22], [23, 23], [25, 22]]) px(c, '#d8c070', x, y, 1, 2);
  // Sac de jute, coutures, corde.
  for (let y = 15; y < 32; y++) {
    const hw = y < 18 ? 6 : y > 28 ? 5 : 7;
    for (let x = 13 - hw; x < 13 + hw; x++) {
      const u = (x - 13 + hw) / (2 * hw);
      px(c, u < 0.25 ? '#6a5a40' : (x + y) % 4 === 0 ? '#7a6a4a' : u > 0.8 ? '#a8987a' : '#8a7a5a', x, y);
    }
  }
  for (let y = 17; y < 30; y += 3) px(c, '#4a3a28', 12, y, 1, 2);
  px(c, '#b09060', 6, 25, 14, 1); px(c, '#7a6040', 6, 26, 14, 1);
  for (const [x, y] of [[8, 32], [10, 33], [15, 32], [17, 33], [13, 33]]) px(c, '#d8c070', x, y, 1, 2);
  // Citrouille sculptée.
  for (let y = 1; y < 16; y++)
    for (let x = 3; x < 23; x++) {
      const dx = (x + 0.5 - 13) / 10, dy = (y + 0.5 - 9) / 7;
      if (dx * dx + dy * dy > 1) continue;
      const rib = Math.abs(((x - 13) / 10) * 3.2) % 1;
      let col = rib < 0.15 ? '#9a3f12' : '#d9661c';
      if (dx < -0.2 && dy < 0 && rib >= 0.15) col = '#f08a2a';
      if (dx * dx + dy * dy > 0.8) col = dy < 0 && dx < 0 ? '#c05515' : '#8a3510';
      px(c, col, x, y);
    }
  px(c, '#4c5a2a', 12, 0, 2, 3); px(c, '#6a7a3a', 12, 0, 1, 2);
  // Visage : yeux triangulaires + bouche dentelée, lueur.
  for (const ex of [8, 15]) { px(c, '#ffd36a', ex, 7, 4, 1); px(c, '#ffd36a', ex + 1, 6, 2, 1); px(c, '#fff0b0', ex + 1, 7, 2, 1); px(c, '#ffd36a', ex + 1, 8, 2, 1); }
  px(c, '#ffd36a', 7, 11, 13, 2);
  for (let x = 8; x < 19; x += 3) px(c, '#9a3f12', x, 11, 1, 1);
  for (let x = 9; x < 19; x += 3) px(c, '#9a3f12', x, 12, 1, 1);
  px(c, '#fff0b0', 9, 12, 8, 1);
}

function drawTorch(c: Ctx, f: number) {
  // Applique en fer.
  px(c, '#2a2838', 2, 12, 6, 2); px(c, '#4a4860', 2, 12, 6, 1); px(c, '#2a2838', 4, 14, 2, 5); px(c, '#3a3850', 1, 10, 8, 2);
  // Flamme (2 frames).
  const fl = f ? ['..o..', '.oOo.', '.OyO.', 'oOyOo', '.OyO.'] : ['.o...', '..Oo.', '.OyOo', 'oOyyO', '.OyO.'];
  const pal: Record<string, string> = { o: '#c0441a', O: '#ff8a2a', y: '#ffe08a' };
  fl.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) px(c, pal[ch], 2 + x, 5 + y); }));
}

export function makeRoomArt(scene: Phaser.Scene) {
  const fh = H - ARENA.floorY;
  canvasTex(scene, 'floor', 48, fh, (c) => {
    stoneBlocks(c, 48, fh, 24, 12, ['#1a1d2e', '#2a2f48', '#343a55', '#454c6c', '#6b7598'], 7);
    px(c, '#525a7c', 0, 1, 48, 1);
    for (let y = 18; y < fh; y++) { c.fillStyle = `rgba(6,5,12,${(y - 18) / (fh - 18) * 0.6})`; c.fillRect(0, y, 48, 1); }
  });
  for (const p of ARENA.platforms) {
    canvasTex(scene, 'plat' + p.w, p.w, 8, (c) => {
      stoneBlocks(c, p.w, 8, 14, 8, ['#1f2236', '#2c3150', '#3d4463', '#545c80', '#7a86ac'], p.x);
      px(c, '#1f2236', 0, 7, p.w, 1);
    });
  }
  canvasTex(scene, 'dummy', 28, 43, (c) => { c.translate(1, 1); drawDummy(c); }, '#06050c');
  for (const f of [0, 1]) canvasTex(scene, 'torch' + f, 10, 20, (c) => drawTorch(c, f), '#06050c');

  // Fond de la salle d'entraînement.
  canvasTex(scene, 'bg_test', W, H, (c) => {
    for (let y = 0; y < H; y++) {
      const t = y / H, d = (y % 2) * 0.5;
      c.fillStyle = `rgb(${26 - 15 * t + d | 0},${22 - 12 * t + d | 0},${48 - 28 * t + d | 0})`;
      c.fillRect(0, y, W, 1);
    }
    // Mur de pierre très sombre.
    c.globalAlpha = 0.35;
    stoneBlocks(c, W, H, 32, 16, ['#0b0a14', '#141226', '#191730', '#211e3a', ''], 3);
    c.globalAlpha = 1;
    const glass = ['#14204a', '#1c2c55', '#223563', '#2a4580', '#35558f', '#5a7ec0'];
    for (const cx of [96, 240, 384]) stainedWindow(c, cx, 44, 176, 22, glass);
    for (const cx of [24, 168, 312, 456]) column(c, cx, 20, ARENA.floorY, 10);
    // Faisceaux de lune depuis les vitraux.
    c.fillStyle = 'rgba(127,170,255,0.05)';
    for (const cx of [96, 240, 384]) {
      c.beginPath(); c.moveTo(cx - 18, 70); c.lineTo(cx + 18, 70); c.lineTo(cx + 70, ARENA.floorY); c.lineTo(cx + 10, ARENA.floorY); c.fill();
    }
    // Brume au sol.
    for (let y = ARENA.floorY - 40; y < ARENA.floorY; y++) {
      c.fillStyle = `rgba(60,70,110,${((y - ARENA.floorY + 40) / 40) * 0.18})`; c.fillRect(0, y, W, 1);
    }
    // Toiles d'araignée aux coins.
    c.fillStyle = 'rgba(200,207,232,0.25)';
    for (const [sx, dir] of [[0, 1], [W - 1, -1]]) {
      for (let i = 0; i < 4; i++) for (let k = 0; k < 26; k++) c.fillRect(Math.round(sx + dir * k * Math.cos(i * 0.45)), Math.round(k * Math.sin(i * 0.45 + 0.1)), 1, 1);
      for (const r of [8, 15, 22]) for (let a = 0; a < 1.5; a += 0.08) c.fillRect(Math.round(sx + dir * r * Math.cos(a)), Math.round(r * Math.sin(a) * 0.9), 1, 1);
    }
  });
}
