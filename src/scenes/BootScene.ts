import Phaser from 'phaser';
import { makeFont } from '../art/font';
import { makePlayerArt } from '../art/player';
import { makeFxArt } from '../art/fx';
import { makeRoomArt } from '../art/room';
import { makeTitleArt } from '../art/title';
import { makeMordrecArt } from '../bosses/mordrec';
import { makeNaveArt } from '../art/nave';

// Génère toutes les textures par code, puis lance le jeu.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeFont(this);
    makePlayerArt(this);
    makeFxArt(this);
    makeRoomArt(this);
    makeTitleArt(this);
    makeMordrecArt(this);
    makeNaveArt(this);
    // DEV : #Boss1, #Test... pour démarrer directement sur une scène.
    this.scene.start(import.meta.env.DEV && location.hash ? location.hash.slice(1) : 'Menu');
  }
}
