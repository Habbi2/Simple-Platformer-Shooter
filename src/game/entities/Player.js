import Phaser from 'phaser';
import { CONST } from '../constants.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, colorKey = 'player_tex') {
    super(scene, x, y, colorKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setSize(12, 22);
    this.setOffset(3, 2);
    this.hp = 100;
    this.lastHit = 0;
    this.aim = { x: 1, y: 0 };
    this.fireCooldown = 0;
  }

  takeDamage(dmg) {
    const t = this.scene.time.now;
    if (t - this.lastHit < CONST.INVULN_MS) return false;
    this.lastHit = t;
    this.hp = Math.max(0, this.hp - dmg);
    return this.hp === 0;
  }
}
