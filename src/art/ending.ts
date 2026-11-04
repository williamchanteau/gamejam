import Phaser from 'phaser';
import { W, H } from '../config';
import { canvasTex, ell, poly } from './pixel';
import { hash } from './room';

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

type Pal = { far: string; farL: string; hill: string; hillL: string; hillD: string; near: string; nearL: string; tree: string; wall: string; wallL: string; wallD: string; roof: string; roofL: string; win: string; road: string };
const NIGHT: Pal = { far: '#1a1a3c', farL: '#24244c', hill: '#14142e', hillL: '#22224a', hillD: '#0e0e22', near: '#0a0a1c', nearL: '#14142c', tree: '#0a0a1a', wall: '#23213f', wallL: '#3a3760', wallD: '#16152c', roof: '#1a1836', roofL: '#2b2850', win: '#ffb050', road: '#20203c' };
const DAWN: Pal = { far: '#5a5490', farL: '#8a6e96', hill: '#3e3a62', hillL: '#b08a70', hillD: '#2c2a4c', near: '#252444', nearL: '#4a4058', tree: '#20203c', wall: '#6e6a8c', wallL: '#f0c088', wallD: '#443f68', roof: '#4a4078', roofL: '#c89a80', win: '#d89858', road: '#7a6a78' };
const DAY: Pal = { far: '#8aa8d0', farL: '#a8c0dc', hill: '#4e8a4a', hillL: '#7ab860', hillD: '#3a6a40', near: '#2e6a38', nearL: '#4a9a48', tree: '#1f5030', wall: '#a8a6c0', wallL: '#e6e4ee', wallD: '#76749a', roof: '#54409a', roofL: '#7a60c8', win: '#2a2c48', road: '#c8b890' };

/** Ciel en bandes tramées, du haut vers l'horizon. Rangée par rangée : coût réduit au boot. */
function sky(c: Ctx, cols: string[]) {
  const n = cols.length - 1, span = 215;
  for (let y = 0; y < H; y++) {
    const t = Math.min(0.999, y / span) * n, i = Math.floor(t), lv = Math.floor((t - i) * 4), a = cols[i], b = cols[i + 1];
    px(c, lv === 3 ? b : a, 0, y, W, 1);
    if (lv === 0) continue;
    const o = lv === 3 ? a : b, step = lv === 2 ? 2 : 4;
    if (lv !== 2 && y % 2) continue;
    for (let x = lv === 2 ? y % 2 : (y >> 1) % 2 * 2; x < W; x += step) px(c, o, x, y);
  }
}

/** Tour : corps ombré à gauche, éclairé à droite (le soleil se lève à droite) ; toit conique si `cone` > 0, sinon créneaux. */
function tower(c: Ctx, p: Pal, x: number, w: number, top: number, bottom: number, cone: number) {
  px(c, p.wall, x, top, w, bottom - top);
  px(c, p.wallD, x, top, Math.min(6, Math.max(2, w >> 2)), bottom - top);
  px(c, p.wallL, x + w - Math.min(3, Math.max(2, w >> 3)), top, Math.min(3, Math.max(2, w >> 3)), bottom - top);
  for (let y = top + 4; y < bottom; y += 7)
    for (let i = x + 2; i < x + w - 3; i += 8) if (hash(i, y) > 0.55) px(c, p.wallD, i + (y % 2) * 3, y, 3, 1);
  if (cone) {
    poly(c, p.roof, [x - 2, top, x + w / 2, top - cone, x + w + 2, top]);
    poly(c, p.roofL, [x + w / 2, top - cone, x + w + 2, top, x + w / 2 + 1, top]);
    px(c, p.wallD, x - 2, top, w + 4, 2);
  } else {
    for (let i = x; i < x + w; i += 4) px(c, p.wall, i, top - 3, 2, 3);
    px(c, p.wallD, x, top + 1, w, 1);
  }
}

const win = (c: Ctx, p: Pal, x: number, y: number) => { px(c, p.wallD, x - 1, y - 1, 4, 7); px(c, p.win, x, y, 2, 6); };

function castle(c: Ctx, p: Pal) {
  const B = 194;
  // Donjon et sa haute tour, derrière le rempart.
  tower(c, p, 238, 24, 66, B, 34);
  tower(c, p, 208, 22, 96, B, 26);
  tower(c, p, 270, 22, 102, B, 24);
  tower(c, p, 214, 72, 118, B, 0);
  for (const x of [226, 246, 266]) win(c, p, x, 130);
  for (const [x, y] of [[248, 80], [216, 106], [279, 112]]) win(c, p, x, y);
  // Rempart, tours d'angle, portes.
  tower(c, p, 168, 164, 158, B, 0);
  tower(c, p, 154, 26, 132, B, 30);
  tower(c, p, 320, 26, 136, B, 28);
  tower(c, p, 224, 16, 150, B, 0);
  tower(c, p, 260, 16, 150, B, 0);
  for (const [x, y] of [[166, 146], [332, 150], [230, 160], [266, 160], [190, 170], [302, 170]]) win(c, p, x, y);
  // Grande porte : arche sombre.
  poly(c, p.wallD, [239, B, 239, 176, 250, 168, 261, 176, 261, B]);
  poly(c, p.win === NIGHT.win ? '#3a2412' : '#2a2030', [241, B, 241, 178, 250, 171, 259, 178, 259, B]);
}

function pine(c: Ctx, col: string, x: number, base: number, h: number) {
  poly(c, col, [x - h * 0.28, base, x, base - h, x + h * 0.28, base]);
  poly(c, col, [x - h * 0.2, base - h * 0.35, x, base - h * 1.1, x + h * 0.2, base - h * 0.35]);
}

/** Paysage complet (ciel transparent) selon la palette : montagnes, colline, château, route, collines, sapins. */
function land(c: Ctx, p: Pal) {
  for (let x = 0; x < W; x++) {
    const y = Math.round(176 + Math.sin(x / 37) * 9 + Math.sin(x / 13 + 1) * 4 + Math.sin(x / 91) * 10);
    px(c, p.far, x, y, 1, H - y); px(c, p.farL, x, y, 1, 2);
  }
  const hillY = (x: number) => { const d = Math.abs(x - 250); return d < 92 ? 194 : Math.round(194 + (d - 92) * (d - 92) / 95); };
  castle(c, p);
  for (let x = 40; x < 460; x++) {
    const y = hillY(x);
    if (y >= H) continue;
    px(c, p.hill, x, y, 1, H - y); px(c, p.hillL, x, y, 1, x > 250 ? 2 : 1);
    for (let yy = y + 3; yy < H; yy += 4) if (hash(x, yy) > 0.86) px(c, p.hillD, x, yy, 2, 1);
  }
  for (let x = 0; x < W; x++) {
    const y = Math.round(234 + Math.sin(x / 50) * 6 + Math.sin(x / 17) * 2);
    px(c, p.hillD, x, y, 1, H - y); px(c, p.hillL, x, y, 1, 1);
  }
  // Route en lacets, de la porte vers le spectateur, par-dessus les collines.
  for (let y = 194; y < H; y++) {
    const t = (y - 194) / 76, x = 250 + Math.sin(t * 5.2) * (6 + t * 46), hw = 7 + t * 7;
    px(c, p.road, Math.round(x - hw), y, Math.round(hw * 2), 1);
  }
  for (const [x, h] of [[96, 22], [120, 16], [140, 24], [372, 20], [396, 26], [418, 16], [60, 18], [440, 22]]) pine(c, p.tree, x, 236 + Math.round(Math.sin(x / 50) * 6), h);
  for (let x = 0; x < W; x++) {
    const y = Math.round(256 + Math.sin(x / 70 + 2) * 6 + Math.sin(x / 19) * 1.5);
    px(c, p.near, x, y, 1, H - y); px(c, p.nearL, x, y, 1, 1);
  }
  for (const [x, h] of [[8, 46], [34, 34], [456, 38], [474, 50], [418, 26]]) pine(c, p.tree, x, 262, h);
}

export function makeEndingArt(scene: Phaser.Scene) {
  canvasTex(scene, 'end_sky0', W, H, (c) => {
    sky(c, ['#0b0a20', '#12102e', '#1a1640', '#251e52', '#2e2a60']);
    for (let i = 0; i < 110; i++) px(c, hash(i, 7) < 0.25 ? '#e8f0ff' : '#6a6f9c', Math.floor(hash(i, 8) * W), Math.floor(hash(i, 9) * 170));
  });
  canvasTex(scene, 'end_sky1', W, H, (c) => sky(c, ['#2b2f6a', '#4a4a8e', '#7d6a9a', '#c89a78', '#f4bc6a', '#ffe09a']));
  canvasTex(scene, 'end_sky2', W, H, (c) => sky(c, ['#3f7fc8', '#5a9ad8', '#7cb4e4', '#a4cfec', '#d0e6f0', '#f4f0dc']));
  ([['end_land0', NIGHT], ['end_land1', DAWN], ['end_land2', DAY]] as const).forEach(([k, p]) => canvasTex(scene, k, W, H, (c) => land(c, p)));
  canvasTex(scene, 'end_sun', 34, 34, (c) => { ell(c, '#ffb050', 17, 17, 16, 16); ell(c, '#ffd36a', 17, 17, 13.5, 13.5); ell(c, '#fff4c8', 16, 16, 9, 9); });
  canvasTex(scene, 'end_moon', 30, 30, (c) => {
    ell(c, '#a8b8e0', 15, 15, 14, 14); ell(c, '#e2ecff', 14, 14, 12, 12);
    for (const [x, y, r] of [[10, 10, 3], [18, 18, 2.5], [18, 9, 1.5], [9, 19, 1.5]]) ell(c, '#c2cfee', x, y, r, r);
  });
  // Nuages blancs : teintés à l'exécution selon l'heure (tint multiplie).
  ([['end_cloud0', 54], ['end_cloud1', 34]] as const).forEach(([k, rx]) => canvasTex(scene, k, rx * 2 + 2, 22, (c) => {
    const blobs = [[0, 15, rx, 4], [-rx * 0.45, 12, rx * 0.45, 6], [rx * 0.05, 9, rx * 0.42, 8], [rx * 0.5, 13, rx * 0.35, 5]];
    const inside = (x: number, y: number) => blobs.some(([bx, by, brx, bry]) => ((x - bx) / brx) ** 2 + ((y - by) / bry) ** 2 <= 1);
    for (let y = 0; y < 22; y++)
      for (let x = -rx; x <= rx; x++) {
        if (!inside(x, y) || (y > 16 && (x + y) % 2)) continue;
        px(c, !inside(x, y - 2) ? '#ffffff' : y > 13 ? '#b8bccc' : '#e0e2ea', rx + 1 + x, y);
      }
  }));
  // Oriflamme violette et or (2 images, flotte au vent) et oiseau (2 battements).
  [0, 1].forEach((f) => {
    canvasTex(scene, `end_flag${f}`, 18, 11, (c) => {
      px(c, '#2a2838', 0, 0, 1, 11);
      for (let x = 1; x < 16; x++) {
        const o = Math.round(Math.sin(x * 0.7 + f * Math.PI) * 1.2), h = Math.max(1, 6 - (x >> 2));
        px(c, x % 4 === 0 ? '#ffd36a' : '#54307c', x, 2 + o + ((6 - h) >> 1), 1, h);
      }
    });
    canvasTex(scene, `end_bird${f}`, 9, 5, (c) => {
      const y = f ? 3 : 0;
      px(c, '#1a1830', 4, 2, 1, 2); px(c, '#1a1830', 2, 1 + (y >> 1), 2, 1); px(c, '#1a1830', 5, 1 + (y >> 1), 2, 1); px(c, '#1a1830', 0, y, 2, 1); px(c, '#1a1830', 7, y, 2, 1);
    });
  });
}
