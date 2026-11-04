import { VOL, drone, riser, chipBell, tone, drum, type Inst } from './chip';
import type { Out } from './core';

// Pistes en patterns de 16 pas (doubles croches). Jetons : « D4 » note, « - » tenue, « . » silence ;
// batterie : K S H O C T. Séquence : noms de patterns par mesure, « x*4 » = répété, « _ » = mesure vide.
// Une séquence plus courte que la piste boucle sur elle-même.

export interface Ch {
  i: Inst; v: number; seq: string;
  /** Joué seulement dans cette phase (1 ou 2). */
  p?: 1 | 2;
  /** Transposition en demi-tons ; au-dessus de max, l'octave retombe. */
  tr?: number; max?: number;
  wet?: number; vib?: boolean; pluck?: boolean;
  /** Fraction de la durée écrite réellement tenue. */
  gate?: number;
}
export interface Track {
  bpm: number;
  /** Niveau relatif de la piste. */
  vol?: number;
  pats: Record<string, string>;
  ch: Ch[];
  /** Mesure de reprise en fin de piste ; absent = pas de boucle. */
  loop?: number;
  /** Sauts : en arrivant à la mesure clé, repartir à la mesure valeur (sections attendues par music.cue). */
  jump?: Record<number, number>;
  /** Combat : admet la phase 2 et repart de zéro à chaque play. */
  boss?: boolean;
  /** Longueur en secondes si elle diffère des mesures écrites (queue d'un stinger). */
  len?: number;
  /** Pour les stingers : ce qui ne tient pas dans des patterns (bourdon, montée de bruit). */
  once?: (o: Out, t: number) => void;
}

// ── Écriture ──────────────────────────────────────────────────────────────────────────
/** Croches tenues : « D2 A2 » → « D2 - A2 - ». */
const e8 = (s: string) => s.split(' ').map((n) => `${n} -`).join(' ');
/** Contretemps d'accompagnement. */
const off = (n: string) => `. . ${n} . . . ${n} . . . ${n} . . . ${n} .`;
/** Arpège rapide montant-descendant sur 4 notes, 16 doubles croches. */
const a16 = (s: string) => { const n = s.split(' '), o = [0, 1, 2, 3, 2, 1]; return Array.from({ length: 16 }, (_, i) => n[o[i % 6]]).join(' '); };
const whole = (n: string) => `${n} ${'- '.repeat(15).trim()}`;

/** Mêmes instruments pour tous les boss, seuls les motifs changent. */
function fight(bpm: number, pats: Record<string, string>, s: { lead: string; pad: string; arp: string; bass: string; d1: string; d2: string }, padGate = 1): Track {
  return {
    bpm, boss: true, loop: 0, pats: { ...pats, hh: '. H . H . H . H . H . H . H . H' },
    ch: [
      { i: 'tri', v: VOL.bass, seq: s.bass, gate: 0.85 },
      { i: 'p25', v: VOL.lead, seq: s.lead, vib: true, wet: 0.06, gate: 0.94 },
      { i: 'p50', v: VOL.pad, seq: s.pad, gate: padGate },
      { i: 'drum', v: 1, seq: s.d1, p: 1 },
      { i: 'drum', v: 1, seq: s.d2, p: 2 },
      // Phase 2 : lead à l'octave, arpèges rapides, charleston doublé.
      { i: 'p25', v: VOL.leadHi, seq: s.lead, p: 2, tr: 12, max: 91, gate: 0.94 },
      { i: 'p12', v: VOL.arp, seq: s.arp, p: 2, gate: 0.85 },
      { i: 'drum', v: VOL.hat2 / VOL.hat, seq: 'hh', p: 2 },
    ],
  };
}

// ── Accords d'arpèges et de contretemps ───────────────────────────────────────────────
const CHORD = { dm: 'D4 F4 A4 D5', bb: 'Bb3 D4 F4 Bb4', gm: 'G3 Bb3 D4 G4', a: 'A3 C#4 E4 A4', c: 'C4 E4 G4 C5', f: 'F3 A3 C4 F4', em: 'E4 G4 B4 E5', fh: 'F4 A4 C5 F5', g: 'G4 B4 D5 G5', am: 'A4 C5 E5 A5' };
const ARP = Object.fromEntries(Object.entries(CHORD).map(([k, v]) => [`r${k}`, a16(v)]));

// ── 1. Menu : 80 BPM, arpège lent, basse triangle, cloche ; le thème à partir de la mesure 9 ──
const menu: Track = {
  bpm: 80, vol: 1, loop: 0,
  pats: {
    adm: e8('D4 A4 D5 F5 A5 F5 D5 A4'), abb: e8('Bb3 F4 Bb4 D5 F5 D5 Bb4 F4'), agm: e8('G3 D4 G4 Bb4 D5 Bb4 G4 D4'),
    aa: e8('A3 E4 A4 C#5 E5 C#5 A4 E4'), afc: e8('C4 F4 A4 C5 F5 C5 A4 F4'), agb: e8('Bb3 D4 G4 Bb4 D5 Bb4 G4 D4'),
    bd: 'D3 - - - - - - - A2 - - - - - - -', bb: 'Bb2 - - - - - - - F2 - - - - - - -', bg: 'G2 - - - - - - - D3 - - - - - - -',
    ba: 'A2 - - - - - - - E3 - - - - - - -', bc: 'C3 - - - - - - - G2 - - - - - - -', bv: 'Bb2 - - - - - - - G2 - - - - - - -',
    k1: 'D4 . . . . . . . . . . . . . . .', k2: 'A3 . . . . . . . . . . . . . . .',
    t1: 'A4 - - - - - Bb4 - A4 - - - F4 - - -', t2: 'D4 - - - - - - - . . F4 - G4 - - -',
    t3: 'Bb4 - - - - - A4 - G4 - - - D5 - - -', t4: 'C#5 - - - - - - - - - - - A4 - - -',
    t5: 'D5 - - - - - E5 - F5 - - - E5 - D5 -', t6: 'C5 - - - - - - - A4 - - - C5 - - -',
    t7: 'Bb4 - - - A4 - - - G4 - - - - - F4 -', t8: 'E4 - - - C#4 - - - A4 - - - - - - -',
  },
  ch: [
    { i: 'p12', v: VOL.arp * 1.1, seq: 'adm abb agm aa adm afc agb aa', pluck: true, wet: 0.25 },
    { i: 'tri', v: VOL.bass * 0.8, seq: 'bd bb bg ba bd bc bv ba', gate: 0.95 },
    { i: 'bell', v: VOL.bell, seq: 'k1 _ _ _ k2 _ _ _' },
    { i: 'p25', v: VOL.lead * 0.62, seq: '_*8 t1 t2 t3 t4 t5 t6 t7 t8', vib: true, wet: 0.3, gate: 0.95 },
  ],
};

// ── 4/5. Combats (mêmes instruments, motifs différents, ré mineur / mi phrygien) ─────
const dDrums = { d: 'K . H . S . H K K . H . S . H .', f: 'K . H . S . S S K S S S S S S S', d2: 'K . H . S . H K K . H K S . H S', f2: 'K . H K S . S S K S S S T T S S' };

/** Ysolde : ré mineur, héroïque, basse en 3+3+2. */
const boss1 = fight(148, {
  ...ARP, ...dDrums,
  l1: 'D5 - - - A4 - - D5 F5 - - - E5 - D5 -', l2: 'Bb4 - - - F4 - - Bb4 D5 - - - C5 - Bb4 -',
  l3: 'G4 - Bb4 - D5 - G5 - F5 - - E5 - - D5 -', l4: 'C#5 - - - - - E5 - A5 - - - G5 - E5 -',
  l5: 'F5 - - - D5 - - F5 A5 - - - G5 - F5 -', l6: 'D5 - - - Bb4 - - D5 F5 - - - D5 - Bb4 -',
  l7: 'Bb4 - D5 - G5 - Bb5 - A5 - G5 - F5 - E5 -', l8: 'E5 - - - C#5 - - - A4 - - - . . . .',
  m1: '. . F5 - G5 - A5 - Bb5 - - - A5 - G5 -', m2: '. . E5 - F5 - G5 - A5 - - - G5 - E5 -',
  m3: 'F5 - - - - - D5 - A4 - - - D5 - F5 -', m4: 'E5 - - - - - C5 - G4 - - - C5 - E5 -',
  m5: 'D5 - - - - - Bb4 - F4 - - - Bb4 - D5 -', m6: 'C5 - - - - - A4 - F4 - - - A4 - C5 -',
  m7: 'Bb4 - - - D5 - - - G5 - - - Bb5 - - -', m8: 'A5 - - - - - - - E5 - C#5 - A4 - E4 -',
  bd: e8('D2 D2 D3 D2 D2 D3 D2 C3'), bb: e8('Bb2 Bb2 Bb3 Bb2 Bb2 Bb3 Bb2 A2'), bg: e8('G2 G2 G3 G2 G2 G3 G2 F2'),
  ba: e8('A2 A2 A3 A2 A2 A3 E3 C#3'), bc: e8('C3 C3 G2 C3 C3 G2 C3 B2'), bf: e8('F2 F2 F3 F2 F2 F3 F2 E2'),
  pd: off('F4'), pb: off('D4'), pg: off('Bb3'), pa: off('C#4'), pc: off('E4'), pf: off('A4'),
}, {
  lead: 'l1 l2 l3 l4 l5 l6 l7 l8 m1 m2 m3 m4 m5 m6 m7 m8',
  bass: 'bd bb bg ba bd bb bg ba bb bc bd bc bb bf bg ba',
  pad: 'pd pb pg pa pd pb pg pa pb pc pd pc pb pf pg pa',
  arp: 'rdm rbb rgm ra rdm rbb rgm ra rbb rc rdm rc rbb rf rgm ra',
  d1: 'd*7 f d*7 f', d2: 'd2*7 f2 d2*7 f2',
});

/** Nycthor : mi phrygien, rampant, basse chromatique, note tenue et cloche de lanterne. */
const boss2 = fight(140, {
  ...ARP,
  d: 'K . H K . H K . S . H . K . H .', f: 'K . H K . H K . S . S S T T S S', d2: 'K . H K . H K . S . H K K . S H', f2: 'K . H K . S K . S S S S T T T T',
  l1: 'E5 - - - F5 - - - E5 - - - B4 - - -', l2: 'C5 - - - B4 - C5 - A4 - - - - - - -',
  l3: 'E5 - - - G5 - - - F5 - E5 - D5 - - -', l4: 'F5 - - - E5 - D5 - A4 - - - - - - -',
  l5: 'B5 - - - A5 - G5 - F5 - - - E5 - - -', l6: 'C6 - - - B5 - A5 - F5 - - - A5 - - -',
  l7: 'G5 - - - D5 - - - B4 - - - D5 - G5 -', l8: 'F5 - - - E5 - - - . . Bb4 - E5 - - -',
  m1: 'A5 - - - C6 - - - B5 - A5 - G5 - - -', m2: 'F5 - - - A5 - - - C6 - - - A5 - F5 -',
  m3: 'E5 - - - G5 - - - B5 - - - A5 - G5 -', m4: 'F5 - - - E5 - - - . . . . E4 - - -',
  m5: 'D5 - - - F5 - - - A5 - - - G5 - F5 -', m6: 'C5 - - - F5 - - - A5 - - - C6 - - -',
  m7: 'B5 - - - - - G5 - E5 - - - F5 - - -', m8: 'E5 - - - . . Bb4 - B4 - - - . . . .',
  be: e8('E2 F2 E2 G2 E2 F2 E2 B2'), bf: e8('F2 G2 F2 A2 F2 G2 F2 C3'), bl: e8('F2 G2 F2 A2 E2 F2 E2 B2'), bd: e8('D2 E2 D2 F2 D2 E2 D2 A2'),
  bg: e8('G2 A2 G2 B2 G2 A2 G2 D3'), ba: e8('A2 B2 A2 C3 A2 B2 A2 E3'),
  pe: whole('G4'), pf: whole('A4'), pd: whole('F4'), pg: whole('B4'), pa: whole('C5'),
}, {
  lead: 'l1 l2 l3 l4 l5 l6 l7 l8 m1 m2 m3 m4 m5 m6 m7 m8',
  bass: 'be bf be bd be bf bg bl ba bf be be bd bf be be',
  pad: 'pe pf pe pd pe pf pg pf pa pf pe pe pd pf pe pe',
  arp: 'rem rfh rem rdm rem rfh rg rfh ram rfh rem rem rdm rfh rem rem',
  d1: 'd*7 f d*7 f', d2: 'd2*7 f2 d2*7 f2',
}, 0.97);
boss2.pats.ln1 = 'E6 . . . . . . . . . . . . . . .';
boss2.pats.ln2 = 'B5 . . . . . . . . . . . . . . .';
boss2.ch.push({ i: 'bell', v: VOL.bell * 0.45, seq: 'ln1 _ _ _ ln2 _ _ _' });

/** McKing : ré mineur, marche pompeuse en flonflons. */
const boss3 = fight(150, {
  ...ARP,
  d: 'K . H . S . H . K . H . S . H H', f: 'K . S . S . S S K S S S S S S S', d2: 'K . H K S . H . K K H . S . S S', f2: 'K K S . S . S S K S S S T T S S',
  l1: 'D5 - - A4 D5 - F5 - A5 - - - G5 F5 E5 D5', l2: 'C#5 - - A4 C#5 - E5 - G5 - - - F5 E5 D5 C#5',
  l3: 'D5 - - A4 D5 - F5 - A5 - - - Bb5 - A5 -', l4: 'G5 F5 E5 D5 C#5 - A4 - E5 - - - . . . .',
  l5: 'Bb5 - - G5 Bb5 - D6 - Bb5 - - - G5 - Bb5 -', l6: 'A5 - - F5 A5 - D6 - A5 - - - F5 - A5 -',
  l7: 'G5 F5 E5 D5 C#5 D5 E5 F5 G5 - A5 - Bb5 - A5 -', l8: 'D6 - A5 - F5 - D5 - . . A4 - D5 - . .',
  m1: 'C6 - - A5 C6 - A5 - F5 - - - A5 - C6 -', m2: 'G5 - - E5 G5 - E5 - C5 - - - E5 - G5 -',
  m3: 'A5 - - F5 A5 - F5 - D5 - - - F5 - A5 -', m4: 'E5 - - C#5 E5 - G5 - A5 - - - . . . .',
  m5: 'D6 - - Bb5 D6 - Bb5 - F5 - - - Bb5 - D6 -', m7: 'Bb5 A5 G5 F5 E5 F5 G5 A5 Bb5 - - - A5 - G5 -',
  m8: 'E5 - C#5 - A4 - E5 - A5 - - - . . . .',
  bd: e8('D2 A2 D3 A2 D2 A2 D3 C#3'), ba: e8('A2 E3 A3 E3 A2 E3 G3 E3'), bv: e8('Bb2 F3 Bb3 F3 A2 E3 A3 E3'),
  bg: e8('G2 D3 G3 D3 G2 D3 G3 D3'), bf: e8('F2 C3 F3 C3 F2 C3 F3 C3'), bc: e8('C3 G3 C4 G3 C3 G3 C4 G3'), bb: e8('Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3'),
  pd: off('F4'), pa: off('C#4'), pg: off('Bb3'), pf: off('A4'), pc: off('E4'), pb: off('D4'),
}, {
  lead: 'l1 l2 l3 l4 l5 l6 l7 l8 m1 m2 m3 m4 m5 m1 m7 m8',
  bass: 'bd ba bd bv bg bd ba bd bf bc bd ba bb bf bg ba',
  pad: 'pd pa pd pa pg pd pa pd pf pc pd pa pb pf pg pa',
  arp: 'rdm ra rdm ra rgm rdm ra rdm rf rc rdm ra rbb rf rgm ra',
  d1: 'd*7 f d*7 f', d2: 'd2*7 f2 d2*7 f2',
});

// ── 2. Exploration : mi phrygien, cœur qui bat, notes rares, triton dans le motif ─────
const explore: Track = {
  bpm: 84, vol: 1.6, loop: 0,
  pats: {
    be: 'E3 . . E3 . . . . . . . . . . . .', bf: 'F3 . . F3 . . . . . . . . . . . .', bd: 'D3 . . D3 . . . . . . . . . . . .', bg: 'G3 . . G3 . . . . . . . . . . . .',
    ae: 'E4 . . . B4 . . . E5 . . . G5 . . .', af: 'F4 . . . C5 . . . F5 . . . A5 . . .', ad: 'D4 . . . A4 . . . D5 . . . F5 . . .', ag: 'G4 . . . D5 . . . G5 . . . B5 . . .',
    m1: '. . . . F5 - - - E5 - - - - - - -', m2: '. . . . . . . . Bb4 - - - B4 - - -', m3: '. . . . G5 - F5 - E5 - - - - - - -', m4: '. . . . . . . . F4 - - - E4 - - -',
    k: 'E4 . . . . . . . . . . . . . . .', h: '. . H . . . H . . . H . . . H .',
  },
  ch: [
    { i: 'tri', v: VOL.bass * 0.9, seq: 'be bf be bd be bf bg bf', gate: 0.9 },
    { i: 'p12', v: VOL.arp * 0.9, seq: 'ae af ae ad ae af ag af', pluck: true, wet: 0.5 },
    { i: 'p25', v: VOL.lead * 0.5, seq: '_ _ m1 m2 _ _ m3 m4', vib: true, wet: 0.5 },
    { i: 'bell', v: VOL.bell * 0.55, seq: 'k _ _ _' },
    { i: 'drum', v: 0.5, seq: 'h' },
  ],
};

// ── 2bis. Tuto : la bibliothèque. Accords chauds, boîte à musique, flûte, tic-tac d'horloge ──
const library: Track = {
  bpm: 69, vol: 1.2, loop: 0,
  pats: {
    adm: e8('D4 A4 C5 E5 F5 E5 C5 A4'), abb: e8('Bb3 F4 A4 D5 F5 D5 A4 F4'), af: e8('F3 C4 A4 C5 E5 C5 A4 C4'), ac: e8('C4 G4 C5 E5 G5 E5 C5 G4'),
    agm: e8('G3 D4 F4 Bb4 D5 Bb4 F4 D4'), asu: e8('A3 E4 A4 D5 E5 D5 A4 E4'), aa: e8('A3 E4 A4 C#5 E5 C#5 A4 E4'),
    bd: 'D3 - - - - - - - A2 - - - - - - -', bb: 'Bb2 - - - - - - - F2 - - - - - - -', bf: 'F2 - - - - - - - C3 - - - - - - -', bc: 'C3 - - - - - - - G2 - - - - - - -',
    bg: 'G2 - - - - - - - D3 - - - - - - -', ba: 'A2 - - - - - - - E3 - - - - - - -',
    l1: 'F5 - - - - - E5 - D5 - - - A4 - - -', l2: 'Bb4 - - - A4 - - - F4 - - - - - - -', l3: 'A4 - - - C5 - - - E5 - - - - - D5 -', l4: 'C5 - - - G4 - - - - - - - . . . .',
    l5: 'F5 - - - - - E5 - D5 - - - F5 - - -', l6: 'G5 - - - F5 - D5 - Bb4 - - - - - - -', l7: 'A4 - - - Bb4 - - - C5 - - - D5 - - -', l8: 'E5 - - - C#5 - - - A4 - - - - - - -',
    m1: 'C5 - - - A4 - - - C5 - D5 - E5 - - -', m2: 'G5 - - - E5 - - - D5 - - - C5 - - -', m3: 'D5 - - - F5 - - - A5 - - - - - G5 -', m4: 'F5 - - - D5 - - - Bb4 - - - - - - -',
    m5: 'Bb4 - - - D5 - - - G5 - - - F5 - D5 -', m6: 'C5 - - - A4 - - - F5 - - - - - E5 -', m7: 'E5 - - - - - D5 - C#5 - - - A4 - - -', m8: 'D5 - - - - - - - - - - - . . . .',
    tic: 'H . . . H . . . H . . . H . . .',
  },
  ch: [
    { i: 'p12', v: VOL.arp * 0.85, seq: 'adm abb af ac adm agm abb asu af ac adm abb agm af aa adm', pluck: true, wet: 0.35 },
    { i: 'tri', v: VOL.bass * 0.62, seq: 'bd bb bf bc bd bg bb ba bf bc bd bb bg bf ba bd', gate: 0.95 },
    { i: 'p50', v: VOL.lead * 0.42, seq: 'l1 l2 l3 l4 l5 l6 l7 l8 m1 m2 m3 m4 m5 m6 m7 m8', vib: true, wet: 0.45, gate: 0.97 },
    { i: 'drum', v: 0.28, seq: 'tic' },
  ],
};

// ── 3. Annonce du boss : le combat part à 3,0 s (EN GARDE ! vient de s'effacer) ───────
const announce: Track = {
  bpm: 120, len: 3.6, pats: {}, ch: [],
  once(o, t) {
    // Bourdon + montée de bruit jusqu'au nom.
    drone(o, 'tri', 38, t, 2.3, VOL.bass * 1.1, 0.5);
    drone(o, 'p50', 39, t, 0.72, VOL.pad * 0.7, 0.6);
    riser(o, t, 0.7, VOL.crash * 1.2);
    // 0,70 s : le nom apparaît. Cloche + ré mineur avec le triton (sol dièse).
    const a = t + 0.7, b = 1.6;
    chipBell(o, 74, a, VOL.bell * 2.2, 2.4);
    drum(o, 'K', a); drum(o, 'C', a, 0.8);
    tone(o, 'p50', 50, a, b, VOL.pad * 1.8, { wet: 0.3 });
    tone(o, 'p25', 65, a, b, VOL.lead * 0.55, { wet: 0.3 });
    tone(o, 'p25', 69, a, b, VOL.lead * 0.55, { wet: 0.3 });
    tone(o, 'p12', 68, a, b, VOL.lead * 0.75, { wet: 0.3, vib: true });
    // 2,30 s : « EN GARDE ! », accord sec, roulement qui lance le combat ; la queue couvre un éventuel retard.
    const g = t + 2.3;
    drum(o, 'K', g); drum(o, 'C', g, 0.6);
    for (const m of [50, 62, 69, 77]) tone(o, m === 50 ? 'tri' : 'p25', m, g, 1.3, m === 50 ? VOL.bass : VOL.lead * 0.5, { pluck: true });
    [0.29, 0.43, 0.56].forEach((d, i) => drum(o, 'S', g + d, 0.55 + i * 0.2));
  },
};

// ── 6. Jingles ────────────────────────────────────────────────────────────────────────
/** Victoire : ré majeur, arpège qui monte et se pose (3,5 s). */
const victory: Track = {
  bpm: 120,
  pats: {
    l1: 'A4 . D5 . F#5 . A5 - - - - . F#5 - A5 -', l2: 'D6 - - - - - - - - - - - - - . .',
    h1: '. . . . D5 - - - . . . . D5 - - -', h2: 'F#5 - - - - - - - - - - - - - . .',
    b1: 'D3 - - - D3 - - - A2 - - - A2 - - -', b2: 'D3 - - - - - - - - - - - - - . .',
    a2: 'D5 F#5 A5 D6 A5 F#5 D5 F#5 A5 D6 A5 F#5 . . . .',
    d1: 'K . . . S . . . K . . . S . S S', d2: 'C . . . . . . . . . . . . . . .',
  },
  ch: [
    { i: 'p25', v: VOL.lead, seq: 'l1 l2', wet: 0.3, vib: true },
    { i: 'p50', v: VOL.pad * 1.2, seq: 'h1 h2', wet: 0.2 },
    { i: 'p12', v: VOL.arp, seq: '_ a2', pluck: true },
    { i: 'tri', v: VOL.bass, seq: 'b1 b2', gate: 0.9 },
    { i: 'drum', v: 1, seq: 'd1 d2' },
  ],
};
/** Défaite : la ligne descend sur le ré grave, le glas part au claquement de GAME OVER (0,4 s). */
const defeat: Track = {
  bpm: 75,
  pats: {
    l1: '. . A4 - - G#4 - - F4 - - D4 - - C#4 -', l2: 'D4 - - - . . . . . . . . . . . .',
    b1: '. . D3 - - - - - Bb2 - - - A2 - - -', b2: 'D2 - - - . . . . . . . . . . . .',
    p1: '. . F4 - - - - - D4 - - - E4 - - -', p2: 'F4 - - - . . . . . . . . . . . .',
    k: '. . D4 . . . . . . . . . . . . .', k2: 'A3 . . . . . . . . . . . . . . .',
  },
  ch: [
    { i: 'p25', v: VOL.lead * 0.85, seq: 'l1 l2', wet: 0.4, vib: true },
    { i: 'p50', v: VOL.pad, seq: 'p1 p2', wet: 0.3 },
    { i: 'tri', v: VOL.bass, seq: 'b1 b2', gate: 0.97 },
    { i: 'bell', v: VOL.bell * 1.4, seq: 'k k2' },
  ],
};

// ── 7. Cinématiques de fin ────────────────────────────────────────────────────────────
/** Aube (6,65 s) : mineur dans la nuit, ré majeur à la lumière (3,33 s), montée en fanfare à 4,8 s, sommet à 5,6 s. */
const dawn: Track = {
  bpm: 72,
  pats: {
    a1: e8('D4 A4 D5 F5 A4 D5 E5 G5'), a2: e8('D4 A4 D5 F#5 A5 F#5 D6 A5'),
    b1: 'D3 - - - - - - - - - - - A2 - - -', b2: 'D3 - - - - - - - D3 - - - - - - -',
    l1: 'A4 - - - - - - - F4 - - - - - E4 -', l2: 'F#4 - - - - - - A4 D5 F#5 A5 D6 - - - -',
    h2: '. . . . . . . . . . . F#5 - - - -', k2: 'D5 . . . . . . . . . . . . . . .',
    d2: '. . . . . . . S S S S C . . . .',
  },
  ch: [
    { i: 'p12', v: VOL.arp, seq: 'a1 a2', pluck: true, wet: 0.4 },
    { i: 'tri', v: VOL.bass * 0.85, seq: 'b1 b2', gate: 0.97 },
    { i: 'p25', v: VOL.lead * 0.8, seq: 'l1 l2', vib: true, wet: 0.35 },
    { i: 'p50', v: VOL.pad * 1.3, seq: '_ h2', wet: 0.3 },
    { i: 'bell', v: VOL.bell, seq: '_ k2' },
    { i: 'drum', v: 0.8, seq: '_ d2' },
  ],
};

/**
 * Trône : sections attendues par les événements de la scène (music.cue), pas par le chronomètre.
 * 0-2 marche (le motif de McKing passé en majeur) · 3-4 silence tendu · 5-6 VIVE LE ROI · 7 il s'assoit · 8-15 générique, boucle.
 */
const throne: Track = {
  bpm: 126, loop: 8, jump: { 3: 0, 5: 3, 8: 7, 16: 8 }, // chaque section tourne jusqu'à son cue
  pats: {
    p1: 'D5 - - A4 D5 - F#5 - A5 - - - F#5 - D5 -', p2: 'E5 - - A4 C#5 - E5 - A5 - - - G5 - E5 -', p3: 'F#5 - - D5 F#5 - A5 - D6 - - - A5 - F#5 -',
    bd: e8('D3 A2 D3 A2 D3 A2 D3 A2'), ba: e8('A2 E3 A2 E3 A2 E3 A2 E3'), bg: e8('G2 D3 G2 D3 G2 D3 G2 D3'), bb: e8('B2 F#3 B2 F#3 B2 F#3 B2 F#3'), bf: e8('F#2 C#3 F#2 C#3 F#2 C#3 F#2 C#3'),
    dp: 'K . S S K . S . K . S S K . S S',
    hb: whole('A2'), ht: 'A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 .', hr: 'H H H H H H H H H H H H H H H H',
    f1: 'D6 - - - A5 - D6 - F#6 - - - - - E6 -', f2: 'D6 - - - A5 - F#5 - A5 - D6 - - - - -',
    g1: 'F#5 - - - F#5 - F#5 - A5 - - - - - G5 -', g2: 'F#5 - - - D5 - D5 - F#5 - A5 - - - - -',
    rd: a16('D4 F#4 A4 D5'), rg: a16('G3 B3 D4 G4'), ra: a16('A3 C#4 E4 A4'), rb: a16('B3 D4 F#4 B4'), rf: a16('F#3 A3 C#4 F#4'),
    df: 'C . H . S . H K K . H . S . S S', dg: 'K . H . S . H K K . H . S S S S',
    s7: 'D3 . . . . . . . . . . . . . . .', up: '. . . . . . . . A4 - C#5 - E5 - G5 -',
    c1: 'A5 - - - - - B5 - A5 - - - F#5 - - -', c2: 'D5 - - - - - - - . . F#5 - G5 - - -', c3: 'B5 - - - - - A5 - G5 - - - D6 - - -', c4: 'C#6 - - - - - - - - - - - A5 - - -',
    c5: 'D6 - - - - - E6 - F#6 - - - E6 - D6 -', c6: 'C#6 - - - - - - - A5 - - - C#6 - - -', c7: 'B5 - - - A5 - - - G5 - - - - - F#5 -', c8: 'E5 - - - C#5 - - - A5 - - - - - - -',
    ad: e8('D4 A4 D5 F#5 A5 F#5 D5 A4'), ab: e8('B3 F#4 B4 D5 F#5 D5 B4 F#4'), ag: e8('G3 D4 G4 B4 D5 B4 G4 D4'), aa: e8('A3 E4 A4 C#5 E5 C#5 A4 E4'), af: e8('F#3 C#4 F#4 A4 C#5 A4 F#4 C#4'),
    dc: 'K . H . S . H . K . H . S . H H',
  },
  ch: [
    // Bars :                 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15
    { i: 'p25', v: VOL.lead, seq: 'p1 p2 p3 _ _ f1 f2 up c1 c2 c3 c4 c5 c6 c7 c8', vib: true, wet: 0.2, gate: 0.94 },
    { i: 'tri', v: VOL.bass, seq: 'bd ba bd hb hb bd bd s7 bd bb bg ba bd bf bg ba', gate: 0.85 },
    { i: 'p50', v: VOL.pad * 1.1, seq: '_ _ _ _ _ g1 g2 _ _ _ _ _ _ _ _ _' },
    { i: 'p12', v: VOL.arp * 0.8, seq: '_ _ _ ht ht rd rd _ ad ab ag aa ad af ag aa', gate: 0.85 },
    { i: 'drum', v: 1, seq: 'dp dp dp _ _ df dg _ dc dc dc dc dc dc dc dc' },
    { i: 'drum', v: 0.28, seq: '_ _ _ hr hr _ _ _ _ _ _ _ _ _ _ _' },
  ],
};

/** Pistes par nom. */
export const TRACKS: Record<string, Track> = { menu, library, explore, announce, boss1, boss2, boss3, victory, defeat, dawn, throne };
