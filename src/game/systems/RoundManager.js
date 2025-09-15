// RoundManager: handles last-man-standing flow, winner/draw resolution,
// arena layout generation, spawns, and countdown UI.
import { CONST } from '../constants.js';
import { Platform } from '../entities/Platform.js';

export class RoundManager {
  constructor(scene) {
    this.scene = scene;
    this.roundActive = true;
    this.round = 1;
    this.lastWinnerName = '';

    this.bannerText = scene.add.text(scene.cameras.main.width/2, scene.cameras.main.height/2, '', { fontSize: '56px', color: '#ffffff' })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(50)
      .setShadow(2, 2, '#000', 4)
      .setVisible(false);

    this.roundText = scene.add.text(0, 0, '', { fontSize: 24, color: '#fef08a' }).setScrollFactor(0).setDepth(20);
  }

  isActive() { return this.roundActive; }
  setActive(v) { this.roundActive = v; }

  applyLayout(layout) {
    const s = this.scene;
    if (!Array.isArray(layout) || layout.length === 0) return;
    s.platforms.clear(true, true);
    layout.forEach(p => s.platforms.add(new Platform(s, p.x, p.y, p.w, p.h)));
  }

  generateRandomLayout() {
    const w = CONST.WORLD_WIDTH, h = CONST.WORLD_HEIGHT;
    const layout = [];
    layout.push({ x: w/2, y: h - 40, w: w, h: 40 });
    const rows = 4;
    for (let i = 0; i < rows; i++) {
      const y = h - 160 - i*120;
      const count = 2 + Math.floor(Math.random()*2);
      for (let j = 0; j < count; j++) {
        const ww = 180 + Math.floor(Math.random()*140);
        const x = 100 + Math.random()*(w - 200);
        layout.push({ x, y, w: ww, h: 16 });
      }
    }
    return layout;
  }

  generateSpawnPoints(layout, count) {
    const plats = layout.filter(p => p.y < CONST.WORLD_HEIGHT - 80);
    const points = [];
    for (let i = 0; i < count; i++) {
      const p = plats[(i + Math.floor(Math.random()*plats.length)) % Math.max(1, plats.length)] || layout[0];
      const margin = Math.min(60, Math.max(20, p.w * 0.2));
      const rx = p.x - p.w/2 + margin + Math.random() * (p.w - margin*2);
      const ry = p.y - 30;
      points.push({ x: Math.max(20, Math.min(CONST.WORLD_WIDTH-20, rx)), y: Math.max(20, Math.min(CONST.WORLD_HEIGHT-60, ry)) });
    }
    return points;
  }

  startRound(layout, winnerId, spawns) {
    const s = this.scene;
    const show = (text) => { this.bannerText.setText(text).setVisible(true); };
    const hide = () => { this.bannerText.setVisible(false); };

    if (winnerId) {
      const rr = s.remotesMgr?.get(winnerId);
      const who = winnerId === s.id ? 'YOU' : (rr?.name?.toUpperCase() || 'PLAYER');
      show(`${who} WINS`);
      s.time.delayedCall(1000, () => {
        show('3');
        s.time.delayedCall(1000, () => { show('2');
          s.time.delayedCall(1000, () => { show('1');
            s.time.delayedCall(700, () => { show('GO!');
              s.time.delayedCall(500, () => { hide(); this.roundActive = true; });
            });
          });
        });
      });
    } else {
      show('DRAW');
      s.time.delayedCall(800, () => {
        show('3');
        s.time.delayedCall(1000, () => { show('2');
          s.time.delayedCall(1000, () => { show('1');
            s.time.delayedCall(700, () => { show('GO!');
              s.time.delayedCall(500, () => { hide(); this.roundActive = true; });
            });
          });
        });
      });
    }

    this.applyLayout(layout);

    const meSpawn = spawns[s.id] || { x: 200, y: 760 };
    s.player.enableBody(true, meSpawn.x, meSpawn.y, true, true);
    s.player.hp = 100; s.alive = true;
    s.nameTag?.setVisible(true);
    // Reset remote players for the new round
    if (s.remotesMgr) s.remotesMgr.startRound(spawns);

    // Clear any remaining projectiles
    if (s.projectiles?.group) s.projectiles.group.clear(true, true);
    this.roundActive = false; // locked until GO
    this.round = (this.round || 0) + 1;
  }
}
