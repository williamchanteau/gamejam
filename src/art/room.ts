import Phaser from 'phaser';
import { W, H, ARENA } from '../config';
import { canvasTex, mapTex } from './pixel';

const DUMMY = [
  '......tt......',
  '...oorttroo...',
  '..oOorooroOo..',
  '.oOoorooroooo.',
  '.oyyorooroyyo.',
  '.ooyorooroyoo.',
  '.oooroooorooo.',
  '.oyyyyyyyyyoo.',
  '..oyoyyoyyoo..',
  '...oorooroo...',
  '.....wwww.....',
  'wwwwwwwwwwwwww',
  'WW.sssssssS.WW',
  '...sSssssSS...',
  '...ssSssSsS...',
  '...sssSSssS...',
  '...ssSssSsS...',
  '...sSssssSS...',
  '...sssssssS...',
  '....sssssS....',
  '......wW......',
  '......wW......',
  '......wW......',
  '......wW......',
  '....wwwwWW....',
];

export function makeRoomArt(scene: Phaser.Scene) {
  // Sol : briques gris-bleu.
  canvasTex(scene, 'floor', 32, H - ARENA.floorY, (c) => {
    c.fillStyle = '#343a55'; c.fillRect(0, 0, 32, 24);
    c.fillStyle = '#1f2236';
    for (let y = 2; y < 24; y += 8) {
      c.fillRect(0, y + 7, 32, 1);
      const o = (y / 8) % 2 ? 8 : 0;
      c.fillRect(o, y, 1, 8); c.fillRect(o + 16, y, 1, 8);
    }
    c.fillStyle = '#5a6386'; c.fillRect(0, 0, 32, 1);
    c.fillStyle = '#454c6c'; c.fillRect(0, 1, 32, 1);
  });
  for (const p of ARENA.platforms) {
    canvasTex(scene, 'plat' + p.w, p.w, 6, (c) => {
      c.fillStyle = '#3d4463'; c.fillRect(0, 0, p.w, 6);
      c.fillStyle = '#6b7598'; c.fillRect(0, 0, p.w, 1);
      c.fillStyle = '#262a40'; c.fillRect(0, 4, p.w, 2);
      for (let x = 8; x < p.w; x += 12) c.fillRect(x, 1, 1, 3);
    });
  }
  mapTex(scene, 'dummy', DUMMY, {
    t: '#4c5a2a', o: '#d9661c', O: '#f08a2a', r: '#9a3f12', y: '#ffd36a',
    s: '#8a7a5a', S: '#6a5a40', w: '#5a4030', W: '#3e2c22',
  });
  // Fond de la salle de test : dégradé nuit + fenêtres gothiques + colonnes.
  canvasTex(scene, 'bg_test', W, H, (c) => {
    for (let y = 0; y < H; y += 6) {
      const t = y / H;
      c.fillStyle = `rgb(${26 - 15 * t | 0},${22 - 12 * t | 0},${48 - 28 * t | 0})`;
      c.fillRect(0, y, W, 6);
    }
    for (const cx of [60, 160, 260]) {
      for (let y = 30; y < 120; y++) {
        const top = y - 30, hw = top < 18 ? Math.round(13 * Math.sin(Math.acos(1 - top / 18))) : 13;
        c.fillStyle = '#141024'; c.fillRect(cx - hw - 2, y, hw * 2 + 4, 1);
        c.fillStyle = (y >> 3) % 2 ? '#1c2c55' : '#223563'; c.fillRect(cx - hw, y, hw * 2, 1);
      }
      c.fillStyle = '#141024';
      c.fillRect(cx - 1, 36, 2, 84); c.fillRect(cx - 13, 70, 26, 2);
    }
    c.fillStyle = '#17132a';
    for (const cx of [110, 210]) { c.fillRect(cx - 7, 0, 14, H); c.fillRect(cx - 9, 24, 18, 4); }
  });
}
