import Phaser from 'phaser';
class Hello extends Phaser.Scene {
  create() { this.add.rectangle(160, 90, 40, 40, 0x7ff6ff); }
}
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 320, height: 180, banner: false, scene: [Hello] });
