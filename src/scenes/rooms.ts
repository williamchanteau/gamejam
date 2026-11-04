import Phaser from 'phaser';
import { ARENA } from '../config';
import { NAVE, NAVE_F, layerW } from '../art/nave';
import { DINING } from '../art/dining';

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

/** Salle à manger noble : mêmes couches que la nef, lustres, appliques, foyer animé, poussière dorée, tapis. */
export function buildDining(s: Phaser.Scene): Room {
  const keys = ['din0', 'din1', 'din2', 'din_props', 'din3'], depths = [0, 1, 2, 4, 80];
  const layers = keys.map((k, i) => s.add.container(0, 0, [s.add.image(0, 0, k).setOrigin(0)]).setDepth(depths[i]).setScrollFactor(NAVE_F[i]));
  const flick: { o: Phaser.GameObjects.Image; a: number; s: number }[] = [];
  const glow = (x: number, y: number, scale: number, a: number, depth: number, l?: Phaser.GameObjects.Container) => {
    const o = s.add.image(x, y, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setScale(scale).setAlpha(a).setDepth(depth);
    l?.add(o);
    flick.push({ o, a, s: scale });
  };
  for (const x of DINING.columns(layerW(NAVE_F[2]))) glow(x, 106, 1.5, 0.4, 2, layers[2]);
  for (const x of DINING.lustres) {
    s.add.image(x, 8, 'din_lustre').setOrigin(0.5, 0).setDepth(3);
    glow(x, 36, 2.3, 0.42, 3);
  }
  for (const x of DINING.torcheres) glow(x, ARENA.floorY - 96, 1.2, 0.5, 4.1);
  for (const x of DINING.candles) glow(x, ARENA.floorY - DINING.table.h - 22, 0.9, 0.55, 6.05);
  glow(DINING.fire, ARENA.floorY - 26, 2.2, 0.55, 4.1);
  const fire = s.add.image(DINING.fire, ARENA.floorY - 3, 'din_fire0').setOrigin(0.5, 1).setDepth(4.05);
  s.add.image(45, ARENA.floorY + 9, 'din_rug').setOrigin(0).setDepth(5.05);
  s.add.particles(0, 0, 'px', {
    x: { min: 0, max: ARENA.bossW }, y: { min: 40, max: 230 }, lifespan: 5000, speedX: { min: -6, max: 6 }, speedY: { min: -4, max: 4 },
    scale: 0.5, alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.45 }, tint: 0xffe0a0, frequency: 90,
  }).setDepth(3);
  s.add.image(0, 0, 'vignette').setOrigin(0).setDepth(90).setScrollFactor(0);
  let flickT = 0, frame = 0;
  return {
    update(dt) {
      flickT -= dt;
      if (flickT > 0) return;
      flickT = 0.08 + Math.random() * 0.08;
      frame = (frame + 1) % 3;
      fire.setTexture('din_fire' + frame);
      for (const f of flick) f.o.setAlpha(f.a * (0.82 + Math.random() * 0.34)).setScale(f.s * (0.96 + Math.random() * 0.08));
    },
  };
}
