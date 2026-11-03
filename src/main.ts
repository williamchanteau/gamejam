import Phaser from 'phaser';
import { W, H, PHYS } from './config';
import { BootScene } from './scenes/BootScene';
import { TestScene } from './scenes/TestScene';
import { PauseScene } from './scenes/PauseScene';
import { MenuScene } from './scenes/MenuScene';
import { BossScene } from './scenes/BossScene';
import { OutsideScene } from './scenes/OutsideScene';
import { TransitScene } from './scenes/TransitScene';

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
  scene: [BootScene, MenuScene, TestScene, OutsideScene, BossScene, TransitScene, PauseScene],
});
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
