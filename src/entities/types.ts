import Phaser from 'phaser';

/** Quelque chose que le joueur peut frapper. */
export interface Target {
  hurtRect(): Phaser.Geom.Rectangle;
  hit(damage: number, fromX: number): void;
  alive(): boolean;
}
