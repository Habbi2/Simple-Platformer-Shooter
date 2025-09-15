import Phaser from 'phaser';
import { CONST } from '../constants.js';

export class Arrow extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'arrow_tex');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.lifespan = 1400; // ms
    this.spawnTime = scene.time.now;
    this.setDepth(5);
    this.body.allowGravity = true;
    this.body.gravity.y = CONST.ARROW_GRAVITY;
    // Smaller body to match thin arrow
    this.body.setSize(18, 4, true);
    this._stuck = false;
    this.damage = 25;
  }

  fire(x, y, dx, dy, speed) {
    this.setPosition(x, y);
    const len = Math.hypot(dx, dy) || 1;
    const spd = speed ?? CONST.ARROW_SPEED;
    const vx = (dx / len) * spd;
    const vy = (dy / len) * spd;
    this.body.velocity.x = vx;
    this.body.velocity.y = vy;
    // point arrow to its velocity direction
    this.setRotation(Math.atan2(vy, vx));
  }

  update(time) {
    if (!this.body) return;
    if (this._stuck) return; // no updates if stuck
    // keep rotation matching velocity for any later adjustments
    const vx = this.body.velocity.x, vy = this.body.velocity.y;
    if (vx || vy) this.setRotation(Math.atan2(vy, vx));
    if (time - this.spawnTime > this.lifespan) this.destroy();
  }

  stickAt(x, y) {
    this._stuck = true;
    if (this.body) {
      this.body.setVelocity(0, 0);
      this.body.allowGravity = false;
      this.body.moves = false;
      this.body.enable = false; // stop further collisions/callbacks
    }
    this.setPosition(x, y);
    // fade and cleanup after 2.5s
    try {
      if (this.scene && this.scene.tweens) {
        this.scene.tweens.add({ targets: this, alpha: 0.2, duration: 2500, onComplete: () => { try { this.destroy(); } catch {} } });
      } else if (this.scene && this.scene.time) {
        this.setAlpha(0.2);
        this.scene.time.delayedCall(2500, () => { try { this.destroy(); } catch {} });
      } else {
        // Last resort: fallback to window timeout
        this.setAlpha(0.2);
        setTimeout(() => { try { this.destroy(); } catch {} }, 2500);
      }
    } catch {}
  }

  setDamage(dmg) { this.damage = dmg; }
}
