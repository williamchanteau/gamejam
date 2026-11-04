import Phaser from 'phaser';
import type { Boss, BossDef } from '../entities/Boss';
import type { BossScene } from '../scenes/BossScene';
import type { Target } from '../entities/types';
import { COL, PLAYER } from '../config';
import { maxHp } from '../floors';
import { sfx } from '../audio/sfx';
import { txt } from '../art/font';
import { ARM_LEN, ARM_PIVOT } from '../art/mcking';
import { shout } from '../ui/Shout';

export const MK = {
  hp: 280,
  restMax: 6, // restes au sol au maximum
  lob: { tele: 0.6, gap: 0.32, time: 0.85, apex: 120, recover: 0.75 },
  bump: { tele: 0.6, reach: 62, recover: 0.65 },
  flop: { tele: 0.7, air: 0.75, height: 135, wave: 170, recover: 1.15 },
  charge: { tele: 0.85, speed: 345, recover: 1.5 },
  burp: { tele: 0.8, speed: 215, recover: 0.8 },
  inhale: { tele: 1.3, time: 2.2, pull: 105, range: 340, heal: 5, every: 4, recover: 0.9 },
  rain: { tele: 0.7, lanes: 7, gap: 72, fall: 0.85, recover: 0.8 },
  crown: { tele: 0.6, time: 1.75, recover: 0.5 },
  split: { tele: 0.8, recover: 1 },
  eat: { below: [0.74, 0.38], hop: 120, bites: 3, bite: 0.85, heal: 10, need: 3, cd: 20, max: 3, stun: 1.7, gift: 1 },
  festin: { at: 0.2, bites: 5, bite: 0.8, heal: 9, need: 8, stun: 3, gift: 2 },
};

type Img = Phaser.GameObjects.Image;
type Cont = Phaser.GameObjects.Container;
const Rect = Phaser.Geom.Rectangle;
const HEAD_Y = -82, CROWN_Y = -37, BELLY_Y = -34, SHOULDER_Y = -75, ARM = { f: -7, b: 7 }, EAT_ARM = 122; // bras en travers du torse : la main arrive à la bouche
const A = (b: Boss) => b.parts as unknown as { rig: Cont; head: Cont; headImg: Img; belly: Img; torso: Img; armF: Cont; armB: Cont; upF: Img; upB: Img; foreF: Cont; foreB: Cont; held: Img; crown: Img; legL: Img; legR: Img };
const fields = new WeakMap<Boss, Feast>();
const F = (b: Boss) => fields.get(b)!;

type Rest = Target & { o: Img; dead: boolean };

/** Tout ce qui vit autour du festin : restes à terre, burger volé, repas, gros ventre. */
class Feast {
  rests: Rest[] = [];
  meals = 0;
  eatCd = 9;
  festinDue = true;
  lying = false;
  hinted = false;
  side = 1;
  eating: { hits: number; need: number; big: boolean; draw(): void } | null = null;
  private stolen: { o: Img; g: Img; t: number; gift: number } | null = null;
  chewT: Phaser.Time.TimerEvent | null = null;
  constructor(private b: Boss) { b.minHp = 1; } // un seul coup ne saute pas le festin

  get k() { return 1 + this.meals * 0.07; }

  heal(n: number) {
    const b = this.b, v = Math.min(n, (b.phase === 2 ? b.maxHp / 2 : b.maxHp) - b.hp);
    if (v <= 0) return;
    b.hp += v;
    (b.scene as BossScene).bar?.flash();
    const t = txt(b.scene, b.x, b.y - 150, `+${v}`, 0xffd36a).setOrigin(0.5, 0).setScale(2).setDepth(96);
    b.scene.tweens.add({ targets: t, y: t.y - 22, alpha: 0, duration: 800, ease: 'Quad.out', onComplete: () => t.destroy() });
    b.scene.sparks(b.x, b.y - 60, 0xffd36a, 8);
  }

  /** Reste au sol : une cible (+1 mana au coup de dague). S'il aspire, il le mange et se soigne. */
  addRest(x: number) {
    if (this.rests.length >= MK.restMax || !this.b.alive()) return;
    const sc = this.b.scene, o = sc.add.image(x, this.b.floorY + 1, 'burger_b1').setOrigin(0.5, 1).setDepth(6.5).setFlipX(Math.random() < 0.5);
    const r: Rest = {
      o, dead: false,
      alive: () => !r.dead,
      hurtRect: () => new Rect(o.x - 13, o.y - 20, 26, 20),
      hit: (dmg) => {
        sc.sparks(o.x, o.y - 8, 0xe8a548, 8); sfx.splat();
        this.kill(r);
        return dmg >= PLAYER.spell.damage ? false : undefined; // le sort le traverse sans geler le jeu
      },
    };
    this.rests.push(r);
    sc.targets.push(r);
  }

  kill(r: Rest) {
    r.dead = true; r.o.destroy();
    this.rests = this.rests.filter((q) => q !== r);
    this.b.scene.targets = this.b.scene.targets.filter((q) => q !== r);
  }

  /** Repas interrompu : le burger tombe, doré, et peut être volé. */
  drop(gift: number) {
    const b = this.b, sc = b.scene, d = Math.sign(b.player.x - b.x) || 1, x = b.clampX(b.x + d * 58), y = b.floorY + 1;
    const o = sc.add.image(b.x, b.y - 100, 'burger').setOrigin(0.5, 1).setDepth(16).setScale(gift > 1 ? 2 : 1);
    const g = sc.add.image(x, y - 12, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setDepth(15.5).setScale(1.1).setAlpha(0.7);
    sc.tweens.add({ targets: o, x, duration: 520 });
    sc.tweens.add({ targets: o, angle: 360, duration: 520 });
    sc.tweens.chain({ targets: o, tweens: [{ y: b.y - 130, duration: 200, ease: 'Quad.out' }, { y, duration: 320, ease: 'Bounce.out' }] });
    sc.tweens.add({ targets: g, alpha: 0.35, scale: 0.9, duration: 300, yoyo: true, repeat: -1 });
    this.stolen?.o.destroy(); this.stolen?.g.destroy();
    this.stolen = { o, g, t: 7, gift };
  }

  private steal(gift: number) {
    const b = this.b, sc = b.scene, p = b.player;
    const was = p.hp;
    p.hp = Math.min(maxHp(), p.hp + gift);
    if (p.hp === was) p.gainMana(PLAYER.manaMax);
    sfx.chomp(); sc.time.delayedCall(120, () => sfx.chomp()); sc.time.delayedCall(260, () => sfx.gulp()); sc.time.delayedCall(360, () => sfx.manaFull());
    sc.sparks(p.x, p.y - 10, 0xffd36a, 16); sc.sparks(p.x, p.y - 10, COL.moon, 8);
    const t = txt(sc, p.x, p.y - 40, p.hp === was ? 'MANA PLEINE !' : `+${p.hp - was} VIE`, 0xd8fbff).setOrigin(0.5, 0).setDepth(96);
    sc.tweens.add({ targets: t, y: t.y - 18, alpha: 0, delay: 500, duration: 500, onComplete: () => t.destroy() });
    if (b.alive()) {
      shout(sc, ['MON BURGER !!!'], b.x, b.y - 158, { scale: 2, ms: 1100 });
      sc.cameras.main.shake(220, 0.007);
      sfx.roar();
    }
  }

  update(dt: number) {
    const b = this.b, p = b.player;
    if (this.stolen) {
      const s = this.stolen;
      s.t -= dt;
      s.o.setAlpha(s.t < 2 && Math.floor(s.t * 8) % 2 ? 0.4 : 1);
      const near = Phaser.Geom.Rectangle.Overlaps(p.rect(), new Rect(s.g.x - 14, b.floorY - 24, 28, 26));
      if (near && p.hp > 0 && s.o.y >= b.floorY - 4) this.steal(s.gift);
      if (near || s.t <= 0) { s.o.destroy(); s.g.destroy(); this.stolen = null; }
    }
    if (!b.alive()) return;
    this.eatCd -= dt;
    if (this.festinDue && b.phase === 2 && b.hp <= b.maxHp * MK.festin.at) { this.festinDue = false; b.minHp = 0; this.eating = null; b.force((x) => eat(x, true)); return; }
    if (b.state !== 'idle') return;
    if (this.eatCd <= 0 && this.meals < MK.eat.max && b.hp < b.maxHp * MK.eat.below[b.phase - 1]) { this.eatCd = MK.eat.cd; b.force((x) => eat(x)); return; }
    if (this.rests.length >= MK.inhale.every) b.force(inhale);
  }

  clear() {
    for (const r of [...this.rests]) this.kill(r);
    if (this.stolen) { this.stolen.o.destroy(); this.stolen.g.destroy(); this.stolen = null; }
  }
}

function setHead(b: Boss, m: '' | 'open' | 'chew' = '') {
  const mad = b.phase === 2;
  A(b).headImg.setTexture(m === 'chew' ? 'mck_head_chew' : `mck_head${mad ? '_mad' : ''}${m === 'open' ? '_open' : ''}`);
}
/**
 * Coude : les patterns ne pilotent que l'angle épaule→poing (armF/armB) ; le pli s'en déduit, le poing reste sur l'axe.
 * Table [angle du bras (négatif = levé côté extérieur), pli (positif = coude rejeté dehors quand le bras est levé)].
 */
const BEND = [[-180, 40], [-140, 30], [-100, 6], [-60, -6], [-7, -12], [42, -25], [70, -32], [122, -45], [180, -45]];
function limb(angle: number, side: 1 | -1) {
  const a = angle * side;
  let i = 0;
  while (i < BEND.length - 2 && a > BEND[i + 1][0]) i++;
  const [a0, d0] = BEND[i], [a1, d1] = BEND[i + 1];
  const up = (d0 + ((a - a0) / (a1 - a0)) * (d1 - d0)) * side, r = Phaser.Math.DegToRad(up);
  const fore = -Phaser.Math.RadToDeg(Math.asin((ARM_LEN.up * Math.sin(r)) / ARM_LEN.fore));
  return { up, fore, ex: -ARM_LEN.up * Math.sin(r), ey: ARM_LEN.up * Math.cos(r) };
}
function syncArms(b: Boss) {
  const a = A(b);
  for (const [arm, up, fore, side] of [[a.armF, a.upF, a.foreF, 1], [a.armB, a.upB, a.foreB, -1]] as [Cont, Img, Cont, 1 | -1][]) {
    const l = limb(arm.angle, side);
    up.angle = l.up; fore.setPosition(l.ex, l.ey).setAngle(l.fore);
  }
}

function arms(b: Boss, f: number, back: number, sec: number, ease = 'Back.out') {
  b.tw(A(b).armF, { angle: f }, sec, ease); b.tw(A(b).armB, { angle: back }, sec, ease);
}
function jiggle(b: Boss, amp = 0.09, ms = 280) {
  const k = F(b).k;
  b.scene.tweens.add({ targets: A(b).belly, scaleX: { from: k * (1 + amp), to: k }, scaleY: { from: k * (1 - amp), to: k }, duration: ms, ease: 'Bounce.out' });
}
/** Trace rouge au sol : là où ça tombe. */
function mark(b: Boss, x: number, ms: number) {
  const m = b.scene.add.image(x, b.floorY + 1, 'mck_mark').setTint(COL.danger).setDepth(6.4).setAlpha(0.3);
  b.scene.tweens.add({ targets: m, alpha: 0.95, scaleX: { from: 0.55, to: 1.1 }, duration: ms, onComplete: () => m.destroy() });
}
/** Saut parabolique (root) : x linéaire, y en cloche. */
function* hop(b: Boss, x: number, h: number, sec: number) {
  sfx.leap();
  b.tw(b.root, { x }, sec, 'Linear');
  b.tw(b.root, { y: b.floorY - h }, sec / 2, 'Quad.out');
  yield sec / 2;
  b.tw(b.root, { y: b.floorY }, sec / 2, 'Quad.in');
  yield sec / 2;
  sfx.thud(); b.scene.puffs(b.x, b.floorY, 4); b.scene.cameras.main.shake(130, 0.007);
  jiggle(b, 0.14);
}
/** Projectile en cloche, marqué au sol ; `land` à l'arrivée. */
function arc(b: Boss, key: string, x0: number, y0: number, tx: number, T: number, apex: number, land: (x: number) => void, scale = 1) {
  const y1 = b.floorY - 8 * scale;
  const o = b.hazard(key, x0, y0, 0, 16, 14, T + 1).setOrigin(0.5).setScale(scale).setData('once', true);
  mark(b, tx, T * 1000);
  let t = 0;
  o.setData('tick', (dt: number) => {
    t += dt;
    const k = Math.min(1, t / T);
    o.x = x0 + (tx - x0) * k;
    o.y = y0 + (y1 - y0) * k - apex * 4 * k * (1 - k);
    o.angle += dt * 520;
    if (k >= 1) { o.setData('life', 0); land(tx); }
  });
  return o;
}
/** Le burger s'écrase : flaque de ketchup brève, il en reste une moitié par terre. */
function splat(b: Boss, x: number, rest = true) {
  const sc = b.scene, o = b.hazard('mck_splat', x, b.floorY + 2, 0, 34, 9, 0.3);
  sc.tweens.add({ targets: o, alpha: 0, delay: 150, duration: 150 });
  sc.sparks(x, b.floorY - 3, COL.danger, 7); sc.sparks(x, b.floorY - 3, 0xe8a548, 4);
  sfx.splat();
  if (rest) F(b).addRest(x);
}
function waves(b: Boss, x: number, speed: number) {
  for (const d of [-1, 1]) {
    const w = b.hazard('mck_wave', x + d * 22, b.floorY + 1, d * speed, 20, 17, 2.6);
    let t = Math.random() * 6;
    w.setData('tick', (dt: number) => { t += dt * 16; w.scaleY = 1 + Math.sin(t) * 0.12; });
  }
}
/** Récupération : yeux éteints, il reste ouvert. */
function* recover(b: Boss, sec: number) {
  b.eyes('off'); b.hitbox = null;
  yield b.t(sec);
  b.eyes('on'); MCKING.rest(b, 0.25);
}

// ---------- Attaques.

/** Lancer de burgers en cloche : ils laissent des restes à terre. */
function* lob(b: Boss) {
  const C = MK.lob, a = A(b), n = b.phase === 2 ? 5 : 3, p = b.player;
  b.eyes('tele'); sfx.warn();
  a.held.setVisible(true);
  arms(b, 42, -30, 0.28);
  b.tw(a.rig, { angle: -7 }, 0.28);
  yield b.tele(C.tele);
  for (let i = 0; i < n; i++) {
    a.held.setVisible(true);
    b.tw(a.armF, { angle: -140 }, 0.09, 'Quad.in');
    b.tw(a.rig, { angle: 7 }, 0.09, 'Quad.in');
    yield b.t(0.08);
    b.face(); sfx.whoosh();
    a.held.setVisible(false);
    const lead = Phaser.Math.Clamp(p.body.velocity.x * 0.45, -90, 90), tx = b.clampX(p.x + lead + (i ? Phaser.Math.Between(-55, 55) : 0));
    arc(b, 'burger', b.x + b.dir * 30, b.y - 118, tx, C.time, C.apex, (x) => splat(b, x));
    yield b.t(0.1);
    if (i < n - 1) { b.tw(a.armF, { angle: 42 }, 0.12); b.tw(a.rig, { angle: -5 }, 0.12); yield b.t(C.gap - 0.08); }
  }
  yield* recover(b, C.recover);
}

/** Coup de bide : il gonfle, s'élance et te renvoie d'un coup de ventre. */
function* bump(b: Boss) {
  const C = MK.bump, a = A(b), sc = b.scene, k = F(b).k, dir = b.dir;
  const lunge = Phaser.Math.Clamp(Math.abs(b.player.x - b.x) - 40, 26, 120), end = b.clampX(b.x + dir * lunge);
  b.eyes('tele'); sfx.warn();
  b.tw(a.rig, { angle: -9 }, 0.3, 'Back.out');
  b.tw(a.belly, { scaleX: k * 1.1, scaleY: k * 1.12 }, 0.3);
  arms(b, 34, -34, 0.3);
  const reach = C.reach + F(b).meals * 6, zx = dir > 0 ? end : end - reach - 34;
  const zone = b.temp(sc.add.rectangle(zx, b.floorY - 84, reach + 34, 84, COL.danger, 0.17).setOrigin(0).setDepth(80));
  yield b.tele(C.tele);
  zone.destroy(); sfx.whoosh();
  b.tw(b.root, { x: end }, 0.13, 'Quad.in');
  b.tw(a.rig, { angle: 12 }, 0.13, 'Quad.in');
  b.tw(a.belly, { scaleX: k * 1.32, scaleY: k * 1.2 }, 0.13, 'Back.out');
  yield 0.1;
  b.hitbox = () => new Rect(dir > 0 ? b.x : b.x - reach, b.y - 84, reach, 84);
  sc.cameras.main.shake(140, 0.009); sfx.thud();
  yield b.t(0.16);
  b.hitbox = null;
  yield* recover(b, C.recover);
}

/** Plat ventre : il s'envole, retombe à l'horizontale et chasse une vague de ketchup de chaque côté. */
function* flop(b: Boss) {
  const C = MK.flop, a = A(b), f = F(b), sc = b.scene, tx = b.clampX(b.player.x), dir = b.dir;
  b.eyes('tele'); sfx.warn();
  b.tw(a.rig, { scaleY: 0.78, scaleX: 1.14 }, 0.3, 'Back.out');
  arms(b, -70, 70, 0.3);
  mark(b, tx, (b.tele(C.tele) + b.t(C.air)) * 1000);
  yield b.tele(C.tele);
  sfx.leap();
  b.tw(a.rig, { scaleY: 1.08, scaleX: 0.94 }, 0.1);
  b.tw(b.root, { x: tx }, b.t(C.air), 'Linear');
  b.tw(b.root, { y: b.floorY - C.height }, b.t(C.air * 0.55), 'Quad.out');
  yield b.t(C.air * 0.5);
  arms(b, -160, 160, 0.14);
  const lx = -58 * dir * b.root.scaleX;
  b.tw(a.rig, { angle: 84, scaleX: 1, scaleY: 1, x: lx, y: -24 }, b.t(C.air * 0.28), 'Quad.in');
  b.tw(b.root, { y: b.floorY }, b.t(C.air * 0.45), 'Quad.in');
  yield b.t(C.air * 0.05);
  b.hitbox = () => new Rect(b.x - 62, b.y - 56, 124, 56);
  yield b.t(C.air * 0.4);
  f.lying = true;
  sfx.slam(); sc.flashScreen(0.18); sc.cameras.main.shake(320, 0.016);
  sc.debris(b.x, b.floorY, 14); sc.puffs(b.x - 40, b.floorY, 4); sc.puffs(b.x + 40, b.floorY, 4);
  jiggle(b, 0.2, 420);
  waves(b, b.x, C.wave * b.speed);
  yield 0.12;
  b.hitbox = null;
  b.eyes('off');
  yield b.t(C.recover);
  f.lying = false;
  b.eyes('on'); MCKING.rest(b, 0.3);
}

/** Étourdi : couronne d'étoiles en orbite aplatie au-dessus de la tête, yeux en spirale qui tournent. */
function dizzy(b: Boss, sec: number) {
  const head = A(b).head, sc = b.scene, n = 4, turns = Math.max(2, Math.round(sec / 0.6)), o = { t: 0 };
  const stars = Array.from({ length: n }, () => b.temp(sc.add.image(0, 0, 'mck_star')));
  const eyes = [-7.5, 10.5].map((x) => b.temp(sc.add.image(x, -25, 'mck_spiral')));
  head.add([...stars, ...eyes]);
  const place = () => {
    stars.forEach((s, i) => {
      const q = (o.t * turns + i / n) * Math.PI * 2, front = Math.sin(q) >= 0;
      s.setTexture(front ? 'mck_star' : 'mck_star_s').setPosition(Math.round(Math.cos(q) * 36), Math.round(CROWN_Y - 32 + Math.sin(q) * 9));
      if (front) head.bringToTop(s); else head.sendToBack(s);
    });
    for (const e of eyes) e.setAngle(Math.floor((o.t * sec) / 0.09) * 90);
  };
  place();
  b.tw(o, { t: 1, onUpdate: place }, sec, 'Linear');
}

/** Charge à bedaine : il trépigne, puis fonce jusqu'au mur… et s'y assomme. */
function* charge(b: Boss) {
  const C = MK.charge, a = A(b), sc = b.scene, k = F(b).k, dir = b.dir, x0 = b.x;
  const end = dir > 0 ? sc.worldW - 62 : 62, dist = Math.abs(end - x0), tele = b.tele(C.tele);
  b.eyes('tele'); sfx.warn();
  const band = b.temp(sc.add.rectangle(Math.min(x0, end) - 34, b.floorY - 100, dist + 68, 100, COL.danger, 0.14).setOrigin(0).setDepth(80));
  b.tw(a.rig, { angle: -11 }, 0.28, 'Back.out');
  b.tw(a.belly, { scaleX: k * 1.1, scaleY: k * 1.1 }, 0.28);
  arms(b, 40, -40, 0.28);
  for (let i = 0; i < 3; i++) { sc.puffs(x0 - dir * 18, b.floorY, 2); sfx.step(); yield tele / 3; }
  band.destroy(); sfx.whoosh();
  const T = b.t(Math.max(0.25, dist / C.speed)), n = Math.max(2, Math.round(T / 0.13));
  b.tw(a.rig, { angle: 15 }, 0.12);
  b.tw(b.root, { x: end }, T, 'Quad.in');
  b.hitbox = () => new Rect(b.x - 36, b.y - 100, 72, 100);
  for (let i = 0; i < n; i++) { sfx.step(); sc.puffs(b.x - dir * 12, b.floorY, 1); yield T / n; }
  b.hitbox = null;
  sfx.slam(); sc.flashScreen(0.16); sc.cameras.main.shake(380, 0.016);
  sc.debris(b.x + dir * 34, b.floorY - 60, 16);
  b.tw(a.rig, { angle: -14, x: -dir * b.root.scaleX * 12 }, 0.2, 'Back.out');
  // La couronne saute, des étoiles tournent autour de sa tête.
  sc.tweens.chain({ targets: a.crown, tweens: [{ y: CROWN_Y - 26, angle: 30, duration: 200, ease: 'Quad.out' }, { y: CROWN_Y, angle: -5, duration: 260, ease: 'Bounce.out' }] });
  setHead(b, 'open');
  dizzy(b, b.t(C.recover));
  yield* recover(b, C.recover);
}

/** Rot : le ventre se gonfle, puis un mur de gaz file au ras du sol (en phase 2, un second en hauteur). */
function* burp(b: Boss) {
  const C = MK.burp, a = A(b), sc = b.scene, k = F(b).k, dir = b.dir;
  b.eyes('tele'); sfx.warn();
  b.tw(a.belly, { scaleX: k * 1.2, scaleY: k * 1.2 }, 0.5);
  b.tw(a.head, { angle: -14, y: HEAD_Y - 3 }, 0.5);
  yield b.tele(C.tele);
  setHead(b, 'open'); sfx.burp();
  b.tw(a.head, { angle: 12, y: HEAD_Y + 2 }, 0.1, 'Back.out');
  b.tw(a.belly, { scaleX: k, scaleY: k }, 0.18, 'Bounce.out');
  sc.cameras.main.shake(240, 0.008);
  shout(sc, ['BUUURP !'], b.x + dir * 62, b.y - 138, { scale: 1, ms: 650 });
  const gas = (y: number) => {
    const o = b.hazard('mck_gas', b.x + dir * 34, y, dir * C.speed, 13, 34, 2.8).setFlipX(dir < 0);
    let t = 0;
    o.setData('tick', (dt: number) => { t += dt; o.setScale(1 + Math.min(0.5, t * 0.5)); o.setAlpha(0.8 + 0.2 * Math.sin(t * 22)); });
  };
  gas(b.floorY + 1);
  if (b.phase === 2) { yield b.t(0.42); gas(b.floorY - 46); }
  yield b.t(0.2);
  yield* recover(b, C.recover);
}

/** Aspiration : il t'attire et avale les restes (+PV). Devant = happé ; derrière = aucune force, et une belle ouverture. */
function* inhale(b: Boss) {
  const C = MK.inhale, a = A(b), f = F(b), sc = b.scene, p = b.player, dir = b.dir;
  b.eyes('tele'); sfx.warn();
  b.tw(a.head, { angle: -10 }, 0.35); arms(b, -40, 40, 0.35);
  yield b.tele(C.tele);
  setHead(b, 'open'); sfx.rumble();
  b.tw(a.rig, { angle: 13 }, 0.2);
  b.tw(a.head, { angle: 14 }, 0.2);
  b.hitbox = () => new Rect(dir > 0 ? b.x + 8 : b.x - 56, b.y - 110, 48, 110);
  const mouth = b.x + dir * 34, dt = 1 / 60;
  let swallowed = 0;
  for (let t = 0, w = 0; t < C.time; t += dt) {
    // Courant d'air visible, et le joueur tiré seulement côté bouche.
    if ((w = (w + 1) % 3) === 0) {
      const y = b.floorY - Math.random() * 110, s = sc.add.rectangle(mouth + dir * (70 + Math.random() * C.range * 0.7), y, 10, 1, 0xe8ecf6, 0.55).setDepth(14);
      sc.tweens.add({ targets: s, x: mouth, y: b.y - 96, alpha: 0.1, scaleX: 0.3, duration: 340, ease: 'Quad.in', onComplete: () => s.destroy() });
    }
    const dx = p.x - b.x;
    if (Math.sign(dx) === dir && Math.abs(dx) < C.range && p.state !== 'dead') p.zone.x -= dir * C.pull * dt;
    for (const r of [...f.rests]) {
      r.o.x += Math.sign(mouth - r.o.x) * 190 * dt;
      r.o.angle += 400 * dt;
      if (Math.abs(r.o.x - mouth) < 14) {
        f.kill(r); swallowed++;
        sfx.chomp(); f.heal(C.heal); jiggle(b, 0.12);
      }
    }
    yield dt;
  }
  b.hitbox = null;
  setHead(b, swallowed ? 'chew' : '');
  sfx.gulp();
  b.tw(a.rig, { angle: -4 }, 0.15);
  yield* recover(b, C.recover);
}

/** Phase 2 : « COMMANDE ! » une averse de burgers sur toute la salle, une colonne libre. */
function* rain(b: Boss) {
  const C = MK.rain, sc = b.scene, a = A(b);
  b.eyes('tele'); sfx.bell();
  arms(b, -165, 165, 0.25);
  b.tw(a.rig, { scaleY: 1.05 }, 0.25);
  shout(sc, ['COMMANDE !!!'], b.x, b.y - 158, { scale: 2, ms: 800 });
  yield b.tele(C.tele);
  jiggle(b, 0.16); sfx.thud();
  const x0 = Phaser.Math.Clamp(b.player.x - ((C.lanes - 1) / 2) * C.gap, 40, sc.worldW - 40 - (C.lanes - 1) * C.gap), free = Phaser.Math.Between(1, C.lanes - 2);
  for (let i = 0; i < C.lanes; i++) {
    if (i !== free) { const x = x0 + i * C.gap + Phaser.Math.Between(-8, 8); arc(b, 'burger', x, -30, x, C.fall, 0, (q) => splat(b, q)); }
    yield b.t(0.07);
  }
  yield* recover(b, C.recover);
}

/** Phase 2 : il lance sa couronne. Elle part au ras du sol, revient en hauteur ; pendant ce temps il est découvert. */
function* crownThrow(b: Boss) {
  const C = MK.crown, a = A(b), sc = b.scene, dir = b.dir;
  b.eyes('tele'); sfx.warn();
  b.tw(a.armF, { angle: -165 }, 0.25, 'Back.out');
  b.tw(a.crown, { angle: 20, y: CROWN_Y - 5 }, 0.25);
  yield b.tele(C.tele);
  a.crown.setVisible(false); sfx.blade();
  b.tw(a.armF, { angle: -60 }, 0.12, 'Quad.in');
  const x0 = b.x + dir * 24, dist = Phaser.Math.Clamp(Math.abs(b.player.x - b.x) + 80, 150, 370), o = b.hazard('mck_crown', x0, b.floorY - 30, 0, 22, 14, C.time + 0.2).setOrigin(0.5);
  let t = 0;
  o.setData('tick', (dt: number) => {
    t += dt;
    const k = Math.min(1, t / b.t(C.time));
    o.x = x0 + dir * dist * Math.sin(Math.PI * k);
    o.y = b.floorY - 28 - 44 * k * k;
    o.angle += dt * 820;
    if (Math.floor(t * 12) % 2) sc.sparks(o.x, o.y, COL.danger, 1);
    if (k >= 1) o.setData('life', 0);
  });
  b.eyes('off');
  yield b.t(C.time);
  a.crown.setVisible(true); a.crown.setAngle(-5).setY(CROWN_Y); sfx.ting();
  b.eyes('on'); MCKING.rest(b, 0.2);
  yield b.t(C.recover);
}

/** Phase 2 : burger géant qui éclate en vol. Chapeau à hauteur de tête, steak qui tombe, brioche qui roule vers lui. */
function* split(b: Boss) {
  const C = MK.split, a = A(b), sc = b.scene, dir = b.dir, tx = b.clampX(b.player.x);
  b.eyes('tele'); sfx.warn();
  const giant = b.temp(sc.add.image(b.x, b.y - 150, 'burger').setScale(2).setDepth(16));
  arms(b, -170, 170, 0.28);
  yield b.tele(C.tele);
  giant.destroy(); sfx.whoosh();
  arms(b, -80, 20, 0.14, 'Quad.in');
  const y0 = b.floorY - 112, T = b.t(0.55);
  const o = b.hazard('burger', b.x, b.y - 150, 0, 16, 14, T + 0.2).setOrigin(0.5).setScale(2);
  const x0 = b.x; let t = 0;
  mark(b, tx, (T + 0.5) * 1000);
  o.setData('tick', (dt: number) => { t += dt; const k = Math.min(1, t / T); o.x = x0 + (tx - x0) * k; o.y = b.y - 150 + (y0 - b.y + 150) * k; o.angle += dt * 400; if (k >= 1) { o.setData('life', 0); pop(); } });
  const pop = () => {
    sfx.splat(); sfx.clank(); sc.flashScreen(0.12); sc.sparks(tx, y0, 0xe8a548, 18); sc.sparks(tx, y0, COL.danger, 10);
    b.hazard('bun_top', tx, y0 + 50, dir * 240, 34, 14, 2.6).setOrigin(0.5, 1).setScale(2);
    const m = b.hazard('patty', tx, y0, 0, 40, 10, 0.6).setOrigin(0.5).setScale(2);
    let v = 0;
    m.setData('tick', (dt: number) => { v += 1000 * dt; m.y += v * dt; if (m.y >= b.floorY - 8) { m.setData('life', 0); sc.cameras.main.shake(170, 0.01); splat(b, tx, false); waves(b, tx, 150); } });
    const r = b.hazard('bun_bot', tx, y0, 0, 30, 34, 3.4).setOrigin(0.5).setScale(2), vx = -dir * 165;
    let vy = 0, ground = false;
    r.setData('tick', (dt: number) => {
      if (!ground) { vy += 1100 * dt; r.y += vy * dt; if (r.y >= b.floorY - 22) { r.y = b.floorY - 22; ground = true; sfx.thud(); r.setVelocityX(vx); } }
      else r.angle += (vx / 22) * 57 * dt;
    });
  };
  b.eyes('off');
  yield T + 0.5;
  yield* recover(b, C.recover);
}

/** Le repas : il recule d'un bond et mange. Bouchées = PV ; à force de coups il s'étrangle et lâche son burger. */
function* eat(b: Boss, big = false) {
  const C = big ? MK.festin : MK.eat, a = A(b), f = F(b), sc = b.scene;
  b.face();
  if (big) {
    sfx.roar(); sc.cameras.main.shake(260, 0.01);
    shout(sc, ['LE GRAND FESTIN !!!'], b.x, b.y - 158, { scale: 2, ms: 1100 });
  } else yield* hop(b, b.clampX(b.x - b.dir * MK.eat.hop), 34, 0.42);
  b.face();
  a.held.setTexture('burger').setScale(big ? 2 : 1).setVisible(true);
  arms(b, EAT_ARM, big ? -EAT_ARM : ARM.b, 0.25);
  sfx.bell();
  // Jauge du repas (or) + encoches de coups à porter (cyan), bien visibles au-dessus de lui.
  const gx = b.x - 32, gy = b.y - 168, g = b.temp(sc.add.graphics().setDepth(90));
  let eaten = 0;
  const draw = () => {
    if (!g.active) return;
    const st = f.eating;
    g.clear().fillStyle(0x06050c).fillRect(gx - 1, gy - 1, 66, 6);
    g.fillStyle(0xffd36a).fillRect(gx, gy, 64 * (eaten / C.bites), 4);
    const w = Math.floor(64 / C.need);
    for (let i = 0; i < C.need; i++) g.fillStyle(st && i < st.hits ? 0x2a2e44 : COL.moon).fillRect(gx + i * w, gy + 6, w - 1, 3);
  };
  f.eating = { hits: 0, need: C.need, big, draw };
  draw();
  if (!f.hinted) {
    f.hinted = true;
    const h = b.temp(txt(sc, 240, 44, "FRAPPE-LE : IL LÂCHE SON BURGER !", COL.moonLight).setOrigin(0.5, 0).setDepth(96).setScrollFactor(0));
    sc.tweens.add({ targets: h, alpha: 0.45, duration: 280, yoyo: true, repeat: 12 });
  }
  yield 0.3;
  const frames = ['burger_b1', 'burger_b2', 'burger_b3'];
  for (let i = 0; i < C.bites; i++) {
    setHead(b, 'open');
    b.tw(a.armF, { angle: EAT_ARM - 14 }, 0.14);
    yield b.t(C.bite * 0.45);
    setHead(b, 'chew');
    b.tw(a.armF, { angle: EAT_ARM + 6 }, 0.1);
    sfx.chomp(); sc.sparks(b.x + b.dir * 12, b.y - 104, 0xe8a548, 6);
    eaten++; draw();
    a.held.setTexture(frames[Math.min(2, Math.floor((i / C.bites) * 3))]);
    f.heal(C.heal); jiggle(b, 0.1);
    yield b.t(C.bite * 0.55);
  }
  // Fini : ventre plus gros, et un rot en prime.
  f.eating = null; f.meals++;
  sfx.gulp();
  a.held.setVisible(false).setTexture('burger').setScale(1);
  g.destroy();
  MCKING.rest(b, 0.2);
  yield 0.25;
  yield* burp(b);
}

/** Interrompu : le burger vole, il s'étouffe, mains à la gorge, grand ouvert. */
function* choke(b: Boss, big: boolean) {
  const C = big ? MK.festin : MK.eat, a = A(b), f = F(b), sc = b.scene;
  f.drop(C.gift);
  sfx.slam(); sc.cameras.main.shake(180, 0.009); sc.flashScreen(0.1);
  b.eyes('off'); setHead(b, 'open');
  arms(b, 70, -70, 0.14); // mains à la gorge
  b.tw(a.head, { angle: 14, y: HEAD_Y + 4 }, 0.14);
  b.tw(a.rig, { angle: 8 }, 0.2);
  shout(sc, ['KOF ! KOF !'], b.x, b.y - 158, { scale: 1, ms: 800 });
  for (let t = 0, T = b.t(C.stun); t < T; t += 0.14) { b.tw(a.rig, { x: t % 0.28 < 0.14 ? 2 : -2 }, 0.05); if (t % 0.42 < 0.14) sfx.thud(); yield 0.14; }
  b.eyes('on'); MCKING.rest(b, 0.3);
}

/** Arrivée dans l'arène : il bondit par-dessus la table et s'écrase près du joueur. */
export function* entrance(b: Boss) {
  b.scene.time.delayedCall(220, () => b.root.setDepth(7)); // assez haut : il repasse devant la table
  yield* hop(b, b.clampX(b.player.x + 220), 150, 0.85);
  b.scene.flashScreen(0.1);
  yield 0.25;
}

/** Cinématique : attablé sur sa grande chaise (sous le sol et la table), il mâche. */
export function seat(b: Boss) {
  const a = A(b), f = F(b), sc = b.scene;
  b.root.setDepth(4.9);
  a.rig.y = 8;
  a.armF.angle = -140;
  syncArms(b);
  a.held.setTexture('burger_b2').setVisible(true);
  b.eyes('off');
  let on = false;
  f.chewT = sc.time.addEvent({ delay: 240, loop: true, callback: () => { on = !on; a.headImg.setTexture(on ? 'mck_head_chew' : 'mck_head'); } });
}
/** Il se lève d'un coup : toute la table en tremble. */
export function stand(b: Boss) {
  const a = A(b), f = F(b), sc = b.scene;
  f.chewT?.remove(); f.chewT = null;
  a.held.setVisible(false).setTexture('burger');
  a.headImg.setTexture('mck_head_mad_open');
  sc.tweens.add({ targets: a.rig, y: 0, duration: 340, ease: 'Bounce.out' });
  sc.tweens.add({ targets: a.armF, angle: ARM.f, duration: 200, onUpdate: () => syncArms(b) }); // jeu figé : pas de b.update
  sc.time.delayedCall(120, () => { sfx.slam(); sc.cameras.main.shake(320, 0.014); sc.puffs(b.x - 26, b.floorY, 4); sc.puffs(b.x + 26, b.floorY, 4); jiggle(b, 0.2, 420); });
}

export const MCKING: BossDef = {
  name: 'MᶜKING',
  title: 'LE ROI DES BURGERS',
  hp: MK.hp,
  hurt: { w: 66, h: 118 },
  build(b) {
    const sc = b.scene, sprite = (k: string, x: number, y: number, ox = 0.5, oy = 1) => sc.add.image(x, y, k).setOrigin(ox, oy);
    const legL = sprite('mck_leg', -15, 1).setFlipX(true), legR = sprite('mck_leg', 15, 1);
    const belly = sprite('mck_belly', 0, BELLY_Y, 0.5, 0.5);
    const torso = sprite('mck_torso', 0, -43);
    const headImg = sprite('mck_head', 0, 0);
    const crown = sprite('mck_crown', 1, CROWN_Y).setAngle(-5);
    const eyes = sc.add.image(0, -25, 'mck_eyes');
    const glow = sc.add.image(0, -25, 'mck_eyes_glow').setBlendMode(Phaser.BlendModes.ADD);
    const head = sc.add.container(2, HEAD_Y, [headImg, glow, eyes, crown]);
    const print = sc.add.image(0, -65, 'mck_tee_print');
    const upF = sprite('mck_uparm', 0, 0, 0.5, ARM_PIVOT.up), upB = sprite('mck_uparm', 0, 0, 0.5, ARM_PIVOT.up).setFlipX(true);
    const foImgF = sprite('mck_forearm_f', 0, 0, 0.5, ARM_PIVOT.fore), foImgB = sprite('mck_forearm_b', 0, 0, 0.5, ARM_PIVOT.fore).setFlipX(true);
    const held = sc.add.image(0, ARM_LEN.fore, 'burger').setVisible(false);
    const foreF = sc.add.container(0, ARM_LEN.up, [foImgF, held]), foreB = sc.add.container(0, ARM_LEN.up, [foImgB]);
    const armF = sc.add.container(31, SHOULDER_Y, [upF, foreF]), armB = sc.add.container(-31, SHOULDER_Y, [upB, foreB]);
    const rig = sc.add.container(0, 0, [armB, legL, legR, belly, torso, print, head, armF]);
    b.root.add(rig);
    b.parts = { rig, belly, torso, head, headImg, armF, armB, upF, upB, foreF, foreB, held, crown, legL, legR, eyes, glow };
    b.flashParts = [legL, legR, belly, torso, print, headImg, upF, upB, foImgF, foImgB, crown];
    // Le boss se retourne par miroir : le flocage se retourne aussi, pour rester lisible.
    const face = b.face.bind(b);
    b.face = () => { face(); print.scaleX = b.root.scaleX; };
    const f = new Feast(b);
    fields.set(b, f);
    this.rest(b, 0);
    syncArms(b);
    sc.tweens.add({ targets: belly, y: BELLY_Y + 1, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    sc.tweens.add({ targets: headImg, y: 1, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    sc.tweens.add({ targets: [eyes, glow], y: -24, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); // calque collé aux yeux
    // À plat ventre, la zone touchable est couchée ; la salle vit avec le boss.
    const col = b.hurtRects.bind(b), up = b.update.bind(b), hit = b.hit.bind(b);
    b.hurtRects = () => (f.lying ? [new Rect(b.x - 66, b.floorY - 50, 132, 50)] : col());
    b.update = (dt) => { f.update(dt); up(dt); syncArms(b); };
    // Chaque coup fait trembler le ventre ; pendant un repas il compte pour l'interruption.
    b.hit = (dmg, from) => {
      const r = hit(dmg, from);
      if (b.alive()) jiggle(b);
      const st = f.eating;
      if (st) {
        if (!b.alive()) f.eating = null;
        else {
          st.hits += dmg >= PLAYER.spell.damage ? 3 : 1; // seul le sort compte triple
          st.draw();
          if (st.hits >= st.need) { f.eating = null; b.force((x) => choke(x, st.big)); }
        }
      }
      return r;
    };
  },
  rest(b, sec) {
    const p = A(b), k = F(b).k;
    setHead(b);
    p.held.setVisible(false).setTexture('burger').setScale(1);
    p.crown.setVisible(true);
    const pose: [object, object][] = [
      [p.rig, { angle: 0, scaleX: 1, scaleY: 1, x: 0, y: 0, alpha: 1 }], [p.armF, { angle: ARM.f }], [p.armB, { angle: ARM.b }],
      [p.head, { y: HEAD_Y, x: 2, angle: 0 }], [p.belly, { scaleX: k, scaleY: k }], [p.crown, { y: CROWN_Y, angle: -5 }],
    ];
    for (const [t, props] of pose) {
      if (sec <= 0) Object.assign(t, props);
      else b.scene.tweens.add({ targets: t, ...props, duration: sec * 1000, ease: 'Quad.out' });
    }
  },
  step(b) {
    const a = A(b), f = F(b), sc = b.scene;
    f.side = -f.side;
    sc.tweens.add({ targets: a.rig, angle: { from: f.side * 3, to: 0 }, y: { from: -3, to: 0 }, duration: 240, ease: 'Quad.out' });
    sc.tweens.add({ targets: f.side > 0 ? a.legL : a.legR, y: { from: -3, to: 1 }, duration: 200, ease: 'Quad.in' });
    jiggle(b, 0.05, 200);
    sc.puffs(b.x - b.dir * 8, b.floorY, 1);
    sfx.step();
  },
  roar(b) {
    const a = A(b), sc = b.scene;
    F(b).eating = null;
    setHead(b, 'open');
    sc.tweens.add({ targets: a.rig, angle: -6, scaleY: 1.06, duration: 200, ease: 'Back.out' });
    sc.tweens.add({ targets: a.armF, angle: -165, duration: 240, ease: 'Back.out' });
    sc.tweens.add({ targets: a.armB, angle: 165, duration: 240, ease: 'Back.out' });
    sc.tweens.chain({ targets: a.crown, tweens: [{ y: CROWN_Y - 20, angle: 14, duration: 180, ease: 'Quad.out' }, { y: CROWN_Y + 1, angle: 12, duration: 240, ease: 'Bounce.out' }] });
    jiggle(b, 0.22, 700);
    shout(sc, ["J'AI ENCORE FAIM !!!"], b.x, b.y - 158, { scale: 2, ms: 1000 });
    sc.sparks(b.x, b.y - 70, COL.danger, 20);
    sc.puffs(b.x - 26, b.floorY, 5); sc.puffs(b.x + 26, b.floorY, 5);
    sc.time.delayedCall(850, () => this.rest(b, 0.25));
  },
  death(b) {
    const a = A(b), f = F(b), sc = b.scene, x = b.x, y = b.y;
    f.eating = null; f.clear();
    a.headImg.setTexture('mck_head_mad_open');
    // Il a trop mangé : le ventre gonfle, gonfle… et éclate en pluie de burgers. Reste la couronne.
    sc.tweens.add({ targets: a.belly, scaleX: 1.9, scaleY: 1.9, duration: 1400, ease: 'Quad.in' });
    sc.tweens.add({ targets: a.rig, x: { from: -2, to: 2 }, duration: 45, yoyo: true, repeat: 15 });
    sc.time.addEvent({ delay: 130, repeat: 9, callback: () => { sfx.gulp(); sc.sparks(x + Phaser.Math.Between(-30, 30), y - Phaser.Math.Between(20, 70), 0xffd36a, 5); } });
    sc.time.delayedCall(1450, () => {
      sfx.slam(); sfx.burp(); sc.flashScreen(0.5); sc.cameras.main.shake(500, 0.018);
      sc.sparks(x, y - 50, 0xffd36a, 40); sc.sparks(x, y - 50, 0xe8a548, 30); sc.puffs(x, y - 20, 10);
      b.root.setVisible(false);
      for (let i = 0; i < 16; i++) {
        const o = sc.add.image(x, y - 50, i % 3 ? 'burger_b1' : 'burger').setDepth(17), tx = x + Phaser.Math.Between(-210, 210);
        sc.tweens.add({ targets: o, x: tx, angle: Phaser.Math.Between(-720, 720), duration: 950, ease: 'Linear' });
        sc.tweens.chain({ targets: o, tweens: [{ y: y - Phaser.Math.Between(70, 170), duration: 420, ease: 'Quad.out' }, { y: y - 8, duration: 530, ease: 'Bounce.out' }] });
        sc.tweens.add({ targets: o, alpha: 0, delay: 2400, duration: 600, onComplete: () => o.destroy() });
      }
      const c = sc.add.image(x, y - 110, 'mck_crown').setDepth(17).setName('dropCrown');
      sc.tweens.chain({ targets: c, tweens: [{ y: y - 190, angle: 200, duration: 480, ease: 'Quad.out' }, { y: y - 9, angle: 368, duration: 620, ease: 'Bounce.out' }], onComplete: () => c.setData('landed', true) });
    });
  },
  /** Portrait à plat (l'annonceur teinte les images directes) : poing levé, burger brandi. ×2 à l'écran. */
  portrait(sc) {
    const k = 2 / 3, im = (key: string, x: number, y: number, ox = 0.5, oy = 1, a = 0) => sc.add.image(x * k, y * k, key).setOrigin(ox, oy).setScale(k).setAngle(a);
    const arm = (x: number, y: number, a: number, side: 1 | -1, fore: string) => {
      const l = limb(a, side), r = Phaser.Math.DegToRad(a), ex = x + l.ex * Math.cos(r) - l.ey * Math.sin(r), ey = y + l.ex * Math.sin(r) + l.ey * Math.cos(r);
      return [im('mck_uparm', x, y, 0.5, ARM_PIVOT.up, a + l.up).setFlipX(side < 0), im(fore, ex, ey, 0.5, ARM_PIVOT.fore, a + l.fore).setFlipX(side < 0)];
    };
    return sc.add.container(0, 0, [
      ...arm(-45, SHOULDER_Y, 9, -1, 'mck_forearm_b'),
      im('mck_leg', -29, 1).setFlipX(true), im('mck_leg', 1, 1),
      im('mck_belly', -14, -34, 0.5, 0.5), im('mck_torso', -14, -43), im('mck_tee_print', -14, -65, 0.5, 0.5),
      im('mck_head_mad_open', -12, -82),
      im('mck_crown', -11, -119, 0.5, 1, -8),
      ...arm(17, SHOULDER_Y, -168, 1, 'mck_forearm_f'),
      im('burger', 26, -121, 0.5, 0.5),
    ]);
  },
  patterns: [
    { name: 'lob', weight: 3, phase: 0, run: lob, far: true, elevated: true },
    { name: 'bump', weight: 3, phase: 0, run: bump },
    { name: 'flop', weight: 2, phase: 0, run: flop, far: true, elevated: true },
    { name: 'charge', weight: 2, phase: 0, run: charge, far: true },
    { name: 'burp', weight: 2, phase: 0, run: burp },
    { name: 'inhale', weight: 1, phase: 0, run: inhale, far: true },
    { name: 'rain', weight: 2.5, phase: 2, run: rain, far: true, elevated: true },
    { name: 'crown', weight: 2, phase: 2, run: crownThrow, far: true, elevated: true },
    { name: 'split', weight: 2, phase: 2, run: split, far: true },
  ],
};
