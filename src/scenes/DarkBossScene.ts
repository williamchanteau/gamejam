import Phaser from 'phaser';
import { BossScene } from './BossScene';
import { NOCTIS, NIGHT } from '../bosses/noctis';
import { W, H } from '../config';
import { sfx } from '../audio/sfx';

type Lantern = { x: number; y: number; cooldown: number; fire: number; tick: number; falling: number };

/** Les lanternes répandent leur huile au sol ; seules leurs flammes blessent Noctis. */
export class DarkBossScene extends BossScene {
  protected def = NOCTIS;
  protected floor = 1;
  private lanterns!: Lantern[];
  private ink!: Phaser.GameObjects.Graphics;
  private dark!: Phaser.GameObjects.Graphics;
  private flameInk!: Phaser.GameObjects.Graphics;
  constructor() { super('Boss2'); }

  create(data?: { retry?: boolean }) {
    super.create(data);
    this.lanterns = NIGHT.lanterns.map((x) => ({ x, y: this.floorY - 34, cooldown: 0, fire: 0, tick: 0, falling: 0 }));
    this.ink = this.add.graphics().setDepth(18);
    this.dark = this.add.graphics().setDepth(60);
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
    this.ink.clear(); this.dark.clear(); this.flameInk.clear();
    const cam = this.cameras.main.scrollX;
    // Un masque percé laisse voir le joueur et les zones éclairées, HUD au-dessus.
    const holes = [ { x: this.player.x, y: this.player.rect().centerY, r: 58 } ];
    for (const l of this.lanterns) {
      this.ink.lineStyle(1, 0x756851).lineBetween(l.x, 30, l.x, l.y - 13);
      this.ink.fillStyle(0x73604a).fillRect(l.x - 9, l.y - 13, 18, 26);
      this.ink.fillStyle(l.cooldown <= 0 ? 0xffc35a : 0x231c25).fillRect(l.x - 6, l.y - 9, 12, 18);
      if (l.cooldown <= 0) {
        holes.push({ x: l.x, y: l.y, r: 66 });
        this.flameInk.fillStyle(0xffdc78).fillRect(l.x - 3, l.y - 6, 6, 13);
      }
      if (l.falling > 0) this.flameInk.fillStyle(0xffc35a).fillRect(l.x - 4, l.y + (1 - l.falling / 0.35) * 34, 8, 8);
      if (l.fire > 0) {
        holes.push({ x: l.x, y: this.floorY - 24, r: 104 });
        for (let i = -6; i <= 6; i++) {
          const h = 13 + 12 * (0.5 + 0.5 * Math.sin(this.time.now * 0.018 + i * 2));
          this.flameInk.fillStyle(0xff8a2a).fillTriangle(l.x + i * 10 - 7, this.floorY, l.x + i * 10, this.floorY - h, l.x + i * 10 + 7, this.floorY);
          this.flameInk.fillStyle(0xffe08a).fillRect(l.x + i * 10 - 2, this.floorY - h / 2, 4, h / 2);
        }
      }
    }
    // Bandes de 4 px : union des disques, sans assombrir leurs intersections.
    for (let y = 0; y < H; y += 4) {
      const intervals = holes.filter((h) => Math.abs(y + 2 - h.y) < h.r).map((h) => {
        const dx = Math.sqrt(h.r * h.r - (y + 2 - h.y) ** 2);
        return [Math.max(cam, h.x - dx), Math.min(cam + W, h.x + dx)];
      }).filter(([a, b]) => a < b).sort((a, b) => a[0] - b[0]);
      let start = cam;
      this.dark.fillStyle(0x020108, this.boss.state === 'dead' ? 0.3 : 0.96);
      for (const [a, b] of intervals) { if (a > start) this.dark.fillRect(start, y, a - start, 4); start = Math.max(start, b); }
      if (start < cam + W) this.dark.fillRect(start, y, cam + W - start, 4);
    }
  }
}
