import Phaser from 'phaser';
import { canvasTex, drawMap, OUTLINE } from './pixel';

const P = { c: '#3d4a6e', d: '#262d4a', l: '#6a7fb0', k: '#0d0b18', e: '#a6fcff', b: '#1a1830', h: '#cfe0ff' };
const HOOD = [
  '..ddddd...',
  '.dcccccd..',
  'dcclllccd.',
  'dcllkkkkkd',
  'dclkkkkkkd',
  'dclkekkekd',
  'dcckkkkkkd',
  '.dcckkkkd.',
  '..dddddd..',
];

type Pose = { bob: number; lean: number; legs: number[][]; flare: number; hem: number; arm?: boolean };
const POSES: Record<string, Pose> = {
  idle0: { bob: 0, lean: 0, legs: [[5, 19, 4], [9, 19, 4]], flare: 0, hem: 0 },
  idle1: { bob: 1, lean: 0, legs: [[5, 19, 4], [9, 19, 4]], flare: 0, hem: 1 },
  run0: { bob: 0, lean: 1, legs: [[3, 19, 4], [10, 19, 3]], flare: 1, hem: 0 },
  run1: { bob: 1, lean: 1, legs: [[6, 19, 4], [9, 18, 3]], flare: 0, hem: 1 },
  run2: { bob: 0, lean: 1, legs: [[10, 19, 4], [4, 19, 3]], flare: 1, hem: 2 },
  run3: { bob: 1, lean: 1, legs: [[8, 19, 4], [6, 18, 3]], flare: 0, hem: 0 },
  jump: { bob: 0, lean: 0, legs: [[5, 18, 3], [9, 17, 3]], flare: -1, hem: 1 },
  fall: { bob: 0, lean: 0, legs: [[4, 19, 4], [10, 19, 4]], flare: 2, hem: 2 },
  dash: { bob: 1, lean: 2, legs: [[2, 18, 3], [5, 19, 3]], flare: 1, hem: 0 },
  atk: { bob: 0, lean: 1, legs: [[3, 19, 4], [10, 19, 4]], flare: 1, hem: 0, arm: true },
  hurt: { bob: 0, lean: -1, legs: [[4, 19, 4], [9, 18, 4]], flare: 1, hem: 1 },
};

function drawPlayer(c: CanvasRenderingContext2D, p: Pose) {
  c.fillStyle = P.b;
  for (const [x, y, h] of p.legs) c.fillRect(x, y, 2, h);
  // Cape : trapèze qui s'évase, penché vers l'avant.
  for (let i = 0; i < 10; i++) {
    const w = 7 + Math.round((i * (4 + p.flare)) / 9);
    const left = 8 - Math.ceil(w / 2) + Math.round(p.lean * (1 - i / 9));
    const right = left + w - 1;
    for (let x = left; x <= right; x++) {
      if (i === 9 && (x + p.hem) % 3 === 0) continue; // ourlet effiloché
      c.fillStyle = x === left || (x === left + 3 && i >= 3) ? P.d : x === right ? P.l : P.c;
      c.fillRect(x, 10 + i, 1, 1);
    }
  }
  if (p.arm) {
    c.fillStyle = P.c;
    c.fillRect(10 + p.lean, 12, 3, 2);
    c.fillStyle = P.h;
    c.fillRect(13 + p.lean, 12, 1, 2);
  }
  drawMap(c, HOOD, P, 3 + p.lean, 1 + p.bob);
}

export function makePlayerArt(scene: Phaser.Scene) {
  for (const k in POSES) canvasTex(scene, 'p_' + k, 16, 24, (c) => drawPlayer(c, POSES[k]), OUTLINE);
}
