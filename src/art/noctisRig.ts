import Phaser from 'phaser';
import { canvasTex } from './pixel';
import { N, FLESH, LAMP_ON, LAMPS_ON, drawHead, drawLamp, drawLampS, drawRibs, drawTorso } from './noctis';

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
const K = hex(N.k), S0 = hex(N.s0), S1 = hex(N.s1), IR = hex(N.iron), IL = hex(N.ironL);
// Chair : ombre, base, reflet (plus chaud que le fer et le tissu, jamais rouge).
type Tone = readonly [number, number, number];
const F0 = hex(FLESH.f0), F1 = hex(FLESH.f1), F2 = hex(FLESH.f2), F3 = hex(FLESH.f3);
const NEAR: Tone = [F0, F1, F2], FAR: Tone = [K, F0, F1], LIMB: Tone = [F1, F2, F3], BONE: Tone = [S0, S0, S1];
const G = {
  hip: 50, hipW: 9, thigh: 33, shin: 33, ankle: 8, footF: 26, footB: -28, stepAt: 16, stepTime: 0.15,
  up: 30, fore: 33, shF: { x: 20, y: -37 }, shB: { x: -20, y: -37 }, third: { x: 16, y: -18 }, neckB: { x: 3, y: -43 }, neck: 11, rib: { x: 0, y: -29 },
  torso: { w: 58, h: 56, hy: 48 },
  gravity: 620, damp: 0.975,
  eye: { x: 1.5, y: -18 },
};
interface Tent { base: V; tip: V; rise?: V; dive?: V; bulge: V; w: number; amp: number; ph: number; onTorso: boolean; front: boolean }
const TENTS: Tent[] = [
  { base: { x: -14, y: -30 }, tip: { x: -54, y: -68 }, rise: { x: -72, y: -88 }, bulge: { x: -24, y: -22 }, w: 10, amp: 3, ph: 0, onTorso: true, front: false },
  { base: { x: 10, y: -36 }, tip: { x: 36, y: -90 }, rise: { x: 46, y: -102 }, bulge: { x: -18, y: -30 }, w: 9, amp: 2.5, ph: 2, onTorso: true, front: false },
  { base: { x: -12, y: 2 }, tip: { x: -78, y: -3 }, dive: { x: -94, y: 6 }, bulge: { x: -30, y: 18 }, w: 11, amp: 3, ph: 1, onTorso: false, front: false },
  { base: { x: -9, y: 4 }, tip: { x: -32, y: -6 }, dive: { x: -50, y: 6 }, bulge: { x: -7, y: 12 }, w: 8, amp: 3, ph: 3, onTorso: false, front: false },
  { base: { x: 0, y: 5 }, tip: { x: 8, y: -10 }, dive: { x: 50, y: 6 }, bulge: { x: 2, y: 12 }, w: 8, amp: 3, ph: 4.2, onTorso: false, front: true },
  { base: { x: 11, y: 4 }, tip: { x: 40, y: -7 }, dive: { x: 92, y: 6 }, bulge: { x: 9, y: 10 }, w: 8, amp: 3, ph: 5.1, onTorso: false, front: true },
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
    const joint = { x: hip.x + (i === 0 ? G.hipW : -G.hipW), y: hip.y };
    const knee = ik(joint, an, G.thigh, G.shin, i === 0 ? -1 : 1);
    const toe = { x: an.x + 12, y: Math.min(-1, an.y + G.ankle) }, heel = { x: an.x - 5, y: Math.min(-1, an.y + G.ankle) };
    return [joint, knee, an, toe, heel];
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
  const f1 = T({ x: 48 + Math.sin(t * 0.9) * 3, y: -46 + Math.sin(t * 1.7) * 4 });
  const f2 = T({ x: -50 + Math.sin(t * 1.2 + 1) * 3, y: -26 + Math.sin(t * 1.4 + 2) * 4 });
  return { lean, hip, legs, arm, off, third, neck, headP, headA: p.head + lean * 0.5 + o.twH, tips, bases, ctrls, rib: T(G.rib), f1, f2 };
}

/** Membre de chair : contour, ombre, base décalée vers la lumière, reflet ; tampons entiers (net au pixel), arrondis quand ils sont larges. */
function tube(s: Sink, pts: V[], w0: number, w1: number, tone: Tone, bulge = 0, clip = false) {
  const nodes: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 2));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, q = (run + d * u) / (total || 1);
      if (clip && y > 0) continue;
      nodes.push(Math.round(x), Math.round(y), Math.round(lerp(w0, w1, q) + bulge * Math.sin(q * Math.PI)));
    }
    run += d;
  }
  const stamp = (x: number, y: number, w: number) => { if (w >= 5) { s.r(x + 1, y, w - 2, w); s.r(x, y + 1, w, w - 2); } else s.r(x, y, w, w); };
  s.c(K);
  for (let i = 0; i < nodes.length; i += 3) { const w = nodes[i + 2], o = w >> 1; stamp(nodes[i] - o - 1, nodes[i + 1] - o - 1, w + 2); }
  s.c(tone[0]);
  for (let i = 0; i < nodes.length; i += 3) { const w = nodes[i + 2], o = w >> 1; stamp(nodes[i] - o, nodes[i + 1] - o, w); }
  s.c(tone[1]);
  for (let i = 0; i < nodes.length; i += 3) { const w = nodes[i + 2], o = w >> 1, n = w >= 4 ? w - 2 : w; stamp(nodes[i] - o + w - n, nodes[i + 1] - o, n); }
  s.c(tone[2]);
  for (let i = 0; i < nodes.length; i += 3) {
    const w = nodes[i + 2], o = w >> 1, h = w >= 6 ? Math.round(w * 0.3) : 1;
    if (w >= 2) s.r(nodes[i] - o + w - h - (w >= 4 ? 1 : 0), nodes[i + 1] - o + (w >= 4 ? 1 : 0), h, h);
  }
}

const tentPts = (b: V, c: V, e: V, t: number, n: Tent, amp: number) => {
  const pts: V[] = [], nx = -(e.y - b.y), ny = e.x - b.x, l = Math.hypot(nx, ny) || 1;
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, v = 1 - u, off = Math.sin(u * 5 - t * 2.6 + n.ph) * n.amp * amp * Math.min(1, u * 1.6);
    pts.push({ x: v * v * b.x + 2 * v * u * c.x + u * u * e.x + (nx / l) * off, y: v * v * b.y + 2 * v * u * c.y + u * u * e.y + (ny / l) * off });
  }
  return pts;
};

/** Main : grosse paume, trois doigts charnus finis en griffes d'os, ouverts en éventail. */
function claws(s: Sink, a: V, from: V, tone: Tone) {
  const dx = a.x - from.x, dy = a.y - from.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, ax = Math.round(a.x), ay = Math.round(a.y);
  const each = (draw: (x: number, y: number, i: number) => void) => {
    for (const k of [-1, 0, 1]) for (let i = 3; i <= 12; i++) {
      const bend = k * (i < 7 ? i * 0.95 : 6.6 - (i - 7) * 0.6);
      draw(Math.round(a.x + ux * i - uy * bend), Math.round(a.y + uy * i + ux * bend), i);
    }
  };
  s.c(K); each((x, y, i) => s.r(x - 1, y - 1, i < 9 ? 4 : 3, i < 9 ? 4 : 3));
  each((x, y, i) => { s.c(i < 9 ? tone[1] : S1); s.r(x, y, i < 9 ? 2 : 1, i < 9 ? 2 : 1); });
  // Paume arrondie, sans coins : elle prolonge le poignet au lieu de faire un bloc.
  s.c(K); s.r(ax - 3, ay - 4, 7, 9); s.r(ax - 4, ay - 3, 9, 7);
  s.c(tone[0]); s.r(ax - 2, ay - 3, 5, 7); s.r(ax - 3, ay - 2, 7, 5);
  s.c(tone[1]); s.r(ax - 1, ay - 3, 4, 5); s.r(ax - 2, ay - 2, 5, 3);
  s.c(tone[2]); s.r(ax, ay - 2, 2, 2);
}

const spur = (s: Sink, a: V, col: number) => { s.c(col); s.r(Math.round(a.x), Math.round(a.y) - 7, 3, 3); s.r(Math.round(a.x) + 1, Math.round(a.y) - 10, 1, 3); };

function chain(s: Sink, a: V, b: V) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.floor(d / 2));
  for (let i = 0; i <= n; i++) {
    s.c(i % 2 ? IR : IL);
    s.r(Math.round(lerp(a.x, b.x, i / n)), Math.round(lerp(a.y, b.y, i / n)), 1, 2);
  }
}

function leg(s: Sink, q: V[], tone: Tone) {
  tube(s, [q[0], q[1]], 13, 8, tone, 2);
  tube(s, [q[1], q[2]], 8, 5, tone, 2);
  tube(s, [q[2], q[3]], 5, 2, BONE);
  tube(s, [q[2], q[4]], 4, 2, BONE);
  spur(s, q[1], S0);
}

const arm2 = (s: Sink, q: V[], tone: Tone) => {
  tube(s, [q[0], q[1]], 11, 7, tone, 2);
  tube(s, [q[1], q[2]], 7, 6, tone, 2);
};

function drawBack(s: Sink, k: Sk, t: number, amp: number, off: V | null) {
  TENTS.forEach((n, i) => { if (!n.front) tube(s, tentPts(k.bases[i], k.ctrls[i], k.tips[i], t, n, amp), n.w, 2, FAR, 1, true); });
  leg(s, k.legs[1], FAR);
  leg(s, k.legs[0], NEAR);
  if (off) chain(s, k.off[2], off);
  arm2(s, k.off, FAR);
  spur(s, k.off[1], S0);
  claws(s, k.off[2], k.off[1], FAR);
  tube(s, k.neck, 12, 8, NEAR);
}

function drawFront(s: Sink, k: Sk, t: number, amp: number, main: V | null) {
  TENTS.forEach((n, i) => { if (n.front) tube(s, tentPts(k.bases[i], k.ctrls[i], k.tips[i], t, n, amp), n.w, 2, NEAR, 1, true); });
  tube(s, [k.third[0], k.third[1]], 6, 4, NEAR); tube(s, [k.third[1], k.third[2]], 4, 2, LIMB);
  if (main) chain(s, k.arm[2], main);
  arm2(s, k.arm, LIMB);
  spur(s, k.arm[1], S1);
  claws(s, k.arm[2], k.arm[1], LIMB);
}

const TIP_LAMP: Partial<Record<LampId, number>> = { t1: 1, t2: 0 };
const LAYER_BACK: LampId[] = ['off', 't2', 'f2'], LAYER_FRONT: LampId[] = ['main', 't1', 'f1'];
export const FULL = { w: 230, h: 170, ox: 115, oy: 166 };

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
    this.torso = sc.add.image(0, 0, 'noc_torso').setOrigin(0.5, G.torso.hy / G.torso.h);
    this.ribs = sc.add.image(0, 0, 'noc_ribs');
    this.head = sc.add.image(0, 0, 'noc_head').setOrigin(0.5, 0.95);
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
    at(k.hip.x - G.torso.w / 2, k.hip.y - G.torso.hy, () => drawTorso(c));
    at(k.rib.x - 4, k.rib.y - 7, () => drawLampS(c, 1));
    at(k.rib.x - 11, k.rib.y - 8, () => drawRibs(c));
    at(k.headP.x - 12, k.headP.y - 30, () => drawHead(c));
    drawFront(sink, k, 0, 0, main);
    at(main.x - 7, main.y, () => drawLamp(c, 1));
    at(k.tips[1].x - 4, k.tips[1].y + 5, () => drawLampS(c, 1));
    at(k.f1.x - 4, k.f1.y, () => drawLampS(c, 0));
    c.setTransform(1, 0, 0, 1, 0, 0);
  });
}
