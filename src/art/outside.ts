import Phaser from 'phaser';
import { W, H, ARENA } from '../config';
import { canvasTex, glowTex } from './pixel';
import { hash, stoneBlocks, inArch } from './room';

type Ctx = CanvasRenderingContext2D;
const FY = ARENA.floorY;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
/** Position de la porte du château (extérieur). */
export const DOOR = { x: 400, hw: 22, base: 180 };
export const OUT = { torches: [362, 438], windows: [[352, 124], [452, 124], [311, 80]], moon: [86, 52] };
/** Escalier de la nef : arche à l'extrémité droite de l'arène. */
export const STAIRS = { x: 928, hw: 22, base: 182 };
/** Portail violet du tuto (bord gauche du château) et sa pancarte. */
export const PORTAL = { x: 24, sign: 68 };

/** Flaque de lumière chaude peinte (dégradé radial). */
export function pool(c: Ctx, x: number, y: number, r: number, rgb: string, a: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

function lancet(c: Ctx, cx: number, top: number, bottom: number, hw: number, lit: boolean) {
  const yb = top + Math.round(Math.sqrt(3) * hw);
  for (let y = top - 3; y <= bottom + 2; y++)
    for (let x = cx - hw - 3; x <= cx + hw + 3; x++) {
      if (inArch(x, y, cx, yb, hw)) px(c, x === cx || (y - top) % 9 === 0 ? '#3a2418' : lit ? (Math.abs(x - cx) < hw - 2 && y > yb ? '#ffe0a0' : '#ffb050') : '#0a0810', x, y);
      else if (inArch(x, y, cx, yb, hw + 2) && y <= bottom) px(c, x < cx ? '#2a2536' : '#5a546a', x, y);
    }
}

export function makeOutsideArt(scene: Phaser.Scene) {
  makePortalArt(scene);
  // Sol : pavés arrondis + touffes d'herbe.
  canvasTex(scene, 'ground_out', 48, H - FY, (c) => {
    px(c, '#151220', 0, 0, 48, H - FY);
    for (let y = 2; y < H - FY; y += 7)
      for (let x = (y / 7) % 2 ? -4 : 0; x < 48; x += 9) {
        const v = hash(x, y);
        px(c, v < 0.3 ? '#2a2536' : '#3a3448', x + 1, y, 7, 5); px(c, '#4a4458', x + 1, y, 6, 1); px(c, '#1e1a2a', x + 1, y + 4, 7, 1);
        if (v > 0.8) px(c, '#2e4a2a', x + 2, y + 1, 2, 1);
      }
    px(c, '#2e4a2a', 0, 0, 48, 1);
    for (let x = 0; x < 48; x += 3) if (hash(x, 1) > 0.4) px(c, hash(x, 2) > 0.5 ? '#3e6a34' : '#24402a', x, -0, 1, 1 + Math.floor(hash(x, 3) * 2));
    for (let y = 12; y < H - FY; y++) { c.fillStyle = `rgba(6,5,12,${(y - 12) / (H - FY - 12) * 0.6})`; c.fillRect(0, y, 48, 1); }
  });
  // Battant gauche taillé à la forme de l'ogive (le droit = le même retourné) : plus de vide au-dessus.
  const dTop = Math.ceil(DOOR.base - Math.sqrt(3) * DOOR.hw), dH = FY - dTop, dW = DOOR.hw + 1;
  const inDoor = (x: number, y: number) => x >= 0 && x < dW && y >= 0 && y < dH && inArch(DOOR.x - DOOR.hw + x, dTop + y, DOOR.x, DOOR.base, DOOR.hw);
  canvasTex(scene, 'door', dW, dH, (c) => {
    for (let y = 0; y < dH; y++) for (let x = 0; x < dW; x++) {
      if (!inDoor(x, y)) continue;
      const edge = !inDoor(x, y - 1) || !inDoor(x - 1, y) || x === dW - 1;
      px(c, edge ? '#1a1014' : x % 5 === 0 ? '#2a180e' : x % 5 === 1 ? '#6a4428' : '#4a2e1a', x, y);
    }
    for (const y of [dH - 80, dH - 56, dH - 34, dH - 10]) for (let x = 0; x < dW; x++) if (inDoor(x, y) && inDoor(x, y + 2)) {
      px(c, '#1a1820', x, y, 1, 3); px(c, '#4a4868', x, y, 1, 1);
      if (x % 5 === 2) px(c, '#8a8aa0', x, y + 1, 1, 1);
    }
    px(c, '#c8a050', dW - 5, dH - 22, 2, 3);
  });
  canvasTex(scene, 'gate', 40, 62, (c) => {
    for (let x = 2; x < 40; x += 6) { px(c, '#1a1828', x, 0, 3, 56); px(c, '#4a4868', x, 0, 1, 56); for (let y = 56; y < 62; y++) px(c, '#2a2838', x + 1, y, 1, 1); }
    for (const y of [4, 18, 32, 46]) { px(c, '#1a1828', 0, y, 40, 3); px(c, '#4a4868', 0, y, 40, 1); }
  });

  canvasTex(scene, 'out_bg', W, H, (c) => {
    // Ciel tramé violet nuit + étoiles.
    for (let y = 0; y < H; y++) {
      const t = Math.min(1, y / 200), d = ((y >> 1) % 2) * 0.6;
      c.fillStyle = `rgb(${11 + 31 * t + d | 0},${10 + 21 * t + d | 0},${20 + 38 * t + d | 0})`;
      c.fillRect(0, y, W, 1);
    }
    for (let i = 0; i < 110; i++) px(c, hash(i, 4) < 0.2 ? '#d8fbff' : '#6a6f9e', Math.floor(hash(i, 5) * W), Math.floor(hash(i, 6) * 160));
    // Lune.
    const [mx, my] = OUT.moon;
    for (let y = -22; y <= 22; y++) for (let x = -22; x <= 22; x++) {
      const d = Math.hypot(x, y);
      if (d <= 22) px(c, d > 20.5 ? '#a8b8e0' : Math.hypot(x + 7, y + 6) > 25 ? '#bccaee' : hash(x + 40, y + 40) > 0.93 ? '#c8d4f0' : '#e6eeff', mx + x, my + y);
    }
    pool(c, mx, my, 70, '160,190,255', 0.12);
    // Collines lointaines + arbres morts.
    for (let x = 0; x < W; x++) {
      const y = 196 + Math.round(Math.sin(x / 50) * 8 + Math.sin(x / 17) * 3);
      px(c, '#140f20', x, y, 1, FY - y);
    }
    // Tours arrière du château (silhouettes).
    for (const [x, w, top] of [[262, 26, 44], [470, 30, 30], [372, 22, 54]]) {
      px(c, '#1a1528', x, top, w, FY - top);
      for (let i = 0; i < w / 2; i++) px(c, '#1a1528', x + i, top - Math.round(i * 1.6), w - i * 2, 1 + Math.round(i * 1.6));
    }
    // Façade : mur de pierre crénelé.
    c.save(); c.beginPath(); c.rect(250, 96, W - 250, FY - 96); c.clip();
    c.translate(250, 96);
    stoneBlocks(c, W - 250, FY - 96, 18, 9, ['#16121f', '#2a2536', '#3a3448', '#4a4458', ''], 5);
    c.restore();
    for (let x = 250; x < W; x += 14) { px(c, '#3a3448', x, 88, 8, 8); px(c, '#4a4458', x, 88, 8, 1); }
    for (let y = 96; y < FY; y++) { c.fillStyle = 'rgba(6,5,12,0.45)'; c.fillRect(250, y, 6, 1); }
    // Grosse tour à toit conique.
    c.save(); c.beginPath(); c.rect(286, 40, 50, FY - 40); c.clip(); c.translate(286, 40);
    stoneBlocks(c, 50, FY - 40, 16, 8, ['#16121f', '#2e2a3c', '#3e384e', '#524a64', ''], 9);
    c.restore();
    for (let i = 0; i < 30; i++) px(c, i % 4 === 0 ? '#2a2240' : '#1e1a2c', 283 + i, 40 - Math.round(i * 1.2), 56 - i * 2, 1);
    px(c, '#c8a050', 310, 2, 1, 6);
    // Fenêtres éclairées (lumière chaude).
    for (const [x, y] of OUT.windows) lancet(c, x, y - 10, y + 16, 6, true);
    // Porte : arche de voussoirs + clé de voûte.
    const { x: dx, hw, base } = DOOR;
    for (let y = 120; y <= FY; y++)
      for (let x = dx - hw - 7; x <= dx + hw + 7; x++) {
        if (inArch(x, y, dx, base, hw)) px(c, '#0a0810', x, y);
        else if (inArch(x, y, dx, base, hw + 6)) px(c, (Math.floor((x + y) / 5) % 2) ? '#5a546a' : '#6a6480', x, y);
      }
    px(c, '#7a7490', dx - 3, base - Math.round(Math.sqrt(3) * hw) - 6, 6, 8);
    // Bannières pourpres à liseré doré.
    for (const bx of [334, 466]) {
      px(c, '#3a2050', bx - 7, 104, 14, 40); px(c, '#c8a050', bx - 7, 104, 14, 2); px(c, '#2a1638', bx - 7, 104, 2, 40);
      for (let i = 0; i < 7; i++) px(c, '#3a2050', bx - 7 + i, 144, 14 - i * 2, 1 + i);
      px(c, '#d8d0b8', bx - 2, 116, 4, 8); px(c, '#3a2050', bx, 117, 3, 6);
    }
    // Lierre.
    for (let i = 0; i < 160; i++) {
      const x = 252 + Math.floor(hash(i, 7) * 40), y = 100 + Math.floor(hash(i, 8) * 120);
      px(c, hash(i, 9) > 0.5 ? '#24402a' : '#1a2e1e', x, y, 2, 2);
    }
    // Flaques de lumière chaude (torches + fenêtres) façon peinture.
    for (const tx of OUT.torches) pool(c, tx, 190, 58, '255,138,42', 0.22);
    pool(c, dx, FY - 6, 70, '255,150,60', 0.12);
    for (const [x, y] of OUT.windows) pool(c, x, y, 24, '255,170,80', 0.18);
    // Premier plan gauche : cimetière, grille, arbre mort.
    for (const [x, kind] of [[96, 1], [118, 0], [176, 1], [214, 0]]) {
      const y = FY;
      if (kind) { px(c, '#1a1724', x - 1, y - 18, 3, 18); px(c, '#1a1724', x - 6, y - 13, 13, 3); px(c, '#4a4868', x - 1, y - 18, 1, 18); px(c, '#4a4868', x - 6, y - 13, 6, 1); }
      else { px(c, '#1a1724', x - 6, y - 15, 12, 15); px(c, '#1a1724', x - 5, y - 17, 10, 2); px(c, '#4a4868', x - 6, y - 15, 1, 15); px(c, '#4a4868', x - 5, y - 17, 10, 1); px(c, '#24402a', x - 6, y - 3, 12, 3); }
    }
    for (let x = 0; x < 236; x += 7) { px(c, '#0d0b14', x, FY - 22, 2, 22); px(c, '#0d0b14', x - 1, FY - 24, 4, 2); }
    px(c, '#0d0b14', 0, FY - 18, 236, 2); px(c, '#0d0b14', 0, FY - 8, 236, 2);
    const branch = (x: number, y: number, a: number, len: number, w: number) => {
      for (let i = 0; i < len; i++) px(c, '#07060b', Math.round(x + Math.cos(a) * i), Math.round(y + Math.sin(a) * i), w, w);
    };
    branch(150, FY, -Math.PI / 2, 90, 4);
    branch(150, FY - 60, -2.3, 40, 2); branch(150, FY - 75, -0.8, 46, 2); branch(126, FY - 88, -2.0, 22, 1); branch(182, FY - 106, -1.2, 24, 1);
    branch(150, FY - 88, -1.7, 30, 2);
    // Brume au sol.
    for (let y = FY - 30; y < FY; y++) { c.fillStyle = `rgba(90,90,130,${((y - FY + 30) / 30) * 0.16})`; c.fillRect(0, y, W, 1); }
  });
}

/** Fond de la nef : mur de pierre plein, porte en ogive de la tour d'escalier, marches éclairées à l'intérieur. */
export function paintStairs(c: Ctx) {
  const { x: sx, hw, base } = STAIRS, x0 = sx - hw - 22, WW = ARENA.bossW;
  // Mur du fond (jusqu'au plafond), contrefort éclairé sur sa tranche gauche.
  c.save(); c.beginPath(); c.rect(x0, 0, WW - x0, FY); c.clip(); c.translate(x0, 0);
  stoneBlocks(c, WW - x0, FY, 18, 9, ['#100e1a', '#1e1b2e', '#29263c', '#353150', ''], 13);
  c.restore();
  px(c, '#06050c', x0 - 2, 0, 2, FY); px(c, '#4a4868', x0, 0, 2, FY); px(c, '#2e2b45', x0 + 2, 0, 3, FY);
  for (let y = 0; y < FY; y += 26) { px(c, '#3d3a58', x0 - 3, y, 8, 3); px(c, '#06050c', x0 - 3, y + 3, 8, 1); } // chaînage d'angle
  // Meurtrière haute + clé de voûte sculptée.
  for (let y = 60; y < 96; y++) px(c, '#06050c', sx - 2, y, 4, 1);
  px(c, '#3a6aa0', sx - 1, 66, 2, 26); pool(c, sx, 78, 20, '127,170,255', 0.12);
  // Porte : voussoirs alternés, intérieur sombre.
  for (let y = 120; y <= FY; y++)
    for (let x = sx - hw - 7; x <= sx + hw + 7; x++) {
      if (inArch(x, y, sx, base, hw)) px(c, '#0c0a14', x, y);
      else if (inArch(x, y, sx, base, hw + 6)) px(c, (Math.floor((x + y) / 5) % 2) ? '#45425e' : '#55526e', x, y);
    }
  px(c, '#6a6480', sx - 4, base - Math.round(Math.sqrt(3) * hw) - 7, 8, 9); px(c, '#8a84a0', sx - 3, base - Math.round(Math.sqrt(3) * hw) - 6, 6, 1);
  // Marches qui montent vers la droite et disparaissent dans le noir, lumière de torche en haut.
  pool(c, sx + 16, base - 26, 34, '255,150,60', 0.28);
  for (let k = 0; k < 8; k++) {
    const x = sx - hw + 2 + k * 5, y = FY - 6 - k * 6, sh = Math.max(0, 1 - k / 9);
    px(c, k < 6 ? '#2e2b45' : '#1e1b2e', x, y, sx + hw - x, 6);
    px(c, `rgba(150,140,180,${0.4 + 0.5 * (1 - sh)})`, x, y, sx + hw - x, 1);
  }
  px(c, '#ffb050', sx + hw - 6, base - 34, 2, 3); px(c, '#ffe0a0', sx + hw - 6, base - 34, 1, 1); // flamme lointaine
}

/** Portail : 4 frames de vortex violet (pixels nets), anneau de pierres runiques, pancarte d'Halloween. */
function makePortalArt(scene: Phaser.Scene) {
  const VIO = ['#1a0a34', '#3a1668', '#6a30b0', '#9a5ae8', '#d0a8ff'];
  for (let f = 0; f < 4; f++)
    canvasTex(scene, 'portal' + f, 26, 44, (c) => {
      for (let y = 0; y < 44; y++) for (let x = 0; x < 26; x++) {
        const nx = (x + 0.5 - 13) / 11.5, ny = (y + 0.5 - 22) / 20.5, r = Math.hypot(nx, ny);
        if (r > 1) continue;
        const s = Math.sin(Math.atan2(ny, nx) * 3 + r * 9 - f * Math.PI / 2 * 3);
        let k = s > 0.35 ? 2 : s > -0.35 ? 1 : 0;
        if (r > 0.88) k = 4; else if (r > 0.72) k += 1; else if (r < 0.28) k = Math.max(0, k - 1);
        if ((x + y + f) % 2 && r > 0.5 && r < 0.72 && s > 0.7) k = 3; // tramage
        px(c, VIO[k], x, y);
      }
    });
  glowTex(scene, 'glowP', 48, '150,90,255');
  canvasTex(scene, 'portal_ring', 36, 54, (c) => {
    for (let y = 0; y < 54; y++) for (let x = 0; x < 36; x++) {
      const dx = x + 0.5 - 18, dy = y + 0.5 - 27;
      if (Math.hypot(dx / 15.5, dy / 25.5) > 1 || Math.hypot(dx / 11.5, dy / 20.5) < 1) continue;
      const a = (Math.atan2(dy / 25, dx / 15) + Math.PI) / (Math.PI * 2) * 14, fr = a - Math.floor(a);
      const rim = Math.hypot(dx / 13.5, dy / 23);
      let col = fr < 0.12 ? '#16121f' : dx + dy < -6 ? '#5a546a' : dx + dy > 8 ? '#2a2536' : '#3a3448';
      if (Math.floor(a) % 2 === 0 && Math.abs(fr - 0.55) < 0.12 && Math.abs(rim - 1) < 0.06) col = '#c8a0ff'; // rune
      px(c, col, x, y);
    }
    // Socle de dalles moussues.
    px(c, '#16121f', 3, 47, 30, 7); px(c, '#3a3448', 4, 48, 28, 6); px(c, '#4a4458', 4, 48, 28, 1);
    for (const x of [12, 22]) px(c, '#16121f', x, 48, 1, 6);
    for (const x of [5, 9, 25, 29]) px(c, '#24402a', x, 47, 2, 2);
  }, '#06050c');
  canvasTex(scene, 'sign_tuto', 52, 46, (c) => {
    // Piquet tordu.
    px(c, '#06050c', 30, 18, 6, 28); px(c, '#4a2e1a', 31, 18, 4, 28); px(c, '#6a4428', 31, 18, 1, 28);
    // Planche en flèche (←), penchée, bout cassé à droite.
    for (let x = 0; x < 50; x++) {
      const sy = Math.round((x - 25) * 0.07), tip = Math.max(0, 7 - x), end = x > 45 ? (x * 7) % 5 : 0;
      for (let y = 4 + tip + sy; y <= 20 - tip + sy - end; y++) {
        const edge = y === 4 + tip + sy || y === 20 - tip + sy - end || x === 0;
        px(c, edge ? '#06050c' : y === 12 + sy ? '#24160c' : y === 5 + tip + sy ? '#7a5232' : (x * 3 + y * 7) % 11 === 0 ? '#3a2414' : '#4a2e1a', x, y);
      }
    }
    for (const [x, y] of [[9, 8], [42, 9], [42, 16]]) px(c, '#8a8aa0', x, y, 1, 1);
    // Toile d'araignée entre planche et piquet.
    for (let i = 0; i < 9; i++) { px(c, '#8a88a8', 36 + i, 19 + i, 1, 1); px(c, '#8a88a8', 36, 19 + i, 1, 1); }
    for (const t of [3, 6]) for (let i = 0; i <= t; i++) px(c, '#6a6888', 36 + i, 19 + t, 1, 1);
    // Citrouille-lanterne au pied.
    for (let yy = 0; yy < 12; yy++) for (let xx = -9; xx <= 9; xx++) {
      const dx = xx / 9.5, dy = (yy - 6) / 6;
      if (dx * dx + dy * dy <= 1) px(c, Math.abs(xx) % 4 === 1 ? '#9a3f12' : dx < -0.2 && dy < 0 ? '#f08a2a' : '#d9661c', 17 + xx, 34 + yy);
    }
    px(c, '#4c5a2a', 16, 31, 2, 3);
    px(c, '#ffd36a', 12, 37, 3, 2); px(c, '#ffd36a', 19, 37, 3, 2); px(c, '#ffd36a', 12, 41, 10, 2);
    for (let xx = -4; xx < 5; xx += 3) px(c, '#9a3f12', 17 + xx, 41, 1, 1);
  });
}
