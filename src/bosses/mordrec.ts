import Phaser from 'phaser';
import { COL } from '../config';
import { canvasTex, crescent, OUTLINE } from '../art/pixel';
import { sfx } from '../audio/sfx';
import type { Boss, BossDef } from '../entities/Boss';

// Réglages de Mordrec (durées en s avant ×vitesse de phase 2, distances en px).
const M = {
  hp: 80,
  slash: { tele: 0.65, dash: 0.28, minDist: 70, overshoot: 50, recover: 0.75, reach: 64, height: 54 },
  slam: { tele: 0.6, rise: 0.35, mark: 0.7, fall: 0.16, recover: 0.85, waveSpeed: 210, doubleGap: 0.8 },
  blades: { tele: 0.65, gap: 0.75, speed: 230, recover: 0.6 },
  combo: { teles: [0.55, 0.45, 0.8], recover: 0.95 },
};
// Pose de repos : épée plantée en avant.
const REST = { sword: 128, headY: -64 };

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const A = { k: '#14121f', d: '#262b45', m: '#3d4566', b: '#5a6386', l: '#7a86ac', h: '#b8c2e0', c: '#1a1426', C: '#2a2038', r: '#3a2c50' };

/** Spalière en dôme, plaques superposées. */
function dome(c: Ctx, cx: number, cy: number, rx: number, ry: number, [dk, md, lt]: string[]) {
  for (let y = -ry; y <= 3; y++)
    for (let x = -rx; x <= rx; x++) {
      if ((x / rx) ** 2 + (Math.min(y, 0) / ry) ** 2 > 1) continue;
      px(c, y === 3 || (y + ry) % 4 === 3 ? A.k : x > rx * 0.3 && y < 0 ? lt : x < -rx * 0.5 ? dk : md, cx + x, cy + y);
    }
}

function drawBody(c: Ctx) {
  // Cape en lambeaux derrière (le dos = gauche).
  for (let y = 14; y < 76; y++) {
    const t = (y - 14) / 62, l = Math.round(22 - t * 16 + Math.sin(y * 0.4) * 1.2);
    for (let x = l; x < 36; x++) {
      if (y > 70 && (x * 7 + y) % 5 < y - 70) continue;
      px(c, x === l ? A.k : x < l + 3 ? A.c : A.C, x, y);
    }
  }
  // Jambes : grèves, genouillères, solerets.
  for (const [lx, back] of [[20, 1], [33, 0]]) {
    px(c, back ? A.d : A.m, lx, 56, 8, 22); px(c, back ? A.m : A.l, lx + 1, 56, 2, 22);
    px(c, back ? A.m : A.b, lx, 62, 8, 4); px(c, A.k, lx, 66, 8, 1);
    px(c, back ? A.d : A.m, lx, 77, 12, 4); px(c, back ? A.m : A.l, lx, 77, 12, 1);
  }
  // Tassettes.
  for (let i = 0; i < 3; i++) {
    const y = 47 + i * 4, l = 16 - i, r = 44 + i;
    px(c, A.m, l, y, r - l, 4); px(c, A.l, l, y, r - l, 1); px(c, A.k, l, y + 3, r - l, 1);
    for (let x = l + 6; x < r; x += 7) px(c, A.d, x, y + 1, 1, 2);
  }
  // Cuirasse bombée + arête.
  for (let y = 18; y < 48; y++) {
    const hw = Math.round(13 - Math.abs((y - 18) / 30 - 0.35) * 6);
    for (let x = 30 - hw; x < 32 + hw; x++) {
      const u = (x - (30 - hw)) / (2 * hw + 2);
      px(c, u < 0.15 ? A.d : u < 0.4 ? A.m : u < 0.7 ? A.b : u < 0.85 ? A.l : A.m, x, y);
    }
  }
  px(c, A.h, 33, 20, 1, 24); px(c, A.d, 30, 20, 1, 24);
  // Le « creux » : brèche sombre dans la cuirasse, lueur spectrale.
  for (const [x, y, w] of [[34, 28, 2], [33, 29, 4], [32, 30, 5], [33, 31, 4], [34, 32, 3], [35, 33, 1]]) px(c, A.k, x, y, w, 1);
  px(c, '#8a7ac8', 34, 30, 2, 1);
  // Ceinture, gorgerin.
  px(c, A.k, 18, 44, 26, 3); px(c, '#4a3a2a', 18, 45, 26, 1); px(c, A.h, 31, 44, 3, 3);
  px(c, A.m, 24, 11, 14, 8); px(c, A.l, 24, 11, 14, 1); px(c, A.k, 24, 15, 14, 1);
  dome(c, 19, 20, 8, 6, [A.k, A.d, A.m]);
  // Bras avant jusqu'à la main (48, 38).
  px(c, A.m, 40, 24, 7, 10); px(c, A.l, 45, 24, 2, 10);
  px(c, A.b, 43, 33, 8, 9); px(c, A.h, 49, 33, 2, 9); px(c, A.k, 43, 37, 8, 1);
  dome(c, 41, 20, 9, 7, [A.m, A.l, A.h]);
}

function drawHead(c: Ctx) {
  for (let i = 0; i < 12; i++) px(c, i % 3 ? A.r : A.c, 10 - i, 3 + Math.round(i * 0.8), 3, 2 + (i >> 2)); // panache
  for (let y = 5; y < 27; y++) {
    const hw = y < 10 ? Math.round(Math.sqrt(1 - ((10 - y) / 6) ** 2) * 9) : 9;
    for (let x = 13 - hw; x < 13 + hw; x++) {
      const u = (x - 13 + hw) / (2 * hw);
      px(c, u < 0.2 ? A.d : u < 0.55 ? A.m : u < 0.8 ? A.b : A.l, x, y);
    }
  }
  px(c, A.h, 15, 6, 1, 9);
  px(c, A.k, 12, 15, 10, 3); px(c, A.k, 17, 15, 2, 9); // visière en T
  for (const [x, y] of [[20, 20], [20, 22], [14, 21]]) px(c, A.k, x, y);
  px(c, A.d, 4, 25, 18, 2); px(c, A.l, 4, 25, 18, 1);
}

function drawSword(c: Ctx) {
  for (let y = 2; y < 62; y++) {
    const hw = y < 8 ? Math.ceil((y - 1) / 2) : 3;
    for (let x = 8 - hw; x < 8 + hw; x++) px(c, x === 8 - hw ? A.b : x === 8 + hw - 1 ? '#e8ecff' : x === 7 ? A.m : '#a8b4d8', x, y);
  }
  c.clearRect(10, 30, 1, 2); c.clearRect(5, 44, 1, 1); // ébréchures
  px(c, A.m, 1, 62, 14, 3); px(c, A.l, 1, 62, 14, 1);
  px(c, A.C, 6, 65, 4, 11);
  for (let y = 66; y < 76; y += 2) px(c, '#4a3a5a', 6, y, 4, 1);
  px(c, A.b, 5, 76, 6, 4); px(c, A.h, 6, 76, 2, 1);
}

export function makeMordrecArt(scene: Phaser.Scene) {
  canvasTex(scene, 'mord_body', 60, 82, drawBody, OUTLINE);
  canvasTex(scene, 'mord_head', 26, 28, drawHead, OUTLINE);
  canvasTex(scene, 'mord_sword', 16, 84, drawSword, OUTLINE);
  canvasTex(scene, 'mord_eyes', 9, 3, (c) => { px(c, '#fff', 1, 1, 2, 1); px(c, '#fff', 6, 1, 2, 1); });
  // Danger (rouge/magenta) : arc de taille, onde, lame spectrale, repère au sol.
  canvasTex(scene, 'mord_arc', 56, 72, (c) => {
    crescent(c, 20, 36, 34, 12, 32, '#ff6a90', '#ff2a5a');
    crescent(c, 20, 36, 34, 5, 33, '#ffd6e0', '#ffd6e0');
  });
  canvasTex(scene, 'mord_wave', 28, 18, (c) => {
    for (let x = 0; x < 28; x++) {
      const h = Math.round(15 * Math.sin((Math.PI * x) / 27) ** 0.6 * (0.55 + 0.45 * (x / 27)));
      for (let y = 17 - h; y < 18; y++) px(c, y === 17 - h ? '#ffd6e0' : y < 20 - h ? '#ff6a90' : y > 14 ? '#c0144a' : '#ff2a5a', x, y);
    }
  });
  canvasTex(scene, 'mord_blade', 32, 12, (c) => {
    for (let x = 0; x < 32; x++) {
      if (x < 10) { if ((x * 5) % 3 !== 0) px(c, '#ff2a5a', x, 5 + (x % 3) - 1); continue; }
      const hw = x > 26 ? Math.round((31 - x) * 0.5) : 2;
      for (let y = 6 - hw; y <= 6 + hw; y++) px(c, y === 6 - hw ? '#ffd6e0' : y === 6 ? '#ff6a90' : '#ff2a5a', x, y);
    }
  });
  canvasTex(scene, 'mord_mark', 56, 10, (c) => {
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 56; x++) {
        const d = ((x + 0.5 - 28) / 28) ** 2 + ((y + 0.5 - 5) / 5) ** 2;
        if (d <= 1) px(c, d > 0.7 ? '#ff2a5a' : d > 0.35 ? '#c0144a' : '#ff6a90', x, y);
      }
  });
}

// ---------------------------------------------------------------- patterns

function* slash(b: Boss, tele = M.slash.tele, recover = M.slash.recover, last = true) {
  const p = b.parts, s = M.slash;
  b.face();
  b.eyes('tele'); sfx.warn();
  const tt = b.tele(tele);
  let tx = b.clampX(b.player.x + b.dir * s.overshoot);
  if ((tx - b.x) * b.dir < s.minDist) tx = b.clampX(b.x + b.dir * s.minDist);
  // Télégraphe : épée levée en arrière, accroupi, trajet au sol en rouge.
  b.tw(p.sword, { angle: -70 }, tt * 0.6, 'Back.out');
  b.tw(p.body, { scaleY: 0.95 }, tt * 0.6);
  const line = b.temp(b.scene.add.rectangle(Math.min(b.x, tx), b.floorY - 2, Math.abs(tx - b.x), 2, COL.danger, 0.5).setOrigin(0, 0).setDepth(4));
  b.tw(line, { alpha: 0.15, repeat: -1, yoyo: true }, 0.12, 'Linear');
  yield tt;
  // Actif : ruée + taille en arc.
  line.destroy();
  const d = b.t(s.dash);
  b.tw(b.root, { x: tx }, d, 'Cubic.out');
  b.tw(p.sword, { angle: 110 }, d * 0.6);
  b.tw(p.body, { scaleY: 1 }, 0.08);
  const arc = b.temp(b.scene.add.image(30, -34, 'mord_arc').setBlendMode(Phaser.BlendModes.ADD));
  b.root.add(arc);
  b.tw(arc, { alpha: 0 }, d + 0.1, 'Quad.in');
  b.hitbox = () => new Phaser.Geom.Rectangle(b.dir > 0 ? b.x - 10 : b.x - s.reach, b.floorY - s.height, s.reach + 10, s.height);
  sfx.whoosh();
  yield d;
  b.hitbox = null;
  if (!last) { yield b.t(recover); return; }
  // Récupération : épée plantée, yeux éteints = fenêtre pour frapper.
  b.eyes('off');
  yield b.t(recover);
  b.eyes('on'); b.def.rest(b, 0.25);
}

function* slam(b: Boss, double = false) {
  const p = b.parts, s = M.slam, sc = b.scene;
  b.eyes('tele'); sfx.warn();
  const tt = b.tele(s.tele);
  b.tw(p.body, { scaleY: 0.88 }, tt * 0.8);
  b.tw(p.head, { y: REST.headY + 8 }, tt * 0.8);
  b.tw(p.sword, { angle: -15 }, tt * 0.8);
  yield tt;
  // Bond hors de l'écran.
  sfx.leap();
  b.tw(p.body, { scaleY: 1.06 }, 0.1);
  b.tw(p.head, { y: REST.headY }, 0.1);
  b.tw(b.root, { y: -60 }, b.t(s.rise), 'Quad.out');
  yield b.t(s.rise);
  // Repère au sol sous le joueur.
  const tx = b.clampX(b.player.x);
  b.root.x = tx; b.face();
  const mark = b.temp(sc.add.image(tx, b.floorY + 1, 'mord_mark').setDepth(4).setBlendMode(Phaser.BlendModes.ADD));
  const col = b.temp(sc.add.rectangle(tx, 0, 30, b.floorY, COL.danger, 0.12).setOrigin(0.5, 0).setDepth(3));
  b.tw([mark, col], { alpha: 0.3, repeat: -1, yoyo: true }, 0.1, 'Linear');
  sfx.warn();
  yield b.tele(s.mark);
  // Chute + impact + ondes rasantes.
  b.tw(b.root, { y: b.floorY }, b.t(s.fall), 'Quad.in');
  yield b.t(s.fall);
  mark.destroy(); col.destroy();
  b.tw(p.body, { scaleY: 0.85, yoyo: true }, 0.06);
  b.tw(p.sword, { angle: 150 }, 0.08);
  b.hitbox = () => new Phaser.Geom.Rectangle(tx - 34, b.floorY - 90, 68, 90);
  const boom = () => {
    sfx.slam(); sc.cameras.main.shake(220, 0.014);
    for (const k of [-1, 1]) {
      sc.dust(tx + k * 24, b.floorY);
      b.hazard('mord_wave', tx + k * 26, b.floorY, k * s.waveSpeed * b.speed, 16, 11, 3);
    }
  };
  boom();
  yield 0.1;
  b.hitbox = null;
  if (double) { yield Math.max(0.7, b.t(s.doubleGap)); boom(); }
  b.eyes('off');
  yield b.t(s.recover);
  b.eyes('on'); b.def.rest(b, 0.25);
}

function* blades(b: Boss) {
  const p = b.parts, s = M.blades;
  b.eyes('tele'); sfx.warn();
  const tt = b.tele(s.tele);
  b.tw(p.sword, { angle: -10 }, tt * 0.7, 'Back.out');
  const glint = b.temp(b.scene.add.image(6, -110, 'glowR').setBlendMode(Phaser.BlendModes.ADD).setScale(0.8)); // pointe de l'épée levée
  b.root.add(glint);
  b.tw(glint, { scale: 1.4, alpha: 0.5, repeat: -1, yoyo: true }, 0.1, 'Linear');
  yield tt;
  glint.destroy();
  for (let i = 0; i < 3; i++) {
    b.tw(p.sword, { angle: 105 }, 0.1, 'Quad.in');
    yield 0.1;
    sfx.blade();
    const o = b.hazard('mord_blade', b.x + b.dir * 44, b.floorY - 1, b.dir * s.speed * b.speed, 24, 7, 3.5);
    o.setBlendMode(Phaser.BlendModes.ADD);
    if (i < 2) {
      const gap = Math.max(0.7, b.t(s.gap));
      b.tw(p.sword, { angle: -10 }, gap * 0.5, 'Back.out');
      yield gap - 0.1;
    }
  }
  b.eyes('off');
  yield b.t(s.recover);
  b.eyes('on'); b.def.rest(b, 0.25);
}

function* combo(b: Boss) {
  const t = M.combo.teles;
  yield* slash(b, t[0], 0.12, false);
  yield* slash(b, t[1], 0.3, false);
  yield* slash(b, t[2], M.combo.recover, true);
}

export const MORDREC: BossDef = {
  name: 'MORDREC',
  title: 'LE CHEVALIER CREUX',
  hp: M.hp,
  hurt: { w: 40, h: 86 },
  build(b) {
    const sc = b.scene;
    const body = sc.add.image(0, 0, 'mord_body').setOrigin(0.5, 1);
    const sword = sc.add.image(18, -44, 'mord_sword').setOrigin(0.5, 70 / 84);
    const headImg = sc.add.image(0, 0, 'mord_head').setOrigin(0.5, 1);
    const eyes = sc.add.image(4, -12, 'mord_eyes');
    const glow = sc.add.image(4, -12, 'glowW').setBlendMode(Phaser.BlendModes.ADD).setScale(0.6);
    const head = sc.add.container(2, REST.headY, [headImg, glow, eyes]);
    b.root.add([body, head, sword]);
    b.parts = { body, sword, head, headImg, eyes, glow };
    b.flashParts = [body, headImg, sword];
    this.rest(b, 0);
    sc.tweens.add({ targets: headImg, y: 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  },
  rest(b, sec) {
    const p = b.parts;
    if (sec <= 0) {
      p.sword.angle = REST.sword; p.body.scaleY = 1; p.head.y = REST.headY;
      return;
    }
    // Tweens non enregistrés : ils doivent survivre à la fin du pattern.
    const tw = (t: object, props: object) => b.scene.tweens.add({ targets: t, ...props, duration: sec * 1000, ease: 'Quad.out' });
    tw(p.sword, { angle: REST.sword });
    tw(p.body, { scaleY: 1 });
    tw(p.head, { y: REST.headY });
  },
  patterns: [
    { name: 'slash', weight: 3, phase: 0, run: (b) => slash(b) },
    { name: 'slam', weight: 2, phase: 0, run: (b) => slam(b) },
    { name: 'blades', weight: 2, phase: 0, run: blades },
    { name: 'combo', weight: 3, phase: 2, run: combo },
    { name: 'slam2', weight: 2, phase: 2, run: (b) => slam(b, true) },
  ],
};
