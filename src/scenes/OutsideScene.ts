import Phaser from 'phaser';
import { W, COL } from '../config';
import { ArenaScene } from './ArenaScene';
import { txt } from '../art/font';
import { sfx } from '../audio/sfx';
import { DOOR, OUT, PORTAL } from '../art/outside';
import { addStorm } from '../art/storm';
import { Portal } from '../entities/Portal';
import { run } from '../floors';

/** Devant le château : on marche jusqu'à la porte, elle s'ouvre, on entre au rez-de-chaussée. */
export class OutsideScene extends ArenaScene {
  plats = [];
  floorKey = 'ground_out';
  spawnX = 190;
  private portal!: Portal;
  private entering = false;
  private doors: Phaser.GameObjects.Image[] = [];
  private flick: { o: Phaser.GameObjects.Image; a: number; s: number }[] = [];
  private torches: Phaser.GameObjects.Image[] = [];

  constructor() { super('Outside'); }

  buildBackground() {
    this.flick = [];
    this.add.image(0, 0, 'out_bg').setOrigin(0);
    const glow = (x: number, y: number, key: string, scale: number, a: number) => {
      const o = this.add.image(x, y, key).setBlendMode(Phaser.BlendModes.ADD).setScale(scale).setAlpha(a).setDepth(3);
      this.flick.push({ o, a, s: scale });
    };
    this.add.image(OUT.moon[0], OUT.moon[1], 'glowW').setBlendMode(Phaser.BlendModes.ADD).setScale(4).setAlpha(0.18).setTint(0xa8c0ff);
    this.torches = OUT.torches.map((x) => this.add.image(x, 168, 'torch0').setDepth(3));
    for (const x of OUT.torches) glow(x, 160, 'glowO', 2.2, 0.55);
    for (const [x, y] of OUT.windows) glow(x, y, 'glowO', 0.8, 0.4);
    addStorm(this, this.floorY, () => (this.player && this.player.spr.alpha > 0.5 ? { x: this.player.spr.x, y: this.player.spr.y - 33 } : null));
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(90).setScrollFactor(0);
  }

  create(data?: { retry?: boolean; fromTuto?: boolean }) {
    run.upgrade = ''; // nouvelle ascension : le banquet est encore à venir
    this.spawnX = data?.fromTuto ? PORTAL.x + 16 : 190; // avant super.create (le joueur y est construit)
    super.create(data);
    this.entering = false;
    // Flammes sur l'horloge de la scène : elles vacillent aussi pendant les cinématiques (salle figée).
    this.time.addEvent({ delay: 110, loop: true, callback: () => {
      for (const t of this.torches) t.setTexture(Math.random() < 0.5 ? 'torch0' : 'torch1');
      for (const f of this.flick) f.o.setAlpha(f.a * (0.8 + Math.random() * 0.4)).setScale(f.s * (0.95 + Math.random() * 0.1));
    } });
    this.doors = [
      this.add.image(DOOR.x - DOOR.hw, this.floorY, 'door').setOrigin(0, 1).setDepth(3),
      this.add.image(DOOR.x + DOOR.hw + 1, this.floorY, 'door').setOrigin(1, 1).setDepth(3).setFlipX(true),
    ];
    const hint = txt(this, DOOR.x, 112, 'ENTRER →', COL.moonLight).setOrigin(0.5, 0).setDepth(20);
    this.tweens.add({ targets: hint, x: DOOR.x + 4, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Portail violet vers le tuto, pancarte d'Halloween devant.
    this.portal = new Portal(this, PORTAL.x, this.floorY);
    this.add.image(PORTAL.sign, this.floorY + 1, 'sign_tuto').setOrigin(0.5, 1).setDepth(4);
    txt(this, PORTAL.sign + 2, this.floorY - 37, 'TUTO', 0xffc060).setOrigin(0.5, 0).setDepth(4);
    const pk = this.add.image(PORTAL.sign - 9, this.floorY - 6, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setAlpha(0.5).setDepth(4);
    this.flick.push({ o: pk, a: 0.5, s: 0.6 });
    if (data?.fromTuto) this.portal.spit();
    else {
      const t = txt(this, 130, 60, 'LE CHÂTEAU', COL.ui).setOrigin(0.5, 0).setScale(2).setDepth(20).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 600, yoyo: true, hold: 1400 });
      this.cameras.main.fadeIn(300);
    }
  }

  tick() {
    if (this.entering) return;
    if (this.player.x > DOOR.x - 30) this.enter();
    else if (this.player.x < PORTAL.x + 6 && this.portal.holds(this.player.y)) { this.entering = true; this.portal.swallow(() => this.scene.start('Test')); }
  }

  /** Les battants pivotent vers l'intérieur, la lumière se déverse, le joueur entre dans l'ombre, la porte se referme. */
  private enter() {
    this.entering = true;
    this.frozen = true;
    const p = this.player, spr = p.spr, fy = this.floorY;
    p.safe = true;
    spr.setTexture('p_idle0').setFlipX(false);
    sfx.rumble(); sfx.scrape();
    // Battants en perspective : chaque colonne est redessinée à sa profondeur (le bord libre recule, rapetisse, se rapproche du gond)
    // → un battant ouvert est un coin qui fuit vers l'intérieur, jamais un trait plat.
    const src = this.textures.get('door').getSourceImage() as HTMLCanvasElement;
    const dW = src.width, dH = src.height, PAD = 2, CW = 2 * DOOR.hw + 1 + PAD * 2, yv = dH - 40; // yv : hauteur des yeux
    if (this.textures.exists('door_anim')) this.textures.remove('door_anim');
    const tex = this.textures.createCanvas('door_anim', CW, dH)!, ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    const leaves = this.add.image(DOOR.x - DOOR.hw - PAD, fy, 'door_anim').setOrigin(0, 1).setDepth(3);
    for (const d of this.doors) d.setVisible(false);
    const drawLeaves = (k: number) => {
      const th = k * 1.2, c = Math.cos(th), sn = Math.sin(th), F = 105;
      ctx.clearRect(0, 0, CW, dH);
      for (const side of [0, 1]) {
        const hinge = side ? PAD + 2 * DOOR.hw + 1 : PAD, dir = side ? -1 : 1;
        for (let i = dW - 1; i >= 0; i--) { // du bord libre (loin) vers le gond (près)
          const s0 = F / (F + i * sn), s1 = F / (F + (i + 1) * sn), sc = (s0 + s1) / 2;
          const x0 = hinge + dir * i * c * s0, x1 = hinge + dir * (i + 1) * c * s1;
          const xa = Math.round(Math.min(x0, x1)), xb = Math.max(xa + 1, Math.round(Math.max(x0, x1)));
          const top = Math.round(yv - yv * sc), bot = Math.round(yv + (dH - yv) * sc);
          ctx.drawImage(src, i, 0, 1, dH, xa, top, xb - xa, bot - top);
          if (sn > 0.02) { ctx.fillStyle = `rgba(6,5,12,${(0.6 * sn * i) / dW})`; ctx.fillRect(xa, top, xb - xa, bot - top); } // plus loin = plus sombre
        }
        if (sn > 0.05) { // tranche du battant (épaisseur du bois) le long du bord libre
          const se = F / (F + dW * sn), xe = Math.round(hinge + dir * dW * c * se), t = Math.max(1, Math.round(sn * 2));
          ctx.fillStyle = '#9a5424'; // tranche prise dans la lumière chaude de l'intérieur
          ctx.fillRect(side ? xe - t : xe, Math.round(yv - yv * se) + 6, t, Math.round(dH * se) - 6);
        }
      }
      tex.refresh();
    };
    const swing = (open: boolean, ms: number, delay = 0, from = open ? 0 : 1, to = open ? 1 : 0, ease = open ? 'Sine.inOut' : 'Quad.in') => this.tweens.addCounter({
      from, to, duration: ms, delay, ease,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0, sh = Math.round(255 - k * 120);
        drawLeaves(k);
        leaves.setTint(Phaser.Display.Color.GetColor(sh, sh * 0.92, sh * 0.85));
      },
    });
    drawLeaves(0);
    // Grincement : la porte s'entrouvre, hésite, puis s'ouvre en grand ; poussière qui tombe de l'arche.
    swing(true, 240, 0, 0, 0.12, 'Quad.out');
    swing(true, 600, 380, 0.12, 1);
    this.time.delayedCall(60, () => this.puffs(DOOR.x, fy - dH + 14, 3));
    this.time.delayedCall(420, () => { this.puffs(DOOR.x, fy - dH + 10, 4); this.cameras.main.shake(120, 0.003); });
    // Lumière chaude : halo dans l'embrasure + éventail au sol vers le joueur.
    const light = this.add.image(DOOR.x, fy - 20, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0).setDepth(4);
    const fan = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setAlpha(0);
    fan.fillStyle(0xff9a40, 0.35).fillPoints([{ x: DOOR.x - 20, y: fy }, { x: DOOR.x + 20, y: fy }, { x: DOOR.x + 34, y: fy + 14 }, { x: DOOR.x - 52, y: fy + 14 }] as Phaser.Math.Vector2[], true);
    this.tweens.add({ targets: light, scale: 2.4, alpha: 0.8, duration: 600, delay: 380 });
    this.tweens.add({ targets: fan, alpha: 1, duration: 600, delay: 380 });
    // Il marche jusqu'au seuil, puis s'enfonce dans la profondeur (rapetisse, s'assombrit, disparaît).
    this.time.delayedCall(700, () => p.walkTo(DOOR.x, spr.y, Math.abs(DOOR.x - spr.x) * 11, {}, () =>
      p.walkTo(DOOR.x, spr.y - 4, 520, {
        to: { scale: 0.78, alpha: 0 },
        each: (k) => { const c = Math.round(255 - k * 190); spr.setTint(Phaser.Display.Color.GetColor(c, c * 0.85, c * 0.75)); },
      }, () => {
        swing(false, 260);
        this.tweens.add({ targets: [light, fan], alpha: 0, duration: 260 });
        this.time.delayedCall(260, () => {
          sfx.thud(); sfx.clank();
          this.cameras.main.shake(140, 0.005);
          this.puffs(DOOR.x, fy, 4);
        });
        this.time.delayedCall(640, () => {
          this.cameras.main.fadeOut(380, 6, 5, 12);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Boss1'));
        });
      })));
  }
}
