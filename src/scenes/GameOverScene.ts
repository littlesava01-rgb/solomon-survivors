/**
 * Экран поражения: разбор забега.
 *
 * Показывает, сколько врагов было убито, какой уровень достигнут и
 * сколько продержался Соломон.
 */
import Phaser from 'phaser';
import { PALETTE } from '../config/gameConfig';

export interface GameOverData {
  kills: number;
  level: number;
  time: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0f172a');

    this.add
      .text(width / 2, height * 0.22, 'ЗАБЕГ ОКОНЧЕН', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '36px',
        color: PALETTE.accent,
        stroke: PALETTE.shadow,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.34,
        'За белкой Соломоном не уследили —\nнужно было сдать сессию.',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: PALETTE.cream,
          align: 'center',
        }
      )
      .setOrigin(0.5);

    const mm = Math.floor(data.time / 60000);
    const ss = Math.floor((data.time % 60000) / 1000);
    this.add
      .text(
        width / 2,
        height * 0.5,
        `Убито: ${data.kills}\n` +
          `Уровень: ${data.level}\n` +
          `Продержался: ${mm}:${ss.toString().padStart(2, '0')}`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          color: PALETTE.parchment,
          align: 'center',
          lineSpacing: 8,
        }
      )
      .setOrigin(0.5);

    const again = this.add
      .image(width / 2, height * 0.72, 'btn-play')
      .setScale(0.8)
      .setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => this.scene.start('Game'));

    this.add
      .text(width / 2, height * 0.86, 'в меню', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: PALETTE.cream,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Menu'));

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));
  }
}
