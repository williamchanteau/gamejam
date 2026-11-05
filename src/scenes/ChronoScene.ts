import Phaser from 'phaser';
import { COL } from '../config';
import { txt } from '../art/font';
import { sr, chronoShown, fmt } from '../speedrun';

// Sablier 7×8 : F = monture en pierre, S = sable de braise.
const GLASS = ['FFFFFFF', '.FSSSF.', '..FSF..', '..FSF..', '..F.F..', '.F.S.F.', '.FSSSF.', 'FFFFFFF'];
const Y = 37; // sous les cœurs, la mana et l'indice du sort

/** Chrono du speedrun, au-dessus de toutes les scènes (dernière de la liste, lancée par BootScene).
 *  Compte ici le temps de la partie : figé pendant la pause et le tuto. */
export class ChronoScene extends Phaser.Scene {
  private box!: Phaser.GameObjects.Container;
  private time$!: Phaser.GameObjects.BitmapText;
  private icon!: Phaser.GameObjects.Image;
  constructor() { super('Chrono'); }

  create() {
    if (!this.textures.exists('sr_glass')) {
      const g = this.add.graphics();
      GLASS.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') g.fillStyle(ch === 'F' ? 0x8a90b0 : COL.ember).fillRect(x, y, 1, 1); }));
      g.generateTexture('sr_glass', 7, 8);
      g.destroy();
    }
    const bg = this.add.graphics();
    bg.fillStyle(0x06050c, 0.72).fillRect(3, Y + 1, 64, 11);
    bg.lineStyle(1, 0x3d4463).strokeRect(3.5, Y + 1.5, 63, 10);
    this.icon = this.add.image(7, Y + 3, 'sr_glass').setOrigin(0);
    this.time$ = txt(this, 17, Y, '0:00.00', COL.ui);
    this.box = this.add.container(0, 0, [bg, this.icon, this.time$]).setVisible(false);
  }

  update(_t: number, dms: number) {
    const frozen = this.scene.isActive('Pause') || this.scene.isActive('Test');
    if (sr.running && !frozen) sr.t += Math.min(dms, 100);
    const on = sr.running && chronoShown();
    this.box.setVisible(on);
    if (!on) return;
    this.time$.setText(fmt(sr.t)).setTint(frozen ? COL.uiDim : COL.ui);
    this.icon.setAlpha(frozen ? 0.45 : 1);
  }
}
