import Phaser from 'phaser';
import { W, DUMMY, COL, ARENA } from '../config';
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
    this.warn = s.add.image(x, y - 33, 'glowR').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(7);
  }

  hurtRect() { return new Phaser.Geom.Rectangle(this.spr.x - 10, this.spr.y - 41, 20, 41); }
  alive() { return true; }

  hit(dmg: number, fromX: number) {
    this.spr.setTintFill(0xffffff);
    this.s.time.delayedCall(60, () => this.spr.clearTint());
    this.s.tweens.add({ targets: this.spr, angle: { from: fromX < this.spr.x ? 8 : -8, to: 0 }, duration: 200, ease: 'Back.out' });
    const n = txt(this.s, this.spr.x + Phaser.Math.Between(-9, 9), this.spr.y - 57, String(dmg), 0xffffff).setOrigin(0.5, 0).setDepth(30);
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
    const p = this.s.player, x = this.spr.x, y = this.spr.y - 33;
    const a = Phaser.Math.Angle.Between(x, y, p.x, p.y);
    const o = this.s.hazards.create(x, y, 'orb') as Phaser.Physics.Arcade.Image;
    o.setDepth(15).setData('once', true).setData('life', DUMMY.orbLife);
    (o.body as Phaser.Physics.Arcade.Body).setCircle(6, 1.5, 1.5);
    o.setVelocity(Math.cos(a) * DUMMY.orbSpeed, Math.sin(a) * DUMMY.orbSpeed);
    sfx.shoot();
  }
}

export class TestScene extends ArenaScene {
  private dummy!: Dummy;
  private torches!: { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }[];
  private flickT = 0;
  constructor() { super('Test'); }

  buildBackground() { this.add.image(0, 0, 'bg_test').setOrigin(0); }

  create() {
    super.create();
    this.dummy = new Dummy(this, 405, this.floorY);
    this.targets.push(this.dummy);
    this.torches = [168, 312].map((x) => ({
      img: this.add.image(x, 118, 'torch0').setDepth(2),
      glow: this.add.image(x, 112, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0.5).setDepth(2),
    }));
    this.panel(62, 'S/↓ : DESCENDRE\nD\'UNE PLATEFORME');
    this.panel(186, 'J/W : COMBO 3 COUPS\nCHAQUE COUP : +1 MANA');
    this.panel(310, 'MANA PLEINE : L/C\nK/X : DASH = ESQUIVE');
    txt(this, W / 2, ARENA.floorY + 16, "SALLE D'ENTRAÎNEMENT · FRAPPE L'ÉPOUVANTAIL, ESQUIVE SES ORBES · ÉCHAP : MENU", COL.ui)
      .setOrigin(0.5, 0).setDepth(6);
  }

  /** Plaque de pierre avec consigne, accrochée au mur. */
  private panel(cx: number, text: string) {
    const w = 112, h = 26, x = cx - w / 2, y = 190;
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x06050c).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0x161428).fillRect(x, y, w, h);
    g.fillStyle(0x3d4463).fillRect(x, y, w, 1).fillRect(x, y, 1, h);
    g.fillStyle(0x0d0b18).fillRect(x, y + h - 1, w, 1).fillRect(x + w - 1, y, 1, h);
    g.fillStyle(0x7a86ac);
    for (const [rx, ry] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) g.fillRect(x + rx, y + ry, 1, 1);
    txt(this, cx, y + 1, text, COL.ui).setOrigin(0.5, 0).setCenterAlign().setDepth(4);
  }

  tick(dt: number) {
    this.dummy.update(dt);
    this.flickT -= dt;
    if (this.flickT <= 0) {
      this.flickT = 0.08 + Math.random() * 0.08;
      for (const t of this.torches) {
        t.img.setTexture(Math.random() < 0.5 ? 'torch0' : 'torch1');
        t.glow.setAlpha(0.4 + Math.random() * 0.2).setScale(1.5 + Math.random() * 0.15);
      }
    }
    for (const o of [...this.hazards.getChildren()] as Phaser.Physics.Arcade.Image[]) {
      const life = o.getData('life') - dt;
      o.setData('life', life);
      if (life <= 0 || o.x < -15 || o.x > W + 15 || o.y > this.floorY + 6) o.destroy();
    }
  }
}
