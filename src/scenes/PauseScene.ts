import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { Menu } from '../ui/Menu';

export class PauseScene extends Phaser.Scene {
  private from = '';
  private menu!: Menu;
  constructor() { super('Pause'); }
  init(d: { from: string }) { this.from = d.from; }
  create() {
    input.reset();
    this.add.rectangle(0, 0, W, H, 0x06050c, 0.75).setOrigin(0);
    txt(this, W / 2, 70, 'PAUSE', COL.moonLight).setOrigin(0.5, 0).setScale(3);
    this.menu = new Menu(this, W / 2, 112, [
      { label: 'REPRENDRE', act: () => this.resume() },
      { label: 'RECOMMENCER', act: () => this.scene.start(this.from) },
      { label: 'MENU PRINCIPAL', act: () => { this.scene.stop(this.from); this.scene.start('Menu'); } },
    ]);
    txt(this, W / 2, H - 13, 'ÉCHAP : REPRENDRE', COL.uiDim).setOrigin(0.5, 0);
  }
  private resume() {
    input.reset();
    this.scene.resume(this.from);
    this.scene.stop();
  }
  update() {
    if (input.take('pause')) return this.resume();
    this.menu.update();
  }
}
