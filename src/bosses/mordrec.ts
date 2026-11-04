import Phaser from 'phaser';
import { COL } from '../config';
import { canvasTex, OUTLINE, poly, beam, ell } from '../art/pixel';
import { sfx } from '../audio/sfx';
import type { Boss, BossDef } from '../entities/Boss';

// Réglages de Mordrec (durées en s avant ×vitesse de phase 2, distances en px).
const M = {
  hp: 200,
  slash: { tele: 0.65, dash: 0.28, minDist: 70, maxDist: 250, overshoot: 50, recover: 0.5, reach: 64, height: 54 },
  slam: { tele: 0.6, rise: 0.35, mark: 0.7, fall: 0.16, recover: 0.6, waveSpeed: 210, doubleGap: 0.8 },
  swing: { wind: 0.3, cut: 0.16, height: 80 },
  flurry: { tele: 0.7, count: 2, gap: 0.3, speed: 210, turn: 2.6, home: 0.85, life: 2.6, recover: 0.45 },
  charge: { tele: 0.6, speed: 340, dist: 320, recover: 0.6 },
  warp: { mark: 0.5, behind: 72 },
  combo: { teles: [0.5, 0.45, 0.7], recover: 0.7 },
};
// Pose de repos : en garde basse, lame pointée vers l'avant et le haut.
const REST = { sword: 62, headY: -64 };

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const A = { k: '#14121f', d: '#262b45', m: '#3d4566', b: '#5a6386', l: '#7a86ac', h: '#b8c2e0', c: '#1a1426', C: '#2a2038', r: '#3a2c50' };

/** Spalière en dôme, plaques superposées. */
function dome(c: Ctx, cx: number, cy: number, rx: number, ry: number, [dk, md, lt]: string[]) {
  for (let y = -ry; y <= 3; y++)
    for (let x = -rx; x <= rx; x++) {
      if ((x / rx) ** 2 + (Math.min(y, 0) / ry) ** 2 > 1) continue;
      px(c, y === 3 || (y + ry) % 4 === 3 ? A.k : x > rx * 0.3 && y < 0 ? lt : x < -rx * 0.5 ? dk : md, cx + x, cy + y);
    }
}

// Guerrière en armure : acier clair, filigrane d'or, cape et tabard violets, longs cheveux blancs (gris chaud, jamais bleutés).
const H = {
  i0: '#262838', i1: '#42465c', i2: '#666b84', i3: '#9499ae', i4: '#d2d5e2',
  c0: '#1a1430', c1: '#2a2050', c2: '#3e3070', c3: '#584a94',
  b0: '#6a4a1c', b1: '#a47c30', b2: '#d8ac52', b3: '#fae8a8',
  g0: '#221a36', g1: '#3c2e5a',
  w0: '#7a7288', w1: '#a69fb2', w2: '#d0cad6', w3: '#ece8ee', w4: '#fffdf8',
};

function drawBody(c: Ctx) {
  // Cape royale derrière (dos = gauche) : plis, ourlet d'or.
  for (let y = 16; y < 80; y++) {
    const t = (y - 16) / 63, l = Math.round(25 - t * 21 + Math.sin(y * 0.3) * 1.2), r = Math.round(38 + t * 8);
    for (let x = l; x < r; x++) {
      const f = (x - l) % 8;
      px(c, y > 77 ? H.b1 : y === 77 ? H.b2 : x === l || f === 3 ? H.c0 : f === 4 || (x - l) / (r - l) > 0.5 ? H.c2 : H.c1, x, y);
    }
  }
  // Longues jambes : cuissots, genouillères à arête d'or, grèves évasées, solerets pointus.
  for (const [lx, back] of [[22, 1], [34, 0]]) {
    const d = back ? H.i0 : H.i1, m = back ? H.i1 : H.i2, l = back ? H.i2 : H.i3, g = back ? H.b1 : H.b2;
    px(c, d, lx, 52, 8, 25); px(c, m, lx + 2, 52, 4, 25); px(c, l, lx + 5, 52, 1, 25);
    px(c, d, lx - 1, 59, 10, 5); px(c, m, lx, 60, 8, 3); px(c, l, lx + 4, 60, 3, 1); px(c, g, lx - 1, 59, 10, 1); px(c, g, lx + 3, 63, 3, 1);
    px(c, d, lx - 1, 71, 10, 6); px(c, m, lx + 1, 71, 5, 5); px(c, l, lx + 5, 71, 1, 5); px(c, g, lx - 1, 71, 10, 1);
    px(c, d, lx, 77, 10, 1); px(c, d, lx, 78, 12, 1); px(c, d, lx, 79, 14, 2); px(c, m, lx + 1, 77, 8, 1); px(c, l, lx + 5, 78, 6, 1); px(c, g, lx + 2, 79, 2, 1);
  }
  // Faudes : trois lames évasées sur les hanches, liseré d'or.
  for (let i = 0; i < 3; i++) {
    const y = 44 + i * 4, l = 22 - Math.round(i * 1.6), w = 19 + Math.round(i * 3);
    px(c, H.i1, l, y, w, 4); px(c, H.i2, l + 3, y, w - 5, 3); px(c, H.i3, l + w - 9, y, 5, 1);
    px(c, i === 2 ? H.b2 : H.b1, l, y + 3, w, 1);
  }
  // Tabard frontal en pointe, losange d'or.
  for (let y = 44; y < 68; y++) {
    const hw = y > 64 ? 68 - y : 3;
    for (let x = 35 - hw; x <= 35 + hw; x++) px(c, Math.abs(x - 35) === hw ? H.b2 : x > 35 ? H.c3 : H.c2, x, y);
  }
  px(c, H.b3, 35, 48, 1, 5); px(c, H.b2, 34, 49, 3, 3); px(c, H.b3, 35, 50, 1, 1);
  // Cuirasse : poitrine large, taille fine.
  for (let y = 19; y < 41; y++) {
    const hw = y < 26 ? 10 + Math.round((y - 19) * 0.28) : Math.round(12 - (y - 26) * 0.33);
    for (let x = 31 - hw; x <= 31 + hw; x++) {
      const u = (x - (31 - hw)) / (2 * hw);
      px(c, u < 0.12 ? H.i0 : u < 0.4 ? H.i1 : u < 0.7 ? H.i2 : u < 0.88 ? H.i3 : H.i1, x, y);
    }
  }
  // Galbe de la poitrine, arête centrale, filigrane d'or (encolure, plastron en V, losange).
  px(c, H.i4, 36, 24, 5, 2); px(c, H.i4, 37, 26, 3, 1); px(c, H.i0, 29, 29, 12, 1); px(c, H.i4, 35, 31, 1, 9);
  for (let i = 0; i < 6; i++) { px(c, H.b2, 26 + i, 20 + i); px(c, H.b2, 39 - i, 20 + i); }
  for (let i = 0; i < 7; i++) { px(c, H.b1, 27 + i, 33 + i); if (i < 5) px(c, H.b2, 38 - i, 35 + i); }
  px(c, H.b3, 34, 30, 2, 3); px(c, H.b2, 33, 31, 4, 1);
  // Ceinture d'or, gemme violette.
  px(c, H.b1, 23, 41, 17, 3); px(c, H.b2, 23, 41, 17, 1); px(c, H.b3, 33, 41, 4, 3); px(c, H.c3, 34, 42, 2, 1);
  // Spalière arrière, liseré d'or.
  dome(c, 19, 23, 8, 6, [A.k, H.i0, H.i1]); px(c, H.b1, 12, 26, 15, 1);
  // Gorgerin montant, bord d'or.
  for (let y = 12; y < 20; y++) {
    const hw = 8 + Math.round((y - 12) * 0.5);
    for (let x = 32 - hw; x <= 32 + hw; x++) px(c, y === 12 ? H.b2 : x > 35 ? H.i3 : x > 28 ? H.i2 : H.i1, x, y);
  }
  px(c, H.b1, 24, 19, 17, 1);
  // Mèche blanche tombée sur l'épaule.
  for (let y = 14; y < 38; y++) {
    const x = Math.round(27 + Math.sin(y * 0.35) - (y - 14) * 0.06);
    px(c, H.w1, x - 1, y); px(c, H.w3, x, y);
    if (y < 34) px(c, H.w2, x + 1, y);
  }
  // Sous l'épaulière avant (le bras part de (43, 25)).
  dome(c, 41, 21, 9, 6, [H.i1, H.i3, H.i4]);
}

/** Heaume (26×36) : crête effilée, couronne d'or, visière à fente (centre x 17, y 24 : yeux du rig). */
function drawHead(c: Ctx) {
  // Crête balayée vers l'arrière, arête d'or.
  for (let x = 4; x < 20; x++) {
    const top = Math.round(3 + (x - 4) * 0.38), bot = Math.round(top + 1 + (x - 4) * 0.2);
    for (let y = top; y <= bot; y++) px(c, y === top ? H.b2 : x > 12 ? H.i4 : H.i3, x, y);
  }
  // Calotte.
  for (let y = 10; y <= 27; y++)
    for (let x = 7; x <= 24; x++) {
      if (((x - 15.5) / 8) ** 2 + ((y - 18.5) / 8) ** 2 > 1) continue;
      px(c, x > 19 && y < 16 ? H.i4 : x > 17 ? H.i3 : x > 12 ? H.i2 : H.i1, x, y);
    }
  // Couvre-nuque à lames.
  px(c, H.i1, 7, 21, 5, 3); px(c, H.i0, 6, 24, 6, 3); px(c, H.i1, 6, 27, 7, 2); px(c, H.b1, 6, 29, 7, 1);
  // Visière en pointe de bec, fente sombre, ventail percé.
  for (let y = 20; y < 32; y++) {
    const r = y < 27 ? 24 : Math.round(24 - (y - 26) * 1.2), l = 11 + Math.max(0, y - 25);
    for (let x = l; x <= r; x++) px(c, x > 20 ? H.i3 : x > 15 ? H.i2 : H.i1, x, y);
  }
  px(c, H.i4, 12, 21, 12, 1); px(c, H.i4, 23, 26, 1, 2);
  px(c, A.k, 12, 23, 13, 2);
  for (const [x, y] of [[18, 27], [21, 27], [17, 29], [20, 29]]) px(c, A.k, x, y);
  // Couronne d'or sur le front : bandeau et trois pointes.
  px(c, H.b1, 8, 19, 16, 1); px(c, H.b2, 8, 18, 16, 1);
  for (const [x, h] of [[11, 2], [15, 3], [19, 4]]) { px(c, H.b2, x, 18 - h, 2, h); px(c, H.b3, x + 1, 18 - h, 1, 1); }
  // Col.
  px(c, H.i1, 10, 31, 12, 5); px(c, H.i2, 13, 31, 7, 5); px(c, H.i3, 17, 31, 2, 5); px(c, H.b2, 10, 32, 12, 1);
}

/** Cheveux : mèches de longueurs inégales, de la nuque (v = 0) aux pointes, découpées en deux textures articulées.
 *  Le bord coupé touche le bord de la texture : pas de contour à la jointure. */
const HAIR = { ox: 22, w: 30, cut: 28, join: 26, len: 60 };
const hairX = (v: number) => -v * 0.2 + Math.sin(v * 0.12) * 1.5;
// [décalage, amplitude, phase, demi-largeur, longueur, teintes ombre/milieu/clair] : de la plus lointaine à la plus proche.
const LOCKS: [number, number, number, number, number, string[]][] = [
  [-5.5, 1.6, 0.5, 2.6, 52, [H.w0, H.w1, H.w2]],
  [5, 1.2, 2.4, 2.4, 46, [H.w0, H.w1, H.w2]],
  [-2.5, 1.8, 2, 3, 60, [H.w1, H.w2, H.w3]],
  [2.2, 1.5, 4, 3, 56, [H.w1, H.w3, H.w4]],
];
function drawHair(c: Ctx, v0: number, v1: number) {
  for (const [off, amp, ph, wid, len, [t0, t1, t2]] of LOCKS)
    for (let v = v0; v < Math.min(v1, len); v++) {
      const t = v / len, cx = hairX(v) + off * (0.35 + t * 0.9) + amp * Math.sin(v * 0.22 + ph) * Math.min(1, v / 12);
      const hw = wid * Math.min(1, 0.25 + v / 10) * (t > 0.7 ? (1 - t) / 0.3 : 1);
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const u = (x - cx) / Math.max(hw, 1) + 0.3 * Math.sin(v * 0.45 + ph); // reflets ondulés, pas de bandes droites
        px(c, u < -0.45 ? t0 : u > 0.4 ? t2 : t1, HAIR.ox + x, v - v0);
      }
    }
}

function drawSword(c: Ctx, red = false) {
  const S = red ? { e: '#ffd6e0', m: '#ff2a5a', d: '#7a0a30', f: '#c0144a' } : { e: '#f4f4fa', m: '#b4b9ca', d: '#5e6378', f: '#7f8499' };
  for (let y = 2; y < 62; y++) {
    const hw = y < 9 ? Math.ceil((y - 1) / 2.5) : 3;
    for (let x = 8 - hw; x < 8 + hw; x++) px(c, x === 8 - hw ? S.d : x === 8 + hw - 1 ? S.e : x === 7 && y > 10 && y < 56 ? S.f : S.m, x, y);
  }
  // Damasquinure à la base de la lame, garde dorée à quillons relevés, fusée violette, pommeau à gemme.
  px(c, red ? S.e : H.b2, 7, 48, 2, 14); px(c, red ? S.m : H.b3, 7, 52, 1, 2);
  px(c, H.b1, 1, 62, 14, 2); px(c, H.b2, 2, 62, 12, 1); px(c, H.b1, 0, 59, 2, 4); px(c, H.b1, 14, 59, 2, 4); px(c, H.b3, 0, 59, 1, 1); px(c, H.b3, 15, 59, 1, 1); px(c, H.b3, 7, 62, 2, 1);
  px(c, H.g0, 6, 64, 4, 12);
  for (let y = 65; y < 76; y += 2) px(c, H.g1, 6, y, 4, 1);
  px(c, H.b1, 5, 76, 6, 4); px(c, H.b2, 6, 76, 3, 1); px(c, H.c3, 7, 77, 2, 2);
}

/** Splash art de l'annonceur (100×124, tournée vers la gauche) : halo doré, cheveux et cape au vent, épée levée. */
function drawSplash(c: Ctx) {
  for (let y = 0; y < 80; y++)
    for (let x = 18; x < 98; x++) {
      const d = Math.hypot(x - 58, y - 38);
      if (d < 36 && d > 33.5) px(c, H.b1, x, y);
      else if (d <= 33.5 && (x + y) % 2 === 0) px(c, d < 22 ? H.c1 : H.c0, x, y);
    }
  // Cape, plis, ourlet d'or.
  poly(c, H.c0, [44, 44, 74, 42, 88, 70, 97, 116, 80, 120, 62, 124, 40, 124, 30, 122, 26, 100, 34, 62]);
  poly(c, H.c1, [48, 46, 70, 44, 83, 72, 90, 112, 78, 116, 62, 120, 44, 120, 34, 104, 39, 64]);
  for (const [x0, y0, x1, y1] of [[60, 50, 74, 112], [67, 48, 86, 104], [52, 54, 54, 112]]) beam(c, H.c2, x0, y0, x1, y1, 1.5);
  beam(c, H.b2, 97, 116, 80, 120, 2); beam(c, H.b2, 80, 120, 62, 124, 2); beam(c, H.b2, 40, 123, 30, 121, 2);
  // Jambes, genouillères dorées, solerets pointus.
  poly(c, H.i0, [56, 100, 66, 100, 68, 118, 72, 124, 56, 124, 58, 118]); poly(c, H.i1, [58, 101, 64, 101, 66, 118, 60, 118]);
  poly(c, H.i1, [42, 100, 54, 100, 52, 118, 50, 124, 32, 124, 40, 118]); poly(c, H.i2, [44, 101, 50, 101, 48, 118, 42, 118]);
  px(c, H.i3, 44, 102, 2, 16); px(c, H.b1, 42, 108, 11, 3); px(c, H.b2, 43, 108, 5, 1); px(c, H.b1, 57, 110, 9, 3); px(c, H.b2, 58, 110, 3, 1);
  // Faudes à lames, tabard.
  poly(c, H.i1, [42, 82, 66, 82, 72, 104, 36, 104]); poly(c, H.i2, [44, 83, 54, 83, 50, 103, 39, 103]);
  for (const [y, l, r] of [[88, 40, 68], [94, 38, 70], [100, 37, 71]]) { beam(c, H.b1, l, y, r, y, 1); beam(c, H.i3, l + 2, y + 1, l + 12, y + 1, 1); }
  poly(c, H.c2, [48, 82, 58, 82, 57, 108, 53, 114, 49, 108]); beam(c, H.c3, 54, 84, 54, 108, 2);
  beam(c, H.b2, 48, 82, 49, 108, 1); beam(c, H.b2, 58, 82, 57, 108, 1); beam(c, H.b2, 49, 108, 53, 114, 1); beam(c, H.b2, 57, 108, 53, 114, 1);
  px(c, H.b3, 52, 92, 2, 7); px(c, H.b3, 50, 94, 6, 3);
  // Cuirasse à taille fine, filigrane d'or, ceinture.
  poly(c, H.i0, [38, 48, 68, 48, 62, 80, 46, 80]);
  poly(c, H.i1, [42, 50, 65, 50, 60, 78, 47, 78]);
  poly(c, H.i2, [42, 50, 54, 50, 52, 78, 47, 78]);
  poly(c, H.i3, [43, 52, 49, 52, 48, 62, 44, 62]);
  beam(c, H.i4, 51, 52, 50, 76, 1); beam(c, H.i0, 42, 66, 64, 66, 1);
  beam(c, H.b2, 42, 50, 51, 60, 1); beam(c, H.b2, 63, 50, 51, 60, 1); beam(c, H.b2, 46, 69, 52, 78, 1); beam(c, H.b1, 60, 69, 52, 78, 1);
  px(c, H.b3, 50, 62, 3, 3);
  poly(c, H.b1, [44, 78, 64, 78, 65, 83, 43, 83]); beam(c, H.b3, 44, 79, 60, 79, 1); px(c, H.b3, 51, 79, 5, 4); px(c, H.c3, 52, 80, 3, 2);
  // Spalière arrière, puis longs cheveux blancs emportés par le vent.
  ell(c, H.i0, 70, 54, 10, 8); ell(c, H.i1, 71, 52, 7, 5);
  const shade = [H.w2, H.w3, H.w1, H.w4, H.w2, H.w3, H.w0, H.w2, H.w3, H.w1, H.w2, H.w0, H.w3, H.w1];
  for (let s = 0; s < shade.length; s++) {
    const x1 = 95 - s * 2.1, y1 = 74 + s * 2, y0 = 26 + s * 1.3;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200, w = t > 0.85 ? 1 : t > 0.55 ? 2 : 3;
      px(c, shade[s], Math.round(60 + (x1 - 60) * t ** 0.85 + Math.sin(t * 5 + s * 0.45) * 3 * t), Math.round(y0 + (y1 - y0) * t), w, w);
    }
  }
  // Gorgerin, épaulière avant à lames et liseré d'or.
  poly(c, H.i1, [40, 42, 66, 40, 68, 50, 38, 50]); beam(c, H.i3, 42, 45, 56, 44, 2); beam(c, H.b2, 40, 42, 66, 40, 1); beam(c, H.b1, 38, 50, 68, 50, 1);
  ell(c, H.i0, 36, 56, 14, 10); ell(c, H.i2, 35, 54, 12, 8); ell(c, H.i3, 33, 51, 8, 5); px(c, H.i4, 29, 48, 6, 1);
  beam(c, H.b2, 24, 60, 48, 60, 1); beam(c, H.i1, 25, 63, 47, 63, 2); beam(c, H.b1, 26, 65, 46, 65, 1);
  // Heaume : crête effilée, calotte, couronne d'or, visière en bec, yeux lilas.
  poly(c, H.i3, [46, 20, 50, 13, 62, 8, 86, 2, 74, 9, 62, 18]); beam(c, H.b2, 48, 17, 52, 12, 1); beam(c, H.b3, 52, 12, 84, 3, 1);
  ell(c, H.i1, 51, 29, 11, 11); ell(c, H.i2, 50, 28, 10, 10); ell(c, H.i3, 47, 25, 6, 6); px(c, H.i4, 44, 21, 4, 2);
  beam(c, H.b2, 40, 30, 61, 27, 2);
  for (const [x, h] of [[43, 5], [48, 4], [53, 3]]) { px(c, H.b2, x, 29 - h, 2, h); px(c, H.b3, x, 29 - h, 1, 1); }
  poly(c, H.i2, [39, 33, 61, 31, 61, 40, 52, 47, 45, 45, 39, 39]);
  poly(c, H.i3, [39, 33, 49, 32, 49, 44, 45, 45, 39, 39]);
  beam(c, H.i4, 40, 33, 58, 32, 1);
  px(c, A.k, 39, 35, 20, 3);
  px(c, '#d8d0ff', 42, 36, 4, 1); px(c, '#d8d0ff', 50, 36, 4, 1); px(c, '#ffffff', 43, 36, 2, 1); px(c, '#ffffff', 51, 36, 2, 1);
  for (const [x, y] of [[43, 40], [47, 40], [45, 43], [49, 43]]) px(c, A.k, x, y, 2, 1);
  // Bras et épée levée en travers : lame, fil, garde, gantelet, pommeau.
  beam(c, H.i1, 40, 62, 33, 76, 6); beam(c, H.i3, 38, 64, 32, 75, 2); beam(c, H.b2, 38, 70, 35, 71, 6);
  beam(c, '#5e6378', 31, 72, 6, 4, 5); beam(c, '#b4b9ca', 31, 72, 6, 4, 3); beam(c, '#f4f4fa', 30, 71, 6, 5, 1); beam(c, H.b2, 28, 66, 24, 54, 1);
  beam(c, H.b1, 25, 78, 39, 73, 3); px(c, H.b3, 31, 75, 2, 1); px(c, H.b3, 25, 77, 1, 1); px(c, H.b3, 39, 73, 1, 1);
  ell(c, H.i2, 34, 79, 4, 4); px(c, H.i3, 32, 77, 2, 1);
  ell(c, H.b1, 36, 86, 2, 2); px(c, H.c3, 36, 86, 1, 1);
  // Éclat sur la pointe, poussière d'or qui vole.
  for (let i = -4; i <= 4; i++) { px(c, '#ffffff', 9 + i, 13); px(c, '#ffffff', 9, 13 + i); }
  for (let i = 0; i < 16; i++) px(c, i % 3 ? H.b2 : H.b3, ((i * 37) % 80) + 16, ((i * 53) % 100) + 6);
}

/** Traînée d'épée : secteur d'anneau autour de la main, de l'angle a0 à a1 (0 = haut, horaire). */
function smear(c: Ctx, a0: number, a1: number, rIn: number, rOut: number, rev = false) {
  const C = 73;
  for (let y = 0; y < 146; y++)
    for (let x = 0; x < 146; x++) {
      const dx = x + 0.5 - C, dy = y + 0.5 - C, r = Math.hypot(dx, dy);
      const a = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (r < rIn || r > rOut || a < a0 || a > a1) continue;
      const u = rev ? (a1 - a) / (a1 - a0) : (a - a0) / (a1 - a0);
      if (u < 0.35 && (x + y) % 2) continue; // queue tramée
      px(c, r > rOut - 3 ? '#ffffff' : u > 0.75 ? '#ffd0dc' : u > 0.4 ? '#ff6a90' : '#c0144a', x, y);
    }
}

export function makeMordrecArt(scene: Phaser.Scene) {
  canvasTex(scene, 'mord_body', 60, 82, drawBody, OUTLINE);
  canvasTex(scene, 'mord_head', 26, 36, drawHead, OUTLINE);
  canvasTex(scene, 'mord_hair', HAIR.w, HAIR.cut, (c) => drawHair(c, 0, HAIR.cut), OUTLINE);
  canvasTex(scene, 'mord_hair2', HAIR.w, HAIR.len - HAIR.join + 3, (c) => drawHair(c, HAIR.join, HAIR.len), OUTLINE);
  canvasTex(scene, 'mord_sword', 16, 84, (c) => drawSword(c), OUTLINE);
  canvasTex(scene, 'mord_sword_r', 16, 84, (c) => drawSword(c, true), OUTLINE);
  canvasTex(scene, 'mord_splash', 100, 124, drawSplash, OUTLINE);
  // Poing ganté qui enserre la fusée (dessiné par-dessus la lame, tourne avec elle).
  canvasTex(scene, 'mord_fist', 11, 11, (c) => {
    px(c, H.i1, 2, 1, 7, 9); px(c, H.i1, 1, 2, 9, 7); // bloc arrondi
    for (let i = 0; i < 4; i++) { px(c, i ? H.i3 : H.i4, 3, 2 + i * 2, 5, 1); px(c, A.k, 3, 3 + i * 2, 5, 1); } // doigts repliés
    px(c, H.b2, 8, 2, 1, 7); px(c, H.i2, 1, 3, 2, 4); px(c, H.b3, 1, 4, 1, 2); // jointures dorées, pouce
  }, OUTLINE);
  canvasTex(scene, 'mord_pauldron', 22, 15, (c) => {
    dome(c, 11, 6, 9, 5, [H.i1, H.i3, H.i4]);
    px(c, H.b2, 2, 9, 18, 1); px(c, H.i2, 4, 10, 15, 2); px(c, H.i3, 12, 10, 5, 1); px(c, H.b1, 5, 12, 13, 1); // lame inférieure plus étroite, liserés d'or
    px(c, H.b3, 13, 3, 2, 2); // rivet d'or
  }, OUTLINE);
  canvasTex(scene, 'mord_eyes', 9, 3, (c) => { px(c, '#fff', 1, 1, 2, 1); px(c, '#fff', 6, 1, 2, 1); });
  // Danger (rouge/magenta, cœur blanc) : traînées, pics de roche, épée fantôme, repère au sol.
  canvasTex(scene, 'smear0', 146, 146, (c) => smear(c, -75, 125, 26, 72));
  canvasTex(scene, 'smear1', 146, 146, (c) => smear(c, 20, 125, 40, 72));
  canvasTex(scene, 'smear2', 146, 146, (c) => smear(c, 80, 125, 56, 72));
  canvasTex(scene, 'smearR0', 146, 146, (c) => smear(c, -75, 125, 26, 72, true));
  canvasTex(scene, 'smearR1', 146, 146, (c) => smear(c, -75, 30, 40, 72, true));
  canvasTex(scene, 'smearR2', 146, 146, (c) => smear(c, -75, -30, 56, 72, true));
  // Pics de roche à facettes (face éclairée / ombre), fissure rouge incandescente, pointe chauffée à blanc.
  for (const [k, hgt, hw0, lean] of [['mord_spike', 26, 6, 0], ['mord_spike2', 20, 5, 2], ['mord_spike3', 30, 7, -1]] as [string, number, number, number][])
    canvasTex(scene, k, 18, 32, (c) => {
      const top = 31 - hgt;
      for (let y = top; y < 31; y++) {
        const t = (y - top) / (hgt - 1), hw = Math.max(0, Math.round(t * hw0)), cx = 9 + Math.round((1 - t) * lean);
        for (let x = cx - hw; x <= cx + hw; x++) {
          const u = hw ? (x - cx) / hw : 0, seam = Math.abs(x - cx - Math.round(Math.sin(y * 0.7) * 0.6)) < 1 && t > 0.25;
          px(c, seam ? (t > 0.8 ? '#ffd6e0' : '#ff2a5a') : t < 0.18 ? '#ffd6e0' : u < -0.45 ? '#9aa6c8' : u < 0 ? '#6a759a' : u < 0.5 ? '#454d70' : '#262b45', x, y);
        }
      }
      px(c, '#3a3448', 9 - hw0 - 1, 30, hw0 * 2 + 3, 1); // éboulis à la base
    }, OUTLINE);
  canvasTex(scene, 'mord_crack', 12, 3, (c) => { px(c, '#ff2a5a', 0, 1, 12, 1); px(c, '#ffd6e0', 3, 1, 5, 1); px(c, '#c0144a', 2, 0, 3, 1); px(c, '#c0144a', 7, 2, 3, 1); });
  canvasTex(scene, 'mord_ghost', 58, 14, (c) => {
    for (let x = 6; x < 56; x++) {
      const hw = x > 46 ? Math.round((56 - x) * 0.33) : 3;
      for (let y = 7 - hw; y <= 7 + hw; y++) px(c, y === 7 - hw ? '#ffd6e0' : y === 7 ? '#ffffff' : y === 7 + hw ? '#c0144a' : '#ff6a90', x, y);
    }
    px(c, '#ff6a90', 3, 1, 3, 12); px(c, '#ffd6e0', 3, 1, 1, 12); px(c, '#c0144a', 0, 6, 3, 3);
  });
  canvasTex(scene, 'mord_mark', 56, 10, (c) => {
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 56; x++) {
        const d = ((x + 0.5 - 28) / 28) ** 2 + ((y + 0.5 - 5) / 5) ** 2;
        if (d <= 1) px(c, d > 0.7 ? '#ff2a5a' : d > 0.35 ? '#c0144a' : '#ff6a90', x, y);
      }
  });
  // Neutres : éclat, débris, poussière, onde de choc.
  canvasTex(scene, 'glint', 17, 17, (c) => {
    for (let i = 0; i < 8; i++) { px(c, '#ffffff', 8, i, 1, 1); px(c, '#ffffff', 8, 16 - i, 1, 1); px(c, '#ffffff', i, 8, 1, 1); px(c, '#ffffff', 16 - i, 8, 1, 1); }
    px(c, '#ffffff', 7, 7, 3, 3); px(c, '#ffd6e0', 6, 8, 5, 1); px(c, '#ffd6e0', 8, 6, 1, 5);
  });
  canvasTex(scene, 'rock', 4, 4, (c) => { px(c, '#ffffff', 0, 0, 4, 3); px(c, '#9a9ab0', 1, 3, 3, 1); px(c, '#9a9ab0', 3, 1, 1, 2); });
  canvasTex(scene, 'puff', 14, 14, (c) => {
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 7);
      if (d < 6.5 && (d < 4 || (x + y) % 2 === 0)) px(c, '#ffffff', x, y);
    }
  });
  canvasTex(scene, 'ring', 64, 64, (c) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32);
      if (d > 29 && d < 31.5) px(c, '#ffffff', x, y);
    }
  });
}

// ---------------------------------------------------------------- effets

type Img = Phaser.GameObjects.Image;
type Cont = Phaser.GameObjects.Container;
const ADD = Phaser.BlendModes.ADD;

/** Pointe de l'épée (monde), pour une épée à l'angle a (rig non incliné). */
function tipAt(b: Boss, a: number) {
  const r = Phaser.Math.DegToRad(a);
  return { x: b.x + b.dir * (18 + 66 * Math.sin(r)), y: b.y - 44 - 66 * Math.cos(r) };
}
/** Éclat en étoile sur la lame : « ça va frapper ». */
function glint(b: Boss, a: number) {
  const { x, y } = tipAt(b, a);
  const g = b.temp(b.scene.add.image(x, y, 'glint').setBlendMode(ADD).setDepth(20).setScale(0));
  b.tw(g, { scale: 1.4, angle: 90, yoyo: true }, 0.13, 'Quad.out');
  sfx.ting();
}
/** Bras avant articulé : la main suit l'angle de l'épée (arc autour de c), coude par IK à 2 os. */
const ARM = { sx: 13, sy: -57, cx: 11, cy: -40, r: 8, l1: 13, l2: 12 };
const N = (h: string) => parseInt(h.slice(1), 16);
const BLADE = 68; // pivot (main) → pointe
const TM = new Phaser.GameObjects.Components.TransformMatrix();
function driveArm(b: Boss, sw: Cont, g: Phaser.GameObjects.Graphics) {
  if (!g.active || !sw.active) return;
  if (sw.getData('free')) { g.clear(); return; }
  {
    // La pointe ne passe jamais sous le sol : elle s'y pose et traîne. Pointe (repère du rig) = c + (r + lame)·(sin a, −cos a) ;
    // y monde = mb·x + md·y + ty ⇒ contrainte ρ·sin(a − φ) ≤ q, bornes résolues en tenant compte de l'inclinaison du rig.
    const m = sw.parentContainer.getWorldTransformMatrix(TM), R = ARM.r + BLADE;
    const rho = Math.hypot(m.b, m.d), phi = Math.atan2(m.d, m.b);
    const q = (b.floorY - 1 - m.ty - m.b * ARM.cx - m.d * ARM.cy) / (R * rho);
    let a = Phaser.Math.DegToRad(sw.angle), drag = false;
    if (q > -1 && q < 1) {
      const lo = phi + Math.asin(q), hi = phi + Math.PI - Math.asin(q), u = Phaser.Math.Angle.Normalize(a - lo);
      if (u > 0 && u < hi - lo) { // dans la zone interdite : borne la plus proche
        a = u < (hi - lo) / 2 ? lo : hi; drag = true;
        sw.setAngle(Phaser.Math.RadToDeg(Phaser.Math.Angle.Wrap(a)));
      }
    }
    sw.setPosition(Math.round(ARM.cx + Math.sin(a) * ARM.r), Math.round(ARM.cy - Math.cos(a) * ARM.r));
    const px = ARM.cx + Math.sin(a) * R, py = ARM.cy - Math.cos(a) * R;
    const tipX = m.a * px + m.c * py + m.tx, now = b.scene.time.now;
    // Étincelles (et raclement) quand la pointe frotte le sol en se déplaçant.
    const moved = Math.abs(tipX - (sw.getData('tipX') ?? tipX)) > 0.4;
    sw.setData('tipX', tipX);
    if (drag && moved && now > (sw.getData('sparkT') ?? 0)) {
      sw.setData('sparkT', now + 50);
      b.scene.sparks(tipX, b.floorY - 1, 0xffd36a, 2);
      if (now > (sw.getData('scrT') ?? 0)) { sw.setData('scrT', now + 220); sfx.scrape(); }
    }
  }
  const { sx, sy, l1, l2 } = ARM, hx = sw.x, hy = sw.y;
  const d = Phaser.Math.Clamp(Math.hypot(hx - sx, hy - sy), Math.abs(l1 - l2) + 1, l1 + l2 - 0.5);
  const base = Math.atan2(hy - sy, hx - sx), k = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const ex = Math.round(sx + Math.cos(base + k) * l1), ey = Math.round(sy + Math.sin(base + k) * l1); // coude en arrière
  const ln = (w: number, col: string, x0: number, y0: number, x1: number, y1: number) => g.lineStyle(w, N(col)).lineBetween(x0, y0, x1, y1);
  g.clear();
  // Contour, puis brassard (haut) et canon d'avant-bras d'acier, cubitière et manchette dorées.
  ln(8, OUTLINE, sx, sy, ex, ey); ln(7, OUTLINE, ex, ey, hx, hy);
  g.fillStyle(N(OUTLINE)).fillCircle(ex, ey, 4);
  ln(6, H.i3, sx, sy, ex, ey); ln(2, H.i4, sx + 1, sy, ex + 1, ey);
  ln(5, H.i2, ex, ey, hx, hy); ln(1, H.i4, ex + 1, ey - 1, hx + 1, hy - 1);
  const wx = ex + (hx - ex) * 0.62, wy = ey + (hy - ey) * 0.62; // manchette dorée au poignet
  ln(6, H.b1, wx, wy, ex + (hx - ex) * 0.8, ey + (hy - ey) * 0.8); ln(2, H.b3, wx, wy - 1, ex + (hx - ex) * 0.8, ey + (hy - ey) * 0.8 - 1);
  g.fillStyle(N(H.b1)).fillCircle(ex, ey, 2.5).fillStyle(N(H.b3)).fillRect(ex - 1, ey - 1, 1, 1);
}
/** Cheveux : balancement lent, ils traînent derrière elle selon sa vitesse (angle > 0 = pointes vers le dos). */
function driveHair(b: Boss, top: Cont, low: Cont) {
  if (!top.active) return;
  const t = b.scene.time.now / 1000, dx = (b.x - (top.getData('x') ?? b.x)) * b.dir;
  top.setData('x', b.x);
  const lag = Phaser.Math.Linear(top.getData('lag') ?? 0, Phaser.Math.Clamp(dx * 9, -15, 45), 0.12);
  top.setData('lag', lag);
  top.setAngle(1.5 * Math.sin(t * 1.7) + lag);
  low.setAngle(3 * Math.sin(t * 1.7 - 1) + lag * 0.5);
}
/** Traînée pleine sur 3 frames, attachée au rig. */
function smearFx(b: Boss, rev = false) {
  const rig = b.parts.rig as Cont, sc = b.scene, k = rev ? 'smearR' : 'smear';
  const sw = b.parts.sword as Cont, img = b.temp(sc.add.image(sw.x, sw.y, k + '0').setBlendMode(ADD));
  rig.add(img);
  sc.time.delayedCall(45, () => img.active && img.setTexture(k + '1'));
  sc.time.delayedCall(90, () => img.active && img.setTexture(k + '2'));
  sc.time.delayedCall(140, () => img.destroy());
}
/** Image rémanente lilas pendant la ruée. */
function ghostTrail(b: Boss) {
  const g = b.scene.add.image(b.x, b.y, 'mord_body').setOrigin(0.5, 1).setFlipX(b.dir < 0).setTintFill(0xd8d0ff).setAlpha(0.35).setDepth(6);
  b.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
}
function ring(b: Boss, x: number, y: number, scale: number) {
  const r = b.scene.add.image(x, y, 'ring').setBlendMode(ADD).setDepth(13).setScale(0.2).setScale(0.2, 0.08);
  b.scene.tweens.add({ targets: r, scaleX: scale, scaleY: scale * 0.35, alpha: 0, duration: 380, ease: 'Quad.out', onComplete: () => r.destroy() });
}
/** Impact lourd : hit-stop, secousse, poussière, débris, flash. */
function impact(b: Boss, x: number, y: number, power: number) {
  const sc = b.scene;
  sc.hitstop(0.035 * power);
  sc.cameras.main.shake(90 + 120 * power, 0.004 + 0.006 * power);
  sc.puffs(x, y, 3 * power);
  sc.debris(x, y - 2, 4 * power);
  if (power >= 2) sc.flashScreen(0.22);
}
/** Onde de pics de roche : une fissure rouge court au sol, les pics jaillissent derrière (écrasement → rebond),
 *  tiennent un instant puis se rétractent dans le sol (échelle, jamais à travers le dallage) en lâchant des gravillons. */
function spikeWave(b: Boss, x: number, dir: number) {
  const sc = b.scene, fy = b.floorY;
  const o = b.hazard('mord_spike', x, fy, dir * M.slam.waveSpeed * b.speed, 18, 15, 3).setAlpha(0);
  const halo = sc.add.image(x, fy - 2, 'glowR').setBlendMode(ADD).setDepth(10).setScale(0.9, 0.5).setAlpha(0.7);
  const keys = ['mord_spike3', 'mord_spike', 'mord_spike2'];
  let lastX = x - dir * 12, n = 0;
  o.on('destroy', () => halo.destroy());
  o.setData('tick', () => {
    halo.setPosition(o.x + dir * 4, fy - 2).setAlpha(0.5 + Math.random() * 0.3);
    if ((o.x - lastX) * dir < 11) return;
    lastX = o.x;
    const k = n++ % 3, sx = o.x + Phaser.Math.Between(-1, 1);
    // Fissure au sol qui s'éteint.
    const cr = sc.add.image(sx, fy + 1, 'mord_crack').setDepth(6).setFlipX(dir < 0);
    sc.tweens.add({ targets: cr, alpha: 0, delay: 250, duration: 400, onComplete: () => cr.destroy() });
    const sp = sc.add.image(sx, fy + 1, keys[k]).setOrigin(0.5, 1).setDepth(11).setFlipX(dir < 0).setScale(1.25, 0);
    sc.tweens.chain({
      targets: sp,
      tweens: [
        { scaleY: 1.15, scaleX: 0.9, duration: 55, ease: 'Quad.out' },
        { scaleY: 1, scaleX: 1, duration: 70, ease: 'Back.out' },
        { scaleY: 0, scaleX: 1.2, delay: 110, duration: 130, ease: 'Quad.in' },
      ],
      onComplete: () => { sp.destroy(); },
    });
    sc.time.delayedCall(250, () => sc.debris(sx, fy - 3, 1));
    if (k === 0) { sc.puffs(sx, fy, 1); sfx.crack(); }
  });
}
// ---------------------------------------------------------------- patterns

function* slash(b: Boss, tele = M.slash.tele, recover = M.slash.recover, last = true) {
  const p = b.parts, s = M.slash, sc = b.scene;
  b.face();
  b.eyes('tele'); sfx.warn();
  const tt = b.tele(tele);
  let tx = b.clampX(b.player.x + b.dir * s.overshoot);
  if ((tx - b.x) * b.dir < s.minDist) tx = b.clampX(b.x + b.dir * s.minDist);
  tx = b.clampX(Phaser.Math.Clamp(tx, b.x - s.maxDist, b.x + s.maxDist));
  // Anticipation : il se ramasse, recule d'un pas, épée armée loin derrière ; trajet en rouge au sol.
  b.tw(p.rig, { angle: -9, scaleX: 1.06, scaleY: 0.92 }, tt * 0.7);
  b.tw(p.sword, { angle: -85 }, tt * 0.7, 'Back.out');
  b.tw(b.root, { x: b.clampX(b.x - b.dir * 8) }, tt * 0.7);
  const line = b.temp(sc.add.rectangle(Math.min(b.x, tx), b.floorY - 3, Math.abs(tx - b.x), 3, COL.danger, 0.7).setOrigin(0, 0).setDepth(6));
  b.tw(line, { alpha: 0.15, repeat: -1, yoyo: true }, 0.12, 'Linear');
  yield tt * 0.55;
  glint(b, -85);
  yield tt * 0.45;
  // Ruée + taille : traînée pleine, images rémanentes.
  line.destroy();
  const d = b.t(s.dash);
  b.tw(b.root, { x: tx }, d, 'Expo.out');
  b.tw(p.rig, { angle: 12, scaleX: 1.1, scaleY: 0.96 }, d * 0.5);
  b.tw(p.sword, { angle: 125 }, d * 0.45, 'Quad.in');
  smearFx(b);
  ghostTrail(b);
  sc.time.delayedCall(d * 400, () => b.state === 'pattern' && ghostTrail(b));
  sc.puffs(b.x, b.floorY, 3);
  b.hitbox = () => new Phaser.Geom.Rectangle(b.dir > 0 ? b.x - 10 : b.x - s.reach, b.floorY - s.height, s.reach + 10, s.height);
  sfx.whoosh();
  yield d;
  b.hitbox = null;
  // La lame mord le sol.
  impact(b, b.x + b.dir * 62, b.floorY, 1);
  b.tw(p.sword, { angle: 132 }, 0.12, 'Back.out');
  sfx.thud();
  if (!last) { b.tw(p.rig, { angle: 4, scaleX: 1, scaleY: 1 }, 0.12); yield b.t(recover); return; }
  // Récupération : penché, essoufflé, yeux éteints.
  b.eyes('off');
  b.tw(p.rig, { angle: 7, scaleX: 1, scaleY: 0.95 }, 0.2);
  yield b.t(recover);
  b.eyes('on'); b.def.rest(b, 0.3);
}

function* slam(b: Boss, double = false) {
  const p = b.parts, s = M.slam, sc = b.scene;
  b.eyes('tele'); sfx.warn(); sfx.rumble();
  const tt = b.tele(s.tele);
  // Anticipation : l'épée tournoie deux fois dans sa main (traînée circulaire), puis il s'accroupit très bas.
  const spin = b.temp(sc.add.image(18, -44, 'smearR1').setBlendMode(ADD).setAlpha(0.55));
  (p.rig as Cont).add(spin);
  b.tw(p.sword, { angle: REST.sword - 720, onUpdate: () => { const sw = p.sword as Cont; spin.setAngle(sw.angle + 75).setPosition(sw.x, sw.y); } }, tt * 0.7, 'Sine.inOut');
  for (let i = 0; i < 3; i++) sc.time.delayedCall(i * tt * 240, () => b.state === 'pattern' && sfx.whoosh());
  b.tw(p.rig, { scaleX: 1.12, scaleY: 0.82, angle: 5 }, tt * 0.8, 'Quad.in');
  b.tw(p.head, { y: REST.headY + 6 }, tt * 0.8);
  for (let i = 0; i < 3; i++) sc.time.delayedCall(i * tt * 250, () => b.state === 'pattern' && sc.debris(b.x, b.floorY - 2, 2));
  yield tt * 0.7;
  spin.destroy(); glint(b, REST.sword);
  b.tw(p.sword, { angle: -20 }, tt * 0.3, 'Back.out');
  yield tt * 0.3;
  // Bond hors de l'écran.
  sfx.leap();
  b.tw(p.rig, { scaleX: 0.85, scaleY: 1.2, angle: 0 }, 0.12, 'Back.out');
  b.tw(p.head, { y: REST.headY }, 0.1);
  sc.puffs(b.x - 16, b.floorY, 4); sc.puffs(b.x + 16, b.floorY, 4); sc.debris(b.x, b.floorY, 6);
  ring(b, b.x, b.floorY - 3, 1.4);
  b.tw(b.root, { y: -80 }, b.t(s.rise), 'Quad.out');
  yield b.t(s.rise);
  // Repère au sol sous le joueur.
  const tx = b.clampX(b.player.x);
  b.root.x = tx; b.face();
  const mark = b.temp(sc.add.image(tx, b.floorY + 1, 'mord_mark').setDepth(6).setScale(1.3, 1.2));
  const halo = b.temp(sc.add.image(tx, b.floorY - 4, 'glowR').setDepth(6).setBlendMode(ADD).setScale(2, 0.8));
  const col = b.temp(sc.add.rectangle(tx, 0, 36, b.floorY, COL.danger, 0.18).setOrigin(0.5, 0).setDepth(6));
  b.tw([mark, halo], { alpha: 0.55, repeat: -1, yoyo: true }, 0.12, 'Linear');
  b.tw(col, { alpha: 0.06, repeat: -1, yoyo: true }, 0.12, 'Linear');
  sfx.warn();
  yield b.tele(s.mark);
  // Chute (étiré) puis impact (écrasé).
  b.tw(p.rig, { scaleX: 0.9, scaleY: 1.15 }, b.t(s.fall));
  // La chute traverse les plateformes : le corps reste dangereux pendant la descente.
  b.hitbox = () => new Phaser.Geom.Rectangle(b.x - 30, b.y - 86, 60, 86);
  b.tw(b.root, { y: b.floorY }, b.t(s.fall), 'Quad.in');
  yield b.t(s.fall);
  mark.destroy(); halo.destroy(); col.destroy();
  b.tw(p.rig, { scaleX: 1.25, scaleY: 0.75 }, 0.06);
  b.tw(p.sword, { angle: 150 }, 0.08);
  b.hitbox = () => new Phaser.Geom.Rectangle(tx - 34, b.floorY - 90, 68, 90);
  const boom = () => {
    sfx.slam();
    impact(b, tx, b.floorY, 2);
    ring(b, tx, b.floorY - 4, 2.4);
    for (const k of [-1, 1]) spikeWave(b, tx + k * 26, k);
  };
  boom();
  yield 0.1;
  b.hitbox = null;
  b.tw(p.rig, { scaleX: 1, scaleY: 0.94, angle: 6 }, 0.25);
  if (double) {
    const gap = Math.max(0.7, b.t(s.doubleGap));
    b.tw(p.sword, { angle: 40 }, gap * 0.6, 'Back.out');
    yield gap - 0.08;
    b.tw(p.sword, { angle: 150 }, 0.08, 'Quad.in');
    yield 0.08;
    boom();
  }
  b.eyes('off');
  yield b.t(s.recover);
  b.eyes('on'); b.def.rest(b, 0.3);
}

/** Fente + taille, puis revers montant sur place (il se retourne si on est passé derrière). */
function* swings(b: Boss, tele = M.slash.tele, recover = M.slash.recover, last = true) {
  const p = b.parts, s = M.swing, sc = b.scene;
  yield* slash(b, tele, 0, false);
  b.face(); b.eyes('tele');
  const w = b.t(s.wind);
  b.tw(p.rig, { angle: 9, scaleX: 1.05, scaleY: 0.93 }, w);
  b.tw(p.sword, { angle: 150 }, w, 'Back.out');
  glint(b, 150);
  yield w;
  const d = b.t(s.cut);
  b.tw(p.sword, { angle: -60 }, d, 'Quad.out');
  b.tw(p.rig, { angle: -11, scaleX: 1, scaleY: 1.06 }, d);
  b.tw(b.root, { x: b.clampX(b.x + b.dir * 26) }, d, 'Expo.out');
  smearFx(b, true);
  sc.puffs(b.x, b.floorY, 2);
  b.hitbox = () => new Phaser.Geom.Rectangle(b.dir > 0 ? b.x - 10 : b.x - M.slash.reach, b.floorY - s.height, M.slash.reach + 10, s.height);
  sfx.whoosh();
  yield d;
  b.hitbox = null;
  if (!last) { yield b.t(recover); return; }
  b.eyes('off');
  b.tw(p.rig, { angle: -4, scaleY: 0.96 }, 0.2);
  yield b.t(recover);
  b.eyes('on'); b.def.rest(b, 0.3);
}

/** Épée spectrale lancée : elle traque le joueur (virage borné) puis file droit. */
function homingBlade(b: Boss, x: number, y: number, a0: number) {
  const sc = b.scene, s = M.flurry, v = s.speed * b.speed;
  const o = b.hazard('mord_ghost', x, y, 0, 14, 14, s.life).setOrigin(0.5).setFlipX(false).setBlendMode(ADD).setData('once', true);
  (o.body as Phaser.Physics.Arcade.Body).setOffset((o.width - 14) / 2, (o.height - 14) / 2);
  let a = a0, t = 0, fx = 0;
  const aim = () => o.setRotation(a).setVelocity(Math.cos(a) * v, Math.sin(a) * v);
  aim();
  o.setData('tick', (dt: number) => {
    t += dt;
    if (t < s.home) {
      const want = Math.atan2(b.player.rect().centerY - o.y, b.player.x - o.x);
      a += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - a), -s.turn * dt, s.turn * dt);
      aim();
    }
    if (o.y > b.floorY - 3) { sc.sparks(o.x, b.floorY - 2, COL.danger, 8); sc.puffs(o.x, b.floorY, 1); o.setData('life', 0); return; }
    fx -= dt;
    if (fx > 0) return;
    fx = 0.045;
    const g = sc.add.image(o.x, o.y, 'mord_ghost').setRotation(a).setBlendMode(ADD).setAlpha(0.3).setDepth(14);
    sc.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
    sc.sparks(o.x, o.y, COL.danger, 1);
  });
}

/** Rafale : l'épée tournoie au-dessus de la tête, des lames spectrales se forment et visent, puis partent une à une. */
function* flurry(b: Boss, count = M.flurry.count) {
  const p = b.parts, s = M.flurry, sc = b.scene;
  b.face(); b.eyes('tele'); sfx.warn();
  const tt = b.tele(s.tele);
  b.tw(p.rig, { angle: -6, scaleY: 0.97 }, tt * 0.4);
  b.tw(p.sword, { angle: REST.sword - 1080 }, tt, 'Cubic.in');
  for (let i = 0; i < 4; i++) sc.time.delayedCall(i * tt * 250, () => b.state === 'pattern' && sfx.whoosh());
  const ghosts = [...Array(count)].map((_, i) => {
    const k = i - (count - 1) / 2;
    const g = b.temp(sc.add.image(b.x + k * 34, b.y - 118 + Math.abs(k) * 10, 'mord_ghost').setBlendMode(ADD).setAlpha(0).setScale(0.3).setDepth(14));
    b.tw(g, { alpha: 0.9, scale: 1, onUpdate: () => g.setRotation(Math.atan2(b.player.rect().centerY - g.y, b.player.x - g.x)) }, tt, 'Back.out');
    sc.sparks(g.x, g.y, COL.danger, 4);
    return g;
  });
  yield tt;
  b.tw(p.sword, { angle: 110 }, 0.1, 'Quad.in');
  smearFx(b);
  for (let i = 0; i < count; i++) {
    const g = ghosts[i];
    homingBlade(b, g.x, g.y, Math.atan2(b.player.rect().centerY - g.y, b.player.x - g.x));
    sc.sparks(g.x, g.y, COL.danger, 8); sfx.blade();
    g.destroy();
    if (i < count - 1) yield b.t(s.gap);
  }
  b.eyes('off');
  b.tw(p.rig, { angle: 6, scaleY: 0.95 }, 0.2);
  yield b.t(s.recover);
  b.eyes('on'); b.def.rest(b, 0.3);
}

/** Charge à l'épaule : épaule baissée, épée traînée, ruée qui accélère, freinage dans la poussière. */
function* charge(b: Boss) {
  const p = b.parts, s = M.charge, sc = b.scene;
  b.face(); b.eyes('tele'); sfx.warn();
  const tt = b.tele(s.tele);
  const tx = b.clampX(b.x + b.dir * Math.min(s.dist, Math.abs(b.player.x - b.x) + 70));
  b.tw(p.rig, { angle: 15, scaleX: 1.08, scaleY: 0.9 }, tt * 0.8);
  b.tw(p.sword, { angle: -140 }, tt * 0.8, 'Back.out');
  b.tw(b.root, { x: b.clampX(b.x - b.dir * 8) }, tt * 0.8);
  const zone = b.temp(sc.add.rectangle(Math.min(b.x, tx), b.floorY - 80, Math.abs(tx - b.x) + 1, 80, COL.danger, 0.14).setOrigin(0).setDepth(6));
  b.tw(zone, { alpha: 0.05, yoyo: true, repeat: -1 }, 0.1, 'Linear');
  for (let i = 0; i < 3; i++) sc.time.delayedCall(i * tt * 300, () => b.state === 'pattern' && sc.debris(b.x, b.floorY - 2, 2));
  yield tt;
  zone.destroy(); sfx.leap(); sfx.whoosh();
  const d = Math.max(0.12, Math.abs(tx - b.x) / (s.speed * b.speed));
  b.tw(b.root, { x: tx }, d, 'Quad.in');
  b.hitbox = () => new Phaser.Geom.Rectangle(b.x - 24, b.y - 82, 48, 82);
  for (let k = 0; k < d / 0.05; k++) sc.time.delayedCall(k * 50, () => b.state === 'pattern' && ghostTrail(b));
  yield d;
  b.hitbox = null;
  impact(b, b.x + b.dir * 20, b.floorY, 1); sfx.thud(); sfx.scrape();
  b.tw(b.root, { x: b.clampX(b.x + b.dir * 20) }, 0.22, 'Quad.out');
  b.tw(p.rig, { angle: -6, scaleX: 1, scaleY: 0.95 }, 0.2);
  b.eyes('off');
  yield b.t(s.recover);
  b.eyes('on'); b.def.rest(b, 0.3);
}

/** Phase 2 : il se dissout, réapparaît derrière le joueur (repère au sol), puis fente + revers. */
function* warp(b: Boss) {
  const p = b.parts, s = M.warp, sc = b.scene;
  b.eyes('tele'); sfx.warn(); sfx.whoosh();
  sc.sparks(b.x, b.y - 50, COL.danger, 18); sc.puffs(b.x, b.floorY, 4);
  b.tw(p.rig, { alpha: 0, scaleX: 0.5, scaleY: 1.35 }, 0.18, 'Quad.in');
  yield 0.2;
  const side = Math.sign(b.player.x - b.x) || 1;
  let tx = b.clampX(b.player.x + side * s.behind);
  if (Math.abs(tx - b.player.x) < 40) tx = b.clampX(b.player.x - side * s.behind);
  b.root.x = tx;
  const mark = b.temp(sc.add.image(tx, b.floorY + 1, 'mord_mark').setDepth(6));
  const col = b.temp(sc.add.rectangle(tx, b.floorY - 90, 40, 90, COL.danger, 0.15).setOrigin(0.5, 0).setDepth(6));
  b.tw([mark, col], { alpha: 0.4, yoyo: true, repeat: -1 }, 0.1, 'Linear');
  yield b.tele(s.mark);
  mark.destroy(); col.destroy();
  b.face();
  b.tw(p.rig, { alpha: 1, scaleX: 1, scaleY: 1 }, 0.12, 'Back.out');
  sc.sparks(tx, b.y - 50, COL.danger, 14); ring(b, tx, b.floorY - 3, 1.6); sfx.clank();
  yield 0.12;
  yield* swings(b, 0.45);
}

function* combo(b: Boss) {
  const t = M.combo.teles;
  yield* swings(b, t[0], 0.15, false);
  yield* slash(b, t[1], 0.25, false);
  yield* slash(b, t[2], M.combo.recover, true);
}
export const MORDREC: BossDef = {
  name: 'YSOLDE',
  title: "LA DAME D'ARGENT",
  hp: M.hp,
  hurt: { w: 40, h: 86 },
  build(b) {
    const sc = b.scene;
    const body = sc.add.image(0, 0, 'mord_body').setOrigin(0.5, 1);
    const blade = sc.add.image(0, 0, 'mord_sword').setOrigin(0.5, 70 / 84);
    const fist = sc.add.image(0, 0, 'mord_fist');
    const sword = sc.add.container(18, -44, [blade, fist]);
    const arm = sc.add.graphics();
    const pauldron = sc.add.image(0, -68, 'mord_pauldron').setOrigin(0);
    const headImg = sc.add.image(0, 0, 'mord_head').setOrigin(0.5, 1);
    const eyes = sc.add.image(4, -12, 'mord_eyes');
    const glow = sc.add.image(4, -12, 'glowW').setBlendMode(ADD).setScale(0.35);
    const hairTop = sc.add.image(0, 0, 'mord_hair').setOrigin(HAIR.ox / HAIR.w, 0);
    const jx = Math.round(hairX(HAIR.join + 1));
    const hairLow = sc.add.image(0, 0, 'mord_hair2').setOrigin((HAIR.ox + jx) / HAIR.w, 0);
    const hairEnd = sc.add.container(jx, HAIR.join, [hairLow]);
    const hair = sc.add.container(-5, -20, [hairEnd, hairTop]);
    const head = sc.add.container(2, REST.headY, [hair, headImg, glow, eyes]);
    // rig : inclinaison / écrasement autour des pieds ; root : position + orientation.
    const rig = sc.add.container(0, 0, [body, head, arm, pauldron, sword]);
    b.root.add(rig);
    b.parts = { rig, body, sword, blade, head, headImg, eyes, glow, pauldron };
    b.flashParts = [body, headImg, hairTop, hairLow, blade, fist, pauldron];
    const drive = () => { driveArm(b, sword, arm); driveHair(b, hair, hairEnd); };
    sc.events.on(Phaser.Scenes.Events.PRE_RENDER, drive);
    sc.events.once(Phaser.Scenes.Events.SHUTDOWN, () => sc.events.off(Phaser.Scenes.Events.PRE_RENDER, drive));
    this.rest(b, 0);
    sc.tweens.add({ targets: headImg, y: 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  },
  rest(b, sec) {
    const p = b.parts;
    const pose: [object, object][] = [[p.sword, { angle: REST.sword }], [p.head, { y: REST.headY, x: 2, angle: 0 }], [p.rig, { angle: 0, scaleX: 1, scaleY: 1, x: 0, y: 0, alpha: 1 }], [p.body, { scaleY: 1 }]];
    for (const [t, props] of pose) {
      if (sec <= 0) Object.assign(t, props);
      // Tweens non enregistrés : ils doivent survivre à la fin du pattern.
      else b.scene.tweens.add({ targets: t, ...props, duration: sec * 1000, ease: 'Quad.out' });
    }
  },
  step(b) {
    const sc = b.scene;
    sc.tweens.add({ targets: b.parts.rig, y: { from: 2, to: 0 }, scaleY: { from: 0.97, to: 1 }, duration: 200, ease: 'Quad.out' });
    sc.puffs(b.x - b.dir * 8, b.floorY, 1);
    sfx.step();
  },
  roar(b) {
    const sc = b.scene, p = b.parts;
    sc.tweens.add({ targets: p.rig, angle: -12, scaleY: 1.06, duration: 200, ease: 'Back.out' });
    sc.tweens.add({ targets: p.head, y: REST.headY - 4, duration: 200 });
    sc.tweens.add({ targets: p.sword, angle: -30, duration: 250, ease: 'Back.out' });
    // L'épée s'embrase de rouge sombre : ses coups deviennent plus lourds.
    (p.blade as Img).setTexture('mord_sword_r');
    sc.sparks(b.x + b.dir * 18, b.y - 90, COL.danger, 20);
    for (let i = 0; i < 3; i++) sc.time.delayedCall(i * 220, () => ring(b, b.x, b.y - 60, 3 + i));
    sc.puffs(b.x - 20, b.floorY, 5); sc.puffs(b.x + 20, b.floorY, 5); sc.debris(b.x, b.floorY, 8);
    sc.time.delayedCall(800, () => this.rest(b, 0.25));
  },
  death(b) {
    const sc = b.scene, p = b.parts, x = b.x, y = b.y;
    sc.time.addEvent({
      delay: 110, repeat: 7,
      callback: () => { sc.sparks(x + Phaser.Math.Between(-20, 20), y - Phaser.Math.Between(10, 80), 0xd8d0ff, 8); sc.debris(x, y - 40, 3); sfx.clank(); },
    });
    // L'armure se disloque : heaume qui saute, épée qui tombe à plat, corps qui s'affaisse.
    sc.tweens.chain({ targets: p.head, tweens: [
      { y: REST.headY - 26, angle: -40, duration: 350, ease: 'Quad.out' },
      { y: -8, x: -34, angle: -100, duration: 450, ease: 'Bounce.out' },
    ] });
    (p.sword as Cont).setData('free', true); // le bras se défait, l'épée tombe
    sc.tweens.chain({ targets: p.sword, tweens: [{ angle: 60, duration: 300, ease: 'Quad.in' }, { angle: 92, y: -4, duration: 400, ease: 'Bounce.out' }] });
    sc.tweens.add({ targets: p.body, scaleY: 0.62, duration: 900, delay: 200, ease: 'Bounce.out' });
    sc.tweens.add({ targets: p.pauldron, y: -42, duration: 900, delay: 200, ease: 'Bounce.out' }); // suit le buste qui s'affaisse
    sc.time.delayedCall(1700, () => {
      sc.puffs(x, y, 10); sc.debris(x, y - 20, 12); sc.flashScreen(0.2);
      sc.tweens.add({ targets: b.root, alpha: 0, duration: 600 });
    });
  },
  /** Splash art (×2 à l'écran : l'annonceur agrandit le portrait ×3). */
  portrait(sc) {
    return sc.add.container(0, 0, [sc.add.image(0, 0, 'mord_splash').setOrigin(0.5, 1).setScale(2 / 3)]);
  },
  patterns: [
    { name: 'swings', weight: 3, phase: 0, run: (b) => swings(b) },
    { name: 'twirl', weight: 2, phase: 0, run: (b) => slam(b), far: true, elevated: true },
    { name: 'flurry', weight: 2, phase: 1, run: (b) => flurry(b), far: true, elevated: true },
    { name: 'charge', weight: 2, phase: 0, run: charge, far: true },
    { name: 'warp', weight: 3, phase: 2, run: warp, far: true },
    { name: 'combo', weight: 2, phase: 2, run: combo },
    { name: 'flurry3', weight: 2, phase: 2, run: (b) => flurry(b, 3), far: true, elevated: true },
    { name: 'twirl2', weight: 2, phase: 2, run: (b) => slam(b, true), far: true, elevated: true },
  ],
};
