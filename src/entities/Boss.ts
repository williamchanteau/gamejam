import Phaser from 'phaser';
import { BOSS, COL, PLAYER } from '../config';
import { run, tier } from '../floors';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import type { Target } from './types';
import type { ArenaScene } from '../scenes/ArenaScene';

/** Un pattern est une coroutine : chaque `yield` = secondes à attendre (déjà mises à l'échelle). */
export type PatternFn = (b: Boss) => Generator<number, void, unknown>;
export interface PatternDef { name: string; weight: number; phase: 0 | 1 | 2; run: PatternFn; far?: boolean; elevated?: boolean }
export interface BossDef {
  name: string;
  title: string;
  hp: number;
  fireOnly?: boolean;
  hurt: { w: number; h: number };
  /** Crée les pièces (parts) dans b.root, pose de repos incluse. */
  build(b: Boss): void;
  /** Remet les pièces en pose de repos (durée en s, 0 = immédiat). */
  rest(b: Boss, sec: number): void;
  /** Optionnels : pas lourd en marchant, rugissement de phase 2, mort. */
  step?(b: Boss): void;
  roar?(b: Boss): void;
  death?(b: Boss): void;
  /** Portrait pour l'annonceur : conteneur, origine aux pieds. */
  portrait?(s: Phaser.Scene): Phaser.GameObjects.Container;
  patterns: PatternDef[];
}
type Obj = Phaser.GameObjects.Image | Phaser.GameObjects.Container;
type State = 'intro' | 'idle' | 'pattern' | 'phase' | 'dead';

/** Boss générique piloté par données : télégraphe → actif → récupération. */
export class Boss implements Target {
  root: Phaser.GameObjects.Container;
  parts: Record<string, Obj> = {};
  flashParts: Phaser.GameObjects.Image[] = [];
  hp: number; maxHp: number; phase = 1; speed = BOSS.floorSpeed[tier()]; dir = -1;
  /** Plancher de PV : un coup ne peut pas sauter un passage scripté encore dû (épreuve, festin). */
  minHp = 0;
  state: State = 'intro';
  /** Zone de coup active (coordonnées monde), vérifiée chaque frame. */
  hitbox: (() => Phaser.Geom.Rectangle) | null = null;
  /** Cœurs retirés par cette zone (revient à 1 à la fin du pattern). */
  hitHearts = 1;
  private gen: Generator<number, void, unknown> | null = null;
  private waitT = 0;
  private history: string[] = [];
  private temps: Phaser.GameObjects.GameObject[] = [];
  private tws: Phaser.Tweens.Tween[] = [];
  private stepT = 0;

  constructor(public scene: ArenaScene, public def: BossDef, x: number, public floorY: number) {
    this.hp = this.maxHp = def.hp;
    this.root = scene.add.container(x, floorY).setDepth(7);
    def.build(this);
    this.face();
    this.eyes('off');
  }

  get x() { return this.root.x; }
  get y() { return this.root.y; }
  get player() { return this.scene.player; }
  /** Parties touchables (par défaut une colonne). */
  hurtRects() { const { w, h } = this.def.hurt; return [new Phaser.Geom.Rectangle(this.x - w / 2, this.y - h, w, h)]; }
  hurtRect(q?: Phaser.Geom.Rectangle) { const a = this.hurtRects(); return (q && a.find((r) => Phaser.Geom.Rectangle.Overlaps(r, q))) || a[0]; }
  alive() { return this.state === 'idle' || this.state === 'pattern'; }

  /** Lance le combat après `delay` s. */
  start(delay: number) { this.state = 'idle'; this.waitT = delay; this.eyes('on'); }

  // --- Durées : ×vitesse de phase, télégraphes et pauses bornés après mise à l'échelle.
  t(s: number) { return s / this.speed; }
  tele(s: number) { return Math.max((s * BOSS.floorTele[tier()]) / this.speed, this.phase === 1 ? BOSS.teleMinP1 : BOSS.teleMinP2); }

  // --- Outils pour les patterns.
  face() {
    this.dir = Math.sign(this.player.x - this.x) || this.dir;
    this.root.setScale(this.dir, 1);
  }
  tw(targets: object | object[], props: Record<string, unknown>, sec: number, ease = 'Quad.out') {
    const tw = this.scene.tweens.add({ targets, ...props, duration: Math.max(1, sec * 1000), ease });
    this.tws.push(tw);
    return tw;
  }
  /** Objet temporaire détruit à la fin / interruption du pattern. */
  temp<T extends Phaser.GameObjects.GameObject>(o: T) { this.temps.push(o); return o; }
  /** Projectile dangereux (hitbox réduite w×h, ancrée en bas). */
  hazard(key: string, x: number, y: number, vx: number, w: number, h: number, life = 3) {
    const o = this.scene.hazards.create(x, y, key) as Phaser.Physics.Arcade.Image;
    o.setOrigin(0.5, 1).setDepth(15).setFlipX(vx < 0).setData('life', life);
    (o.body as Phaser.Physics.Arcade.Body).setSize(w, h).setOffset((o.width - w) / 2, o.height - h);
    o.setVelocityX(vx);
    return o;
  }
  eyes(mode: 'on' | 'tele' | 'off') {
    const e = this.parts.eyes as Phaser.GameObjects.Image | undefined, g = this.parts.glow as Phaser.GameObjects.Image | undefined;
    if (!e || !g) return;
    const col = mode === 'tele' ? COL.danger : this.phase === 2 ? 0xf0e0ff : 0xd8d0ff;
    e.setVisible(mode !== 'off').setTint(col);
    g.setVisible(mode !== 'off').setTint(col).setAlpha(mode === 'tele' ? 0.9 : 0.55);
  }
  clampX(x: number) { return Phaser.Math.Clamp(x, 40, this.scene.worldW - 40); }

  update(dt: number) {
    if (this.hitbox && this.alive() && Phaser.Geom.Rectangle.Overlaps(this.hitbox(), this.player.rect())) this.player.hurt(this.x, this.hitHearts);
    if (this.state === 'idle') {
      this.face();
      const dx = this.player.x - this.x;
      if (Math.abs(dx) > BOSS.walkRange) {
        this.root.x = this.clampX(this.x + Math.sign(dx) * BOSS.walkSpeed * this.speed * dt);
        this.stepT -= dt;
        if (this.stepT <= 0) { this.stepT = 0.4; this.def.step?.(this); }
      }
      this.waitT -= dt;
      if (this.waitT <= 0) this.next();
    } else if (this.state === 'pattern' && this.gen) {
      this.waitT -= dt;
      while (this.gen && this.waitT <= 0) {
        const r = this.gen.next();
        if (r.done) this.endPattern();
        else this.waitT += r.value;
      }
    }
  }

  private next() {
    const h = this.history;
    const far = Math.abs(this.player.x - this.x) > BOSS.farRange;
    let ok = this.def.patterns.filter((p) => (p.phase === 0 || p.phase === this.phase) && !(h[0] === p.name && h[1] === p.name));
    if (this.player.rect().bottom < this.floorY - 45 && ok.some((p) => p.elevated)) ok = ok.filter((p) => p.elevated);
    if (far && ok.some((p) => p.far)) ok = ok.filter((p) => p.far);
    let r = Math.random() * ok.reduce((s, p) => s + p.weight, 0);
    const p = ok.find((q) => (r -= q.weight) < 0) ?? ok[0];
    h.unshift(p.name); h.length = Math.min(h.length, 2);
    this.face();
    this.state = 'pattern'; this.waitT = 0;
    this.gen = p.run(this);
  }

  private endPattern() {
    this.cleanup();
    this.state = 'idle';
    const [a, b] = BOSS.idlePause;
    this.waitT = Math.max(BOSS.pauseMin, this.t(Phaser.Math.FloatBetween(a, b)));
  }

  /** Coupe le pattern en cours : tweens, hitbox, objets temporaires, retour au sol. */
  private cleanup() {
    this.gen = null; this.hitbox = null; this.hitHearts = 1;
    for (const tw of this.tws) tw.remove();
    for (const o of this.temps) o.destroy();
    this.tws = []; this.temps = [];
  }

  private abort() {
    this.cleanup();
    this.root.y = this.floorY;
    this.def.rest(this, 0);
  }

  /** Passage scripté : coupe tout et lance ce pattern. */
  force(run: PatternFn) { this.abort(); this.state = 'pattern'; this.waitT = 0; this.gen = run(this); }

  hit(dmg: number, _fromX: number): boolean | void {
    if (this.def.fireOnly) return;
    this.damage(dmg);
  }

  burn(dmg: number) { this.damage(dmg); }

  private damage(dmg: number) {
    if (!this.alive()) return;
    this.hp = Math.max(this.minHp, this.hp - dmg * (run.easy ? PLAYER.easyDmg : 1));
    for (const p of this.flashParts) p.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => { for (const p of this.flashParts) p.clearTint(); });
    if (this.parts.rig) this.scene.tweens.add({ targets: this.parts.rig, x: { from: -3, to: 0 }, duration: 110, ease: 'Quad.out' });
    sfx.clank();
    if (this.hp <= 0) this.die();
    else if (this.phase === 1 && this.hp <= this.maxHp / 2) this.toPhase2();
  }

  private toPhase2() {
    this.abort();
    this.state = 'phase'; this.phase = 2; this.speed = BOSS.floorSpeed[tier()] * BOSS.p2Speed[tier()];
    this.eyes('tele');
    sfx.roar(); music.setPhase(2);
    this.scene.cameras.main.shake(BOSS.p2Invuln * 800, 0.01);
    this.scene.sparks(this.x, this.y - this.def.hurt.h * 0.8, 0xd8d0ff, 24);
    if (this.def.roar) this.def.roar(this);
    else this.scene.tweens.add({ targets: this.root, x: this.x + 2, duration: 40, yoyo: true, repeat: 10 });
    this.scene.time.delayedCall(BOSS.p2Invuln * 1000, () => {
      if (this.state !== 'phase') return;
      this.eyes('on'); this.state = 'idle'; this.waitT = BOSS.pauseMin;
    });
  }

  private die() {
    this.abort();
    this.state = 'dead';
    this.eyes('off');
    this.scene.hazards.clear(true, true);
    sfx.bossDeath(); music.stop(0.8);
    this.scene.cameras.main.shake(600, 0.012);
    if (this.def.death) return this.def.death(this);
    const h = this.def.hurt.h;
    this.scene.time.addEvent({
      delay: 120, repeat: 8,
      callback: () => this.scene.sparks(this.x + Phaser.Math.Between(-20, 20), this.y - Phaser.Math.Between(10, h), 0xd8d0ff, 10),
    });
    this.scene.time.delayedCall(1000, () => {
      this.scene.sparks(this.x, this.y - h / 2, 0xffffff, 40);
      this.scene.tweens.add({ targets: this.root, alpha: 0, y: this.y + 8, duration: 700 });
    });
  }
}
