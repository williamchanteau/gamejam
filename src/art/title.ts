import Phaser from 'phaser';
import { W, H } from '../config';
import { canvasTex, addOutline } from './pixel';
import { G } from './font';
import { hash } from './room';

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

/** Logo : police 3×5 agrandie, dégradé cendre/lune, biseau, braise dessous. */
function makeLogo(scene: Phaser.Scene, key: string, text: string, S: number) {
  const cols = text.length * 4 - 1, w = cols * S + 4, h = 5 * S + 6;
  const on = (gx: number, gy: number) => {
    const ch = Math.floor(gx / 4), b = gx % 4;
    if (gx < 0 || gy < 0 || gy > 4 || ch >= text.length || b === 3) return false;
    return (+G[text[ch]][gy] & (4 >> b)) > 0;
  };
  const grad = ['#ffffff', '#ece6ff', '#cfcdf2', '#aeb0e0', '#8a8ec8', '#6a6eaa'];
  canvasTex(scene, key, w, h, (c) => {
    for (let gy = 0; gy < 5; gy++)
      for (let gx = 0; gx < cols; gx++) {
        if (!on(gx, gy)) continue;
        const x0 = 2 + gx * S, y0 = 2 + gy * S;
        for (let y = 0; y < S; y++) {
          const t = (gy * S + y) / (5 * S);
          px(c, grad[Math.min(grad.length - 1, Math.floor(t * grad.length))], x0, y0 + y, S, 1);
        }
        if (!on(gx, gy - 1)) px(c, '#ffffff', x0, y0, S, 1);
        if (!on(gx - 1, gy)) px(c, '#e0dcff', x0, y0, 1, S);
        if (!on(gx + 1, gy)) px(c, '#4a4f88', x0 + S - 1, y0, 1, S);
        if (!on(gx, gy + 1)) { px(c, '#3a3f78', x0, y0 + S - 1, S, 1); px(c, '#ff8a2a', x0, y0 + S, S, 1); px(c, '#9a3f12', x0, y0 + S + 1, S, 1); }
      }
    addOutline(c, w, h, '#06050c');
  });
}

export function makeTitleArt(scene: Phaser.Scene) {
  makeLogo(scene, 'logo', 'ASHENBORN', 6);
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
    const mx = 372, my = 66, mr = 32;
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
    // Nuages sombres devant la lune.
    for (const [cx, cy, rx] of [[330, 82, 60], [410, 92, 48], [120, 60, 70], [60, 100, 50]])
      for (let y = -6; y <= 6; y++)
        for (let x = -rx; x <= rx; x++)
          if ((x / rx) ** 2 + (y / 6) ** 2 <= 1) px(c, y < -3 ? '#2e2a4e' : '#1e1a36', cx + x, cy + y);
    // Chauves-souris.
    for (const [bx, by] of [[300, 40], [318, 52], [420, 30], [250, 70]]) {
      px(c, '#06050c', bx - 3, by - 1, 2, 1); px(c, '#06050c', bx - 1, by, 3, 1); px(c, '#06050c', bx + 2, by - 1, 2, 1);
    }
    // Cathédrale en silhouette, fenêtres de braise.
    const sil = '#0d0b18';
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
}
