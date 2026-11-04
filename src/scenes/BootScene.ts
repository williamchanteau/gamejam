import Phaser from 'phaser';
import { makeFont } from '../art/font';
import { makePlayerArt } from '../art/player';
import { makeFxArt } from '../art/fx';
import { makeRoomArt } from '../art/room';
import { makeTitleArt } from '../art/title';
import { makeYsoldeArt } from '../bosses/ysolde';
import { makeNaveArt } from '../art/nave';
import { makeOutsideArt } from '../art/outside';
import { makeStormArt } from '../art/storm';
import { makeTowerArt } from '../art/tower';
import { makeMcKingArt } from '../art/mcking';
import { makeDiningArt } from '../art/dining';
import { makeEndingArt } from '../art/ending';
import { makeThroneArt } from '../art/throne';
import { makeCitizenArt } from '../art/citizens';

// Génère toutes les textures par code, puis lance le jeu.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeFont(this);
    makePlayerArt(this);
    makeFxArt(this);
    makeRoomArt(this);
    makeTitleArt(this);
    makeYsoldeArt(this);
    makeOutsideArt(this);
    makeStormArt(this);
    makeNaveArt(this);
    makeTowerArt(this);
    makeMcKingArt(this);
    makeDiningArt(this);
    makeEndingArt(this);
    makeThroneArt(this);
    makeCitizenArt(this);
    // DEV : #Boss1, #Test... pour démarrer directement sur une scène ; #Escalier = montée de la tour en boucle ; /?viewer = visualiseur.
    const dev = import.meta.env.DEV ? (location.search.includes('viewer') ? 'Viewer' : location.hash.slice(1)) : '';
    if (dev === 'Escalier') this.scene.start('Transit', { floor: 1, loop: true });
    else this.scene.start(dev || 'Menu');
  }
}
