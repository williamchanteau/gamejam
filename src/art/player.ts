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

/** Bras : épaule s → main h ; dague tenue selon l'angle deg (0 = devant, 90 = bas), longueur len ; back = bras du fond. */
type Arm = { s: number[]; h: number[]; deg?: number; len?: number; back?: boolean; open?: boolean };
type Pose = { bob: number; lean: number; legs: number[][]; flare: number; hem: number; arms?: Arm[]; drop?: number; rows?: number };
// Combo aux dagues (3 frames par coup : armé, frappe, suite) — visuel seul, la hitbox est dans config.combo.
const A0 = { bob: 0, lean: 1, legs: [[5, 29, 6], [15, 29, 6]], flare: 1, hem: 0 };
const A2 = { bob: 1, lean: 2, legs: [[3, 29, 6], [16, 29, 6]], flare: 2, hem: 1 };
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
  // 1er coup : taille de la main avant, de haut en bas.
  atk0_0: { ...A0, arms: [{ s: [16, 15], h: [17, 10], deg: -125, len: 6 }] },
  atk0_1: { ...A0, arms: [{ s: [16, 15], h: [21, 16], deg: 0, len: 7 }] },
  atk0_2: { ...A0, arms: [{ s: [16, 15], h: [19, 20], deg: 55, len: 6 }] },
  // 2e coup : revers montant de la main du fond, la dague avant reste en garde.
  atk1_0: { ...A0, arms: [{ s: [12, 15], h: [8, 21], deg: 150, len: 6, back: true }, { s: [16, 15], h: [17, 18], deg: 100, len: 4 }] },
  atk1_1: { ...A0, arms: [{ s: [12, 15], h: [21, 12], deg: -35, len: 7, back: true }, { s: [16, 15], h: [17, 18], deg: 100, len: 4 }] },
  atk1_2: { ...A0, arms: [{ s: [12, 15], h: [19, 9], deg: -75, len: 6, back: true }, { s: [16, 15], h: [17, 18], deg: 100, len: 4 }] },
  // 3e coup : estoc des deux dagues en fente.
  atk2_0: { ...A2, arms: [{ s: [12, 15], h: [12, 19], deg: 10, len: 5, back: true }, { s: [16, 15], h: [14, 17], deg: 0, len: 6 }] },
  atk2_1: { ...A2, arms: [{ s: [12, 15], h: [20, 19], deg: 4, len: 7, back: true }, { s: [16, 15], h: [21, 16], deg: 0, len: 7 }] },
  atk2_2: { ...A2, arms: [{ s: [12, 15], h: [18, 20], deg: 25, len: 6, back: true }, { s: [16, 15], h: [20, 18], deg: 18, len: 7 }] },
  // Mort : genou à terre, tête basse, appuyé sur la dague plantée (corps abaissé de `drop`, jambes en absolu).
  kneel: { bob: 2, lean: 1, drop: 5, rows: 17, flare: 1, hem: 1, legs: [[12, 27, 3, 6], [16, 29, 6], [8, 27, 6, 3], [5, 32, 3, 4], [3, 32, 3]],
    arms: [{ s: [16, 15], h: [18, 21], deg: 90, len: 5 }] },
  cast: { ...A0, arms: [{ s: [16, 15], h: [21, 16], open: true }] },
  hurt: { bob: 0, lean: -1, legs: [[6, 29, 6], [13, 28, 6]], flare: 1, hem: 1 },
  // Dash amélioré : les deux dagues levées en prise inversée, puis plantées en croix devant.
  dstab0: { bob: 1, lean: 2, legs: [[3, 28, 5], [8, 29, 5]], flare: 3, hem: 0, arms: [{ s: [12, 15], h: [10, 7], deg: 35, len: 7, back: true }, { s: [16, 15], h: [17, 6], deg: 35, len: 7 }] },
  dstab1: { bob: 1, lean: 2, legs: [[3, 28, 5], [8, 29, 5]], flare: 3, hem: 1, arms: [{ s: [12, 15], h: [20, 12], deg: 38, len: 8, back: true }, { s: [16, 15], h: [20, 22], deg: -38, len: 8 }] },
  // À table : la main porte le burger à la bouche (sans dague).
  eat0: { bob: 0, lean: 0, legs: [[8, 29, 6], [13, 29, 6]], flare: 0, hem: 0, arms: [{ s: [16, 15], h: [20, 14] }] },
  eat1: { bob: 1, lean: 0, legs: [[8, 29, 6], [13, 29, 6]], flare: 0, hem: 1, arms: [{ s: [16, 15], h: [19, 11] }] },
};

function px(c: CanvasRenderingContext2D, col: string, x: number, y: number, w = 1, h = 1) {
  c.fillStyle = col; c.fillRect(x, y, w, h);
}

function line(c: CanvasRenderingContext2D, col: string, x0: number, y0: number, x1: number, y1: number, w = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px(c, col, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), w, w);
}

/** Dague dans la main (hx, hy) : pommeau, garde perpendiculaire, lame d'acier à reflet lunaire. */
function dagger(c: CanvasRenderingContext2D, hx: number, hy: number, deg: number, len: number) {
  const a = (deg * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), ox = hx + 1, oy = hy + 1;
  const at = (i: number, j = 0) => [Math.round(ox + dx * i - dy * j), Math.round(oy + dy * i + dx * j)] as const;
  px(c, '#4a2e1a', ...at(-1)); px(c, '#9aa6c8', ...at(-2));
  for (const j of [-1.5, 0, 1.5]) px(c, '#9aa6c8', ...at(1.5, j));
  for (let i = 2; i < len + 2; i++) {
    px(c, i === len + 1 ? '#a6fcff' : '#dfe8ff', ...at(i));
    if (i < len) px(c, '#7a86ac', ...at(i, 0.9)); // dos de lame (2 px près de la garde)
  }
}

function arm(c: CanvasRenderingContext2D, r: Arm, L: number) {
  const [sx, sy] = r.s, hx = r.h[0] + L, hy = r.h[1];
  line(c, r.back ? P.m : P.c, sx + L, sy, hx, hy, 2);
  if (!r.back) line(c, P.s, sx + L, sy, hx, hy);
  if (r.open) { px(c, '#a6fcff', hx, hy, 2, 2); px(c, '#ffffff', hx + 1, hy, 1, 1); return; } // main ouverte (sort)
  px(c, r.back ? P.l : P.h, hx, hy, 2, 2);
  if (r.deg !== undefined) dagger(c, hx, hy, r.deg, r.len ?? 6);
}

/** Hors attaque : la dague de la main avant est tenue en prise inversée, lame le long de la cuisse. */
const REST: Arm[] = [{ s: [16, 15], h: [16, 19], deg: 100, len: 5 }];

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
  const cp = cape ?? { flare: p.flare, lift: 0, ph: p.hem * 2, hem: p.hem, amp: 0.8, rows: p.rows ?? 21, sq: 1 }, minX = cape ? 1 - OX : 1;
  const arms = p.arms ?? REST;
  for (const r of arms) if (r.back) arm(c, r, p.lean); // bras du fond, derrière le corps
  // Jambes + bottes.
  for (const [x, y, h, w] of p.legs) {
    px(c, '#1a1830', x, y, w ?? 3, h);
    if (w) continue; // segment nu (cuisse/tibia à plat)
    px(c, '#2c2848', x, y + h - 3, 3, 3);
    px(c, '#4a4570', x + 2, y + h - 3, 1, 1);
  }
  if (p.drop) c.translate(0, p.drop);
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
  drawMap(c, HOOD, P, 4 + L, 1 + p.bob);
  for (const r of arms) if (!r.back) arm(c, r, L); // bras avant devant la capuche (armé levé)
  c.restore();
}

export function makePlayerArt(scene: Phaser.Scene) {
  for (const k in POSES) canvasTex(scene, 'p_' + k, TW, 36, (c) => drawPlayer(c, POSES[k]), OUTLINE);
  for (const k of CAPE_POSES) for (const h of CAPE_H) for (const v of AIR.includes(k) ? CAPE_V : [0])
    for (let ph = 0; ph < CAPE_PH; ph++) canvasTex(scene, `p_${k}_${h}_${v}_${ph}`, TW, 36, (c) => drawPlayer(c, POSES[k], capeOf(h, v, ph)), OUTLINE);
}
