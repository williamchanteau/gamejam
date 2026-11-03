import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import type { Boss } from '../entities/Boss';
import { sfx } from '../audio/sfx';

// Barre de vie du boss, EN BAS, avec son nom. Argent/lilas (le rouge est réservé au danger).
export class BossBar {
  private fill: Phaser.GameObjects.Rectangle;
  private trail: Phaser.GameObjects.Rectangle;
  private shown = 0;
  private trailW = 0;
  private readonly w = 280;
  private x0: number; private y0: number;
  private mark: Phaser.GameObjects.Rectangle;
  /** Phase 2 : 0 = pas encore, 1 = barre qui brille et se recharge, 2 = la moitié restante remplit la barre. */
  private p2 = 0;
  private glowT = 0;
  private shine!: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene, private boss: Boss) {
    const w = this.w, x = (W - w) / 2, y = H - 11;
    this.x0 = x; this.y0 = y; this.p2 = 0; this.glowT = 0;
    scene.add.rectangle(x - 3, y - 3, w + 6, 10, 0x06050c).setOrigin(0).setDepth(100).setScrollFactor(0);
    scene.add.rectangle(x - 2, y - 2, w + 4, 8, 0x3d4463).setOrigin(0).setDepth(100).setScrollFactor(0);
    scene.add.rectangle(x, y, w, 4, 0x14121f).setOrigin(0).setDepth(100).setScrollFactor(0);
    this.trail = scene.add.rectangle(x, y, 0, 4, 0xf0ecff).setOrigin(0).setDepth(101).setScrollFactor(0);
    this.fill = scene.add.rectangle(x, y, 0, 4, 0xa8a0d8).setOrigin(0).setDepth(102).setScrollFactor(0);
    scene.add.rectangle(x, y, w, 1, 0xffffff, 0.25).setOrigin(0).setDepth(103).setScrollFactor(0);
    this.mark = scene.add.rectangle(x + w / 2, y - 2, 1, 8, 0x06050c).setOrigin(0).setDepth(103).setScrollFactor(0); // repère 50 %
    this.shine = scene.add.rectangle(x, y - 1, 10, 6, 0xfff4c0, 0).setOrigin(0).setDepth(104).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
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

  /** À 50 % : la barre brille en or 3 s et se recharge ; ensuite la moitié restante des PV remplit toute la barre. */
  private startP2() {
    this.p2 = 1; this.glowT = 3;
    const sc = this.scene, x = this.x0, y = this.y0, w = this.w;
    sc.tweens.add({ targets: this.mark, alpha: 0, duration: 300 });
    // Reflet qui balaie la barre en boucle.
    sc.tweens.add({ targets: this.shine, x: { from: x - 10, to: x + w }, alpha: { from: 0.9, to: 0.9 }, duration: 420, repeat: 6, onComplete: () => this.shine.setAlpha(0) });
    // Étincelles dorées le long de la barre.
    const fx = sc.add.particles(0, 0, 'px', {
      x: { min: x, max: x + w }, y: y + 2, speedY: { min: -40, max: -10 }, speedX: { min: -10, max: 10 }, lifespan: 500,
      scale: { start: 1, end: 0 }, tint: [0xffd36a, 0xfff4c0, 0xff8a2a], frequency: 25,
    }).setDepth(104).setScrollFactor(0);
    sc.time.delayedCall(3000, () => { fx.stop(); sc.time.delayedCall(600, () => fx.destroy()); });
    // Recharge (tout le monde voit la barre repartir pleine).
    sc.time.delayedCall(700, () => {
      sfx.manaFull();
      sc.tweens.add({ targets: this, shown: 1, trailW: 1, duration: 900, ease: 'Cubic.out', onComplete: () => { this.p2 = 2; } });
    });
  }

  update(dt: number) {
    const b = this.boss;
    if (b.phase === 2 && this.p2 === 0) this.startP2();
    const r = this.p2 === 2 ? b.hp / (b.maxHp / 2) : b.hp / b.maxHp;
    if (b.state !== 'intro' && this.p2 !== 1) {
      this.shown = r;
      this.trailW = this.trailW > r ? Math.max(r, this.trailW - dt * 0.35) : r;
    }
    this.fill.width = Math.round(this.w * this.shown);
    this.trail.width = Math.round(this.w * this.trailW);
    this.glowT = Math.max(0, this.glowT - dt);
    if (this.glowT > 0) { // or qui pulse
      const k = 0.5 + 0.5 * Math.sin(this.scene.time.now / 70);
      this.fill.fillColor = k > 0.5 ? 0xffd36a : 0xffe9a0;
      this.trail.fillColor = 0xfff4c0;
    } else {
      this.fill.fillColor = b.phase === 2 ? 0xc8b8f0 : 0xa8a0d8;
      this.trail.fillColor = 0xf0ecff;
    }
  }
}
