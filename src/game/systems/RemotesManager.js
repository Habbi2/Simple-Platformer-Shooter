import Phaser from 'phaser';
import { Player } from '../entities/Player.js';

export class RemotesManager {
  constructor(scene) {
    this.scene = scene;
    this.map = new Map(); // id -> { sprite,label,hpBar,alive,last,target,vx,vy,name }
  }

  has(id) { return this.map.has(id); }
  get(id) { return this.map.get(id); }
  ids() { return Array.from(this.map.keys()); }
  countAlive() { return Array.from(this.map.values()).filter(r => r.alive).length; }

  addOrUpdatePresence(players) {
    const s = this.scene;
    const ids = new Set(players.map(p => p.id));
    // add new
    players.forEach(p => {
      if (p.id === s.id) return;
      const existing = this.map.get(p.id);
      if (!existing) {
        const spr = new Player(s, p.x || 200, p.y || 760);
        spr.setTint(Phaser.Display.Color.HexStringToColor(p.color || '#60a5fa').color);
        spr.setImmovable(true);
        if (spr.body) { spr.body.allowGravity = false; spr.body.moves = false; }
        const label = s.add.text(spr.x, spr.y - 30, `${p.name || 'guest'} • --ms`, { fontSize: '12px', color: '#cbd5e1' }).setOrigin(0.5).setDepth(10);
        this.map.set(p.id, { sprite: spr, label, name: p.name || 'guest', color: p.color || '#60a5fa', alive: true, last: Date.now(), target: { x: p.x ?? spr.x, y: p.y ?? spr.y }, vx: p.vx || 0, vy: p.vy || 0 });
      } else {
        // Update name/color and any known position hints
        const newName = p.name || 'guest';
        if (existing.name !== newName) {
          existing.name = newName;
          if (existing.label) {
            const spr = existing.sprite;
            const ping = Math.max(0, Math.min(999, Math.round((Date.now()) - (existing.last || Date.now()))));
            existing.label.setText(`${existing.name} • ${ping}ms`);
          }
        }
        const newColor = p.color || '#60a5fa';
        if (existing.color !== newColor) {
          existing.color = newColor;
          existing.sprite?.setTint(Phaser.Display.Color.HexStringToColor(newColor).color);
        }
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          existing.target.x = p.x; existing.target.y = p.y;
        }
      }
    });
    // remove missing
    for (const [id, obj] of this.map) {
      if (!ids.has(id)) { obj.sprite.destroy(); obj.label?.destroy(); obj.hpBar?.destroy(); this.map.delete(id); }
    }
  }

  ensureRemote(id, init = {}) {
    if (this.map.has(id)) return this.map.get(id);
    const s = this.scene;
    const x = init.x ?? 200, y = init.y ?? 760;
    const color = init.color || '#60a5fa';
    const name = init.name || 'guest';
    const spr = new Player(s, x, y);
    spr.setTint(Phaser.Display.Color.HexStringToColor(color).color);
    spr.setImmovable(true);
    if (spr.body) { spr.body.allowGravity = false; spr.body.moves = false; }
    const label = s.add.text(spr.x, spr.y - 30, `${name} • --ms`, { fontSize: '12px', color: '#cbd5e1' }).setOrigin(0.5).setDepth(10);
    const entry = { sprite: spr, label, name, alive: true, last: Date.now(), target: { x, y }, vx: 0, vy: 0 };
    this.map.set(id, entry);
    return entry;
  }

  applyState(msg) {
    const r = this.map.get(msg.id); if (!r) return;
    r.target.x = msg.x; r.target.y = msg.y; r.vx = msg.vx || 0; r.vy = msg.vy || 0; r.last = msg.ts || Date.now();
  }

  markDead(id) {
    const r = this.map.get(id); if (!r || !r.alive) return;
    r.alive = false; r.sprite.setVisible(false); r.label?.setVisible(false); r.hpBar?.destroy(); r.hpBar = null; r.last = Date.now();
  }

  startRound(spawns) {
    const s = this.scene;
    this.map.forEach((r, id) => {
      const sp = spawns[id] || { x: 200, y: 760 };
      r.sprite.setPosition(sp.x, sp.y);
      r.sprite.hp = 100; r.alive = true; r.sprite.setVisible(true); r.label?.setVisible(true);
    });
  }

  update(time) {
    const s = this.scene;
    this.map.forEach((r, rid) => {
      const spr = r.sprite; const t = r.target;
      // prune stale
      if (time - (r.last || 0) > 5000) { spr.destroy(); r.label?.destroy(); r.hpBar?.destroy(); this.map.delete(rid); return; }
      // hp bar
      if (!r.hpBar) r.hpBar = s.add.graphics().setDepth(11);
      r.hpBar.clear(); const hp = Math.max(0, Math.min(100, spr.hp ?? 100));
      if (spr.visible) { const w = 24, h = 3; r.hpBar.fillStyle(0x1f2937, 1); r.hpBar.fillRect(spr.x - w/2, spr.y - 38, w, h); r.hpBar.fillStyle(0x22c55e, 1); r.hpBar.fillRect(spr.x - w/2, spr.y - 38, (w*hp)/100, h); }
      // dead reckoning
      const dt = Math.min(0.15, (time - (r.last || time)) / 1000);
      const predX = (t.x ?? spr.x) + (r.vx || 0) * dt; const predY = (t.y ?? spr.y) + (r.vy || 0) * dt;
      const dx = predX - spr.x; const dy = predY - spr.y; const dist2 = dx*dx + dy*dy;
      if (dist2 > 80*80) spr.setPosition(t.x, t.y); else spr.setPosition(spr.x + dx*0.25, spr.y + dy*0.25);
      if (r.label) { r.label.setPosition(spr.x, spr.y - 30); const ping = Math.max(0, Math.min(999, Math.round(time - (r.last || time)))); r.label.setText(`${r.name} • ${ping}ms`); r.label.setVisible(spr.visible); }
    });
  }
}
