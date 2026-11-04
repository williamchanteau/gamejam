import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { sfx } from '../audio/sfx';
import { Menu } from '../ui/Menu';
import { OptionsPanel } from '../ui/Options';
import { FLOORS, run } from '../floors';
import { YSOLDE } from '../bosses/ysolde';
import { NYCTHOR } from '../bosses/nycthor';
import { MCKING } from '../bosses/mcking';
import { TITLE_MOON } from '../art/title';

const LX = 26; // bord gauche du logo et des boutons
const BW = 104, DW = 192; // largeur des boutons : menu principal, difficulté (assez pour VRAIMENT FACILE)
let AX = 0; // axe du losange sous le logo : les boutons y sont centrés
const QUIT_I = 2; // position de QUITTER, le bouton du bas
const CHEAT = ['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowDown'];
const hillY = (x: number) => 228 + Math.round(Math.sin(x / 40) * 6 + Math.sin(x / 13) * 2);

/** Écran titre : logo + boutons encadrés à gauche, scène vivante à droite (cathédrale, lune, nuages, veilleur). */
export class MenuScene extends Phaser.Scene {
  private menu!: Menu;
  private bossMenu: Menu | null = null;
  private diff: Menu | null = null;
  private diffNotes: Phaser.GameObjects.GameObject[] = [];
  private sub: Phaser.GameObjects.Container | null = null;
  private opts: OptionsPanel | null = null;
  private cheat = 0;

  constructor() { super('Menu'); }

  /** Code caché : depuis QUITTER, ↓ ↓ → ↓ ouvre le menu de test des boss. */
  private onCheatKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (!this.menu.enabled) { this.cheat = 0; return; }
    if (!this.cheat && this.menu.i !== QUIT_I) return;
    this.cheat = e.code === CHEAT[this.cheat] ? this.cheat + 1 : 0;
    if (this.cheat < CHEAT.length) return;
    this.cheat = 0;
    sfx.select();
    this.bosses();
  };

  create() {
    input.reset();
    this.sub = null; this.opts = null; this.bossMenu = null; this.diff = null; this.diffNotes = []; this.cheat = 0;
    addEventListener('keydown', this.onCheatKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => removeEventListener('keydown', this.onCheatKey));
    this.add.image(0, 0, 'bg_title').setOrigin(0);
    const [mx, my] = TITLE_MOON;
    const halo = this.add.image(mx, my, 'glowC').setBlendMode(Phaser.BlendModes.ADD).setScale(3.2).setAlpha(0.3);
    this.tweens.add({ targets: halo, alpha: 0.42, scale: 3.4, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Nuages qui dérivent devant la lune.
    for (const [k, x, y, d] of [['cloud0', 380, 78, 70000], ['cloud1', 470, 92, 52000], ['cloud0', 160, 54, 90000]] as [string, number, number, number][]) {
      const c = this.add.image(x, y, k).setDepth(1);
      this.tweens.add({ targets: c, x: -70, duration: d * (x + 70) / (W + 140), onComplete: () => {
        c.x = W + 70;
        this.tweens.add({ targets: c, x: -70, duration: d, repeat: -1 });
      } });
    }
    // Veilleur encapuchonné sur la colline, face au château (respire, écharpe au vent).
    const px = 236, fig = this.add.image(px, hillY(px) + 1, 'p_idle0').setOrigin(0.5, 1).setDepth(5);
    this.time.addEvent({ delay: 450, loop: true, callback: () => fig.setTexture(fig.texture.key === 'p_idle0' ? 'p_idle1' : 'p_idle0') });
    // Brume rampante et braises.
    this.add.particles(0, 0, 'puff', {
      x: { min: -20, max: W }, y: { min: 222, max: 262 }, lifespan: 7000, speedX: { min: 4, max: 12 },
      scale: { start: 1.5, end: 3 }, alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.12 },
      tint: 0x8088b8, frequency: 140,
    }).setDepth(6);
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: W }, y: H + 2, lifespan: 6000, speedY: { min: -40, max: -15 }, speedX: { min: -8, max: 8 },
      scale: { start: 1, end: 0.5 }, alpha: { start: 1, end: 0 }, tint: [0xff8a2a, 0xffd36a, 0xc0441a], frequency: 140,
    }).setDepth(30);
    this.time.addEvent({ delay: 3500, loop: true, callback: () => this.bat() });
    // Voile sombre à gauche pour la lisibilité du menu.
    const veil = this.add.graphics().setDepth(20);
    for (let x = 0; x < 250; x += 2) veil.fillStyle(0x06050c, 0.72 * (1 - x / 250) ** 1.3).fillRect(x, 0, 2, H);

    const glow = this.add.image(LX - 6, 14, 'logo_glow').setOrigin(0, 0).setDepth(39).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    const logo = this.add.image(LX - 6, 14, 'logo').setOrigin(0).setDepth(40);
    AX = LX - 6 + Math.round(logo.width / 2);
    this.tweens.add({ targets: [logo, glow], y: 16, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: glow, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Braises qui s'échappent du pied des lettres.
    this.add.particles(0, 0, 'px', {
      x: { min: LX, max: LX + 190 }, y: { min: 46, max: 50 }, lifespan: 1800, speedY: { min: -26, max: -10 }, speedX: { min: -5, max: 5 },
      scale: { start: 1, end: 0.4 }, alpha: { start: 0.9, end: 0 }, tint: [0xff8a2a, 0xffd36a, 0xc0441a], frequency: 160,
    }).setDepth(41);
    this.menu = new Menu(this, AX, 82, [
      { label: 'JOUER', act: () => this.difficulty() },
      { label: 'OPTIONS', act: () => this.options() },
      { label: 'QUITTER', act: () => this.quit() },
      ...(import.meta.env.DEV ? [{ label: 'TESTER BOSS', x: W - 94, y: H - 32, w: 140, act: () => this.bosses() }] : []),
    ], { framed: BW, gap: 25 });
    this.cameras.main.fadeIn(250);
  }

  private bat() {
    const dir = Math.random() < 0.5 ? 1 : -1, y = 30 + Math.random() * 70;
    const b = this.add.image(dir > 0 ? 250 : W + 10, y, 'bat0').setFlipX(dir < 0).setDepth(2);
    this.tweens.add({ targets: b, x: dir > 0 ? W + 10 : 250, duration: 5000, onComplete: () => b.destroy() });
    this.tweens.add({ targets: b, y: y + 10, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({ delay: 110, repeat: 44, callback: () => b.active && b.setTexture(b.texture.key === 'bat0' ? 'bat1' : 'bat0') });
  }

  private go(key: string) {
    this.menu.enabled = false;
    if (this.bossMenu) this.bossMenu.enabled = false;
    if (this.diff) this.diff.enabled = false;
    this.cameras.main.fadeOut(200, 6, 5, 12);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  private play(easy: boolean, hard: boolean) {
    run.easy = easy; run.hard = hard;
    this.go('Outside');
  }

  /** JOUER → choix de la difficulté, du plus facile au plus dur, textes à droite ; NORMAL présélectionné. */
  private difficulty() {
    input.reset();
    this.menu.enabled = false; this.menu.setVisible(false);
    const y0 = 82, gap = 25;
    this.diff = new Menu(this, LX + DW / 2, y0, [
      { label: 'VRAIMENT FACILE', act: () => this.play(true, false) },
      { label: 'NORMAL', act: () => this.play(false, false) },
      { label: 'DIFFICILE', act: () => this.play(false, true) },
      { label: 'RETOUR', act: () => this.closeDiff() },
    ], { framed: DW, gap });
    this.diff.select(1, true);
    // Sur plaque sombre : au-delà du voile, le texte passe sur le décor éclairé.
    const note = (k: number, s: string) => {
      const t = txt(this, LX + DW + 10, y0 + k * gap + 6, s, COL.moonLight).setDepth(41);
      this.diffNotes.push(this.add.rectangle(t.x - 4, t.y + 1, t.width + 8, 11, 0x06050c, 0.75).setOrigin(0).setDepth(40), t);
    };
    note(0, '(MODE HISTOIRE)');
    note(1, 'SAUVEGARDE AU DÉBUT DE CHAQUE BOSS');
  }

  private closeDiff() {
    this.diff?.destroy(); this.diff = null;
    for (const o of this.diffNotes) o.destroy();
    this.diffNotes = [];
    this.menu.setVisible(true); this.menu.enabled = true;
    input.reset();
  }

  private bosses() {
    if (this.sub || this.opts) return;
    input.reset();
    this.menu.enabled = false; this.menu.setVisible(false);
    const backdrop = this.add.rectangle(0, 0, W, H, 0x06050c, 0.94).setOrigin(0);
    const title = txt(this, W / 2, 45, 'TESTER LES BOSS', COL.moonLight).setOrigin(0.5, 0).setScale(2);
    this.sub = this.add.container(0, 0, [backdrop, title]).setDepth(100);
    const defs = [YSOLDE, NYCTHOR, MCKING];
    this.bossMenu = new Menu(this, W / 2, 100, [
      ...FLOORS.map((f, i) => ({ label: defs[i]?.name ?? f.place, act: () => { run.easy = false; run.hard = false; run.upgrade = ''; this.go(f.scene); } })),
      { label: 'RETOUR', act: () => this.closeSub() },
    ], { framed: 220, gap: 38, depth: 110 });
  }

  private options() {
    this.menu.setVisible(false);
    this.menu.enabled = false;
    this.opts = new OptionsPanel(this, () => { this.opts = null; this.menu.setVisible(true); this.menu.enabled = true; });
  }

  private quit() {
    window.close(); // ne marche que si l'onglet a été ouvert par un script
    this.time.delayedCall(150, () => this.popup("MERCI D'AVOIR JOUÉ !\n\nTU PEUX FERMER L'ONGLET."));
  }

  private popup(text: string) {
    if (this.sub) return;
    const w = 220, h = 70;
    const box = this.add.graphics();
    box.fillStyle(0x06050c, 0.85).fillRect(0, 0, W, H);
    box.fillStyle(0x161428).fillRect(W / 2 - w / 2, H / 2 - h / 2, w, h);
    box.lineStyle(1, 0x3d4463).strokeRect(W / 2 - w / 2 + 0.5, H / 2 - h / 2 + 0.5, w - 1, h - 1);
    const t = txt(this, W / 2, H / 2 - 26, text, COL.moonLight).setOrigin(0.5, 0).setCenterAlign();
    const back = txt(this, W / 2, H / 2 + 20, 'ÉCHAP : RETOUR', COL.uiDim).setOrigin(0.5, 0);
    const hit = this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => this.closeSub());
    this.sub = this.add.container(0, 0, [box, t, back, hit]).setDepth(100);
    this.menu.enabled = false;
  }

  private closeSub() {
    this.bossMenu?.destroy(); this.bossMenu = null;
    this.sub?.destroy(); this.sub = null;
    this.menu.setVisible(true);
    this.menu.enabled = true;
    input.reset();
  }

  update() {
    if (this.opts) return this.opts.update();
    if (this.diff) return input.take('pause') ? this.closeDiff() : this.diff.update();
    if (!this.sub) return this.menu.update();
    if (this.bossMenu) {
      if (input.take('pause')) this.closeSub();
      else this.bossMenu.update();
      return;
    }
    if (input.take('pause') || input.take('ok')) this.closeSub();
  }
}
