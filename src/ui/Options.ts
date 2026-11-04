import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import {
  input, goFullscreen, getLayout, setLayout, BINDS, Bind, Layout, getBind, keyText,
  setBind, clearBind, resetBinds, captureKey, cancelCapture, isReserved,
} from '../input';
import { sfx } from '../audio/sfx';

const NAME: Record<Bind, string> = { left: 'GAUCHE', right: 'DROITE', jump: 'SAUTER', down: 'DESCENDRE', attack: 'ATTAQUE', dash: 'DASH', spell: 'SORT' };
const LAYOUTS: Layout[] = ['AZERTY', 'QWERTY'];
const PW = 360, PH = 240, PX = (W - PW) / 2, PY = (H - PH) / 2;
const LX = PX + 34;               // libellés
const SX = [PX + 214, PX + 304];  // centres des 2 colonnes
const SW = 84, SH = 13;
// Lignes (centres) : 0 clavier, 1..7 touches, 8 réinitialiser, 9 retour.
const ROWS = [PY + 38, ...BINDS.map((_, i) => PY + 82 + i * 16), PY + 196, PY + 210];
const RESET = 8, BACK = 9, D = 55;

/** Panneau OPTIONS (menu titre et pause) : clavier affiché + touches réattribuables (2 par action). Échap ou RETOUR ferme. */
export class OptionsPanel {
  private row = 0;
  private col = 0;
  private capturing = false;
  private blink = false;
  private msg = '';
  private msgUntil = 0;
  private g: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.BitmapText[] = [];
  private slots: Phaser.GameObjects.BitmapText[][] = [];
  private foot: Phaser.GameObjects.BitmapText;
  private cursor: Phaser.GameObjects.Image;
  private objs: Phaser.GameObjects.GameObject[] = [];

  constructor(private scene: Phaser.Scene, private onClose: () => void) {
    input.reset();
    const bg = scene.add.graphics().setDepth(D);
    bg.fillStyle(0x06050c, 0.85).fillRect(0, 0, W, H);
    bg.fillStyle(0x06050c).fillRect(PX - 1, PY - 1, PW + 2, PH + 2);
    bg.fillStyle(0x161428).fillRect(PX, PY, PW, PH);
    bg.fillStyle(0x3d4463).fillRect(PX + 2, PY, PW - 4, 1).fillRect(PX, PY + 2, 1, PH - 4).fillRect(PX + PW - 1, PY + 2, 1, PH - 4);
    bg.fillStyle(0x0d0b18).fillRect(PX + 2, PY + PH - 1, PW - 4, 1);
    bg.fillStyle(0x3d4463).fillRect(PX + 16, PY + 69, PW - 32, 1); // sous l'en-tête « TOUCHES »
    bg.fillStyle(0x2a2a44).fillRect(PX + 16, PY + PH - 20, PW - 32, 1);
    this.g = scene.add.graphics().setDepth(D + 1);
    this.objs.push(bg, this.g);
    const T = (x: number, y: number, s: string, c: number = COL.ui) => {
      const t = txt(scene, x, y, s, c).setDepth(D + 2);
      this.objs.push(t);
      return t;
    };
    T(W / 2, PY + 4, 'OPTIONS', COL.moonLight).setOrigin(0.5, 0).setScale(2);
    T(LX, PY + 55, 'TOUCHES', COL.uiDim);
    T(SX[0], PY + 55, 'TOUCHE 1', COL.uiDim).setOrigin(0.5, 0);
    T(SX[1], PY + 55, 'TOUCHE 2', COL.uiDim).setOrigin(0.5, 0);
    const names = ['CLAVIER', ...BINDS.map((b) => NAME[b]), 'RÉINITIALISER LES TOUCHES', 'RETOUR'];
    names.forEach((s, r) => {
      this.labels.push(T(LX, ROWS[r] - 6, s));
      const w = r <= 7 ? SX[0] - SW / 2 - LX + 4 : PW - 60;
      this.zone(LX - 4 + w / 2, ROWS[r], w, SH, r, -1);
      if (r > 7) return;
      this.slots.push(SX.map((x, c) => {
        this.zone(x, ROWS[r], SW, SH, r, c);
        return T(x, ROWS[r] - 6, r === 0 ? LAYOUTS[c] : '').setOrigin(0.5, 0);
      }));
    });
    this.foot = T(W / 2, PY + PH - 16, '', COL.uiDim).setOrigin(0.5, 0);
    this.cursor = scene.add.image(LX - 18, ROWS[0], 'cursor').setDepth(D + 2);
    this.objs.push(this.cursor);
    this.draw();
    this.moveCursor(true);
  }

  /** Zone cliquable : survol = sélection, clic = valider (col -1 = garder la colonne). */
  private zone(x: number, y: number, w: number, h: number, r: number, c: number) {
    const z = this.scene.add.zone(x, y, w, h).setDepth(D + 3).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => this.pick(r, c < 0 ? this.col : c));
    z.on('pointerdown', () => {
      if (this.capturing) { cancelCapture(); this.capturing = false; this.draw(); return; }
      this.pick(r, c < 0 ? this.col : c);
      this.activate();
    });
    this.objs.push(z);
  }

  private pick(r: number, c: number) {
    if (this.capturing || (r === this.row && c === this.col)) return;
    const moved = r !== this.row;
    this.row = r;
    this.col = c;
    sfx.tick();
    this.draw();
    if (moved) this.moveCursor();
  }

  private moveCursor(silent = false) {
    const tw = this.scene.tweens, x = LX - 18, y = ROWS[this.row];
    tw.killTweensOf(this.cursor);
    if (silent) this.cursor.setPosition(x, y);
    tw.add({
      targets: this.cursor, x, y, duration: silent ? 1 : 100, ease: 'Back.out',
      onComplete: () => { tw.add({ targets: this.cursor, x: x + 3, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); },
    });
  }

  private say(m: string) {
    this.msg = m;
    this.msgUntil = this.scene.time.now + 2200;
  }

  /** Case encadrée (même pierre que les boutons des menus). */
  private frame(cx: number, cy: number, sel: boolean, lit: boolean) {
    const g = this.g, x = Math.round(cx - SW / 2), y = cy - 6, w = SW, h = SH;
    g.fillStyle(0x06050c, 0.9).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(lit ? 0x2c2650 : sel ? 0x221d3a : 0x12101e, 0.92).fillRect(x, y, w, h);
    g.fillStyle(lit ? 0xd8fbff : sel ? 0x8fe8ff : 0x3d4463).fillRect(x + 2, y, w - 4, 1).fillRect(x, y + 2, 1, h - 4).fillRect(x + w - 1, y + 2, 1, h - 4);
    g.fillStyle(sel ? 0x3a6a8a : 0x0d0b18).fillRect(x + 2, y + h - 1, w - 4, 1);
    if (sel) {
      g.fillStyle(0xd8fbff);
      for (const [px, py] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]) g.fillRect(px, py, 1, 1);
    }
  }

  private draw() {
    this.g.clear();
    const lay = LAYOUTS.indexOf(getLayout());
    for (let r = 0; r <= 7; r++) for (let c = 0; c < 2; c++) {
      const sel = r === this.row && c === this.col, cap = sel && this.capturing;
      this.frame(SX[c], ROWS[r], sel, cap && this.blink);
      const t = this.slots[r][c];
      const k = r > 0 ? getBind(BINDS[r - 1], c) : null;
      if (r > 0) t.setText(cap ? (this.blink ? '. . .' : '') : keyText(k) || '-');
      const on = r === 0 ? c === lay : !!k;
      t.setTint(sel ? COL.moonLight : on ? COL.ui : COL.uiDim);
    }
    this.g.fillStyle(COL.ember, 0.7).fillRect(SX[lay] - 14, ROWS[0] + 5, 28, 1); // clavier choisi
    this.labels.forEach((t, r) => t.setTint(r === this.row ? COL.moonLight : r === RESET || r === BACK ? COL.uiDim : COL.ui));
    this.drawFoot();
  }

  private drawFoot() {
    const r = this.row;
    const [s, c] = this.capturing ? ['APPUIE SUR UNE TOUCHE · ÉCHAP : ANNULER', COL.moonLight]
      : this.msg ? [this.msg, COL.moonLight]
      : r === 0 ? ['LETTRES AFFICHÉES POUR LES TOUCHES PAR DÉFAUT', COL.uiDim]
      : r <= 7 ? ['ENTRÉE : CHANGER · SUPPR : EFFACER · ÉCHAP : RETOUR', COL.uiDim]
      : r === RESET ? ['REMET TOUTES LES TOUCHES PAR DÉFAUT', COL.uiDim]
      : ['ÉCHAP : RETOUR', COL.uiDim];
    this.foot.setText(s).setTint(c);
  }

  private activate() {
    goFullscreen();
    const r = this.row;
    if (r === BACK) return this.close();
    sfx.select();
    this.msg = '';
    if (r === 0) setLayout(LAYOUTS[this.col]);
    else if (r === RESET) { resetBinds(); this.say('TOUCHES PAR DÉFAUT RÉTABLIES'); }
    else this.listen(BINDS[r - 1], this.col);
    this.draw();
  }

  /** Attend la prochaine touche pour l'emplacement choisi. */
  private listen(b: Bind, c: number) {
    this.capturing = true;
    this.blink = true;
    captureKey((code, label) => {
      this.capturing = false;
      input.reset();
      if (code === 'Escape') this.msg = '';
      else if (isReserved(code)) this.say('TOUCHE RÉSERVÉE');
      else {
        const o = setBind(b, c, code, label);
        if (o !== false) sfx.select();
        this.say(o === false ? `${label} : SEULE TOUCHE DE ${NAME[this.owner(code)]}` : o ? `${label} : ÉCHANGÉE AVEC ${NAME[o]}` : `${NAME[b]} : ${label}`);
      }
      this.draw();
    });
  }

  private owner(code: string) {
    return BINDS.find((b) => [0, 1].some((i) => getBind(b, i)?.c === code)) ?? 'attack';
  }

  close() {
    cancelCapture();
    this.scene.tweens.killTweensOf(this.cursor);
    for (const o of this.objs) o.destroy();
    input.reset();
    this.onClose();
  }

  update() {
    const now = this.scene.time.now;
    if (this.capturing) {
      const b = Math.floor(now / 260) % 2 === 0;
      if (b !== this.blink) { this.blink = b; this.draw(); }
      return;
    }
    if (this.msg && now > this.msgUntil) { this.msg = ''; this.drawFoot(); }
    if (input.take('pause')) return this.close();
    if (input.take('up')) this.pick((this.row + 9) % 10, this.col);
    if (input.take('mdown')) this.pick((this.row + 1) % 10, this.col);
    if (this.row <= 7) {
      if (input.take('mleft')) this.pick(this.row, 0);
      if (input.take('mright')) this.pick(this.row, 1);
    }
    if (input.take('clear') && this.row >= 1 && this.row <= 7) {
      const b = BINDS[this.row - 1];
      this.say(clearBind(b, this.col) ? 'TOUCHE EFFACÉE' : 'IL FAUT AU MOINS UNE TOUCHE');
      sfx.tick();
      this.draw();
    }
    if (input.take('ok')) this.activate();
  }
}
