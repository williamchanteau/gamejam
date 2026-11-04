import Phaser from 'phaser';
import { H, COL } from '../config';
import { txt } from '../art/font';
import { input } from '../input';
import { music } from '../audio/music';

/** DEV : #Musique = juke-box, chaque piste jouée seule (remplacé par un module vide au build). */
export class MusicScene extends Phaser.Scene {
  private i = 0;
  private rows: Phaser.GameObjects.BitmapText[] = [];
  private status!: Phaser.GameObjects.BitmapText;
  constructor() { super('Musique'); }

  create() {
    const names = music.names();
    txt(this, 12, 8, 'JUKE-BOX', COL.moonLight).setScale(2);
    const per = 16;
    this.rows = names.map((n, k) => {
      const tr = music.track(n);
      return txt(this, 14 + (k >= per ? 228 : 0), 30 + (k % per) * 11, `${n.toUpperCase()} ${tr.bpm} BPM`, COL.ui);
    });
    this.status = txt(this, 12, H - 36, '', COL.moonLight);
    txt(this, 12, H - 24, '↑↓ : PISTE · ENTRÉE : ÉCOUTER · P : PHASE 2 · S : STOP · M : COUPER', COL.uiDim);
    txt(this, 12, H - 13, 'C : SECTION SUIVANTE (TRÔNE) · V : VICTOIRE · D : DÉFAITE', COL.uiDim);
    let cue = 0;
    const key = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') music.setPhase(2);
      else if (e.code === 'KeyS') music.stop(0.3);
      else if (e.code === 'KeyV') music.stinger('victory');
      else if (e.code === 'KeyD') music.stinger('defeat');
      else if (e.code === 'KeyC') { const c = [3, 5, 8]; music.cue(c[cue++ % c.length]); }
    };
    addEventListener('keydown', key);
    this.events.once('shutdown', () => removeEventListener('keydown', key));
  }

  update() {
    const names = music.names();
    if (input.take('up')) this.i = (this.i + names.length - 1) % names.length;
    if (input.take('mdown')) this.i = (this.i + 1) % names.length;
    if (input.take('ok')) {
      const n = names[this.i], tr = music.track(n);
      if (tr.loop === undefined && !tr.jump) music.stinger(n); else music.play(n, 0.3, true);
    }
    this.rows.forEach((r, k) => r.setTint(k === this.i ? 0xffffff : COL.uiDim));
    const s = music.info();
    this.status.setText(s.running
      ? `${s.name ? `${s.name.toUpperCase()} MESURE ${s.bar + 1} PAS ${s.step + 1} PHASE ${s.phase}` : 'SILENCE'}${s.muted ? ' · COUPÉE' : ''}`
      : 'APPUIE SUR UNE TOUCHE POUR DÉBLOQUER LE SON');
  }
}
