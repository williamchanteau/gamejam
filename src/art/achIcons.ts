// Icônes pixel des succès (9×9) : G = or, L = reflet, D = ombre. Verrouillé : même forme, teinte pierre.
import Phaser from 'phaser';
import { mapTex, canvasTex } from './pixel';

const PAL = { G: '#ffd36a', L: '#fff0b0', D: '#c8902a' };
const ICONS: Record<string, string[]> = {
  boss1: ['........L', '.......LG', '......LG.', '.....LG..', '..D.LG...', '...DG....', '...GD....', '..G..D...', '.G.......'],
  boss2: ['...DDD...', '....D....', '..DDDDD..', '..DLGLD..', '..DGLGD..', '..DLGLD..', '..DDDDD..', '...DDD...', '.........'],
  crown: ['.........', 'L...L...L', 'GL.LGL.LG', 'GGLGGGLGG', 'GGGGGGGGG', 'GDGDGDGDG', 'GGGGGGGGG', 'DDDDDDDDD', '.........'],
  nohit: ['.DDDDDDD.', '.DLLGGGD.', '.DLGGGGD.', '.DLGGGGD.', '.DGGGGGD.', '..DGGGD..', '...DGD...', '....D....', '.........'],
  hard: ['..DDDDD..', '.DGGGGGD.', 'DGGGGGGGD', 'DG..G..GD', 'DGGGLGGGD', '.DGGGGGD.', '..DGDGD..', '..D.D.D..', '.........'],
  fast: ['DDDDDDDDD', '.DLLLLLD.', '..DGGGD..', '...DGD...', '...DGD...', '..D.G.D..', '.D..G..D.', 'DDDDDDDDD', '.........'],
  deathless: ['.DD...DD.', 'DLGD.DGGD', 'DLGGDGGGD', 'DGGGGGGGD', '.DGGGGGD.', '..DGGGD..', '...DGD...', '....D....', '.........'],
};
const LOCK = ['..DDD..', '.D...D.', '.D...D.', 'DDDDDDD', 'DGGGGGD', 'DGG.GGD', 'DGGGGGD', 'DDDDDDD'];
/** Médaillon 13×13 en pixels (rond net, pas de cercle vectoriel) : anneau + fond. */
function medal(scene: Phaser.Scene, key: string, ring: string, inner: string, fill: string) {
  canvasTex(scene, key, 13, 13, (c) => {
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
      const d = Math.hypot(x - 6, y - 6);
      if (d > 6.45) continue;
      c.fillStyle = d > 5.4 ? ring : d > 4.6 ? inner : fill;
      c.fillRect(x, y, 1, 1);
    }
  });
}
export function makeAchIcons(scene: Phaser.Scene) {
  if (scene.textures.exists('ach_lock')) return;
  for (const k in ICONS) mapTex(scene, 'ach_' + k, ICONS[k], PAL, null);
  mapTex(scene, 'ach_lock', LOCK, { D: '#6a6f8e', G: '#3d4463' });
  medal(scene, 'ach_med_on', '#ffd36a', '#8a5a1a', '#3a2a14');
  medal(scene, 'ach_med_off', '#3d4463', '#1b1f33', '#13111f');
}
