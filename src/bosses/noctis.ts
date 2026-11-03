import Phaser from 'phaser';
import type { Boss, BossDef } from '../entities/Boss';
import { COL } from '../config';
import { sfx } from '../audio/sfx';
import { makeNoctisArt, LAMP_ON } from '../art/noctis';
import { Lanterns, NIGHT, type Lamp } from './lanterns';

const ADD = Phaser.BlendModes.ADD;
type Cont = Phaser.GameObjects.Container;
type Pose = { arm: number; pole: number; back: number; lean: number; head: number };
// arm + pole = inclinaison de la perche dans la salle (0 = verticale, 90 = pointée vers l'avant).
const P: Record<string, Pose> = {
  rest: { arm: -60, pole: 60, back: 8, lean: 0, head: 0 },
  raise: { arm: -128, pole: 100, back: 34, lean: -7, head: -7 },
  lance: { arm: -82, pole: 172, back: -20, lean: 15, head: 6 },
  strike: { arm: -24, pole: 124, back: -14, lean: 11, head: 8 },
  gather: { arm: -150, pole: 150, back: 150, lean: -4, head: -12 },
  plant: { arm: -72, pole: 72, back: 22, lean: 9, head: 10 },
  droop: { arm: -58, pole: 72, back: 2, lean: 7, head: 14 },
};
const fields = new WeakMap<Boss, Lanterns>();
const F = (b: Boss) => fields.get(b)!;

function pose(b: Boss, name: string, sec: number, ease = 'Quad.out') {
  const q = P[name], p = b.parts;
  b.tw(p.arm, { angle: q.arm }, sec, ease);
  b.tw(p.pole, { angle: q.pole }, sec, ease);
  b.tw(p.back, { angle: q.back }, sec, ease);
  b.tw(p.rig, { angle: q.lean }, sec, ease);
  b.tw(p.head, { angle: q.head }, sec, ease);
}

/** Récupération : une lanterne proche s'allume, Noctis reste ouvert dans sa lumière. */
function* recover(b: Boss, sec: number) {
  F(b).ignite(F(b).nearest(b.x));
  b.eyes('off'); pose(b, 'droop', 0.2);
  yield b.t(sec);
  b.eyes('on'); NOCTIS.rest(b, 0.25);
}

/** Image rémanente : silhouette sombre qui s'efface sur place. */
function ghost(b: Boss, col = 0x463c66) {
  const sc = b.scene;
  const g = sc.add.image(b.x, b.y - 4, 'noc_robe0').setOrigin(0.5, 1).setScale(b.dir, 1).setTintFill(col).setAlpha(0.6).setDepth(62);
  sc.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
}

/** Ruée annoncée : la bande rouge montre toute la course, il la traverse perche en avant. */
function* rush(b: Boss) {
  const L = F(b);
  b.face(); b.eyes('tele'); sfx.warn();
  L.ignite(L.nearest(b.x));
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

/** Dans ton dos : il s'efface dans le noir, surgit derrière le joueur, allume la lanterne voisine, puis l'entaille sombre. */
function* ombre(b: Boss, rec: number = NIGHT.ombre.recover) {
  const O = NIGHT.ombre, L = F(b), sc = b.scene, p = b.player;
  b.eyes('off'); sfx.whoosh();
  L.burst(b.x, b.y - 58, 0x463c66, 14); sc.puffs(b.x, b.y - 20, 3);
  b.tw(b.root, { alpha: 0 }, b.t(O.fade));
  yield b.t(O.fade + O.dark);
  // Zone verrouillée à la réapparition : on esquive ce qu'on voit.
  let x = p.x - p.facing * O.dist;
  if (x < 40 || x > sc.worldW - 40) x = p.x + p.facing * O.dist;
  b.root.x = b.clampX(x); b.face();
  const dir = b.dir, x0 = b.x, zx = dir > 0 ? x0 : x0 - O.reach, zy = b.floorY - O.height;
  L.ignite(L.nearest(x0));
  b.root.alpha = 1; b.eyes('tele'); sfx.warn();
  const mark = b.temp(sc.add.rectangle(zx, zy, O.reach, O.height, COL.danger, 0.2).setOrigin(0).setDepth(80));
  pose(b, 'raise', 0.28, 'Back.out');
  yield b.tele(O.tele);
  mark.destroy(); sfx.blade();
  pose(b, 'strike', 0.09, 'Quad.in');
  const fx = b.temp(sc.add.image(x0 + dir * 44, b.floorY - 52, 'noc_slash').setScale(dir, 1).setAngle(dir * -14).setDepth(70));
  b.tw(fx, { alpha: 0 }, b.t(O.active) + 0.14, 'Quad.in');
  b.hitbox = () => new Phaser.Geom.Rectangle(zx, zy, O.reach, O.height);
  sc.cameras.main.shake(110, 0.006);
  L.burst(x0 + dir * 70, b.floorY - 30, COL.danger, 10);
  yield b.t(O.active);
  b.hitbox = null;
  yield* recover(b, rec);
}

function* ombre2(b: Boss) {
  yield* ombre(b, NIGHT.ombre.quick);
  yield* ombre(b);
}

function shoot(b: Boss, l: Lamp, tx: number, ty: number) {
  const sc = b.scene, S = NIGHT.salve, y = l.y + 12, a = Math.atan2(ty - y, tx - l.x), v = S.speed * b.speed;
  const o = b.hazard('noc_bolt', l.x, y, Math.cos(a) * v, 10, 10, 5);
  o.setOrigin(0.5).setDepth(70).setData('once', true);
  (o.body as Phaser.Physics.Arcade.Body).setOffset((o.width - 10) / 2, (o.height - 10) / 2);
  o.setVelocityY(Math.sin(a) * v);
  const glow = sc.add.image(o.x, o.y, 'glowR').setBlendMode(ADD).setDepth(69).setAlpha(0.7);
  o.once('destroy', () => glow.destroy());
  let trail = 0;
  o.setData('tick', (dt: number) => {
    glow.setPosition(o.x, o.y);
    trail -= dt;
    if (trail <= 0) { trail = 0.07; F(b).burst(o.x, o.y, COL.danger, 2); }
  });
  sfx.shoot();
}

/** Salve : il allume les lanternes autour du joueur ; chacune tire à son tour, la dernière après un temps mort. */
function* salve(b: Boss) {
  const S = NIGHT.salve, L = F(b), sc = b.scene;
  const lamps = L.available(b.player.x, b.phase === 2 ? 3 : 2).sort(() => Math.random() - 0.5);
  b.face(); b.eyes('tele'); sfx.warn();
  pose(b, 'raise', 0.28);
  L.ignite(L.nearest(b.x));
  for (const l of lamps) { L.ignite(l, S.aim * 2 + S.last + 2); L.charge(l, true); yield b.t(S.gap); }
  for (let i = 0; i < lamps.length; i++) {
    const l = lamps[i];
    if (l.lit <= 0) continue; // frappée à temps : ce tir est annulé
    const tx = b.player.x, ty = b.player.rect().centerY;
    const ray = b.temp(sc.add.graphics().setDepth(80));
    ray.lineStyle(1, COL.danger, 0.8).lineBetween(l.x, l.y + 12, tx, ty);
    ray.strokeCircle(tx, ty, 7);
    sfx.warn();
    yield b.tele(i === lamps.length - 1 ? S.last : S.aim);
    ray.destroy();
    if (l.lit > 0) { shoot(b, l, tx, ty); L.charge(l, false); L.burst(l.x, l.y + 12, COL.danger, 8); }
  }
  yield* recover(b, S.recover);
}

function spawnWave(b: Boss, dir: number, speed: number) {
  const o = b.hazard('noc_wave0', b.x + dir * 22, b.floorY, dir * speed, 14, 24, 3.2).setDepth(70);
  let t = 0;
  o.setData('tick', (dt: number) => {
    t += dt;
    o.setTexture(`noc_wave${Math.floor(t * 12) % 2}`);
    if (Math.random() < dt * 40) F(b).burst(o.x, b.floorY - 8, COL.danger, 2);
  });
}

/** Onde : la lumière se rassemble sous lui, il plante la perche, deux lames filent au sol : il faut sauter. */
function* onde(b: Boss) {
  const O = NIGHT.onde, L = F(b), sc = b.scene;
  b.face(); b.eyes('tele'); sfx.warn();
  L.ignite(L.nearest(b.x));
  pose(b, 'gather', 0.3, 'Back.out');
  const orb = b.temp(sc.add.image(b.x, b.floorY - 6, 'glowR').setBlendMode(ADD).setDepth(69).setScale(1).setAlpha(0.8));
  const line = b.temp(sc.add.rectangle(b.x, b.floorY - 12, 40, 24, COL.danger, 0.2).setDepth(80));
  const tele = b.tele(O.tele);
  b.tw(orb, { scale: 3 }, tele, 'Sine.in');
  b.tw(line, { scaleX: 11 }, tele, 'Sine.in');
  yield tele;
  orb.destroy(); line.destroy();
  const waves = b.phase === 2 ? 2 : 1;
  for (let i = 0; i < waves; i++) {
    pose(b, 'plant', 0.08, 'Quad.in');
    sfx.slam(); sc.cameras.main.shake(180, 0.008);
    sc.puffs(b.x, b.floorY, 4); sc.debris(b.x, b.floorY, 6);
    spawnWave(b, -1, O.speed * b.speed); spawnWave(b, 1, O.speed * b.speed);
    if (i < waves - 1) { yield b.t(O.gap * 0.5); pose(b, 'gather', 0.14); yield b.t(O.gap * 0.5); }
  }
  yield* recover(b, O.recover);
}

/** Épreuve (phase 2) : trois lanternes s'allument dans un ordre à répéter. Réussite : il s'effondre. Échec : la grande fauche. */
function* epreuve(b: Boss) {
  const E = NIGHT.trial, L = F(b), sc = b.scene;
  b.face(); b.eyes('tele'); sfx.warn();
  L.allOut();
  pose(b, 'gather', 0.3, 'Back.out');
  const order = L.available(b.player.x, E.count).sort(() => Math.random() - 0.5);
  if (order.length < E.count) { yield* fauche(b); return; } // trop de lanternes à terre
  L.beginTrial(order);
  yield b.t(0.3);
  for (let i = 0; i < order.length; i++) {
    L.ignite(order[i], 99); L.charge(order[i], true); L.addTag(order[i], i);
    sfx.ting(); sc.cameras.main.shake(70, 0.003);
    yield b.tele(E.show);
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
    yield* recover(b, E.stun);
    return;
  }
  yield* fauche(b);
}

/** La grande fauche : une bande de lumière couvre tout le sol, deux fois en rythme. Sauter ou esquiver. */
function* fauche(b: Boss) {
  const E = NIGHT.trial, L = F(b), sc = b.scene, y = b.floorY - E.bandH;
  L.allOut();
  for (let i = 0; i < 2; i++) {
    b.eyes('tele'); sfx.warn();
    pose(b, 'gather', 0.24);
    const mark = b.temp(sc.add.rectangle(0, y, sc.worldW, E.bandH, COL.danger, 0.2).setOrigin(0).setDepth(80));
    yield b.tele(i ? E.sweepTele * 0.8 : E.sweepTele);
    mark.destroy(); sfx.blade(); sfx.slam();
    pose(b, 'strike', 0.08, 'Quad.in');
    sc.flashScreen(0.22); sc.cameras.main.shake(180, 0.008);
    const band = b.temp(sc.add.rectangle(0, y, sc.worldW, E.bandH, 0xffd6e0, 0.95).setOrigin(0).setDepth(70));
    const edge = b.temp(sc.add.rectangle(0, y, sc.worldW, 2, COL.danger).setOrigin(0).setDepth(71));
    b.tw([band, edge], { alpha: 0 }, 0.24, 'Quad.in');
    b.hitbox = () => new Phaser.Geom.Rectangle(0, y, sc.worldW, E.bandH);
    yield b.t(0.14);
    b.hitbox = null;
    yield b.t(i ? 0.1 : E.sweepGap);
    band.destroy(); edge.destroy();
  }
  yield* recover(b, E.recover);
}

/** Pose à plat pour le portrait, pièces assemblées pour le combat : mêmes textures. */
function assemble(sc: Phaser.Scene) {
  const img = (k: string, x: number, y: number, ox = 0.5, oy = 1) => sc.add.image(x, y, k).setOrigin(ox, oy);
  return {
    robe: img('noc_robe0', 0, 0), hood: img('noc_hood', 0, 0), armImg: img('noc_arm', 0, 0, 8.5 / 17, 0),
    armB: img('noc_armb', 0, 0, 8.5 / 17, 0), poleImg: img('noc_pole', 0, 0, 6 / 24, 66 / 114), lamp: img(LAMP_ON[0], 14, -51, 0.5, 0),
    flames: [[-13, -38], [-4, -43], [5, -38]].map(([x, y]) => img('noc_flame0', x, y)),
  };
}

export const NOCTIS: BossDef = {
  name: 'NOCTIS', title: 'LE DÉVOREUR DE LUMIÈRE', hp: NIGHT.hp, hurt: { w: 46, h: 108 },
  build(b) {
    const sc = b.scene;
    makeNoctisArt(sc);
    const A = assemble(sc);
    const eyes = sc.add.image(5.5, -14, 'noc_eyes'), glow = sc.add.image(5.5, -14, 'glowW').setBlendMode(ADD).setScale(0.5);
    const head = sc.add.container(1, -66, [A.hood, ...A.flames, glow, eyes]);
    const pole = sc.add.container(0, 36, [A.poleImg, A.lamp]);
    const arm = sc.add.container(13, -62, [pole, A.armImg]);
    const back = sc.add.container(-13, -62, [A.armB]);
    const rig = sc.add.container(0, -4, [back, A.robe, head, arm]);
    b.root.add(rig);
    b.parts = { rig, robe: A.robe, head, hood: A.hood, arm, pole, back, lamp: A.lamp, eyes, glow };
    b.flashParts = [A.robe, A.hood, A.armImg, A.armB, A.poleImg];
    const L = new Lanterns(b);
    fields.set(b, L);
    this.rest(b, 0);
    // Coups filtrés par la lumière ; la salle et le tissu avancent avec le boss.
    const hit = b.hit.bind(b), up = b.update.bind(b);
    b.hit = (dmg, from) => { if (L.filterHit(dmg)) hit(dmg, from); };
    let t = 0;
    const fl = A.flames, lamp = A.lamp;
    b.update = (dt) => {
      t += dt;
      L.update(dt);
      up(dt);
      if (b.state === 'dead') return;
      rig.y = -4 + Math.round(Math.sin(t * 2.1) * 2);
      A.robe.setTexture(`noc_robe${Math.floor(t * 4.5) % 2}`);
      fl.forEach((f, i) => f.setTexture(`noc_flame${(Math.floor(t * 8) + i) % 2}`));
      lamp.setTexture(LAMP_ON[Math.floor(t * 9) % 2]);
      // La lanterne pend toujours droit, avec un balancement et de l'inertie quand la perche bouge.
      lamp.angle = -(rig.angle + (arm.angle + pole.angle)) + Math.sin(t * 2.6) * 7;
    };
  },
  rest(b, sec) {
    const p = b.parts, q = P.rest;
    F(b)?.cancel();
    const set: [object, number][] = [[p.arm, q.arm], [p.pole, q.pole], [p.back, q.back], [p.rig, q.lean], [p.head, q.head]];
    if (sec <= 0) { b.root.alpha = 1; p.rig.x = 0; }
    else b.scene.tweens.add({ targets: b.root, alpha: 1, duration: sec * 1000 });
    for (const [t, angle] of set) {
      if (sec <= 0) Object.assign(t, { angle });
      // Tweens non enregistrés : ils survivent à la fin du pattern.
      else b.scene.tweens.add({ targets: t, angle, duration: sec * 1000, ease: 'Quad.out' });
    }
  },
  roar(b) {
    const sc = b.scene, L = F(b), p = b.parts as Record<string, Cont>;
    // Il rallume toute la salle puis l'aspire : les lanternes s'éteignent d'un coup à la fin du cri.
    for (const l of L.lamps) L.ignite(l, 0.85);
    for (const [t, a] of [[p.arm, P.gather.arm], [p.pole, P.gather.pole], [p.back, P.gather.back], [p.head, P.gather.head]] as const) sc.tweens.add({ targets: t, angle: a, duration: 260, ease: 'Back.out' });
    sc.time.delayedCall(850, () => { sc.flashScreen(0.18); this.rest(b, 0.2); });
  },
  death(b) {
    const sc = b.scene, p = b.parts as Record<string, Cont>, L = F(b), x = b.x, y = b.y;
    sc.time.addEvent({ delay: 120, repeat: 8, callback: () => { L.burst(x + Phaser.Math.Between(-24, 24), y - Phaser.Math.Between(10, 100), 0xffc45c, 8); sfx.clank(); } });
    // Le masque tombe, la perche bascule, la robe s'effondre comme un linge vide.
    sc.tweens.chain({ targets: p.head, tweens: [
      { y: p.head.y - 12, angle: -24, duration: 320, ease: 'Quad.out' },
      { y: -6, x: 34, angle: 96, duration: 520, ease: 'Bounce.out' },
    ] });
    sc.tweens.add({ targets: p.arm, angle: 22, duration: 700, ease: 'Bounce.out' });
    sc.tweens.add({ targets: p.pole, angle: 72, duration: 700, ease: 'Bounce.out' });
    sc.tweens.add({ targets: [p.robe, p.back], scaleY: 0.3, duration: 1000, delay: 260, ease: 'Quad.in' });
    sc.time.delayedCall(1700, () => {
      sc.puffs(x, y, 10); L.burst(x, y - 20, 0xfff0b0, 30); sc.flashScreen(0.2);
      sc.tweens.add({ targets: b.root, alpha: 0, duration: 700 });
    });
  },
  portrait(sc) {
    makeNoctisArt(sc);
    const A = assemble(sc);
    // Tout à plat : l'annonceur teinte les images directes du conteneur.
    A.armB.setPosition(-13, -66).setAngle(8);
    A.hood.setPosition(1, -70);
    A.flames.forEach((f) => f.setPosition(f.x + 1, f.y - 70));
    const eyes = sc.add.image(6.5, -84, 'noc_eyes').setTint(COL.danger);
    A.armImg.setPosition(13, -66).setAngle(-60);
    A.poleImg.setPosition(44, -48);
    A.lamp.setPosition(58, -99);
    return sc.add.container(0, 0, [A.armB, A.robe.setPosition(0, -4), A.hood, ...A.flames, eyes, A.poleImg, A.lamp, A.armImg]);
  },
  patterns: [
    { name: 'rush', weight: 3, phase: 0, far: true, run: rush },
    { name: 'ombre', weight: 3, phase: 0, far: true, run: (b) => ombre(b) },
    { name: 'salve', weight: 2, phase: 0, far: true, elevated: true, run: salve },
    { name: 'onde', weight: 2, phase: 0, far: true, run: onde },
    { name: 'ombre2', weight: 2, phase: 2, far: true, run: ombre2 },
    { name: 'epreuve', weight: 2, phase: 2, far: true, elevated: true, run: epreuve },
  ],
};
