import Phaser from 'phaser';
import { COL } from '../config';
import { txt } from '../art/font';
import { sr, chronoShown, fmt } from '../speedrun';
import { onUnlock, SKINS, type Ach } from '../achievements';
import { sfx } from '../audio/sfx';

// Sablier 7×8 : F = monture en pierre, S = sable de braise.
const GLASS = ['FFFFFFF', '.FSSSF.', '..FSF..', '..FSF..', '..F.F..', '.F.S.F.', '.FSSSF.', 'FFFFFFF'];
const Y = 37; // sous les cœurs, la mana et l'indice du sort

/** Chrono du speedrun, au-dessus de toutes les scènes (dernière de la liste, lancée par BootScene).
 *  Compte ici le temps de la partie : figé pendant la pause et le tuto. */
export class ChronoScene extends Phaser.Scene {
  private box!: Phaser.GameObjects.Container;
  private time$!: Phaser.GameObjects.BitmapText;
  private icon!: Phaser.GameObjects.Image;
  private queue: Ach[] = [];
  private showing = false;
  constructor() { super('Chrono'); }

  /** Bandeau de succès en haut : glisse, reste 3 s, repart ; les suivants attendent leur tour. */
  private toast() {
    const a = this.queue.shift();
    if (!a) { this.showing = false; return; }
    this.showing = true;
    sfx.powerUp();
    const skin = a.skin && SKINS.find((s) => s.id === a.skin);
    const l1 = txt(this, 0, 4, 'SUCCÈS : ' + a.name, 0xffd36a).setOrigin(0.5, 0);
    const l2 = txt(this, 0, 15, skin ? 'SKIN DÉBLOQUÉ : ' + skin.name : a.desc, COL.moonLight).setOrigin(0.5, 0);
    const w = Math.max(l1.width, l2.width) + 24, g = this.add.graphics();
    g.fillStyle(0x06050c, 0.9).fillRect(-w / 2, 0, w, 28);
    g.lineStyle(1, 0xffd36a, 0.8).strokeRect(-w / 2 + 0.5, 0.5, w - 1, 27);
    const box = this.add.container(240, -32, [g, l1, l2]).setDepth(200);
    this.tweens.chain({ targets: box, tweens: [
      { y: 4, duration: 260, ease: 'Back.out' },
      { y: -32, duration: 220, delay: 3000, ease: 'Quad.in', onComplete: () => { box.destroy(); this.toast(); } },
    ] });
  }

  create() {
    this.queue = []; this.showing = false;
    onUnlock((a) => { this.queue.push(a); if (!this.showing) this.toast(); });
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
