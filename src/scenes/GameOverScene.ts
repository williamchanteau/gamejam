import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { Menu } from '../ui/Menu';
import { FLOORS } from '../floors';

const PLACES: Record<string, string> = { Test: 'ENTRAÎNEMENT', Outside: 'DEVANT LE CHÂTEAU' };

/** Écran de mort : reprendre à la dernière sauvegarde (la salle, intro rejouée) ou revenir à l'accueil. */
export class GameOverScene extends Phaser.Scene {
  private from = '';
  private menu!: Menu;
  constructor() { super('GameOver'); }
  init(d: { from: string }) { this.from = d.from; }
  create() {
    input.reset();
    const f = FLOORS.find((x) => x.scene === this.from);
    const place = f ? `${f.name} · ${f.place}` : PLACES[this.from] ?? '';
    const dim = this.add.rectangle(0, 0, W, H, 0x06050c, 0).setOrigin(0);
    this.tweens.add({ targets: dim, fillAlpha: 0.82, duration: 350 });
    const title = txt(this, W / 2, 56, 'TU ES TOMBÉ', COL.moonLight).setOrigin(0.5, 0).setScale(3).setAlpha(0);
    const sub = txt(this, W / 2, 96, `DERNIÈRE SAUVEGARDE : ${place}`, COL.uiDim).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: [title, sub], alpha: 1, duration: 400, delay: 150 });
    this.tweens.add({ targets: title, y: 60, duration: 500, delay: 150, ease: 'Quad.out' });
    this.menu = new Menu(this, W / 2, 128, [
      { label: 'DERNIÈRE SAUVEGARDE', act: () => this.scene.start(this.from) },
      { label: "REVENIR À L'ACCUEIL", act: () => { this.scene.stop(this.from); this.scene.start('Menu'); } },
    ]);
    txt(this, W / 2, H - 13, '↑↓ : CHOISIR · ENTRÉE/ESPACE : VALIDER', COL.uiDim).setOrigin(0.5, 0);
  }
  update() { this.menu.update(); }
}
