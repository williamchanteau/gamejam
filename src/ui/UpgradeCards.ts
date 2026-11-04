import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input, goFullscreen } from '../input';
import { sfx } from '../audio/sfx';
import { capeTex } from '../art/player';
import type { Upgrade } from '../floors';

const D = 205, CW = 150, CH = 178, CY = 166, CX = [122, 358];
type Card = { c: Phaser.GameObjects.Container; frame: Phaser.GameObjects.Graphics; zone: Phaser.GameObjects.Zone };

/** « UPGRADE SPELL! » : deux cartes animées, ←/→ + Entrée/Espace ou souris. `onPick` une fois le choix joué. */
export class UpgradeCards {
  private i = 0;
  private ready = false;
  private cards: Card[] = [];
  private loops: Phaser.Time.TimerEvent[] = [];
  private extras: Phaser.GameObjects.GameObject[] = [];
  private dim: Phaser.GameObjects.Rectangle;
  private rays: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.BitmapText;
  private rayT = 0;

  constructor(private s: Phaser.Scene, private onPick: (u: Upgrade) => void) {
    input.reset();
    this.dim = s.add.rectangle(0, 0, W, H, 0x06050c, 0).setOrigin(0).setDepth(D - 3).setScrollFactor(0);
    s.tweens.add({ targets: this.dim, fillAlpha: 0.84, duration: 220 });
    this.rays = s.add.graphics({ x: W / 2, y: 40 }).setDepth(D - 2).setScrollFactor(0);
    // Le titre claque, doré, avec une ombre noire et une gerbe d'étincelles.
    const sh = txt(s, W / 2 + 3, 19, 'UPGRADE SPELL!', 0x000000).setOrigin(0.5, 0).setScale(4).setDepth(D - 1).setScrollFactor(0).setAlpha(0);
    this.title = txt(s, W / 2, 16, 'UPGRADE SPELL!', 0xffd36a).setOrigin(0.5, 0).setScale(9).setDepth(D).setScrollFactor(0).setAlpha(0);
    this.extras.push(sh);
    s.tweens.add({ targets: this.title, scale: 4, alpha: 1, duration: 240, ease: 'Back.out', onComplete: () => {
      sfx.slam(); s.cameras.main.shake(160, 0.008);
      s.tweens.add({ targets: sh, alpha: 0.8, duration: 80 });
      s.tweens.add({ targets: this.title, scale: 4.12, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    } });
    sfx.powerUp();

    this.cards = [
      this.card(0, ['DOUBLE', 'VAGUE'], ['TON SORT PART EN', "2 VAGUES D'AFFILÉE"], (c) => this.demoWave(c)),
      this.card(1, ['LAMES', 'DU DASH'], ['TON DASH PLANTE TES', 'DEUX DAGUES EN CROIX'], (c) => this.demoDash(c)),
    ];
    this.cards.forEach((k, j) => {
      // Entrée : monte en tournant sur elle-même (scaleX 0 → 1).
      k.c.setScale(0, 1).setY(CY + 170);
      s.tweens.add({ targets: k.c, y: CY, scaleX: 1, duration: 420, delay: 260 + j * 170, ease: 'Back.out', onStart: () => sfx.whoosh() });
    });
    const hint = txt(s, W / 2, H - 13, '←→ : CHOISIR · ENTRÉE/ESPACE : VALIDER', COL.uiDim).setOrigin(0.5, 0).setDepth(D).setScrollFactor(0).setAlpha(0);
    this.extras.push(hint);
    s.time.delayedCall(850, () => {
      this.ready = true;
      s.tweens.add({ targets: hint, alpha: 1, duration: 200 });
      this.select(0, true);
    });
  }

  private card(j: number, title: string[], desc: string[], demo: (c: Phaser.GameObjects.Container) => void): Card {
    const s = this.s, c = s.add.container(CX[j], CY).setDepth(D).setScrollFactor(0);
    const frame = s.add.graphics();
    c.add(frame);
    // Fenêtre de démonstration.
    const win = s.add.graphics();
    win.fillStyle(0x0b0a14).fillRect(-CW / 2 + 7, -CH / 2 + 7, CW - 14, 82);
    win.fillStyle(0x3d4463).fillRect(-CW / 2 + 7, -CH / 2 + 80, CW - 14, 1);
    win.fillStyle(0x1a1630).fillRect(-CW / 2 + 7, -CH / 2 + 81, CW - 14, 8);
    c.add(win);
    demo(c);
    title.forEach((l, i) => c.add(txt(s, 0, -CH / 2 + 88 + i * 17, l, 0xffd36a).setOrigin(0.5, 0).setScale(2)));
    desc.forEach((l, i) => c.add(txt(s, 0, CH / 2 - 35 + i * 11, l, COL.ui).setOrigin(0.5, 0)));
    const zone = s.add.zone(CX[j], CY, CW, CH).setDepth(D + 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { if (this.ready) this.select(j); });
    zone.on('pointerdown', () => { if (!this.ready) return; this.select(j, true); this.confirm(); });
    const k = { c, frame, zone };
    this.drawFrame(k, false);
    return k;
  }

  private drawFrame(k: Card, on: boolean) {
    const g = k.frame, x = -CW / 2, y = -CH / 2;
    g.clear();
    g.fillStyle(0x06050c).fillRect(x - 2, y - 2, CW + 4, CH + 4);
    g.fillStyle(on ? 0x221d3a : 0x14111f).fillRect(x, y, CW, CH);
    g.lineStyle(1, on ? 0x8fe8ff : 0x3d4463).strokeRect(x + 2.5, y + 2.5, CW - 5, CH - 5);
    const col = on ? 0xffd36a : 0x6a6f8e;
    for (const [cx, cy] of [[x, y], [x + CW - 5, y], [x, y + CH - 5], [x + CW - 5, y + CH - 5]]) g.fillStyle(col).fillRect(cx, cy, 5, 5);
    g.fillStyle(on ? 0xfff0b0 : 0x3d4463).fillRect(x + 1, y + 1, 3, 3).fillRect(x + CW - 4, y + 1, 3, 3).fillRect(x + 1, y + CH - 4, 3, 3).fillRect(x + CW - 4, y + CH - 4, 3, 3);
  }

  /** Démo : le héros lance deux croissants qui filent l'un derrière l'autre. */
  private demoWave(c: Phaser.GameObjects.Container) {
    const s = this.s, y0 = -CH / 2 + 80, hero = s.add.image(-46, y0 + 1, 'p_idle0').setOrigin(0.5, 1).setScale(2);
    const shots = [0, 1].map(() => s.add.image(0, y0 - 28, 'moon').setAlpha(0));
    const glow = s.add.image(-22, y0 - 30, 'glowC').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    c.add([glow, ...shots, hero]);
    const play = () => {
      hero.setTexture('p_cast');
      s.tweens.add({ targets: glow, alpha: { from: 0.9, to: 0 }, duration: 320 });
      shots.forEach((m, i) => {
        s.tweens.add({ targets: m, x: { from: -18, to: 56 }, alpha: { from: 1, to: 0.15 }, duration: 620, delay: i * 190, ease: 'Sine.in' });
        s.time.delayedCall(i * 190 + 620, () => m.setAlpha(0));
      });
      s.time.delayedCall(430, () => hero.setTexture(capeTex('idle0', 0, 0, 0)));
    };
    play();
    this.loops.push(s.time.addEvent({ delay: 1400, loop: true, callback: play }));
  }

  /** Démo : le héros traverse la fenêtre, dagues levées puis plantées en croix dans un burger. */
  private demoDash(c: Phaser.GameObjects.Container) {
    const s = this.s, y0 = -CH / 2 + 80, hero = s.add.image(-46, y0 + 1, 'p_idle0').setOrigin(0.5, 1).setScale(2);
    const dummy = s.add.image(36, y0 - 1, 'burger').setOrigin(0.5, 1).setScale(2);
    const x = s.add.image(34, y0 - 22, 'xslash').setScale(1.4).setAlpha(0);
    c.add([dummy, hero, x]);
    const play = () => {
      hero.setPosition(-46, y0 + 1).setTexture('p_dstab0');
      s.tweens.add({ targets: hero, x: 10, duration: 230, ease: 'Quad.out' });
      for (let i = 1; i < 4; i++) s.time.delayedCall(i * 45, () => {
        if (!hero.active) return;
        const g = s.add.image(hero.x, hero.y, hero.texture.key).setOrigin(0.5, 1).setScale(2).setTintFill(COL.moon).setAlpha(0.5);
        c.addAt(g, 3);
        s.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
      });
      s.time.delayedCall(70, () => hero.active && hero.setTexture('p_dstab1'));
      s.time.delayedCall(150, () => {
        if (!x.active) return;
        s.tweens.add({ targets: x, alpha: { from: 1, to: 0 }, duration: 320 });
        dummy.setTintFill(0xffffff);
        s.tweens.add({ targets: dummy, angle: { from: -14, to: 0 }, y: { from: y0 - 6, to: y0 - 1 }, duration: 240, ease: 'Bounce.out' });
        s.time.delayedCall(70, () => dummy.active && dummy.clearTint());
      });
      s.time.delayedCall(560, () => hero.active && hero.setTexture(capeTex('idle0', 0, 0, 0)));
    };
    play();
    this.loops.push(s.time.addEvent({ delay: 1400, loop: true, callback: play }));
  }

  private select(j: number, silent = false) {
    if (j === this.i && !silent) return;
    this.i = j;
    this.cards.forEach((k, n) => {
      this.drawFrame(k, n === j);
      this.s.tweens.killTweensOf(k.c);
      // Échelle 1 : le texte pixel reste net ; la carte choisie monte d'un cran.
      this.s.tweens.add({ targets: k.c, scaleX: 1, y: n === j ? CY - 5 : CY + 3, alpha: n === j ? 1 : 0.6, duration: 120, ease: 'Back.out' });
    });
    if (!silent) sfx.tick();
  }

  private confirm() {
    this.ready = false;
    sfx.select(); goFullscreen(); input.reset();
    const s = this.s, pick = this.cards[this.i], other = this.cards[1 - this.i];
    for (const l of this.loops) l.remove();
    s.tweens.killTweensOf(pick.c); s.tweens.killTweensOf(other.c);
    s.tweens.add({ targets: other.c, y: H + 120, angle: this.i ? -14 : 14, alpha: 0, duration: 340, ease: 'Quad.in' });
    // La carte choisie gonfle, flashe, puis s'envole vers le haut.
    const flash = s.add.rectangle(CX[this.i], CY, CW, CH, 0xffffff, 0.9).setDepth(D + 2).setScrollFactor(0);
    s.tweens.add({ targets: flash, alpha: 0, scale: 1.3, duration: 260, onComplete: () => flash.destroy() });
    s.tweens.add({ targets: pick.c, scaleX: 1.16, scaleY: 1.16, x: W / 2, duration: 240, ease: 'Back.out' });
    s.tweens.add({ targets: pick.c, y: -130, scaleX: 0.5, scaleY: 0.5, alpha: 0, delay: 560, duration: 260, ease: 'Cubic.in' });
    s.tweens.add({ targets: [this.title, ...this.extras], alpha: 0, delay: 500, duration: 280 });
    s.tweens.add({ targets: this.dim, fillAlpha: 0, delay: 640, duration: 220 });
    s.time.delayedCall(880, () => {
      const u: Upgrade = this.i === 0 ? 'wave' : 'dash';
      s.tweens.killTweensOf(this.title);
      for (const k of this.cards) { s.tweens.killTweensOf(k.c.list); k.c.destroy(); k.zone.destroy(); }
      for (const o of [this.dim, this.rays, this.title, ...this.extras]) o.destroy();
      this.onPick(u);
    });
  }

  update(dt = 1 / 60) {
    // Rayons dorés qui tournent derrière le titre.
    this.rayT += dt * 0.5;
    if (this.rays.active) {
      const g = this.rays.clear();
      g.fillStyle(0xffd36a, 0.09);
      for (let i = 0; i < 10; i++) {
        const a = this.rayT + (i / 10) * Math.PI * 2;
        g.fillTriangle(0, 0, Math.cos(a - 0.1) * 300, Math.sin(a - 0.1) * 300, Math.cos(a + 0.1) * 300, Math.sin(a + 0.1) * 300);
      }
    }
    if (!this.ready) return;
    if (input.take('left')) this.select(0);
    if (input.take('right')) this.select(1);
    if (input.take('ok')) this.confirm();
  }
}
