import Phaser from 'phaser';
import { W } from '../config';
import { LW, NAVE } from '../art/nave';

export interface Room { update(playerX: number, dt: number): void }

/** Nef (salle 1) : 4 couches de parallaxe + torches, bougies, citrouilles, chauves-souris, poussière, vignette. */
export function buildNave(s: Phaser.Scene): Room {
  const ox = (W - LW) / 2;
  const mk = (key: string, f: number, depth: number) => ({ c: s.add.container(0, 0, [s.add.image(ox, 0, key).setOrigin(0)]).setDepth(depth), f });
  const layers = [mk('nave0', 0.03, 0), mk('nave1', 0.07, 1), mk('nave2', 0.12, 2), mk('nave3', 0.25, 80)];
  const at = (l: number, o: Phaser.GameObjects.GameObject) => { layers[l].c.add(o); return o; };
  const add = Phaser.BlendModes.ADD;
  const flick: { o: Phaser.GameObjects.Image; a: number; s: number }[] = [];
  const glow = (l: number, x: number, y: number, scale: number, a: number, key = 'glowO') => {
    const o = at(l, s.add.image(ox + x, y, key).setBlendMode(add).setScale(scale).setAlpha(a)) as Phaser.GameObjects.Image;
    flick.push({ o, a, s: scale });
  };
  const torches = NAVE.torches.map((x) => at(2, s.add.image(ox + x, 120, 'torch0')) as Phaser.GameObjects.Image);
  for (const x of NAVE.torches) glow(2, x, 112, 1.6, 0.5);
  for (const [x, y] of NAVE.candles) glow(2, x + 1, y - 10, 0.5, 0.45);
  for (const [x, y] of NAVE.pumpkins) glow(2, x, y - 7, 0.7, 0.4);
  for (const [x, y] of NAVE.lanterns) glow(3, x, y, 0.9, 0.5);
  // Poussière qui flotte dans les rayons de lune.
  s.add.particles(0, 0, 'px', {
    x: { min: 0, max: W }, y: { min: 40, max: 230 }, lifespan: 5000, speedX: { min: -6, max: 6 }, speedY: { min: -4, max: 4 },
    scale: 0.5, alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.5 }, tint: 0xa8c0ff, frequency: 180,
  }).setDepth(3);
  s.add.image(0, 0, 'vignette').setOrigin(0).setDepth(90);
  let flickT = 0, batT = 2;
  return {
    update(playerX, dt) {
      for (const l of layers) l.c.x = Math.round(-(playerX - W / 2) * l.f);
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
        const b = at(1, s.add.image(dir > 0 ? -20 : LW + 20, y, 'bat0').setFlipX(dir < 0)) as Phaser.GameObjects.Image;
        s.tweens.add({ targets: b, x: dir > 0 ? LW + 20 : -20, duration: 5000, onComplete: () => b.destroy() });
        s.tweens.add({ targets: b, y: y + 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        s.time.addEvent({ delay: 110, repeat: 44, callback: () => b.active && b.setTexture(b.texture.key === 'bat0' ? 'bat1' : 'bat0') });
      }
    },
  };
}

