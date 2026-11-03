import Phaser from 'phaser';
import { canvasTex, crescent, glowTex, mapTex } from './pixel';
import { makeCursor } from './logo';

const HEART = [
  '.xx...xx.',
  'xHHx.xxxx',
  'xHxxxxxxx',
  'xxxxxxxxs',
  '.xxxxxxs.',
  '..xxxxs..',
  '...xxs...',
  '....s....',
];

/** Sphère ombrée au pixel (lumière en haut à gauche). */
function sphere(c: CanvasRenderingContext2D, size: number, cols: string[]) {
  const r = size / 2 - 0.4;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2);
      if (d > r) continue;
      const hl = Math.hypot(x + 0.5 - size * 0.38, y + 0.5 - size * 0.38);
      c.fillStyle = hl < size * 0.12 ? cols[0] : d < r * 0.55 ? cols[1] : d < r * 0.82 ? cols[2] : cols[3];
      c.fillRect(x, y, 1, 1);
    }
}

export function makeFxArt(scene: Phaser.Scene) {
  canvasTex(scene, 'px', 2, 2, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 2, 2); });
  // Entaille de dague (cyan joueur) : croissant fin + fil blanc.
  canvasTex(scene, 'slash', 33, 36, (c) => {
    crescent(c, 12, 18, 16, 4, 16, '#d8fbff', '#7ff6ff');
    crescent(c, 12, 18, 16, 1.6, 16.4, '#ffffff', '#ffffff');
  });
  // Estoc des deux dagues : deux traits effilés, pointe blanche.
  canvasTex(scene, 'thrust', 34, 9, (c) => {
    for (const [y, x0, x1] of [[2, 0, 33], [6, 5, 29]]) for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0);
      c.fillStyle = t > 0.85 ? '#ffffff' : t > 0.4 ? '#d8fbff' : '#7ff6ff';
      c.globalAlpha = 0.35 + t * 0.65;
      c.fillRect(x, y - (t > 0.55 ? 1 : 0), 1, t > 0.55 ? 2 : 1);
    }
    c.globalAlpha = 1;
  });
  // Éclat lunaire.
  canvasTex(scene, 'moon', 42, 45, (c) => {
    crescent(c, 20, 22, 20, 9, 18, '#e8fdff', '#7ff6ff');
    crescent(c, 20, 22, 20, 4, 19, '#ffffff', '#ffffff');
  });
  glowTex(scene, 'glowC', 48, '127,246,255');
  makeCursor(scene);
  // Orbe de danger (rouge réservé au danger).
  canvasTex(scene, 'orb', 15, 15, (c) => sphere(c, 15, ['#ffe6ee', '#ff6a90', '#ff2a5a', '#a0103c']));
  glowTex(scene, 'glowR', 48, '255,42,90');
  glowTex(scene, 'glowO', 64, '255,138,42');
  glowTex(scene, 'glowW', 32, '255,255,255');
  // PV : cœurs cyan (jamais rouges).
  mapTex(scene, 'hp_full', HEART, { x: '#5fd8f0', H: '#d8fbff', s: '#2f98b8' });
  mapTex(scene, 'hp_empty', HEART, { x: '#262b45', H: '#30365a', s: '#1c2036' });
}
