import Phaser from 'phaser';
import { glyphRow } from './font';
import { beam, canvasTex, ell, mapTex, OUTLINE, poly } from './pixel';

type C = CanvasRenderingContext2D;
const R = (c: C, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
/** Pseudo-hasard stable (les textures sont régénérées à l'identique). */
const rnd = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

const SK = '#eebf9a', SKD = '#d39a78', SKDD = '#ad7558', SKL = '#fbdcc0', PINK = '#e8928c';
const HAIR = '#3a2a22', HAIRL = '#5c4332', HAIRD = '#2a1d17', STUB = '#b9977c';
const TEE = '#c9ccd6', TEED = '#9fa3b3', TEEL = '#e6e8ee', SLV = '#23222c', SLVL = '#3d3c4a';
const INK = '#23222c', RUST = '#c0531c';
const JN = '#2b3560', JND = '#1c2342', JNL = '#3f4b7e';
const GOLD = '#ffd36a', GOLDD = '#c8902a', GOLDL = '#fff0b0';
const K = '#ff2a5a', KD = '#b0123c', KL = '#ff8aa2';
/** Bras en 2 segments : longueurs épaule→coude et coude→poing, pivots dans les textures. */
export const ARM_LEN = { up: 20, fore: 23 }, ARM_PIVOT = { up: 10 / 38, fore: 7 / 40 };

export type Mood = { mad?: boolean; mouth?: 'shut' | 'open' | 'chew' };

const EYES_X = [22, 40], EYE_Y = 19;
/** Blanc de l'œil, sans la pupille si `hole` (calque allumé par b.eyes). */
function sclera(c: C, x: number, y: number, col: string, hole = false) {
  R(c, col, x - 3, y - 2, 7, 3); R(c, col, x - 2, y + 1, 5, 1);
  if (hole) c.clearRect(x, y - 2, 2, 3);
}

function head(c: C, m: Mood) {
  const X = 30;
  // Cheveux lisses, raie au milieu : deux pans qui tombent derrière la mâchoire (symétrie autour de 30,5).
  const sym = (col: string, pts: number[]) => { poly(c, col, pts); poly(c, col, pts.map((v, i) => (i % 2 ? v : 61 - v))); };
  sym(HAIR, [20, 2, 12, 4, 6, 10, 4, 18, 4, 29, 5, 36, 8, 40, 13, 40, 17, 35, 18, 18]);
  sym(HAIRD, [13, 30, 8, 30, 9, 39, 13, 40, 16, 36]);
  sym(HAIRL, [7, 13, 8, 13, 7, 27, 8, 34, 7, 34, 6, 27]);
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
  // Dessus du crâne : les mèches partent de la raie et glissent le long des tempes.
  sym(HAIR, [31, 0.5, 20, 1, 13, 5, 9, 12, 9, 24, 12, 25, 14, 15, 20, 9, 30.5, 5]);
  sym(HAIRL, [27, 2, 20, 3, 14, 7, 12, 12, 13, 12, 16, 8, 21, 5, 27, 3]);
  // Yeux (les blancs restent ternes : mck_eyes les allume par-dessus, pupilles comprises).
  for (const x of EYES_X) {
    R(c, SKD, x - 4, EYE_Y - 4, 9, 1);
    sclera(c, x, EYE_Y, '#cfc9c2');
    R(c, '#14121c', x, EYE_Y - 2, 2, 3);
    R(c, '#5a3424', x - 3, EYE_Y - 3, 7, 1);
    R(c, SKD, x - 3, EYE_Y + 2, 7, 1);
  }
  // Sourcils.
  for (const [i, x] of EYES_X.entries()) {
    if (m.mad) beam(c, HAIR, x - 6, EYE_Y - (i ? 3 : 9), x + 6, EYE_Y - (i ? 9 : 3), 2.4);
    else R(c, HAIR, x - 5, EYE_Y - 7, 11, 2);
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
  // Empiècements noirs (raglan) : ils s'arrêtent à l'épaule, la manche appartient au bras.
  poly(c, SLV, [11, 17, 24, 2, 60, 2, 73, 17, 72, 22, 64, 24, 20, 24, 12, 22]);
  R(c, SLVL, 26, 3, 32, 1);
  // Tee-shirt clair, remonté et roulé au-dessus du ventre.
  poly(c, TEED, [28, 6, 56, 6, 69, 20, 70, 40, 14, 40, 15, 20]);
  poly(c, TEE, [30, 6, 56, 6, 67, 21, 67, 39, 21, 39, 20, 20]);
  poly(c, TEEL, [48, 7, 56, 7, 64, 20, 60, 26, 50, 16]);
  ell(c, SLV, X, 5, 14, 4.5); ell(c, SKD, X, 3, 10, 3); // col
  for (let x = 13; x < 72; x++) {
    const k = ((x - X) / 29) ** 2, y = 37 + Math.round(k * 3);
    R(c, TEEL, x, y, 1, 1); R(c, TEE, x, y + 1, 1, 2); R(c, TEED, x, y + 3, 1, 1);
    if (x % 9 === 0) R(c, TEED, x, y, 1, 3);
  }
}

/** Logo du langage Rust redessiné en 17×17 : roue dentée et R gras dont les empattements touchent l'anneau. */
function rustLogo(c: C, ox: number, oy: number) {
  for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) {
    const dx = x + 0.5 - 8.5, dy = y + 0.5 - 8.5, r = Math.hypot(dx, dy);
    const tooth = r > 7 && r <= 8.7 && Math.cos(Math.atan2(dy, dx) * 12) > 0;
    if (tooth || (r >= 6 && r <= 7.4)) R(c, INK, ox + x, oy + y);
  }
  const glyph = ['######..', '.##..##.', '.##..##.', '.##..##.', '.#####..', '.##.##..', '.##..##.', '.##..##.', '###..###'];
  for (const [j, row] of glyph.entries()) for (const [i, v] of [...row].entries()) if (v === '#') R(c, INK, ox + 5 + i, oy + 4 + j);
}

/** Flocage du tee-shirt, calque à part : le boss se retourne par miroir, le texte et le logo doivent rester lisibles. */
function teePrint(c: C) {
  const line = (t: string, x0: number, y: number, col: string) => {
    for (const [i, ch] of [...t].entries()) for (let r = 0; r < 7; r++) {
      const bits = glyphRow(ch, r);
      for (let k = 0; k < 5; k++) if (bits & (16 >> k)) R(c, col, x0 + i * 6 + k, y + r);
    }
  };
  line('I LOVE', 4, 1, INK);
  rustLogo(c, 1, 9);
  line('RUST', 20, 10, RUST);
  line('<3', 26, 18, RUST);
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

/** Bras 24×38 : épaule (12,10), coude (12,30). La manche est ronde autour de l'épaule : elle tient à tous les angles. */
function upperArm(c: C) {
  const X = 12;
  poly(c, SK, [5, 20, 19, 20, 18.5, 30, 5.5, 30]); ell(c, SK, X, 30, 6.5, 6.5);
  poly(c, SKD, [5, 20, 8, 20, 8.5, 34, 6, 33]); poly(c, SKL, [15, 24, 17, 24, 17, 32, 15, 33]);
  for (let i = 0; i < 5; i++) R(c, '#8a5f46', 8 + Math.floor(rnd(i + 7) * 8), 25 + Math.floor(rnd(i + 40) * 8), 1, 2);
  ell(c, SLV, X, 10, 8.5, 8.5);
  poly(c, SLV, [3.5, 10, 20.5, 10, 19.5, 24, 4.5, 24]);
  R(c, '#14131b', 4, 23, 16, 2);
  poly(c, SLVL, [14, 4, 17, 6, 19, 10, 18, 10, 16, 7, 14, 5]);
}

/** Avant-bras 24×40 : coude (12,7), poing (12,30), pouce côté corps. */
function foreArm(c: C, bracer: boolean) {
  const X = 12;
  ell(c, SK, X, 7, 6.5, 6.5);
  poly(c, SK, [5.5, 7, 18.5, 7, 16.5, 26, 7.5, 26]);
  poly(c, SKD, [5.5, 7, 8.5, 7, 9.5, 26, 7.5, 26]); poly(c, SKL, [15, 6, 17, 6, 15.5, 22, 14, 22]);
  for (let i = 0; i < 6; i++) R(c, '#8a5f46', 9 + Math.floor(rnd(i + 17) * 6), 8 + Math.floor(rnd(i + 50) * 8), 1, 2);
  if (bracer) { // brassard de cuir clouté
    poly(c, '#4a3a32', [6.5, 14, 17.5, 14, 16.5, 25, 7.5, 25]);
    R(c, '#6e5a4c', 7, 14, 10, 1); R(c, '#2e231e', 8, 24, 8, 1);
    for (const x of [9, 14]) for (const y of [17, 21]) R(c, '#b4b4c0', x, y);
  }
  ell(c, SKD, X, 30.5, 8, 7.5); ell(c, SK, X + 0.5, 30, 7, 6.5); ell(c, SKL, X + 3, 28, 3, 2.5);
  for (const x of [9, 12, 15]) R(c, SKDD, x, 34, 1, 3);
  ell(c, SKD, 5.5, 29, 2.5, 4); ell(c, SK, 6, 28.5, 1.8, 3);
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

export function makeMcKingArt(s: Phaser.Scene) {
  // Corps.
  canvasTex(s, 'mck_head', 60, 44, (c) => head(c, {}), OUTLINE);
  canvasTex(s, 'mck_head_chew', 60, 44, (c) => head(c, { mouth: 'chew' }), OUTLINE);
  canvasTex(s, 'mck_head_open', 60, 44, (c) => head(c, { mouth: 'open' }), OUTLINE);
  canvasTex(s, 'mck_head_mad', 60, 44, (c) => head(c, { mad: true }), OUTLINE);
  canvasTex(s, 'mck_head_mad_open', 60, 44, (c) => head(c, { mad: true, mouth: 'open' }), OUTLINE);
  canvasTex(s, 'mck_torso', 84, 45, torso, OUTLINE);
  canvasTex(s, 'mck_belly', 78, 54, belly, OUTLINE);
  canvasTex(s, 'mck_leg', 28, 36, leg, OUTLINE);
  canvasTex(s, 'mck_tee_print', 44, 26, teePrint);
  canvasTex(s, 'mck_uparm', 24, 38, upperArm, OUTLINE);
  canvasTex(s, 'mck_forearm_f', 24, 40, (c) => foreArm(c, true), OUTLINE);
  canvasTex(s, 'mck_forearm_b', 24, 40, (c) => foreArm(c, false), OUTLINE);
  canvasTex(s, 'mck_crown', 35, 21, crown, OUTLINE);
  // Aligné sur les yeux de la tête : x tête − 16, y tête − 16.
  canvasTex(s, 'mck_eyes', 28, 6, (c) => { for (const x of EYES_X) sclera(c, x - 16, EYE_Y - 16, '#fff', true); });
  // Lueur additive autour de chaque œil (même centre que mck_eyes).
  canvasTex(s, 'mck_eyes_glow', 52, 22, (c) => {
    for (const x of EYES_X) {
      const cx = x - 4, g = c.createRadialGradient(cx, 11, 1, cx, 11, 11);
      g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(cx - 11, 0, 22, 22);
    }
  });
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
  // Étoile d'étourdissement.
  const STAR = { g: '#ffdf5a', w: '#fffbe0', d: GOLDD };
  mapTex(s, 'mck_star', ['......g......', '......g......', '.....gwg.....', '.....gwg.....', 'ggggggwgggggg', '.ggwwwwwwwgg.', '..ggwwwwwgg..', '...gwwwwwg...', '...gwwwwwg...', '..ggwwdwwgg..', '..gwdg.gdwg..', '.ggd.....dgg.', '.d.........d.'], STAR);
  mapTex(s, 'mck_star_s', ['....g....', '....g....', '...gwg...', 'gggwwwggg', '.ggwwwgg.', '..gwwwg..', '..ggdgg..', '.ggd.dgg.', '.d.....d.'], STAR);
  // Œil en spirale (étourdi), blanc plein.
  mapTex(s, 'mck_spiral', ['kkkkkkkkk', 'wwwwwwwwk', 'kkkkkkkwk', 'kwwwwwkwk', 'kwkkkwkwk', 'kwkwwwkwk', 'kwkkkkkwk', 'kwwwwwwwk', 'kkkkkkkkk'], { k: '#14121c', w: '#fff' }, null);
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
  // Couverts (repris par art/dining.ts).
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
}
