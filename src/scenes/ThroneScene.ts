import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { capeTex } from '../art/player';
import { THR } from '../art/throne';
import { CITIZENS, type Citizen, type Kind } from '../art/citizens';
import { hash } from '../art/room';
import { shout } from '../ui/Shout';
import { CREDITS, ROLL_SECONDS } from './credits';

type Img = Phaser.GameObjects.Image;
type Mood = 'cheer' | 'hush' | 'wild';
type Person = { o: Img; c: Citizen; y: number; t: number; v: number; front: boolean };
const ADD = Phaser.BlendModes.ADD;
const LINES: Record<Kind, string[]> = {
  human: ['VIVE LE ROI !', 'LONGUE VIE AU ROI !', 'GLOIRE À SA MAJESTÉ !', 'HOURRA !', 'QUEL HÉROS !', 'IL A VAINCU MᶜKING !', 'NOTRE SAUVEUR !'],
  goblin: ['GRAAH ! VIVE LE ROI !', 'ROI ! ROI ! ROI !', 'LUI TAPER FORT !', 'BON ROI ! PAS MANGER NOUS !'],
  mosquito: ['BZZZ ! VIVE LE ROI !', 'BZZZ... QUEL SANG ROYAL !', 'BZZ ! GLOIRE ! BZZ !', "BZZZ ! ON VOUS A À L'OEIL !"],
  bull: ['MEUUUH ! VIVE LE ROI !', 'MEUH-GNIFIQUE !', 'GLOIRE ! MEUUUH !', 'QUEL TAUREAU, CE ROI !'],
};
const CROWN_ON = 33;

/** Salle du trône : la foule acclame, le héros refuse qu'on le couronne et se couronne lui-même, s'assoit, crédits. */
export class ThroneScene extends Phaser.Scene {
  private crowd!: Person[];
  private mood: Mood = 'cheer';
  private hero!: Img;
  private heroPose: 'walk' | 'idle' | 'fixed' = 'walk';
  private crownImg!: Img;
  private worn = false;
  private servant!: Img;
  private cushion!: Img;
  private bubbles!: { x: number; hw: number; until: number }[];
  private t = 0;
  private nextBubble = 0;
  private nextRoar = 0;
  private roll: Phaser.GameObjects.Container | null = null;
  private rollEnd = 0;
  private rollY = 0;
  private finished = false;
  private leaving = false;

  constructor() { super('Throne'); }

  create() {
    input.reset();
    this.crowd = []; this.bubbles = []; this.mood = 'cheer'; this.heroPose = 'walk'; this.worn = false;
    this.t = 0; this.nextBubble = 0.5; this.nextRoar = 0; this.roll = null; this.finished = false; this.leaving = false;
    const a = this.add, cam = this.cameras.main;
    cam.setBounds(0, 0, THR.w, H).setScroll(0, 0);
    a.image(0, 0, 'thr_bg').setOrigin(0).setDepth(0);
    // Lustres, halos, rais de lumière (au-dessus de la foule du fond, sous le héros).
    for (const x of THR.chandeliers) {
      a.image(x, 0, 'thr_chand').setOrigin(0.5, 0).setDepth(2);
      a.image(x, 24, 'glowO').setBlendMode(ADD).setScale(2.8).setAlpha(0.35).setDepth(2.1);
    }
    for (const x of THR.windows) {
      const s = a.image(x - 19, 62, 'thr_shaft').setOrigin(0).setBlendMode(ADD).setDepth(5);
      this.tweens.add({ targets: s, alpha: 0.65, duration: 1800 + x, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    a.image(640, 72, 'glowO').setBlendMode(ADD).setScale(5).setAlpha(0.3).setDepth(1);
    a.image(THR.x, THR.steps[2][1], 'thr_throne').setOrigin(0.5, 1).setDepth(6);

    // La foule : deux rangs au fond, un rang sombre devant (têtes en bas de l'écran).
    this.addRow(206, 3, 0xccc8d8, 20, 28, 548, false);
    this.addRow(217, 4, 0xe6e2ee, 23, 42, 556, false);
    this.addRow(296, 40, 0x3a3450, 30, 12, THR.w, true);
    a.particles(0, 0, 'px', {
      x: { min: 0, max: THR.w }, y: { min: 20, max: 200 }, lifespan: 3200, speedY: { min: -6, max: 6 }, speedX: { min: 2, max: 10 },
      scale: 0.5, tint: 0xffe0a0, alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.6 }, frequency: 80,
    }).setDepth(7);

    this.servant = a.image(604, THR.lane, 'sv_0').setOrigin(0.5, 1).setFlipX(true).setDepth(9);
    this.cushion = a.image(0, 0, 'thr_cushion').setDepth(9.5);
    this.crownImg = a.image(0, 0, 'crown_s').setOrigin(0.5, 1).setDepth(11);
    this.hero = a.image(-16, THR.lane, capeTex('run0', 1, 0, 0)).setOrigin(0.5, 1).setDepth(10);
    this.placeTray();

    cam.fadeIn(500, 255, 244, 220);
    this.tweens.add({ targets: this.hero, x: THR.stand, duration: 5400, ease: 'Linear', onComplete: () => this.present() });
  }

  private addRow(y: number, depth: number, tint: number, step: number, x0: number, x1: number, front: boolean) {
    for (let i = 0, x = x0; x < x1; i++, x += step + hash(i, depth) * 8) {
      const r = hash(i, depth * 3), c = CITIZENS[this.pick(r, front)];
      const o = this.add.image(Math.round(x), y, `${c.key}_0`).setOrigin(0.5, 1).setDepth(depth + (i % 2) * 0.1).setTint(tint);
      this.crowd.push({ o, c, y, t: hash(i, depth * 5) * 9, v: 3.5 + hash(i, depth * 7) * 3, front });
    }
  }

  /** Répartition : moitié d'humains, le reste en gobelins, moustiques, taureaux. */
  private pick(r: number, front: boolean) {
    const count = (k: Kind) => CITIZENS.filter((c) => c.kind === k), kind: Kind = r < 0.48 ? 'human' : r < 0.68 ? 'goblin' : r < 0.84 || front ? 'mosquito' : 'bull';
    const list = count(kind), c = list[Math.floor((r * 37) % list.length)];
    return CITIZENS.indexOf(c);
  }

  /** Coussin dans les mains du valet, couronne dessus (tant qu'elle n'est pas prise). */
  private placeTray() {
    const dir = this.servant.flipX ? -1 : 1, x = this.servant.x + dir * 18, y = this.servant.y - 22;
    this.cushion.setPosition(Math.round(x), Math.round(y));
    if (this.heroPose !== 'fixed' && !this.worn) this.crownImg.setPosition(Math.round(x), Math.round(y) - 2);
  }

  /** Bulle de foule, plus petite que le cri de boss. */
  private bubble(x: number, y: number, s: string, ms = 1250) {
    const cam = this.cameras.main, w = s.length * 6 + 8, h = 13;
    x = Math.round(Phaser.Math.Clamp(x, cam.scrollX + w / 2 + 3, cam.scrollX + W - w / 2 - 3)); y = Math.round(Math.max(h + 4, y));
    const g = this.add.graphics();
    g.fillStyle(0x06050c).fillRect(-w / 2 - 1, -h - 1, w + 2, h + 2).fillTriangle(-4, 0, 3, 0, -2, 6);
    g.fillStyle(0xffffff).fillRect(-w / 2, -h, w, h).fillTriangle(-3, -1, 2, -1, -2, 4);
    const box = this.add.container(x, y, [g, txt(this, 0, -h, s, 0x06050c).setOrigin(0.5, 0)]).setDepth(30).setScale(0.4);
    this.tweens.add({ targets: box, scale: 1, duration: 130, ease: 'Back.out' });
    this.tweens.add({ targets: box, alpha: 0, delay: ms, duration: 160, onComplete: () => box.destroy() });
    this.bubbles.push({ x, hw: w / 2, until: this.t + ms / 1000 + 0.2 });
  }

  private crowdBubble() {
    const cam = this.cameras.main;
    this.bubbles = this.bubbles.filter((b) => b.until > this.t);
    for (let tries = 0; tries < 8; tries++) {
      const p = this.crowd[Math.floor(Math.random() * this.crowd.length)];
      if (p.front || p.o.x < cam.scrollX + 20 || p.o.x > cam.scrollX + W - 20) continue;
      const l = LINES[p.c.kind], line = l[Math.floor(Math.random() * l.length)], hw = line.length * 3 + 4;
      if (this.bubbles.some((b) => Math.abs(b.x - p.o.x) < b.hw + hw + 6)) continue;
      this.bubble(p.o.x, p.y - p.c.h - 8, line);
      return;
    }
  }

  /** Le valet s'avance et présente le coussin ; le héros prend la couronne lui-même, la lève, se couronne. */
  private present() {
    const hero = this.hero, sv = this.servant, feet = THR.lane;
    this.heroPose = 'idle'; this.mood = 'hush';
    music.cue(3);
    const d = (ms: number, f: () => void) => this.time.delayedCall(ms, f);
    d(200, () => this.tweens.add({ targets: sv, x: 580, duration: 520, onUpdate: (tw) => { sv.setTexture(`sv_${Math.floor(tw.progress * 6) % 2}`); this.placeTray(); }, onComplete: () => {
      sv.setTexture('sv_0');
      this.bubble(sv.x, sv.y - 40, 'VOTRE MAJESTÉ...', 1300);
    } }));
    d(1900, () => {
      // Il s'apprête à couronner, mais le héros le devance.
      this.tweens.add({ targets: sv, y: feet - 1, duration: 100 });
      hero.setTexture('p_take');
      this.heroPose = 'fixed';
      sfx.ting();
      this.tweens.add({ targets: this.crownImg, x: hero.x + 11, y: feet - 26, duration: 170, ease: 'Quad.out' });
    });
    d(2300, () => {
      hero.setTexture('p_crownHi');
      this.tweens.add({ targets: this.crownImg, x: hero.x + 1, y: feet - 45, duration: 240, ease: 'Back.out' });
      const ex = txt(this, sv.x, sv.y - 72, '!', 0xffffff).setOrigin(0.5, 0).setScale(3).setDepth(20);
      this.tweens.add({ targets: sv, y: feet - 8, duration: 90, yoyo: true, ease: 'Quad.out', onUpdate: () => this.placeTrayOnly() });
      this.tweens.add({ targets: ex, alpha: 0, delay: 800, duration: 200, onComplete: () => ex.destroy() });
      sfx.warn();
    });
    d(2650, () => {
      sfx.bell();
      const halo = this.add.image(hero.x + 1, feet - 50, 'glowO').setBlendMode(ADD).setScale(0.3).setAlpha(0.9).setDepth(9);
      this.tweens.add({ targets: halo, scale: 2.2, duration: 900, ease: 'Sine.out', onComplete: () => this.tweens.add({ targets: halo, alpha: 0, duration: 500, onComplete: () => halo.destroy() }) });
      this.bubble(this.cameras.main.scrollX + 170, 162, 'OOOOOH...', 1100);
    });
    d(3650, () => {
      hero.setTexture('p_crownMid');
      this.tweens.add({ targets: this.crownImg, y: feet - 41, duration: 200, ease: 'Sine.inOut' });
    });
    d(3900, () => {
      hero.setTexture('p_crownLow');
      this.tweens.add({ targets: this.crownImg, y: feet - 37, duration: 200, ease: 'Sine.inOut' });
    });
    d(4120, () => this.crowned());
  }

  private placeTrayOnly() { const dir = this.servant.flipX ? -1 : 1; this.cushion.setPosition(Math.round(this.servant.x + dir * 18), Math.round(this.servant.y - 22)); }

  /** La couronne est sur sa tête : la salle explose. */
  private crowned() {
    this.worn = true; this.heroPose = 'idle'; this.mood = 'wild';
    const cam = this.cameras.main;
    this.tweens.add({ targets: this.servant, x: 590, angle: -16, duration: 260, ease: 'Sine.out', onUpdate: () => this.placeTrayOnly() });
    sfx.ting(); sfx.crowd(1.3);
    music.cue(5);
    cam.shake(380, 0.006);
    const flash = this.add.rectangle(0, 0, W, H, 0xfff4e8, 0.6).setOrigin(0).setScrollFactor(0).setDepth(150);
    this.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: W }, y: -6, lifespan: 3600, speedY: { min: 55, max: 110 }, speedX: { min: -22, max: 22 }, rotate: { min: 0, max: 360 },
      scale: { min: 0.7, max: 1.4 }, tint: [0xffd36a, 0xfff0b0, 0xb48cff, 0xe8ecf6, 0x7ad8c8], frequency: 22,
    }).setScrollFactor(0).setDepth(35);
    const big = shout(this, ['VIVE LE ROI !'], W / 2, 62, { scale: 3, ms: 0, depth: 190, screen: true, rays: true });
    this.time.delayedCall(2100, () => { big.close(); this.climb(); });
  }

  /** Le valet s'écarte, le héros monte les marches et s'assoit. */
  private climb() {
    const sv = this.servant, hero = this.hero;
    this.tweens.add({ targets: sv, x: 556, y: 262, angle: -10, duration: 420, ease: 'Quad.out', onUpdate: () => this.placeTrayOnly(), onComplete: () => sv.setDepth(12) });
    this.cushion.setDepth(12.5);
    this.time.delayedCall(350, () => {
      this.heroPose = 'walk';
      const path = [...THR.steps.map(([x, y]) => [x + 6, y]), [THR.x, THR.steps[2][1]]];
      const durs = [230, 200, 200, 300];
      this.tweens.chain({
        targets: hero, tweens: path.map(([x, y], i) => ({ x, y, duration: durs[i], ease: 'Sine.inOut', onStart: () => sfx.step() })),
        onComplete: () => this.sit(),
      });
    });
  }

  private sit() {
    this.heroPose = 'fixed'; this.worn = false;
    this.crownImg.setVisible(false);
    const hero = this.hero.setTexture('p_king').setDepth(10);
    sfx.thud();
    this.tweens.add({ targets: hero, scaleX: 1.08, scaleY: 0.92, duration: 90, yoyo: true, ease: 'Quad.out' });
    this.time.delayedCall(150, () => { this.bubble(hero.x, hero.y - 56, '...', 900); });
    this.time.delayedCall(1300, () => this.rollCredits());
  }

  /** Faux générique qui défile vite sur le panneau de gauche, le roi reste visible à droite. */
  private rollCredits() {
    music.cue(8);
    const a = this.add, panel = a.image(0, 0, 'thr_panel').setOrigin(0).setScrollFactor(0).setDepth(80).setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 500 });
    const box = a.container(136, H, []).setScrollFactor(0).setDepth(81);
    let y = 0;
    for (const [kind, s] of CREDITS) {
      if (kind === 'gap') { y += 10; continue; }
      const scale = kind === 'title' ? 2 : 1, col = kind === 'role' ? COL.moonLight : kind === 'title' ? 0xffd36a : 0xe8ecf6;
      box.add(txt(this, 0, y, s, col).setOrigin(0.5, 0).setScale(scale));
      y += 11 * scale;
    }
    this.roll = box;
    this.rollEnd = y;
    this.rollY = H;
  }

  private endCard() {
    this.finished = true;
    const x = 136;
    const fin = txt(this, x, 70, 'FIN', 0xffd36a).setOrigin(0.5, 0).setScale(5).setDepth(82).setScrollFactor(0);
    const th = txt(this, x, 136, "MERCI D'AVOIR JOUÉ", COL.ui).setOrigin(0.5, 0).setDepth(82).setScrollFactor(0);
    const go = txt(this, x, 156, 'ENTRÉE / ESPACE : MENU', COL.moonLight).setOrigin(0.5, 0).setDepth(82).setScrollFactor(0);
    for (const o of [fin, th, go]) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 450 }); }
    this.tweens.add({ targets: go, alpha: 0.35, delay: 900, duration: 500, yoyo: true, repeat: -1 });
    input.reset();
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms / 1000, 1 / 30), hero = this.hero;
    this.t += dt;
    const cam = this.cameras.main;
    cam.scrollX = Math.round(Phaser.Math.Linear(cam.scrollX, Phaser.Math.Clamp(hero.x - W * 0.46, 0, THR.w - W), Math.min(1, dt * 3.5)));

    if (this.heroPose === 'walk') hero.setTexture(capeTex('run' + (Math.floor(this.t * 8) % 4), 1, 0, this.t * 7));
    else if (this.heroPose === 'idle') hero.setTexture(capeTex('idle' + (Math.floor(this.t * 1.6) % 2), 0, 0, this.t * 1.6));
    if (this.worn) {
      const key = hero.texture.key, bob = /run[13]|idle1/.test(key) ? 1 : 0, lean = key.includes('run') ? 1 : 0;
      this.crownImg.setPosition(Math.round(hero.x) + lean, Math.round(hero.y) - CROWN_ON + bob);
    } else if (this.heroPose !== 'fixed') this.placeTray();

    for (const p of this.crowd) {
      p.t += dt * p.v;
      const near = Math.abs(p.o.x - hero.x) < 70, amp = this.mood === 'wild' ? 7 : this.mood === 'cheer' ? (near ? 5 : 2) : 0, s = Math.sin(p.t);
      p.o.setY(p.y - Math.round(Math.abs(s) * amp)).setFlipX(hero.x < p.o.x);
      const up = this.mood === 'wild' ? s > -0.75 : this.mood === 'cheer' ? s > (near ? -0.2 : 0.3) : false;
      p.o.setTexture(`${p.c.key}_${up ? 1 : 0}`);
    }

    if (this.mood !== 'hush' && !this.finished) {
      if (this.t >= this.nextBubble) { this.crowdBubble(); this.nextBubble = this.t + (this.mood === 'wild' ? 0.32 : 0.5) + Math.random() * 0.3; }
      if (this.t >= this.nextRoar) { sfx.crowd(this.mood === 'wild' ? 1.1 : 0.7); this.nextRoar = this.t + 1.25; }
    } else if (this.finished && this.t >= this.nextRoar) { sfx.crowd(0.3); this.nextRoar = this.t + 1.8; }

    if (this.roll) {
      this.rollY -= ((this.rollEnd + H) / ROLL_SECONDS) * (dms / 1000);
      this.roll.y = Math.round(this.rollY);
      if (this.rollY < -this.rollEnd) { this.roll.destroy(); this.roll = null; this.endCard(); }
    }
    if (this.finished && !this.leaving && (input.take('ok') || input.take('pause'))) {
      this.leaving = true;
      sfx.select();
      cam.fadeOut(400, 6, 5, 12);
      cam.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    }
  }
}
