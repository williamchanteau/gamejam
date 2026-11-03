import Phaser from 'phaser';
import { PLAYER, COL, W } from '../config';
import { txt } from '../art/font';
import type { Player } from '../entities/Player';

// HUD en haut : PV, mana, contrôles. (Le bas est réservé à la barre du boss.)
export class Hud {
  private hearts: Phaser.GameObjects.Image[] = [];
  private fill: Phaser.GameObjects.Rectangle;
  private hint: Phaser.GameObjects.BitmapText;
  private god: Phaser.GameObjects.BitmapText;

  constructor(private scene: Phaser.Scene, private player: Player) {
    for (let i = 0; i < PLAYER.hp; i++) this.hearts.push(scene.add.image(5 + i * 11, 5, 'hp_full').setOrigin(0).setDepth(100).setScrollFactor(0));
    scene.add.rectangle(6, 17, 66, 8, 0x06050c).setOrigin(0).setDepth(100).setScrollFactor(0);
    scene.add.rectangle(7, 18, 64, 6, 0x1b1f33).setOrigin(0).setDepth(100).setScrollFactor(0);
    this.fill = scene.add.rectangle(7, 18, 0, 6, COL.moon).setOrigin(0).setDepth(101).setScrollFactor(0);
    this.hint = txt(scene, 6, 25, 'L/C : ÉCLAT LUNAIRE', COL.moonLight).setDepth(101).setScrollFactor(0);
    this.god = txt(scene, 6, 37, 'INVINCIBLE (F2)', COL.uiDim).setDepth(101).setScrollFactor(0);
    scene.add.rectangle(W, 0, 300, 39, 0x06050c, 0.7).setOrigin(1, 0).setDepth(99).setScrollFactor(0);
    txt(scene, W - 4, 1, 'Q/D ou ←/→ : BOUGER · Z/↑/ESPACE : SAUTER\nS/↓ : DESCENDRE · J/W : ATTAQUER\nK/X : DASH (ESQUIVE) · L/C : SORT · ÉCHAP/P : PAUSE', COL.uiDim)
      .setOrigin(1, 0).setRightAlign().setDepth(100).setScrollFactor(0);
  }

  update() {
    const p = this.player, full = p.mana >= PLAYER.manaMax, t = this.scene.time.now;
    this.hearts.forEach((h, i) => h.setTexture(i < p.hp ? 'hp_full' : 'hp_empty'));
    this.fill.width = Math.round((64 * p.mana) / PLAYER.manaMax);
    this.fill.fillColor = full && Math.floor(t / 120) % 2 ? COL.moonLight : COL.moon;
    this.hint.setVisible(full);
    this.god.setVisible(p.god);
  }
}
