import Phaser from 'phaser';
import { W, H, COL } from '../config';
import { txt } from '../art/font';
import { sfx } from '../audio/sfx';
import type { BossDef } from '../entities/Boss';

const D = 200; // profondeur : au-dessus de tout
type GO = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/**
 * Présentation du boss (~2,4 s, jeu figé) : barres noires, bandeaux en diagonale + traits de vitesse,
 * portrait ×3 (silhouette → flash → couleur), nom qui claque lettre par lettre, titre, « EN GARDE ! ».
 */
export function announce(s: Phaser.Scene, def: BossDef, label: string, onDone: () => void) {
  const all: GO[] = [];
  const keep = <T extends GO>(o: T) => { (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0); (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(D); all.push(o); return o; };
  const tw = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) => s.tweens.add(cfg);

  // Fond assombri + barres de cinéma.
  const dim = keep(s.add.rectangle(0, 0, W, H, 0x06050c, 0).setOrigin(0));
  tw({ targets: dim, fillAlpha: 0.7, duration: 200 });
  const barT = keep(s.add.rectangle(0, -30, W, 30, 0x000000).setOrigin(0));
  const barB = keep(s.add.rectangle(0, H, W, 30, 0x000000).setOrigin(0));
  tw({ targets: barT, y: 0, duration: 220, ease: 'Cubic.out' });
  tw({ targets: barB, y: H - 30, duration: 220, ease: 'Cubic.out' });
  sfx.whoosh();

  // Bandeaux en diagonale (montent vers la droite) qui balaient l'écran.
  const band = (y0: number, h: number, col: number, a: number, from: number, delay: number) => {
    const g = keep(s.add.graphics());
    g.fillStyle(col, a).fillPoints([{ x: -60, y: y0 + 40 }, { x: W + 60, y: y0 - 40 }, { x: W + 60, y: y0 - 40 + h }, { x: -60, y: y0 + 40 + h }], true);
    g.x = from;
    tw({ targets: g, x: 0, duration: 260, delay, ease: 'Cubic.out' });
    return g;
  };
  band(118, 92, 0x110e20, 0.96, -W - 120, 40);
  band(110, 6, 0xff8a2a, 1, W + 120, 90);
  band(212, 3, 0xffd36a, 1, -W - 120, 120);
  // Traits de vitesse qui défilent en continu.
  for (let i = 0; i < 14; i++) {
    const y = 60 + Math.random() * 160, w = 20 + Math.random() * 70;
    const r = keep(s.add.rectangle(W + Math.random() * W, y, w, 1, 0xffffff, 0.25 + Math.random() * 0.3).setOrigin(0));
    tw({ targets: r, x: -w - 10, duration: 350 + Math.random() * 300, repeat: -1, delay: Math.random() * 200 });
  }

  // Portrait du boss ×3 (silhouette → flash blanc → couleurs).
  const por = def.portrait?.(s);
  if (por) {
    keep(por).setScale(3).setPosition(W + 160, 300);
    const imgs = por.list.filter((o) => o instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image[];
    imgs.forEach((o) => o.setTintFill(0x06050c));
    tw({ targets: por, x: W - 96, duration: 300, delay: 180, ease: 'Back.out' });
    s.time.delayedCall(560, () => {
      imgs.forEach((o) => o.setTintFill(0xffffff));
      sfx.slam();
      s.cameras.main.shake(140, 0.01);
      s.time.delayedCall(70, () => imgs.forEach((o) => o.clearTint()));
    });
  }

  // Nom en lettres géantes qui claquent une à une (ombre portée noire).
  const name = def.name, sc = 5, cw = 6 * sc;
  const x0 = 26, y0 = 128;
  [...name].forEach((ch, i) => {
    const sh = keep(txt(s, x0 + i * cw + 3, y0 + 3, ch, 0x000000).setScale(sc).setAlpha(0));
    const t = keep(txt(s, x0 + i * cw, y0, ch, 0xffffff).setScale(sc * 2).setAlpha(0));
    s.time.delayedCall(700 + i * 70, () => {
      tw({ targets: t, scale: sc, alpha: 1, duration: 90, ease: 'Back.out' });
      tw({ targets: sh, alpha: 0.8, duration: 90 });
      sfx.clank();
      if (i === name.length - 1) s.time.delayedCall(90, () => s.cameras.main.shake(120, 0.008));
    });
    s.time.delayedCall(1100 + i * 70, () => t.setTint(i % 2 ? 0xffe0c0 : 0xffffff));
  });
  // Titre + étiquette d'étage.
  const ttl = keep(txt(s, -200, y0 + 44, def.title, 0xffb060).setScale(2));
  s.time.delayedCall(700 + name.length * 70 + 80, () => { tw({ targets: ttl, x: x0 + 2, duration: 220, ease: 'Cubic.out' }); sfx.roar(); });
  const lab = keep(txt(s, x0 + 2, y0 - 16, label, COL.ui).setAlpha(0));
  tw({ targets: lab, alpha: 1, delay: 600, duration: 200 });

  // Sortie : tout file hors champ, puis « EN GARDE ! ».
  s.time.delayedCall(2050, () => {
    for (const o of all) if (o !== dim && o !== barT && o !== barB && o !== por) tw({ targets: o, x: (o.x ?? 0) - W, alpha: 0, duration: 220, ease: 'Cubic.in' });
    if (por) tw({ targets: por, x: W + 200, duration: 220, ease: 'Cubic.in' });
    tw({ targets: dim, fillAlpha: 0, duration: 250 });
    tw({ targets: barT, y: -30, duration: 250 });
    tw({ targets: barB, y: H, duration: 250 });
    sfx.whoosh();
  });
  s.time.delayedCall(2300, () => {
    for (const o of all) o.destroy();
    const go = txt(s, W / 2, H / 2 - 20, 'EN GARDE !', 0xffffff).setOrigin(0.5).setScale(8).setAlpha(0).setScrollFactor(0).setDepth(D);
    tw({ targets: go, scale: 4, alpha: 1, duration: 120, ease: 'Back.out' });
    tw({ targets: go, alpha: 0, scale: 5, delay: 500, duration: 200, onComplete: () => go.destroy() });
    s.cameras.main.shake(100, 0.006);
    sfx.slam();
    onDone();
  });
}
