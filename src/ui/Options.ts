import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input, getLayout, setLayout, keyLabel } from '../input';
import { Menu } from './Menu';

/** Panneau OPTIONS (menu titre et pause) : clavier AZERTY/QWERTY. Échap ou RETOUR ferme. */
export class OptionsPanel {
  private menu: Menu;
  private box: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, private onClose: () => void) {
    input.reset();
    const w = 280, h = 120, x = W / 2 - w / 2, y = 80;
    const g = scene.add.graphics();
    g.fillStyle(0x06050c, 0.85).fillRect(0, 0, W, H);
    g.fillStyle(0x161428).fillRect(x, y, w, h);
    g.lineStyle(1, 0x3d4463).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const head = txt(scene, W / 2, y + 8, 'OPTIONS', COL.moonLight).setOrigin(0.5, 0);
    const keys = txt(scene, W / 2, y + 88, '', COL.uiDim).setOrigin(0.5, 0).setCenterAlign();
    const show = () => keys.setText(`←→ BOUGER · ↑/ESPACE SAUTER · ↓ DESCENDRE\n${keyLabel('attack')} ATTAQUE · ${keyLabel('dash')} DASH · ${keyLabel('spell')} SORT`);
    show();
    this.box = scene.add.container(0, 0, [g, head, keys]).setDepth(55);
    this.menu = new Menu(scene, W / 2, y + 26, [
      { label: `CLAVIER : ${getLayout()}`, act: () => { setLayout(getLayout() === 'AZERTY' ? 'QWERTY' : 'AZERTY'); this.menu.setLabel(0, `CLAVIER : ${getLayout()}`); show(); } },
      { label: 'RETOUR', act: () => this.close() },
    ], { depth: 60 });
  }

  close() {
    this.menu.destroy();
    this.box.destroy();
    input.reset();
    this.onClose();
  }

  update() {
    if (input.take('pause')) return this.close();
    this.menu.update();
  }
}
