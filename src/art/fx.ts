import Phaser from 'phaser';
import { canvasTex, crescent, glowTex, mapTex } from './pixel';

const HEART = ['.xx.xx.', 'xxxxxxx', 'xHxxxxx', '.xxxxx.', '..xxx..', '...x...'];

export function makeFxArt(scene: Phaser.Scene) {
  canvasTex(scene, 'px', 2, 2, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 2, 2); });
  // Entaille de l'attaque (cyan joueur).
  canvasTex(scene, 'slash', 22, 24, (c) => crescent(c, 8, 12, 11, 5, 11, '#d8fbff', '#7ff6ff'));
  // Éclat lunaire.
  canvasTex(scene, 'moon', 28, 30, (c) => crescent(c, 13, 15, 13, 6, 12, '#e8fdff', '#7ff6ff'));
  glowTex(scene, 'glowC', 32, '127,246,255');
  // Orbe de danger (rouge réservé au danger).
  canvasTex(scene, 'orb', 10, 10, (c) => {
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 10; x++) {
        const d = Math.hypot(x + 0.5 - 5, y + 0.5 - 5);
        if (d > 4.6) continue;
        c.fillStyle = d < 2.2 ? '#ffd6e0' : d < 3.4 ? '#ff4a78' : '#c0144a';
        c.fillRect(x, y, 1, 1);
      }
  });
  glowTex(scene, 'glowR', 32, '255,42,90');
  // PV : cœurs cyan (jamais rouges).
  mapTex(scene, 'hp_full', HEART, { x: '#5fd8f0', H: '#d8fbff' });
  mapTex(scene, 'hp_empty', HEART, { x: '#262b45', H: '#262b45' });
}
