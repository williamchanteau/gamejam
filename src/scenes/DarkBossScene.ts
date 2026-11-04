import { BossScene } from './BossScene';
import { NYCTHOR } from '../bosses/nycthor';

/** Salle de Nycthor : l'obscurité et les lanternes vivent avec le boss (bosses/lanterns.ts). */
export class DarkBossScene extends BossScene {
  protected def = NYCTHOR;
  protected floor = 1;
  constructor() { super('Boss2'); }
}
