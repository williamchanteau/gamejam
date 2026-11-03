import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { sfx } from '../audio/sfx';
import { FLOORS, floorName } from '../floors';
import { capeTex } from '../art/player';
import { TOWER as T } from '../art/tower';

type Pt = { x: number; y: number };
const DT = (Math.PI * 2) / T.perTurn, RP = (T.rc + T.rs) / 2 + 6, Y0 = 222, CLIMB = 2.7, SPEED = 2.55;
const shade = (rgb: number[], f: number) => Phaser.Display.Color.GetColor(...(rgb.map((v) => Math.min(255, Math.round(v * f))) as [number, number, number]));

/** Montée entre deux étages : escalier en colimaçon dans une tour ronde (coupe), le héros tourne autour du noyau. */
export class TransitScene extends Phaser.Scene {
  private end = false;
  private nextKey = '';
  private t = 0; private phi = 0; private cam = 0; private stepI = 0;
  private back!: Phaser.GameObjects.Graphics;
  private front!: Phaser.GameObjects.Graphics;
  private p!: Phaser.GameObjects.Image;
  private hideMask!: Phaser.Display.Masks.GeometryMask;
  private tiles!: { o: Phaser.GameObjects.TileSprite; f: number }[];
  private decor!: { o: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; z: number; u: number }[];
  constructor() { super('Transit'); }

  create(d: { floor: number }) {
    input.reset();
    this.end = false; this.t = 0; this.phi = Math.PI * 0.35; this.stepI = -1;
    const nx = FLOORS[d.floor], { cx, rw, rc } = T;
    this.nextKey = nx?.scene ?? '';
    this.cam = this.zOf(this.phi) - 40;
    // Ciel par la coupe, mur du fond incurvé, épaisseur du mur, noyau : tuiles qui défilent avec la montée.
    this.tiles = [
      { o: this.add.tileSprite(0, 0, W, H, 'tower_sky').setOrigin(0), f: 0.15 },
      { o: this.add.tileSprite(cx - rw, 0, rw * 2, H, 'tower_wall').setOrigin(0), f: 1 },
      { o: this.add.tileSprite(cx - rw - 16, 0, 16, H, 'tower_cut').setOrigin(0).setDepth(5).setFlipX(true), f: 1 },
      { o: this.add.tileSprite(cx + rw, 0, 16, H, 'tower_cut').setOrigin(0).setDepth(5), f: 1 },
      { o: this.add.tileSprite(cx - rc, 0, rc * 2, H, 'newel').setOrigin(0).setDepth(2), f: 1 },
    ];
    // Meurtrières (rayon de lune) et torches (halo braise) accrochées au mur du fond.
    this.decor = [];
    for (let j = 0; j < 6; j++) {
      const torch = j % 2 === 1, u = [-0.62, 0.55, 0.05, -0.5, 0.68, -0.08][j];
      const o = this.add.image(0, 0, torch ? 'torch0' : 'slit').setOrigin(0.5, 1).setDepth(0.5);
      const glow = this.add.image(0, 0, torch ? 'glowO' : 'glowC').setBlendMode(Phaser.BlendModes.ADD)
        .setScale(torch ? 1.6 : 1.1).setAlpha(torch ? 0.55 : 0.25).setDepth(0.6);
      this.decor.push({ o, glow, z: j * 70 + 40, u });
    }
    this.time.addEvent({ delay: 110, loop: true, callback: () => {
      for (const dc of this.decor) if (dc.o.texture.key !== 'slit') { dc.o.setTexture(Math.random() < 0.5 ? 'torch0' : 'torch1'); dc.glow.setAlpha(0.45 + Math.random() * 0.2); }
    } });
    this.back = this.add.graphics().setDepth(1);
    this.front = this.add.graphics().setDepth(3);
    this.p = this.add.image(0, 0, 'p_idle0').setOrigin(0.5, 1).setDepth(3.5);
    // Derrière : toujours lisible devant les marches, mais caché par le noyau (masque inversé).
    const colShape = this.make.graphics({}, false).fillStyle(0xffffff).fillRect(cx - rc, 0, rc * 2, H);
    this.hideMask = colShape.createGeometryMask().setInvertAlpha(true);
    // Poussière en suspension dans le puits de la tour.
    this.add.particles(0, 0, 'px', {
      x: { min: cx - rw, max: cx + rw }, y: { min: 0, max: H }, lifespan: 3000, speedY: { min: 4, max: 14 }, speedX: { min: -4, max: 4 },
      scale: 0.5, alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.5 }, tint: [0xa8a0c8, 0xffd36a], frequency: 90,
    }).setDepth(4);
    this.add.image(0, 0, 'tower_shade').setOrigin(0).setDepth(90);
    const title = txt(this, W / 2, 22, floorName(d.floor), COL.moonLight).setOrigin(0.5, 0).setScale(4).setDepth(100);
    const sub = txt(this, W / 2, 58, nx ? nx.place : 'LA SUITE ARRIVE BIENTÔT...', COL.ui).setOrigin(0.5, 0).setScale(2).setDepth(100);
    for (const [o, dl] of [[title, 250], [sub, 550]] as const) {
      o.setAlpha(0).setY(o.y - 6);
      this.tweens.add({ targets: o, alpha: 1, y: o.y + 6, delay: dl, duration: 450, ease: 'Quad.out' });
    }
    this.draw();
    this.cameras.main.fadeIn(350);
  }

  /** Hauteur des pieds à l'angle a : posés sur la marche, petite montée à la fin de chacune. */
  private zOf(a: number) {
    const u = a / DT, i = Math.floor(u);
    return T.rise * (i + Math.min(1, Math.max(0, (u - i - 0.65) / 0.35)));
  }

  private proj(a: number, r: number, z: number): Pt {
    return { x: Math.round(T.cx + r * Math.cos(a)), y: Math.round(Y0 + r * Math.sin(a) * T.k - (z - this.cam)) };
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms / 1000, 1 / 30);
    if (this.t < CLIMB) {
      this.t += dt;
      this.phi += SPEED * dt * Math.min(1, this.t * 4, (CLIMB - this.t) * 3 + 0.25);
      const i = Math.floor(this.phi / DT);
      if (i !== this.stepI) { this.stepI = i; sfx.step(); }
      if (this.t >= CLIMB) this.arrive();
    }
    this.cam += ((this.phi / DT) * T.rise - 40 - this.cam) * Math.min(1, dt * 8);
    this.draw();
    if (this.end && (input.take('ok') || input.take('pause'))) this.scene.start('Menu');
  }

  /** Arrivée en haut : étage suivant (fondu) ou fin provisoire. */
  private arrive() {
    if (this.nextKey) {
      this.cameras.main.fadeOut(350, 6, 5, 12);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.nextKey));
    } else {
      this.end = true;
      txt(this, W / 2, 84, "MERCI D'AVOIR JOUÉ · ENTRÉE / ESPACE : MENU", COL.uiDim).setOrigin(0.5, 0).setDepth(100);
    }
  }

  private draw() {
    const { rc, rs, rise, rw, cx, k } = T, cam = this.cam;
    for (const tl of this.tiles) tl.o.tilePositionY = -Math.round(cam * tl.f);
    // Décor du mur : recyclé par période verticale.
    for (const dc of this.decor) {
      while (dc.z - cam < -60) dc.z += 420;
      const s = Math.sqrt(1 - dc.u * dc.u), x = Math.round(cx + dc.u * rw * 0.96), y = Math.round(Y0 - (dc.z - cam) - k * rw * s);
      dc.o.setPosition(x, y).setAlpha(0.55 + 0.45 * s);
      dc.glow.setPosition(x, y - 14);
    }
    // Marches visibles, triées de l'arrière vers l'avant ; le noyau sépare les deux moitiés.
    const g0 = this.back.clear(), g1 = this.front.clear(), i0 = Math.floor((cam - 70) / rise), i1 = Math.ceil((cam + H + 40) / rise);
    const list: { i: number; s: number }[] = [];
    for (let i = i0; i <= i1; i++) list.push({ i, s: Math.sin((i + 0.5) * DT) });
    list.sort((a, b) => a.s - b.s);
    for (const { i, s } of list) {
      const g = s < 0 ? g0 : g1, a = i * DT, b = a + DT, m = a + DT / 2, z = i * rise, f = 0.5 + 0.5 * (s + 1) / 2;
      // Tranche extérieure (limon) : visible côté avant.
      if (s > -0.25) {
        const top = [this.proj(a, rs, z), this.proj(m, rs, z), this.proj(b, rs, z)];
        g.fillStyle(shade([36, 33, 58], f)).fillPoints([...top, ...top.slice().reverse().map((q) => ({ x: q.x, y: q.y + rise + 8 }))], true);
        g.fillStyle(shade([20, 18, 32], f)).fillPoints(top.map((q) => ({ x: q.x, y: q.y + rise + 7 })).concat(top.slice().reverse().map((q) => ({ x: q.x, y: q.y + rise + 8 }))), true);
      }
      // Contremarche (face qui regarde vers les marches du bas) quand elle est tournée vers nous.
      if (Math.cos(a) < 0) g.fillStyle(shade([46, 43, 69], f)).fillPoints([this.proj(a, rc, z - rise), this.proj(a, rs, z - rise), this.proj(a, rs, z), this.proj(a, rc, z)], true);
      // Giron : pierre claire, nez de marche éclairé.
      g.fillStyle(shade([74, 70, 96], f)).fillPoints([this.proj(a, rc, z), this.proj(a, rs, z), this.proj(m, rs, z), this.proj(b, rs, z), this.proj(b, rc, z)], true);
      g.lineStyle(1, shade([120, 112, 146], f)).lineBetween(this.proj(a, rc, z).x, this.proj(a, rc, z).y, this.proj(a, rs, z).x, this.proj(a, rs, z).y);
    }
    // Le héros : derrière le noyau quand il passe à l'arrière (plus petit, dans l'ombre).
    const sp = Math.sin(this.phi), pos = this.proj(this.phi, RP, this.zOf(this.phi)), behind = sp < 0;
    const moving = this.t < CLIMB;
    if (behind) this.p.setMask(this.hideMask); else this.p.clearMask();
    this.p.setPosition(pos.x, pos.y + 1).setFlipX(sp > 0)
      .setScale(behind ? 0.9 : 1).setTint(behind ? 0x8a88a8 : 0xffffff)
      .setTexture(moving ? capeTex('run' + (Math.floor(this.t * 10) % 4), 2, 0, this.t * 9) : capeTex('idle' + (Math.floor(this.t * 1.6) % 2), 0, 0, this.t * 1.6));
  }
}
