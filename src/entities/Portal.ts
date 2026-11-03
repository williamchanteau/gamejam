import Phaser from 'phaser';
import type { ArenaScene } from '../scenes/ArenaScene';
import { sfx } from '../audio/sfx';

/** Portail violet (château ↔ tuto) : vortex animé, halo, particules aspirées ; avale le joueur. */
export class Portal {
  private core: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private f = 0; private t = 0;
  readonly cy: number;

  constructor(private s: ArenaScene, readonly x: number, floorY: number) {
    this.cy = floorY - 27;
    this.glow = s.add.image(x, this.cy, 'glowP').setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.55).setDepth(2);
    this.core = s.add.image(x, this.cy, 'portal0').setDepth(3);
    s.add.image(x, floorY + 1, 'portal_ring').setOrigin(0.5, 1).setDepth(4);
    s.add.particles(0, 0, 'px', {
      emitZone: { type: 'edge', source: new Phaser.Geom.Ellipse(x, this.cy, 52, 76), quantity: 40 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
      moveToX: x, moveToY: this.cy, lifespan: 900, frequency: 70,
      alpha: { start: 0, end: 1 }, scale: { start: 1, end: 0.4 }, tint: [0xc8a0ff, 0x9a5ae8, 0xe8d8ff],
    }).setDepth(5);
  }

  update(dt: number) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.09;
    this.f = (this.f + 1) % 4;
    this.core.setTexture('portal' + this.f);
    this.glow.setAlpha(0.45 + Math.random() * 0.2);
  }

  /** Le joueur est aspiré en tournoyant, flash violet, fondu, puis `done`. */
  swallow(done: () => void) {
    const s = this.s, p = s.player;
    s.frozen = true; p.safe = true;
    sfx.portal();
    s.tweens.add({ targets: this.glow, scale: 3.4, alpha: 0.95, duration: 500 });
    s.tweens.add({ targets: p.spr, x: this.x, y: this.cy + 14, scale: 0, angle: 540, alpha: 0, duration: 600, ease: 'Quad.in' });
    s.tweens.add({ targets: p.scarf, alpha: 0, duration: 200 });
    s.time.delayedCall(450, () => {
      s.cameras.main.flash(250, 150, 90, 255);
      s.cameras.main.fadeOut(350, 20, 8, 40);
      s.cameras.main.once('camerafadeoutcomplete', done);
    });
  }

  /** Le joueur jaillit du portail (arrivée). */
  spit() {
    const p = this.s.player;
    sfx.portal();
    this.s.cameras.main.flash(300, 150, 90, 255);
    this.s.sparks(this.x, this.cy, 0xc8a0ff, 16);
    p.spr.setScale(0.2).setAlpha(0);
    this.s.tweens.add({ targets: p.spr, scale: 1, alpha: 1, duration: 280, ease: 'Back.out' });
  }
}
