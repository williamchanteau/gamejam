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

/** Salle de boss : intro 2 s (sautée au retry), barre nommée, victoire. */
export class BossScene extends ArenaScene {
  boss!: Boss;
  private bar!: BossBar;
  private won = false;
  private def: BossDef = MORDREC;
  private room!: Room;
  private label = 'REZ-DE-CHAUSSÉE · LA NEF';
  private camX = 0;
  worldW = ARENA.bossW;
  plats = ARENA.bossPlatforms;
  spawnX = 120;

  constructor(key = 'Boss1') { super(key); }

  buildBackground() { this.room = buildNave(this); }

  create(data?: { retry?: boolean }) {
    super.create(data);
    this.won = false;
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
      announce(this, this.def, this.label, () => { this.frozen = false; this.boss.start(BOSS.pauseMin); });
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
      const sub = txt(this, W / 2, 110, 'LA SUITE ARRIVE BIENTÔT...', COL.ui).setOrigin(0.5, 0).setDepth(96).setScrollFactor(0);
      for (const o of [band, tx, sub]) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 400 }); }
    });
    this.time.delayedCall(BOSS.victoryTime * 1000, () => {
      this.cameras.main.fadeOut(500, 6, 5, 12);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    });
  }

  onPlayerDeath() { if (!this.won) super.onPlayerDeath(); }
}

