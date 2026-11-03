import Phaser from 'phaser';
import { W, H, PHYS } from './config';
import { BootScene } from './scenes/BootScene';
import { TestScene } from './scenes/TestScene';
import { PauseScene } from './scenes/PauseScene';
import { MenuScene } from './scenes/MenuScene';
import { BossScene } from './scenes/BossScene';

const zoom = () => Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  zoom: zoom(),
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0a14',
  banner: false,
  disableContextMenu: true,
  audio: { noAudio: true },
  input: { keyboard: false },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: PHYS.gravity } } },
  scene: [BootScene, MenuScene, TestScene, BossScene, PauseScene],
});
addEventListener('resize', () => game.scale.setZoom(zoom()));
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
