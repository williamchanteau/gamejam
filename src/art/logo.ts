import Phaser from 'phaser';
import { poly, beam, ell, canvasTex } from './pixel';

type Ctx = CanvasRenderingContext2D;
const CAP = 22, K = 1.35, TOP = 7, M = 6; // capitales dessinées sur 22, agrandies ×K ; marge haute (flèche du A), marge glow
const CH = Math.round(CAP * K);

const P = (c: Ctx, ...p: number[]) => poly(c, '#fff', p.map((v) => v * K));
const E = (c: Ctx, x: number, y: number, rx: number, ry: number) => ell(c, '#fff', x * K, y * K, rx * K, ry * K);
const Bm = (c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number) => beam(c, '#fff', x0 * K, y0 * K, x1 * K, y1 * K, w * K);
const R = (c: Ctx, x0: number, y0: number, x1: number, y1: number) => P(c, x0, y0, x1, y0, x1, y1, x0, y1);
const cut = (c: Ctx, f: () => void) => { c.globalCompositeOperation = 'destination-out'; f(); c.globalCompositeOperation = 'source-over'; };
/** Fût à tête biseautée (plume) et pied évasé. */
const stem = (c: Ctx, x: number, w = 4) => { P(c, x, 1.5, x + w, -0.5, x + w, CAP, x, CAP); R(c, x - 1, CAP - 2, x + w + 1, CAP); };

/** Lettres taillées : [largeur, dessin]. Le O est une lune (teinte à part). */
const L: Record<string, [number, (c: Ctx) => void]> = {
  A: [15, (c) => {
    P(c, 7.5, -4, 15, CAP, 10.5, CAP, 9.6, 17, 5.4, 17, 4.5, CAP, 0, CAP);
    cut(c, () => P(c, 7.5, 5.5, 9.5, 13.5, 5.5, 13.5));
    R(c, -1, CAP - 2, 5, CAP); R(c, 10, CAP - 2, 16, CAP);
  }],
  S: [13, (c) => {
    P(c, 0, 3, 3, 0, 11, 0, 13, -2, 13, 6, 11, 3.5, 4, 3.5, 4, 8.5, 10, 8.5, 13, 11.5, 13, 19, 10, CAP, 2, CAP, 0, 24, 0, 16, 2, 18.5, 9, 18.5, 9, 12.5, 3, 12.5, 0, 9.5);
  }],
  H: [14, (c) => { stem(c, 0); stem(c, 10); R(c, 4, 9.5, 10, 13); }],
  E: [12, (c) => {
    stem(c, 0); R(c, 4, -0.5, 12, 3.5); P(c, 9, 3.5, 12, 3.5, 12, 7);
    R(c, 4, 9.5, 10, 12.5); R(c, 4, 18.5, 12, CAP); P(c, 9, 18.5, 12, 15, 12, 18.5);
  }],
  N: [15, (c) => { stem(c, 0, 3.5); stem(c, 11); Bm(c, 2, 0, 13, 22, 4.6); }],
  B: [14, (c) => {
    stem(c, 0);
    P(c, 4, -0.5, 10, -0.5, 12.5, 2.5, 12.5, 7.5, 10.5, 10, 4, 10); cut(c, () => R(c, 4, 3.5, 9, 7));
    P(c, 4, 10, 11, 10, 13.5, 12.5, 13.5, 19.5, 11, CAP, 4, CAP); cut(c, () => R(c, 4, 13, 10, 18.5));
  }],
  O: [15, (c) => { E(c, 7.5, 11, 7.5, 11.5); cut(c, () => E(c, 9, 10.5, 4.2, 7.5)); }],
  R: [14, (c) => {
    stem(c, 0);
    P(c, 4, -0.5, 10.5, -0.5, 13.5, 2.5, 13.5, 8.5, 10.5, 11.5, 4, 11.5); cut(c, () => R(c, 4, 3.5, 10, 8));
    Bm(c, 7.5, 11, 12.5, 21, 4.4); R(c, 9.5, CAP - 2, 15, CAP);
  }],
};

const ASH = ['#ffffff', '#ece8f8', '#d8d4ea', '#c2bedc', '#aca8ce', '#9692be', '#807aa8', '#6c6494', '#7a4a52', '#c0562a', '#ff8a2a'];
const MOON = ['#ffffff', '#f0feff', '#d0f8ff', '#a8eeff', '#80def4', '#5cc4e4', '#3e9cc8', '#2e7aa8'];

/** Logo ASHENBORN : capitales taillées dans la cendre, braise au pied, O en lune ; + texture de lueur. */
export function makeLogo(scene: Phaser.Scene, text = 'ASHENBORN') {
  const gap = 2;
  const ws = [...text].map((ch) => Math.round(L[ch][0] * K));
  const w = ws.reduce((a, b) => a + b, 0) + gap * (text.length - 1) + M * 2, h = TOP + CH + 8 + M;
  const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
  const mc = mask.getContext('2d')!;
  let ox = M;
  const moon: [number, number][] = [];
  [...text].forEach((ch, i) => {
    mc.save(); mc.translate(ox, TOP); L[ch][1](mc); mc.restore();
    if (ch === 'O') moon.push([ox, ox + ws[i]]);
    ox += ws[i] + gap;
  });
  const a = mc.getImageData(0, 0, w, h).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
  const isMoon = (x: number) => moon.some(([x0, x1]) => x >= x0 - 1 && x <= x1);

  canvasTex(scene, 'logo', w, h, (c) => {
    const put = (col: string, x: number, y: number) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
    // Ombre portée puis contour sombre.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (on(x, y)) continue;
      const near = on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1);
      if (near) put('#06050c', x, y);
      else if (on(x - 1, y - 2) || on(x, y - 2) || on(x - 1, y - 3)) put('#120e22', x, y);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const t = Math.max(0, Math.min(0.999, (y - TOP) / CH)), m = isMoon(x);
      const g = m ? MOON : ASH;
      let k = Math.floor(t * g.length);
      if (!on(x + 1, y) || !on(x + 1, y + 1)) k = Math.min(g.length - (m ? 1 : 4), k + 2); // flanc droit dans l'ombre
      if (!on(x - 1, y)) k = Math.max(0, k - 1);
      let col = g[k];
      if (!on(x, y - 1)) col = m ? '#ffffff' : t > 0.7 ? '#ffd890' : '#ffffff'; // arête haute
      else if (!on(x, y + 1)) col = m ? '#1e5a88' : '#ff9a3a'; // braise au pied
      put(col, x, y);
    }
    // Ornement : filet sous le titre, losange de braise au centre.
    const oy = TOP + CH + 5, cx = Math.round(w / 2);
    for (let x = M + 6; x < w - M - 6; x++) {
      const d = Math.abs(x - cx) / (w / 2 - M - 6);
      if (Math.abs(x - cx) < 5) continue;
      put(d < 0.55 ? '#5a5a8a' : d < 0.8 ? '#3d4463' : '#262b45', x, oy);
    }
    for (const [dx, dy, col] of [[0, -2, '#ffd36a'], [-1, -1, '#ff8a2a'], [0, -1, '#ffd36a'], [1, -1, '#ff8a2a'], [-2, 0, '#c0441a'], [-1, 0, '#ff8a2a'], [0, 0, '#ffffff'], [1, 0, '#ff8a2a'], [2, 0, '#c0441a'], [-1, 1, '#ff8a2a'], [0, 1, '#ffd36a'], [1, 1, '#ff8a2a'], [0, 2, '#c0441a']] as [number, number, string][])
      put(col, cx + dx, oy + dy);
  });

  // Lueur : masque flouté, braise (cyan autour de la lune).
  const blur = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { n++; if (on(x + dx, y + dy)) s += 1 - Math.hypot(dx, dy) / 6; }
    blur[y * w + x] = Math.max(0, s / n);
  }
  canvasTex(scene, 'logo_glow', w, h, (c) => {
    const img = c.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const x = i % w, y = Math.floor(i / w), m = isMoon(x), lo = (y - TOP) / CH;
      const [r, g, b] = m ? [127, 246, 255] : lo > 0.55 ? [255, 138, 42] : [150, 120, 220];
      img.data.set([r, g, b, Math.min(255, blur[i] * 2.2 * 255)], i * 4);
    }
    c.putImageData(img, 0, 0);
  });
}

/** Curseur des menus : dague pointée vers la droite (gemme lune au pommeau). */
export function makeCursor(scene: Phaser.Scene) {
  const rows = [
    '......g.............',
    '.....ggg............',
    '.p...ggbbbbbbbbbb...',
    'pPphhgbBBBBBBBBBBbb.',
    'pPPhhgFFFFFFFFFFFFFw',
    'pphhhgdddddddddddd..',
    '.p...ggdddddddddd...',
    '.....ggg............',
    '......g.............',
  ];
  const pal: Record<string, string> = { p: '#5fd8f0', P: '#d8fbff', h: '#4a2a3a', g: '#ffb04a', b: '#ffffff', B: '#d8dcf4', F: '#8fe8ff', d: '#7a7eb8', w: '#ffffff' };
  canvasTex(scene, 'cursor', rows[0].length + 2, rows.length + 2, (c) => {
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { c.fillStyle = pal[ch]; c.fillRect(x + 1, y + 1, 1, 1); } }));
  }, '#06050c');
}
