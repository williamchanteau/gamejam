// DEV uniquement (/?viewer) : visualiseur d'animations. Horloge manuelle à pas fixe (1/60 s) :
// tweens, timers, physique et objets avancent seulement quand le viewer le décide → pas à pas exact,
// retour en arrière = rejouer depuis le début (Math.random rendu déterministe).
import Phaser from 'phaser';
import { ARENA, BOSS, H, PLAYER } from '../config';
import { ArenaScene } from '../scenes/ArenaScene';
import { Boss } from '../entities/Boss';
import { buildNave, type Room } from '../scenes/rooms';
import { sfx } from '../audio/sfx';
import { input } from '../input';
import { V, ENTITIES, animsOf, bp, pp, type Anim, type Seg } from './anims';
import { buildPanel, renderPanel, tickPanel } from './panel';

const STEP = 1 / 60, MS = 1000 * STEP, MAX = 1500;
let silent = false;
function patchSfx() {
  const s = sfx as unknown as Record<string, (...a: unknown[]) => void>;
  if ((s as { _v?: boolean })._v) return;
  for (const k in s) { const f = s[k]; s[k] = (...a) => { if (!silent && V.sound) f(...a); }; }
  (s as { _v?: boolean })._v = true;
}
function seedRandom() {
  let a = 1234567;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class ViewerScene extends ArenaScene {
  boss: Boss | null = null;
  worldW = ARENA.bossW;
  plats: { x: number; y: number; w: number }[] = [];
  spawnX = 470;
  endT = -1;
  private room: Room | null = null;
  private dbg!: Phaser.GameObjects.Graphics;
  private anim!: Anim;
  private acc = 0; private vt = 0; private tweenMs = 0; private eye = 'off'; private camInit = false;
  private rec: Seg['k'][] = [];
  private teles: typeof V.teles = [];
  private keys = new Set<string>();

  constructor() { super('Viewer'); }

  buildBackground() {
    this.room = V.arena ? buildNave(this) : null;
    this.cameras.main.setBackgroundColor(V.arena ? '#0b0a14' : '#6e6e74');
  }

  create(data?: { retry?: boolean; seek?: number }) {
    for (const k of this.keys) dispatchEvent(new KeyboardEvent('keyup', { code: k }));
    this.keys = new Set();
    (document.documentElement as { requestFullscreen?: unknown }).requestFullscreen = undefined;
    patchSfx(); seedRandom(); silent = true;
    super.create();
    // Détache les mises à jour automatiques : c'est step() qui fait avancer le temps.
    const ev = this.sys.events, E = Phaser.Scenes.Events, ul = this.sys.updateList, w = this.physics.world;
    ev.off(E.PRE_UPDATE, ul.update, ul); ev.off(E.UPDATE, ul.sceneUpdate, ul);
    ev.off(E.PRE_UPDATE, this.time.preUpdate, this.time); ev.off(E.UPDATE, this.time.update, this.time);
    ev.off(E.UPDATE, this.tweens.update, this.tweens);
    ev.off(E.UPDATE, w.update, w); ev.off(E.POST_UPDATE, w.postUpdate, w);
    (this.tweens as unknown as { getDelta: () => number }).getDelta = () => this.tweenMs;
    for (const o of this.children.list as unknown as { scrollFactorX: number; setVisible(v: boolean): void }[]) if (o.scrollFactorX === 0) o.setVisible(false);
    this.cameras.main.removeBounds();
    this.dbg = this.add.graphics().setDepth(1000);
    this.boss = null; this.endT = -1; this.acc = 0; this.vt = 0; this.rec = []; this.teles = []; this.camInit = false;
    this.player.god = true;
    const e = ENTITIES[V.ent];
    this.anim = animsOf(e)[V.anim] ?? animsOf(e)[0];
    if (e.boss) {
      const b = (this.boss = new Boss(this, e.boss, 600, this.floorY));
      const eyes = b.eyes.bind(b);
      this.eye = 'off';
      b.eyes = (m) => { this.eye = m; eyes(m); };
      const tele = b.tele.bind(b);
      b.tele = (x) => { const got = tele(x); this.teles.push({ f: V.frame, req: x / b.speed, got }); return got; };
      if (V.phase === 2 && !this.anim.p1) { b.phase = 2; b.speed = BOSS.p2Speed[0]; }
    }
    for (let i = 0; i < 3; i++) this.step(false); // posé au sol avant l'animation
    this.anim.setup(this);
    V.frame = 0;
    const seek = data?.seek ?? Infinity;
    if (seek === Infinity) {
      // Pré-simulation : durée totale + frise télégraphe / actif / récupération.
      while (V.frame < MAX && !this.anim.done(this, V.frame * STEP)) this.step(true);
      V.total = V.frame;
      V.teles = this.teles;
      V.segs = [];
      this.rec.forEach((k, i) => { const s = V.segs[V.segs.length - 1]; if (s?.k === k) s.n++; else V.segs.push({ k, from: i, n: 1 }); });
      silent = false;
      this.scene.restart({ seek: 0 });
      return;
    }
    while (V.frame < Math.min(seek, V.total)) this.step(true);
    silent = false;
    buildPanel(this);
    renderPanel();
  }

  /** Simule un pas fixe, dans l'ordre de la boucle Phaser. */
  step(count = true) {
    this.vt += MS;
    const ul = this.sys.updateList, w = this.physics.world;
    ul.update(); ul.sceneUpdate(this.vt, MS);
    this.time.preUpdate(this.vt, MS); this.time.update(this.vt, MS);
    this.tweenMs = MS; this.tweens.update(); this.tweenMs = 0;
    w.update(this.vt, MS);
    this.player.update(STEP);
    if (this.boss) { this.boss.update(STEP); if (this.boss.state === 'idle') bp(this).waitT = 1e9; }
    for (const o of [...this.hazards.getChildren()] as Phaser.Physics.Arcade.Image[]) {
      (o.getData('tick') as ((dt: number) => void) | undefined)?.(STEP);
      const life = o.getData('life') - STEP;
      o.setData('life', life);
      if (life <= 0 || o.x < -40 || o.x > this.worldW + 40) o.destroy();
    }
    this.room?.update(STEP);
    w.postUpdate();
    if (!count) return;
    V.frame++;
    // Télégraphe = fenêtre réellement accordée par b.tele() (pas la couleur des yeux).
    const b = this.boss, i = V.frame - 1, tele = this.teles.some((t) => i >= t.f && i < t.f + Math.round(t.got * 60));
    this.rec.push(!b ? 'n' : b.hitbox || this.hazards.countActive(true) > 0 ? 'a' : tele ? 't' : this.eye === 'off' ? 'r' : 'n');
  }

  /** Touche maintenue simulée (passe par le vrai module input). */
  hold(code: string) { dispatchEvent(new KeyboardEvent('keydown', { code })); input.reset(); this.keys.add(code); }
  seek(f: number) { V.frame = Math.max(0, f); this.scene.restart({ seek: V.frame }); }
  /** Change d'entité / d'animation / de phase : pré-simule puis rejoue depuis 0. */
  reload() { V.paused = false; this.scene.restart({ seek: Infinity }); }
  next() { V.paused = true; if (V.frame < V.total) this.step(true); }
  prev() { V.paused = true; this.seek(V.frame - 1); }

  update(_t: number, delta: number) {
    if (!V.paused && V.frame < V.total) {
      this.acc += delta * V.speed;
      for (let n = 0; this.acc >= MS && n < 4 && V.frame < V.total; n++) { this.acc -= MS; this.step(true); }
      this.acc = Math.min(this.acc, MS);
    } else if (!V.paused && V.frame >= V.total) {
      if (V.loop) return this.seek(0);
      V.paused = true;
    }
    this.camera();
    this.debug();
    tickPanel();
  }

  onPlayerDeath() {}

  private camera() {
    const cam = this.cameras.main.setZoom(V.zoom);
    if (this.camInit && !V.follow) return;
    this.camInit = true;
    const s = this.player.spr, b = this.boss;
    if (!b) cam.centerOn(s.x, V.zoom === 1 ? H / 2 : s.y - 18);
    else cam.centerOn(V.zoom === 1 ? (b.x + s.x) / 2 : b.x, V.zoom === 1 ? H / 2 : b.y - b.def.hurt.h / 2);
  }

  private debug() {
    const g = this.dbg.clear(), lw = 1 / V.zoom, b = this.boss, p = this.player;
    const box = (r: Phaser.Geom.Rectangle, c: number) => g.lineStyle(lw, c, 1).strokeRect(r.x, r.y, r.width, r.height);
    const cross = (x: number, y: number) => g.lineStyle(lw, 0xffe040, 1).lineBetween(x - 3, y, x + 3, y).lineBetween(x, y - 3, x, y + 3);
    if (V.show.hurt) { box(p.rect(), 0x40ff90); if (b) for (const r of b.hurtRects()) box(r, 0x40ff90); }
    if (V.show.hit) {
      if (b?.hitbox) box(b.hitbox(), 0xff2a5a);
      for (const o of this.hazards.getChildren()) { const y = (o as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body; box(new Phaser.Geom.Rectangle(y.x, y.y, y.width, y.height), 0xff2a5a); }
      // Zone de coup du joueur pendant l'actif (même formule que Player.checkHits).
      const q = pp(this), c = PLAYER.combo[q.combo];
      if (q.state === 'attack' && q.stateT >= c.windup && q.stateT < c.windup + c.active)
        box(new Phaser.Geom.Rectangle(p.facing > 0 ? p.x : p.x - c.reach, p.y - 21, c.reach, 33), 0xffa030);
    }
    if (V.show.pivot) {
      cross(p.spr.x, p.spr.y);
      if (b) { cross(b.x, b.y); for (const o of Object.values(b.parts)) { const m = o.getWorldTransformMatrix(); cross(m.tx, m.ty); } }
    }
  }
}
