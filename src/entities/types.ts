import Phaser from 'phaser';

/** Quelque chose que le joueur peut frapper. */
export interface Target {
  /** Zone touchable ; `q` = le coup testé, pour une cible en plusieurs parties. */
  hurtRect(q?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle;
  /** false = coup paré : ni mana ni hit-stop. */
  hit(damage: number, fromX: number): boolean | void;
  alive(): boolean;
}
