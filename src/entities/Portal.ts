import Phaser from 'phaser';
import type { ArenaScene } from '../scenes/ArenaScene';
import { sfx } from '../audio/sfx';
import { iris } from '../ui/Iris';

/** Portail violet (château ↔ tuto) : vortex animé, halo, particules aspirées ; avale le joueur. */
export class Portal {
  private core: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Image;
  private f = 0;
  readonly cy: number;

  constructor(private s: ArenaScene, readonly x: number, floorY: number) {
    this.cy = floorY - 27;
    this.glow = s.add.image(x, this.cy, 'glowP').setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.55).setDepth(2);
    this.core = s.add.image(x, this.cy, 'portal0').setDepth(3);
    this.ring = s.add.image(x, floorY + 1, 'portal_ring').setOrigin(0.5, 1).setDepth(4);
    s.add.particles(0, 0, 'px', {
      emitZone: { type: 'edge', source: new Phaser.Geom.Ellipse(x, this.cy, 52, 76), quantity: 40 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
      moveToX: x, moveToY: this.cy, lifespan: 900, frequency: 70,
      alpha: { start: 0, end: 1 }, scale: { start: 1, end: 0.4 }, tint: [0xc8a0ff, 0x9a5ae8, 0xe8d8ff],
    }).setDepth(5);
    // Le vortex tourne sur l'horloge de la scène (continue pendant les cinématiques, salle figée).
    s.time.addEvent({ delay: 90, loop: true, callback: () => {
      this.f = (this.f + 1) % 4;
      this.core.setTexture('portal' + this.f);
      this.glow.setAlpha(Math.max(this.glow.alpha * 0.5, 0.45 + Math.random() * 0.2));
    } });
  }

  /** Le portail « avale » : pulsation du cœur et de l'anneau, gerbe d'étincelles. */
  private gulp() {
    const s = this.s;
    s.tweens.add({ targets: [this.core], scaleX: 1.25, scaleY: 1.12, duration: 90, yoyo: true, ease: 'Quad.out' });
    s.tweens.add({ targets: this.glow, scale: 3.6, alpha: 1, duration: 120, yoyo: true, hold: 120 });
    s.sparks(this.x, this.cy, 0xc8a0ff, 18);
    s.sparks(this.x, this.cy, 0xffffff, 6);
    s.cameras.main.shake(120, 0.004);
  }

  /** Grain de lumière aspiré de (x, y) vers le cœur du portail. */
  private mote(x: number, y: number) {
    const s = this.s, m = s.add.image(x, y, 'px').setTint(0xe8d8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
    s.tweens.add({ targets: m, x: this.x, y: this.cy, scale: 0.4, alpha: 0.3, duration: 240 + Math.random() * 120, ease: 'Quad.in', onComplete: () => m.destroy() });
  }

  /** Aspiré en 3 temps : soulevé du sol (tremble, lumière qui file vers le portail) → happé et étiré, images
   *  rémanentes violettes → englouti en vrille jusqu'à un point blanc ; gloup + onde de choc, iris violet, `done`. */
  swallow(done: () => void) {
    const s = this.s, p = s.player, spr = p.spr, dir = Math.sign(this.x - spr.x) || -1;
    s.frozen = true; p.safe = true;
    sfx.portal();
    spr.setOrigin(0.5, 0.5).setY(spr.y - 18).setFlipX(dir < 0);
    s.tweens.add({ targets: this.glow, scale: 3.2, alpha: 0.9, duration: 500 });
    s.tweens.add({ targets: this.core, scaleX: 1.1, scaleY: 1.05, duration: 110, yoyo: true, repeat: 4 });
    const x0 = spr.x, y0 = spr.y, T = 1150, L = 0.32, P = 0.72, hy = y0 - 9;
    const tint = (k: number) => { const c = (v: number) => Math.round(255 + (v - 255) * k); spr.setTint((c(0xb8) << 16) | (c(0x8c) << 8) | c(0xff)); };
    let ghost = 0;
    s.tweens.addCounter({
      from: 0, to: T, duration: T, ease: 'Linear',
      onUpdate: (tw) => {
        const ms = tw.getValue() ?? 0, t = ms / T;
        if (t < L) {
          const k = t / L;
          spr.setTexture('p_fall_1_2_0').setScale(1).setAngle(dir * 8 * k);
          spr.setPosition(x0 + Math.sin(ms * 0.09) * 1.5 * k, y0 - 9 * (1 - (1 - k) * (1 - k)));
          tint(k * 0.35);
          if (Math.random() < 0.5) this.mote(spr.x + Phaser.Math.Between(-8, 8), spr.y + Phaser.Math.Between(-14, 14));
        } else if (t < P) {
          const k = (t - L) / (P - L), e = k * k * k;
          spr.setTexture('p_dash_5_0_0').setAngle(dir * (8 + 12 * k));
          spr.setPosition(x0 + (this.x - x0) * e, hy + (this.cy - hy) * e).setScale(1 + 0.8 * e, 1 - 0.45 * e);
          tint(0.35 + 0.5 * k);
          if (ms > ghost) {
            ghost = ms + 35;
            const g = s.add.image(spr.x, spr.y, spr.texture.key).setFlipX(spr.flipX).setScale(spr.scaleX, spr.scaleY).setAngle(spr.angle)
              .setTintFill(0x9a5ae8).setAlpha(0.55).setDepth(spr.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
            s.tweens.add({ targets: g, alpha: 0, scaleX: g.scaleX * 0.7, duration: 220, onComplete: () => g.destroy() });
          }
          if (Math.random() < 0.7) this.mote(spr.x, spr.y + Phaser.Math.Between(-6, 6));
        } else {
          const k = (t - P) / (1 - P), q = (1 - k) * (1 - k);
          spr.setPosition(this.x + Math.cos(k * 9) * 5 * (1 - k), this.cy + Math.sin(k * 9) * 4 * (1 - k));
          spr.setScale(1.8 * q + 0.001, 0.55 * q + 0.001).setAngle(dir * (20 + 620 * k * k));
          if (k > 0.45) spr.setTintFill(0xf0e0ff);
        }
        if (Math.random() < 0.4) s.sparks(spr.x, spr.y, 0xc8a0ff, 1);
      },
      onComplete: () => {
        spr.setVisible(false);
        this.gulp();
        const r = s.add.image(this.x, this.cy, 'ring').setTint(0xc8a0ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setScale(0.15);
        s.tweens.add({ targets: r, scale: 1.7, alpha: 0, duration: 340, ease: 'Quad.out', onComplete: () => r.destroy() });
        const dot = s.add.image(this.x, this.cy, 'glowW').setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setScale(1.4);
        s.tweens.add({ targets: dot, scale: 0, duration: 260, ease: 'Quad.in', onComplete: () => dot.destroy() });
        s.time.delayedCall(240, () => iris(s, this.x - s.cameras.main.scrollX, this.cy, false, 520, 0x9a5ae8, done));
      },
    });
  }

  /** Arrivée : iris qui s'ouvre sur le portail, le joueur est recraché en vrille et retombe à côté. */
  spit() {
    const s = this.s, p = s.player, spr = p.spr, lx = spr.x, ly = spr.y - 18, dir = Math.sign(lx - this.x) || 1;
    s.frozen = true; p.safe = true;
    spr.setOrigin(0.5, 0.5).setPosition(this.x, this.cy).setScale(0).setTexture('p_jump_2_0_0').setFlipX(dir < 0).setTintFill(0xd8b8ff);
    iris(s, this.x - s.cameras.main.scrollX, this.cy, true, 450, 0x9a5ae8);
    s.time.delayedCall(220, () => {
      sfx.portal();
      this.gulp();
      s.tweens.addCounter({
        from: 0, to: 1, duration: 480, ease: 'Linear',
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 0;
          spr.setPosition(this.x + (lx - this.x) * t, this.cy + (ly - this.cy) * t - Math.sin(t * Math.PI) * 22);
          spr.setScale(Math.min(1, t * 2.2)).setAngle((1 - Math.min(1, t * 1.4)) * -540 * dir);
          if (t > 0.45) spr.clearTint();
          if (t > 0.6) spr.setTexture('p_fall_1_2_0');
        },
        onComplete: () => {
          spr.setOrigin(0.5, 1).setAngle(0).setScale(1).setY(ly + 18);
          s.frozen = false; p.safe = false;
          p.land();
        },
      });
    });
  }
}
