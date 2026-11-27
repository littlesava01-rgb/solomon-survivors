/**
 * Главное меню: заголовок, поза Соломона, кнопки.
 *
 * Кнопки используют готовые иконки из src/assets/icons/ (btn-play, btn-rules,
 * btn-sound), поэтому меню выглядит в едином стиле с остальным набором.
 */
import Phaser from 'phaser';
import { PALETTE } from '../config/gameConfig';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(PALETTE.night);

    // Фон-панорама: рисуем растянутым и с прозрачностью, чтобы работала как
    // атмосферная подложка, а не как игровое поле.
    const bg = this.add.image(width / 2, height / 2, 'bg-university');
    bg.setDisplaySize(width, height).setAlpha(0.35);

    this.add
      .text(width / 2, height * 0.22, 'БЕЛКА СОЛОМОН', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        color: PALETTE.accent,
        stroke: PALETTE.shadow,
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.3, 'борется с учёбой', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: PALETTE.cream,
      })
      .setOrigin(0.5);

    const solomon = this.add.image(width / 2, height * 0.5, 'solomon-hello');
    // Масштаб под высоту экрана, чтобы на низких окнах белка не налезала на кнопку.
    solomon.setScale(Math.min(0.5, (height * 0.28) / 340));

    this.tweens.add({
      targets: solomon,
      y: solomon.y - 14,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const play = this.add
      .image(width / 2, height * 0.82, 'btn-play')
      .setScale(0.8)
      .setInteractive({ useHandCursor: true });

    play.on('pointerover', () => play.setScale(0.9));
    play.on('pointerout', () => play.setScale(0.8));
    play.on('pointerdown', () => this.scene.start('Game'));

    this.add
      .text(width / 2, height * 0.9, 'Прототип: геймплей в разработке', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: PALETTE.parchment,
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
  }
}
