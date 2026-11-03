import Phaser from 'phaser';
import { W, H } from '../config';
import { canvasTex } from './pixel';
import { makeLogo } from './logo';
import { hash } from './room';

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

/** Lune de l'écran titre (la cathédrale est à droite, le menu à gauche). */
export const TITLE_MOON = [414, 60];

export function makeTitleArt(scene: Phaser.Scene) {
  makeLogo(scene);
  canvasTex(scene, 'bg_title', W, H, (c) => {
    // Ciel tramé + étoiles.
    for (let y = 0; y < H; y++) {
      const t = Math.min(1, y / 200), d = ((y >> 1) % 2) * 0.6;
      c.fillStyle = `rgb(${26 - 12 * t + d | 0},${22 - 10 * t + d | 0},${48 - 24 * t + d | 0})`;
      c.fillRect(0, y, W, 1);
    }
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(hash(i, 1) * W), y = Math.floor(hash(i, 2) * 170);
      px(c, hash(i, 3) < 0.2 ? '#d8fbff' : '#5a5f88', x, y);
    }
    // Lune et cratères.
    const [mx, my] = TITLE_MOON, mr = 32;
    for (let y = -mr; y <= mr; y++)
      for (let x = -mr; x <= mr; x++) {
        const d = Math.hypot(x, y);
        if (d > mr) continue;
        const shade = Math.hypot(x + 10, y + 8) > mr + 4;
        px(c, d > mr - 1.5 ? '#a8b8e0' : shade ? '#b8c6ea' : '#e2ecff', mx + x, my + y);
      }
    for (const [cx, cy, r] of [[-10, -6, 6], [8, 10, 4], [12, -12, 3], [-4, 14, 3], [16, 2, 2]])
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (Math.hypot(x, y) <= r) px(c, Math.hypot(x - 1, y - 1) <= r - 1 ? '#c2cfee' : '#9aaad6', mx + cx + x, my + cy + y);
    // Cathédrale en silhouette, fenêtres de braise.
    const sil = '#0d0b18';
    c.save(); c.translate(100, 0);
    px(c, sil, 130, 170, 220, 100);
    const towers: number[][] = [[140, 120, 34, 86], [306, 120, 34, 86], [214, 96, 52, 40]];
    for (const [x, y, w, sp] of towers) {
      px(c, sil, x, y, w, 200);
      for (let i = 0; i < w / 2; i++) { const k = Math.round((sp * i) / (w / 2)); px(c, sil, x + i, y - k, w - 2 * i, k + 1); }
    }
    px(c, sil, 239, 42, 2, 14); px(c, sil, 236, 46, 8, 2); // croix
    const lit = (x: number, y: number, w: number, h: number) => {
      px(c, '#ff8a2a', x, y, w, h); px(c, '#ffd36a', x + 1, y + 2, w - 2, h - 3);
      px(c, sil, x, y, 1, 1); px(c, sil, x + w - 1, y, 1, 1);
    };
    for (const x of [150, 162, 316, 328]) lit(x, 150, 4, 10);
    for (const x of [176, 196, 280, 300]) lit(x, 196, 5, 14);
    // Rosace centrale.
    for (let y = -11; y <= 11; y++)
      for (let x = -11; x <= 11; x++) {
        const d = Math.hypot(x, y), a = Math.atan2(y, x);
        if (d > 11) continue;
        px(c, d > 10 || Math.abs(Math.sin(a * 4)) < 0.2 || d < 2 ? sil : d < 5 ? '#ffd36a' : '#ff8a2a', 240 + x, 205 + y);
      }
    c.restore();
    // Colline, tombes et citrouilles au premier plan.
    for (let x = 0; x < W; x++) {
      const y = 228 + Math.round(Math.sin(x / 40) * 6 + Math.sin(x / 13) * 2);
      px(c, '#06050c', x, y, 1, H - y);
    }
    for (const [x, kind] of [[30, 0], [70, 1], [100, 0], [390, 1], [420, 0], [452, 1]]) {
      const y = 226 + Math.round(Math.sin(x / 40) * 6);
      if (kind) { px(c, '#06050c', x - 1, y - 14, 3, 14); px(c, '#06050c', x - 5, y - 10, 11, 3); }
      else { px(c, '#06050c', x - 5, y - 12, 10, 12); px(c, '#06050c', x - 4, y - 14, 8, 2); }
    }
    for (const x of [50, 432]) {
      const y = 228 + Math.round(Math.sin(x / 40) * 6) - 8;
      for (let yy = 0; yy < 9; yy++)
        for (let xx = -6; xx <= 6; xx++)
          if ((xx / 6.5) ** 2 + ((yy - 4) / 4.5) ** 2 <= 1) px(c, Math.abs(xx) % 3 === 0 ? '#9a3f12' : '#d9661c', x + xx, y + yy);
      px(c, '#4c5a2a', x, y - 2, 2, 2);
      px(c, '#ffd36a', x - 3, y + 3, 2, 1); px(c, '#ffd36a', x + 2, y + 3, 2, 1); px(c, '#ffd36a', x - 3, y + 6, 7, 1);
    }
  });
  // Nuages : amas de bosses, bord supérieur éclairé par la lune, bas tramé.
  for (const [k, rx] of [['cloud0', 60], ['cloud1', 44]] as [string, number][])
    canvasTex(scene, k, rx * 2 + 2, 18, (c) => {
      const blobs = [[0, 12, rx, 3], [-rx * 0.45, 9, rx * 0.45, 5], [rx * 0.05, 7, rx * 0.4, 7], [rx * 0.5, 10, rx * 0.35, 4]];
      const inside = (x: number, y: number) => blobs.some(([bx, by, brx, bry]) => ((x - bx) / brx) ** 2 + ((y - by) / bry) ** 2 <= 1);
      for (let y = 0; y < 18; y++)
        for (let x = -rx; x <= rx; x++) {
          if (!inside(x, y)) continue;
          if (y > 12 && (x + y) % 2) continue; // bas effiloché
          px(c, !inside(x, y - 2) ? '#4a4878' : !inside(x, y - 4) ? '#2e2a52' : '#1e1a38', rx + 1 + x, y);
        }
    });
}
