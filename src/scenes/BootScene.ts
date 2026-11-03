import Phaser from 'phaser';
import { makeFont } from '../art/font';
import { makePlayerArt } from '../art/player';
import { makeFxArt } from '../art/fx';
import { makeRoomArt } from '../art/room';
import { makeTitleArt } from '../art/title';
import { makeMordrecArt } from '../bosses/mordrec';
import { makeNaveArt } from '../art/nave';
import { makeOutsideArt } from '../art/outside';
import { makeTowerArt } from '../art/tower';

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
    makeOutsideArt(this);
    makeNaveArt(this);
    makeTowerArt(this);
    // DEV : #Boss1, #Test... pour démarrer directement sur une scène ; /?viewer = visualiseur.
    const dev = import.meta.env.DEV ? (location.search.includes('viewer') ? 'Viewer' : location.hash.slice(1)) : '';
    this.scene.start(dev || 'Menu');
  }
}
