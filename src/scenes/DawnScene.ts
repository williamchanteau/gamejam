import Phaser from 'phaser';
import { W } from '../config';
import { input } from '../input';
import { sfx } from '../audio/sfx';

type Img = Phaser.GameObjects.Image;
const ADD = Phaser.BlendModes.ADD;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const hex = (a: number, b: number, t: number) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};
/** Durée du plan ; au-delà, fondu vers la salle du trône. */
const LENGTH = 6.2;
/** Mâts du château (x, y) : mêmes coordonnées que art/ending.ts. */
const FLAGS = [[250, 32], [166, 102], [333, 108]];

/** Le château de loin, sans personnage : la nuit cède la place au jour. */
export class DawnScene extends Phaser.Scene {
  private t = 0;
  private done = false;
  private fired = 0;
  private skyN!: Img; private skyD!: Img; private landN!: Img; private landD!: Img;
  private sun!: Img; private sunGlow!: Img; private moon!: Img; private moonGlow!: Img;
  private clouds!: { o: Img; v: number }[];
  private flags!: Img[];
  private birds!: { o: Img; v: number; y: number; ph: number }[];
  private twinkle!: { o: Phaser.GameObjects.Rectangle; ph: number }[];

  constructor() { super('Dawn'); }

  create() {
    input.reset();
    this.t = 0; this.done = false; this.fired = 0;
    const a = this.add;
    a.image(0, 0, 'end_sky2').setOrigin(0).setDepth(0);
    this.skyD = a.image(0, 0, 'end_sky1').setOrigin(0).setDepth(1);
    this.skyN = a.image(0, 0, 'end_sky0').setOrigin(0).setDepth(2);
    this.twinkle = [];
    for (let i = 0; i < 12; i++) this.twinkle.push({ o: a.rectangle((i * 151 + 23) % W, (i * 67 + 11) % 150, 1, 1, 0xffffff).setOrigin(0).setDepth(2.5), ph: i * 1.7 });
    this.moonGlow = a.image(0, 0, 'glowC').setBlendMode(ADD).setScale(2.4).setDepth(2.6);
    this.moon = a.image(0, 0, 'end_moon').setDepth(2.7);
    this.sunGlow = a.image(0, 0, 'glowO').setBlendMode(ADD).setDepth(2.8);
    this.sun = a.image(0, 0, 'end_sun').setDepth(2.9);
    this.clouds = [[8, 22, 'end_cloud0', 5], [190, 28, 'end_cloud1', 8], [330, 70, 'end_cloud0', 4], [440, 38, 'end_cloud1', 7], [110, 92, 'end_cloud1', 3]]
      .map(([x, y, k, v]) => ({ o: a.image(x as number, y as number, k as string).setDepth(3), v: v as number }));
    a.image(0, 0, 'end_land2').setOrigin(0).setDepth(5);
    this.landD = a.image(0, 0, 'end_land1').setOrigin(0).setDepth(6);
    this.landN = a.image(0, 0, 'end_land0').setOrigin(0).setDepth(7);
    this.flags = FLAGS.map(([x, y]) => a.image(x, y, 'end_flag0').setOrigin(0, 0.5).setDepth(8));
    this.birds = [];
    for (let i = 0; i < 6; i++) {
      const y = 62 + (i % 3) * 13 + i * 2;
      this.birds.push({ o: a.image(W + 24 + i * 15, y, 'end_bird0').setDepth(9), v: 54 + (i % 3) * 7, y, ph: i * 0.7 });
    }
    this.layout();
    this.cameras.main.fadeIn(600, 6, 5, 12);
  }

  /** Tout l'état visuel découle de t : nuit → aube (k1), aube → jour (k2). */
  private layout() {
    const t = this.t, k1 = clamp01((t - 0.8) / 2.3), k2 = clamp01((t - 3.0) / 2.1), u = clamp01((t - 1.0) / 4.6), e = 1 - (1 - u) * (1 - u);
    this.skyN.setAlpha(1 - k1); this.landN.setAlpha(1 - k1);
    this.skyD.setAlpha(1 - k2); this.landD.setAlpha(1 - k2);
    for (const s of this.twinkle) s.o.setAlpha((1 - k1) * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + s.ph))));
    const mx = 96 - 74 * k1, my = 46 + k1 * k1 * 190;
    this.moon.setPosition(Math.round(mx), Math.round(my));
    this.moonGlow.setPosition(mx, my).setAlpha(0.35 * (1 - k1));
    const sx = 404 - 44 * e, sy = 262 - 196 * e;
    this.sun.setPosition(Math.round(sx), Math.round(sy));
    this.sunGlow.setPosition(sx, sy).setScale(5 + 2.5 * Math.sin(u * Math.PI)).setAlpha(0.2 + 0.55 * Math.sin(u * Math.PI));
    const tint = k2 > 0 ? hex(0xf4b890, 0xffffff, k2) : hex(0x2a2850, 0xf4b890, k1);
    for (const c of this.clouds) c.o.setTint(tint);
    const fl = k2 > 0 ? hex(0xd8b8a0, 0xffffff, k2) : hex(0x4a4868, 0xd8b8a0, k1), fr = Math.floor(t * 7) % 2;
    for (const f of this.flags) f.setTint(fl).setTexture(`end_flag${fr}`);
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms / 1000, 1 / 30);
    this.t += dt;
    for (const c of this.clouds) { c.o.x -= c.v * dt; if (c.o.x < -70) c.o.x = W + 70; }
    if (this.t > 3.3) for (const b of this.birds) {
      b.o.x -= b.v * dt;
      b.o.setY(Math.round(b.y + Math.sin(this.t * 2 + b.ph) * 3)).setTexture(`end_bird${Math.floor(this.t * 8 + b.ph) % 2}`);
    }
    this.layout();
    // Sons calés sur la lumière : coq au premier rayon, cloches ; la fanfare du plein jour est dans la musique (tracks.ts, dawn).
    const beats: [number, () => void][] = [[2.5, sfx.rooster], [3.6, sfx.bell], [4.2, sfx.bell]];
    while (this.fired < beats.length && this.t >= beats[this.fired][0]) beats[this.fired++][1]();
    if (!this.done && this.t >= LENGTH) {
      this.done = true;
      this.cameras.main.fadeOut(450, 255, 244, 220);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Throne'));
    }
  }
}
