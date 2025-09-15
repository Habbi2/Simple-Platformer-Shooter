import Phaser from 'phaser';
import { CONST } from '../constants.js';

export class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  create() {
    this.gameScene = this.scene.get('GameScene');

    // Simple DOM-style UI using Phaser text
    this.nameText = this.add.text(10, 8, `Name: ${this.gameScene.name}`, { fontSize: 14, color: '#fff' }).setScrollFactor(0).setDepth(10);
    this.roomText = this.add.text(10, 26, `Room: ${this.gameScene.room}`, { fontSize: 14, color: '#9efcff' }).setScrollFactor(0).setDepth(10);
    this.hpText = this.add.text(10, 44, `HP: 100`, { fontSize: 14, color: '#a7f3d0' }).setScrollFactor(0).setDepth(10);
    this.connText = this.add.text(10, 62, `Players: 1`, { fontSize: 14, color: '#fde68a' }).setScrollFactor(0).setDepth(10);
    this.roundText = this.add.text(10, 80, `Round: 1`, { fontSize: 14, color: '#fef08a' }).setScrollFactor(0).setDepth(10);
    this.winnerText = this.add.text(10, 98, `Last winner: -`, { fontSize: 14, color: '#fca5a5' }).setScrollFactor(0).setDepth(10);

    // Update loop for UI
    this.time.addEvent({ delay: 200, loop: true, callback: () => this.refresh() });
  }

  refresh() {
    const gs = this.gameScene;
    if (!gs || !gs.player) return;
    this.hpText.setText(`HP: ${gs.player.hp}`);
  this.connText.setText(`Players: ${1 + (gs?.remotesMgr?.ids()?.length || 0)}`);
    this.roundText.setText(`Round: ${gs.round || 1}`);
    this.winnerText.setText(`Last winner: ${gs.lastWinnerName || '-'}`);
  }
}
