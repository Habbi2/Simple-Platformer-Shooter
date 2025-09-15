import Phaser from 'phaser';
import { CONST } from '../constants.js';

export class PlayerController {
  constructor(scene, player, { coyoteMs = 100, jumpBufferMs = 120, jumpCutMultiplier = 0.5, jumpsMax = 2 } = {}) {
    this.scene = scene; this.player = player;
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,R,P,SPACE');
    this.coyoteMs = coyoteMs; this.jumpBufferMs = jumpBufferMs; this.jumpCutMultiplier = jumpCutMultiplier;
    this.lastGroundedAt = 0; this.lastJumpPressedAt = 0;
    this.jumpsMax = jumpsMax; this.jumpsRemaining = jumpsMax;
  }

  update(now) {
    const s = this.scene; const p = this.player;
    const playing = (s.roundMgr?.isActive() ?? true) && s.alive && p.active;
    const onGround = p.body.blocked.down;

    // horizontal
    if (playing) {
      const left = this.cursors.left.isDown || this.keys.A.isDown;
      const right = this.cursors.right.isDown || this.keys.D.isDown;
      if (left) p.setVelocityX(-CONST.PLAYER_SPEED);
      else if (right) p.setVelocityX(CONST.PLAYER_SPEED);
      else p.setVelocityX(0);
    } else {
      p.setVelocityX(0);
    }

  if (onGround) { this.lastGroundedAt = now; this.jumpsRemaining = this.jumpsMax; }

    // jump
    const jumpPressed = playing && (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE));
    if (jumpPressed) this.lastJumpPressedAt = now;

    const canCoyote = (now - this.lastGroundedAt) <= this.coyoteMs;
    const buffered = (now - this.lastJumpPressedAt) <= this.jumpBufferMs;
    let didJump = false;
    if ((jumpPressed || buffered) && (onGround || canCoyote)) {
      // Ground or coyote jump
      p.setVelocityY(-CONST.JUMP_VELOCITY);
      this.jumpsRemaining = Math.max(0, this.jumpsRemaining - 1);
      this.lastJumpPressedAt = -1e9; // consume buffer
      didJump = true;
    } else if (jumpPressed && !onGround && this.jumpsRemaining > 0) {
      // Double jump in air
      p.setVelocityY(-CONST.JUMP_VELOCITY);
      this.jumpsRemaining = Math.max(0, this.jumpsRemaining - 1);
      this.lastJumpPressedAt = -1e9;
      didJump = true;
    }

    if (playing && Phaser.Input.Keyboard.JustDown(this.keys.R)) p.setPosition(200, 760);

    const jumpReleased = playing && (Phaser.Input.Keyboard.JustUp(this.cursors.up) || Phaser.Input.Keyboard.JustUp(this.keys.W) || Phaser.Input.Keyboard.JustUp(this.keys.SPACE));
    if (jumpReleased && p.body.velocity.y < 0) p.setVelocityY(p.body.velocity.y * this.jumpCutMultiplier);
  }
}
