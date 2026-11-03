import Phaser from 'phaser';
import type { Boss, BossDef } from '../entities/Boss';
import { COL } from '../config';
import { sfx } from '../audio/sfx';
import { canvasTex, OUTLINE, poly, beam, ell } from '../art/pixel';

// Réglages de Noctis (durées en s avant ×vitesse de phase 2). Les lanternes / le feu sont gérés par DarkBossScene.
export const NIGHT = {
  hp: 96, fireDamage: 4, fireTick: 0.3, fireLife: 6, recharge: 8, fireWidth: 132, lanterns: [190, 390, 590, 790],
  pause: [0.3, 0.5] as [number, number],
  hunt: { tele: 0.6, count: 2, gap: 0.3, recover: 0.35 },
  rain: { count: 4, gap: 0.26 },
  sweep: { tele: 0.65, gap: 92, recover: 0.4 },
  barrage: { tele: 0.6, speed: 215, spread: 0.24, recover: 0.4 },
  rush: { tele: 0.6, time: 0.38, overshoot: 120, recover: 0.45 },
  howl: { tele: 0.65, reach: 190, spread: 0.42, active: 0.3, recover: 0.5 },
};
const REST = { arm: -25, headY: -94 };
const SH = { x: 10, y: -78 }; // épaule (dans le rig)
const GHOST = 0xb89cff; // flamme spectrale de la lanterne (ni cyan joueur, ni rouge danger)
const ADD = Phaser.BlendModes.ADD;
type Img = Phaser.GameObjects.Image;
type Cont = Phaser.GameObjects.Container;
type Ctx = CanvasRenderingContext2D;
type Tri = [number, number, number, number, number, number];

// ---------------------------------------------------------------- dessin
// Spectre voûté : voile en lambeaux, crâne allongé sous la capuche, bras d'os, lanterne à flamme spectrale.
const V = {
  v0: '#0c0a16', v1: '#181428', v2: '#262040', v3: '#3a3058', v4: '#54487a',
  o0: '#4a4458', o1: '#7a7290', o2: '#aaa2bc', o3: '#d6d0e2',
  n0: '#16141e', n1: '#2c2a3a', n2: '#4a4860',
  g0: '#6a4ab0', g1: '#b89cff', g2: '#e8dcff', g3: '#ffffff',
};
const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function drawBody(c: Ctx) {
  poly(c, V.v1, [16, 14, 30, 8, 44, 14, 52, 30, 56, 60, 62, 96, 58, 104, 52, 96, 46, 104, 40, 94, 34, 104, 28, 95, 22, 104, 16, 96, 10, 104, 4, 94, 8, 60, 10, 30]);
  poly(c, V.v2, [20, 16, 30, 11, 42, 16, 48, 30, 50, 60, 54, 92, 46, 90, 40, 86, 30, 90, 20, 88, 14, 90, 14, 60, 15, 30]);
  for (const [x0, x1] of [[18, 10], [26, 22], [36, 38], [44, 50]]) beam(c, V.v1, x0, 30, x1, 96, 1.5);
  beam(c, V.v3, 30, 12, 24, 90, 1); beam(c, V.v3, 46, 22, 54, 88, 1);
  // Cage thoracique dans l'ouverture du voile, braise spectrale au creux.
  poly(c, V.v0, [34, 30, 46, 30, 48, 58, 38, 64, 32, 56]);
  for (let i = 0; i < 5; i++) beam(c, i ? V.o1 : V.o2, 35, 34 + i * 5, 46, 35 + i * 5, 1.5);
  beam(c, V.o2, 40, 31, 40, 58, 1.5);
  ell(c, V.g0, 39, 46, 2, 3); px(c, V.g2, 39, 45, 1, 2);
  // Bras arrière dans l'ombre, griffe pendante.
  beam(c, V.v0, 14, 28, 8, 62, 4); beam(c, V.o0, 8, 60, 6, 74, 2);
  for (const dx of [-2, 0, 2]) beam(c, V.o0, 6, 74, 6 + dx, 80, 1);
  ell(c, V.v3, 42, 26, 7, 5); ell(c, V.v4, 43, 24, 4, 2);
  for (let x = 4; x < 62; x++) for (let y = 96; y < 104; y++) if ((x * 3 + y * 7) % 11 === 0) px(c, V.v2, x, y);
}

function drawHead(c: Ctx) {
  poly(c, V.v1, [0, 4, 10, 1, 20, 2, 27, 8, 29, 20, 27, 30, 3, 30, 4, 16]);
  poly(c, V.v2, [4, 6, 12, 3, 20, 4, 25, 9, 24, 14, 14, 14, 6, 24]);
  ell(c, V.v0, 20, 18, 8, 11);
  poly(c, V.o2, [15, 9, 24, 9, 27, 15, 26, 23, 22, 29, 17, 27, 15, 20]);
  poly(c, V.o3, [17, 10, 23, 10, 25, 14, 19, 14]);
  poly(c, V.o1, [15, 16, 18, 22, 17, 27, 15, 21]);
  px(c, V.v0, 18, 14, 3, 3); px(c, V.v0, 23, 14, 3, 3); px(c, V.v0, 22, 19, 1, 2);
  for (let x = 18; x < 25; x += 2) px(c, V.o0, x, 24, 1, 2);
  px(c, V.o1, 18, 26, 6, 1);
}

function drawArm(c: Ctx) {
  poly(c, V.v2, [0, 0, 10, 0, 9, 14, 7, 20, 5, 16, 3, 21, 1, 14]);
  beam(c, V.v3, 6, 1, 7, 14, 1);
  beam(c, V.o1, 5, 16, 5, 46, 2.5); beam(c, V.o2, 5.5, 16, 5.5, 45, 1);
  ell(c, V.o2, 5, 30, 2, 1.5); ell(c, V.o1, 5, 47, 2.5, 2);
  for (const dx of [-3, -1, 1, 3]) beam(c, V.o2, 5, 47, 5 + dx, 53, 1);
}

function drawLamp(c: Ctx) {
  px(c, V.n2, 7, 0, 2, 3);
  poly(c, V.n1, [3, 3, 13, 3, 15, 6, 1, 6]); px(c, V.n2, 4, 3, 7, 1);
  px(c, V.g0, 3, 6, 10, 13); px(c, V.g1, 4, 8, 8, 9); px(c, V.g2, 6, 10, 4, 6); px(c, V.g3, 7, 12, 2, 3);
  px(c, V.n1, 2, 6, 1, 13); px(c, V.n1, 13, 6, 1, 13); px(c, V.n1, 2, 12, 12, 1);
  poly(c, V.n1, [1, 19, 15, 19, 12, 22, 4, 22]); px(c, V.n0, 7, 22, 2, 2);
}

/** Splash art de l'annonceur (100×124, tourné vers la gauche) : lanterne brandie, crâne sous la capuche. */
function drawSplash(c: Ctx) {
  for (let y = 0; y < 92; y++)
    for (let x = 18; x < 100; x++) {
      const d = Math.hypot(x - 62, y - 44);
      if (d < 38.5 && d > 36) px(c, V.v4, x, y);
      else if (d <= 36 && (x + y) % 2 === 0) px(c, d < 24 ? '#1e1834' : '#14102a', x, y);
    }
  poly(c, V.v1, [56, 10, 76, 18, 86, 40, 92, 80, 99, 120, 92, 112, 88, 124, 80, 110, 74, 124, 66, 112, 58, 124, 52, 110, 44, 124, 40, 108, 30, 124, 32, 90, 38, 56, 42, 30]);
  poly(c, V.v2, [58, 16, 74, 22, 82, 42, 86, 80, 90, 108, 80, 100, 70, 106, 60, 100, 48, 104, 42, 96, 42, 60, 46, 34]);
  for (const [x0, y0, x1, y1] of [[62, 40, 56, 104], [72, 36, 78, 104], [80, 50, 88, 108], [50, 50, 46, 100]]) beam(c, V.v1, x0, y0, x1, y1, 1.5);
  beam(c, V.v3, 60, 30, 48, 100, 1); beam(c, V.v3, 78, 30, 90, 100, 1);
  poly(c, V.v0, [50, 52, 66, 50, 68, 84, 58, 92, 48, 82]);
  for (let i = 0; i < 6; i++) beam(c, i % 2 ? V.o1 : V.o2, 50, 56 + i * 5, 66, 54 + i * 5, 1.5);
  beam(c, V.o3, 58, 52, 58, 86, 1.5);
  ell(c, V.g0, 58, 70, 3, 4); px(c, V.g2, 58, 69, 1, 2);
  beam(c, V.v1, 84, 44, 92, 84, 5); beam(c, V.o1, 92, 82, 93, 100, 2);
  for (const dx of [-3, -1, 1, 3]) beam(c, V.o2, 93, 100, 93 + dx, 108, 1);
  // Capuche rejetée en arrière, crâne allongé, orbites rouges.
  poly(c, V.v1, [44, 30, 46, 14, 56, 4, 68, 2, 86, 0, 74, 10, 76, 28, 70, 44, 50, 46]);
  ell(c, V.v0, 56, 28, 10, 14);
  poly(c, V.o2, [48, 18, 62, 16, 66, 26, 62, 40, 56, 46, 50, 42, 46, 30]);
  poly(c, V.o3, [50, 18, 60, 17, 62, 22, 50, 24]);
  poly(c, V.o1, [60, 28, 66, 26, 62, 40, 58, 42]);
  ell(c, V.v0, 51, 27, 2.5, 2.5); ell(c, V.v0, 59, 27, 2.5, 2.5);
  px(c, '#ff2a5a', 50, 26, 2, 2); px(c, '#ff2a5a', 58, 26, 2, 2); px(c, '#ffd6e0', 50, 26); px(c, '#ffd6e0', 58, 26);
  px(c, V.v0, 53, 32, 1, 2); px(c, V.v0, 56, 32, 1, 2);
  px(c, V.v0, 49, 37, 11, 1);
  for (let x = 49; x < 60; x += 2) px(c, V.o0, x, 38, 1, 2);
  // Bras avant tendu, lanterne brandie (halo tramé, flamme spectrale).
  beam(c, V.v2, 48, 50, 34, 44, 7);
  for (let i = 0; i < 4; i++) px(c, V.v2, 30 + i * 3, 47 + (i % 2) * 3, 2, 4);
  beam(c, V.o1, 34, 44, 16, 30, 2.5); beam(c, V.o2, 34, 43, 16, 29, 1);
  ell(c, V.o2, 15, 29, 2.5, 2);
  for (const dy of [-3, -1, 1]) beam(c, V.o2, 15, 29, 10, 30 + dy, 1);
  for (let y = 26; y < 64; y++)
    for (let x = 0; x < 30; x++) {
      const d = Math.hypot(x - 14, y - 45);
      if (d < 18 && d > 10 && (x + y) % 3 === 0) px(c, V.g0, x, y);
    }
  px(c, V.n2, 13, 31, 2, 3);
  poly(c, V.n1, [8, 34, 20, 34, 22, 37, 6, 37]);
  px(c, V.g0, 7, 37, 14, 16); px(c, V.g1, 8, 39, 12, 12); px(c, V.g2, 11, 41, 6, 8); px(c, V.g3, 13, 43, 2, 4);
  px(c, V.n1, 6, 37, 1, 16); px(c, V.n1, 21, 37, 1, 16); px(c, V.n1, 6, 45, 16, 1);
  poly(c, V.n1, [5, 53, 23, 53, 19, 57, 9, 57]); px(c, V.n0, 13, 57, 2, 3);
  for (let i = 0; i < 14; i++) px(c, i % 3 ? V.g1 : V.g2, ((i * 41) % 84) + 8, ((i * 29) % 100) + 14);
}

export function makeNoctisArt(scene: Phaser.Scene) {
  canvasTex(scene, 'noct_body', 64, 104, drawBody, OUTLINE);
  canvasTex(scene, 'noct_head', 30, 30, drawHead, OUTLINE);
  canvasTex(scene, 'noct_arm', 10, 54, drawArm, OUTLINE);
  canvasTex(scene, 'noct_lamp', 16, 24, drawLamp, OUTLINE);
  canvasTex(scene, 'noct_splash', 100, 124, drawSplash, OUTLINE);
}

// ---------------------------------------------------------------- outils

/** Bras + lanterne : le bras pivote à l'épaule, la lanterne reste pendue (contre-rotation en retard = balancier). */
function arm(b: Boss, angle: number, sec: number, ease = 'Quad.out') {
  b.tw(b.parts.arm, { angle }, sec, ease);
  b.tw(b.parts.lamp, { angle: -angle * 0.85 }, sec * 1.4, 'Sine.out');
}
/** Position monde de la flamme de la lanterne (pour la lumière de DarkBossScene). */
export function lampPos(b: Boss) {
  const a = Phaser.Math.DegToRad((b.parts.arm as Cont).angle), ry = (b.parts.rig as Cont).y;
  return { x: b.x + b.dir * (SH.x - Math.sin(a) * 48), y: b.y + ry + SH.y + Math.cos(a) * 48 + 12 };
}
/** Explosion de flamme spectrale (danger). */
function burst(b: Boss, x: number, y: number, big = 1) {
  const s = b.scene;
  const f = s.add.image(x, y, 'glowR').setBlendMode(ADD).setDepth(81).setScale(1.6 * big);
  s.tweens.add({ targets: f, scale: 0.2, alpha: 0, duration: 260, onComplete: () => f.destroy() });
  const r = s.add.image(x, y, 'ring').setTint(COL.danger).setBlendMode(ADD).setDepth(81).setScale(0.3);
  s.tweens.add({ targets: r, scale: 1.1 * big, alpha: 0, duration: 260, ease: 'Quad.out', onComplete: () => r.destroy() });
  s.sparks(x, y, COL.danger, 14); s.sparks(x, y, 0xe8dcff, 6);
  s.cameras.main.shake(90, 0.006);
}
/** Frappe annoncée : réticule + anneau qui se resserre, puis explosion (zone dangereuse 44×44). */
function strikeAt(b: Boss, x: number, y: number, tele: number) {
  const s = b.scene;
  const mark = b.temp(s.add.graphics().setDepth(80));
  mark.lineStyle(2, COL.danger, 0.9).strokeCircle(x, y, 24);
  mark.lineBetween(x - 30, y, x + 30, y).lineBetween(x, y - 30, x, y + 30);
  b.tw(mark, { alpha: 0.35, yoyo: true, repeat: -1 }, 0.08, 'Linear');
  const conv = b.temp(s.add.image(x, y, 'ring').setTint(COL.danger).setBlendMode(ADD).setDepth(80).setScale(1.6));
  b.tw(conv, { scale: 0.75 }, tele, 'Quad.in');
  sfx.warn();
  s.time.delayedCall(tele * 1000, () => {
    if (!mark.active || !b.alive()) return;
    mark.destroy(); conv.destroy();
    burst(b, x, y); sfx.whoosh(); sfx.crack();
    b.hazard('px', x, y + 22, 0, 44, 44, 0.18).setAlpha(0);
  });
}
function ghostTrail(b: Boss) {
  const g = b.scene.add.image(b.x, b.y - 5, 'noct_body').setOrigin(0.5, 1).setFlipX(b.dir < 0).setTintFill(GHOST).setAlpha(0.35).setDepth(6).setBlendMode(ADD);
  b.scene.tweens.add({ targets: g, alpha: 0, duration: 240, onComplete: () => g.destroy() });
}
function* recover(b: Boss, sec: number) {
  b.eyes('off');
  b.tw(b.parts.rig, { angle: 4, scaleY: 0.96 }, 0.2);
  yield b.t(sec);
  b.eyes('on'); b.def.rest(b, 0.25);
}

// ---------------------------------------------------------------- patterns

/** Traque : la lanterne levée, des frappes tombent là où était le joueur (P1 ×2, P2 « rain » ×4 en cascade). */
function* hunt(b: Boss, count = NIGHT.hunt.count, gap = NIGHT.hunt.gap) {
  const p = b.parts;
  b.face(); b.eyes('tele');
  arm(b, -165, 0.22, 'Back.out');
  b.tw(p.flame, { scale: 2 }, 0.22);
  const tt = b.tele(NIGHT.hunt.tele);
  for (let i = 0; i < count; i++) {
    strikeAt(b, b.player.x, b.player.rect().centerY, tt);
    if (i < count - 1) yield b.t(gap);
  }
  yield tt;
  arm(b, -40, 0.1, 'Quad.in');
  b.tw(p.flame, { scale: 1.1 }, 0.2);
  yield 0.2;
  yield* recover(b, NIGHT.hunt.recover);
}

/** Colonnes de flamme spectrale tombant du plafond (P2 : trois colonnes, couloirs entre elles). */
function* sweep(b: Boss) {
  const sc = b.scene, N = NIGHT.sweep;
  b.face(); b.eyes('tele'); sfx.warn();
  arm(b, -150, 0.2, 'Back.out');
  const xs = (b.phase === 2 ? [-N.gap, 0, N.gap] : [0]).map((d) => b.clampX(b.player.x + d));
  const marks = xs.map((x) => {
    const m = b.temp(sc.add.rectangle(x, 0, 58, b.floorY, COL.danger, 0.2).setOrigin(0.5, 0).setDepth(80));
    b.tw(m, { fillAlpha: 0.08, yoyo: true, repeat: -1 }, 0.09, 'Linear');
    return m;
  });
  const drip = sc.time.addEvent({ delay: 60, repeat: 12, callback: () => { if (b.state === 'pattern') for (const x of xs) sc.sparks(x + Phaser.Math.Between(-25, 25), 4, COL.danger, 1); } });
  yield b.tele(N.tele);
  drip.remove();
  for (const m of marks) m.destroy();
  arm(b, -20, 0.1, 'Quad.in');
  sfx.slam(); sc.cameras.main.shake(160, 0.009);
  for (const x of xs) {
    const col = sc.add.rectangle(x, 0, 58, b.floorY, COL.danger, 0.7).setOrigin(0.5, 0).setDepth(80);
    const core = sc.add.rectangle(x, 0, 18, b.floorY, 0xffd6e0, 0.8).setOrigin(0.5, 0).setDepth(81);
    sc.tweens.add({ targets: [col, core], alpha: 0, scaleX: 0.3, duration: 260, delay: 90, onComplete: () => { col.destroy(); core.destroy(); } });
    b.hazard('px', x, b.floorY, 0, 58, b.floorY, 0.2).setAlpha(0);
    sc.sparks(x, b.floorY - 4, COL.danger, 12); sc.puffs(x, b.floorY, 3);
  }
  yield b.t(0.2);
  yield* recover(b, N.recover);
}

/** Salve visée depuis la lanterne : les orbes partent en éventail vers la position verrouillée. */
function* barrage(b: Boss) {
  const sc = b.scene, N = NIGHT.barrage, p = b.parts;
  const count = b.phase === 2 ? 5 : 3;
  b.face(); b.eyes('tele'); sfx.warn();
  arm(b, -95, 0.2, 'Back.out');
  b.tw(p.flame, { scale: 1.8 }, 0.25);
  const tt = b.tele(N.tele);
  yield 0.2;
  const { x, y } = lampPos(b);
  const angle = Math.atan2(b.player.rect().centerY - y, b.player.x - x);
  const rays = b.temp(sc.add.graphics().setDepth(80));
  rays.lineStyle(1, COL.danger, 0.65);
  for (let i = 0; i < count; i++) {
    const a = angle + (i - (count - 1) / 2) * N.spread;
    rays.lineBetween(x, y, x + Math.cos(a) * 260, y + Math.sin(a) * 260);
  }
  b.tw(rays, { alpha: 0.25, yoyo: true, repeat: -1 }, 0.08, 'Linear');
  yield Math.max(0.05, tt - 0.2);
  rays.destroy(); sfx.blade(); sfx.shoot();
  b.tw(p.flame, { scale: 1.1 }, 0.2);
  b.tw(p.rig, { angle: -6 }, 0.08, 'Back.out');
  burst(b, x, y, 0.6);
  for (let i = 0; i < count; i++) {
    const a = angle + (i - (count - 1) / 2) * N.spread, v = N.speed * b.speed;
    const o = b.hazard('glowR', x, y, Math.cos(a) * v, 12, 12, 3).setOrigin(0.5).setBlendMode(ADD).setData('once', true);
    (o.body as Phaser.Physics.Arcade.Body).setOffset((o.width - 12) / 2, (o.height - 12) / 2);
    o.setVelocityY(Math.sin(a) * v);
    let trail = 0;
    o.setData('tick', (dt: number) => {
      trail -= dt;
      if (trail <= 0) { trail = 0.05; sc.sparks(o.x, o.y, COL.danger, 2); }
    });
  }
  yield* recover(b, N.recover);
}

/** Ruée : il se penche, le voile file derrière, et traverse la salle (et les flammes). */
function* rush(b: Boss, last = true) {
  const p = b.parts, N = NIGHT.rush, sc = b.scene;
  b.face(); b.eyes('tele'); sfx.warn();
  const end = b.clampX(b.player.x + b.dir * N.overshoot);
  const mark = b.temp(sc.add.rectangle(Math.min(b.x, end) - 30, b.floorY - 110, Math.abs(end - b.x) + 60, 110, COL.danger, 0.16).setOrigin(0).setDepth(80));
  b.tw(mark, { fillAlpha: 0.06, yoyo: true, repeat: -1 }, 0.09, 'Linear');
  const tt = b.tele(N.tele);
  b.tw(p.rig, { angle: 16, scaleX: 1.1, scaleY: 0.9 }, tt * 0.8);
  arm(b, 35, tt * 0.8);
  b.tw(b.root, { x: b.clampX(b.x - b.dir * 10) }, tt * 0.8);
  yield tt;
  mark.destroy(); sfx.whoosh(); sfx.leap();
  const d = b.t(N.time);
  b.tw(b.root, { x: end }, d, 'Cubic.in');
  b.tw(p.rig, { scaleX: 1.2, scaleY: 0.86 }, d);
  b.hitbox = () => new Phaser.Geom.Rectangle(b.x - 30, b.y - 110, 60, 110);
  for (let k = 0; k < d / 0.04; k++) sc.time.delayedCall(k * 40, () => b.state === 'pattern' && ghostTrail(b));
  yield d;
  b.hitbox = null;
  sc.puffs(b.x, b.floorY, 4); sc.cameras.main.shake(100, 0.006); sfx.thud();
  b.tw(p.rig, { angle: -8, scaleX: 1, scaleY: 1 }, 0.15, 'Back.out');
  if (!last) { yield 0.12; return; }
  yield* recover(b, N.recover);
}

/** Hurlement : la tête se rejette en arrière, puis un cône de cri spectral part vers le joueur. */
function* howl(b: Boss) {
  const sc = b.scene, p = b.parts, N = NIGHT.howl;
  b.face(); b.eyes('tele'); sfx.warn();
  const hx = b.x + b.dir * 14, hy = b.y - 110;
  const ang = Math.atan2(b.player.rect().centerY - hy, b.player.x - hx);
  const tri = (r: number): Tri => [hx, hy, hx + Math.cos(ang - N.spread) * r, hy + Math.sin(ang - N.spread) * r, hx + Math.cos(ang + N.spread) * r, hy + Math.sin(ang + N.spread) * r];
  const tg = b.temp(sc.add.graphics().setDepth(80));
  const t = tri(N.reach);
  tg.fillStyle(COL.danger, 0.14).fillTriangle(...t);
  tg.lineStyle(1, COL.danger, 0.8).lineBetween(t[0], t[1], t[2], t[3]).lineBetween(t[0], t[1], t[4], t[5]);
  b.tw(tg, { alpha: 0.4, yoyo: true, repeat: -1 }, 0.08, 'Linear');
  const tt = b.tele(N.tele);
  b.tw(p.head, { angle: -28, y: REST.headY - 5 }, tt * 0.8, 'Quad.out');
  b.tw(p.rig, { angle: -8, scaleX: 0.94, scaleY: 1.07 }, tt * 0.8);
  arm(b, 20, tt * 0.8);
  sfx.rumble();
  yield tt;
  tg.destroy();
  b.tw(p.head, { angle: 14, y: REST.headY + 3 }, 0.08, 'Back.out');
  b.tw(p.rig, { angle: 8, scaleX: 1.08, scaleY: 0.94 }, 0.08);
  const cone = b.temp(sc.add.graphics().setDepth(80).setBlendMode(ADD));
  cone.fillStyle(COL.danger, 0.5).fillTriangle(...t).fillStyle(0xffd6e0, 0.35).fillTriangle(...tri(N.reach * 0.55));
  b.tw(cone, { alpha: 0.15 }, b.t(N.active));
  for (let i = 0; i < 3; i++) sc.time.delayedCall(i * 70, () => {
    const r = sc.add.image(hx, hy, 'ring').setTint(COL.danger).setBlendMode(ADD).setDepth(81).setScale(0.2);
    sc.tweens.add({ targets: r, x: hx + Math.cos(ang) * N.reach * 0.8, y: hy + Math.sin(ang) * N.reach * 0.8, scale: 1.6, alpha: 0, duration: 300, onComplete: () => r.destroy() });
  });
  sfx.roar(); sc.cameras.main.shake(260, 0.012);
  const zone = new Phaser.Geom.Triangle(...t), none = new Phaser.Geom.Rectangle(-999, -999, 1, 1);
  b.hitbox = () => {
    const r = b.player.rect();
    return Phaser.Geom.Triangle.Contains(zone, r.centerX, r.centerY) || Phaser.Geom.Triangle.Contains(zone, r.centerX, r.top + 3) ? r : none;
  };
  yield b.t(N.active);
  b.hitbox = null; cone.destroy();
  yield* recover(b, N.recover);
}

/** Phase 2 : ruée puis salve immédiate depuis l'autre côté. */
function* onslaught(b: Boss) {
  yield* rush(b, false);
  yield* barrage(b);
}

export const NOCTIS: BossDef = {
  name: 'NOCTIS', title: 'LE DÉVOREUR DE LUMIÈRE', hp: NIGHT.hp,
  fireOnly: true, hurt: { w: 50, h: 118 }, pause: NIGHT.pause,
  build(b) {
    const sc = b.scene;
    const body = sc.add.image(0, 0, 'noct_body').setOrigin(0.5, 1);
    const headImg = sc.add.image(0, 0, 'noct_head').setOrigin(0.5, 1);
    const eyes = sc.add.image(7, -15, 'mord_eyes');
    const glow = sc.add.image(7, -15, 'glowW').setBlendMode(ADD).setScale(0.6);
    const head = sc.add.container(8, REST.headY, [headImg, glow, eyes]);
    const lampImg = sc.add.image(0, 0, 'noct_lamp').setOrigin(0.5, 0);
    const flame = sc.add.image(0, 13, 'glowW').setBlendMode(ADD).setTint(GHOST).setScale(1.1).setAlpha(0.8);
    const lamp = sc.add.container(0, 48, [flame, lampImg]);
    const armImg = sc.add.image(0, 0, 'noct_arm').setOrigin(0.5, 0);
    const armC = sc.add.container(SH.x, SH.y, [armImg, lamp]);
    const rig = sc.add.container(0, -5, [body, head, armC]);
    b.root.add(rig);
    b.parts = { rig, body, head, headImg, eyes, glow, arm: armC, armImg, lamp, lampImg, flame };
    b.flashParts = [body, headImg, armImg, lampImg];
    this.rest(b, 0);
    // Il flotte ; la flamme vacille.
    sc.tweens.add({ targets: rig, y: -11, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    sc.tweens.add({ targets: flame, alpha: 0.5, duration: 130, yoyo: true, repeat: -1 });
  },
  rest(b, sec) {
    const p = b.parts;
    const pose: [object, object][] = [[p.arm, { angle: REST.arm }], [p.lamp, { angle: -REST.arm * 0.85 }], [p.head, { y: REST.headY, angle: 0 }], [p.rig, { angle: 0, scaleX: 1, scaleY: 1, alpha: 1 }], [p.flame, { scale: 1.1 }]];
    for (const [t, props] of pose) {
      if (sec <= 0) Object.assign(t, props);
      else b.scene.tweens.add({ targets: t, ...props, duration: sec * 1000, ease: 'Quad.out' });
    }
  },
  roar(b) {
    const sc = b.scene, p = b.parts;
    sc.tweens.add({ targets: p.arm, angle: -170, duration: 220, ease: 'Back.out' });
    sc.tweens.add({ targets: p.lamp, angle: 150, duration: 300, ease: 'Sine.out' });
    sc.tweens.add({ targets: p.head, angle: -30, y: REST.headY - 6, duration: 220 });
    sc.tweens.add({ targets: p.flame, scale: 2.6, duration: 300, yoyo: true });
    for (let i = 0; i < 3; i++) sc.time.delayedCall(i * 220, () => {
      const r = sc.add.image(b.x, b.y - 100, 'ring').setTint(GHOST).setBlendMode(ADD).setDepth(81).setScale(0.3);
      sc.tweens.add({ targets: r, scale: 3 + i, alpha: 0, duration: 450, onComplete: () => r.destroy() });
    });
    sc.sparks(b.x, b.y - 90, GHOST, 30);
    sc.time.delayedCall(800, () => this.rest(b, 0.25));
  },
  death(b) {
    const sc = b.scene, p = b.parts, x = b.x, y = b.y;
    // La lanterne s'éteint et tombe, le spectre se dissout vers le haut en feux follets.
    sc.tweens.add({ targets: p.arm, angle: 15, duration: 400, ease: 'Quad.in' });
    sc.tweens.add({ targets: p.flame, alpha: 0, scale: 0.2, duration: 500 });
    sc.time.addEvent({ delay: 100, repeat: 14, callback: () => sc.sparks(x + Phaser.Math.Between(-24, 24), y - Phaser.Math.Between(10, 120), GHOST, 8) });
    sc.tweens.add({ targets: p.rig, alpha: 0, y: -60, scaleX: 0.7, duration: 1600, delay: 300, ease: 'Quad.in' });
    sc.time.delayedCall(1700, () => { sc.flashScreen(0.2); sc.puffs(x, y, 8); });
  },
  portrait(sc) {
    return sc.add.container(0, 0, [sc.add.image(0, 0, 'noct_splash').setOrigin(0.5, 1).setScale(2 / 3)]);
  },
  patterns: [
    { name: 'hunt', weight: 3, phase: 1, far: true, elevated: true, run: (b) => hunt(b) },
    { name: 'rain', weight: 2, phase: 2, far: true, elevated: true, run: (b) => hunt(b, NIGHT.rain.count, NIGHT.rain.gap) },
    { name: 'sweep', weight: 2, phase: 0, far: true, elevated: true, run: sweep },
    { name: 'barrage', weight: 2, phase: 0, far: true, elevated: true, run: barrage },
    { name: 'rush', weight: 3, phase: 1, far: true, run: (b) => rush(b) },
    { name: 'howl', weight: 2, phase: 0, elevated: true, run: howl },
    { name: 'onslaught', weight: 3, phase: 2, far: true, run: onslaught },
  ],
};
