import Phaser from 'phaser';
import { W, DUMMY, COL, ARENA, PLAYER } from '../config';
import { ArenaScene } from './ArenaScene';
import { txt } from '../art/font';
import { sfx } from '../audio/sfx';
import type { Target } from '../entities/types';
import { input, keyLabel, moveLabel, bindVer } from '../input';
import { Portal } from '../entities/Portal';
import { iris } from '../ui/Iris';

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
  private ver = bindVer();
  private portal!: Portal;
  private leaving = false;
  showControls = false;
  spawnX = 44;
  constructor() { super('Test'); }

  buildBackground() { this.add.image(0, 0, 'bg_test').setOrigin(0); }

  create(data?: { retry?: boolean }) {
    super.create(data);
    this.ver = bindVer();
    this.leaving = false;
    // Portail de retour au château, au bord gauche.
    this.portal = new Portal(this, 18, this.floorY);
    if (!data?.retry) this.portal.spit();
    else this.cameras.main.fadeIn(300);
    this.dummy = new Dummy(this, 452, this.floorY);
    this.targets.push(this.dummy);
    this.torches = [168, 312].map((x) => ({
      img: this.add.image(x, 118, 'torch0').setDepth(2),
      glow: this.add.image(x, 112, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0.5).setDepth(2),
    }));
    // Panneaux placés là où l'action sert : au sol, au-dessus des plateformes, suspendu au plafond.
    const A = keyLabel('attack'), Z = keyLabel('dash'), E = keyLabel('spell');
    this.sign('post', 124, 192, `${moveLabel()} : BOUGER\n${keyLabel('jump')} : SAUTER`);
    this.sign('wall', 100, 128, `${keyLabel('down')} : DESCENDRE\nDE LA PLATEFORME`);
    this.sign('post', 246, 180, `${A} : COMBO 3 COUPS\n+1 MANA PAR COUP`);
    this.sign('wall', 380, 128, `${Z} : DASH\n= ESQUIVE (INVINCIBLE)`);
    this.sign('hang', 240, 52, `MANA PLEINE ? ${E} : ÉCLAT LUNAIRE`);
    txt(this, W / 2, ARENA.floorY + 16, "ENTRAÎNEMENT · FRAPPE L'ÉPOUVANTAIL · ESQUIVE SES ORBES · ← PORTAIL : CHÂTEAU", COL.ui)
      .setOrigin(0.5, 0).setDepth(6);
  }

  /** Panneau : planche sur piquet (sol), plaque de pierre (mur) ou enseigne à chaînes (plafond). */
  private sign(kind: 'post' | 'wall' | 'hang', cx: number, y: number, text: string) {
    const t = txt(this, cx, y + 5, text, kind === 'post' ? 0xf0dcc0 : COL.ui).setOrigin(0.5, 0).setCenterAlign().setDepth(4);
    const w = Math.ceil(t.width / 2) * 2 + 14, h = Math.ceil(t.height) + 9, x = Math.round(cx - w / 2);
    const g = this.add.graphics().setDepth(3);
    if (kind === 'post') { // piquet planté
      const fy = this.floorY;
      g.fillStyle(0x06050c).fillRect(cx - 3, y + h, 6, fy - y - h);
      g.fillStyle(0x4a2e1a).fillRect(cx - 2, y + h, 4, fy - y - h);
      g.fillStyle(0x6a4428).fillRect(cx - 2, y + h, 1, fy - y - h);
      g.fillStyle(0x24402a).fillRect(cx - 4, fy - 2, 2, 2).fillRect(cx + 3, fy - 3, 1, 3);
    } else if (kind === 'hang') { // chaînes
      for (const hx of [x + 10, x + w - 11])
        for (let yy = 0; yy < y - 1; yy += 4) { g.fillStyle(0x06050c).fillRect(hx - 1, yy, 3, 3); g.fillStyle(0x4a4868).fillRect(hx, yy + 1, 1, 1); }
    } else { // pattes de fer
      g.fillStyle(0x06050c).fillRect(x - 4, y + 3, 5, 4).fillRect(x + w - 1, y + 3, 5, 4);
      g.fillStyle(0x4a4868).fillRect(x - 3, y + 4, 3, 1).fillRect(x + w, y + 4, 3, 1);
    }
    const [base, hi, lo] = kind === 'post' ? [0x4a2e1a, 0x7a5232, 0x24160c] : [0x161428, 0x3d4463, 0x0d0b18];
    g.fillStyle(0x06050c).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(base).fillRect(x, y, w, h);
    if (kind === 'post') { g.fillStyle(0x3a2414); for (let yy = y + 6; yy < y + h - 2; yy += 7) g.fillRect(x + 1, yy, w - 2, 1); }
    g.fillStyle(hi).fillRect(x, y, w, 1).fillRect(x, y, 1, h);
    g.fillStyle(lo).fillRect(x, y + h - 1, w, 1).fillRect(x + w - 1, y, 1, h);
    g.fillStyle(kind === 'post' ? 0xc8a050 : 0x7a86ac);
    for (const [rx, ry] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) g.fillRect(x + rx, y + ry, 1, 1);
  }

  /** Pas de GAME OVER à l'entraînement : iris violet, puis le joueur re-rentre par le portail. */
  onPlayerDeath() {
    this.leaving = true; // un corps qui glisse vers le portail ne s'y fait pas aspirer
    this.time.delayedCall(PLAYER.deathRetryDelay * 1000, () =>
      iris(this, this.portal.x, this.portal.cy, false, 520, 0x9a5ae8, () => this.scene.restart({ retry: false }))); // sans données, restart garderait un ancien retry
  }

  tick(dt: number) {
    if (this.ver !== bindVer()) { this.scene.restart({ retry: true }); return; } // panneaux à réécrire
    this.dummy.update(dt);
    if (!this.leaving && this.player.x < 24 && this.portal.holds(this.player.y) && input.isDown('left')) { // pas de sortie sur un recul
      this.leaving = true;
      this.portal.swallow(() => this.scene.start('Outside', { fromTuto: true }));
    }
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
