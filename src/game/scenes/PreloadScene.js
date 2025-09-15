import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create() {
    // Generate textures: player, bullet, platform, arrow (procedural)
    this.makePlayerTexture('player_tex', 18, 26, '#4ade80');
    this.makeBulletTexture('bullet_tex', 6, '#fbbf24');
    this.makePlatformTexture('platform_tex', 64, 16, '#64748b');
    this.makeArrowTexture('arrow_tex');

    // Proceed to name entry scene
    this.scene.start('NameScene');
  }

  makePlayerTexture(key, w, h, color) {
    const g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  makeBulletTexture(key, r, color) {
    const d = r * 2;
    const g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    g.fillCircle(r, r, r);
    g.generateTexture(key, d, d);
    g.destroy();
  }

  makePlatformTexture(key, w, h, color) {
    const g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    g.fillRoundedRect(0, 0, w, h, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Simple arrow: a slim rectangle shaft and a triangular head
  makeArrowTexture(key) {
    const w = 22, h = 6;
    const g = this.add.graphics();
    // shaft
    g.fillStyle(0xfbbf24, 1);
    g.fillRect(0, h/2 - 1, w - 6, 2);
    // head (triangle)
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(w - 6, 0, w, h/2, w - 6, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
