import Phaser from 'phaser';
import { canvasTex, drawMap, OUTLINE } from './pixel';

// Palette du joueur : bleu nuit, rim light lunaire, yeux cyan.
const P: Record<string, string> = {
  d: '#1c2240', c: '#3d4a6e', m: '#2e3858', l: '#6a7fb0', h: '#cfe0ff', k: '#0a0814',
  e: '#d8fbff', E: '#5fd8f0', s: '#4a5a85',
};
// Capuche 15×13, tournée vers la droite (ouverture = visage dans l'ombre, yeux lumineux).
const HOOD = [
  '.....dddddd....',
  '...ddcccccsdd..',
  '..dmccccsslhd..',
  '.dmcccccsllllhd',
  '.dmccccslkkkkld',
  'dmmccccckkkkkkd',
  'dmmcccckkkekkek',
  'dmmcccckkkEkkEk',
  'dmmccccckkkkkkd',
  '.dmmcccccckkkd.',
  '.dddmcccccckd..',
  'dd..ddmcccccd..',
  '.......ddd.....',
];

type Pose = { bob: number; lean: number; legs: number[][]; flare: number; hem: number; arm?: boolean };
const POSES: Record<string, Pose> = {
  idle0: { bob: 0, lean: 0, legs: [[8, 29, 6], [13, 29, 6]], flare: 0, hem: 0 },
  idle1: { bob: 1, lean: 0, legs: [[8, 29, 6], [13, 29, 6]], flare: 0, hem: 1 },
  run0: { bob: 0, lean: 1, legs: [[5, 29, 6], [15, 29, 5]], flare: 1, hem: 0 },
  run1: { bob: 1, lean: 1, legs: [[9, 29, 6], [13, 28, 5]], flare: 0, hem: 1 },
  run2: { bob: 0, lean: 1, legs: [[15, 29, 6], [6, 29, 5]], flare: 1, hem: 2 },
  run3: { bob: 1, lean: 1, legs: [[12, 29, 6], [9, 28, 5]], flare: 0, hem: 0 },
  jump: { bob: 0, lean: 0, legs: [[8, 29, 5], [14, 28, 5]], flare: -1, hem: 1 },
  fall: { bob: 0, lean: 0, legs: [[6, 29, 6], [15, 29, 6]], flare: 3, hem: 2 },
  dash: { bob: 1, lean: 2, legs: [[3, 28, 5], [8, 29, 5]], flare: 2, hem: 0 },
  atk: { bob: 0, lean: 1, legs: [[5, 29, 6], [15, 29, 6]], flare: 1, hem: 0, arm: true },
  hurt: { bob: 0, lean: -1, legs: [[6, 29, 6], [13, 28, 6]], flare: 1, hem: 1 },
};

function px(c: CanvasRenderingContext2D, col: string, x: number, y: number, w = 1, h = 1) {
  c.fillStyle = col; c.fillRect(x, y, w, h);
}

// Cape au vent : textures précalculées par vent horizontal h (-1 plaquée … 3 course … 5 dash),
// vent vertical v (en l'air : -2 montée = pend vers le bas … 2 chute = gonfle vers le haut) et phase
// d'ondulation ; le joueur choisit via capeTex(). Marge OX de chaque côté (corps centré, flipX).
const OX = 10, TW = 24 + OX * 2;
const CAPE_POSES = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'dash'], AIR = ['jump', 'fall'];
const CAPE_H = [-1, 0, 1, 2, 3, 4, 5], CAPE_V = [-2, -1, 0, 1, 2], CAPE_PH = 4;
/** Réglages des ressorts de cape (h visé = vitesse/runSpeed × perSpeed, v visé = vy × perV en l'air). */
export const CAPE = { perSpeed: 3, perV: 0.005, stiff: 70, damp: 7, phIdle: 1.6, phRun: 9 };
type Cape = { flare: number; lift: number; ph: number; hem: number; amp: number; rows: number; sq: number };
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, Math.round(x)));

export function capeTex(k: string, h: number, v: number, ph: number) {
  if (!CAPE_POSES.includes(k)) return 'p_' + k;
  return `p_${k}_${clamp(h, -1, 5)}_${AIR.includes(k) ? clamp(v, -2, 2) : 0}_${Math.floor(ph) % CAPE_PH}`;
}

function capeOf(h: number, v: number, ph: number): Cape {
  const u = Math.max(0, h), up = Math.max(0, -v), dn = Math.max(0, v);
  return {
    // lift ≤ 1,9 : au-delà, deux pixels voisins d'une rangée s'écartent (cape en filaments).
    flare: h - up * 0.75 + dn * 0.6, lift: Math.min(1.9, u * 0.35 + dn * 0.5), ph: (ph * Math.PI) / 2, hem: ph,
    amp: 0.8 + u * 0.35 + dn * 0.4, rows: 21 + Math.round(up * 1.5), sq: 1 - dn * 0.12, // chute : remonte
  };
}

function drawPlayer(c: CanvasRenderingContext2D, p: Pose, cape?: Cape) {
  c.save(); c.translate(OX, 0);
  const cp = cape ?? { flare: p.flare, lift: 0, ph: p.hem * 2, hem: p.hem, amp: 0.8, rows: 21, sq: 1 }, minX = cape ? 1 - OX : 1;
  // Jambes + bottes.
  for (const [x, y, h] of p.legs) {
    px(c, '#1a1830', x, y, 3, h);
    px(c, '#2c2848', x, y + h - 3, 3, 3);
    px(c, '#4a4570', x + 2, y + h - 3, 1, 1);
  }
  // Tunique + ceinture (visibles devant, la cape flotte derrière).
  const L = p.lean;
  px(c, '#221e38', 9 + L, 13, 8, 17);
  px(c, '#2e2848', 14 + L, 14, 3, 15);
  px(c, '#241c30', 9 + L, 22, 8, 2);
  px(c, '#9aa6c8', 14 + L, 22, 2, 2);
  // Grande cape : accrochée aux épaules, s'évase vers l'arrière, doublure sarcelle, bas en lambeaux.
  const rows = cp.rows;
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const front = Math.round(14 - t * 4 + L * (1 - t));
    const back = Math.max(minX, Math.round(8 - t * (6 + cp.flare * 1.5) + Math.sin(i * 0.6 + cp.ph) * cp.amp * t));
    for (let x = back; x <= front; x++) {
      if (i >= rows - 3 && (((x * 3 + cp.hem * 2) % 5) + 5) % 5 < i - (rows - 4)) continue; // lambeaux en V
      const u = (x - back) / Math.max(1, front - back);
      let col = P.c;
      if (x === back) col = P.d;
      else if (x <= back + 1 && t > 0.35) col = t > 0.6 ? '#2f6a7a' : '#1f4a5a'; // doublure
      else if (x === front) col = P.l;
      else if (x === front - 1) col = P.s;
      else if (Math.abs(u - 0.35 - t * 0.1) < 0.08 && i > 3) col = P.d; // plis
      else if (Math.abs(u - 0.68) < 0.07 && i > 7) col = P.m;
      else if (u < 0.2) col = P.m;
      px(c, col, x, 12 + Math.round(i * cp.sq) - Math.round(cp.lift * t * Math.max(0, front - x) * 0.5)); // l'arrière se soulève
    }
  }
  // Pèlerine (petite cape d'épaules) par-dessus.
  for (let i = 0; i < 5; i++) {
    const l = 6 - Math.floor(i / 2) + L, r = 16 + L;
    for (let x = l; x <= r; x++) px(c, i === 4 ? P.d : x === r ? P.l : x === l ? P.d : i === 0 ? P.s : P.c, x, 12 + i);
  }
  if (p.arm) {
    // Bras tendu + lame courte.
    px(c, P.c, 15 + L, 16, 4, 3);
    px(c, P.s, 15 + L, 16, 4, 1);
    px(c, P.h, 19 + L, 16, 2, 3);
    px(c, '#a6fcff', 21 + L, 15, 1, 3);
  }
  drawMap(c, HOOD, P, 4 + L, 1 + p.bob);
  c.restore();
}

export function makePlayerArt(scene: Phaser.Scene) {
  for (const k in POSES) canvasTex(scene, 'p_' + k, TW, 36, (c) => drawPlayer(c, POSES[k]), OUTLINE);
  for (const k of CAPE_POSES) for (const h of CAPE_H) for (const v of AIR.includes(k) ? CAPE_V : [0])
    for (let ph = 0; ph < CAPE_PH; ph++) canvasTex(scene, `p_${k}_${h}_${v}_${ph}`, TW, 36, (c) => drawPlayer(c, POSES[k], capeOf(h, v, ph)), OUTLINE);
}
