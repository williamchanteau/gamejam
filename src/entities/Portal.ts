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

  /** Aspiré : étiré vers le portail, puis spirale autour de son centre en rétrécissant ; gloup, iris violet, `done`. */
  swallow(done: () => void) {
    const s = this.s, p = s.player, spr = p.spr, dir = Math.sign(this.x - spr.x) || -1;
    s.frozen = true; p.safe = true;
    sfx.portal();
    spr.setOrigin(0.5, 0.5).setY(spr.y - 18).setTexture('p_dash_5_0_0').setFlipX(dir < 0);
    s.tweens.add({ targets: this.glow, scale: 3, duration: 400 });
    const x0 = spr.x, y0 = spr.y;
    s.tweens.addCounter({
      from: 0, to: 1, duration: 720, ease: 'Linear',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0, a = Math.min(1, t / 0.45), b = Math.max(0, (t - 0.45) / 0.55);
        // 1) tiré vers le portail (étirement horizontal, s'incline) ; 2) spirale qui se resserre.
        const r = (1 - a * a) * Math.abs(this.x - x0) * (1 - b), th = b * Math.PI * 3;
        spr.setPosition(this.x - dir * r * Math.cos(th), y0 + (this.cy - y0) * a - r * 0.3 * Math.sin(th));
        spr.setScale((1 + 0.35 * a) * (1 - b), (1 - 0.25 * a) * (1 - b) + 0.001);
        spr.setAngle(dir * 20 * a + b * 720 * dir);
        if (t > 0.3) spr.setTintFill(0xd8b8ff);
        if (Math.random() < 0.6) s.sparks(spr.x, spr.y, 0xc8a0ff, 1);
      },
      onComplete: () => {
        spr.setVisible(false);
        this.gulp();
        s.time.delayedCall(160, () => iris(s, this.x - s.cameras.main.scrollX, this.cy, false, 520, 0x9a5ae8, done));
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
