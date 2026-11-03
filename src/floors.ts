// Étages du château, du bas vers le haut. Ajouter un boss = ajouter une entrée (scène + étiquettes).
export interface Floor { scene: string; name: string; place: string }
export const FLOORS: Floor[] = [
  { scene: 'Boss1', name: 'REZ-DE-CHAUSSÉE', place: 'LA NEF' },
  { scene: 'Boss2', name: 'ÉTAGE 1', place: 'LA CRYPTE DES LANTERNES' },
];
/** Nom affiché d'un étage d'indice i (0 = RDC). */
export const floorName = (i: number) => FLOORS[i]?.name ?? `ÉTAGE ${i}`;
