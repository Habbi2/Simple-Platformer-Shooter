import Phaser from 'phaser';
import { CONST } from '../constants.js';
import { Arrow } from '../entities/Arrow.js';

export class ProjectileManager {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.add.group();
    // Particles
    this.emitterImpact = scene.add.particles(0, 0, 'arrow_tex', {
      speed: { min: 120, max: 220 }, angle: { min: 0, max: 360 }, lifespan: 220,
      scale: { start: 0.6, end: 0 }, blendMode: 'ADD'
    });
    this.emitterMuzzle = scene.add.particles(0, 0, 'arrow_tex', {
      speed: { min: 40, max: 100 }, lifespan: 100,
      scale: { start: 0.8, end: 0 }, blendMode: 'ADD'
    });

    // Collide with platforms -> stick
    scene.physics.add.collider(this.group, scene.platforms, (b) => this.onHitWorld(b));
  }

  update(time) {
    this.group.children.iterate(b => b && b.update && b.update(time));
  }

  fireFromPlayer(speed, chargeT) {
    const s = this.scene;
    if (!s.roundMgr?.isActive() || !s.alive) return;
    const now = s.time.now;
    if (now < (s.player.fireCooldown || 0)) return;
    s.player.fireCooldown = now + CONST.FIRE_COOLDOWN_MS;

    const aim = s.getAimVector();
  const b = new Arrow(s, s.player.x, s.player.y);
  // Generate a projectile id to correlate shot and hit
  const pid = `${s.id}:${Date.now()}:${Math.floor(Math.random()*1e6)}`;
  b.pid = pid;
    b.ownerId = s.id;
    this.group.add(b);
    b.fire(s.player.x, s.player.y, aim.x, aim.y, speed);

    // Damage scaled by charge
    const dmg = Phaser.Math.Linear(CONST.ARROW_DAMAGE_MIN, CONST.ARROW_DAMAGE_MAX, Phaser.Math.Clamp(chargeT || 0, 0, 1));
    if (b.setDamage) b.setDamage(dmg);

    // FX
    this.emitterMuzzle.emitParticleAt(s.player.x + aim.x * 12, s.player.y + aim.y * 12, 6);
    s.cameras.main.shake(50, 0.0015);

    // Overlaps with remote players (visual-only avatars)
    if (s.remotesMgr?.map) {
      s.remotesMgr.map.forEach((r, rid) => {
        s.physics.add.overlap(b, r.sprite, () => this.onHitRemote(b, r, rid));
      });
    }

    // Network
    if (!s.net.offline) {
      s.net.send({ t: 'shot', id: s.id, name: s.name, color: s.color, pid, x: s.player.x, y: s.player.y, dx: aim.x, dy: aim.y, spd: speed, dmg, ts: Date.now() });
    }
  }

  spawnRemoteShot(msg) {
    const s = this.scene;
    // Ensure we have a remote avatar for the shooter (in case presence is late)
    s.remotesMgr?.ensureRemote(msg.id, { x: msg.x, y: msg.y, name: msg.name, color: msg.color });
    const b = new Arrow(s, msg.x, msg.y);
    b.ownerId = msg.id;
    if (msg.pid) b.pid = msg.pid;
    if (b.setDamage && typeof msg.dmg === 'number') b.setDamage(msg.dmg);
    this.group.add(b);
    b.fire(msg.x, msg.y, msg.dx, msg.dy, msg.spd);
    // overlap with local player
    s.physics.add.overlap(b, s.player, () => this.onHitLocal(b));
  }

  onHitWorld(b) {
    if (!b || !b.active || b._consumed) return;
    b._consumed = true;
    this.emitterImpact.emitParticleAt(b.x, b.y, 8);
    if (b.stickAt && !b._stuck) b.stickAt(b.x, b.y);
    else b.destroy();
  }

  onHitRemote(b, r, rid) {
    if (!b || !b.active || !r?.alive || b._consumed) return;
    b._consumed = true;
    const s = this.scene;
    this.emitterImpact.emitParticleAt(b.x, b.y, 10);
    s.cameras.main.shake(60, 0.002);
    // knockback visual
    const vx = b.body.velocity.x; const vy = b.body.velocity.y; const len = Math.hypot(vx, vy) || 1;
    const k = 18; r.sprite.setPosition(r.sprite.x + (vx/len)*k, r.sprite.y + (vy/len)*k);
    if (r.target) { r.target.x = r.sprite.x; r.target.y = r.sprite.y; }

  const damage = b?.damage ?? s.bulletDamage;
  // Update local visual hp for the remote, but authoritative update is via 'hit' message broadcast
  r.sprite.hp = (r.sprite.hp ?? 100) - damage;
  if (!s.net.offline) s.net.send({ t: 'hit', from: s.id, pid: b.pid, targetId: rid, dmg: damage, ts: Date.now() });

    if (r.sprite.hp <= 0 && r.alive) {
      r.alive = false; r.sprite.setVisible(false); r.label?.setVisible(false); r.hpBar?.destroy(); r.hpBar = null;
      s.checkRoundEnd();
    }

    if (b.stickAt && !b._stuck) b.stickAt(b.x, b.y); else b.destroy();
  }

  onHitLocal(b) {
    if (!b || !b.active || b._consumed) return;
    b._consumed = true;
    const s = this.scene;
    this.emitterImpact.emitParticleAt(b.x, b.y, 12);
    s.cameras.main.shake(70, 0.003);
    const vx = b.body.velocity.x; const vy = b.body.velocity.y; const len = Math.hypot(vx, vy) || 1;
    const k = 120; s.player.setVelocity(s.player.body.velocity.x + (vx/len)*k, s.player.body.velocity.y + (vy/len)*k);
    // Victim side: do NOT mutate HP or send 'hit' immediately; schedule a fallback in case 'hit' is dropped.
    const damage = b?.damage ?? s.bulletDamage;
    if (b.pid) {
      if (!s._pendingHits) s._pendingHits = new Map();
      s._pendingHits.set(b.pid, { dmg: damage, at: s.time.now });
      s.time.delayedCall(180, () => {
        if (s._consumedHits?.has(b.pid)) return; // already confirmed via network
        const pending = s._pendingHits?.get(b.pid);
        if (!pending) return;
        // Apply fallback damage
        s._pendingHits.delete(b.pid);
        s._consumedHits = s._consumedHits || new Set();
        s._consumedHits.add(b.pid);
        s.player.hp = (s.player.hp ?? 100) - pending.dmg;
        s.player.setTintFill(0xffffff); s.time.delayedCall(60, () => s.player.clearTint());
        if (s.player.hp <= 0 && s.alive) {
          s.alive = false; s.player.disableBody(true, true); s.nameTag?.setVisible(false);
          if (!s.net.offline) s.net.send({ t: 'dead', id: s.id, ts: Date.now() });
          s.checkRoundEnd();
        }
      });
    }
    s.player.setTintFill(0xffffff); s.time.delayedCall(60, () => s.player.clearTint());

    if (b.stickAt && !b._stuck) b.stickAt(b.x, b.y); else b.destroy();
  }
}
