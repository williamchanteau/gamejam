import Phaser from 'phaser';
import { W, H } from '../config';
import { canvasTex } from './pixel';
import { sfx, stormSound } from '../audio/sfx';

// Tempête de l'entrée du château : pluie en 3 plans (bandes qui défilent : 3 quads, rien par goutte),
// nuages, brume, rafales, éclaboussures, éclairs + tonnerre décalé. Éclairs pâles, jamais de rouge ; 2 pulsations au plus par éclair.

const ADD = Phaser.BlendModes.ADD;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
/** Pente des gouttes : 1 px vers la gauche tous les 4 px de chute. */
const SLOPE = 4;

/** Stries de pluie qui se raccordent aux bords de la tuile. */
function rainTex(s: Phaser.Scene, key: string, n: number, lenA: number, lenB: number, col: string) {
  canvasTex(s, key, 256, 256, (c) => {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(Math.random() * 256), y = Math.floor(Math.random() * 256), len = Math.floor(rnd(lenA, lenB));
      c.globalAlpha = rnd(0.35, 1);
      c.fillStyle = col;
      for (let k = 0; k < len; k++) c.fillRect((x - Math.floor(k / SLOPE) + 256) % 256, (y + k) % 256, 1, 1);
    }
  });
}

/** Masse floue tramée : nuages et brume (raccord horizontal). */
function blobTex(s: Phaser.Scene, key: string, w: number, h: number, n: number, rA: number, rB: number, shade: (v: number, y: number, x: number) => [string, number] | null) {
  const a = new Float32Array(w * h);
  for (let i = 0; i < n; i++) {
    const cx = Math.random() * w, cy = Math.random() * h, r = rnd(rA, rB), v = rnd(0.5, 1);
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(h, cy + r); y++)
      for (let dx = -Math.ceil(r); dx <= r; dx++) {
        const d = 1 - (dx * dx + (y - cy) * (y - cy)) / (r * r);
        if (d > 0) a[y * w + ((Math.floor(cx) + dx + w) % w)] += d * d * v;
      }
  }
  canvasTex(s, key, w, h, (c) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = shade(a[y * w + x], y, x);
      if (!p) continue;
      c.globalAlpha = p[1]; c.fillStyle = p[0]; c.fillRect(x, y, 1, 1);
    }
  });
}

export function makeStormArt(s: Phaser.Scene) {
  rainTex(s, 'rain_far', 150, 4, 8, '#7f8fc0');
  rainTex(s, 'rain_mid', 90, 7, 12, '#a4b4e0');
  rainTex(s, 'rain_near', 34, 13, 22, '#d0dcff');
  const cloud = (d: number) => (v: number, y: number, x: number): [string, number] | null => {
    const k = v * (1.2 - y / 60) - d; // s'efface avant les fenêtres de la tour
    if (k > 0.75) return ['#0c0b1a', 0.97];
    if (k > 0.42) return ['#14122a', 0.92];
    if (k > 0.22) return ['#1f1d3a', 0.8];
    return k > 0.1 && (x + y) % 2 === 0 ? ['#1f1d3a', 0.55] : null;
  };
  blobTex(s, 'storm_cloud0', 256, 72, 40, 14, 34, cloud(0.1));
  blobTex(s, 'storm_cloud1', 256, 72, 24, 12, 28, cloud(0.3));
  blobTex(s, 'storm_fog', 256, 48, 34, 10, 26, (v, y, x) => {
    const k = v * Math.sin((y / 48) * Math.PI);
    if (k > 0.75) return ['#9aa2cc', 0.2];
    if (k > 0.4) return ['#9aa2cc', 0.12];
    return k > 0.2 && (x + y) % 2 === 0 ? ['#9aa2cc', 0.08] : null;
  });
  canvasTex(s, 'storm_ripple', 9, 3, (c) => { c.fillStyle = '#c8d6ff'; c.fillRect(2, 0, 5, 1); c.fillRect(0, 1, 2, 1); c.fillRect(7, 1, 2, 1); c.fillRect(2, 2, 5, 1); });
}

/** Installe la tempête dans la scène ; tout s'arrête avec elle. `head` = où la pluie éclabousse le personnage. */
export function addStorm(s: Phaser.Scene, floorY: number, head: () => { x: number; y: number } | null) {
  const a = s.add;
  // Ciel chargé, salle assombrie (l'éclair lève ce voile).
  const far = a.tileSprite(0, 0, W, 72, 'storm_cloud0').setOrigin(0).setDepth(0.5);
  const near = a.tileSprite(0, -6, W, 72, 'storm_cloud1').setOrigin(0).setDepth(0.6);
  const veil = a.rectangle(0, 0, W, H, 0x0a0c20, 0.3).setOrigin(0).setDepth(0.7);
  const bolt = a.graphics().setDepth(0.8).setBlendMode(ADD);

  const rain = [
    { o: a.tileSprite(0, 0, W, floorY, 'rain_far').setOrigin(0).setDepth(2).setAlpha(0.55), v: 330 },
    { o: a.tileSprite(0, 0, W, floorY + 8, 'rain_mid').setOrigin(0).setDepth(7).setAlpha(0.7), v: 450 },
    { o: a.tileSprite(0, 0, W, H, 'rain_near').setOrigin(0).setDepth(11).setAlpha(0.75), v: 640 },
  ];
  const fog = a.tileSprite(0, floorY - 38, W, 48, 'storm_fog').setOrigin(0).setDepth(8.5);
  const sheen = a.rectangle(0, floorY, W, 2, 0x9fb4e8, 0.14).setOrigin(0).setDepth(5.2).setBlendMode(ADD);

  // Éclaboussures au sol, ronds dans l'eau, feuilles arrachées.
  const splash = a.particles(0, 0, 'px', {
    x: { min: 0, max: W }, y: { min: floorY - 1, max: floorY + 7 }, lifespan: { min: 130, max: 240 },
    speedX: { min: -34, max: 12 }, speedY: { min: -70, max: -22 }, gravityY: 420, scale: { min: 0.4, max: 0.8 },
    alpha: { start: 0.8, end: 0 }, tint: [0xc8d6ff, 0x8fa4d8], frequency: 16,
  }).setDepth(6);
  a.particles(0, 0, 'storm_ripple', {
    x: { min: 0, max: W }, y: { min: floorY + 2, max: H - 8 }, lifespan: 300, scaleX: { start: 0.3, end: 1.5 }, scaleY: { start: 0.5, end: 1 },
    alpha: { start: 0.4, end: 0 }, frequency: 42,
  }).setDepth(5.5);
  const leaves = a.particles(0, 0, 'px', {
    x: W + 6, y: { min: 50, max: floorY - 6 }, lifespan: 3200, speedX: { min: -210, max: -120 }, speedY: { min: -14, max: 46 },
    rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1.3 }, tint: [0x2a2418, 0x3c3020, 0x1c2a1a], alpha: 0.9, frequency: 260,
  }).setDepth(9);

  const flash = a.rectangle(0, 0, W, H, 0xbcd0ff, 0).setOrigin(0).setDepth(12).setBlendMode(ADD);

  const snd = stormSound();
  const onPause = () => snd?.duck(true), onResume = () => snd?.duck(false);
  s.events.on(Phaser.Scenes.Events.PAUSE, onPause);
  s.events.on(Phaser.Scenes.Events.RESUME, onResume);

  // Rafales : le vent forcit et retombe.
  let wind = 0.3, windTo = 0.3, nextGust = 2, t = 0, headT = 0;
  const update = (_time: number, dms: number) => {
    const dt = Math.min(dms / 1000, 0.05);
    t += dt;
    if (t > nextGust) { windTo = Math.random() < 0.45 ? rnd(0.75, 1) : rnd(0.1, 0.45); nextGust = t + rnd(2.5, 6); snd?.gust(windTo); }
    wind += (windTo - wind) * Math.min(1, dt * 1.6);
    for (const r of rain) {
      r.o.tilePositionY -= r.v * dt;
      r.o.tilePositionX += (r.v / SLOPE) * (0.85 + wind * 0.6) * dt;
    }
    far.tilePositionX += (5 + wind * 7) * dt;
    near.tilePositionX += (12 + wind * 18) * dt;
    fog.tilePositionX += (14 + wind * 34) * dt;
    fog.setAlpha(0.65 + 0.2 * Math.sin(t * 0.7));
    leaves.frequency = wind > 0.6 ? 110 : 320;
    splash.frequency = 20 - wind * 8;
    // La pluie rebondit aussi sur les épaules.
    headT -= dt;
    const h = headT <= 0 ? head() : null;
    if (h) { headT = 0.09; splash.emitParticleAt(h.x + rnd(-6, 6), h.y, 1); }
  };
  s.events.on(Phaser.Scenes.Events.UPDATE, update);

  /** Éclair dessiné dans le ciel, à gauche du château. */
  const drawBolt = () => {
    bolt.clear();
    const pts = (x: number, y: number, yEnd: number, spread: number) => {
      const p = [new Phaser.Math.Vector2(x, y)];
      while (y < yEnd) { y += rnd(10, 22); x += rnd(-spread, spread); p.push(new Phaser.Math.Vector2(x, Math.min(y, yEnd))); }
      return p;
    };
    const main = pts(rnd(30, 225), -4, rnd(135, 190), 13);
    const paths = [main];
    for (let i = 2; i < main.length - 1; i++) if (Math.random() < 0.3) paths.push(pts(main[i].x, main[i].y, main[i].y + rnd(24, 58), 15));
    paths.forEach((p, i) => {
      bolt.lineStyle(i ? 2 : 3, 0x8fb4ff, 0.35).strokePoints(p, false, false);
      bolt.lineStyle(1, i ? 0xbcd0ff : 0xffffff, 1).strokePoints(p, false, false);
    });
  };
  const strike = () => {
    if (!s.scene.isActive()) return;
    const close = Math.random() < 0.45;
    drawBolt();
    s.tweens.killTweensOf([flash, bolt, veil, sheen]);
    const hi = close ? 0.42 : 0.26;
    s.tweens.chain({ targets: flash, tweens: [{ alpha: hi, duration: 30 }, { alpha: hi * 0.2, duration: 80 }, { alpha: hi * 0.75, duration: 30 }, { alpha: 0, duration: 340 }] });
    s.tweens.chain({ targets: bolt, tweens: [{ alpha: 1, duration: 10 }, { alpha: 0.2, duration: 90 }, { alpha: 1, duration: 20 }, { alpha: 0, duration: 200 }] });
    s.tweens.chain({ targets: veil, tweens: [{ fillAlpha: 0, duration: 30 }, { fillAlpha: 0.3, duration: 500 }] });
    s.tweens.chain({ targets: sheen, tweens: [{ fillAlpha: 0.6, duration: 30 }, { fillAlpha: 0.14, duration: 450 }] });
    // Le son après la lumière : d'autant plus tard que la foudre est loin.
    s.time.delayedCall(close ? rnd(90, 220) : rnd(600, 1400), () => {
      sfx.thunder(close ? 1 : 0.35);
      if (close) s.cameras.main.shake(320, 0.004);
    });
    s.time.delayedCall(rnd(5500, 11000), strike);
  };
  s.time.delayedCall(1300, strike);

  s.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    snd?.stop();
    s.events.off(Phaser.Scenes.Events.UPDATE, update);
    s.events.off(Phaser.Scenes.Events.PAUSE, onPause);
    s.events.off(Phaser.Scenes.Events.RESUME, onResume);
  });
}
