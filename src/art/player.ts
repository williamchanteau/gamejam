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

function drawPlayer(c: CanvasRenderingContext2D, p: Pose) {
  // Jambes + bottes.
  for (const [x, y, h] of p.legs) {
    px(c, '#1a1830', x, y, 3, h);
    px(c, '#2c2848', x, y + h - 3, 3, 3);
    px(c, '#4a4570', x + 2, y + h - 3, 1, 1);
  }
  // Cape : trapèze qui s'évase, plis, liseré clair côté lune, ourlet effiloché.
  const rows = 19;
  for (let i = 0; i < rows; i++) {
    const w = 10 + Math.round((i * (6 + p.flare)) / (rows - 1));
    const left = 11 - Math.ceil(w / 2) + Math.round(p.lean * (1 - i / (rows - 1)));
    const right = left + w - 1;
    for (let x = left; x <= right; x++) {
      if (i === rows - 1 && (x + p.hem) % 3 === 0) continue;
      const u = (x - left) / (w - 1);
      let col = P.c;
      if (x === left) col = P.d;
      else if (u < 0.25) col = P.m;
      else if (x === right) col = P.l;
      else if (x === right - 1) col = P.s;
      if (i >= 4 && x === left + Math.floor(w * 0.4)) col = P.d; // pli
      if (i >= 9 && x === left + Math.floor(w * 0.68)) col = P.m;
      if (i < 3 && x > left && x < right) col = i === 0 ? P.s : col === P.m ? P.c : P.s; // épaules
      if (i >= rows - 2) col = col === P.l ? P.s : P.m;
      px(c, col, x, 12 + i, 1, 1);
    }
  }
  // Ceinture + boucle argentée sur le devant.
  const bx = 13 + p.lean;
  px(c, '#241c30', bx - 1, 22, 5, 2);
  px(c, '#9aa6c8', bx + 1, 22, 2, 2);
  if (p.arm) {
    // Bras tendu + lame courte.
    px(c, P.c, 15 + p.lean, 16, 4, 3);
    px(c, P.s, 15 + p.lean, 16, 4, 1);
    px(c, P.h, 19 + p.lean, 16, 2, 3);
    px(c, '#a6fcff', 21 + p.lean, 15, 1, 3);
  }
  drawMap(c, HOOD, P, 4 + p.lean, 1 + p.bob);
}

export function makePlayerArt(scene: Phaser.Scene) {
  for (const k in POSES) canvasTex(scene, 'p_' + k, 24, 36, (c) => drawPlayer(c, POSES[k]), OUTLINE);
}
