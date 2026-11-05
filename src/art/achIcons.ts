// Icônes pixel des succès (9×9) : G = or, L = reflet, D = ombre. Verrouillé : même forme, teinte pierre.
import Phaser from 'phaser';
import { mapTex } from './pixel';

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
export function makeAchIcons(scene: Phaser.Scene) {
  for (const k in ICONS) if (!scene.textures.exists('ach_' + k)) mapTex(scene, 'ach_' + k, ICONS[k], PAL, null);
}
