import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { Menu } from '../ui/Menu';
import { OptionsPanel } from '../ui/Options';

export class PauseScene extends Phaser.Scene {
  private from = '';
  private menu!: Menu;
  private opts: OptionsPanel | null = null;
  constructor() { super('Pause'); }
  init(d: { from: string }) { this.from = d.from; }
  create() {
    input.reset();
    this.opts = null;
    this.add.rectangle(0, 0, W, H, 0x06050c, 0.75).setOrigin(0);
    txt(this, W / 2, 56, 'PAUSE', COL.moonLight).setOrigin(0.5, 0).setScale(3);
    this.menu = new Menu(this, W / 2, 100, [
      { label: 'REPRENDRE', act: () => this.resume() },
      { label: 'RECOMMENCER', act: () => this.scene.start(this.from, { retry: true }) },
      { label: 'OPTIONS', act: () => { this.menu.setVisible(false); this.menu.enabled = false; this.opts = new OptionsPanel(this, () => { this.opts = null; this.menu.setVisible(true); this.menu.enabled = true; }); } },
      { label: 'MENU PRINCIPAL', act: () => { this.scene.stop(this.from); this.scene.start('Menu'); } },
    ]);
    txt(this, W / 2, H - 13, 'ÉCHAP : REPRENDRE · M : COUPER LA MUSIQUE', COL.uiDim).setOrigin(0.5, 0);
  }
  private resume() {
    input.reset();
    this.scene.resume(this.from);
    this.scene.stop();
  }
  update() {
    if (this.opts) return this.opts.update();
    if (input.take('pause')) return this.resume();
    this.menu.update();
  }
}
