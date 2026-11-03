import Phaser from 'phaser';
import { COL } from '../config';
import { txt } from '../art/font';
import { input, goFullscreen } from '../input';
import { sfx } from '../audio/sfx';

export type Item = { label: string; act: () => void; x?: number; y?: number };
export interface MenuOpts { scale?: number; gap?: number; depth?: number; /** Boutons encadrés de largeur fixe. */ framed?: number }

/** Liste verticale : ↑↓, valider Entrée/Espace, ou souris. Le curseur glisse vers l'entrée choisie, qui « claque ». */
export class Menu {
  i = 0;
  enabled = true;
  private texts: Phaser.GameObjects.BitmapText[];
  private frames: Phaser.GameObjects.Graphics[] = [];
  private cursor: Phaser.GameObjects.Image;
  private hits: Phaser.GameObjects.GameObject[] = [];
  private scale: number;
  private fw: number;

  constructor(private scene: Phaser.Scene, private x: number, y: number, private items: Item[], o: MenuOpts = {}) {
    const scale = (this.scale = o.scale ?? 2), gap = o.gap ?? 24, depth = o.depth ?? 50;
    this.fw = o.framed ?? 0;
    this.texts = items.map((it, k) => {
      const t = txt(scene, it.x ?? x, it.y ?? (y + k * gap), it.label).setOrigin(0.5, 0).setScale(scale).setDepth(depth + 1);
      if (this.fw) this.frames.push(scene.add.graphics().setDepth(depth));
      const hit = this.fw ? scene.add.zone(t.x, t.y + 6.5 * scale, this.fw, 7 * scale + 10).setDepth(depth + 2) : t;
      hit.setInteractive({ useHandCursor: true });
      if (hit !== t) this.hits.push(hit);
      hit.on('pointerover', () => this.enabled && this.select(k));
      hit.on('pointerdown', () => { if (!this.enabled) return; this.select(k); this.confirm(); });
      return t;
    });
    this.cursor = scene.add.image(0, 0, 'cursor').setDepth(depth + 1);
    this.select(0, true);
  }

  private cursorX(t: Phaser.GameObjects.BitmapText) {
    return Math.round((this.fw ? t.x - this.fw / 2 - 8 : t.x - t.displayWidth / 2 - 10));
  }

  select(k: number, silent = false) {
    if (k === this.i && !silent) return;
    this.i = (k + this.items.length) % this.items.length;
    this.texts.forEach((t, j) => t.setTint(j === this.i ? COL.moonLight : COL.uiDim));
    this.frames.forEach((g, j) => this.drawFrame(g, j, j === this.i));
    const t = this.texts[this.i], cx = this.cursorX(t), cy = Math.round(t.y + 6.5 * this.scale);
    // Curseur : glisse vers l'entrée, puis oscille vers elle (« pointe »).
    const tw = this.scene.tweens;
    tw.killTweensOf(this.cursor);
    if (silent) this.cursor.setPosition(cx, cy);
    tw.add({
      targets: this.cursor, x: cx, y: cy, scaleX: 1, scaleY: 1, duration: silent ? 1 : 110, ease: 'Back.out',
      onComplete: () => { tw.add({ targets: this.cursor, x: cx + 3, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); },
    });
    // L'entrée choisie claque (léger agrandissement).
    if (!silent) {
      this.scene.tweens.killTweensOf(t);
      t.setScale(this.scale * 1.15);
      this.scene.tweens.add({ targets: t, scale: this.scale, duration: 160, ease: 'Back.out' });
      sfx.tick();
    }
  }

  /** Bouton encadré : pierre sombre, liseré lune et lueur braise si sélectionné. */
  private drawFrame(g: Phaser.GameObjects.Graphics, j: number, on: boolean) {
    const t = this.texts[j], w = this.fw, h = 7 * this.scale + 10, x = Math.round(t.x - w / 2), y = Math.round(t.y + 6.5 * this.scale - h / 2);
    g.clear();
    g.fillStyle(0x06050c, 0.9).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(on ? 0x221d3a : 0x12101e, 0.92).fillRect(x, y, w, h);
    g.fillStyle(on ? 0x8fe8ff : 0x3d4463).fillRect(x + 2, y, w - 4, 1).fillRect(x, y + 2, 1, h - 4).fillRect(x + w - 1, y + 2, 1, h - 4);
    g.fillStyle(on ? 0x3a6a8a : 0x0d0b18).fillRect(x + 2, y + h - 1, w - 4, 1);
    if (on) { // coins éclairés + braise en bas
      g.fillStyle(0xd8fbff);
      for (const [cx, cy] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]) g.fillRect(cx, cy, 1, 1);
      g.fillStyle(0xff8a2a, 0.5).fillRect(x + 6, y + h - 3, w - 12, 1);
    }
  }

  /** Change le libellé d'une entrée (ex. option qui bascule). */
  setLabel(k: number, label: string) {
    this.texts[k].setText(label);
    this.select(this.i, true);
  }

  setVisible(v: boolean) {
    for (const t of this.texts) t.setVisible(v);
    for (const f of this.frames) f.setVisible(v);
    for (const h of this.hits) (h as Phaser.GameObjects.Zone).setVisible(v);
    this.cursor.setVisible(v);
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.cursor);
    for (const o of [...this.texts, ...this.frames, ...this.hits, this.cursor]) o.destroy();
  }

  confirm() {
    sfx.select();
    goFullscreen();
    input.reset();
    // Petit éclat sur le curseur à la validation.
    this.scene.tweens.add({ targets: this.cursor, scaleX: 1.8, scaleY: 1.8, duration: 70, yoyo: true });
    this.items[this.i].act();
  }

  update() {
    if (!this.enabled) return;
    if (input.take('up')) this.select(this.i - 1);
    if (input.take('down')) this.select(this.i + 1);
    if (input.take('ok')) this.confirm();
  }
}
