import Phaser from 'phaser';
import { W, COL, BOSS, DEV, ARENA } from '../config';
import { ArenaScene } from './ArenaScene';
import { Boss, type BossDef } from '../entities/Boss';
import { BossBar } from '../ui/BossBar';
import { txt } from '../art/font';
import { input } from '../input';
import { sfx } from '../audio/sfx';
import { MORDREC } from '../bosses/mordrec';
import { buildNave, type Room } from './rooms';
import { announce } from '../ui/Announcer';
import { FLOORS } from '../floors';
import { STAIRS } from '../art/outside';

/** Salle de boss : annonceur (sauté au retry), barre nommée, victoire → grille levée → escalier. */
export class BossScene extends ArenaScene {
  boss!: Boss;
  private bar!: BossBar;
  private won = false;
  protected def: BossDef = MORDREC;
  private room!: Room;
  protected floor = 0;
  private gate!: Phaser.GameObjects.Image;
  private gateOpen = false;
  private climbing = false;
  private camX = 0;
  worldW = ARENA.bossW;
  plats = ARENA.bossPlatforms;
  spawnX = 120;

  constructor(key = 'Boss1') { super(key); }

  buildBackground() { this.room = buildNave(this); }

  create(data?: { retry?: boolean }) {
    super.create(data);
    this.won = false; this.gateOpen = false; this.climbing = false;
    this.gate = this.add.image(STAIRS.x, this.floorY - 62, 'gate').setOrigin(0.5, 0).setDepth(4.5);
    this.boss = new Boss(this, this.def, 440, this.floorY);
    this.targets.push(this.boss);
    this.bar = new BossBar(this, this.boss);
    this.camX = this.camTarget();
    this.cameras.main.setScroll(Math.round(this.camX), 0);
    if (data?.retry) {
      this.bar.fillUp(0);
      this.boss.start(BOSS.retryDelay);
    } else {
      this.frozen = true;
      this.bar.fillUp(1.6);
      this.time.delayedCall(450, () => { this.boss.eyes('tele'); sfx.warn(); });
      const f = FLOORS[this.floor];
      announce(this, this.def, `${f.name} · ${f.place}`, () => { this.frozen = false; this.boss.start(BOSS.pauseMin); });
    }
  }

  tick(dt: number) {
    if (DEV && input.take('debug1') && this.boss.alive()) this.boss.hp = 1;
    this.boss.update(dt);
    this.bar.update(dt);
    this.room.update(dt);
    // Caméra : centre joueur/boss, le joueur reste à ≥ camEdge px des bords.
    this.camX += (this.camTarget() - this.camX) * Math.min(1, dt * BOSS.camLerp);
    this.cameras.main.setScroll(Math.round(this.camX), 0);
    for (const o of [...this.hazards.getChildren()] as Phaser.Physics.Arcade.Image[]) {
      (o.getData('tick') as ((dt: number) => void) | undefined)?.(dt);
      const life = o.getData('life') - dt;
      o.setData('life', life);
      if (life <= 0 || o.x < -40 || o.x > this.worldW + 40) o.destroy();
    }
    if (!this.won && this.boss.state === 'dead') this.victory();
    if (this.gateOpen && !this.climbing && this.player.x > STAIRS.x - 6) this.climb();
  }

  private camTarget() {
    const p = this.player.x, b = this.boss.state === 'dead' ? p : this.boss.x;
    let t = (p + b) / 2 - W / 2;
    t = Phaser.Math.Clamp(t, p - (W - BOSS.camEdge), p - BOSS.camEdge);
    return Phaser.Math.Clamp(t, 0, this.worldW - W);
  }

  private victory() {
    this.won = true;
    this.player.safe = true;
    this.time.delayedCall(1300, () => {
      sfx.victory();
      const band = this.add.rectangle(0, 84, W, 40, 0x06050c, 0.75).setOrigin(0).setDepth(95).setScrollFactor(0);
      const tx = txt(this, W / 2, 88, `${this.def.name} EST TOMBÉ`, COL.moonLight).setOrigin(0.5, 0).setScale(2).setDepth(96).setScrollFactor(0);
      const sub = txt(this, W / 2, 110, "L'ESCALIER S'OUVRE →", COL.ui).setOrigin(0.5, 0).setDepth(96).setScrollFactor(0);
      for (const o of [band, tx, sub]) {
        o.setAlpha(0);
        this.tweens.add({ targets: o, alpha: 1, duration: 400 });
        this.tweens.add({ targets: o, alpha: 0, delay: 2600, duration: 500 });
      }
    });
    // La grille de l'escalier se lève.
    this.time.delayedCall(2200, () => {
      sfx.rumble();
      this.cameras.main.shake(700, 0.003);
      this.puffs(STAIRS.x, this.floorY, 6);
      this.tweens.add({ targets: this.gate, scaleY: 0.05, duration: 1100, ease: 'Quad.inOut', onComplete: () => { this.gateOpen = true; } });
      const hint = txt(this, STAIRS.x - 14, STAIRS.base - 62, 'MONTER →', COL.moonLight).setOrigin(0.5, 0).setDepth(20);
      this.tweens.add({ targets: hint, x: STAIRS.x + 4, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
  }

  /** Montée : le joueur s'engouffre dans l'escalier, fondu, écran d'étage. */
  private climb() {
    this.climbing = true;
    this.frozen = true;
    const p = this.player.spr;
    this.tweens.add({ targets: p, x: STAIRS.x + 18, y: p.y - 24, alpha: 0, duration: 500, ease: 'Quad.in' });
    this.tweens.add({ targets: this.player.scarf, alpha: 0, duration: 300 });
    this.time.delayedCall(350, () => {
      this.cameras.main.fadeOut(350, 6, 5, 12);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Transit', { floor: this.floor + 1 }));
    });
  }

  onPlayerDeath() { if (!this.won) super.onPlayerDeath(); }
}

