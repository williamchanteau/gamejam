import Phaser from 'phaser';
import { W, H, ARENA } from '../config';
import { canvasTex, mapTex } from './pixel';
import { hash, stoneBlocks, stainedWindow, column, inArch } from './room';

/** Largeur des couches de parallaxe (marge de 60 px de chaque côté). */
export const LW = W + 120;
const FY = ARENA.floorY;
type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

/** Coordonnées des éléments animés, en repère couche (x de 0 à LW). */
export const NAVE = {
  torches: [230, 370],
  candles: [[52, FY - 12], [88, FY - 12], [512, FY - 12], [548, FY - 12], [214, FY - 12], [386, FY - 12]],
  pumpkins: [[120, FY - 1], [480, FY - 1]],
  lanterns: [[130, 74], [478, 58]],
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
  // Couche 0 : mur du fond, arcades lointaines, fenêtres hautes.
  canvasTex(scene, 'nave0', LW, H, (c) => {
    for (let y = 0; y < H; y++) {
      const t = y / H, d = (y % 2) * 0.5;
      c.fillStyle = `rgb(${26 - 15 * t + d | 0},${22 - 12 * t + d | 0},${48 - 28 * t + d | 0})`;
      c.fillRect(0, y, LW, 1);
    }
    c.globalAlpha = 0.3;
    stoneBlocks(c, LW, H, 28, 14, ['#0b0a14', '#141226', '#191730', '#221f3c', ''], 11);
    c.globalAlpha = 1;
    for (let ax = 40; ax < LW; ax += 80) {
      for (let y = 96; y < FY; y++)
        for (let x = ax - 30; x <= ax + 30; x++)
          if (inArch(x, y, ax, 130, 24)) px(c, y > FY - 30 ? '#0c0a18' : '#0e0c1c', x, y);
          else if (inArch(x, y, ax, 130, 27)) px(c, '#1d1a33', x, y);
      stainedWindow(c, ax, 20, 66, 7, ['#101830', '#14204a', '#1c2c55', '#223563', '#2a3a70', '#35558f']);
    }
    for (let x = 0; x < LW; x++) { // nervures de voûte
      const k = (x % 80) / 80, y = Math.round(10 * Math.sin(k * Math.PI));
      px(c, '#262243', x, y + 2, 1, 2);
    }
  });
  // Couche 1 : grands vitraux bleus + rosace + rayons de lune.
  canvasTex(scene, 'nave1', LW, H, (c) => {
    for (const cx of [150, 450]) stainedWindow(c, cx, 40, 186, 26, glass);
    rose(c, LW / 2, 74, 38, glass);
    for (let y = 124; y < FY; y++) // porte en ogive sous la rosace
      for (let x = LW / 2 - 30; x <= LW / 2 + 30; x++)
        if (inArch(x, y, LW / 2, 156, 24)) px(c, (x - LW / 2 + 24) % 8 === 0 ? '#0a0812' : '#120f1e', x, y);
        else if (inArch(x, y, LW / 2, 156, 28)) px(c, x < LW / 2 ? '#2a2744' : '#3a3858', x, y);
    c.fillStyle = 'rgba(127,170,255,0.06)';
    for (const [cx, w] of [[150, 20], [450, 20], [LW / 2, 30]]) {
      c.beginPath(); c.moveTo(cx - w, 70); c.lineTo(cx + w, 70); c.lineTo(cx + w + 70, FY); c.lineTo(cx - w + 10, FY); c.fill();
    }
    for (let y = FY - 44; y < FY; y++) { c.fillStyle = `rgba(60,70,110,${((y - FY + 44) / 44) * 0.2})`; c.fillRect(0, y, LW, 1); }
  });
  // Couche 2 : colonnes, arcs, bannières, bougies, citrouilles, toiles.
  canvasTex(scene, 'nave2', LW, H, (c) => {
    const cols = [70, 230, 370, 530];
    for (let i = 0; i < cols.length - 1; i++) { // arcs entre colonnes
      const a = cols[i], b = cols[i + 1], mid = (a + b) / 2, hw = (b - a) / 2;
      for (let x = a; x <= b; x++) {
        const k = Math.abs(x - mid) / hw, y = Math.round(4 + 26 * (1 - Math.sqrt(1 - Math.min(1, k * k))) ** 0.8);
        px(c, '#2e2b45', x, y, 1, 4); px(c, '#45425e', x, y, 1, 1); px(c, '#14121f', x, y + 4, 1, 1);
      }
    }
    for (const cx of cols) column(c, cx, 0, FY, 12);
    for (const cx of [230, 370]) { // bannières en lambeaux
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
    for (const [x, y] of NAVE.candles) { px(c, '#2e2b45', x - 6, y, 14, 3); px(c, '#45425e', x - 6, y, 14, 1); candle(c, x - 4, y, 7); candle(c, x, y, 10); candle(c, x + 4, y, 5); }
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
    c.fillStyle = 'rgba(200,207,232,0.22)'; // toiles aux arcs
    for (const [sx, dir] of [[82, 1], [218, -1], [382, 1], [518, -1]]) {
      for (let i = 0; i < 4; i++) for (let k = 0; k < 22; k++) c.fillRect(Math.round(sx + dir * k * Math.cos(i * 0.45)), Math.round(14 + k * Math.sin(i * 0.45 + 0.1)), 1, 1);
      for (const r of [7, 13, 19]) for (let a = 0; a < 1.5; a += 0.09) c.fillRect(Math.round(sx + dir * r * Math.cos(a)), Math.round(14 + r * Math.sin(a) * 0.9), 1, 1);
    }
  });
  // Couche 3 (premier plan) : chaînes + lanternes suspendues, coins sombres.
  canvasTex(scene, 'nave3', LW, H, (c) => {
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
