import Phaser from 'phaser';
import { W, DUMMY, COL } from '../config';
import { ArenaScene } from './ArenaScene';
import { txt } from '../art/font';
import { sfx } from '../audio/sfx';
import type { Target } from '../entities/types';

/** Épouvantail d'entraînement : encaisse les coups et tire une orbe lente. */
class Dummy implements Target {
  spr: Phaser.GameObjects.Image;
  private warn: Phaser.GameObjects.Image;
  private t = DUMMY.fireEvery;
  private warned = false;

  constructor(private s: TestScene, x: number, y: number) {
    this.spr = s.add.image(x, y + 1, 'dummy').setOrigin(0.5, 1).setDepth(6);
    this.warn = s.add.image(x, y - 22, 'glowR').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(7);
  }

  hurtRect() { return new Phaser.Geom.Rectangle(this.spr.x - 7, this.spr.y - 27, 14, 27); }
  alive() { return true; }

  hit(dmg: number, fromX: number) {
    this.spr.setTintFill(0xffffff);
    this.s.time.delayedCall(60, () => this.spr.clearTint());
    this.s.tweens.add({ targets: this.spr, angle: { from: fromX < this.spr.x ? 8 : -8, to: 0 }, duration: 200, ease: 'Back.out' });
    const n = txt(this.s, this.spr.x + Phaser.Math.Between(-6, 6), this.spr.y - 38, String(dmg), 0xffffff).setOrigin(0.5, 0).setDepth(30);
    this.s.tweens.add({ targets: n, y: n.y - 12, alpha: 0, duration: 600, onComplete: () => n.destroy() });
  }

  update(dt: number) {
    this.t -= dt;
    if (this.t < DUMMY.telegraph) {
      if (!this.warned) { this.warned = true; sfx.warn(); }
      this.warn.setAlpha(0.5 + 0.5 * Math.sin(this.t * 40)).setScale(1 + (DUMMY.telegraph - this.t));
    }
    if (this.t > 0) return;
    this.t = DUMMY.fireEvery; this.warned = false; this.warn.setAlpha(0);
    const p = this.s.player, x = this.spr.x, y = this.spr.y - 22;
    const a = Phaser.Math.Angle.Between(x, y, p.x, p.y);
    const o = this.s.hazards.create(x, y, 'orb') as Phaser.Physics.Arcade.Image;
    o.setDepth(15).setData('once', true).setData('life', DUMMY.orbLife);
    (o.body as Phaser.Physics.Arcade.Body).setCircle(4, 1, 1);
    o.setVelocity(Math.cos(a) * DUMMY.orbSpeed, Math.sin(a) * DUMMY.orbSpeed);
    sfx.shoot();
  }
}

export class TestScene extends ArenaScene {
  private dummy!: Dummy;
  constructor() { super('Test'); }

  buildBackground() { this.add.image(0, 0, 'bg_test').setOrigin(0); }

  create() {
    super.create();
    this.dummy = new Dummy(this, 250, this.floorY);
    this.targets.push(this.dummy);
    txt(this, W / 2, 162, "SALLE D'ENTRAÎNEMENT · FRAPPE L'ÉPOUVANTAIL, ESQUIVE SES ORBES", COL.uiDim).setOrigin(0.5, 0).setDepth(6);
  }

  tick(dt: number) {
    this.dummy.update(dt);
    for (const o of [...this.hazards.getChildren()] as Phaser.Physics.Arcade.Image[]) {
      const life = o.getData('life') - dt;
      o.setData('life', life);
      if (life <= 0 || o.x < -10 || o.x > W + 10 || o.y > this.floorY + 4) o.destroy();
    }
  }
}
