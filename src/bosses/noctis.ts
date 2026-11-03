import Phaser from 'phaser';
import type { Boss, BossDef } from '../entities/Boss';
import { COL } from '../config';
import { sfx } from '../audio/sfx';

export const NIGHT = { hp: 96, fireDamage: 4, fireTick: 0.3, fireLife: 6, recharge: 8, fireWidth: 132, lanterns: [190, 390, 590, 790] };

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
    { name: 'hunt', weight: 3, phase: 0, far: true, run: hunt },
    { name: 'sweep', weight: 2, phase: 2, far: true, run: sweep },
  ],
};
