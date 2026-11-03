import Phaser from 'phaser';
import { COL } from '../config';
import { canvasTex, crescent, OUTLINE } from '../art/pixel';
import { sfx } from '../audio/sfx';
import type { Boss, BossDef } from '../entities/Boss';

// Réglages de Mordrec (durées en s avant ×vitesse de phase 2, distances en px).
const M = {
  hp: 140,
  slash: { tele: 0.65, dash: 0.28, minDist: 70, maxDist: 250, overshoot: 50, recover: 0.5, reach: 64, height: 54 },
  slam: { tele: 0.6, rise: 0.35, mark: 0.7, fall: 0.16, recover: 0.6, waveSpeed: 210, doubleGap: 0.8 },
  blades: { tele: 0.65, count: 2, gap: 0.75, speed: 230, recover: 0.45 },
  combo: { teles: [0.55, 0.45, 0.8], recover: 0.7 },
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

/** Traînée d'épée : secteur d'anneau autour de la main, de l'angle a0 à a1 (0 = haut, horaire). */
function smear(c: Ctx, a0: number, a1: number, rIn: number, rOut: number) {
  const C = 73;
  for (let y = 0; y < 146; y++)
    for (let x = 0; x < 146; x++) {
      const dx = x + 0.5 - C, dy = y + 0.5 - C, r = Math.hypot(dx, dy);
      const a = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (r < rIn || r > rOut || a < a0 || a > a1) continue;
      const u = (a - a0) / (a1 - a0);
      if (u < 0.35 && (x + y) % 2) continue; // queue tramée
      px(c, r > rOut - 3 ? '#ffffff' : u > 0.75 ? '#ffd0dc' : u > 0.4 ? '#ff6a90' : '#c0144a', x, y);
    }
}

export function makeMordrecArt(scene: Phaser.Scene) {
  canvasTex(scene, 'mord_body', 60, 82, drawBody, OUTLINE);
  canvasTex(scene, 'mord_head', 26, 28, drawHead, OUTLINE);
  canvasTex(scene, 'mord_sword', 16, 84, drawSword, OUTLINE);
  canvasTex(scene, 'mord_eyes', 9, 3, (c) => { px(c, '#fff', 1, 1, 2, 1); px(c, '#fff', 6, 1, 2, 1); });
  // Danger (rouge/magenta, cœur blanc) : traînées, pics de roche, épée fantôme, repère au sol.
  canvasTex(scene, 'smear0', 146, 146, (c) => smear(c, -75, 125, 26, 72));
  canvasTex(scene, 'smear1', 146, 146, (c) => smear(c, 20, 125, 40, 72));
  canvasTex(scene, 'smear2', 146, 146, (c) => smear(c, 80, 125, 56, 72));
  // Pics de roche à facettes (face éclairée / ombre), fissure rouge incandescente, pointe chauffée à blanc.
  for (const [k, hgt, hw0, lean] of [['mord_spike', 26, 6, 0], ['mord_spike2', 20, 5, 2], ['mord_spike3', 30, 7, -1]] as [string, number, number, number][])
    canvasTex(scene, k, 18, 32, (c) => {
      const top = 31 - hgt;
      for (let y = top; y < 31; y++) {
        const t = (y - top) / (hgt - 1), hw = Math.max(0, Math.round(t * hw0)), cx = 9 + Math.round((1 - t) * lean);
        for (let x = cx - hw; x <= cx + hw; x++) {
          const u = hw ? (x - cx) / hw : 0, seam = Math.abs(x - cx - Math.round(Math.sin(y * 0.7) * 0.6)) < 1 && t > 0.25;
          px(c, seam ? (t > 0.8 ? '#ffd6e0' : '#ff2a5a') : t < 0.18 ? '#ffd6e0' : u < -0.45 ? '#9aa6c8' : u < 0 ? '#6a759a' : u < 0.5 ? '#454d70' : '#262b45', x, y);
        }
      }
      px(c, '#3a3448', 9 - hw0 - 1, 30, hw0 * 2 + 3, 1); // éboulis à la base
    }, OUTLINE);
  canvasTex(scene, 'mord_crack', 12, 3, (c) => { px(c, '#ff2a5a', 0, 1, 12, 1); px(c, '#ffd6e0', 3, 1, 5, 1); px(c, '#c0144a', 2, 0, 3, 1); px(c, '#c0144a', 7, 2, 3, 1); });
  canvasTex(scene, 'mord_ghost', 58, 14, (c) => {
    for (let x = 6; x < 56; x++) {
      const hw = x > 46 ? Math.round((56 - x) * 0.33) : 3;
      for (let y = 7 - hw; y <= 7 + hw; y++) px(c, y === 7 - hw ? '#ffd6e0' : y === 7 ? '#ffffff' : y === 7 + hw ? '#c0144a' : '#ff6a90', x, y);
    }
    px(c, '#ff6a90', 3, 1, 3, 12); px(c, '#ffd6e0', 3, 1, 1, 12); px(c, '#c0144a', 0, 6, 3, 3);
  });
  canvasTex(scene, 'mord_mark', 56, 10, (c) => {
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 56; x++) {
        const d = ((x + 0.5 - 28) / 28) ** 2 + ((y + 0.5 - 5) / 5) ** 2;
        if (d <= 1) px(c, d > 0.7 ? '#ff2a5a' : d > 0.35 ? '#c0144a' : '#ff6a90', x, y);
      }
  });
  // Neutres : éclat, débris, poussière, onde de choc.
  canvasTex(scene, 'glint', 17, 17, (c) => {
    for (let i = 0; i < 8; i++) { px(c, '#ffffff', 8, i, 1, 1); px(c, '#ffffff', 8, 16 - i, 1, 1); px(c, '#ffffff', i, 8, 1, 1); px(c, '#ffffff', 16 - i, 8, 1, 1); }
    px(c, '#ffffff', 7, 7, 3, 3); px(c, '#ffd6e0', 6, 8, 5, 1); px(c, '#ffd6e0', 8, 6, 1, 5);
  });
  canvasTex(scene, 'rock', 4, 4, (c) => { px(c, '#ffffff', 0, 0, 4, 3); px(c, '#9a9ab0', 1, 3, 3, 1); px(c, '#9a9ab0', 3, 1, 1, 2); });
  canvasTex(scene, 'puff', 14, 14, (c) => {
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 7);
      if (d < 6.5 && (d < 4 || (x + y) % 2 === 0)) px(c, '#ffffff', x, y);
    }
  });
  canvasTex(scene, 'ring', 64, 64, (c) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32);
      if (d > 29 && d < 31.5) px(c, '#ffffff', x, y);
    }
  });
}

// ---------------------------------------------------------------- effets

type Img = Phaser.GameObjects.Image;
type Cont = Phaser.GameObjects.Container;
const ADD = Phaser.BlendModes.ADD;

/** Pointe de l'épée (monde), pour une épée à l'angle a (rig non incliné). */
function tipAt(b: Boss, a: number) {
  const r = Phaser.Math.DegToRad(a);
  return { x: b.x + b.dir * (18 + 66 * Math.sin(r)), y: b.y - 44 - 66 * Math.cos(r) };
}
/** Éclat en étoile sur la lame : « ça va frapper ». */
function glint(b: Boss, a: number) {
  const { x, y } = tipAt(b, a);
  const g = b.temp(b.scene.add.image(x, y, 'glint').setBlendMode(ADD).setDepth(20).setScale(0));
  b.tw(g, { scale: 1.4, angle: 90, yoyo: true }, 0.13, 'Quad.out');
  sfx.ting();
}
/** Traînée pleine sur 3 frames, attachée au rig. */
function smearFx(b: Boss) {
  const rig = b.parts.rig as Cont, sc = b.scene;
  const img = b.temp(sc.add.image(18, -44, 'smear0').setBlendMode(ADD));
  rig.add(img);
  sc.time.delayedCall(45, () => img.active && img.setTexture('smear1'));
  sc.time.delayedCall(90, () => img.active && img.setTexture('smear2'));
  sc.time.delayedCall(140, () => img.destroy());
}
/** Image rémanente lilas pendant la ruée. */
function ghostTrail(b: Boss) {
  const g = b.scene.add.image(b.x, b.y, 'mord_body').setOrigin(0.5, 1).setFlipX(b.dir < 0).setTintFill(0xd8d0ff).setAlpha(0.35).setDepth(6);
  b.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
}
function ring(b: Boss, x: number, y: number, scale: number) {
  const r = b.scene.add.image(x, y, 'ring').setBlendMode(ADD).setDepth(13).setScale(0.2).setScale(0.2, 0.08);
  b.scene.tweens.add({ targets: r, scaleX: scale, scaleY: scale * 0.35, alpha: 0, duration: 380, ease: 'Quad.out', onComplete: () => r.destroy() });
}
/** Impact lourd : hit-stop, secousse, poussière, débris, flash. */
function impact(b: Boss, x: number, y: number, power: number) {
  const sc = b.scene;
  sc.hitstop(0.035 * power);
  sc.cameras.main.shake(90 + 120 * power, 0.004 + 0.006 * power);
  sc.puffs(x, y, 3 * power);
  sc.debris(x, y - 2, 4 * power);
  if (power >= 2) sc.flashScreen(0.22);
}
/** Onde de pics de roche : une fissure rouge court au sol, les pics jaillissent derrière (écrasement → rebond),
 *  tiennent un instant puis se rétractent dans le sol (échelle, jamais à travers le dallage) en lâchant des gravillons. */
function spikeWave(b: Boss, x: number, dir: number) {
  const sc = b.scene, fy = b.floorY;
  const o = b.hazard('mord_spike', x, fy, dir * M.slam.waveSpeed * b.speed, 18, 15, 3).setAlpha(0);
  const halo = sc.add.image(x, fy - 2, 'glowR').setBlendMode(ADD).setDepth(10).setScale(0.9, 0.5).setAlpha(0.7);
  const keys = ['mord_spike3', 'mord_spike', 'mord_spike2'];
  let lastX = x - dir * 12, n = 0;
  o.on('destroy', () => halo.destroy());
  o.setData('tick', () => {
    halo.setPosition(o.x + dir * 4, fy - 2).setAlpha(0.5 + Math.random() * 0.3);
    if ((o.x - lastX) * dir < 11) return;
    lastX = o.x;
    const k = n++ % 3, sx = o.x + Phaser.Math.Between(-1, 1);
    // Fissure au sol qui s'éteint.
    const cr = sc.add.image(sx, fy + 1, 'mord_crack').setDepth(6).setFlipX(dir < 0);
    sc.tweens.add({ targets: cr, alpha: 0, delay: 250, duration: 400, onComplete: () => cr.destroy() });
    const sp = sc.add.image(sx, fy + 1, keys[k]).setOrigin(0.5, 1).setDepth(11).setFlipX(dir < 0).setScale(1.25, 0);
    sc.tweens.chain({
      targets: sp,
      tweens: [
        { scaleY: 1.15, scaleX: 0.9, duration: 55, ease: 'Quad.out' },
        { scaleY: 1, scaleX: 1, duration: 70, ease: 'Back.out' },
        { scaleY: 0, scaleX: 1.2, delay: 110, duration: 130, ease: 'Quad.in' },
      ],
      onComplete: () => { sp.destroy(); },
    });
    sc.time.delayedCall(250, () => sc.debris(sx, fy - 3, 1));
    if (k === 0) { sc.puffs(sx, fy, 1); sfx.crack(); }
  });
}
/** Épée fantôme qui rase le sol : étincelles de frottement + traînée. */
function ghostBlade(b: Boss) {
  const sc = b.scene, dir = b.dir;
  const o = b.hazard('mord_ghost', b.x + dir * 56, b.floorY - 1, dir * M.blades.speed * b.speed, 30, 8, 3.5).setBlendMode(ADD);
  let t = 0;
  o.setData('tick', (dt: number) => {
    t -= dt;
    if (t > 0) return;
    t = 0.04;
    sc.sparks(o.x - dir * 22, b.floorY - 2, 0xffb040, 2);
    const g = sc.add.image(o.x, o.y, 'mord_ghost').setOrigin(0.5, 1).setFlipX(dir < 0).setBlendMode(ADD).setAlpha(0.35).setDepth(14);
    sc.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
  });
}

// ---------------------------------------------------------------- patterns

function* slash(b: Boss, tele = M.slash.tele, recover = M.slash.recover, last = true) {
  const p = b.parts, s = M.slash, sc = b.scene;
  b.face();
  b.eyes('tele'); sfx.warn();
  const tt = b.tele(tele);
  let tx = b.clampX(b.player.x + b.dir * s.overshoot);
  if ((tx - b.x) * b.dir < s.minDist) tx = b.clampX(b.x + b.dir * s.minDist);
  tx = b.clampX(Phaser.Math.Clamp(tx, b.x - s.maxDist, b.x + s.maxDist));
  // Anticipation : il se ramasse, recule d'un pas, épée armée loin derrière ; trajet en rouge au sol.
  b.tw(p.rig, { angle: -9, scaleX: 1.06, scaleY: 0.92 }, tt * 0.7);
  b.tw(p.sword, { angle: -85 }, tt * 0.7, 'Back.out');
  b.tw(b.root, { x: b.clampX(b.x - b.dir * 8) }, tt * 0.7);
  const line = b.temp(sc.add.rectangle(Math.min(b.x, tx), b.floorY - 3, Math.abs(tx - b.x), 3, COL.danger, 0.7).setOrigin(0, 0).setDepth(6));
  b.tw(line, { alpha: 0.15, repeat: -1, yoyo: true }, 0.12, 'Linear');
  yield tt * 0.55;
  glint(b, -85);
  yield tt * 0.45;
  // Ruée + taille : traînée pleine, images rémanentes.
  line.destroy();
  const d = b.t(s.dash);
  b.tw(b.root, { x: tx }, d, 'Expo.out');
  b.tw(p.rig, { angle: 12, scaleX: 1.1, scaleY: 0.96 }, d * 0.5);
  b.tw(p.sword, { angle: 125 }, d * 0.45, 'Quad.in');
  smearFx(b);
  ghostTrail(b);
  sc.time.delayedCall(d * 400, () => b.state === 'pattern' && ghostTrail(b));
  sc.puffs(b.x, b.floorY, 3);
  b.hitbox = () => new Phaser.Geom.Rectangle(b.dir > 0 ? b.x - 10 : b.x - s.reach, b.floorY - s.height, s.reach + 10, s.height);
  sfx.whoosh();
  yield d;
  b.hitbox = null;
  // La lame mord le sol.
  impact(b, b.x + b.dir * 62, b.floorY, 1);
  b.tw(p.sword, { angle: 132 }, 0.12, 'Back.out');
  sfx.thud();
  if (!last) { b.tw(p.rig, { angle: 4, scaleX: 1, scaleY: 1 }, 0.12); yield b.t(recover); return; }
  // Récupération : penché, essoufflé, yeux éteints.
  b.eyes('off');
  b.tw(p.rig, { angle: 7, scaleX: 1, scaleY: 0.95 }, 0.2);
  yield b.t(recover);
  b.eyes('on'); b.def.rest(b, 0.3);
}

function* slam(b: Boss, double = false) {
  const p = b.parts, s = M.slam, sc = b.scene;
  b.eyes('tele'); sfx.warn(); sfx.rumble();
  const tt = b.tele(s.tele);
  // Anticipation : accroupi très bas, gravillons qui tremblent.
  b.tw(p.rig, { scaleX: 1.12, scaleY: 0.82, angle: 5 }, tt * 0.8, 'Quad.in');
  b.tw(p.head, { y: REST.headY + 6 }, tt * 0.8);
  b.tw(p.sword, { angle: -20 }, tt * 0.8, 'Back.out');
  for (let i = 0; i < 3; i++) sc.time.delayedCall(i * tt * 250, () => b.state === 'pattern' && sc.debris(b.x, b.floorY - 2, 2));
  yield tt;
  // Bond hors de l'écran.
  sfx.leap();
  b.tw(p.rig, { scaleX: 0.85, scaleY: 1.2, angle: 0 }, 0.12, 'Back.out');
  b.tw(p.head, { y: REST.headY }, 0.1);
  sc.puffs(b.x - 16, b.floorY, 4); sc.puffs(b.x + 16, b.floorY, 4); sc.debris(b.x, b.floorY, 6);
  ring(b, b.x, b.floorY - 3, 1.4);
  b.tw(b.root, { y: -80 }, b.t(s.rise), 'Quad.out');
  yield b.t(s.rise);
  // Repère au sol sous le joueur.
  const tx = b.clampX(b.player.x);
  b.root.x = tx; b.face();
  const mark = b.temp(sc.add.image(tx, b.floorY + 1, 'mord_mark').setDepth(6).setScale(1.3, 1.2));
  const halo = b.temp(sc.add.image(tx, b.floorY - 4, 'glowR').setDepth(6).setBlendMode(ADD).setScale(2, 0.8));
  const col = b.temp(sc.add.rectangle(tx, 0, 36, b.floorY, COL.danger, 0.18).setOrigin(0.5, 0).setDepth(6));
  b.tw([mark, halo], { alpha: 0.55, repeat: -1, yoyo: true }, 0.12, 'Linear');
  b.tw(col, { alpha: 0.06, repeat: -1, yoyo: true }, 0.12, 'Linear');
  sfx.warn();
  yield b.tele(s.mark);
  // Chute (étiré) puis impact (écrasé).
  b.tw(p.rig, { scaleX: 0.9, scaleY: 1.15 }, b.t(s.fall));
  b.tw(b.root, { y: b.floorY }, b.t(s.fall), 'Quad.in');
  yield b.t(s.fall);
  mark.destroy(); halo.destroy(); col.destroy();
  b.tw(p.rig, { scaleX: 1.25, scaleY: 0.75 }, 0.06);
  b.tw(p.sword, { angle: 150 }, 0.08);
  b.hitbox = () => new Phaser.Geom.Rectangle(tx - 34, b.floorY - 90, 68, 90);
  const boom = () => {
    sfx.slam();
    impact(b, tx, b.floorY, 2);
    ring(b, tx, b.floorY - 4, 2.4);
    for (const k of [-1, 1]) spikeWave(b, tx + k * 26, k);
  };
  boom();
  yield 0.1;
  b.hitbox = null;
  b.tw(p.rig, { scaleX: 1, scaleY: 0.94, angle: 6 }, 0.25);
  if (double) {
    const gap = Math.max(0.7, b.t(s.doubleGap));
    b.tw(p.sword, { angle: 40 }, gap * 0.6, 'Back.out');
    yield gap - 0.08;
    b.tw(p.sword, { angle: 150 }, 0.08, 'Quad.in');
    yield 0.08;
    boom();
  }
  b.eyes('off');
  yield b.t(s.recover);
  b.eyes('on'); b.def.rest(b, 0.3);
}

function* blades(b: Boss) {
  const p = b.parts, s = M.blades, sc = b.scene;
  b.eyes('tele'); sfx.warn();
  const tt = b.tele(s.tele);
  b.tw(p.sword, { angle: -10 }, tt * 0.6, 'Back.out');
  b.tw(p.rig, { angle: -7, scaleY: 0.97 }, tt * 0.6);
  yield tt * 0.5;
  glint(b, -10);
  yield tt * 0.5;
  for (let i = 0; i < s.count; i++) {
    // Coup de taille vers le sol : l'épée fantôme part en raclant.
    b.tw(p.sword, { angle: 108 }, 0.09, 'Quad.in');
    b.tw(p.rig, { angle: 10, scaleY: 1 }, 0.09);
    smearFx(b);
    yield 0.09;
    const gx = b.x + b.dir * 62;
    sc.sparks(gx, b.floorY - 2, 0xffb040, 8); sc.puffs(gx, b.floorY, 2); sc.cameras.main.shake(80, 0.005);
    sfx.blade(); sfx.scrape();
    ghostBlade(b);
    if (i < s.count - 1) {
      const gap = Math.max(0.7, b.t(s.gap));
      b.tw(p.sword, { angle: -10 }, gap * 0.5, 'Back.out');
      b.tw(p.rig, { angle: -7 }, gap * 0.5);
      yield gap - 0.09;
    }
  }
  b.eyes('off');
  b.tw(p.rig, { angle: 6, scaleY: 0.95 }, 0.2);
  yield b.t(s.recover);
  b.eyes('on'); b.def.rest(b, 0.3);
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
    const glow = sc.add.image(4, -12, 'glowW').setBlendMode(ADD).setScale(0.6);
    const head = sc.add.container(2, REST.headY, [headImg, glow, eyes]);
    // rig : inclinaison / écrasement autour des pieds ; root : position + orientation.
    const rig = sc.add.container(0, 0, [body, head, sword]);
    b.root.add(rig);
    b.parts = { rig, body, sword, head, headImg, eyes, glow };
    b.flashParts = [body, headImg, sword];
    this.rest(b, 0);
    sc.tweens.add({ targets: headImg, y: 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  },
  rest(b, sec) {
    const p = b.parts;
    const pose: [object, object][] = [[p.sword, { angle: REST.sword }], [p.head, { y: REST.headY, x: 2, angle: 0 }], [p.rig, { angle: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }], [p.body, { scaleY: 1 }]];
    for (const [t, props] of pose) {
      if (sec <= 0) Object.assign(t, props);
      // Tweens non enregistrés : ils doivent survivre à la fin du pattern.
      else b.scene.tweens.add({ targets: t, ...props, duration: sec * 1000, ease: 'Quad.out' });
    }
  },
  step(b) {
    const sc = b.scene;
    sc.tweens.add({ targets: b.parts.rig, y: { from: 2, to: 0 }, scaleY: { from: 0.97, to: 1 }, duration: 200, ease: 'Quad.out' });
    sc.puffs(b.x - b.dir * 8, b.floorY, 1);
    sfx.step();
  },
  roar(b) {
    const sc = b.scene, p = b.parts;
    sc.tweens.add({ targets: p.rig, angle: -12, scaleY: 1.06, duration: 200, ease: 'Back.out' });
    sc.tweens.add({ targets: p.head, y: REST.headY - 4, duration: 200 });
    sc.tweens.add({ targets: p.sword, angle: -30, duration: 250, ease: 'Back.out' });
    for (let i = 0; i < 3; i++) sc.time.delayedCall(i * 220, () => ring(b, b.x, b.y - 60, 3 + i));
    sc.puffs(b.x - 20, b.floorY, 5); sc.puffs(b.x + 20, b.floorY, 5); sc.debris(b.x, b.floorY, 8);
    sc.time.delayedCall(800, () => this.rest(b, 0.25));
  },
  death(b) {
    const sc = b.scene, p = b.parts, x = b.x, y = b.y;
    sc.time.addEvent({
      delay: 110, repeat: 7,
      callback: () => { sc.sparks(x + Phaser.Math.Between(-20, 20), y - Phaser.Math.Between(10, 80), 0xd8d0ff, 8); sc.debris(x, y - 40, 3); sfx.clank(); },
    });
    // L'armure se disloque : heaume qui saute, épée qui tombe à plat, corps qui s'affaisse.
    sc.tweens.chain({ targets: p.head, tweens: [
      { y: REST.headY - 26, angle: -40, duration: 350, ease: 'Quad.out' },
      { y: -8, x: -34, angle: -100, duration: 450, ease: 'Bounce.out' },
    ] });
    sc.tweens.chain({ targets: p.sword, tweens: [{ angle: 60, duration: 300, ease: 'Quad.in' }, { angle: 92, y: -4, duration: 400, ease: 'Bounce.out' }] });
    sc.tweens.add({ targets: p.body, scaleY: 0.62, duration: 900, delay: 200, ease: 'Bounce.out' });
    sc.time.delayedCall(1700, () => {
      sc.puffs(x, y, 10); sc.debris(x, y - 20, 12); sc.flashScreen(0.2);
      sc.tweens.add({ targets: b.root, alpha: 0, duration: 600 });
    });
  },
  portrait(sc) {
    const head = sc.add.container(2, REST.headY, [
      sc.add.image(0, 0, 'mord_head').setOrigin(0.5, 1),
      sc.add.image(4, -12, 'glowR').setBlendMode(ADD).setScale(0.5),
      sc.add.image(4, -12, 'mord_eyes').setTint(COL.danger),
    ]);
    return sc.add.container(0, 0, [sc.add.image(0, 0, 'mord_body').setOrigin(0.5, 1), head, sc.add.image(18, -44, 'mord_sword').setOrigin(0.5, 70 / 84).setAngle(-25)]);
  },
  patterns: [
    { name: 'slash', weight: 3, phase: 0, run: (b) => slash(b) },
    { name: 'slam', weight: 2, phase: 0, run: (b) => slam(b), far: true },
    { name: 'blades', weight: 2, phase: 0, run: blades, far: true },
    { name: 'combo', weight: 3, phase: 2, run: combo },
    { name: 'slam2', weight: 2, phase: 2, run: (b) => slam(b, true), far: true },
  ],
};
