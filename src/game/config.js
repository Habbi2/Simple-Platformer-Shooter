import Phaser from 'phaser';

export function gameConfig({ scenes }) {
  return {
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#0b1021',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
    dom: { createContainer: true },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 1200 },
        debug: false
      }
    },
    render: { pixelArt: true, antialias: false },
    scene: scenes
  };
}
