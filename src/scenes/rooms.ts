import Phaser from 'phaser';
import { ARENA } from '../config';
import { NAVE, NAVE_F, layerW } from '../art/nave';

export interface Room { update(dt: number): void }

/** Nef (salle 1) : couches en parallaxe (scrollFactor) + torches, bougies, citrouilles, chauves-souris, poussière, vignette. */
export function buildNave(s: Phaser.Scene): Room {
  const keys = ['nave0', 'nave1', 'nave2', 'nave_props', 'nave3'], depths = [0, 1, 2, 4, 80];
  const layers = keys.map((k, i) => s.add.container(0, 0, [s.add.image(0, 0, k).setOrigin(0)]).setDepth(depths[i]).setScrollFactor(NAVE_F[i]));
  const at = (l: number, o: Phaser.GameObjects.GameObject) => { layers[l].add(o); return o; };
  const flick: { o: Phaser.GameObjects.Image; a: number; s: number }[] = [];
  const glow = (l: number, x: number, y: number, scale: number, a: number) => {
    const o = at(l, s.add.image(x, y, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setScale(scale).setAlpha(a)) as Phaser.GameObjects.Image;
    flick.push({ o, a, s: scale });
  };
  const torches = NAVE.torches.map((x) => at(2, s.add.image(x, 120, 'torch0')) as Phaser.GameObjects.Image);
  for (const x of NAVE.torches) glow(2, x, 112, 1.6, 0.5);
  for (const [x, y] of NAVE.candles) glow(3, x, y - 24, 0.7, 0.5);
  for (const [x, y] of NAVE.pumpkins) glow(3, x, y - 7, 0.7, 0.4);
  for (const [x, y] of NAVE.lanterns) glow(4, x, y, 0.9, 0.5);
  // Poussière qui flotte dans les rayons de lune.
  s.add.particles(0, 0, 'px', {
    x: { min: 0, max: ARENA.bossW }, y: { min: 40, max: 230 }, lifespan: 5000, speedX: { min: -6, max: 6 }, speedY: { min: -4, max: 4 },
    scale: 0.5, alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.5 }, tint: 0xa8c0ff, frequency: 90,
  }).setDepth(3);
  s.add.image(0, 0, 'vignette').setOrigin(0).setDepth(90).setScrollFactor(0);
  let flickT = 0, batT = 2;
  const batW = layerW(NAVE_F[1]);
  return {
    update(dt) {
      flickT -= dt;
      if (flickT <= 0) {
        flickT = 0.08 + Math.random() * 0.08;
        for (const t of torches) t.setTexture(Math.random() < 0.5 ? 'torch0' : 'torch1');
        for (const f of flick) f.o.setAlpha(f.a * (0.8 + Math.random() * 0.4)).setScale(f.s * (0.95 + Math.random() * 0.1));
      }
      batT -= dt;
      if (batT <= 0) { // chauve-souris qui traverse le fond
        batT = 4 + Math.random() * 4;
        const dir = Math.random() < 0.5 ? 1 : -1, y = 30 + Math.random() * 80;
        const b = at(1, s.add.image(dir > 0 ? -20 : batW + 20, y, 'bat0').setFlipX(dir < 0)) as Phaser.GameObjects.Image;
        s.tweens.add({ targets: b, x: dir > 0 ? batW + 20 : -20, duration: 7000, onComplete: () => b.destroy() });
        s.tweens.add({ targets: b, y: y + 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        s.time.addEvent({ delay: 110, repeat: 62, callback: () => b.active && b.setTexture(b.texture.key === 'bat0' ? 'bat1' : 'bat0') });
      }
    },
  };
}
