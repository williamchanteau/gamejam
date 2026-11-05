import Phaser from 'phaser';
import { W, COL, BOSS, DEV, ARENA } from '../config';
import { ArenaScene } from './ArenaScene';
import { Boss, type BossDef } from '../entities/Boss';
import { BossBar } from '../ui/BossBar';
import { txt } from '../art/font';
import { input } from '../input';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { YSOLDE } from '../bosses/ysolde';
import { buildNave, type Room } from './rooms';
import { announce } from '../ui/Announcer';
import { srSplit } from '../speedrun';
import { FLOORS, run } from '../floors';
import { STAIRS, GATE_TOP } from '../art/outside';
import { inArch } from '../art/room';

/** Salle de boss : annonceur (sauté au retry), barre nommée, victoire → grille levée → escalier. */
export class BossScene extends ArenaScene {
  boss!: Boss;
  /** Absente tant que le combat n'est pas annoncé. */
  bar?: BossBar;
  private won = false;
  protected def: BossDef = YSOLDE;
  protected room!: Room;
  protected floor = 0;
  private gate!: Phaser.GameObjects.Image;
  private gateOpen = false;
  private climbing = false;
  protected camX = 0;
  protected bossX = 440;
  /** false = la salle ouvre la grille elle-même (openGate). */
  protected autoGate = true;
  /** Piste qui suit le jingle de victoire ('' = silence). */
  protected afterWin = 'explore';
  /** Sous-titre de la victoire. */
  protected victoryHint() { return "L'ESCALIER S'OUVRE →"; }
  private bannerObjs: Phaser.GameObjects.GameObject[] = [];
  worldW = ARENA.bossW;
  plats = ARENA.bossPlatforms;
  spawnX = 120;

  constructor(key = 'Boss1') { super(key); }

  buildBackground() { this.room = buildNave(this); }

  create(data?: { retry?: boolean }) {
    run.floor = this.floor; // rang de difficulté (vitesse, télégraphes, invulnérabilité)
    super.create(data);
    this.won = false; this.gateOpen = false; this.climbing = false; this.bannerObjs = [];
    // Herse masquée à la forme de l'ogive (une bande par ligne) : levée, elle disparaît dans la maçonnerie.
    const { x: sx, hw, base } = STAIRS, arch = this.make.graphics({}, false).fillStyle(0xffffff);
    for (let y = GATE_TOP; y < this.floorY; y++) {
      let a = sx - hw;
      while (a <= sx && !inArch(a, y, sx, base, hw)) a++;
      if (a <= sx) arch.fillRect(a, y, 2 * (sx - a) + 1, 1);
    }
    this.gate = this.add.image(sx - hw, GATE_TOP, 'gate').setOrigin(0).setDepth(4.5).setMask(arch.createGeometryMask());
    this.bar = undefined;
    this.boss = new Boss(this, this.def, this.bossX, this.floorY);
    this.targets.push(this.boss);
    this.camX = this.camTarget();
    this.cameras.main.setScroll(Math.round(this.camX), 0);
    this.intro(data);
  }

  /** Barre + annonceur (sauté au retry), puis begin(). */
  protected intro(data?: { retry?: boolean }) {
    this.bar = new BossBar(this, this.boss);
    if (data?.retry) {
      this.bar.fillUp(0);
      this.boss.start(BOSS.retryDelay);
      music.fight(this.scene.key);
    } else {
      this.frozen = true;
      this.bar.fillUp(1.6);
      this.time.delayedCall(450, () => { this.boss.eyes('tele'); sfx.warn(); });
      const f = FLOORS[this.floor];
      // Combat sur l'horloge de la scène : une pause pendant l'annonceur le retarde aussi.
      music.stinger('announce');
      announce(this, this.def, `${f.name} · ${f.place}`, () => { this.begin(); this.time.delayedCall(700, () => { if (this.boss.alive()) music.fight(this.scene.key); }); });
    }
  }

  protected begin() { this.frozen = false; this.boss.start(BOSS.pauseMin); }

  tick(dt: number) {
    if (DEV && input.take('debug1') && this.boss.alive()) { this.boss.hp = 1; this.boss.minHp = 0; }
    this.boss.update(dt);
    this.bar?.update(dt);
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

  /** Ce que la caméra cadre avec le joueur. */
  protected camFocus() { return this.boss.state === 'dead' ? this.player.x : this.boss.x; }

  protected camTarget() {
    const p = this.player.x, b = this.camFocus();
    let t = (p + b) / 2 - W / 2;
    t = Phaser.Math.Clamp(t, p - (W - BOSS.camEdge), p - BOSS.camEdge);
    return Phaser.Math.Clamp(t, 0, this.worldW - W);
  }

  private victory() {
    this.won = true;
    srSplit(this.floor);
    this.player.safe = true;
    this.time.delayedCall(1300, () => { music.stinger('victory', this.afterWin); this.banner(`${this.def.name} EST TOMBÉ`, this.victoryHint()); });
    if (this.autoGate) this.time.delayedCall(2200, () => this.openGate());
  }

  /** Bandeau de victoire (remplace le précédent s'il est encore là). */
  protected banner(title: string, sub: string) {
    for (const o of this.bannerObjs) o.destroy();
    const band = this.add.rectangle(0, 84, W, 40, 0x06050c, 0.75).setOrigin(0).setDepth(95).setScrollFactor(0);
    const tx = txt(this, W / 2, 88, title, COL.moonLight).setOrigin(0.5, 0).setScale(2).setDepth(96).setScrollFactor(0);
    const st = txt(this, W / 2, 110, sub, COL.ui).setOrigin(0.5, 0).setDepth(96).setScrollFactor(0);
    this.bannerObjs = [band, tx, st];
    for (const o of [band, tx, st]) {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, duration: 400 });
      this.tweens.add({ targets: o, alpha: 0, delay: 2600, duration: 500 });
    }
  }

  /** La grille de l'escalier se lève. */
  protected openGate() {
    sfx.rumble();
    this.cameras.main.shake(700, 0.003);
    this.puffs(STAIRS.x, this.floorY, 6);
    this.tweens.add({ targets: this.gate, y: GATE_TOP - this.gate.height, duration: 1400, ease: 'Quad.inOut', onComplete: () => { this.gateOpen = true; } });
    const hint = txt(this, STAIRS.x - 14, STAIRS.base - 62, 'MONTER →', COL.moonLight).setOrigin(0.5, 0).setDepth(20);
    this.tweens.add({ targets: hint, x: STAIRS.x + 4, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Montée : le joueur gravit les premières marches et s'enfonce dans l'ombre de la tour, fondu, écran d'étage. */
  private climb() {
    this.climbing = true;
    this.frozen = true;
    const p = this.player, spr = p.spr;
    p.walkTo(STAIRS.x + 16, spr.y - 30, 700, {
      to: { alpha: 0, scale: 0.88 },
      each: (k) => { const c = Math.round(255 - k * 180); spr.setTint(Phaser.Display.Color.GetColor(c, c * 0.85, c * 0.75)); },
    });
    this.time.delayedCall(450, () => {
      this.cameras.main.fadeOut(400, 6, 5, 12);
      this.cameras.main.once('camerafadeoutcomplete', () => FLOORS[this.floor + 1] ? this.scene.start('Transit', { floor: this.floor + 1 }) : this.scene.start('Dawn'));
    });
  }

  onPlayerDeath() { if (!this.won) super.onPlayerDeath(); }
}

