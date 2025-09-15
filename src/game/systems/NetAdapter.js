import { connect } from '../networking.js';
import { throttle } from '../../utils/helpers.js';

export class NetAdapter {
  constructor(scene) {
    this.scene = scene;
    this.net = connect(scene.room, { id: scene.id, name: scene.name, color: scene.color, x: scene.player?.x || 0, y: scene.player?.y || 0 });
    // Expose for existing systems that reference scene.net
    scene.net = this.net;

    this.net.onPresence(players => {
      // Host election: lexicographically smallest id
      const allIds = Array.from(new Set(players.map(p => p.id).concat(scene.id)));
      const minId = allIds.reduce((a, b) => (a < b ? a : b));
      scene.isHost = (minId === scene.id);
      // Forward to remotes manager
      scene.remotesMgr?.addOrUpdatePresence(players);
    });
    this.net.onMessage(msg => scene.onNetMessage?.(msg));

    this._lastState = { x: scene.player?.x || 0, y: scene.player?.y || 0, t: 0 };
    this._sendState = throttle(() => this._doSendState(), 120);
  }

  _doSendState() {
    const s = this.scene; const net = this.net; if (!s?.player || net.offline) return;
    const now = Date.now();
    const dx = s.player.x - this._lastState.x; const dy = s.player.y - this._lastState.y;
    const moved = (dx*dx + dy*dy) > 4;
    if (!moved && now - this._lastState.t < 300) return;
    const aim = s.getAimVector();
    const vx = s.player.body.velocity.x; const vy = s.player.body.velocity.y;
    net.send({ t: 'state', id: s.id, x: s.player.x, y: s.player.y, vx, vy, aim, ts: now });
    net.updatePresence({ x: s.player.x, y: s.player.y, vx, vy });
    this._lastState = { x: s.player.x, y: s.player.y, t: now };
  }

  update() { this._sendState?.(); }

  send(msg) { this.net?.send(msg); }
  disconnect() { try { this.net?.disconnect(); } catch {} }
}
