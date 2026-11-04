import Phaser from 'phaser';
import { W, COL } from '../config';
import { BossScene } from './BossScene';
import { txt } from '../art/font';
import { sfx } from '../audio/sfx';
import { run } from '../floors';
import { shout } from '../ui/Shout';
import { UpgradeCards } from '../ui/UpgradeCards';
import { MCKING, entrance, seat, stand } from '../bosses/mcking';

const ADD = Phaser.BlendModes.ADD;
/** Banquet au milieu de la nef, trône au fond à droite (avant la grille de l'escalier). */
const TABLE = { x: 405, touch: 312, seat: 318, plate: 340 }, THRONE = { x: 806 };

/** Salle à manger : burger sur la table → cartes d'amélioration → le cri → travelling vers le trône → McKING. */
export class BurgerScene extends BossScene {
  protected def = MCKING;
  protected floor = 2;
  plats = [{ x: 170, y: 177, w: 84 }, { x: 330, y: 135, w: 72 }, { x: 590, y: 135, w: 72 }, { x: 680, y: 177, w: 84 }];
  /** Vrai tant que la cinématique n'a pas dévoilé le trône (caméra limitée au banquet). */
  private dining = false;
  private eating = false;
  private cine = false;
  private cards: UpgradeCards | null = null;
  private meal: Phaser.GameObjects.Image | null = null;
  private mealGlow: Phaser.GameObjects.Image | null = null;
  private mealHint: Phaser.GameObjects.BitmapText | null = null;

  constructor() { super('Boss3'); }

  create(data?: { retry?: boolean }) {
    this.dining = !run.upgrade; this.eating = false; this.cine = false; this.cards = null;
    this.meal = this.mealGlow = null; this.mealHint = null;
    this.spawnX = this.dining ? 60 : 270;
    this.bossX = this.dining ? THRONE.x : 560;
    super.create(data);
  }

  buildBackground() {
    super.buildBackground();
    const s = this, y = this.floorY;
    // Banquet : chaises derrière, table, couverts, chandeliers, lustre.
    for (const x of [TABLE.x - 52, TABLE.x - 14, TABLE.x + 24, TABLE.x + 62]) s.add.image(x, y - 14, 'din_chair').setOrigin(0.5, 1).setDepth(4.6);
    s.add.image(TABLE.x, y + 1, 'din_table').setOrigin(0.5, 1).setDepth(6);
    const top = y - 27;
    for (const [k, x] of [['din_plate', TABLE.x - 18], ['din_bone', TABLE.x - 18], ['din_goblet', TABLE.x - 38], ['din_plate', TABLE.x + 42], ['din_goblet', TABLE.x + 62], ['din_bone', TABLE.x + 42]] as const)
      s.add.image(x, top - (k === 'din_bone' ? 2 : 0), k).setOrigin(0.5, 1).setDepth(6.1);
    s.add.image(TABLE.x + 12, top, 'din_cande').setOrigin(0.5, 1).setDepth(6.1);
    this.flicker(TABLE.x + 12, top - 22, 0.8, 0.55, 6);
    s.add.image(TABLE.x, 0, 'din_lustre').setOrigin(0.5, 0).setDepth(3);
    this.flicker(TABLE.x, 26, 1.8, 0.4, 3);

    // Trône magnifique mais souillé, burgers à moitié mangés, papiers, gobelets.
    s.add.image(THRONE.x, y + 1, 'din_throne').setOrigin(0.5, 1).setDepth(4.5);
    this.flicker(THRONE.x, y - 96, 1.5, 0.22, 4.4);
    s.add.image(THRONE.x + 40, y - 76, 'burger_b2').setOrigin(0.5, 1).setDepth(4.6);
    const low = 6.2;
    for (const [x, dy] of [[THRONE.x - 40, 8], [THRONE.x + 30, 22], [THRONE.x - 120, 26]]) s.add.image(x, y + dy, 'din_stain').setDepth(5.1);
    for (const [k, x, dy, a] of [
      ['burger_b1', THRONE.x - 74, 6, -8], ['burger_b2', THRONE.x - 46, 2, 12], ['burger_b3', THRONE.x - 24, 15, 0], ['burger_b2', THRONE.x + 16, 12, -20],
      ['burger_b1', THRONE.x + 58, 4, 10], ['burger_b3', THRONE.x - 108, 18, -6], ['burger_b2', THRONE.x - 150, 8, 6], ['din_wrap', THRONE.x - 92, 10, 0],
      ['din_wrap', THRONE.x + 36, 22, 40], ['din_wrap', THRONE.x - 130, 26, 90], ['din_cup', THRONE.x + 72, 3, 0], ['din_cup', THRONE.x - 60, 24, 84],
    ] as const) s.add.image(x, y + dy, k).setOrigin(0.5, 1).setAngle(a).setDepth(low);

    // Assiette et burger qui fume, tant qu'il n'a pas été mangé.
    s.add.image(TABLE.plate, top, 'din_plate').setOrigin(0.5, 1).setDepth(6.1);
    if (!run.upgrade) {
      this.mealGlow = s.add.image(TABLE.plate, top - 10, 'glowO').setBlendMode(ADD).setDepth(6.05).setScale(0.9).setAlpha(0.6);
      s.tweens.add({ targets: this.mealGlow, alpha: 0.25, scale: 0.7, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.meal = s.add.image(TABLE.plate, top - 2, 'burger').setOrigin(0.5, 1).setDepth(6.2);
      this.mealHint = txt(s, TABLE.plate, top - 45, '↓', COL.moonLight).setOrigin(0.5, 0).setDepth(20);
      s.tweens.add({ targets: this.mealHint, y: top - 40, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      s.time.addEvent({ delay: 340, loop: true, callback: () => {
        if (!this.meal?.active) return;
        const p = s.add.rectangle(TABLE.plate + Phaser.Math.Between(-7, 7), top - 22, 1, 2, 0xe8ecf6, 0.55).setDepth(6.3);
        s.tweens.add({ targets: p, y: p.y - 15, alpha: 0, duration: 900, onComplete: () => p.destroy() });
      } });
    }
  }

  private flicker(x: number, y: number, scale: number, a: number, depth: number) {
    const g = this.add.image(x, y, 'glowO').setBlendMode(ADD).setScale(scale).setAlpha(a).setDepth(depth);
    this.tweens.add({ targets: g, alpha: a * 0.7, scale: scale * 0.94, duration: 240, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  protected camTarget() {
    if (!this.dining) return super.camTarget();
    return Phaser.Math.Clamp(this.player.x - W / 2, 0, 130); // le trône reste hors champ
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
  }

  tick(dt: number) {
    super.tick(dt);
    const p = this.player;
    // Atterrir au-delà du bord compte aussi : impossible de sauter le repas.
    if (this.dining && !this.eating && p.x >= TABLE.touch && p.grounded && p.y > this.floorY - 40 && p.state === 'normal') this.eat();
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

  /** La salle tremble, le cri, puis la caméra glisse jusqu'au trône. */
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
        this.time.delayedCall(650, () => super.intro());
      });
    } });
  }
}
