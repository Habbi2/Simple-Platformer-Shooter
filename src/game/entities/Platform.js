import Phaser from 'phaser';

export class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, w = 64, h = 16) {
    super(scene, x, y, 'platform_tex');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.displayWidth = w;
    this.displayHeight = h;
    this.refreshBody();
  }
}
