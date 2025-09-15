import Phaser from 'phaser';
import { gameConfig } from './game/config.js';
import { PreloadScene } from './game/scenes/PreloadScene.js';
import { NameScene } from './game/scenes/NameScene.js';
import { GameScene } from './game/scenes/GameScene.js';
import { UIScene } from './game/scenes/UIScene.js';

const config = gameConfig({ scenes: [PreloadScene, NameScene, GameScene, UIScene] });
// Expose for debugging
window.__PHASER_GAME__ = new Phaser.Game(config);
