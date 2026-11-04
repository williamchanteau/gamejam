import Phaser from 'phaser';
import { W, COL } from '../config';
import { BossScene } from './BossScene';
import { txt } from '../art/font';
import { sfx } from '../audio/sfx';
import { run } from '../floors';
import { shout } from '../ui/Shout';
import { UpgradeCards } from '../ui/UpgradeCards';
import { MCKING, entrance, seat, stand } from '../bosses/mcking';
import { DINING } from '../art/dining';
import { buildDining } from './rooms';

const ADD = Phaser.BlendModes.ADD;
/** Le héros mange au bout de la longue table ; le roi est attablé à l'autre bout, avant la grille de l'escalier. */
const TABLE = { touch: 312, seat: 318, plate: 340 };

/** Salle à manger : burger sur la table → cartes d'amélioration → le cri → travelling le long de la table → McKING. */
export class BurgerScene extends BossScene {
  protected def = MCKING;
  protected floor = 2;
  plats = [];
  floorKey = 'din_floor';
  /** Vrai tant que la cinématique n'a pas dévoilé le roi (caméra limitée au bout de table). */
  private dining = false;
  private eating = false;
  private cine = false;
  private cards: UpgradeCards | null = null;
  private heap!: Phaser.GameObjects.Image;
  private meal: Phaser.GameObjects.Image | null = null;
  private mealGlow: Phaser.GameObjects.Image | null = null;
  private mealHint: Phaser.GameObjects.BitmapText | null = null;
  protected autoGate = false;
  protected victoryHint() { return this.boss.x > this.player.x ? 'PRENDS SA COURONNE →' : '← PRENDS SA COURONNE'; }
  /** Tant que la couronne est au sol (elle tombe là où il est mort), la caméra la garde dans le cadre. */
  protected camFocus() { return this.crownTaken ? super.camFocus() : this.boss.x; }
  /** Couronne de McKING : au sol après sa mort, puis portée sous le bras jusqu'à l'escalier. */
  private crownHint: Phaser.GameObjects.GameObject[] | null = null;
  private crownTaken = false;
  private carried: Phaser.GameObjects.Image | null = null;

  constructor() { super('Boss3'); }

  create(data?: { retry?: boolean }) {
    this.dining = !run.upgrade; this.eating = false; this.cine = false; this.cards = null;
    this.meal = this.mealGlow = null; this.mealHint = null;
    this.crownHint = null; this.crownTaken = false; this.carried = null;
    this.spawnX = this.dining ? 60 : 270;
    this.bossX = this.dining ? DINING.king : 560;
    super.create(data);
  }

  buildBackground() {
    this.room = buildDining(this);
    const s = this, y = this.floorY;
    const top = y - DINING.table.h;
    // Convives absents, grande chaise du roi, longue table, le plat de burgers devant lui.
    for (const x of DINING.guests) s.add.image(x, y - 4, 'din_chair').setOrigin(0.5, 1).setDepth(4.6);
    s.add.image(DINING.king, y + 1, 'din_kingchair').setOrigin(0.5, 1).setDepth(4.7);
    s.add.image(DINING.table.x0, y + 1, 'din_longtable').setOrigin(0, 1).setDepth(6);
    this.heap = s.add.image(DINING.platter, top + 5, 'din_heap').setOrigin(0.5, 1).setDepth(6.2);

    // Assiette et burger qui fume, tant qu'il n'a pas été mangé.
    s.add.image(TABLE.plate, top + 4, 'din_plate').setOrigin(0.5, 1).setDepth(6.1);
    if (!run.upgrade) {
      this.mealGlow = s.add.image(TABLE.plate, top - 10, 'glowO').setBlendMode(ADD).setDepth(6.05).setScale(0.9).setAlpha(0.6);
      s.tweens.add({ targets: this.mealGlow, alpha: 0.25, scale: 0.7, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.meal = s.add.image(TABLE.plate, top + 1, 'burger').setOrigin(0.5, 1).setDepth(6.2);
      this.mealHint = txt(s, TABLE.plate, top - 45, '↓', COL.moonLight).setOrigin(0.5, 0).setDepth(20);
      s.tweens.add({ targets: this.mealHint, y: top - 40, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      s.time.addEvent({ delay: 340, loop: true, callback: () => {
        if (!this.meal?.active) return;
        const p = s.add.rectangle(TABLE.plate + Phaser.Math.Between(-7, 7), top - 22, 1, 2, 0xe8ecf6, 0.55).setDepth(6.3);
        s.tweens.add({ targets: p, y: p.y - 15, alpha: 0, duration: 900, onComplete: () => p.destroy() });
      } });
    }
  }

  protected camTarget() {
    if (!this.dining) return super.camTarget();
    return Phaser.Math.Clamp(this.player.x - W / 2, 0, 130); // le roi reste hors champ
  }

  protected intro(data?: { retry?: boolean }) {
    if (!this.dining) return super.intro(data);
    seat(this.boss);
  }

  protected begin() {
    if (!this.cine) return super.begin();
    this.camX = this.cameras.main.scrollX;
    this.frozen = false;
    this.boss.force(entrance);
  }

  update(t: number, d: number) {
    super.update(t, d);
    this.cards?.update(d / 1000);
    if (this.carried) {
      const spr = this.player.spr;
      this.carried.setPosition(spr.x + this.player.facing * 8, spr.y - 13).setFlipX(spr.flipX).setAlpha(spr.alpha);
    }
  }

  tick(dt: number) {
    super.tick(dt);
    const p = this.player;
    // Atterrir au-delà du bord compte aussi : impossible de sauter le repas.
    if (this.dining && !this.eating && p.x >= TABLE.touch && p.grounded && p.y > this.floorY - 40 && p.state === 'normal') this.eat();
    if (!this.crownTaken) this.watchCrown();
  }

  /** Une fois la couronne retombée : halo + flèche ; marcher dessus la ramasse. */
  private watchCrown() {
    const c = this.children.getByName('dropCrown') as Phaser.GameObjects.Image | null;
    if (!c?.getData('landed')) return;
    if (!this.crownHint) {
      const glow = this.add.image(c.x, c.y, 'glowO').setBlendMode(ADD).setDepth(16).setScale(1.3).setAlpha(0.7);
      this.tweens.add({ targets: glow, alpha: 0.3, scale: 1, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const arrow = txt(this, c.x, c.y - 34, '↓', COL.moonLight).setOrigin(0.5, 0).setDepth(20);
      this.tweens.add({ targets: arrow, y: c.y - 29, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.crownHint = [glow, arrow];
    }
    const p = this.player;
    if (Math.abs(p.x - c.x) < 16 && p.y > this.floorY - 44 && p.state === 'normal') this.takeCrown(c);
  }

  /** Le héros lève la couronne à deux mains (elle se réduit à sa taille), puis la garde sous le bras. */
  private takeCrown(c: Phaser.GameObjects.Image) {
    this.crownTaken = true; this.frozen = true;
    for (const o of this.crownHint ?? []) o.destroy();
    const p = this.player, spr = p.spr, y = this.floorY;
    p.body.reset(c.x, y - 27 / 2);
    p.walkTo(c.x, y + 1, Math.max(100, (Math.abs(spr.x - c.x) / 172) * 1000), {}, () => {
      spr.setTexture('p_crownHi');
      sfx.powerUp();
      this.sparks(c.x, c.y, 0xffd36a, 16);
      this.tweens.add({ targets: c, x: spr.x + 1, y: spr.y - 49, angle: 0, scale: 0.43, duration: 380, ease: 'Quad.out', onComplete: () => {
        c.setTexture('crown_s').setScale(1);
        this.flashScreen(0.3);
        sfx.ting();
        this.sparks(c.x, c.y, 0xffd36a, 22);
        const aura = this.add.image(c.x, c.y, 'glowO').setBlendMode(ADD).setScale(0.3).setDepth(16);
        this.tweens.add({ targets: aura, scale: 3, alpha: 0, duration: 700, ease: 'Quad.out', onComplete: () => aura.destroy() });
      } });
      this.time.delayedCall(1250, () => {
        spr.setTexture('p_idle0');
        this.carried = c.setDepth(11);
        this.frozen = false;
        this.banner('LA COURONNE EST À TOI', "L'ESCALIER S'OUVRE →");
        this.openGate();
      });
    });
  }

  /** Le héros se colle à la table et dévore le burger en trois bouchées. */
  private eat() {
    this.eating = true; this.frozen = true;
    const p = this.player, s = this.add, spr = p.spr, y = this.floorY, ms = Math.max(120, (Math.abs(spr.x - TABLE.seat) / 172) * 1000);
    p.body.reset(TABLE.seat, y - 27 / 2);
    this.mealHint?.destroy();
    p.walkTo(TABLE.seat, y + 1, ms, {}, () => {
      p.facing = 1;
      spr.setFlipX(false).setTexture('p_eat0');
      const m = this.meal!, g = this.mealGlow!, fx = TABLE.seat + 12, fy = y - 12;
      this.tweens.add({ targets: m, x: fx, y: fy, duration: 170, ease: 'Back.out' });
      this.tweens.add({ targets: g, x: fx, y: fy - 8, duration: 170 });
      [260, 640, 1020].forEach((at, i) => this.time.delayedCall(at, () => {
        spr.setTexture('p_eat1');
        this.time.delayedCall(130, () => spr.setTexture('p_eat0'));
        m.setTexture(['burger_b1', 'burger_b2', 'burger_b3'][i]);
        sfx.chomp();
        this.sparks(fx + 4, fy - 8, 0xe8a548, 6); this.sparks(fx + 4, fy - 8, 0x74c44e, 2);
        this.tweens.add({ targets: spr, scaleX: 1.08, scaleY: 0.93, duration: 60, yoyo: true });
      }));
      this.time.delayedCall(1380, () => {
        m.destroy(); this.meal = null;
        this.tweens.killTweensOf(g); g.destroy(); this.mealGlow = null;
        sfx.gulp();
        spr.setTexture('p_idle0');
        this.tweens.add({ targets: spr, scaleX: 0.92, scaleY: 1.1, duration: 110, yoyo: true, ease: 'Sine.inOut' });
        const aura = s.image(spr.x, spr.y - 18, 'glowO').setBlendMode(ADD).setScale(0.2).setAlpha(0.9).setDepth(11);
        this.tweens.add({ targets: aura, scale: 3, alpha: 0, duration: 520, ease: 'Quad.out', onComplete: () => aura.destroy() });
      });
      this.time.delayedCall(1760, () => {
        this.cards = new UpgradeCards(this, (u) => { run.upgrade = u; this.cards = null; this.rage(); });
      });
    });
  }

  /** La salle tremble, le cri, puis la caméra longe la table jusqu'au roi. */
  private rage() {
    const cam = this.cameras.main, p = this.player, spr = p.spr;
    this.time.delayedCall(250, () => {
      sfx.rumble();
      cam.shake(1500, 0.011);
      this.time.addEvent({ delay: 110, repeat: 12, callback: () => {
        const x = cam.scrollX + Math.random() * W;
        this.debris(x, 2, 2); this.puffs(x, 6, 1);
      } });
      this.time.delayedCall(380, () => sfx.rumble());
      this.time.delayedCall(760, () => sfx.rumble());
    });
    // Le héros sursaute, un « ! » au-dessus de la tête.
    this.time.delayedCall(620, () => {
      sfx.warn();
      const ex = txt(this, spr.x, spr.y - 72, '!', 0xffffff).setOrigin(0.5, 0).setScale(3).setDepth(20);
      this.tweens.add({ targets: spr, y: spr.y - 12, duration: 110, yoyo: true, ease: 'Quad.out' });
      this.tweens.add({ targets: ex, alpha: 0, delay: 700, duration: 200, onComplete: () => ex.destroy() });
    });
    this.time.delayedCall(1050, () => {
      sfx.roar();
      cam.shake(420, 0.016);
      this.flashScreen(0.25);
      const big = shout(this, ['QUI A MANGÉ', 'MES BURGERS ???'], W / 2, 92, { scale: 3, ms: 0, depth: 190, screen: true, tail: 1, rays: true });
      this.time.delayedCall(1900, () => { this.pan(); });
      this.time.delayedCall(2500, () => big.close());
    });
  }

  private pan() {
    this.dining = false; this.cine = true;
    sfx.whoosh();
    this.tweens.add({ targets: this.cameras.main, scrollX: this.worldW - W, duration: 1750, ease: 'Sine.inOut', onComplete: () => {
      this.time.delayedCall(350, () => {
        stand(this.boss);
        this.tweens.add({ targets: this.heap, y: this.heap.y - 7, duration: 110, delay: 120, yoyo: true, ease: 'Quad.out' });
        this.time.delayedCall(650, () => super.intro());
      });
    } });
  }
}
