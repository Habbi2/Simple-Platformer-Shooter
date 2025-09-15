import Phaser from 'phaser';
import { CONST } from '../constants.js';

export class Bullet extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'bullet_tex');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.lifespan = 1000; // ms
    this.spawnTime = scene.time.now;
    this.setCircle(3);
    this.setDepth(5);
  }

  fire(x, y, dx, dy) {
    this.setPosition(x, y);
    const len = Math.hypot(dx, dy) || 1;
    this.body.velocity.x = (dx / len) * CONST.BULLET_SPEED;
    this.body.velocity.y = (dy / len) * CONST.BULLET_SPEED;
  }

  update(time) {
    if (time - this.spawnTime > this.lifespan) {
      this.destroy();
    }
  }
}
