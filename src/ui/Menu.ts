import Phaser from 'phaser';
import { COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { sfx } from '../audio/sfx';

export type Item = { label: string; act: () => void };

/** Liste verticale : ↑↓ ou Z/S, valider Entrée/Espace/J, ou souris. */
export class Menu {
  i = 0;
  enabled = true;
  private texts: Phaser.GameObjects.BitmapText[];
  private cursor: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene, x: number, y: number, private items: Item[], private scale = 2, gap = 24) {
    this.texts = items.map((it, k) => {
      const t = txt(scene, x, y + k * gap, it.label).setOrigin(0.5, 0).setScale(scale).setDepth(50).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.enabled && this.select(k));
      t.on('pointerdown', () => { if (!this.enabled) return; this.select(k); this.confirm(); });
      return t;
    });
    this.cursor = scene.add.image(0, 0, 'cursor').setDepth(50);
    scene.tweens.add({ targets: this.cursor, scaleX: 0.7, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.select(0, true);
  }

  select(k: number, silent = false) {
    if (k === this.i && !silent) return;
    this.i = (k + this.items.length) % this.items.length;
    this.texts.forEach((t, j) => t.setTint(j === this.i ? COL.moonLight : COL.uiDim));
    const t = this.texts[this.i];
    this.cursor.setPosition(Math.round(t.x - t.displayWidth / 2 - 10), Math.round(t.y + 5.5 * this.scale));
    if (!silent) sfx.tick();
  }

  confirm() {
    sfx.select();
    input.reset();
    this.items[this.i].act();
  }

  update() {
    if (!this.enabled) return;
    if (input.take('up')) this.select(this.i - 1);
    if (input.take('down')) this.select(this.i + 1);
    if (input.take('ok')) this.confirm();
  }
}
