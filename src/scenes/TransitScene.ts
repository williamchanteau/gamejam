import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { sfx } from '../audio/sfx';
import { FLOORS, floorName } from '../floors';

/** Montée d'escalier entre deux étages ; sans étage suivant : fin provisoire. */
export class TransitScene extends Phaser.Scene {
  private end = false;
  constructor() { super('Transit'); }

  create(d: { floor: number }) {
    input.reset();
    this.end = false;
    const next = FLOORS[d.floor];
    this.add.rectangle(0, 0, W, H, 0x06050c).setOrigin(0);
    // Escalier en silhouette, le personnage grimpe marche par marche.
    const g = this.add.graphics();
    for (let k = 0; k < 9; k++) {
      g.fillStyle(0x2e2b45).fillRect(150 + k * 22, 240 - k * 12, W, 12);
      g.fillStyle(0x6a6480).fillRect(150 + k * 22, 240 - k * 12, W, 1);
    }
    this.add.image(W - 40, 80, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setScale(3).setAlpha(0.35);
    const p = this.add.image(140, 240, 'p_run0').setOrigin(0.5, 1);
    const steps = 8;
    for (let k = 0; k < steps; k++)
      this.time.delayedCall(150 + k * 170, () => {
        p.setTexture(k % 2 ? 'p_run2' : 'p_run0');
        this.tweens.add({ targets: p, x: 161 + k * 22, y: 228 - k * 12, duration: 140, ease: 'Quad.out' });
        sfx.step();
      });
    txt(this, W / 2, 40, floorName(d.floor), COL.moonLight).setOrigin(0.5, 0).setScale(4);
    this.cameras.main.fadeIn(300);
    if (next) {
      txt(this, W / 2, 76, next.place, COL.ui).setOrigin(0.5, 0).setScale(2);
      this.time.delayedCall(1800, () => {
        this.cameras.main.fadeOut(300, 6, 5, 12);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next.scene));
      });
    } else {
      txt(this, W / 2, 76, 'LA SUITE ARRIVE BIENTÔT...', COL.ui).setOrigin(0.5, 0).setScale(2);
      this.time.delayedCall(1600, () => {
        this.end = true;
        txt(this, W / 2, 100, "MERCI D'AVOIR JOUÉ · ENTRÉE / J : MENU", COL.uiDim).setOrigin(0.5, 0);
      });
    }
  }

  update() {
    if (this.end && (input.take('ok') || input.take('pause'))) this.scene.start('Menu');
  }
}
