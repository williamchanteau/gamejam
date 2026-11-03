import Phaser from 'phaser';
import type { Boss, BossDef } from '../entities/Boss';
import { COL } from '../config';
import { sfx } from '../audio/sfx';

export const NIGHT = { hp: 96, fireDamage: 4, fireTick: 0.3, fireLife: 6, recharge: 8, fireWidth: 132, lanterns: [190, 390, 590, 790], orbSpeed: 150, rushTime: 0.65, rainGap: 0.35 };

function* hunt(b: Boss) {
  const s = b.scene;
  // Verrouille la position avant l'attaque : même en hauteur, on doit esquiver.
  const x = b.player.x, y = b.player.rect().centerY;
  b.eyes('tele'); sfx.warn();
  const mark = b.temp(s.add.graphics().setDepth(80));
  mark.lineStyle(2, COL.danger, 0.9).strokeCircle(x, y, 24);
  mark.lineBetween(x - 30, y, x + 30, y).lineBetween(x, y - 30, x, y + 30);
  yield b.tele(0.9);
  mark.destroy();
  const strike = b.temp(s.add.graphics().setDepth(80));
  strike.fillStyle(COL.danger, 0.6).fillCircle(x, y, 25);
  b.hitbox = () => new Phaser.Geom.Rectangle(x - 22, y - 22, 44, 44);
  sfx.whoosh();
  yield b.t(0.22);
  b.hitbox = null;
  strike.destroy();
  b.eyes('off');
  yield b.t(0.8);
  b.eyes('on');
}

function* sweep(b: Boss) {
  b.face(); b.eyes('tele'); sfx.warn();
  const x = b.clampX(b.player.x);
  const mark = b.temp(b.scene.add.rectangle(x, 110, 58, 220, COL.danger, 0.2).setDepth(80));
  yield b.tele(1);
  mark.setFillStyle(COL.danger, 0.65);
  b.hitbox = () => new Phaser.Geom.Rectangle(x - 29, 0, 58, b.floorY);
  sfx.slam();
  yield b.t(0.18);
  b.hitbox = null; mark.destroy(); b.eyes('off');
  yield b.t(0.9);
  b.eyes('on');
}

/** Salve visée : les orbes traversent la salle à la hauteur verrouillée du joueur. */
function* barrage(b: Boss) {
  const sc = b.scene;
  const count = b.phase === 2 ? 5 : 3;
  b.face(); b.eyes('tele'); sfx.warn();
  const x = b.x, y = b.y - 64;
  const angle = Math.atan2(b.player.rect().centerY - y, b.player.x - x);
  const rays = b.temp(sc.add.graphics().setDepth(80));
  rays.lineStyle(1, COL.danger, 0.65);
  for (let i = 0; i < count; i++) {
    const a = angle + (i - (count - 1) / 2) * 0.24;
    rays.lineBetween(x, y, x + Math.cos(a) * 260, y + Math.sin(a) * 260);
  }
  yield b.tele(1);
  rays.destroy(); sfx.blade();
  for (let i = 0; i < count; i++) {
    const a = angle + (i - (count - 1) / 2) * 0.24;
    const o = b.hazard('glowR', x, y, Math.cos(a) * NIGHT.orbSpeed * b.speed, 12, 12, 5);
    o.setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setData('once', true);
    (o.body as Phaser.Physics.Arcade.Body).setOffset((o.width - 12) / 2, (o.height - 12) / 2);
    o.setVelocityY(Math.sin(a) * NIGHT.orbSpeed * b.speed);
    let trail = 0;
    o.setData('tick', (dt: number) => {
      trail -= dt;
      if (trail <= 0) { trail = 0.08; sc.sparks(o.x, o.y, COL.danger, 2); }
    });
  }
  b.eyes('off'); yield b.t(0.9); b.eyes('on');
}

/** Ruée annoncée : Noctis traverse les flammes au lieu de les éviter. */
function* rush(b: Boss) {
  b.face(); b.eyes('tele'); sfx.warn();
  const end = b.clampX(b.player.x + b.dir * 120);
  const mark = b.temp(b.scene.add.rectangle(Math.min(b.x, end) - 30, b.floorY - 92, Math.abs(end - b.x) + 60, 92, COL.danger, 0.16).setOrigin(0).setDepth(80));
  yield b.tele(1.05);
  mark.destroy(); sfx.whoosh();
  b.tw(b.root, { x: end }, b.t(NIGHT.rushTime), 'Sine.inOut');
  b.hitbox = () => new Phaser.Geom.Rectangle(b.x - 30, b.y - 90, 60, 90);
  yield b.t(NIGHT.rushTime);
  b.hitbox = null; b.eyes('off');
  yield b.t(1); b.eyes('on');
}

/** Phase 2 : trois impacts successifs, chaque position est annoncée séparément. */
function* rain(b: Boss) {
  for (let i = 0; i < 3; i++) {
    yield* hunt(b);
    yield NIGHT.rainGap;
  }
}

export const NOCTIS: BossDef = {
  name: 'NOCTIS', title: "LE DÉVOREUR DE LUMIÈRE", hp: NIGHT.hp,
  fireOnly: true, hurt: { w: 60, h: 92 },
  build(b) {
    const g = b.scene.add.graphics();
    g.fillStyle(0x171425).fillTriangle(-36, 0, 0, -94, 36, 0);
    g.fillStyle(0x2e2944).fillTriangle(-24, -12, 0, -80, 25, -12);
    g.lineStyle(2, 0x625779).lineBetween(-30, -15, -42, -55).lineBetween(30, -15, 42, -55);
    b.root.add(g);
    const eyes = b.scene.add.image(0, -69, 'mord_eyes').setScale(1.5);
    const glow = b.scene.add.image(0, -69, 'glowW').setScale(0.7).setBlendMode(Phaser.BlendModes.ADD);
    b.root.add([glow, eyes]); b.parts = { eyes, glow };
  },
  rest() {},
  patterns: [
    { name: 'barrage', weight: 2, phase: 0, far: true, run: barrage },
    { name: 'rush', weight: 3, phase: 0, far: true, run: rush },
    { name: 'rain', weight: 2, phase: 2, far: true, run: rain },
    { name: 'hunt', weight: 3, phase: 0, far: true, run: hunt },
    { name: 'sweep', weight: 2, phase: 2, far: true, run: sweep },
  ],
};
