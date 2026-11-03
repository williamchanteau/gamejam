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
    for (let i = 0; i < PLAYER.hp; i++) this.hearts.push(scene.add.image(4 + i * 9, 4, 'hp_full').setOrigin(0).setDepth(100));
    scene.add.rectangle(4, 13, 46, 6, 0x06050c).setOrigin(0).setDepth(100);
    scene.add.rectangle(5, 14, 44, 4, 0x1b1f33).setOrigin(0).setDepth(100);
    this.fill = scene.add.rectangle(5, 14, 0, 4, COL.moon).setOrigin(0).setDepth(101);
    this.hint = txt(scene, 53, 11, 'L/C : ÉCLAT LUNAIRE', COL.moonLight).setDepth(101);
    this.god = txt(scene, 4, 19, 'INVINCIBLE (F2)', COL.uiDim).setDepth(101);
    txt(scene, W - 3, 0, 'Q/D ou ←/→ : BOUGER · Z/↑/ESPACE : SAUTER\nS/↓ : DESCENDRE · J/W : ATTAQUER\nK/X : DASH (ESQUIVE) · L/C : SORT · ÉCHAP : PAUSE', COL.uiDim)
      .setOrigin(1, 0).setRightAlign().setDepth(100);
  }

  update() {
    const p = this.player, full = p.mana >= PLAYER.manaMax, t = this.scene.time.now;
    this.hearts.forEach((h, i) => h.setTexture(i < p.hp ? 'hp_full' : 'hp_empty'));
    this.fill.width = Math.round((44 * p.mana) / PLAYER.manaMax);
    this.fill.fillColor = full && Math.floor(t / 120) % 2 ? COL.moonLight : COL.moon;
    this.hint.setVisible(full);
    this.god.setVisible(p.god);
  }
}
