import Phaser from 'phaser';
import { DarkBossScene } from './scenes/DarkBossScene';
import { BurgerScene } from './scenes/BurgerScene';
import { W, H, PHYS } from './config';
import { BootScene } from './scenes/BootScene';
import { TestScene } from './scenes/TestScene';
import { PauseScene } from './scenes/PauseScene';
import { MenuScene } from './scenes/MenuScene';
import { BossScene } from './scenes/BossScene';
import { OutsideScene } from './scenes/OutsideScene';
import { TransitScene } from './scenes/TransitScene';
import { GameOverScene } from './scenes/GameOverScene';
import { DawnScene } from './scenes/DawnScene';
import { ThroneScene } from './scenes/ThroneScene';
import { music } from './audio/music';
import { ChronoScene } from './scenes/ChronoScene';

const scenes = [BootScene, MenuScene, TestScene, OutsideScene, BossScene, DarkBossScene, BurgerScene, TransitScene, DawnScene, ThroneScene, PauseScene, GameOverScene, ChronoScene]; // Chrono en dernier : dessiné par-dessus tout
function start(extra: Phaser.Types.Scenes.SceneType[] = []) {
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // Rendu 480×270 agrandi pour remplir l'écran (×4 exact en 1920×1080).
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0a14',
  banner: false,
  disableContextMenu: true,
  audio: { noAudio: true },
  input: { keyboard: false },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: PHYS.gravity } } },
  scene: [...scenes, ...extra],
});
// Musique : chaque scène choisit sa piste à sa création ; la pause l'étouffe le temps qu'elle est ouverte.
game.events.once(Phaser.Core.Events.READY, () => {
  for (const s of game.scene.scenes) {
    s.events.on(Phaser.Scenes.Events.CREATE, () => music.scene(s.scene.key));
    if (s.scene.key === 'Pause') s.events.on(Phaser.Scenes.Events.SHUTDOWN, () => music.duck(false));
  }
});
if (import.meta.env.DEV) Object.assign(window, { game, music });
}
// DEV : /?viewer = visualiseur d'animations, #Musique = juke-box (src/viewer/, remplacé par un module vide au build).
if (import.meta.env.DEV && location.search.includes('viewer')) import('./viewer/ViewerScene').then((m) => start([m.ViewerScene]));
else if (import.meta.env.DEV && location.hash === '#Musique') import('./viewer/MusicScene').then((m) => start([m.MusicScene]));
else start();
