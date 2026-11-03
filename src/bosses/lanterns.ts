import Phaser from 'phaser';
import { W, H, PLAYER, COL } from '../config';
import { sfx } from '../audio/sfx';
import { txt } from '../art/font';
import { HOLES, LAMP_ON } from '../art/noctis';
import type { Boss } from '../entities/Boss';

// Réglages de Noctis et de sa salle (durées en s avant ×vitesse de phase 2, distances en px).
export const NIGHT = {
  hp: 120,
  darkAlpha: 0.93, viewerDark: 0.45, // le viewer garde le boss lisible, le jeu est presque noir
  lanterns: [105, 255, 405, 555, 705, 855], lanternY: 196,
  litLife: 3.2, exposeR: 92, // portée où une lanterne ou un feu rend Noctis vulnérable (> demi-écart : toujours couvert)
  fallTime: 0.35, fireDamage: 3, fireTick: 0.35, fireLife: 4.5, fireWidth: 132,
  rushTime: 0.65,
  ombre: { fade: 0.22, dark: 0.34, dist: 74, tele: 0.8, active: 0.16, reach: 104, height: 72, recover: 1.05, quick: 0.35 },
  salve: { aim: 0.65, last: 0.95, gap: 0.12, speed: 165, recover: 0.95 },
  onde: { tele: 0.9, speed: 215, gap: 0.65, recover: 0.95 },
  trial: { count: 3, show: 0.6, window: 7, damage: 14, stun: 3, sweepTele: 0.85, sweepGap: 0.7, bandH: 40, recover: 1.1 },
};

export interface Lamp {
  x: number; y: number; lit: number; charged: boolean; fall: number; fire: number; tick: number; ember: number;
  img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image;
}
interface Trial { order: Lamp[]; next: number; failed: boolean; tags: Phaser.GameObjects.BitmapText[] }

const ROMAN = ['I', 'II', 'III', 'IV'];
const TAG = 0xffc45c; // cible à frapper, pas un danger : or, jamais rouge

/** La salle noire : lanternes, feux, obscurité percée de lumières. Vit avec le boss (jeu et viewer partagent ce code). */
export class Lanterns {
  lamps: Lamp[];
  trial: Trial | null = null;
  private dark: Phaser.GameObjects.RenderTexture;
  private stamps: Record<number, Phaser.GameObjects.Image> = {};
  private fireG: Phaser.GameObjects.Graphics;
  private fx: Phaser.GameObjects.Particles.ParticleEmitter;
  private cold: Phaser.GameObjects.Image;
  private t = 0;
  private alpha: number;
  private hinted = false;
  private viewer: boolean;

  constructor(private b: Boss) {
    const sc = b.scene;
    this.viewer = sc.scene.key === 'Viewer';
    this.alpha = this.viewer ? NIGHT.viewerDark : NIGHT.darkAlpha;
    const chains = sc.add.graphics().setDepth(18);
    this.lamps = NIGHT.lanterns.map((x) => {
      for (let y = 0; y < NIGHT.lanternY; y += 4) chains.fillStyle(y % 8 ? 0x3d4052 : 0x6a6e88).fillRect(x - (y % 8 ? 0 : 1), y, y % 8 ? 1 : 3, 3);
      return {
        x, y: NIGHT.lanternY, lit: 0, charged: false, fall: 0, fire: 0, tick: 0, ember: 0,
        img: sc.add.image(x, NIGHT.lanternY, 'noc_lamp0').setOrigin(0.5, 0).setDepth(18),
        glow: sc.add.image(x, NIGHT.lanternY + 12, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setDepth(61).setScale(3).setVisible(false),
      };
    });
    this.fireG = sc.add.graphics().setDepth(63);
    this.fx = sc.add.particles(0, 0, 'px', { speed: { min: 40, max: 160 }, lifespan: { min: 180, max: 420 }, scale: { start: 1, end: 0 }, gravityY: -40, emitting: false }).setDepth(66);
    this.cold = sc.add.image(0, 0, 'glowC').setBlendMode(Phaser.BlendModes.ADD).setDepth(61).setScale(2).setAlpha(0.16);
    this.dark = sc.add.renderTexture(0, 0, W, H).setOrigin(0).setScrollFactor(0).setDepth(60);
    for (const r of HOLES) this.stamps[r] = sc.make.image({ key: `noc_hole${r}`, add: false });
    for (const l of this.lamps) sc.targets.push({
      hurtRect: () => new Phaser.Geom.Rectangle(l.x - 10, l.y - 2, 20, 28),
      alive: () => l.lit > 0 && b.alive(),
      hit: () => this.strike(l),
    });
    // Dessiné au rendu seulement : le viewer pré-simule des centaines de pas sans afficher.
    sc.events.on('prerender', this.paint, this);
    sc.events.once('shutdown', () => sc.events.off('prerender', this.paint, this));
  }

  nearest(x: number) { return this.closest(x, 1)[0]; }
  closest(x: number, n: number) { return [...this.lamps].sort((a, c) => Math.abs(a.x - x) - Math.abs(c.x - x)).slice(0, n); }
  /** Les n lanternes allumables les plus proches (ni tombées, ni en feu). */
  available(x: number, n: number) { return this.closest(x, this.lamps.length).filter((l) => l.fall <= 0 && l.fire <= 0).slice(0, n); }
  exposed(x: number) { return this.lamps.some((l) => (l.lit > 0 || l.fire > 0) && Math.abs(l.x - x) < NIGHT.exposeR); }

  ignite(l: Lamp, life = NIGHT.litLife) {
    if (l.fall > 0 || l.fire > 0) return;
    if (l.lit <= 0) { sfx.scrape(); sfx.tick(); this.burst(l.x, l.y + 12, 0xffc45c, 8); }
    l.lit = Math.max(l.lit, life);
  }
  charge(l: Lamp, on: boolean) {
    l.charged = on;
    l.glow.setTexture(on ? 'glowR' : 'glowO');
    if (on) l.img.setTint(0xff9fb4); else l.img.clearTint();
  }
  allOut() { for (const l of this.lamps) { if (l.lit > 0) this.burst(l.x, l.y + 12, 0x6a6f8e, 4); l.lit = 0; this.charge(l, false); } }
  burst(x: number, y: number, col: number, n: number) { this.fx.setParticleTint(col); this.fx.explode(n, x, y); }

  /** Interrompt tout ce qui dépend d'un pattern (phase 2, mort). */
  cancel() {
    for (const l of this.lamps) if (l.charged) this.charge(l, false);
    if (this.trial) { for (const t of this.trial.tags) t.destroy(); for (const l of this.trial.order) l.lit = 0; this.trial = null; }
  }

  beginTrial(order: Lamp[]) {
    this.trial = { order, next: 0, failed: false, tags: [] };
  }
  addTag(l: Lamp, i: number) {
    const t = txt(this.b.scene, l.x, l.y - 18, ROMAN[i], TAG).setOrigin(0.5, 0).setScale(2).setDepth(80);
    this.trial?.tags.push(t);
    return t;
  }

  /** Coup du joueur sur une lanterne allumée : elle tombe et brûle ; pendant l'épreuve, seul l'ordre compte. */
  private strike(l: Lamp) {
    const tr = this.trial;
    if (tr) {
      if (tr.order[tr.next] === l) {
        tr.tags[tr.next]?.setTint(COL.moon);
        tr.next++;
        l.lit = 0; this.charge(l, false);
        this.burst(l.x, l.y + 12, COL.moon, 14); sfx.ting();
      } else {
        // Mauvais ordre : tout se rallume, il faut reprendre à zéro.
        tr.next = 0;
        tr.order.forEach((o, i) => { o.lit = 99; tr.tags[i]?.setTint(TAG); });
        this.b.scene.cameras.main.shake(120, 0.005); sfx.crack();
      }
      return;
    }
    l.lit = 0; this.charge(l, false); l.fall = NIGHT.fallTime;
    l.img.setTexture('noc_lamp0');
    this.burst(l.x, l.y + 12, 0xffc45c, 16); sfx.crack();
  }

  /** Coup du joueur sur Noctis : hors de la lumière, il traverse la fumée (le sort, lui, éclaire et touche toujours). */
  filterHit(dmg: number) {
    const b = this.b;
    if (b.root.alpha < 0.4) return false; // déjà effacé dans le noir
    if (dmg >= PLAYER.spell.damage || this.exposed(b.x)) return true;
    this.burst(b.x, b.y - 58, 0x8a80a8, 7);
    b.scene.puffs(b.x, b.y - 40, 2);
    sfx.crack();
    this.hint();
    return false;
  }

  private hint() {
    if (this.hinted || this.viewer) return;
    this.hinted = true;
    const sc = this.b.scene;
    const a = txt(sc, W / 2, 44, 'SEULE LA LUMIÈRE LE REND VULNÉRABLE', COL.moonLight).setOrigin(0.5, 0).setDepth(96).setScrollFactor(0);
    const c = txt(sc, W / 2, 56, 'FRAPPE UNE LANTERNE ALLUMÉE : ELLE TOMBE ET BRÛLE', COL.ui).setOrigin(0.5, 0).setDepth(96).setScrollFactor(0);
    sc.tweens.add({ targets: [a, c], alpha: 0, delay: 3200, duration: 600, onComplete: () => { a.destroy(); c.destroy(); } });
  }

  update(dt: number) {
    this.t += dt;
    const b = this.b, sc = b.scene, floor = b.floorY;
    if (b.state === 'dead') {
      // La lumière revient : la salle se rallume et le chemin de l'escalier apparaît.
      this.alpha = Math.max(0.12, this.alpha - dt * 0.5);
      for (const l of this.lamps) if (l.fall <= 0 && l.fire <= 0) l.lit = 99;
    } else if (!this.hinted && this.t > 1.4) this.hint(); // après « EN GARDE ! »
    const blink = Math.floor(this.t * 9) % 2;
    this.fireG.clear();
    for (const l of this.lamps) {
      if (l.fall > 0) {
        l.fall -= dt;
        const k = 1 - Math.max(0, l.fall) / NIGHT.fallTime;
        l.img.y = l.y + k * k * (floor - l.y - 20);
        if (l.fall <= 0) {
          l.fire = NIGHT.fireLife; l.tick = 0; l.img.setVisible(false);
          sc.cameras.main.shake(120, 0.005); sfx.thud();
          this.burst(l.x, floor - 6, 0xffbc51, 18); sc.puffs(l.x, floor, 3);
        }
      }
      if (l.fire > 0) this.burn(l, dt);
      else if (!l.img.visible && l.fall <= 0) {
        // Une lanterne neuve redescend du noir.
        l.img.setVisible(true);
        sc.tweens.add({ targets: l.img, y: { from: -24, to: l.y }, duration: 420, ease: 'Quad.out' });
      }
      if (l.lit > 0) {
        l.lit = Math.max(0, l.lit - dt);
        if (l.lit === 0) { this.burst(l.x, l.y + 8, 0x6a6f8e, 4); this.charge(l, false); }
      }
      const on = l.lit > 0;
      l.img.setTexture(on ? LAMP_ON[blink] : 'noc_lamp0').setDepth(on ? 62 : 18);
      const flick = 1 + Math.sin(this.t * 11 + l.x) * 0.05 + Math.sin(this.t * 23 + l.x * 2) * 0.03;
      const burning = l.fire > 0;
      l.glow.setVisible(on || burning).setPosition(l.x, burning ? floor - 18 : l.y + 12)
        .setScale(burning ? 4 : 3).setAlpha((burning ? 0.3 : 0.26) * flick);
    }
    const p = b.player;
    this.cold.setPosition(p.x, p.rect().centerY);
  }

  private burn(l: Lamp, dt: number) {
    const b = this.b;
    l.fire = Math.max(0, l.fire - dt); l.tick -= dt; l.ember -= dt;
    if (l.ember <= 0) { l.ember = 0.1; this.burst(l.x + Phaser.Math.Between(-55, 55), b.floorY - 8, 0xffbc51, 2); }
    if (b.state === 'dead') l.fire = Math.min(l.fire, 0.6);
    const r = b.hurtRect(), half = NIGHT.fireWidth / 2;
    if (l.tick <= 0 && b.alive() && r.right > l.x - half && r.left < l.x + half) {
      l.tick = NIGHT.fireTick;
      b.burn(NIGHT.fireDamage);
      this.burst(b.x, b.floorY - 24, 0xffac36, 7);
    }
    // Colonnes de 2 px : flammes nettes qui se résorbent aux bords et à la fin.
    const g = this.fireG, s = Math.min(1, l.fire / 0.5);
    for (let i = -half; i < half; i += 2) {
      const e = 1 - (Math.abs(i) / half) ** 3;
      const h = Math.round(s * e * (11 + 8 * (0.5 + 0.5 * Math.sin(this.t * 13 + i * 0.7)) + 5 * (0.5 + 0.5 * Math.sin(this.t * 7 - i * 1.3))));
      if (h <= 0) continue;
      g.fillStyle(0xff8a2a).fillRect(l.x + i, b.floorY - h, 2, h);
      g.fillStyle(0xffc45c).fillRect(l.x + i, b.floorY - Math.round(h * 0.6), 2, Math.round(h * 0.6));
      g.fillStyle(0xfff0b0).fillRect(l.x + i, b.floorY - Math.round(h * 0.25), 2, Math.round(h * 0.25));
    }
  }

  /** Obscurité : voile plein, percé par chaque source de lumière. */
  private paint() {
    const b = this.b, sc = b.scene, cam = sc.cameras.main, rt = this.dark;
    const hole = (r: number, x: number, y: number, a = 1) => {
      const s = this.stamps[r].setAlpha(a);
      rt.erase(s, Math.round(x - cam.scrollX), Math.round(y - cam.scrollY));
    };
    rt.clear();
    rt.fill(0x020108, this.alpha);
    hole(62, b.player.x, b.player.rect().centerY);
    for (const l of this.lamps) {
      const flick = 0.92 + 0.08 * Math.sin(this.t * 11 + l.x);
      if (l.fire > 0) hole(130, l.x, b.floorY - 20, flick);
      if (l.lit > 0) hole(96, l.x, l.y + 12, flick);
      else if (l.fall <= 0 && l.fire <= 0) hole(20, l.x, l.y + 12, 0.45); // repère : on devine les lanternes éteintes
    }
    for (const s of (sc as unknown as { spells: { img: Phaser.GameObjects.Image }[] }).spells) hole(62, s.img.x, s.img.y);
    // Corps visible dès qu'il frappe ou qu'il est exposé ; sinon seulement le masque et la lampe de sa perche.
    if (b.root.alpha > 0.4) {
      if (b.hitbox || this.exposed(b.x) || b.state === 'dead' || b.state === 'phase') hole(62, b.x, b.y - 58);
      const lamp = (b.parts.lamp as Phaser.GameObjects.Image | undefined)?.getWorldTransformMatrix();
      if (lamp) hole(20, lamp.tx, lamp.ty + 12 , 0.8);
      if ((b.parts.eyes as Phaser.GameObjects.Image | undefined)?.visible) hole(20, b.x + b.dir * 7, b.y - 90);
    }
  }
}
