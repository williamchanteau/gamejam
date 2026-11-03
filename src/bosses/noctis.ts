import Phaser from 'phaser';
import type { Boss, BossDef } from '../entities/Boss';
import { COL } from '../config';
import { sfx } from '../audio/sfx';
import { makeNoctisArt } from '../art/noctis';
import { bakeNoctis, FULL, NoctisRig, REST, type LampId, type Pose } from '../art/noctisRig';
import { Lanterns, NIGHT } from './lanterns';

const ADD = Phaser.BlendModes.ADD;
type Cont = Phaser.GameObjects.Container;
// Poses (voir art/noctisRig.ts) : ce qui n'est pas cité reprend sa valeur de repos.
const P: Record<string, Partial<Pose>> = {
  raise: { lean: -6, crouch: 8, head: -8, neck: 3, a1: 150, a2: 18, b1: -64, b2: -40, reach: 10, rise: 0.7 },
  lance: { lean: 32, crouch: 16, head: 26, a1: 82, a2: 8, b1: -120, b2: -16, reach: 8, rise: 1 },
  droop: { lean: 20, crouch: 12, head: 44, neck: -3, a1: 12, a2: 10, b1: -8, b2: -8 },
  backWind: { lean: 12, crouch: 12, head: -24, flip: -1, neck: 4, a1: 34, a2: 46, b1: 152, b2: 18, reach: 22, rise: 0.4 },
  backhand: { lean: 30, crouch: 18, head: 22, a1: -70, a2: -30, b1: 58, b2: 12, reach: 30, rise: 0.2 },
  spread: { lean: 6, crouch: 34, head: 6, a1: 110, a2: 0, b1: -70, b2: 0, reach: 24, rise: 0.5 },
  burrow: { lean: 22, crouch: 24, head: 30, neck: -2, a1: 118, a2: -30, b1: -118, b2: 30, reach: 8, dive: 1 },
  yank: { lean: -14, crouch: -3, head: -26, neck: 5, a1: 150, a2: 20, b1: -150, b2: -20, reach: 12, dive: 1, rise: 0.8 },
  conductA: { lean: -6, crouch: 6, head: -14, neck: 4, a1: 140, a2: 30, b1: -50, b2: -70, reach: 10, rise: 1 },
  conductB: { lean: -2, crouch: 6, head: 8, neck: 4, a1: 70, a2: 70, b1: -130, b2: -40, reach: 10, rise: 1 },
  collapse: { lean: 44, crouch: 36, head: 60, neck: -4, a1: 6, a2: 6, b1: -6, b2: -6 },
  reap0: { lean: -12, crouch: 10, head: -14, neck: 3, a1: -110, a2: -30, b1: -140, b2: -30, reach: 20, rise: 1 },
  reap1: { lean: 28, crouch: 22, head: 24, a1: 96, a2: 10, b1: 76, b2: 10, reach: 26, dive: 1 },
  cry: { lean: -14, crouch: -2, head: -30, neck: 6, a1: 130, a2: 30, b1: -130, b2: -30, reach: 12, rise: 1 },
};
const full = (name: string): Pose => ({ ...REST, ...P[name] });
const fields = new WeakMap<Boss, { L: Lanterns; R: NoctisRig }>();
const F = (b: Boss) => fields.get(b)!.L;
const R = (b: Boss) => fields.get(b)!.R;

function pose(b: Boss, name: string, sec: number, ease = 'Quad.out') {
  b.tw(R(b).p, { ...full(name) }, sec, ease);
}

/** Seule source de lumière du corps : une lanterne s'allume quand il attaque. */
function lightUp(b: Boss, id: LampId) {
  const r = R(b);
  if (!r.light(id)) return;
  const q = r.world(id);
  F(b).burst(q.x, q.y, 0xffc45c, 8);
  sfx.tick();
}

function douse(b: Boss) {
  const r = R(b);
  for (const q of r.litWorld()) F(b).burst(q.x, q.y, 0x6a6f8e, 4);
  r.allOut();
}

/** Récupération : une lanterne de la salle s'allume, il reste ouvert ; à la fin la sienne s'éteint. */
function* recover(b: Boss, sec: number, name = 'droop') {
  F(b).ignite(F(b).nearest(b.x));
  b.eyes('off'); pose(b, name, 0.2);
  yield b.t(sec);
  b.eyes('on'); NOCTIS.rest(b, 0.25);
}

/** Image rémanente : silhouette sombre qui s'efface sur place. */
function ghost(b: Boss, col = 0x463c66) {
  const sc = b.scene;
  const g = sc.add.image(b.x, b.y, 'noc_full').setOrigin(FULL.ox / FULL.w, FULL.oy / FULL.h).setScale(b.dir, 1).setTintFill(col).setAlpha(0.45).setDepth(62);
  sc.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
}

/** Ruée annoncée : la bande rouge montre toute la course, il la traverse lanterne en avant, jambes en ciseaux. */
function* rush(b: Boss) {
  const L = F(b);
  b.face(); b.eyes('tele'); sfx.warn();
  L.ignite(L.nearest(b.x));
  lightUp(b, 'main');
  const end = b.clampX(b.player.x + b.dir * 120);
  const mark = b.temp(b.scene.add.rectangle(Math.min(b.x, end) - 30, b.floorY - 92, Math.abs(end - b.x) + 60, 92, COL.danger, 0.16).setOrigin(0).setDepth(80));
  pose(b, 'raise', 0.3);
  yield b.tele(1.05);
  mark.destroy(); sfx.whoosh();
  pose(b, 'lance', 0.12);
  b.tw(b.root, { x: end }, b.t(NIGHT.rushTime), 'Sine.inOut');
  b.hitbox = () => new Phaser.Geom.Rectangle(b.x - 30, b.y - 90, 60, 90);
  const n = 8;
  for (let i = 0; i < n; i++) { ghost(b); yield b.t(NIGHT.rushTime / n); }
  b.hitbox = null;
  yield* recover(b, 1);
}

/** S'efface sans lumière et revient derrière le joueur, dos tourné ; b.dir vise déjà le joueur (zones verrouillées). */
function* vanish(b: Boss, dist: number) {
  const O = NIGHT.ombre, L = F(b), sc = b.scene, p = b.player;
  b.eyes('off'); sfx.whoosh();
  L.burst(b.x, b.y - 58, 0x463c66, 14); sc.puffs(b.x, b.y - 20, 3);
  b.tw(b.root, { alpha: 0 }, b.t(O.fade));
  yield b.t(O.fade + O.dark);
  let x = p.x - p.facing * dist;
  if (x < 40 || x > sc.worldW - 40) x = p.x + p.facing * dist;
  b.root.x = b.clampX(x); b.face();
  b.root.scaleX = -b.dir;
  R(b).snap();
  L.ignite(L.nearest(b.x));
  b.root.alpha = 1; b.eyes('tele');
}

/** Dans ton dos : il surgit de dos, la tête dévissée vers toi, puis pivote d'un bloc et abat la lanterne de sa main secondaire. */
function* ombre(b: Boss) {
  const O = NIGHT.ombre, L = F(b), r = R(b), sc = b.scene;
  yield* vanish(b, O.dist);
  const dir = b.dir, x0 = b.x, zx = dir > 0 ? x0 : x0 - O.reach, zy = b.floorY - O.height;
  lightUp(b, 'off'); sfx.warn();
  const mark = b.temp(sc.add.rectangle(zx, zy, O.reach, O.height, COL.danger, 0.2).setOrigin(0).setDepth(80));
  pose(b, 'backWind', 0.28, 'Back.out');
  yield b.tele(O.tele);
  mark.destroy(); sfx.whoosh();
  // Le pivot : tout le corps tourne, le bras armé passe du dos à l'avant, la lanterne suit au bout de sa chaîne.
  b.tw(b.root, { scaleX: dir }, b.t(O.turn), 'Quad.in');
  pose(b, 'backhand', b.t(O.turn + 0.07), 'Quad.in');
  yield b.t(O.turn);
  sfx.blade();
  const fx = b.temp(sc.add.image(x0 + dir * 44, b.floorY - 60, 'noc_slash').setScale(dir, 1).setAngle(dir * -32).setDepth(70));
  b.tw(fx, { alpha: 0 }, b.t(O.active) + 0.14, 'Quad.in');
  b.hitbox = () => new Phaser.Geom.Rectangle(zx, zy, O.reach, O.height);
  yield b.t(0.07);
  sc.cameras.main.shake(130, 0.007);
  const q = r.world('off');
  L.burst(q.x, q.y, 0xffc45c, 16); L.burst(x0 + dir * 70, b.floorY - 30, COL.danger, 8);
  yield b.t(O.active - 0.07);
  b.hitbox = null;
  yield* recover(b, O.recover);
}

/** Moulinet (phase 2) : accroupi dans ton dos, il fait tournoyer ses deux lanternes à bout de bras. Seul l'anneau blesse : sors du cercle, ou entre dedans. */
function* moulinet(b: Boss) {
  const M = NIGHT.moulinet, L = F(b), r = R(b), sc = b.scene;
  yield* vanish(b, M.dist);
  const dir = b.dir, cy = b.floorY - M.centerY;
  lightUp(b, 'off'); lightUp(b, 'main'); sfx.warn();
  b.tw(b.root, { scaleX: dir }, b.t(0.14), 'Quad.in');
  pose(b, 'spread', 0.26, 'Back.out');
  const ring = b.temp(sc.add.graphics().setDepth(80));
  ring.fillStyle(COL.danger, 0.13).fillCircle(b.x, cy, M.radius).lineStyle(1, COL.danger, 0.8).strokeCircle(b.x, cy, M.radius);
  ring.fillStyle(0x020108, 0.45).fillCircle(b.x, cy, M.safe);
  yield b.tele(M.tele);
  ring.destroy(); sfx.blade();
  const p = r.p, a1 = p.a1, b1 = p.b1;
  b.tw(p, { a1: a1 - 720, b1: b1 - 720 }, b.t(M.time), 'Sine.inOut');
  let which = false;
  b.hitbox = () => {
    which = !which;
    const q = r.world(which ? 'main' : 'off');
    return new Phaser.Geom.Rectangle(q.x - M.hit / 2, q.y - M.hit / 2, M.hit, M.hit);
  };
  const n = 16;
  for (let i = 0; i < n; i++) {
    for (const id of ['main', 'off'] as const) { const q = r.world(id); L.burst(q.x, q.y, i % 2 ? 0xffc45c : COL.danger, 3); }
    if (i % 5 === 0) sfx.whoosh();
    yield b.t(M.time / n);
  }
  b.hitbox = null;
  p.a1 += 720; p.b1 += 720;
  sfx.slam(); sc.cameras.main.shake(160, 0.007); sc.puffs(b.x, b.floorY, 4);
  yield* recover(b, M.recover);
}

function spawnWave(b: Boss, x: number, dir: number, speed: number, life = 3.2) {
  const o = b.hazard('noc_wave0', x, b.floorY, dir * speed, 14, 24, life).setDepth(70);
  let t = 0;
  o.setData('tick', (dt: number) => {
    t += dt;
    o.setTexture(`noc_wave${Math.floor(t * 12) % 3}`);
    if (Math.random() < dt * 30) { F(b).burst(o.x, b.floorY - 6, COL.danger, 2); b.scene.debris(o.x, b.floorY, 1); }
  });
}

/** Onde : la lanterne de sa poitrine s'allume, ses tentacules s'enfoncent dans le sol, il tire d'un coup : la vague jaillit du sol. En phase 2, le ressac revient des bords vers lui. */
function* onde(b: Boss) {
  const O = NIGHT.onde, L = F(b), sc = b.scene;
  b.face(); b.eyes('tele'); sfx.warn();
  L.ignite(L.nearest(b.x));
  lightUp(b, 'rib');
  pose(b, 'burrow', 0.3, 'Back.out');
  const line = b.temp(sc.add.rectangle(b.x, b.floorY - 12, 40, 24, COL.danger, 0.2).setDepth(80));
  const tele = b.tele(O.tele);
  b.tw(line, { scaleX: 11 }, tele, 'Sine.in');
  yield 0.3;
  sfx.crack(); sc.puffs(b.x - 44, b.floorY, 2); sc.puffs(b.x + 44, b.floorY, 2); sc.debris(b.x, b.floorY, 4);
  yield tele - 0.3;
  line.destroy();
  const v = O.speed * b.speed;
  pose(b, 'yank', 0.08, 'Quad.in');
  sfx.slam(); sc.cameras.main.shake(180, 0.008);
  sc.puffs(b.x, b.floorY, 4); sc.debris(b.x, b.floorY, 6);
  spawnWave(b, b.x - 22, -1, v); spawnWave(b, b.x + 22, 1, v);
  if (b.phase === 2) {
    const xs = [b.x - O.back, b.x + O.back], cx = b.x;
    const marks = xs.map((x) => b.temp(sc.add.rectangle(x, b.floorY - 12, 28, 24, COL.danger, 0.3).setDepth(80)));
    yield 0.14;
    pose(b, 'burrow', 0.16);
    sfx.warn();
    yield Math.max(0, b.tele(O.ressac) - 0.14);
    marks.forEach((m) => m.destroy());
    pose(b, 'yank', 0.08, 'Quad.in');
    sfx.slam(); sc.cameras.main.shake(140, 0.006);
    xs.forEach((x) => { sc.debris(x, b.floorY, 5); spawnWave(b, x, Math.sign(cx - x), v, O.back / v); });
  }
  yield* recover(b, O.recover);
}

/** Épreuve (phase 2) : en chef d'orchestre, il lance trois flammes qui allument les lanternes à frapper dans l'ordre. Réussite : il s'effondre. Échec : la grande fauche. */
function* epreuve(b: Boss) {
  const E = NIGHT.trial, L = F(b), r = R(b), sc = b.scene;
  b.face(); b.eyes('tele'); sfx.warn();
  L.allOut();
  lightUp(b, 't1');
  pose(b, 'conductA', 0.16, 'Back.out');
  const order = L.available(b.player.x, E.count).sort(() => Math.random() - 0.5);
  if (order.length < E.count) { yield* fauche(b); return; } // trop de lanternes à terre
  L.beginTrial(order);
  yield b.t(E.lead);
  for (let i = 0; i < order.length; i++) {
    const l = order[i], q = r.world('t1');
    pose(b, i % 2 ? 'conductA' : 'conductB', 0.1);
    const f = b.temp(sc.add.image(q.x, q.y, 'noc_flame0').setScale(2).setDepth(66));
    b.tw(f, { x: l.x, y: l.y + 12 }, E.fly, 'Sine.in');
    L.burst(q.x, q.y, 0xffc45c, 6); sfx.whoosh();
    yield E.fly;
    f.destroy();
    L.ignite(l, 99); L.addTag(l, i);
    sfx.ting(); sc.cameras.main.shake(70, 0.003);
    yield E.show;
  }
  // Le cercle se referme sur lui : c'est le temps restant.
  const ring = b.temp(sc.add.graphics().setDepth(80));
  let t = E.window;
  while (t > 0 && L.trial && L.trial.next < order.length) {
    ring.clear().lineStyle(1, COL.danger, 0.8).strokeCircle(b.x, b.y - 66, 18 + (t / E.window) * 70);
    if (Math.floor(t) !== Math.floor(t - 0.05)) sfx.tick();
    yield 0.05; t -= 0.05;
  }
  ring.destroy();
  const won = !!L.trial && L.trial.next >= order.length;
  L.cancel();
  if (won) {
    sc.flashScreen(0.3); sfx.slam(); sc.cameras.main.shake(240, 0.01);
    L.burst(b.x, b.y - 60, 0xffc45c, 26);
    L.ignite(L.nearest(b.x), E.stun + 1);
    b.burn(E.damage);
    yield* recover(b, E.stun, 'collapse');
    return;
  }
  yield* fauche(b);
}

/** La grande fauche : ses bras et ses tentacules balaient tout le sol, une fois. Sauter ou esquiver. */
function* fauche(b: Boss) {
  const E = NIGHT.trial, L = F(b), sc = b.scene, y = b.floorY - E.bandH;
  L.allOut();
  lightUp(b, 'off');
  b.eyes('tele'); sfx.warn();
  pose(b, 'reap0', 0.24, 'Back.out');
  const mark = b.temp(sc.add.rectangle(0, y, sc.worldW, E.bandH, COL.danger, 0.2).setOrigin(0).setDepth(80));
  yield b.tele(E.sweepTele);
  mark.destroy(); sfx.blade(); sfx.slam();
  pose(b, 'reap1', 0.08, 'Quad.in');
  sc.flashScreen(0.22); sc.cameras.main.shake(180, 0.008);
  const band = b.temp(sc.add.rectangle(0, y, sc.worldW, E.bandH, 0xffd6e0, 0.95).setOrigin(0).setDepth(70));
  const edge = b.temp(sc.add.rectangle(0, y, sc.worldW, 2, COL.danger).setOrigin(0).setDepth(71));
  b.tw([band, edge], { alpha: 0 }, 0.24, 'Quad.in');
  b.hitbox = () => new Phaser.Geom.Rectangle(0, y, sc.worldW, E.bandH);
  yield b.t(0.14);
  b.hitbox = null;
  yield b.t(0.1);
  band.destroy(); edge.destroy();
  yield* recover(b, E.recover);
}

const art = (sc: Phaser.Scene) => { makeNoctisArt(sc); bakeNoctis(sc); };

export const NOCTIS: BossDef = {
  name: 'NOCTIS', title: 'LE DÉVOREUR DE LUMIÈRE', hp: NIGHT.hp, hurt: { w: 46, h: 108 },
  build(b) {
    const sc = b.scene;
    art(sc);
    const r = new NoctisRig(sc, b.root);
    b.parts = { rig: r.rig, torso: r.torso, head: r.head, eyes: r.eyes, glow: r.glowEye };
    b.flashParts = r.flashParts;
    const L = new Lanterns(b);
    L.lights = () => r.litWorld();
    fields.set(b, { L, R: r });
    r.onBreak = (x, y) => { L.burst(x, y, 0xffbc51, 14); sc.puffs(x, y + 6, 2); sfx.crack(); };
    this.rest(b, 0);
    // Coups filtrés par la lumière ; la salle et le corps avancent avec le boss.
    const hit = b.hit.bind(b), up = b.update.bind(b);
    b.hit = (dmg, from) => { if (L.filterHit(dmg)) hit(dmg, from); };
    b.update = (dt) => { L.update(dt); up(dt); r.update(dt); };
    sc.events.on('prerender', r.draw, r);
    sc.events.once('shutdown', () => sc.events.off('prerender', r.draw, r));
  },
  rest(b, sec) {
    const r = R(b), sc = b.scene;
    F(b).cancel();
    douse(b);
    sc.tweens.killTweensOf(r.p);
    if (sec <= 0) {
      b.root.alpha = 1; b.root.setScale(b.dir, 1); (b.parts.rig as Cont).x = 0;
      Object.assign(r.p, REST);
      r.snap();
      return;
    }
    sc.tweens.add({ targets: b.root, alpha: 1, duration: sec * 1000 });
    // Tween non enregistré : il survit à la fin du pattern.
    sc.tweens.add({ targets: r.p, ...REST, duration: sec * 1000, ease: 'Quad.out' });
  },
  roar(b) {
    const sc = b.scene, L = F(b), r = R(b);
    // Tout s'embrase, sur lui et dans la salle, puis il aspire la lumière : tout s'éteint à la fin du cri.
    for (const l of L.lamps) L.ignite(l, 0.85);
    r.lightAll();
    sc.tweens.add({ targets: r.p, ...full('cry'), duration: 260, ease: 'Back.out' });
    sc.time.delayedCall(850, () => { sc.flashScreen(0.18); this.rest(b, 0.2); });
  },
  death(b) {
    const sc = b.scene, L = F(b), r = R(b), x = b.x, y = b.y;
    r.limp = true;
    r.lightAll();
    // Il se tord, chaque lanterne se décroche à son tour et éclate au sol, les jambes cèdent.
    r.ids.forEach((id, i) => sc.time.delayedCall(240 + i * 170, () => {
      const q = r.world(id);
      r.drop(id);
      L.burst(q.x, q.y, 0xffc45c, 10); sfx.clank();
    }));
    sc.tweens.add({ targets: r.p, ...full('cry'), duration: 240, ease: 'Back.out' });
    sc.tweens.add({ targets: r.p, ...full('collapse'), delay: 340, duration: 1250, ease: 'Bounce.out' });
    sc.time.delayedCall(1800, () => {
      sc.puffs(x, y, 10); L.burst(x, y - 20, 0xfff0b0, 30); sc.flashScreen(0.2);
      sc.tweens.add({ targets: b.root, alpha: 0, duration: 700 });
    });
  },
  portrait(sc) {
    art(sc);
    // À plat : l'annonceur teinte les images directes du conteneur. Remonté pour garder le masque à l'écran (×3).
    const y = 40;
    const body = sc.add.image(0, y, 'noc_full').setOrigin(FULL.ox / FULL.w, FULL.oy / FULL.h);
    const eyes = sc.add.image(5, y - 113, 'noc_eyes').setTint(COL.danger);
    const glow = (gx: number, gy: number, s: number) => sc.add.image(gx, y + gy, 'glowO').setBlendMode(ADD).setScale(s).setAlpha(0.4);
    return sc.add.container(0, 0, [glow(56, -44, 1.6), glow(-52, -30, 1.6), glow(0, -71, 1.2), body, eyes]);
  },
  patterns: [
    { name: 'rush', weight: 3, phase: 0, far: true, run: rush },
    { name: 'ombre', weight: 3, phase: 0, far: true, elevated: true, run: ombre },
    { name: 'onde', weight: 2, phase: 0, far: true, run: onde },
    { name: 'ombre2', weight: 2, phase: 2, far: true, elevated: true, run: moulinet },
    { name: 'epreuve', weight: 2, phase: 2, far: true, elevated: true, run: epreuve },
  ],
};
