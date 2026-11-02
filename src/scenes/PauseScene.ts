import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';

export class PauseScene extends Phaser.Scene {
  private from = '';
  constructor() { super('Pause'); }
  init(d: { from: string }) { this.from = d.from; }
  create() {
    this.add.rectangle(0, 0, W, H, 0x06050c, 0.7).setOrigin(0);
    txt(this, W / 2, 70, 'PAUSE', COL.moonLight).setOrigin(0.5, 0).setScale(2);
    txt(this, W / 2, 96, 'ÉCHAP : REPRENDRE', COL.ui).setOrigin(0.5, 0);
  }
  update() {
    if (!input.take('pause')) return;
    this.scene.resume(this.from);
    this.scene.stop();
  }
}
