import { CONST } from '../constants.js';

export class InputManager {
  constructor(scene, { onFire } = {}) {
    this.scene = scene;
    this.onFire = onFire || ((speed, t) => scene.tryShoot(speed, t));
    this.isCharging = false;
    this.chargeStart = 0;
    // UI
    this.chargeBar = scene.add.graphics().setDepth(60).setScrollFactor(0);
    this.chargeBar.setVisible(false);

    // Input listeners
    scene.input.on('pointerdown', () => {
      if (!(scene.roundMgr?.isActive()) || !scene.alive) return;
      this.isCharging = true;
      this.chargeStart = scene.time.now;
      this.chargeBar.setVisible(true);
    });
    scene.input.on('pointerup', () => {
      if (!(scene.roundMgr?.isActive()) || !scene.alive) { this.isCharging = false; return; }
      const chargeMs = Math.min(CONST.ARROW_CHARGE_MS, Math.max(0, scene.time.now - (this.chargeStart || scene.time.now)));
      const t = chargeMs / CONST.ARROW_CHARGE_MS;
      const speed = Phaser.Math.Linear(CONST.ARROW_SPEED_MIN, CONST.ARROW_SPEED_MAX, t);
      this.onFire(speed, t);
      this.isCharging = false;
      this.chargeBar.setVisible(false);
      this.playBowRelease();
    });
  }

  update(time) {
    if (this.isCharging) {
      const ms = Math.min(CONST.ARROW_CHARGE_MS, Math.max(0, this.scene.time.now - (this.chargeStart || this.scene.time.now)));
      const t = ms / CONST.ARROW_CHARGE_MS;
      const p = this.scene.input.activePointer;
      const cx = p.x + 14;
      const cy = p.y + 14;
      const w = 60, h = 4;
      this.chargeBar.clear();
      this.chargeBar.fillStyle(0x0f172a, 0.8);
      this.chargeBar.fillRect(cx - w/2, cy - h/2, w, h);
      this.chargeBar.fillStyle(0x38bdf8, 1);
      this.chargeBar.fillRect(cx - w/2, cy - h/2, w * Phaser.Math.Clamp(t, 0, 1), h);
      this.chargeBar.setVisible(true);
    } else {
      this.chargeBar.clear();
      this.chargeBar.setVisible(false);
    }
  }

  // Minimal synthesized SFX: draw (looped) and release clicks
  playBowDraw() {
    try {
      if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 220;
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.2);
      this._bowDraw = { osc, gain };
    } catch {}
  }
  stopBowDraw() {
    try {
      const h = this._bowDraw; if (!h) return;
      h.gain.gain.exponentialRampToValueAtTime(0.0001, this._audioCtx.currentTime + 0.06);
      setTimeout(() => { try { h.osc.stop(); } catch {} }, 100);
      this._bowDraw = null;
    } catch {}
  }
  playBowRelease() {
    try {
      if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 660;
      gain.gain.value = 0.06;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      setTimeout(() => { try { osc.stop(); } catch {} }, 160);
    } catch {}
  }
}
