import Phaser from 'phaser';
import { PLAYER as C, PHYS, COL, DEV } from '../config';
import { input } from '../input';
import { sfx } from '../audio/sfx';
import type { Target } from './types';
import type { ArenaScene } from '../scenes/ArenaScene';

type State = 'normal' | 'dash' | 'attack' | 'cast' | 'hurt' | 'dead';
const BW = 12, BH = 27;

export class Player {
  zone: Phaser.GameObjects.Zone;
  body: Phaser.Physics.Arcade.Body;
  spr: Phaser.GameObjects.Image;
  scarf: Phaser.GameObjects.Graphics;
  hp = C.hp; mana = 0; facing = 1; state: State = 'normal'; god = false;
  private stateT = 0; private coyote = 0; private airDashes = 0; private airJumps = 0;
  private dashCd = 0; private dashDir = 1; private afterT = 0; private invuln = 0;
  private jumpHeld = false; private wasGrounded = true; private lastVy = 0;
  private combo = 0; private comboT = 0; private swingHits = new Set<Target>(); private animT = 0;
  private dropUntil = 0; private squashTw?: Phaser.Tweens.Tween;
  private pts: { x: number; y: number }[] = [];

  constructor(private scene: ArenaScene, x: number, y: number) {
    this.zone = scene.add.zone(x, y - BH / 2, BW, BH);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true).setMaxVelocity(1000, 1000);
    this.scarf = scene.add.graphics().setDepth(9);
    this.spr = scene.add.image(x, y, 'p_idle0').setOrigin(0.5, 1).setDepth(10);
    for (let i = 0; i < 7; i++) this.pts.push({ x, y: y - 23 });
  }

  get x() { return this.body.x + BW / 2; }
  get y() { return this.body.y + BH / 2; }
  get grounded() { return this.body.blocked.down || this.body.touching.down; }
  /** Vrai pendant le dash, l'invulnérabilité ou en mode invincible. */
  get invulnerable() { return this.state === 'dash' || this.invuln > 0 || this.god || this.state === 'dead'; }
  get canDash() { return this.dashCd <= 0 && (this.grounded || this.airDashes > 0); }
  get canDrop() { return this.scene.time.now < this.dropUntil; }

  update(dt: number) {
    const b = this.body, ground = this.grounded;
    this.stateT += dt; this.dashCd -= dt; this.invuln -= dt; this.comboT += dt;
    if (ground) {
      this.coyote = C.coyote; this.airDashes = C.airDashes; this.airJumps = C.doubleJump ? 1 : 0;
      if (!this.wasGrounded && this.lastVy > 180) this.land();
    } else this.coyote -= dt;
    this.wasGrounded = ground;
    const dir = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    if (DEV && input.take('debug2')) this.god = !this.god;

    switch (this.state) {
      case 'normal': this.move(dir, 1, dt); this.actions(dir); break;
      case 'attack': this.updateAttack(dir, dt); break;
      case 'dash': this.updateDash(dt); break;
      case 'cast':
        b.velocity.x *= 0.85;
        if (this.stateT >= C.spell.castTime) this.state = 'normal';
        break;
      case 'hurt':
        if (this.grounded) b.velocity.x *= Math.exp(-dt * 10);
        if (this.stateT >= C.hurtStun) this.state = 'normal';
        break;
      case 'dead': b.velocity.x *= 0.9; break;
    }
    // Saut à hauteur variable + gravité de chute renforcée.
    if (this.jumpHeld && (!input.isDown('jump') || b.velocity.y >= 0)) {
      if (b.velocity.y < 0) b.velocity.y *= C.jumpCut;
      this.jumpHeld = false;
    }
    b.setGravityY(b.velocity.y > 0 ? PHYS.gravity * (PHYS.fallGravityMult - 1) : 0);
    if (b.velocity.y > PHYS.maxFall) b.velocity.y = PHYS.maxFall;
    this.lastVy = b.velocity.y;
    this.render(dt);
  }

  private move(dir: number, mult: number, dt: number) {
    const b = this.body, target = dir * C.runSpeed * mult;
    const acc = dir === 0 && this.grounded ? C.decelGround : this.grounded ? C.accelGround : C.accelAir;
    const dv = target - b.velocity.x;
    b.velocity.x += Math.sign(dv) * Math.min(Math.abs(dv), acc * dt);
    if (dir && this.state === 'normal') this.facing = dir;
  }

  private actions(dir: number) {
    if (this.canDash && input.take('dash')) return this.dash(dir);
    if (this.mana >= C.manaMax && input.take('spell')) return this.cast();
    if (input.take('attack', C.attackBuffer)) return this.swing(this.comboT < C.comboReset ? (this.combo + 1) % 3 : 0);
    this.tryJump();
  }

  private tryJump() {
    // ↓ sur une plateforme : on la traverse.
    if (this.grounded && this.y + BH / 2 < this.scene.floorY - 2 && input.take('down')) {
      this.dropUntil = this.scene.time.now + C.dropThrough * 1000;
      return;
    }
    // Ne consommer l'appui que si un saut est possible (sinon il reste en buffer).
    if (this.coyote <= 0 && this.airJumps <= 0) return;
    if (!input.take('jump', C.jumpBuffer)) return;
    if (this.coyote > 0) this.jump(C.jumpVel);
    else if (this.airJumps > 0) { this.airJumps--; this.jump(C.doubleJumpVel); }
  }

  private dash(dir: number) {
    if (!this.grounded) this.airDashes--;
    this.dashDir = dir || this.facing; this.facing = this.dashDir;
    this.state = 'dash'; this.stateT = 0; this.afterT = 0;
    this.body.setAllowGravity(false).setVelocity(this.dashDir * (C.dashDist / C.dashTime), 0);
    this.jumpHeld = false;
    this.squash(1.35, 0.75, C.dashTime * 1000);
    sfx.dash();
  }

  private updateDash(dt: number) {
    this.body.setVelocity(this.dashDir * (C.dashDist / C.dashTime), 0);
    this.afterT -= dt;
    if (this.afterT <= 0) {
      this.afterT = C.afterimageEvery;
      const g = this.scene.add.image(this.spr.x, this.spr.y, this.spr.texture.key).setOrigin(0.5, 1)
        .setFlipX(this.spr.flipX).setTintFill(COL.moon).setAlpha(0.55).setDepth(8);
      this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    }
    if (this.stateT >= C.dashTime) {
      this.endDash();
      this.body.velocity.x = this.dashDir * C.runSpeed;
    }
  }

  private endDash() {
    this.dashCd = C.dashCooldown;
    this.body.setAllowGravity(true);
    this.state = 'normal';
  }

  private swing(i: number) {
    const s = C.combo[i];
    this.combo = i; this.comboT = 0; this.stateT = 0; this.state = 'attack';
    this.swingHits.clear();
    const dir = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    if (dir) this.facing = dir;
    if (this.grounded) this.body.velocity.x = this.facing * s.lunge;
    const fx = this.scene.add.image(this.x + this.facing * 12, this.y - 3, 'slash').setDepth(11)
      .setFlipX(this.facing < 0).setFlipY(i === 1).setScale(i === 2 ? 1.3 : 1).setAlpha(0);
    this.scene.tweens.add({ targets: fx, alpha: { from: 1, to: 0 }, delay: s.windup * 1000, duration: 140, onComplete: () => fx.destroy() });
    this.scene.time.delayedCall(s.windup * 1000, () => sfx.swing(i));
  }

  private updateAttack(dir: number, dt: number) {
    const s = C.combo[this.combo], t = this.stateT;
    if (dir) this.move(dir, C.attackMoveMult, dt);
    else if (this.grounded) this.body.velocity.x *= Math.exp(-dt * 12); // l'élan du coup s'amortit
    if (t >= s.windup && t < s.windup + s.active) this.checkHits(s.reach, s.damage);
    if (this.canDash && input.take('dash')) return this.dash(dir);
    const end = s.windup + s.active;
    if (t >= end + C.chainAfter) {
      if (this.combo < 2 && input.take('attack', C.attackBuffer)) return this.swing(this.combo + 1);
      if (this.coyote > 0 && input.take('jump', C.jumpBuffer)) { this.state = 'normal'; this.jump(C.jumpVel); return; }
    }
    if (t >= end + s.recover) { this.state = 'normal'; this.comboT = 0; if (this.combo === 2) this.comboT = 99; }
  }

  private jump(v: number) {
    this.body.velocity.y = -v; this.coyote = 0; this.jumpHeld = true;
    this.squash(0.75, 1.25, 150); sfx.jump();
  }

  private checkHits(reach: number, dmg: number) {
    const r = new Phaser.Geom.Rectangle(this.facing > 0 ? this.x : this.x - reach, this.y - 21, reach, 33);
    for (const t of this.scene.targets) {
      if (!t.alive() || this.swingHits.has(t) || !Phaser.Geom.Rectangle.Overlaps(r, t.hurtRect())) continue;
      this.swingHits.add(t);
      t.hit(dmg, this.x);
      this.gainMana(C.manaPerHit);
      const hr = t.hurtRect();
      this.scene.sparks(Phaser.Math.Clamp(this.x + this.facing * reach * 0.6, hr.left, hr.right), this.y - 6, COL.moonLight, 6);
      this.scene.hitstop(C.hitstopOnHit);
      sfx.hit();
    }
  }

  gainMana(n: number) {
    const was = this.mana;
    this.mana = Math.min(C.manaMax, this.mana + n);
    if (was < C.manaMax && this.mana >= C.manaMax) sfx.manaFull();
  }

  private cast() {
    this.mana = 0; this.state = 'cast'; this.stateT = 0;
    this.body.velocity.x = -this.facing * C.spell.recoil;
    this.scene.spawnSpell(this.x + this.facing * 15, this.y - 4, this.facing);
    this.squash(1.2, 0.85, 160);
    sfx.spell();
  }

  hurt(fromX: number) {
    if (this.invulnerable) return;
    this.hp--; this.invuln = C.invuln;
    if (this.state === 'dash') this.endDash();
    this.body.setAllowGravity(true);
    const k = Math.sign(this.x - fromX) || -this.facing;
    this.body.setVelocity(k * C.knockbackX, -C.knockbackY);
    this.state = 'hurt'; this.stateT = 0; this.jumpHeld = false;
    this.scene.hitstop(C.hitstop);
    this.scene.cameras.main.shake(140, 0.012);
    this.scene.sparks(this.x, this.y, 0xffffff, 8);
    this.spr.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.spr.clearTint());
    sfx.hurt();
    if (this.hp <= 0) this.die();
  }

  private die() {
    this.state = 'dead'; this.invuln = 0;
    this.scene.sparks(this.x, this.y - 6, COL.moon, 16);
    this.scene.tweens.add({ targets: this.spr, alpha: 0, angle: -90 * this.facing, duration: 400 });
    this.scene.tweens.add({ targets: this.scarf, alpha: 0, duration: 300 });
    sfx.death();
    this.scene.onPlayerDeath();
  }

  private land() {
    this.squash(1.3, 0.75, 120);
    this.scene.dust(this.x, this.y + BH / 2);
    sfx.land();
  }

  private squash(sx: number, sy: number, ms: number) {
    this.squashTw?.stop();
    this.spr.setScale(sx, sy);
    this.squashTw = this.scene.tweens.add({ targets: this.spr, scaleX: 1, scaleY: 1, duration: ms, ease: 'Quad.out' });
  }

  private render(dt: number) {
    const b = this.body, s = this.spr;
    s.setPosition(Math.round(this.x), Math.round(this.y + BH / 2 + 1)).setFlipX(this.facing < 0);
    if (this.state !== 'dead') {
      let k: string;
      if (this.state === 'dash') k = 'dash';
      else if (this.state === 'attack' || this.state === 'cast') k = 'atk';
      else if (this.state === 'hurt') k = 'hurt';
      else if (!this.grounded) k = b.velocity.y < -30 ? 'jump' : 'fall';
      else if (Math.abs(b.velocity.x) > 22) { this.animT += dt * 10 * Math.abs(b.velocity.x) / C.runSpeed; k = 'run' + (Math.floor(this.animT) % 4); }
      else { this.animT += dt * 1.6; k = 'idle' + (Math.floor(this.animT) % 2); }
      s.setTexture('p_' + k);
      s.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 16) % 2 ? 0.35 : 1);
    }
    this.drawScarf(dt);
  }

  // Écharpe : chaîne de points qui traîne derrière et ondule.
  private drawScarf(dt: number) {
    const s = this.spr, f = this.facing, b = this.body, pts = this.pts, t = this.scene.time.now / 1000;
    pts[0].x = s.x - f * 3; pts[0].y = s.y - 23;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i], q = pts[i - 1];
      let dx = -f * 0.9 - b.velocity.x * 0.0027, dy = 0.35 + Math.sin(t * 9 - i) * 0.35 - b.velocity.y * 0.002;
      const l = Math.hypot(dx, dy) || 1;
      const tx = q.x + (dx / l) * 3.75, ty = q.y + (dy / l) * 3.75;
      const k = Math.min(1, dt * 30);
      p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
      const ex = p.x - q.x, ey = p.y - q.y, el = Math.hypot(ex, ey) || 1;
      if (el > 4.5) { p.x = q.x + (ex / el) * 4.5; p.y = q.y + (ey / el) * 4.5; }
    }
    const g = this.scarf.clear();
    g.setAlpha(s.alpha);
    for (const pass of [0, 1])
      pts.forEach((p, i) => {
        const w = i < 3 ? 3 : i < 5 ? 2 : 1, x = Math.round(p.x), y = Math.round(p.y);
        if (pass === 0) g.fillStyle(0x06050c).fillRect(x - 1, y - 1, w + 2, w + 2);
        else g.fillStyle(i % 2 ? 0x5fd8f0 : 0x9ff2ff).fillRect(x, y, w, w);
      });
  }
}
