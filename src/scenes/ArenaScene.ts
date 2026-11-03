import Phaser from 'phaser';
import { W, H, ARENA, PLAYER, COL } from '../config';
import { input } from '../input';
import { Player } from '../entities/Player';
import { Hud } from '../ui/Hud';
import type { Target } from '../entities/types';

type Spell = { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; dir: number; life: number; hits: Set<Target> };

/** Base commune des salles : sol, plateformes, joueur, HUD, pause, hit-stop, sorts. */
export class ArenaScene extends Phaser.Scene {
  player!: Player;
  hud!: Hud;
  targets!: Target[];
  hazards!: Phaser.Physics.Arcade.Group;
  floorY = ARENA.floorY;
  private spells!: Spell[];
  private hitstopEnd = 0;
  private sparkFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustFx!: Phaser.GameObjects.Particles.ParticleEmitter;

  create(_data?: { retry?: boolean }) {
    this.tweens.timeScale = 1; this.time.timeScale = 1;
    // Tout réinitialiser ici : restart() ne relance pas les initialiseurs de champs.
    input.reset();
    this.targets = [];
    this.spells = [];
    this.hitstopEnd = 0;
    this.physics.world.setBounds(0, 0, W, H);
    this.buildBackground();

    this.add.tileSprite(0, this.floorY, W, H - this.floorY, 'floor').setOrigin(0).setDepth(5);
    const floor = this.add.zone(W / 2, (this.floorY + H) / 2, W, H - this.floorY);
    this.physics.add.existing(floor, true);
    const plats = ARENA.platforms.map((p) => {
      const img = this.physics.add.staticImage(p.x, p.y + 4, 'plat' + p.w).setDepth(5);
      const c = (img.body as Phaser.Physics.Arcade.StaticBody).checkCollision;
      c.down = c.left = c.right = false;
      return img;
    });

    this.player = new Player(this, 48, this.floorY);
    this.physics.add.collider(this.player.zone, floor);
    this.physics.add.collider(this.player.zone, plats, undefined, () => !this.player.canDrop);
    this.hazards = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player.zone, this.hazards, (_z, h) => {
      const o = h as Phaser.Physics.Arcade.Image, hp = this.player.hp;
      this.player.hurt(o.x);
      if (this.player.hp < hp && o.getData('once')) o.destroy();
    });

    this.sparkFx = this.add.particles(0, 0, 'px', {
      speed: { min: 60, max: 225 }, lifespan: { min: 150, max: 350 }, scale: { start: 1, end: 0 }, emitting: false,
    }).setDepth(20);
    this.dustFx = this.add.particles(0, 0, 'px', {
      speedX: { min: -60, max: 60 }, speedY: { min: -30, max: -8 }, lifespan: 300, scale: { start: 1, end: 0 },
      tint: 0x8088a8, alpha: { start: 0.7, end: 0 }, emitting: false,
    }).setDepth(9);

    this.hud = new Hud(this, this.player);
  }

  /** À surcharger : décor de la salle. */
  buildBackground() {}
  /** À surcharger : logique de la salle à chaque frame. */
  tick(_dt: number) {}

  update(_t: number, deltaMs: number) {
    if (input.take('pause')) {
      input.reset();
      this.scene.launch('Pause', { from: this.scene.key });
      this.scene.pause();
      return;
    }
    const world = this.physics.world;
    // Hit-stop : physique, tweens et timers gelés ensemble (une seule horloge).
    if (performance.now() < this.hitstopEnd) {
      if (!world.isPaused) { world.pause(); this.tweens.timeScale = 0; this.time.timeScale = 0; }
      return;
    }
    if (world.isPaused) { world.resume(); this.tweens.timeScale = 1; this.time.timeScale = 1; }
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    this.player.update(dt);
    this.updateSpells(dt);
    this.tick(dt);
    this.hud.update();
  }

  hitstop(sec: number) { this.hitstopEnd = Math.max(this.hitstopEnd, performance.now() + sec * 1000); }

  sparks(x: number, y: number, color: number, n: number) {
    this.sparkFx.setParticleTint(color);
    this.sparkFx.explode(n, x, y);
  }

  dust(x: number, y: number) { this.dustFx.explode(5, x, y); }

  spawnSpell(x: number, y: number, dir: number) {
    const img = this.add.image(x, y, 'moon').setFlipX(dir < 0).setDepth(12);
    const glow = this.add.image(x, y, 'glowC').setBlendMode(Phaser.BlendModes.ADD).setScale(2).setDepth(11);
    this.spells.push({ img, glow, dir, life: PLAYER.spell.life, hits: new Set() });
  }

  private updateSpells(dt: number) {
    for (const s of this.spells) {
      s.life -= dt;
      s.img.x += s.dir * PLAYER.spell.speed * dt;
      s.glow.setPosition(s.img.x, s.img.y).setAlpha(0.6 + Math.random() * 0.3);
      if (Math.random() < 0.5) this.sparks(s.img.x - s.dir * 9, s.img.y + Phaser.Math.Between(-15, 15), COL.moon, 1);
      const r = new Phaser.Geom.Rectangle(s.img.x - 12, s.img.y - 20, 24, 40);
      for (const t of this.targets) {
        if (!t.alive() || s.hits.has(t) || !Phaser.Geom.Rectangle.Overlaps(r, t.hurtRect())) continue;
        s.hits.add(t);
        t.hit(PLAYER.spell.damage, s.img.x - s.dir * 15);
        this.sparks(s.img.x, s.img.y, COL.moonLight, 14);
        this.hitstop(0.06);
        this.cameras.main.shake(120, 0.008);
      }
      if (s.life <= 0 || s.img.x < -30 || s.img.x > W + 30) { s.img.destroy(); s.glow.destroy(); }
    }
    this.spells = this.spells.filter((s) => s.img.active);
  }

  onPlayerDeath() {
    this.time.delayedCall(PLAYER.deathRetryDelay * 1000, () => this.scene.restart({ retry: true }));
  }
}
