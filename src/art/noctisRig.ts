import Phaser from 'phaser';
import { canvasTex } from './pixel';
import { N, LAMP_ON, LAMPS_ON, drawHead, drawLamp, drawLampS, drawRibs, drawTorso } from './noctis';

// Squelette de Noctis : membres et tentacules rastérisés au pixel à chaque image, pieds plantés au sol,
// lanternes pendulaires. Repère local : y = 0 au sol, +x vers l'avant ; angle 0 = bas, 90 = avant, 180 = haut.
export interface Pose {
  lean: number; crouch: number; head: number; flip: number; neck: number;
  a1: number; a2: number; b1: number; b2: number; // bras principal, bras secondaire (épaule, coude)
  reach: number; dive: number; rise: number; // chaîne, tentacules dans le sol, tentacules dorsaux levés
}
export const REST: Pose = { lean: 8, crouch: 0, head: 16, flip: 1, neck: 0, a1: 38, a2: 60, b1: -26, b2: -56, reach: 14, dive: 0, rise: 0 };
export type LampId = 'main' | 'off' | 'rib' | 't1' | 't2' | 'f1' | 'f2';
type V = { x: number; y: number };
interface Sink { c(col: number): void; r(x: number, y: number, w: number, h: number): void }

const hex = (s: string) => parseInt(s.slice(1), 16);
const K = hex(N.k), D = hex(N.d), M = hex(N.m), B = hex(N.b), L = hex(N.l), S0 = hex(N.s0), S1 = hex(N.s1), S2 = hex(N.s2), IR = hex(N.iron), IL = hex(N.ironL);
const G = {
  hip: 50, thigh: 31, shin: 31, ankle: 8, footF: 18, footB: -20, stepAt: 16, stepTime: 0.15,
  up: 30, fore: 33, shF: { x: 9, y: -30 }, shB: { x: -9, y: -30 }, third: { x: 5, y: -13 }, neckB: { x: 2, y: -36 }, neck: 14, rib: { x: 0, y: -21 },
  gravity: 620, damp: 0.975,
  eye: { x: 0, y: -19 },
};
interface Tent { base: V; tip: V; rise?: V; dive?: V; bulge: V; w: number; amp: number; ph: number; onTorso: boolean; front: boolean }
const TENTS: Tent[] = [
  { base: { x: -7, y: -28 }, tip: { x: -44, y: -66 }, rise: { x: -62, y: -86 }, bulge: { x: -24, y: -22 }, w: 5, amp: 3, ph: 0, onTorso: true, front: false },
  { base: { x: 5, y: -30 }, tip: { x: 30, y: -84 }, rise: { x: 40, y: -96 }, bulge: { x: -18, y: -30 }, w: 5, amp: 2.5, ph: 2, onTorso: true, front: false },
  { base: { x: -6, y: 0 }, tip: { x: -68, y: -2 }, dive: { x: -86, y: 6 }, bulge: { x: -30, y: 18 }, w: 5, amp: 3, ph: 1, onTorso: false, front: false },
  { base: { x: -5, y: 1 }, tip: { x: -24, y: -5 }, dive: { x: -44, y: 6 }, bulge: { x: -7, y: 12 }, w: 4, amp: 3, ph: 3, onTorso: false, front: false },
  { base: { x: 0, y: 2 }, tip: { x: 6, y: -9 }, dive: { x: 44, y: 6 }, bulge: { x: 2, y: 12 }, w: 4, amp: 3, ph: 4.2, onTorso: false, front: true },
  { base: { x: 6, y: 1 }, tip: { x: 32, y: -6 }, dive: { x: 84, y: 6 }, bulge: { x: 9, y: 10 }, w: 4, amp: 3, ph: 5.1, onTorso: false, front: true },
];
const rad = Phaser.Math.DegToRad, lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dirOf = (deg: number): V => ({ x: Math.sin(rad(deg)), y: Math.cos(rad(deg)) });

/** Articulation à deux segments ; bend = -1 : le genou part vers +x. */
function ik(a: V, c: V, l1: number, l2: number, bend: number): V {
  const dx = c.x - a.x, dy = c.y - a.y, d = Math.max(1, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.5));
  const n = Math.hypot(dx, dy) || 1, s = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - s * s));
  return { x: a.x + (dx / n) * s - (dy / n) * h * bend, y: a.y + (dy / n) * s + (dx / n) * h * bend };
}

interface Sk {
  lean: number; hip: V; legs: V[][]; arm: V[]; off: V[]; third: V[]; neck: V[]; headP: V; headA: number; tips: V[]; bases: V[]; ctrls: V[]; rib: V; f1: V; f2: V;
}
interface Solve { amp: number; t: number; twH: number; twA: number; v: number; ankles: [V, V] }

function solve(p: Pose, o: Solve): Sk {
  const t = o.t, amp = o.amp;
  const lean = p.lean + Math.sin(t * 1.6) * 2 * amp, th = rad(lean), cs = Math.cos(th), sn = Math.sin(th);
  const hip = { x: 0, y: -(G.hip - p.crouch) + Math.round(Math.sin(t * 2.1) * 1.5) * amp };
  const T = (q: V): V => ({ x: hip.x + q.x * cs - q.y * sn, y: hip.y + q.x * sn + q.y * cs });
  const legs = o.ankles.map((an, i) => {
    const knee = ik(hip, an, G.thigh, G.shin, i === 0 ? -1 : 1);
    const toe = { x: an.x + 9, y: Math.min(-1, an.y + G.ankle) }, heel = { x: an.x - 4, y: Math.min(-1, an.y + G.ankle) };
    return [hip, knee, an, toe, heel];
  });
  const limb = (s: V, a: number, e: number, l1 = G.up, l2 = G.fore) => {
    const d1 = dirOf(a), d2 = dirOf(a + e), m = { x: s.x + d1.x * l1, y: Math.min(-4, s.y + d1.y * l1) };
    return [s, m, { x: m.x + d2.x * l2, y: Math.min(-3, m.y + d2.y * l2) }]; // la main s'arrête au sol
  };
  const arm = limb(T(G.shF), p.a1 + Math.sin(t * 1.3) * 5 * amp + o.twA, p.a2 + Math.sin(t * 1.9 + 1) * 6 * amp);
  const off = limb(T(G.shB), p.b1 + Math.sin(t * 1.1 + 2) * 5 * amp - o.twA * 0.6, p.b2 + Math.sin(t * 2.3) * 6 * amp);
  const third = limb(T(G.third), 74 + Math.sin(t * 3.1) * 7 * amp + o.twA, 128, 15, 17);
  const nb = T(G.neckB), nl = G.neck + p.neck, nd = dirOf(180 - lean * 0.7 - p.head * 0.5);
  const headP = { x: nb.x + nd.x * nl + 3, y: nb.y + nd.y * nl };
  const neck = [nb, { x: lerp(nb.x, headP.x, 0.5) - 3, y: lerp(nb.y, headP.y, 0.5) - 1 }, headP];
  const bases: V[] = [], ctrls: V[] = [], tips: V[] = [];
  const trail = Phaser.Math.Clamp(o.v * 0.14, -60, 60);
  for (const n of TENTS) {
    const b = T(n.base);
    let e: V;
    if (n.onTorso) {
      const q = { x: lerp(n.tip.x, n.rise!.x, p.rise), y: lerp(n.tip.y, n.rise!.y, p.rise) };
      e = T(q);
    } else {
      const f = n.dive!;
      e = { x: lerp(n.tip.x - trail, f.x, p.dive), y: Math.min(lerp(n.tip.y + Math.min(0, hip.y + G.hip) * 0.2, f.y, p.dive), p.dive > 0.5 ? 8 : -1) };
    }
    bases.push(b); tips.push(e);
    ctrls.push({ x: lerp(b.x, e.x, 0.5) + n.bulge.x, y: lerp(b.y, e.y, 0.5) + n.bulge.y * (1 - p.dive * 0.8) });
  }
  const f1 = T({ x: 36 + Math.sin(t * 0.9) * 3, y: -38 + Math.sin(t * 1.7) * 4 });
  const f2 = T({ x: -38 + Math.sin(t * 1.2 + 1) * 3, y: -20 + Math.sin(t * 1.4 + 2) * 4 });
  return { lean, hip, legs, arm, off, third, neck, headP, headA: p.head + lean * 0.5 + o.twH, tips, bases, ctrls, rib: T(G.rib), f1, f2 };
}

/** Membre tubulaire : contour, remplissage, reflet, posés par tampons entiers (rendu net au pixel). */
function tube(s: Sink, pts: V[], w0: number, w1: number, fill: number, hi: number, clip = false) {
  const nodes: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 2));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
      if (clip && y > 0) continue;
      nodes.push(Math.round(x), Math.round(y), Math.round(lerp(w0, w1, (run + d * u) / (total || 1))));
    }
    run += d;
  }
  s.c(K);
  for (let i = 0; i < nodes.length; i += 3) { const w = nodes[i + 2], o = w >> 1; s.r(nodes[i] - o - 1, nodes[i + 1] - o - 1, w + 2, w + 2); }
  s.c(fill);
  for (let i = 0; i < nodes.length; i += 3) { const w = nodes[i + 2], o = w >> 1; s.r(nodes[i] - o, nodes[i + 1] - o, w, w); }
  s.c(hi);
  for (let i = 0; i < nodes.length; i += 3) { const w = nodes[i + 2], o = w >> 1; if (w >= 2) s.r(nodes[i] - o, nodes[i + 1] - o, Math.max(1, w - 1), 1); }
}

const tentPts = (b: V, c: V, e: V, t: number, n: Tent, amp: number) => {
  const pts: V[] = [], nx = -(e.y - b.y), ny = e.x - b.x, l = Math.hypot(nx, ny) || 1;
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, v = 1 - u, off = Math.sin(u * 5 - t * 2.6 + n.ph) * n.amp * amp * Math.min(1, u * 1.6);
    pts.push({ x: v * v * b.x + 2 * v * u * c.x + u * u * e.x + (nx / l) * off, y: v * v * b.y + 2 * v * u * c.y + u * u * e.y + (ny / l) * off });
  }
  return pts;
};

/** Main : paume et trois longs doigts d'un pixel, ouverts en éventail. */
function claws(s: Sink, a: V, from: V, col: number) {
  const dx = a.x - from.x, dy = a.y - from.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  for (const k of [-0.9, 0, 0.9]) for (let i = 2; i <= 9; i++) {
    const bend = k * (i < 6 ? i * 0.9 : 5.4 - (i - 6) * 0.5);
    const x = Math.round(a.x + ux * i - uy * bend), y = Math.round(a.y + uy * i + ux * bend);
    s.c(K); s.r(x, y + 1, 1, 1);
    s.c(col); s.r(x, y, 1, 1);
  }
  s.c(K); s.r(Math.round(a.x) - 2, Math.round(a.y) - 2, 5, 5);
  s.c(S0); s.r(Math.round(a.x) - 1, Math.round(a.y) - 1, 3, 3);
}

const spur = (s: Sink, a: V, col: number) => { s.c(col); s.r(Math.round(a.x), Math.round(a.y) - 4, 2, 3); s.r(Math.round(a.x) + 1, Math.round(a.y) - 6, 1, 2); };

function chain(s: Sink, a: V, b: V) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.floor(d / 2));
  for (let i = 0; i <= n; i++) {
    s.c(i % 2 ? IR : IL);
    s.r(Math.round(lerp(a.x, b.x, i / n)), Math.round(lerp(a.y, b.y, i / n)), 1, 2);
  }
}

function leg(s: Sink, q: V[], fill: number, hi: number) {
  tube(s, [q[0], q[1]], 6, 4, fill, hi);
  tube(s, [q[1], q[2]], 4, 2, fill, hi);
  tube(s, [q[2], q[3]], 2, 1, S0, S1);
  tube(s, [q[2], q[4]], 2, 1, S0, S1);
  spur(s, q[1], S0);
}

function drawBack(s: Sink, k: Sk, t: number, amp: number, off: V | null) {
  TENTS.forEach((n, i) => { if (!n.front) tube(s, tentPts(k.bases[i], k.ctrls[i], k.tips[i], t, n, amp), n.w, 1, D, M, true); });
  leg(s, k.legs[1], D, M);
  leg(s, k.legs[0], M, B);
  if (off) chain(s, k.off[2], off);
  tube(s, [k.off[0], k.off[1]], 5, 3, D, M); tube(s, [k.off[1], k.off[2]], 3, 3, D, M);
  spur(s, k.off[1], S0);
  claws(s, k.off[2], k.off[1], S0);
  tube(s, k.neck, 4, 3, M, B);
}

function drawFront(s: Sink, k: Sk, t: number, amp: number, main: V | null) {
  TENTS.forEach((n, i) => { if (n.front) tube(s, tentPts(k.bases[i], k.ctrls[i], k.tips[i], t, n, amp), n.w, 1, M, B, true); });
  tube(s, [k.third[0], k.third[1]], 3, 2, B, L); tube(s, [k.third[1], k.third[2]], 2, 1, S0, S1);
  if (main) chain(s, k.arm[2], main);
  tube(s, [k.arm[0], k.arm[1]], 5, 3, B, L); tube(s, [k.arm[1], k.arm[2]], 3, 3, B, L);
  spur(s, k.arm[1], S1);
  claws(s, k.arm[2], k.arm[1], S1);
}

const TIP_LAMP: Partial<Record<LampId, number>> = { t1: 1, t2: 0 };
const LAYER_BACK: LampId[] = ['off', 't2', 'f2'], LAYER_FRONT: LampId[] = ['main', 't1', 'f1'];
export const FULL = { w: 190, h: 170, ox: 95, oy: 166 };

interface BodyLamp { id: LampId; big: boolean; x: number; y: number; px: number; py: number; ang: number; lit: boolean; free: boolean; gone: boolean; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }

export class NoctisRig {
  p: Pose = { ...REST };
  rig: Phaser.GameObjects.Container;
  torso: Phaser.GameObjects.Image; ribs: Phaser.GameObjects.Image; head: Phaser.GameObjects.Image;
  eyes: Phaser.GameObjects.Image; glowEye: Phaser.GameObjects.Image;
  flashParts: Phaser.GameObjects.Image[];
  limp = false;
  onBreak: ((x: number, y: number) => void) | null = null;
  private gB: Phaser.GameObjects.Graphics; private gF: Phaser.GameObjects.Graphics;
  private flash = false;
  private t = 0; private lastX: number; private v = 0;
  private twH = 0; private twA = 0; private twT = 1;
  private feet = [{ wx: 0, from: 0, to: 0, s: -1 }, { wx: 0, from: 0, to: 0, s: -1 }];
  private sk!: Sk;
  private lamps: Record<LampId, BodyLamp>;
  readonly ids: LampId[] = ['main', 'off', 'rib', 't1', 't2', 'f1', 'f2'];

  constructor(sc: Phaser.Scene, private root: Phaser.GameObjects.Container) {
    this.lastX = root.x;
    this.gB = sc.add.graphics(); this.gF = sc.add.graphics();
    const lamp = (id: LampId, big: boolean): BodyLamp => ({
      id, big, x: 0, y: 0, px: 0, py: 0, ang: 0, lit: false, free: false, gone: false,
      img: sc.add.image(0, 0, big ? 'noc_lamp0' : 'noc_lampS0').setOrigin(0.5, id === 'rib' ? 0.5 : 0),
      glow: sc.add.image(0, 0, 'glowO').setBlendMode(Phaser.BlendModes.ADD).setDepth(61).setVisible(false),
    });
    this.lamps = {
      main: lamp('main', true), off: lamp('off', true), rib: lamp('rib', false),
      t1: lamp('t1', false), t2: lamp('t2', false), f1: lamp('f1', false), f2: lamp('f2', false),
    };
    this.torso = sc.add.image(0, 0, 'noc_torso').setOrigin(0.5, 41 / 44);
    this.ribs = sc.add.image(0, 0, 'noc_ribs');
    this.head = sc.add.image(0, 0, 'noc_head').setOrigin(0.5, 36 / 38);
    this.glowEye = sc.add.image(0, 0, 'glowW').setBlendMode(Phaser.BlendModes.ADD).setScale(0.25);
    // Yeux au-dessus de l'obscurité : deux points, sans lumière projetée.
    this.eyes = sc.add.image(0, 0, 'noc_eyes').setDepth(62);
    const L_ = this.lamps;
    this.rig = sc.add.container(0, 0, [
      this.gB, ...LAYER_BACK.map((i) => L_[i].img), this.torso, L_.rib.img, this.ribs, this.head, this.glowEye,
      this.gF, ...LAYER_FRONT.map((i) => L_[i].img),
    ]);
    root.add(this.rig);
    const fake = { setTintFill: () => { this.flash = true; }, clearTint: () => { this.flash = false; } } as unknown as Phaser.GameObjects.Image;
    this.flashParts = [this.torso, this.ribs, this.head, fake];
    this.snap();
  }

  private sx() { return this.root.scaleX >= 0 ? 1 : -1; }

  /** Replace pieds et lanternes (téléportation, début de combat). */
  snap() {
    const sx = this.sx(), x = this.root.x;
    this.lastX = x; this.v = 0;
    this.feet.forEach((f, i) => { f.wx = x + sx * (i ? G.footB : G.footF); f.s = -1; });
    this.solve();
    for (const id of this.ids) {
      const l = this.lamps[id], a = this.anchor(id);
      l.x = l.px = a.x; l.y = l.py = a.y + this.len(id); l.ang = 0;
    }
  }

  private len(id: LampId) { return id === 'main' || id === 'off' ? this.p.reach : id === 't1' || id === 't2' ? 5 : 0; }
  private anchor(id: LampId): V {
    const k = this.sk;
    switch (id) {
      case 'main': return k.arm[2];
      case 'off': return k.off[2];
      case 'rib': return k.rib;
      case 'f1': return k.f1;
      case 'f2': return k.f2;
      default: return k.tips[TIP_LAMP[id]!];
    }
  }

  private ankles(): [V, V] {
    const sx = this.sx(), x0 = this.root.x;
    const at = (f: { wx: number; s: number }) => ({ x: (f.wx - x0) * sx, y: -G.ankle - (f.s >= 0 ? Math.sin(f.s * Math.PI) * 10 : 0) });
    return [at(this.feet[0]), at(this.feet[1])];
  }

  private solve() {
    this.sk = solve(this.p, { amp: this.limp ? 0 : 1, t: this.t, twH: this.twH, twA: this.twA, v: this.v, ankles: this.ankles() });
  }

  /** Allume/éteint : vrai si l'état a changé. */
  light(id: LampId) { const l = this.lamps[id]; if (l.lit || l.gone || l.free) return false; l.lit = true; return true; }
  lightAll() { for (const id of this.ids) this.light(id); }
  allOut() { for (const id of this.ids) this.lamps[id].lit = false; }
  litWorld() { return this.ids.filter((i) => this.lamps[i].lit).map((i) => this.world(i)); }
  drop(id: LampId) { const l = this.lamps[id]; l.free = true; l.lit = false; }
  /** La lanterne quitte le corps (lancée) ; restock() la lui rend à la fin de l'attaque. */
  hide(id: LampId) { const l = this.lamps[id]; l.free = l.gone = true; l.lit = false; }
  restock() {
    for (const id of this.ids) {
      const l = this.lamps[id];
      if (!l.gone && !l.free) continue;
      const a = this.anchor(id);
      l.gone = l.free = false; l.x = l.px = a.x; l.y = l.py = a.y + this.len(id); l.ang = 0;
    }
  }

  /** Centre de la lanterne, coordonnées monde. */
  world(id: LampId): V {
    const l = this.lamps[id], c = id === 'rib' ? 0 : l.big ? 12 : 7;
    const x = l.x - Math.sin(l.ang) * c, y = l.y + Math.cos(l.ang) * c;
    return { x: this.root.x + this.root.scaleX * x, y: this.root.y + y };
  }

  update(dt: number) {
    dt = Math.min(dt, 1 / 30);
    this.t += dt;
    const sx = this.sx(), x0 = this.root.x, dw = x0 - this.lastX, dl = dw * sx;
    this.lastX = x0;
    this.v += (dl / dt - this.v) * Math.min(1, dt * 10);
    this.stepFeet(dt, sx, dw / dt);
    if (!this.limp) {
      this.twT -= dt;
      if (this.twT <= 0) { this.twT = 0.7 + Math.random() * 1.5; this.twH = (Math.random() - 0.5) * 48; this.twA = (Math.random() - 0.5) * 26; }
    }
    const fade = Math.exp(-dt * 7);
    this.twH *= fade; this.twA *= fade;
    this.solve();
    this.swing(dt, dl);
  }

  private stepFeet(dt: number, sx: number, vw: number) {
    const time = Phaser.Math.Clamp(G.stepTime - Math.abs(vw) * 0.0002, 0.08, G.stepTime), x0 = this.root.x;
    const spread = this.p.crouch * 0.3;
    this.feet.forEach((f, i) => {
      const want = x0 + sx * (i ? G.footB - spread : G.footF + spread);
      if (f.s >= 0) {
        f.s += dt / time;
        if (f.s >= 1) { f.s = -1; f.wx = f.to; } else f.wx = lerp(f.from, f.to, f.s);
      } else if (Math.abs(f.wx - want) > G.stepAt && this.feet[1 - i].s < 0.5 && !this.limp) {
        f.s = 0; f.from = f.wx; f.to = want + vw * time;
      }
    });
  }

  /** Lanternes : pendules sur leur chaîne, inertie du déplacement ; flottantes en retard souple. */
  private swing(dt: number, dl: number) {
    for (const id of this.ids) {
      const l = this.lamps[id], a = this.anchor(id);
      if (l.gone) continue;
      if (l.free) {
        const nx = l.x + (l.x - l.px) * G.damp, ny = l.y + (l.y - l.py) + G.gravity * dt * dt;
        l.px = l.x; l.py = l.y; l.x = nx; l.y = ny;
        if (ny > -8) { l.gone = true; this.onBreak?.(this.root.x + this.root.scaleX * nx, this.root.y - 6); }
        continue;
      }
      if (id === 'rib') { l.x = a.x; l.y = a.y; l.ang = rad(this.sk.lean); continue; }
      if (id === 'f1' || id === 'f2') {
        l.x += (a.x - l.x) * Math.min(1, dt * 7) - dl * 0.6; l.y += (a.y - l.y) * Math.min(1, dt * 7);
        l.ang = Phaser.Math.Clamp(-this.v * 0.002, -0.5, 0.5);
        continue;
      }
      const vx = (l.x - l.px) * G.damp, vy = (l.y - l.py) * G.damp;
      l.px = l.x; l.py = l.y;
      l.x += vx - dl; l.y += vy + G.gravity * dt * dt;
      const L0 = this.len(id), dx = l.x - a.x, dy = l.y - a.y, d = Math.hypot(dx, dy);
      if (d > L0 && d > 0) { l.x = a.x + (dx / d) * L0; l.y = a.y + (dy / d) * L0; }
      if (d > 0.5) l.ang = Math.atan2(-dx, dy);
      // Jamais à travers le sol : la lanterne s'y pose.
      const low = l.big ? -24 : -15;
      if (l.y > low) l.y = low;
    }
  }

  /** Rendu seul : le viewer pré-simule sans afficher. */
  draw() {
    const k = this.sk, t = this.t, amp = this.limp ? 0.2 : 1, L_ = this.lamps;
    const sx = this.sx(), snapX = (Math.round(this.root.x) - this.root.x) * sx;
    const sink = (g: Phaser.GameObjects.Graphics): Sink => ({ c: (col) => g.fillStyle(this.flash ? 0xffffff : col), r: (x, y, w, h) => g.fillRect(x, y, w, h) });
    this.gB.clear().setX(snapX); this.gF.clear().setX(snapX);
    drawBack(sink(this.gB), k, t, amp, L_.off.free ? null : L_.off);
    drawFront(sink(this.gF), k, t, amp, L_.main.free ? null : L_.main);
    this.torso.setPosition(k.hip.x, k.hip.y).setAngle(k.lean);
    this.ribs.setPosition(k.rib.x, k.rib.y).setAngle(k.lean);
    const fl = Math.abs(this.p.flip) < 0.1 ? 0.1 : this.p.flip;
    this.head.setPosition(k.headP.x, k.headP.y).setAngle(k.headA).setScale(fl, 1);
    const th = rad(k.headA), ex = G.eye.x * fl, ey = G.eye.y;
    const hx = k.headP.x + ex * Math.cos(th) - ey * Math.sin(th), hy = k.headP.y + ex * Math.sin(th) + ey * Math.cos(th);
    this.glowEye.setPosition(hx, hy);
    this.eyes.setPosition(Math.round(this.root.x + this.root.scaleX * hx), Math.round(this.root.y + hy)).setAngle(k.headA * this.sx());
    const blink = Math.floor(t * 9) % 2, flick = 0.9 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23) * 0.04;
    for (const id of this.ids) {
      const l = L_[id];
      l.img.setVisible(!l.gone).setPosition(Math.round(l.x), Math.round(l.y)).setRotation(l.ang);
      l.img.setTexture(l.big ? (l.lit ? LAMP_ON[blink] : 'noc_lamp0') : l.lit ? LAMPS_ON[blink] : 'noc_lampS0');
      l.glow.setVisible(l.lit);
      if (l.lit) { const w = this.world(id); l.glow.setPosition(w.x, w.y).setScale(l.big ? 2.4 : 1.8).setAlpha(0.3 * flick); }
    }
  }
}

const flat = () => solve({ ...REST, lean: 0, head: 0 }, { amp: 0, t: 0, twH: 0, twA: 0, v: 0, ankles: [{ x: G.footF, y: -G.ankle }, { x: G.footB, y: -G.ankle }] });

/** Repères du portrait à plat : yeux et lanternes allumées, relatifs aux pieds. */
export function restPoints() {
  const k = flat(), hang = (a: V) => ({ x: a.x, y: a.y + REST.reach + 12 });
  return { eye: { x: k.headP.x + G.eye.x, y: k.headP.y + G.eye.y }, main: hang(k.arm[2]), off: hang(k.off[2]), rib: k.rib };
}

/** Corps entier à plat (annonceur, images rémanentes) : mêmes tracés, lanternes allumées. */
export function bakeNoctis(s: Phaser.Scene) {
  if (s.textures.exists('noc_full')) return;
  canvasTex(s, 'noc_full', FULL.w, FULL.h, (c) => {
    const k = flat();
    const sink: Sink = { c: (col) => { c.fillStyle = `#${col.toString(16).padStart(6, '0')}`; }, r: (x, y, w, h) => c.fillRect(x, y, w, h) };
    const at = (x: number, y: number, draw: () => void) => { c.save(); c.translate(Math.round(x), Math.round(y)); draw(); c.restore(); };
    const hang = (a: V, len: number) => ({ x: a.x, y: a.y + len });
    const main = hang(k.arm[2], REST.reach), off = hang(k.off[2], REST.reach);
    c.translate(FULL.ox, FULL.oy);
    drawBack(sink, k, 0, 0, off);
    at(off.x - 7, off.y, () => drawLamp(c, 1));
    at(k.tips[0].x - 4, k.tips[0].y + 5, () => drawLampS(c, 0));
    at(k.f2.x - 4, k.f2.y, () => drawLampS(c, 0));
    at(k.hip.x - 16, k.hip.y - 41, () => drawTorso(c));
    at(k.rib.x - 4, k.rib.y - 7, () => drawLampS(c, 1));
    at(k.rib.x - 11, k.rib.y - 8, () => drawRibs(c));
    at(k.headP.x - 13, k.headP.y - 36, () => drawHead(c));
    drawFront(sink, k, 0, 0, main);
    at(main.x - 7, main.y, () => drawLamp(c, 1));
    at(k.tips[1].x - 4, k.tips[1].y + 5, () => drawLampS(c, 1));
    at(k.f1.x - 4, k.f1.y, () => drawLampS(c, 0));
    c.setTransform(1, 0, 0, 1, 0, 0);
  });
}
