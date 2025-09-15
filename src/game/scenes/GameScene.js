import Phaser from 'phaser';
import { CONST } from '../constants.js';
import { Player } from '../entities/Player.js';
import { seededColorFromId } from '../../utils/helpers.js';
import { RoundManager } from '../systems/RoundManager.js';
import { ProjectileManager } from '../systems/ProjectileManager.js';
import { EventBus } from '../systems/EventBus.js';
import { RemotesManager } from '../systems/RemotesManager.js';
import { InputManager } from '../systems/InputManager.js';
import { PlayerController } from '../systems/PlayerController.js';
import { NetAdapter } from '../systems/NetAdapter.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.room = (data && data.room) || CONST.ROOM_DEFAULT;
    this.name = (data && data.name) || `p${Math.floor(Math.random()*1000)}`;
    this.id = crypto.randomUUID();
    this.color = seededColorFromId(this.id);
  }

  create() {
    // Jump feel helpers
    this.coyoteMs = 100;      // grace period after leaving ground
    this.jumpBufferMs = 120;  // grace period after pressing jump before landing
    this.lastGroundedAt = 0;
    this.lastJumpPressedAt = 0;
    // Combat helpers
    this.respawnDelayMs = 1200; // kept for potential future use
    this.bulletDamage = 25;
    this.roundActive = true; // legacy flag; use roundMgr.isActive() moving forward
    this.alive = true;
    this.round = 1;
    this.lastWinnerName = '';
    // World bounds
    this.physics.world.setBounds(0, 0, CONST.WORLD_WIDTH, CONST.WORLD_HEIGHT);

    // Platforms
    this.platforms = this.physics.add.staticGroup();
    // Initial layout (will be applied via RoundManager)
    const layout = [
      { x: 800, y: 860, w: 1600, h: 40 },
      { x: 300, y: 700, w: 220, h: 16 },
      { x: 700, y: 600, w: 220, h: 16 },
      { x: 1100, y: 500, w: 220, h: 16 },
      { x: 1400, y: 380, w: 220, h: 16 },
      { x: 400, y: 380, w: 260, h: 16 }
    ];
  // Systems
  this.bus = new EventBus();
  this.remotesMgr = new RemotesManager(this);
  this.roundMgr = new RoundManager(this);
  this.roundMgr.applyLayout(layout);

    // Player
    this.player = new Player(this, 200, 760);
    this.player.setTint(Phaser.Display.Color.HexStringToColor(this.color).color);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, CONST.WORLD_WIDTH, CONST.WORLD_HEIGHT);
    // Local name tag
    this.nameTag = this.add.text(this.player.x, this.player.y - 30, this.name, { fontSize: '12px', color: '#cbd5e1' }).setOrigin(0.5).setDepth(10);
    // Local HP bar
    this.hpBar = this.add.graphics().setDepth(11);
    // Center banner for winner + countdown
    this.bannerText = this.add.text(this.cameras.main.width/2, this.cameras.main.height/2, '', { fontSize: '56px', color: '#ffffff' })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(50)
      .setShadow(2, 2, '#000', 4)
      .setVisible(false);

    // Input
  // Movement keys now managed by PlayerController
    // Input system (handles pointer charge/shot + SFX + charge bar)
    this.inputMgr = new InputManager(this, { onFire: (speed, t) => this.tryShoot(speed, t) });
  // Variable jump height tuning
  this.jumpCutMultiplier = 0.5; // reduce upward speed when jump released

  // Projectiles manager (handles arrows, collisions, FX, and hit broadcasts)
  this.projectiles = new ProjectileManager(this);
  // Player controller (movement + jump feel)
  this.controller = new PlayerController(this, this.player, { coyoteMs: 100, jumpBufferMs: 120, jumpCutMultiplier: 0.5 });

    // Collisions
    this.physics.add.collider(this.player, this.platforms);

  // Remote players managed by RemotesManager

    // Networking adapter (encapsulates connect, presence, messages, state throttle)
    this.netAdapter = new NetAdapter(this);
  }

  getAimVector() {
    const p = this.input.activePointer;
    const world = p.positionToCamera(this.cameras.main);
    const dx = world.x - this.player.x;
    const dy = world.y - this.player.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  tryShoot(speedOverride, chargeT = 0) {
    // Delegate to projectile manager
    this.projectiles.fireFromPlayer(speedOverride, chargeT);
  }

  syncPresence(players) { /* legacy path; replaced by remotesMgr.addOrUpdatePresence */ }

  onNetMessage(msg) {
  if (!msg) return;
    // Handle global messages that are not tied to a specific remote first
    if (msg.t === 'round') {
      // Ignore our own broadcast to avoid double-starting the round on host
      if (msg.from && msg.from === this.id) return;
      this.startRound(msg.layout, msg.winnerId, msg.spawns);
      return;
    }
  // 'hit' is handled independent of a specific remote sender id
    if (msg.t === 'hit') {
      // Apply authoritative hit so all clients agree; shooter is the sole broadcaster
      if (!msg.from) return;
      const damage = typeof msg.dmg === 'number' ? msg.dmg : this.bulletDamage;
      // If we had a local pending fallback for this projectile id, consume it
      if (msg.pid) {
        this._consumedHits = this._consumedHits || new Set();
        this._consumedHits.add(msg.pid);
        if (this._pendingHits && this._pendingHits.has(msg.pid)) {
          this._pendingHits.delete(msg.pid);
        }
      }
      if (msg.targetId === this.id) {
        // Apply damage to local player
        this.player.hp = (this.player.hp ?? 100) - damage;
        this.player.setTintFill(0xffffff);
        this.time.delayedCall(60, () => this.player.clearTint());
        if (this.player.hp <= 0 && this.alive) {
          this.alive = false;
          this.player.disableBody(true, true);
          this.nameTag?.setVisible(false);
          if (!this.net.offline) this.net.send({ t: 'dead', id: this.id, ts: Date.now() });
          this.checkRoundEnd();
        }
      } else {
        const rr = this.remotesMgr.get(msg.targetId);
        if (rr) {
          rr.sprite.hp = (rr.sprite.hp ?? 100) - damage;
          if (rr.sprite.hp <= 0 && rr.alive) { this.remotesMgr.markDead(msg.targetId); this.checkRoundEnd(); }
        }
      }
      return;
    }
    // Ignore our own state/shot/dead messages
    if (msg.id === this.id) return;
    let r = this.remotesMgr.get(msg.id);
    if (!r && msg.t === 'state') {
      // Try to use known presence data to avoid 'guest' placeholder
      const known = this.netAdapter?.net?.getPresence?.(msg.id);
      const init = { x: msg.x, y: msg.y };
      if (known) { init.name = known.name; init.color = known.color; }
      else init.name = 'guest';
      r = this.remotesMgr.ensureRemote(msg.id, init);
    }
    if (!r && msg.t !== 'shot') return;
    if (msg.t === 'state') {
      r.target.x = msg.x; r.target.y = msg.y; r.vx = msg.vx || 0; r.vy = msg.vy || 0; r.last = msg.ts || Date.now();
    } else if (msg.t === 'shot') {
      // Spawn remote arrow and set up overlap with local via manager
      this.projectiles.spawnRemoteShot(msg);
    } else if (msg.t === 'dead') {
      if (msg.id && msg.id !== this.id) {
        this.remotesMgr.markDead(msg.id);
        this.checkRoundEnd();
      }
    }
  }

  checkRoundEnd() {
    // Host decides when to start the next round
    if (!this.isHost) return;
    const aliveRemoteIds = this.remotesMgr.ids().filter(id => this.remotesMgr.get(id)?.alive);
    const aliveCount = (this.alive ? 1 : 0) + aliveRemoteIds.length;
    if (!this.roundMgr?.isActive()) return;
    if (aliveCount > 1) return; // keep playing until one remains

    this.roundMgr.setActive(false);
    // Determine winner or draw
    let winnerId = null;
    if (aliveCount === 1) {
      if (this.alive) winnerId = this.id; else winnerId = aliveRemoteIds[0] || null;
    } // if 0 -> draw (winnerId stays null)

    const layout = this.generateRandomLayout();
    // compute spawn positions for all current players deterministically (sorted by id)
  const ids = [this.id, ...this.remotesMgr.ids()].sort();
    const spawnsArr = this.generateSpawnPoints(layout, ids.length);
    const spawns = {};
    ids.forEach((id, i) => { spawns[id] = spawnsArr[i] || { x: 200, y: 760 }; });
    this.net.send({ t: 'round', from: this.id, winnerId, layout, spawns, ts: Date.now() });
    // also start locally in case others are slow
    this.startRound(layout, winnerId, spawns);
  }
  startRound(layout, winnerId, spawns = {}) { this.roundMgr.startRound(layout, winnerId, spawns); }
  applyLayout(layout) { this.roundMgr.applyLayout(layout); }
  generateRandomLayout() { return this.roundMgr.generateRandomLayout(); }
  generateSpawnPoints(layout, count) { return this.roundMgr.generateSpawnPoints(layout, count); }

  update(_, dt) {
    // Movement + jump handled by system
    if (this.controller) this.controller.update(this.time.now);

  // Update projectiles
  if (this.projectiles) this.projectiles.update(this.time.now);

    // Remote players system update (interpolation + labels + hp bars)
    this.remotesMgr.update(this.time.now);

  // Update local label
  if (this.nameTag && this.player.active) this.nameTag.setPosition(this.player.x, this.player.y - 30);
    // Draw local HP bar
    if (this.hpBar) {
      this.hpBar.clear();
      const hp = Math.max(0, Math.min(100, this.player.hp ?? 100));
      const w = 26, h = 4;
      if (this.alive && this.player.visible) {
        this.hpBar.fillStyle(0x1f2937, 1); this.hpBar.fillRect(this.player.x - w/2, this.player.y - 38, w, h);
        this.hpBar.fillStyle(0x22c55e, 1); this.hpBar.fillRect(this.player.x - w/2, this.player.y - 38, (w*hp)/100, h);
      }
    }

  if (this.netAdapter) this.netAdapter.update();

    // Input UI update
    if (this.inputMgr) this.inputMgr.update(this.time.now);
  }

  // Bow SFX moved to InputManager
}
