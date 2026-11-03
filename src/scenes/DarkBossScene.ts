import { BossScene } from './BossScene';
import { NOCTIS } from '../bosses/noctis';

/** Salle de Noctis : l'obscurité et les lanternes vivent avec le boss (bosses/lanterns.ts). */
export class DarkBossScene extends BossScene {
  protected def = NOCTIS;
  protected floor = 1;
  constructor() { super('Boss2'); }
}
