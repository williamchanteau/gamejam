import Phaser from 'phaser';
import { beam, canvasTex, ell, OUTLINE, poly } from './pixel';

type C = CanvasRenderingContext2D;
const R = (c: C, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
/** Pseudo-hasard stable (les textures sont régénérées à l'identique). */
const rnd = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

const SK = '#eebf9a', SKD = '#d39a78', SKDD = '#ad7558', SKL = '#fbdcc0', PINK = '#e8928c';
const HAIR = '#3a2a22', HAIRL = '#5c4332', STUB = '#b9977c';
const TEE = '#7f8498', TEED = '#60657a', TEEL = '#a0a5b8', SLV = '#23222c', SLVL = '#3d3c4a';
const JN = '#2b3560', JND = '#1c2342', JNL = '#3f4b7e';
const GOLD = '#ffd36a', GOLDD = '#c8902a', GOLDDD = '#8a5c1c', GOLDL = '#fff0b0';
const VEL = '#3a1f5a', VELD = '#28143f', VELL = '#54307c';
const WOOD = '#6a4428', WOODD = '#3f2716', WOODL = '#8f6036';
const K = '#ff2a5a', KD = '#b0123c', KL = '#ff8aa2';

export type Mood = { mad?: boolean; mouth?: 'shut' | 'open' | 'chew' };

function head(c: C, m: Mood) {
  const X = 30;
  // Touffes hirsutes sur les côtés du crâne chauve, mèche longue derrière.
  poly(c, HAIR, [13, 12, 2, 7, 8, 16, 0, 16, 7, 21, 1, 25, 8, 27, 3, 33, 13, 30]);
  poly(c, HAIR, [47, 12, 58, 7, 52, 16, 60, 16, 53, 21, 59, 25, 52, 27, 57, 33, 47, 30]);
  R(c, HAIRL, 5, 17, 3, 1); R(c, HAIRL, 53, 17, 3, 1); R(c, HAIRL, 4, 24, 3, 1); R(c, HAIRL, 54, 24, 3, 1);
  // Mâchoire large et crâne.
  ell(c, SKD, X, 29, 21, 13);
  ell(c, SK, X, 19, 19, 18);
  ell(c, SK, X + 1, 28, 20, 12);
  ell(c, SKL, X + 5, 7, 9, 3.5);
  R(c, SKD, X - 8, 10, 8, 1); R(c, SKD, X + 2, 11, 9, 1); // rides du front
  // Barbe de trois jours : mouchetis sur toute la mâchoire.
  for (let y = 27; y < 42; y++) for (let x = 9; x < 52; x++) {
    const inJaw = ((x + 0.5 - X - 1) / 20) ** 2 + ((y + 0.5 - 28) / 12) ** 2 <= 1;
    if (inJaw && rnd(x * 31 + y) < 0.42) R(c, STUB, x, y);
  }
  // Double menton.
  R(c, SKDD, X - 11, 40, 23, 1);
  // Rougeurs sur les joues.
  for (const [x, y] of [[13, 26], [15, 28], [12, 29], [47, 26], [45, 28], [48, 29]]) R(c, PINK, x, y, 2, 1);
  // Lunettes rondes (le blanc du verre fait tout le regard).
  const lx = [X - 8, X + 10], ly = 19;
  R(c, '#9aa0b4', 8, ly - 1, lx[0] - 12, 1); R(c, '#9aa0b4', lx[1] + 7, ly - 1, 6, 1); // branches
  for (const x of lx) { ell(c, '#6c7288', x, ly, 8, 8); ell(c, '#f4f8ff', x, ly, 6.5, 6.5); R(c, '#cfdcf0', x - 4, ly - 4, 3, 1); }
  R(c, '#6c7288', lx[0] + 7, ly - 2, 4, 2);
  for (const x of lx) R(c, '#14121c', x + 1, ly - (m.mad ? 0 : 1), 2, m.mad ? 2 : 3);
  // Sourcils.
  for (const [i, x] of lx.entries()) {
    if (m.mad) beam(c, HAIR, x - 7, ly - (i ? 3 : 10), x + 7, ly - (i ? 10 : 3), 2.4);
    else R(c, HAIR, x - 5, ly - 10, 11, 2);
  }
  // Nez.
  ell(c, SKD, X + 2, 28, 3, 2); R(c, SKL, X + 2, 26, 2, 1);
  // Bouche.
  if (m.mouth === 'open') {
    ell(c, '#2a0f14', X + 1, 35, 11, 6.5);
    R(c, '#f4f0e0', X - 6, 31, 15, 2);
    ell(c, '#d0707c', X + 1, 39, 6, 2.5);
  } else if (m.mouth === 'chew') {
    ell(c, SKL, X - 13, 33, 4, 4); ell(c, SKL, X + 14, 33, 4, 4); // joues pleines
    R(c, '#7a4a3a', X - 5, 34, 11, 1); R(c, '#7a4a3a', X - 3, 35, 7, 1);
  } else if (m.mad) {
    R(c, '#2a0f14', X - 7, 33, 16, 4); for (let x = X - 6; x < X + 8; x += 3) R(c, '#f4f0e0', x, 33, 2, 4);
  } else {
    R(c, '#7a4a3a', X - 5, 34, 12, 1); R(c, SKDD, X - 2, 36, 6, 1);
  }
}

function torso(c: C) {
  const X = 42;
  // Empiècements noirs (manches raglan) aux épaules.
  poly(c, SLV, [7, 16, 24, 2, 60, 2, 77, 16, 77, 30, 64, 24, 20, 24, 7, 30]);
  R(c, SLVL, 26, 3, 32, 1);
  // Tee-shirt gris, remonté et roulé au-dessus du ventre.
  poly(c, TEED, [28, 6, 56, 6, 69, 20, 70, 37, 14, 37, 15, 20]);
  poly(c, TEE, [30, 6, 56, 6, 67, 21, 67, 36, 21, 36, 20, 20]);
  poly(c, TEEL, [48, 7, 56, 7, 64, 20, 60, 26, 50, 16]);
  R(c, TEED, 26, 22, 12, 1); R(c, TEED, 22, 21, 5, 1); R(c, TEED, 47, 22, 13, 1); R(c, TEED, 60, 21, 4, 1); // plis de poitrine
  ell(c, SLV, X, 5, 14, 4.5); ell(c, SKD, X, 3, 10, 3); // col
  for (let x = 13; x < 72; x++) {
    const k = ((x - X) / 29) ** 2, y = 34 + Math.round(k * 3);
    R(c, TEEL, x, y, 1, 1); R(c, TEE, x, y + 1, 1, 2); R(c, TEED, x, y + 3, 1, 1);
    if (x % 9 === 0) R(c, TEED, x, y, 1, 3);
  }
}

function belly(c: C) {
  const X = 38, Y = 27;
  ell(c, SKDD, X, Y, 37, 26);
  ell(c, SKD, X, Y - 1, 36, 24.5);
  ell(c, SK, X + 2, Y - 3, 32, 20.5);
  ell(c, SKL, X + 12, Y - 9, 14, 8);
  ell(c, '#fdeada', X + 15, Y - 12, 6, 3);
  // Plis, nombril, poils.
  for (let x = 10; x < 28; x++) R(c, SKD, x, Y + 12 + Math.round(((x - 19) / 9) ** 2 * -3));
  ell(c, SKDD, X + 1, Y + 6, 3, 4); ell(c, '#5a3424', X + 1, Y + 6, 1.6, 2.6);
  for (let i = 0; i < 46; i++) {
    const a = rnd(i) * Math.PI * 2, d = rnd(i + 90) * 0.92, x = X + Math.cos(a) * 33 * d, y = Y + Math.sin(a) * 22 * d;
    if (y < Y - 8 && x > X + 4) continue; // rien sur le reflet
    R(c, '#8a5f46', Math.round(x), Math.round(y), 1, 2);
  }
  for (let y = Y + 12; y < Y + 22; y += 2) R(c, '#6c4632', X + (y % 4 ? 1 : 2), y, 1, 2);
}

function leg(c: C) {
  // Jean foncé, ourlet, sandale à sangles.
  R(c, JN, 2, 0, 22, 26); R(c, JND, 2, 0, 5, 26); R(c, JNL, 19, 0, 3, 25); R(c, JND, 13, 4, 1, 22);
  R(c, JND, 2, 25, 22, 2);
  R(c, SK, 7, 27, 13, 5); R(c, SKD, 7, 27, 3, 5);
  R(c, '#8d8f9e', 6, 28, 15, 2);
  R(c, '#4a3628', 2, 32, 24, 2); R(c, '#2e2118', 2, 34, 24, 1);
  R(c, SK, 19, 30, 6, 2); R(c, SKD, 21, 30, 1, 2); R(c, SKD, 23, 30, 1, 2);
}

function arm(c: C, bracer: boolean) {
  const X = 12;
  ell(c, SLV, X, 7, 10, 7); R(c, SLV, 2, 7, 20, 10); R(c, SLVL, 15, 4, 5, 1); // manche courte noire
  R(c, '#14131b', 2, 16, 20, 2);
  R(c, SK, 5, 18, 14, 19); R(c, SKD, 5, 18, 3, 19); R(c, SKL, 15, 19, 3, 16);
  for (let i = 0; i < 14; i++) R(c, '#6c4632', 7 + Math.floor(rnd(i + 7) * 10), 19 + Math.floor(rnd(i + 40) * 16), 1, 2); // bras velus
  if (bracer) { // brassard de cuir clouté
    R(c, '#4a3a32', 4, 29, 16, 9); R(c, '#6e5a4c', 4, 29, 16, 1); R(c, '#2e231e', 4, 37, 16, 1);
    for (const x of [7, 12, 17]) for (const y of [31, 35]) R(c, '#b4b4c0', x, y);
  }
  ell(c, SKD, X, 42, 8, 6.5); ell(c, SK, X + 1, 41.5, 7, 5.5);
  R(c, SKD, 8, 45, 1, 2); R(c, SKD, 12, 45, 1, 2); R(c, SKD, 16, 45, 1, 2);
}

function crown(c: C) {
  const col = [GOLDD, GOLD, GOLDL];
  poly(c, GOLDD, [2, 18, 1, 5, 8, 11, 12, 2, 17, 10, 22, 2, 26, 11, 33, 5, 32, 18]);
  poly(c, GOLD, [4, 17, 3, 8, 8, 13, 12, 5, 17, 12, 22, 5, 26, 13, 31, 8, 30, 17]);
  R(c, col[0], 2, 15, 30, 4); R(c, col[2], 3, 15, 28, 1);
  for (const x of [1, 12, 22, 33]) ell(c, GOLDL, x, 3, 1.6, 1.6);
  ell(c, '#7ff6ff', 17, 17, 2, 1.6); ell(c, '#b48cff', 8, 17, 1.6, 1.4); ell(c, '#b48cff', 26, 17, 1.6, 1.4);
}

/** Burger 24×19, `bite` = rayon de la bouchée retirée (le dessin de la nourriture reste à l'écart du rouge). */
function burger(c: C, bite = 0) {
  ell(c, '#b8701f', 12, 8, 11, 7);
  ell(c, '#e8a548', 12, 7, 10, 5.5);
  R(c, '#fbd896', 6, 3, 5, 1);
  for (const [x, y] of [[8, 5], [13, 3], [17, 5], [12, 7], [5, 7], [19, 8]]) R(c, '#fff4d0', x, y, 2, 1);
  c.clearRect(0, 10, 24, 12);
  for (let x = 1; x < 23; x++) R(c, x % 3 ? '#74c44e' : '#4a9a38', x, 10, 1, x % 4 === 0 ? 2 : 1);
  R(c, '#ffd23f', 2, 11, 20, 1); R(c, '#ffd23f', 7, 12, 5, 1); R(c, '#ffd23f', 8, 13, 3, 1);
  R(c, '#5a3018', 1, 12, 22, 3); R(c, '#7a4424', 2, 12, 5, 1); R(c, '#7a4424', 13, 12, 9, 1); R(c, '#ffd23f', 8, 12, 3, 1);
  R(c, '#ff9a3a', 2, 15, 20, 1);
  R(c, '#e0a048', 2, 16, 20, 2); R(c, '#b8701f', 3, 18, 18, 1);
  if (bite) for (let i = 0; i < 4; i++) {
    const bx = 24, by = 3 + i * 5, r = bite;
    for (let y = 0; y < 19; y++) for (let x = 0; x < 24; x++) if (Math.hypot(x + 0.5 - bx, y + 0.5 - by) < r) c.clearRect(x, y, 1, 1);
  }
}

function throne(c: C) {
  const X = 56;
  // Dossier : cadre doré, velours capitonné.
  c.translate(0, 40); // dossier très haut : y < 0 = au-dessus de l'assise d'origine
  ell(c, GOLDD, X, -10, 37, 30); R(c, GOLDD, 19, -10, 74, 118);
  ell(c, GOLD, X, -10, 35, 28); R(c, GOLD, 21, -10, 70, 118);
  ell(c, VELD, X, -8, 30, 25); R(c, VELD, 26, -8, 60, 114);
  ell(c, VEL, X, -7, 27, 22); R(c, VEL, 29, -7, 54, 112);
  for (let y = -18; y < 104; y += 14) for (let x = 34 + (y % 28 ? 7 : 0); x < 82; x += 14) { ell(c, VELL, x, y, 2, 2); R(c, VELD, x, y + 2, 1, 1); }
  // Crête en couronne et pommeaux.
  poly(c, GOLDD, [40, -28, 38, -40, 47, -33, 56, -40, 65, -33, 74, -40, 72, -28]);
  poly(c, GOLDL, [43, -29, 42, -35, 48, -30, 56, -37, 64, -30, 70, -35, 69, -29]);
  ell(c, '#7ff6ff', X, -30, 2, 2);
  for (const x of [17, 95]) { ell(c, GOLDD, x, -10, 6, 6); ell(c, GOLDL, x + 1, -11, 3, 3); }
  for (const x of [22, 88]) for (let y = 4; y < 92; y += 9) R(c, GOLDDD, x, y, 2, 4); // gorges du cadre
  // Assise, accoudoirs, pieds griffus.
  R(c, GOLDD, 8, 106, 96, 12); R(c, GOLDL, 8, 106, 96, 1); R(c, GOLD, 10, 108, 92, 7);
  R(c, VELD, 15, 96, 82, 10); R(c, VEL, 15, 95, 82, 8); R(c, VELL, 17, 95, 78, 1);
  for (const x of [5, 93]) {
    R(c, GOLDD, x, 76, 14, 34); R(c, GOLD, x + 2, 76, 10, 32);
    ell(c, GOLDD, x + 7, 74, 9, 5); ell(c, GOLDL, x + 7, 73, 7, 3);
  }
  for (const x of [12, 88]) {
    R(c, GOLDDD, x, 118, 12, 26); R(c, GOLDD, x + 2, 118, 8, 24);
    ell(c, GOLDDD, x + 6, 146, 9, 4); for (const d of [-6, 0, 6]) R(c, GOLD, x + 6 + d, 146, 2, 3);
  }
  R(c, GOLDDD, 24, 118, 64, 8); ell(c, GOLD, X, 121, 8, 4); ell(c, GOLDDD, X, 121, 5, 2);
  // Saleté : moutarde, sauce séchée, graisse, coulures.
  const stain = (i: number, x: number, y: number, col: string, r: number) => {
    ell(c, col, x, y, r, r * 0.7);
    for (let k = 0; k < 7; k++) R(c, col, Math.round(x + (rnd(i + k) - 0.5) * r * 3.4), Math.round(y + (rnd(i + k + 30) - 0.5) * r * 2.6));
    for (let k = 0; k < 3; k++) { const dx = Math.round((rnd(i + k + 60) - 0.5) * r * 1.6); R(c, col, x + dx, y, 1, 4 + Math.round(rnd(i + k + 70) * r * 1.4)); }
  };
  stain(11, 44, -14, '#c8a030', 4); stain(12, 70, 6, '#5a4630', 5); stain(13, 38, 16, '#7a3618', 4);
  stain(1, 40, 42, '#c8a030', 5); stain(2, 72, 60, '#7a3618', 6); stain(3, 48, 80, '#5a4630', 5);
  stain(4, 70, 28, '#7a3618', 3); stain(5, 12, 86, '#c8a030', 3); stain(6, 98, 84, '#7a3618', 4);
  stain(7, 34, 100, '#c8a030', 4); stain(8, 78, 98, '#5a4630', 4); stain(9, 60, 110, '#7a3618', 3); stain(10, 26, 62, '#5a4630', 3);
}

function table(c: C) {
  const w = 170;
  R(c, WOOD, 0, 0, w, 5); R(c, WOODL, 0, 0, w, 1); R(c, WOODD, 0, 5, w, 2);
  for (let x = 12; x < w; x += 29) R(c, WOODD, x, 1, 1, 4);
  // Nappe violette à galon doré, qui pend au centre.
  R(c, VEL, 28, 0, 114, 4); R(c, VELL, 28, 0, 114, 1);
  for (let x = 28; x < 142; x++) { const h = 13 + ((x >> 2) % 2); R(c, VELD, x, 4, 1, h - 4); R(c, GOLDD, x, h, 1, 1); }
  // Pieds en X.
  for (const x of [14, 148]) { beam(c, WOODD, x, 7, x + 12, 27, 3); beam(c, WOOD, x + 12, 7, x, 27, 3); }
  R(c, WOODD, 20, 14, 8, 1); R(c, WOODD, 142, 14, 8, 1);
}

function chair(c: C) {
  R(c, WOODD, 2, 2, 18, 40); R(c, WOOD, 4, 4, 14, 36); R(c, VEL, 6, 8, 10, 26); R(c, VELL, 6, 8, 10, 1);
  ell(c, WOODL, 3, 3, 2, 2); ell(c, WOODL, 19, 3, 2, 2); R(c, WOODL, 4, 2, 14, 1);
}

function lustre(c: C) {
  R(c, '#3d4463', 44, 0, 2, 26);
  ell(c, GOLDDD, 45, 33, 36, 5); ell(c, GOLDD, 45, 32, 34, 4); ell(c, '#0b0a14', 45, 31, 28, 2.5);
  for (const x of [13, 29, 45, 61, 77]) {
    R(c, '#efe6d0', x - 1, 21, 3, 9); R(c, GOLD, x, 18, 1, 3); R(c, '#fff0b0', x, 17, 1, 2);
  }
  beam(c, '#3d4463', 44, 8, 16, 30, 1); beam(c, '#3d4463', 46, 8, 74, 30, 1);
}

export function makeMcKingArt(s: Phaser.Scene) {
  // Corps.
  canvasTex(s, 'mck_head', 60, 44, (c) => head(c, {}), OUTLINE);
  canvasTex(s, 'mck_head_chew', 60, 44, (c) => head(c, { mouth: 'chew' }), OUTLINE);
  canvasTex(s, 'mck_head_open', 60, 44, (c) => head(c, { mouth: 'open' }), OUTLINE);
  canvasTex(s, 'mck_head_mad', 60, 44, (c) => head(c, { mad: true }), OUTLINE);
  canvasTex(s, 'mck_head_mad_open', 60, 44, (c) => head(c, { mad: true, mouth: 'open' }), OUTLINE);
  canvasTex(s, 'mck_torso', 84, 42, torso, OUTLINE);
  canvasTex(s, 'mck_belly', 78, 54, belly, OUTLINE);
  canvasTex(s, 'mck_leg', 28, 36, leg, OUTLINE);
  canvasTex(s, 'mck_arm_f', 24, 50, (c) => arm(c, true), OUTLINE);
  canvasTex(s, 'mck_arm_b', 24, 50, (c) => arm(c, false), OUTLINE);
  canvasTex(s, 'mck_crown', 35, 21, crown, OUTLINE);
  canvasTex(s, 'mck_eyes', 24, 6, (c) => { R(c, '#fff', 2, 1, 4, 4); R(c, '#fff', 20, 1, 4, 4); });
  // Burgers et morceaux.
  canvasTex(s, 'burger', 26, 21, (c) => { c.translate(1, 1); burger(c); }, OUTLINE);
  canvasTex(s, 'burger_b1', 26, 21, (c) => { c.translate(1, 1); burger(c, 5); }, OUTLINE);
  canvasTex(s, 'burger_b2', 26, 21, (c) => { c.translate(1, 1); burger(c, 10); }, OUTLINE);
  canvasTex(s, 'burger_b3', 26, 21, (c) => { c.translate(1, 1); burger(c, 15); }, OUTLINE);
  canvasTex(s, 'bun_top', 26, 12, (c) => { c.translate(1, 1); burger(c); c.clearRect(-1, 9, 26, 12); }, OUTLINE);
  canvasTex(s, 'patty', 26, 8, (c) => {
    R(c, '#ffd23f', 3, 1, 20, 1); R(c, '#5a3018', 1, 2, 24, 4); R(c, '#7a4424', 3, 2, 20, 1); R(c, '#ffd23f', 9, 2, 5, 2);
  }, OUTLINE);
  canvasTex(s, 'bun_bot', 22, 22, (c) => { // brioche du bas, roule comme une roue
    ell(c, '#b8701f', 11, 11, 10, 10); ell(c, '#e0a048', 11, 11, 8, 8); ell(c, '#b8701f', 11, 11, 5, 5); ell(c, '#e0a048', 11, 11, 2.5, 2.5); R(c, '#fbd896', 7, 4, 4, 1);
  }, OUTLINE);
  // Dangers : ketchup, rot.
  canvasTex(s, 'mck_wave', 32, 24, (c) => {
    poly(c, KD, [0, 24, 2, 14, 9, 6, 20, 1, 30, 4, 25, 8, 28, 16, 32, 24]);
    poly(c, K, [3, 24, 5, 15, 11, 8, 20, 4, 26, 5, 22, 9, 25, 17, 28, 24]);
    poly(c, KL, [8, 15, 12, 9, 19, 6, 15, 11, 11, 18]);
  }, OUTLINE);
  canvasTex(s, 'mck_splat', 40, 9, (c) => {
    ell(c, KD, 20, 5, 19, 3.5); ell(c, K, 20, 4.5, 16, 2.6); R(c, KL, 11, 3, 9, 1); ell(c, K, 3, 2, 2, 1.5); ell(c, K, 36, 2, 2, 1.5);
  }, OUTLINE);
  canvasTex(s, 'mck_gas', 22, 40, (c) => {
    poly(c, KD, [2, 0, 12, 4, 19, 13, 21, 20, 19, 27, 12, 36, 2, 40, 8, 31, 12, 20, 8, 9]);
    poly(c, K, [6, 4, 13, 8, 17, 14, 18, 20, 17, 26, 13, 32, 6, 36, 10, 29, 13, 20, 10, 11]);
    R(c, KL, 15, 15, 1, 10);
  }, OUTLINE);
  canvasTex(s, 'mck_mark', 44, 6, (c) => ell(c, '#fff', 22, 3, 22, 3));
  canvasTex(s, 'xslash', 38, 38, (c) => {
    beam(c, '#2f8fb0', 5, 5, 33, 33, 3.4); beam(c, '#2f8fb0', 5, 33, 33, 5, 3.4);
    beam(c, '#7ff6ff', 5, 5, 33, 33, 2); beam(c, '#7ff6ff', 5, 33, 33, 5, 2);
    beam(c, '#fff', 11, 11, 27, 27, 1); beam(c, '#fff', 11, 27, 27, 11, 1);
  });
  // Trône souillé et salle à manger.
  canvasTex(s, 'din_throne', 112, 190, throne, OUTLINE);
  canvasTex(s, 'din_table', 170, 28, table, OUTLINE);
  canvasTex(s, 'din_chair', 22, 44, chair, OUTLINE);
  canvasTex(s, 'din_lustre', 90, 40, lustre);
  canvasTex(s, 'din_plate', 28, 6, (c) => { ell(c, '#8a90a8', 14, 3, 13, 2.6); ell(c, '#e8ecf6', 14, 2.4, 12, 1.9); ell(c, '#c4cadc', 14, 2.4, 8, 1); }, OUTLINE);
  canvasTex(s, 'din_goblet', 10, 14, (c) => {
    poly(c, GOLDD, [1, 0, 9, 0, 8, 6, 2, 6]); R(c, GOLDL, 2, 0, 6, 1); R(c, GOLD, 3, 2, 2, 3);
    R(c, GOLDD, 4, 6, 2, 5); R(c, GOLDD, 2, 11, 6, 2); R(c, GOLD, 2, 11, 6, 1);
  }, OUTLINE);
  canvasTex(s, 'din_cande', 26, 28, (c) => {
    R(c, GOLDD, 12, 12, 2, 13); R(c, GOLDD, 8, 24, 10, 3); R(c, GOLD, 8, 24, 10, 1);
    R(c, GOLDD, 4, 15, 18, 1); R(c, GOLDD, 4, 13, 1, 2); R(c, GOLDD, 21, 13, 1, 2);
    for (const [x, y] of [[4, 7], [12, 3], [21, 7]]) { R(c, '#efe6d0', x - 1, y, 3, 6); R(c, '#ff8a2a', x, y - 3, 1, 3); R(c, '#fff0b0', x, y - 2, 1, 1); }
  });
  canvasTex(s, 'din_bone', 14, 6, (c) => { R(c, '#e8e0c8', 3, 2, 8, 2); for (const [x, y] of [[1, 1], [1, 3], [11, 1], [11, 3]]) R(c, '#e8e0c8', x, y, 2, 2); }, OUTLINE);
  canvasTex(s, 'din_stain', 56, 8, (c) => { ell(c, '#3a2412', 28, 4, 27, 3.5); ell(c, '#5a4018', 22, 4, 16, 2); for (let i = 0; i < 9; i++) R(c, '#5a3a18', Math.round(rnd(i) * 56), Math.round(rnd(i + 20) * 7)); });
  canvasTex(s, 'din_wrap', 14, 10, (c) => { poly(c, '#d8d2bc', [1, 8, 3, 2, 9, 0, 13, 4, 11, 9, 5, 9]); poly(c, '#a8a28c', [5, 8, 7, 3, 11, 5, 9, 8]); R(c, '#f0ecd8', 4, 3, 3, 1); }, OUTLINE);
  canvasTex(s, 'din_cup', 12, 18, (c) => {
    R(c, '#c8ccd8', 7, 0, 1, 5); poly(c, '#e8ecf6', [1, 5, 11, 5, 9, 17, 3, 17]); R(c, '#9aa0b4', 1, 5, 10, 1); R(c, '#ff9a3a', 3, 9, 6, 3);
  }, OUTLINE);
}
