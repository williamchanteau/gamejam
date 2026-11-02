import Phaser from 'phaser';
import { makeFont } from '../art/font';
import { makePlayerArt } from '../art/player';
import { makeFxArt } from '../art/fx';
import { makeRoomArt } from '../art/room';

// Génère toutes les textures par code, puis lance le jeu.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeFont(this);
    makePlayerArt(this);
    makeFxArt(this);
    makeRoomArt(this);
    this.scene.start('Test');
  }
}
