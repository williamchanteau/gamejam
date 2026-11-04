import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { Menu } from '../ui/Menu';
import { FLOORS, run, saveOf } from '../floors';
import { sfx } from '../audio/sfx';

const PLACES: Record<string, string> = { Outside: 'DEVANT LE CHÂTEAU' };

/** Écran de mort : reprendre à la dernière sauvegarde (la salle, intro rejouée) ou revenir à l'accueil. */
export class GameOverScene extends Phaser.Scene {
  private from = '';
  private menu!: Menu;
  constructor() { super('GameOver'); }
  init(d: { from: string }) { this.from = d.from; }
  create() {
    input.reset();
    sfx.gameOver();
    const save = saveOf(this.from), f = FLOORS.find((x) => x.scene === save);
    const place = f ? `${f.name} · ${f.place}` : PLACES[save] ?? '';
    const dim = this.add.rectangle(0, 0, W, H, 0x06050c, 0).setOrigin(0);
    this.tweens.add({ targets: dim, fillAlpha: 0.82, duration: 350 });
    // GAME OVER rouge : claque depuis plus grand, ombre portée, léger tremblement.
    const sh = txt(this, W / 2 + 3, 32 + 3, 'GAME OVER', 0x000000).setOrigin(0.5, 0).setScale(5).setAlpha(0);
    const title = txt(this, W / 2, 32, 'GAME OVER', COL.danger).setOrigin(0.5, 0).setScale(9).setAlpha(0);
    const hard = run.hard && save !== this.from;
    const sub = txt(this, W / 2, 100, hard ? `DIFFICILE : RETOUR ${place}` : `DERNIÈRE SAUVEGARDE : ${place}`, COL.uiDim).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: title, scale: 5, alpha: 1, duration: 260, delay: 150, ease: 'Back.out', onComplete: () => this.cameras.main.shake(160, 0.008) });
    this.tweens.add({ targets: sh, alpha: 0.7, duration: 200, delay: 300 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: 450 });
    this.menu = new Menu(this, W / 2, 134, [
      { label: hard ? 'RECOMMENCER' : 'DERNIÈRE SAUVEGARDE', act: () => {
        if (save !== this.from) this.scene.stop(this.from); // sinon la salle reste en pause dessous
        this.scene.start(save);
      } },
      { label: "REVENIR À L'ACCUEIL", act: () => { this.scene.stop(this.from); this.scene.start('Menu'); } },
    ]);
    txt(this, W / 2, H - 13, '↑↓ : CHOISIR · ENTRÉE/ESPACE : VALIDER', COL.uiDim).setOrigin(0.5, 0);
  }
  update() { this.menu.update(); }
}
