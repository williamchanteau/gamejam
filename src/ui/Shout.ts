import Phaser from 'phaser';
import { W, H } from '../config';
import { txt } from '../art/font';

export interface ShoutOpts { scale?: number; ms?: number; depth?: number; /** Écran (scrollFactor 0) plutôt que monde. */ screen?: boolean; /** Pointe vers la droite (+1) ou la gauche (-1). */ tail?: number; /** Traits de vitesse rayonnants. */ rays?: boolean }

/** Cri façon manga : bulle blanche à pointes, lettres noires, tremblement. `ms` = 0 → reste jusqu'à close(). */
export function shout(s: Phaser.Scene, lines: string[], x: number, y: number, o: ShoutOpts = {}) {
  const sc = o.scale ?? 2, depth = o.depth ?? 96, cols = Math.max(...lines.map((l) => l.length));
  const tw = cols * 6 * sc, th = lines.length * 9 * sc, rx = tw / 2 + 14 + sc * 2, ry = th / 2 + 10 + sc * 2;
  // Bulle dans le monde : toujours entière à l'écran.
  if (!o.screen) x = Phaser.Math.Clamp(x, s.cameras.main.scrollX + rx * 1.4, s.cameras.main.scrollX + W - rx * 1.4);
  const g = s.add.graphics();
  const pts = (grow: number) => {
    const out: { x: number; y: number }[] = [], n = 30;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, k = (i % 2 ? 0.98 : 1.24 + ((i * 37) % 10) / 45) + grow / rx;
      let px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k;
      if (o.tail && i === (o.tail > 0 ? 2 : 12)) { px = o.tail * (rx + 42); py = ry * 0.7; }
      out.push({ x: px, y: py });
    }
    return out;
  };
  g.fillStyle(0x06050c).fillPoints(pts(3), true);
  g.fillStyle(0xffffff).fillPoints(pts(0), true);
  const c = s.add.container(x, y, [g]).setDepth(depth);
  lines.forEach((l, i) => c.add(txt(s, 0, (i - lines.length / 2) * 9 * sc - 2.5 * sc, l, 0x06050c).setOrigin(0.5, 0).setScale(sc)));
  if (o.screen) c.setScrollFactor(0);
  c.setScale(0.15);
  s.tweens.add({ targets: c, scale: 1, duration: 170, ease: 'Back.out' });

  // Traits de vitesse qui clignotent autour de la bulle.
  let rays: Phaser.GameObjects.Graphics | null = null, flick: Phaser.Time.TimerEvent | undefined;
  if (o.rays) {
    rays = s.add.graphics().setDepth(depth - 1).setScrollFactor(0);
    const draw = () => {
      if (!rays) return;
      rays.clear().fillStyle(0xffffff, 0.75);
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, r0 = 150 + Math.random() * 60, r1 = 330, d = 0.012 + Math.random() * 0.016;
        rays.fillTriangle(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0 * 0.7, W / 2 + Math.cos(a - d) * r1, H / 2 + Math.sin(a - d) * r1, W / 2 + Math.cos(a + d) * r1, H / 2 + Math.sin(a + d) * r1);
      }
    };
    draw();
    flick = s.time.addEvent({ delay: 70, loop: true, callback: draw });
  }
  const shake = s.time.addEvent({ delay: 35, loop: true, callback: () => c.setPosition(x + Phaser.Math.Between(-2, 2), y + Phaser.Math.Between(-2, 2)) });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    shake.remove(); flick?.remove();
    rays?.destroy(); rays = null;
    s.tweens.add({ targets: c, scale: 0, alpha: 0, duration: 130, ease: 'Quad.in', onComplete: () => c.destroy() });
  };
  if (o.ms !== 0) s.time.delayedCall(o.ms ?? 900, close);
  return { c, close };
}
