import Phaser from 'phaser';

export const OUTLINE = '#06050c';
type Ctx = CanvasRenderingContext2D;

/** Crée une texture canvas, dessine, ajoute un contour 1 px optionnel. */
export function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void, outline?: string) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const c = tex.getContext();
  draw(c);
  if (outline) addOutline(c, w, h, outline);
  tex.refresh();
}

export function addOutline(c: Ctx, w: number, h: number, color: string) {
  const img = c.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && img[(y * w + x) * 4 + 3] > 0;
  c.fillStyle = color;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) c.fillRect(x, y, 1, 1);
}

/** Dessine une grille de caractères ('.' = vide) avec une palette. */
export function drawMap(c: Ctx, rows: string[], pal: Record<string, string>, ox = 0, oy = 0) {
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const col = pal[r[x]];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

/** Texture depuis une grille, avec 1 px de marge pour le contour. */
export function mapTex(scene: Phaser.Scene, key: string, rows: string[], pal: Record<string, string>, outline: string | null = OUTLINE) {
  canvasTex(scene, key, rows[0].length + 2, rows.length + 2, (c) => drawMap(c, rows, pal, 1, 1), outline ?? undefined);
}

/** Croissant net au pixel : dans le cercle A, hors du cercle B (décalé de `off`). */
export function crescent(c: Ctx, cx: number, cy: number, r: number, off: number, rIn: number, inner: string, edge: string) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const da = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const db = Math.hypot(x + 0.5 - (cx - off), y + 0.5 - cy);
      if (da <= r && db > rIn) {
        c.fillStyle = da > r - 1.5 || db < rIn + 1 ? edge : inner;
        c.fillRect(x, y, 1, 1);
      }
    }
}

/** Halo radial doux (pour lueurs additives). */
export function glowTex(scene: Phaser.Scene, key: string, size: number, rgb: string) {
  canvasTex(scene, key, size, size, (c) => {
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `rgba(${rgb},0.9)`);
    g.addColorStop(0.4, `rgba(${rgb},0.35)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
  });
}

/** Polygone plein net au pixel (test du centre), points à plat [x0, y0, x1, y1, …]. */
export function poly(c: Ctx, col: string, pts: number[]) {
  const n = pts.length / 2;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, pts[2 * i]); x1 = Math.max(x1, pts[2 * i]); y0 = Math.min(y0, pts[2 * i + 1]); y1 = Math.max(y1, pts[2 * i + 1]); }
  c.fillStyle = col;
  for (let y = Math.floor(y0); y <= y1; y++)
    for (let x = Math.floor(x0); x <= x1; x++) {
      const X = x + 0.5, Y = y + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
        if (yi > Y !== yj > Y && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) c.fillRect(x, y, 1, 1);
    }
}

/** Trait épais (rectangle orienté) de (x0, y0) à (x1, y1). */
export function beam(c: Ctx, col: string, x0: number, y0: number, x1: number, y1: number, w: number) {
  const l = Math.hypot(x1 - x0, y1 - y0) || 1, nx = (-(y1 - y0) / l) * (w / 2), ny = ((x1 - x0) / l) * (w / 2);
  poly(c, col, [x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny]);
}

/** Ellipse pleine. */
export function ell(c: Ctx, col: string, cx: number, cy: number, rx: number, ry: number) {
  c.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) c.fillRect(x, y, 1, 1);
}
