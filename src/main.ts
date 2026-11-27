/**
 * Точка входа. Собирает конфиг Phaser и стартует игру.
 */
import Phaser from 'phaser';
import { CAMERA, PALETTE } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: PALETTE.night,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  render: {
    powerPreference: 'high-performance',
  },
  // Arcade-физика обязательна: без неё this.physics не существует.
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  input: {
    activePointers: 3,
    keyboard: true,
  },
  scene: [BootScene, MenuScene, GameScene, LevelUpScene, GameOverScene],
};

const game = new Phaser.Game(config);

// Экземпляр игры в window — нужен для отладки и автотестов сцен.
(window as unknown as { __game: Phaser.Game }).__game = game;

// Камера не должна "отъезжать" от игрока на телефоне с узким экраном.
game.scale.on('resize', () => {
  game.registry.set('cameraZoom', CAMERA.zoomMobile);
});
