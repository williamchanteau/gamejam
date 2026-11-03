import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { input, getLayout, setLayout, keyLabel } from '../input';
import { Menu } from '../ui/Menu';

/** Écran titre : JOUER (sélectionné par défaut), TUTO, OPTIONS, QUITTER. */
export class MenuScene extends Phaser.Scene {
  private menu!: Menu;
  private sub: Phaser.GameObjects.Container | null = null;
  private opts: Menu | null = null;
  private optsBox: Phaser.GameObjects.Container | null = null;

  constructor() { super('Menu'); }

  create() {
    input.reset();
    this.sub = null; this.opts = null; this.optsBox = null;
    this.add.image(0, 0, 'bg_title').setOrigin(0);
    this.add.image(372, 66, 'glowC').setBlendMode(Phaser.BlendModes.ADD).setScale(3.2).setAlpha(0.35);
    const logo = this.add.image(W / 2, 40, 'logo').setDepth(40);
    this.tweens.add({ targets: logo, y: 43, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Braises qui montent.
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: W }, y: H + 2, lifespan: 6000, speedY: { min: -40, max: -15 }, speedX: { min: -8, max: 8 },
      scale: { start: 1, end: 0.5 }, alpha: { start: 1, end: 0 }, tint: [0xff8a2a, 0xffd36a, 0xc0441a], frequency: 120,
    }).setDepth(30);

    this.menu = new Menu(this, W / 2, 100, [
      { label: 'JOUER', act: () => this.go('Outside') },
      { label: 'TUTO', act: () => this.go('Test') },
      { label: 'OPTIONS', act: () => this.options() },
      { label: 'QUITTER', act: () => this.quit() },
    ]);
    txt(this, W / 2, H - 13, '↑↓ : CHOISIR · ENTRÉE/ESPACE : VALIDER', COL.uiDim).setOrigin(0.5, 0).setDepth(40);
    this.cameras.main.fadeIn(250);
  }

  private go(key: string) {
    this.menu.enabled = false;
    this.cameras.main.fadeOut(200, 6, 5, 12);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  /** Options : choix du clavier (lettres affichées pour les actions). */
  private options() {
    const w = 280, h = 120, x = W / 2 - w / 2, y = 90;
    const g = this.add.graphics();
    g.fillStyle(0x06050c, 0.85).fillRect(0, 0, W, H);
    g.fillStyle(0x161428).fillRect(x, y, w, h);
    g.lineStyle(1, 0x3d4463).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const head = txt(this, W / 2, y + 8, 'OPTIONS', COL.moonLight).setOrigin(0.5, 0);
    const keys = txt(this, W / 2, y + 88, '', COL.uiDim).setOrigin(0.5, 0).setCenterAlign();
    const show = () => keys.setText(`←→ BOUGER · ↑/ESPACE SAUTER · ↓ DESCENDRE\n${keyLabel('attack')} ATTAQUE · ${keyLabel('dash')} DASH · ${keyLabel('spell')} SORT`);
    show();
    this.optsBox = this.add.container(0, 0, [g, head, keys]).setDepth(45);
    this.menu.setVisible(false);
    this.menu.enabled = false;
    this.opts = new Menu(this, W / 2, y + 26, [
      { label: `CLAVIER : ${getLayout()}`, act: () => { setLayout(getLayout() === 'AZERTY' ? 'QWERTY' : 'AZERTY'); this.opts!.setLabel(0, `CLAVIER : ${getLayout()}`); show(); } },
      { label: 'RETOUR', act: () => this.closeOptions() },
    ]);
  }

  private closeOptions() {
    this.opts?.destroy(); this.opts = null;
    this.optsBox?.destroy(); this.optsBox = null;
    this.menu.setVisible(true);
    this.menu.enabled = true;
    input.reset();
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
    this.sub?.destroy(); this.sub = null;
    this.menu.enabled = true;
    input.reset();
  }

  update() {
    if (this.opts) { if (input.take('pause')) this.closeOptions(); else this.opts.update(); return; }
    if (!this.sub) return this.menu.update();
    if (input.take('pause') || input.take('ok')) this.closeSub();
  }
}
