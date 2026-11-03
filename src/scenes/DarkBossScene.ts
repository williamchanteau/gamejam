import Phaser from 'phaser';
import { BossScene } from './BossScene';
import { NOCTIS, NIGHT, lampPos } from '../bosses/noctis';
import { W, H } from '../config';
import { sfx } from '../audio/sfx';

type Lantern = { x: number; y: number; cooldown: number; fire: number; tick: number; falling: number; ember: number };

/** Les lanternes répandent leur huile au sol ; seules leurs flammes blessent Noctis. */
export class DarkBossScene extends BossScene {
  protected def = NOCTIS;
  protected floor = 1;
  private lanterns!: Lantern[];
  private ink!: Phaser.GameObjects.Graphics;
  private dark!: Phaser.GameObjects.Graphics;
  private aura!: Phaser.GameObjects.Graphics;
  private flameInk!: Phaser.GameObjects.Graphics;
  constructor() { super('Boss2'); }

  create(data?: { retry?: boolean }) {
    super.create(data);
    this.lanterns = NIGHT.lanterns.map((x) => ({ x, y: this.floorY - 34, cooldown: 0, fire: 0, tick: 0, falling: 0, ember: 0 }));
    this.ink = this.add.graphics().setDepth(18);
    this.dark = this.add.graphics().setDepth(60);
    this.aura = this.add.graphics().setDepth(65).setBlendMode(Phaser.BlendModes.ADD);
    this.flameInk = this.add.graphics().setDepth(70);
    for (const l of this.lanterns) {
      this.targets.push({
        hurtRect: () => new Phaser.Geom.Rectangle(l.x - 10, l.y - 13, 20, 27),
        alive: () => l.cooldown <= 0 && this.boss.alive(),
        hit: () => {
          if (l.cooldown > 0 || !this.boss.alive()) return;
          l.cooldown = NIGHT.recharge; l.falling = 0.35;
          this.sparks(l.x, l.y, 0xffc45c, 16); sfx.crack();
        },
      });
    }
    this.draw();
  }

  tick(dt: number) {
    super.tick(dt);
    for (const l of this.lanterns) {
      l.cooldown = Math.max(0, l.cooldown - dt);
      if (l.falling > 0) {
        l.falling -= dt;
        if (l.falling <= 0) { l.fire = NIGHT.fireLife; l.tick = 0; this.puffs(l.x, this.floorY, 4); }
      }
      if (l.fire <= 0) continue;
      l.fire = Math.max(0, l.fire - dt); l.tick -= dt;
      l.ember -= dt;
      if (l.ember <= 0) {
        l.ember = 0.12;
        this.sparks(l.x + Phaser.Math.Between(-55, 55), this.floorY - 10, 0xffbc51, 2);
      }
      const r = this.boss.hurtRect();
      if (l.tick <= 0 && this.boss.alive() && r.right > l.x - NIGHT.fireWidth / 2 && r.left < l.x + NIGHT.fireWidth / 2) {
        l.tick = NIGHT.fireTick;
        this.boss.burn(NIGHT.fireDamage);
        this.sparks(this.boss.x, this.floorY - 24, 0xffac36, 7);
      }
      if (this.boss.state === 'dead') l.fire = 0;
    }
    this.draw();
  }

  private draw() {
    this.ink.clear(); this.dark.clear(); this.flameInk.clear(); this.aura.clear();
    const cam = this.cameras.main.scrollX;
    // Un masque percé laisse voir le joueur et les zones éclairées, HUD au-dessus.
    const holes = [ { x: this.player.x, y: this.player.rect().centerY, r: 58, color: 0x8fe8ff } ];
    const flicker = (x: number) => 1 + Math.sin(this.time.now * 0.009 + x) * 0.045 + Math.sin(this.time.now * 0.023 + x * 2) * 0.025;
    // La lanterne de Noctis : flamme spectrale qui le révèle dans le noir.
    if (this.boss.state !== 'dead') { const lp = lampPos(this.boss); holes.push({ x: lp.x, y: lp.y, r: 56 * flicker(lp.x), color: 0xb89cff }); }
    for (const l of this.lanterns) {
      this.ink.lineStyle(1, 0x756851).lineBetween(l.x, 30, l.x, l.y - 13);
      this.ink.fillStyle(0x73604a).fillRect(l.x - 9, l.y - 13, 18, 26);
      this.ink.fillStyle(l.cooldown <= 0 ? 0xffc35a : 0x231c25).fillRect(l.x - 6, l.y - 9, 12, 18);
      if (l.cooldown <= 0) {
        holes.push({ x: l.x, y: l.y, r: 66 * flicker(l.x), color: 0xffb34c });
        this.flameInk.fillStyle(0xffdc78).fillRect(l.x - 3, l.y - 6, 6, 13);
      }
      if (l.falling > 0) this.flameInk.fillStyle(0xffc35a).fillRect(l.x - 4, l.y + (1 - l.falling / 0.35) * 34, 8, 8);
      if (l.fire > 0) {
        holes.push({ x: l.x, y: this.floorY - 24, r: 104 * flicker(l.x), color: 0xff8a2a });
        for (let i = -6; i <= 6; i++) {
          const h = 13 + 12 * (0.5 + 0.5 * Math.sin(this.time.now * 0.018 + i * 2));
          this.flameInk.fillStyle(0xff8a2a).fillTriangle(l.x + i * 10 - 7, this.floorY, l.x + i * 10, this.floorY - h, l.x + i * 10 + 7, this.floorY);
          this.flameInk.fillStyle(0xffe08a).fillRect(l.x + i * 10 - 2, this.floorY - h / 2, 4, h / 2);
        }
      }
    }
    // Halos additifs et reflet chaud sur le dallage, modulés par les flammes.
    for (const h of holes) {
      for (let i = 7; i >= 1; i--) {
        this.aura.fillStyle(h.color, 0.012 + (8 - i) * 0.003).fillCircle(h.x, h.y, h.r * i / 8);
      }
    }
    for (const l of this.lanterns) {
      if (l.fire > 0) {
        this.aura.fillStyle(0xffb43c, 0.18 * flicker(l.x)).fillEllipse(l.x, this.floorY + 4, 155, 13);
        // Le corps du boss se révèle lorsqu'il brûle.
        if (Math.abs(this.boss.x - l.x) < NIGHT.fireWidth / 2 + 30) {
          this.aura.fillStyle(0xffbc55, 0.14).fillTriangle(this.boss.x - 35, this.floorY, this.boss.x, this.floorY - 124, this.boss.x + 35, this.floorY);
        }
      }
    }
    // Cinq couronnes superposées adoucissent le passage de la lumière au noir.
    for (let layer = 0; layer < 5; layer++) {
    const softHoles = holes.map((h) => ({ ...h, r: h.r * (0.58 + layer * 0.18) }));
    // Bandes de 4 px : union des disques, sans assombrir leurs intersections.
    for (let y = 0; y < H; y += 4) {
      const intervals = softHoles.filter((h) => Math.abs(y + 2 - h.y) < h.r).map((h) => {
        const dx = Math.sqrt(h.r * h.r - (y + 2 - h.y) ** 2);
        return [Math.max(cam, h.x - dx), Math.min(cam + W, h.x + dx)];
      }).filter(([a, b]) => a < b).sort((a, b) => a[0] - b[0]);
      let start = cam;
      this.dark.fillStyle(0x020108, this.boss.state === 'dead' ? 0.07 : 0.48);
      for (const [a, b] of intervals) { if (a > start) this.dark.fillRect(start, y, a - start, 4); start = Math.max(start, b); }
      if (start < cam + W) this.dark.fillRect(start, y, cam + W - start, 4);
    }
    }
  }
}
