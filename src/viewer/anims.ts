// DEV uniquement (/?viewer) : entités et animations du visualiseur. Elles pilotent le VRAI code
// du jeu (Player, Boss, patterns) ; les accès aux membres privés passent par les casts ci-dessous.
import { PLAYER } from '../config';
import type { BossDef } from '../entities/Boss';
import { MORDREC } from '../bosses/mordrec';
import { NOCTIS } from '../bosses/noctis';
import type { ViewerScene } from './ViewerScene';

export interface Anim { label: string; pattern?: boolean; p1?: boolean; setup(v: ViewerScene): void; done(v: ViewerScene, t: number): boolean }
export interface Entity { id: string; label: string; boss?: BossDef; files: string[] }
const BOSS_ENGINE = 'src/entities/Boss.ts (moteur générique : b.tele/t/tw/temp/hazard/eyes/hitbox)';
/** Ajouter un boss au viewer = ajouter une ligne ici (id = nom du fichier de params). */
export const ENTITIES: Entity[] = [
  { id: 'player', label: 'JOUEUR', files: ['src/art/player.ts (dessin : palette P, HOOD, POSES)', 'src/entities/Player.ts (états, animation, sort)', 'src/config.ts → PLAYER (gameplay)', 'src/scenes/ArenaScene.ts (spawnSpell/updateSpells, particules)', 'src/art/fx.ts (textures slash, moon, glowC…)'] },
  { id: 'mordrec', label: 'MORDREC', boss: MORDREC, files: ['src/bosses/mordrec.ts (dessin makeMordrecArt, build/rest/roar/death, patterns, valeurs M)', BOSS_ENGINE] },
  { id: 'noctis', label: 'NOCTIS', boss: NOCTIS, files: ['src/art/noctis.ts (dessin : palette N, buste, tête-cage, lanternes)', 'src/art/noctisRig.ts (squelette : membres, tentacules, pieds, lanternes pendulaires)', 'src/bosses/noctis.ts (build/rest/roar/death, poses P, patterns)', 'src/bosses/lanterns.ts (valeurs NIGHT, lanternes, feu, obscurité)', BOSS_ENGINE] },
];

export type Seg = { k: 't' | 'a' | 'r' | 'n'; from: number; n: number };
export const V = {
  ent: 0, anim: 0, phase: 1 as 1 | 2, speed: 1, zoom: 2, loop: true, paused: false, follow: true, arena: false, sound: false,
  show: { hit: true, hurt: true, pivot: false }, frame: 0, total: 0, segs: [] as Seg[],
  /** Appels à b.tele() : image, durée demandée (÷ vitesse), durée obtenue (bornée au minimum). */
  teles: [] as { f: number; req: number; got: number }[],
};

type PP = { swing(i: number): void; dash(d: number): void; jump(v: number): void; die(): void; state: string; stateT: number; combo: number };
type BP = { gen: unknown; waitT: number; toPhase2(): void; die(): void };
export const pp = (v: ViewerScene) => v.player as unknown as PP;
export const bp = (v: ViewerScene) => v.boss as unknown as BP;

/** Vrai `d` s après que `cond` est devenu vrai pour la première fois. */
function after(v: ViewerScene, t: number, cond: boolean, d: number) {
  if (v.endT < 0 && cond) v.endT = t;
  return v.endT >= 0 && t >= v.endT + d;
}
const back = (v: ViewerScene, t: number) => after(v, t, t > 0.1 && pp(v).state === 'normal' && v.player.grounded, 0.25);

const playerAnims = (): Anim[] => [
  { label: 'IDLE', setup() {}, done: (_v, t) => t >= 1.25 },
  { label: 'COURSE', setup: (v) => v.hold('ArrowRight'), done: (_v, t) => t >= 1.2 },
  { label: 'SAUT', setup: (v) => { v.hold('Space'); pp(v).jump(PLAYER.jumpVel); }, done: back },
  ...[0, 1, 2].map((i): Anim => ({ label: `ATTAQUE ${i + 1}`, setup: (v) => pp(v).swing(i), done: back })),
  { label: 'DASH', setup: (v) => pp(v).dash(1), done: back },
  { label: 'TOUCHÉ', setup: (v) => { v.player.god = false; v.player.hurt(v.player.x + 20); }, done: (_v, t) => t >= 1.3 },
  { label: 'MORT', setup: (v) => pp(v).die(), done: (_v, t) => t >= 1.5 },
];

const bossAnims = (def: BossDef): Anim[] => [
  { label: 'IDLE', setup: (v) => v.boss!.start(1e9), done: (_v, t) => t >= 1.8 },
  ...def.patterns.map((p): Anim => ({
    label: p.name.toUpperCase() + (p.phase ? ` (P${p.phase})` : ''), pattern: true,
    setup: (v) => { const b = v.boss!; b.start(0); b.state = 'pattern'; b.face(); bp(v).waitT = 0; bp(v).gen = p.run(b); },
    done: (v, t) => after(v, t, v.boss!.state === 'idle', 0.3) || t > 20,
  })),
  { label: 'RUGISSEMENT P2', p1: true, setup: (v) => { v.boss!.start(1e9); bp(v).toPhase2(); }, done: (v, t) => after(v, t, v.boss!.state === 'idle', 0.4) },
  { label: 'MORT', setup: (v) => { v.boss!.start(1e9); bp(v).die(); }, done: (_v, t) => t >= 3 },
];

export const animsOf = (e: Entity) => (e.boss ? bossAnims(e.boss) : playerAnims());
