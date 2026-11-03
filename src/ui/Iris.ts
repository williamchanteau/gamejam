import Phaser from 'phaser';
import { W, H } from '../config';

/** Iris pixelisé centré sur (x, y) écran, liseré coloré : se ferme (open=false) ou s'ouvre, puis `done`. */
export function iris(s: Phaser.Scene, x: number, y: number, open: boolean, ms: number, rim: number, done?: () => void) {
  const g = s.add.graphics().setScrollFactor(0).setDepth(300);
  const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 6;
  const draw = (r: number) => {
    g.clear();
    for (let yy = 0; yy < H; yy += 2) {
      const dy = yy + 1 - y, half = r > Math.abs(dy) ? Math.sqrt(r * r - dy * dy) : -1;
      if (half < 0) { g.fillStyle(0x06050c).fillRect(0, yy, W, 2); continue; }
      const l = Math.round(x - half), rr = Math.round(x + half);
      g.fillStyle(0x06050c).fillRect(0, yy, l - 2, 2).fillRect(rr + 2, yy, W, 2);
      g.fillStyle(rim).fillRect(l - 2, yy, 2, 2).fillRect(rr, yy, 2, 2);
    }
  };
  draw(open ? 0 : R);
  s.tweens.addCounter({
    from: open ? 0 : R, to: open ? R : 0, duration: ms, ease: open ? 'Quad.out' : 'Quad.in',
    onUpdate: (tw) => draw(tw.getValue() ?? 0),
    onComplete: () => { if (open) g.destroy(); done?.(); },
  });
}
