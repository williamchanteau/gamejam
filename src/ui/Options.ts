import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import {
  input, goFullscreen, getLayout, setLayout, BINDS, Bind, Layout, getBind, keyText,
  setBind, clearBind, resetBinds, captureKey, cancelCapture, isReserved,
} from '../input';
import { sfx } from '../audio/sfx';
import { vol, setVol, VolKey } from '../audio/core';

const NAME: Record<Bind, string> = { left: 'GAUCHE', right: 'DROITE', jump: 'SAUTER', down: 'DESCENDRE', attack: 'ATTAQUE', dash: 'DASH', spell: 'SORT' };
const VOLS: [VolKey, string][] = [['master', 'GÉNÉRAL'], ['music', 'MUSIQUE'], ['sfx', 'EFFETS']];
const LAYOUTS: Layout[] = ['AZERTY', 'QWERTY'];
const TABS = ['SON', 'TOUCHES'];
const PW = 360, PH = 252, PX = (W - PW) / 2, PY = Math.floor((H - PH) / 2);
const LX = PX + 34;               // libellés
const SX = [PX + 214, PX + 304];  // centres des 2 colonnes
const TX = [W / 2 - 62, W / 2 + 62]; // onglets (écart assez large pour l'épée devant TOUCHES)
const SW = 84, SH = 13, D = 55;
const SL = PX + 172, SEG = 11, GAP = 2; // volume : 10 crans montants
const BACK_Y = PY + 220;

type Kind = 'tab' | 'layout' | 'bind' | 'vol' | 'reset' | 'back';
type Row = { y: number; kind: Kind; label: string; b?: Bind; v?: VolKey };
let lastTab = 0;

/** Panneau OPTIONS (menu titre et pause), 2 onglets : SON (volumes) et TOUCHES (2 par action, clavier affiché). Échap ou RETOUR ferme. */
export class OptionsPanel {
  private tab = lastTab;
  private rows: Row[] = [];
  private row = 0;
  private col = lastTab;
  private capturing = false;
  private blink = false;
  private msg = '';
  private msgUntil = 0;
  private g: Phaser.GameObjects.Graphics;
  private labels: (Phaser.GameObjects.BitmapText | null)[] = [];
  private cells: Phaser.GameObjects.BitmapText[][] = [];
  private foot: Phaser.GameObjects.BitmapText;
  private cursor: Phaser.GameObjects.Image;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private page: Phaser.GameObjects.GameObject[] = [];
  private unmuted: Record<VolKey, number> = { master: vol.master || 10, music: vol.music || 10, sfx: vol.sfx || 10 };

  constructor(private scene: Phaser.Scene, private onClose: () => void) {
    input.reset();
    const bg = scene.add.graphics().setDepth(D);
    bg.fillStyle(0x06050c, 0.85).fillRect(0, 0, W, H);
    bg.fillStyle(0x06050c).fillRect(PX - 1, PY - 1, PW + 2, PH + 2);
    bg.fillStyle(0x161428).fillRect(PX, PY, PW, PH);
    bg.fillStyle(0x3d4463).fillRect(PX + 2, PY, PW - 4, 1).fillRect(PX, PY + 2, 1, PH - 4).fillRect(PX + PW - 1, PY + 2, 1, PH - 4);
    bg.fillStyle(0x0d0b18).fillRect(PX + 2, PY + PH - 1, PW - 4, 1);
    bg.fillStyle(0x3d4463).fillRect(PX + 16, PY + 47, PW - 32, 1); // sous les onglets
    bg.fillStyle(0x2a2a44).fillRect(PX + 16, PY + PH - 20, PW - 32, 1);
    this.g = scene.add.graphics().setDepth(D + 1);
    this.objs.push(bg, this.g, this.T(W / 2, PY + 2, 'OPTIONS', COL.moonLight, this.objs).setOrigin(0.5, 0).setScale(2));
    this.foot = this.T(W / 2, PY + PH - 16, '', COL.uiDim, this.objs).setOrigin(0.5, 0);
    this.cursor = scene.add.image(0, 0, 'cursor').setDepth(D + 2);
    this.objs.push(this.cursor);
    this.build();
    this.moveCursor(true);
  }

  private T(x: number, y: number, s: string, c: number = COL.ui, list = this.page) {
    const t = txt(this.scene, x, y, s, c).setDepth(D + 2);
    list.push(t);
    return t;
  }

  /** Contenu de l'onglet courant (lignes, textes, zones cliquables). */
  private build() {
    for (const o of this.page) o.destroy();
    this.page = []; this.labels = []; this.cells = [];
    const rows: Row[] = [{ y: PY + 33, kind: 'tab', label: '' }];
    if (this.tab === 0) VOLS.forEach(([v, label], i) => rows.push({ y: PY + 72 + i * 24, kind: 'vol', v, label }));
    else {
      this.T(SX[0], PY + 52, 'TOUCHE 1', COL.uiDim).setOrigin(0.5, 0);
      this.T(SX[1], PY + 52, 'TOUCHE 2', COL.uiDim).setOrigin(0.5, 0);
      BINDS.forEach((b, i) => rows.push({ y: PY + 72 + i * 16, kind: 'bind', b, label: NAME[b] }));
      rows.push({ y: PY + 188, kind: 'layout', label: 'CLAVIER' }, { y: PY + 206, kind: 'reset', label: 'RÉINITIALISER LES TOUCHES' });
    }
    rows.push({ y: BACK_Y, kind: 'back', label: 'RETOUR' });
    this.rows = rows;
    rows.forEach((r, i) => {
      if (r.kind === 'tab') {
        this.labels.push(null);
        this.cells.push(TABS.map((s, c) => { this.zone(TX[c], r.y, SW, SH, i, c); return this.T(TX[c], r.y - 6, s).setOrigin(0.5, 0); }));
        return;
      }
      this.labels.push(this.T(LX, r.y - 6, r.label));
      const two = r.kind === 'bind' || r.kind === 'layout';
      const w = two || r.kind === 'vol' ? SX[0] - SW / 2 - LX : PW - 60;
      this.zone(LX - 4 + w / 2, r.y, w, SH, i, -1);
      if (two) this.cells.push(SX.map((x, c) => { this.zone(x, r.y, SW, SH, i, c); return this.T(x, r.y - 6, r.kind === 'layout' ? LAYOUTS[c] : '').setOrigin(0.5, 0); }));
      else if (r.kind === 'vol') { this.slideZone(r, i); this.cells.push([this.T(PX + 324, r.y - 6, '').setOrigin(0.5, 0)]); }
      else this.cells.push([]);
    });
    if (this.row >= rows.length) this.row = rows.length - 1;
    this.draw();
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
    this.page.push(z);
  }

  /** Curseur de volume : clic ou glisser pour régler (à gauche du 1er cran = coupé). */
  private slideZone(r: Row, i: number) {
    const w = 10 * (SEG + GAP) + 8;
    const z = this.scene.add.zone(SL - 8 + w / 2, r.y, w, SH + 4).setDepth(D + 3).setInteractive({ useHandCursor: true });
    const set = (p: Phaser.Input.Pointer) => {
      if (this.capturing) return;
      this.pick(i, this.col);
      const n = Phaser.Math.Clamp(Math.ceil((p.x - SL + 1) / (SEG + GAP)), 0, 10);
      if (n !== vol[r.v!]) this.setVolume(r.v!, n);
    };
    z.on('pointerover', () => this.pick(i, this.col));
    z.on('pointerdown', set);
    z.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && set(p));
    this.page.push(z);
  }

  private setVolume(v: VolKey, n: number) {
    setVol(v, n);
    if (n > 0) this.unmuted[v] = n;
    sfx.tick();
    this.draw();
  }

  private setTab(c: number) {
    this.col = c;
    if (c !== this.tab) { this.tab = lastTab = c; this.msg = ''; sfx.tick(); this.build(); }
    else this.draw();
    this.moveCursor();
  }

  private pick(r: number, c: number) {
    if (this.capturing || (r === this.row && c === this.col)) return;
    const moved = r !== this.row || this.rows[r].kind === 'tab';
    this.row = r;
    this.col = c;
    sfx.tick();
    this.draw();
    if (moved) this.moveCursor();
  }

  private moveCursor(silent = false) {
    const tw = this.scene.tweens, r = this.rows[this.row];
    const x = r.kind === 'tab' ? TX[this.col] - SW / 2 - 14 : LX - 18, y = r.y;
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

  /** 10 barres montantes, pleines jusqu'au volume. */
  private slider(r: Row, i: number, sel: boolean) {
    const n = vol[r.v!], g = this.g;
    for (let k = 0; k < 10; k++) {
      const x = SL + k * (SEG + GAP), h = 4 + Math.round(k * 0.8), y = r.y + 5 - h, on = k < n;
      g.fillStyle(0x06050c).fillRect(x - 1, y - 1, SEG + 2, h + 2);
      g.fillStyle(on ? (sel ? COL.moon : 0x8a93b8) : 0x12101e).fillRect(x, y, SEG, h);
      g.fillStyle(on ? (sel ? COL.moonLight : 0xb8c0dc) : 0x2a2a44).fillRect(x, y, SEG, 1);
    }
    this.cells[i][0].setText(n ? `${n * 10} %` : 'COUPÉ').setTint(sel ? COL.moonLight : n ? COL.ui : COL.uiDim);
  }

  private draw() {
    this.g.clear();
    const lay = LAYOUTS.indexOf(getLayout());
    this.rows.forEach((r, i) => {
      const rs = i === this.row;
      this.labels[i]?.setTint(rs ? COL.moonLight : r.kind === 'reset' || r.kind === 'back' ? COL.uiDim : COL.ui);
      if (r.kind === 'tab') TABS.forEach((_, c) => {
        const on = c === this.tab;
        this.frame(TX[c], r.y, on || (rs && c === this.col), false);
        this.cells[i][c].setTint(on || (rs && c === this.col) ? COL.moonLight : COL.uiDim);
        if (on) this.g.fillStyle(COL.ember, 0.7).fillRect(TX[c] - 12, r.y + 5, 24, 1);
      });
      else if (r.kind === 'vol') this.slider(r, i, rs);
      else if (r.kind === 'bind' || r.kind === 'layout') for (let c = 0; c < 2; c++) {
        const sel = rs && c === this.col, cap = sel && this.capturing;
        this.frame(SX[c], r.y, sel, cap && this.blink);
        const t = this.cells[i][c], k = r.b ? getBind(r.b, c) : null;
        if (r.b) t.setText(cap ? (this.blink ? '. . .' : '') : keyText(k) || '-');
        const on = r.b ? !!k : c === lay;
        t.setTint(sel ? COL.moonLight : on ? COL.ui : COL.uiDim);
        if (!r.b && c === lay) this.g.fillStyle(COL.ember, 0.7).fillRect(SX[c] - 14, r.y + 5, 28, 1); // clavier choisi
      }
    });
    this.drawFoot();
  }

  private drawFoot() {
    const k = this.rows[this.row].kind;
    const [s, c] = this.capturing ? ['APPUIE SUR UNE TOUCHE · ÉCHAP : ANNULER', COL.moonLight]
      : this.msg ? [this.msg, COL.moonLight]
      : k === 'tab' ? ["←→ : CHANGER D'ONGLET · ÉCHAP : RETOUR", COL.uiDim]
      : k === 'vol' ? ['←→ : RÉGLER · ENTRÉE : COUPER / REMETTRE', COL.uiDim]
      : k === 'layout' ? ['LETTRES AFFICHÉES POUR LES TOUCHES PAR DÉFAUT', COL.uiDim]
      : k === 'bind' ? ['ENTRÉE : CHANGER · SUPPR : EFFACER · ÉCHAP : RETOUR', COL.uiDim]
      : k === 'reset' ? ['REMET TOUTES LES TOUCHES PAR DÉFAUT', COL.uiDim]
      : ['ÉCHAP : RETOUR', COL.uiDim];
    this.foot.setText(s).setTint(c);
  }

  private activate() {
    goFullscreen();
    const r = this.rows[this.row];
    if (r.kind === 'back') return this.close();
    if (r.kind === 'tab') return this.setTab(this.col);
    if (r.kind === 'vol') return this.setVolume(r.v!, vol[r.v!] ? 0 : this.unmuted[r.v!] || 10);
    sfx.select();
    this.msg = '';
    if (r.kind === 'layout') setLayout(LAYOUTS[this.col]);
    else if (r.kind === 'reset') { resetBinds(); this.say('TOUCHES PAR DÉFAUT RÉTABLIES'); }
    else this.listen(r.b!, this.col);
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
    for (const o of [...this.page, ...this.objs]) o.destroy();
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
    const n = this.rows.length, cur = this.rows[this.row];
    const go = (d: number) => {
      const r = (this.row + d + n) % n, k = this.rows[r].kind;
      this.pick(r, k === 'tab' ? this.tab : cur.kind === 'tab' ? 0 : this.col);
    };
    if (input.take('up')) go(-1);
    if (input.take('mdown')) go(1);
    const r = this.rows[this.row], dl = input.take('mleft'), dr = input.take('mright');
    if (dl || dr) {
      if (r.kind === 'tab') this.setTab(dl ? 0 : 1);
      else if (r.kind === 'vol') { const v = Phaser.Math.Clamp(vol[r.v!] + (dl ? -1 : 1), 0, 10); if (v !== vol[r.v!]) this.setVolume(r.v!, v); }
      else if (r.kind === 'bind' || r.kind === 'layout') this.pick(this.row, dl ? 0 : 1);
    }
    if (input.take('clear') && r.kind === 'bind') {
      this.say(clearBind(r.b!, this.col) ? 'TOUCHE EFFACÉE' : 'IL FAUT AU MOINS UNE TOUCHE');
      sfx.tick();
      this.draw();
    }
    if (input.take('ok')) this.activate();
  }
}
