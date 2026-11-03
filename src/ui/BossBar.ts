import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import type { Boss } from '../entities/Boss';

// Barre de vie du boss, EN BAS, avec son nom. Argent/lilas (le rouge est réservé au danger).
export class BossBar {
  private fill: Phaser.GameObjects.Rectangle;
  private trail: Phaser.GameObjects.Rectangle;
  private shown = 0;
  private trailW = 0;
  private readonly w = 280;

  constructor(private scene: Phaser.Scene, private boss: Boss) {
    const w = this.w, x = (W - w) / 2, y = H - 11;
    scene.add.rectangle(x - 3, y - 3, w + 6, 10, 0x06050c).setOrigin(0).setDepth(100).setScrollFactor(0);
    scene.add.rectangle(x - 2, y - 2, w + 4, 8, 0x3d4463).setOrigin(0).setDepth(100).setScrollFactor(0);
    scene.add.rectangle(x, y, w, 4, 0x14121f).setOrigin(0).setDepth(100).setScrollFactor(0);
    this.trail = scene.add.rectangle(x, y, 0, 4, 0xf0ecff).setOrigin(0).setDepth(101).setScrollFactor(0);
    this.fill = scene.add.rectangle(x, y, 0, 4, 0xa8a0d8).setOrigin(0).setDepth(102).setScrollFactor(0);
    scene.add.rectangle(x, y, w, 1, 0xffffff, 0.25).setOrigin(0).setDepth(103).setScrollFactor(0);
    scene.add.rectangle(x + w / 2, y - 2, 1, 8, 0x06050c).setOrigin(0).setDepth(103).setScrollFactor(0); // repère 50 %
    for (const ex of [x - 6, x + w + 5]) scene.add.rectangle(ex, y + 2, 5, 5, 0x7a86ac).setAngle(45).setDepth(103).setScrollFactor(0);
    const name = `${boss.def.name}, ${boss.def.title}`;
    const bg = scene.add.rectangle(W / 2, y - 14, name.length * 6 + 8, 11, 0x06050c, 0.7).setDepth(100).setScrollFactor(0);
    txt(scene, W / 2, bg.y - 7, name, COL.ui).setOrigin(0.5, 0).setDepth(101).setScrollFactor(0);
  }

  /** Remplit la barre (animée pendant l'intro, immédiate au retry). */
  fillUp(sec: number) {
    if (sec <= 0) { this.shown = this.trailW = 1; return; }
    this.scene.tweens.add({ targets: this, shown: 1, trailW: 1, duration: sec * 1000, ease: 'Quad.out' });
  }

  update(dt: number) {
    const b = this.boss, r = b.hp / b.maxHp;
    if (b.state !== 'intro') {
      this.shown = r;
      this.trailW = this.trailW > r ? Math.max(r, this.trailW - dt * 0.35) : r;
    }
    this.fill.width = Math.round(this.w * this.shown);
    this.trail.width = Math.round(this.w * this.trailW);
    this.fill.fillColor = b.phase === 2 ? 0xc8b8f0 : 0xa8a0d8;
  }
}
