// Étages du château, du bas vers le haut. Ajouter un boss = ajouter une entrée (scène + étiquettes).
import { PLAYER } from './config';

export interface Floor { scene: string; name: string; place: string }
export const FLOORS: Floor[] = [
  { scene: 'Boss1', name: 'REZ-DE-CHAUSSÉE', place: 'LA NEF' },
  { scene: 'Boss2', name: 'ÉTAGE 1', place: 'LA CRYPTE DES LANTERNES' },
  { scene: 'Boss3', name: 'ÉTAGE 2', place: 'LA SALLE À MANGER' },
];
/** Nom affiché d'un étage d'indice i (0 = RDC). */
export const floorName = (i: number) => FLOORS[i]?.name ?? `ÉTAGE ${i}`;
/** Amélioration choisie à la table du banquet : sort en 2 vagues ou dash qui plante les dagues. */
export type Upgrade = '' | 'wave' | 'dash';
/** Partie en cours : DIFFICILE = aucune sauvegarde (une mort en boss renvoie devant le château) ; VRAIMENT FACILE = sauvegardes de NORMAL, plus de cœurs et de dégâts. */
export const run = { easy: false, hard: false, upgrade: '' as Upgrade };
/** Cœurs au maximum selon la difficulté. */
export const maxHp = () => (run.easy ? PLAYER.easyHp : PLAYER.hp);
/** Scène de reprise après une mort : boss 1 (ou tout boss en DIFFICILE) → dehors ; sinon la salle elle-même. */
export function saveOf(from: string) {
  const i = FLOORS.findIndex((f) => f.scene === from);
  return i === 0 || (i > 0 && run.hard) ? 'Outside' : from;
}
