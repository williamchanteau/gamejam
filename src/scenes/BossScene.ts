import Phaser from 'phaser';
import { W, COL, BOSS, DEV } from '../config';
import { ArenaScene } from './ArenaScene';
import { Boss, type BossDef } from '../entities/Boss';
import { BossBar } from '../ui/BossBar';
import { txt } from '../art/font';
import { input } from '../input';
import { sfx } from '../audio/sfx';
import { MORDREC } from '../bosses/mordrec';
import { buildNave, type Room } from './rooms';

/** Salle de boss : intro 2 s (sautée au retry), barre nommée, victoire. */
export class BossScene extends ArenaScene {
  boss!: Boss;
  private bar!: BossBar;
  private won = false;
  private def: BossDef = MORDREC;
  private room!: Room;

  constructor(key = 'Boss1') { super(key); }

  buildBackground() { this.room = buildNave(this); }

  create(data?: { retry?: boolean }) {
    super.create(data);
    this.won = false;
    this.boss = new Boss(this, this.def, 380, this.floorY);
    this.targets.push(this.boss);
    this.bar = new BossBar(this, this.boss);
    if (data?.retry) {
      this.bar.fillUp(0);
      this.boss.start(BOSS.retryDelay);
    } else {
      this.intro();
      this.bar.fillUp(BOSS.introTime * 0.8);
      this.time.delayedCall(BOSS.introTime * 1000, () => this.boss.start(BOSS.pauseMin));
    }
  }

  private intro() {
    const band = this.add.rectangle(0, 78, W, 46, 0x06050c, 0.75).setOrigin(0).setDepth(95);
    const n = txt(this, W / 2, 80, this.def.name, COL.moonLight).setOrigin(0.5, 0).setScale(3).setDepth(96);
    const t = txt(this, W / 2, 108, this.def.title, COL.ui).setOrigin(0.5, 0).setDepth(96);
    const all = [band, n, t];
    for (const o of all) o.setAlpha(0);
    this.tweens.add({ targets: all, alpha: 1, duration: 300 });
    this.tweens.add({ targets: all, alpha: 0, delay: BOSS.introTime * 1000 - 400, duration: 400, onComplete: () => all.forEach((o) => o.destroy()) });
    this.time.delayedCall(500, () => { this.boss.eyes('on'); sfx.warn(); });
  }

  tick(dt: number) {
    if (DEV && input.take('debug1') && this.boss.alive()) this.boss.hp = 1;
    this.boss.update(dt);
    this.bar.update(dt);
    this.room.update(this.player.x, dt);
    for (const o of [...this.hazards.getChildren()] as Phaser.Physics.Arcade.Image[]) {
      const life = o.getData('life') - dt;
      o.setData('life', life);
      if (life <= 0 || o.x < -40 || o.x > W + 40) o.destroy();
    }
    if (!this.won && this.boss.state === 'dead') this.victory();
  }

  private victory() {
    this.won = true;
    this.player.safe = true;
    this.time.delayedCall(1300, () => {
      sfx.victory();
      const band = this.add.rectangle(0, 84, W, 40, 0x06050c, 0.75).setOrigin(0).setDepth(95);
      const tx = txt(this, W / 2, 88, `${this.def.name} EST TOMBÉ`, COL.moonLight).setOrigin(0.5, 0).setScale(2).setDepth(96);
      const sub = txt(this, W / 2, 110, 'LA SUITE ARRIVE BIENTÔT...', COL.ui).setOrigin(0.5, 0).setDepth(96);
      for (const o of [band, tx, sub]) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 400 }); }
    });
    this.time.delayedCall(BOSS.victoryTime * 1000, () => {
      this.cameras.main.fadeOut(500, 6, 5, 12);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    });
  }

  onPlayerDeath() { if (!this.won) super.onPlayerDeath(); }
}

