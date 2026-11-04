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
  l5: 'F5 - - - D5 - - F5 A5 - - - G5 - F5 -', l6: 'D5 - - - Bb4 - - D5 F5 - - - E5 - D5 -',
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
  be: e8('E2 F2 E2 G2 E2 F2 E2 B2'), bf: e8('F2 G2 F2 A2 F2 G2 F2 C3'), bd: e8('D2 E2 D2 F2 D2 E2 D2 A2'),
  bg: e8('G2 A2 G2 B2 G2 A2 G2 D3'), ba: e8('A2 B2 A2 C3 A2 B2 A2 E3'),
  pe: whole('G4'), pf: whole('A4'), pd: whole('F4'), pg: whole('B4'), pa: whole('C5'),
}, {
  lead: 'l1 l2 l3 l4 l5 l6 l7 l8 m1 m2 m3 m4 m5 m6 m7 m8',
  bass: 'be bf be bd be bf bg bf ba bf be be bd bf be be',
  pad: 'pe pf pe pd pe pf pg pf pa pf pe pe pd pf pe pe',
  arp: 'rem rfh rem rdm rem rfh rg rfh ram rfh rem rem rdm rfh rem rem',
  d1: 'd*7 f d*7 f', d2: 'd2*7 f2 d2*7 f2',
}, 0.97);
boss2.pats.ln1 = 'E6 . . . . . . . . . . . . . . .';
boss2.pats.ln2 = 'B5 . . . . . . . . . . . . . . .';
boss2.ch.push({ i: 'bell', v: VOL.bell * 0.45, seq: 'ln1 _ _ _ ln2 _ _ _' });

/** McKing : ré mineur, marche pompeuse en flonflons. */
const boss3 = fight(150, {
  ...ARP, ...dDrums,
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

/** Pistes par nom. Les autres arrivent à l'étape suivante. */
export const TRACKS: Record<string, Track> = { menu, boss1, boss2, boss3 };

// Réservés aux stingers (étape 2).
void drone; void riser; void chipBell; void tone; void drum;
