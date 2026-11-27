/**
 * Экран выбора апгрейда (level-up).
 *
 * Запускается поверх игровой сцены: останавливает её и показывает три
 * карточки. Выбор возвращает управление обратно.
 */
import Phaser from 'phaser';
import { PALETTE } from '../config/gameConfig';
import type { UpgradeOption } from '../systems/UpgradeSystem';

export interface LevelUpData {
  options: UpgradeOption[];
  level: number;
  /** Вызывается при выборе карточки. */
  onChoose: (option: UpgradeOption) => void;
}

export class LevelUpScene extends Phaser.Scene {
  private data_!: LevelUpData;

  constructor() {
    super('LevelUp');
  }

  create(data: LevelUpData): void {
    this.data_ = data;
    const { width, height } = this.scale;

    // Затемняем игровую сцену.
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.82)
      .setInteractive();

    this.add
      .text(width / 2, height * 0.16, `Уровень ${data.level}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        color: PALETTE.accent,
        stroke: PALETTE.shadow,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.23, 'Выбери, что взять', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: PALETTE.cream,
      })
      .setOrigin(0.5);

    const cardW = Math.min(220, width / 4);
    const cardH = Math.min(280, height * 0.6);
    const gap = 16;
    const totalW = data.options.length * cardW + (data.options.length - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = height * 0.56;

    data.options.forEach((option, i) => {
      const x = startX + i * (cardW + gap);
      const card = this.add.container(x, cardY);

      const bg = this.add
        .rectangle(0, 0, cardW, cardH, 0x1e293b, 1)
        .setStrokeStyle(3, this.rarityColor(option));
      // Иконку масштабируем под карточку: у спрайтов разный исходный
      // размер (24..128 px), при фиксированном масштабе крупные вылезают
      // за рамку, а мелкие не читаются.
      const iconSrc = this.textures.get(option.icon).getSourceImage() as HTMLImageElement;
      const iconScale = Math.min(
        72 / Math.max(1, iconSrc.width),
        72 / Math.max(1, iconSrc.height)
      );
      const icon = this.add.image(0, -cardH * 0.26, option.icon).setScale(iconScale);
      const title = this.add
        .text(0, cardH * 0.05, option.title, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          color: PALETTE.cream,
          align: 'center',
          wordWrap: { width: cardW - 24 },
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(0, cardH * 0.3, option.description, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: PALETTE.parchment,
          align: 'center',
          wordWrap: { width: cardW - 28 },
        })
        .setOrigin(0.5);

      card.add([bg, icon, title, desc]);
      card.setSize(cardW, cardH);
      card.setInteractive(
        new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Phaser.Geom.Rectangle.Contains
      );

      card.on('pointerover', () => {
        bg.setFillStyle(0x334155, 1);
        this.tweens.add({ targets: card, scale: 1.05, duration: 100 });
      });
      card.on('pointerout', () => {
        bg.setFillStyle(0x1e293b, 1);
        this.tweens.add({ targets: card, scale: 1, duration: 100 });
      });
      card.on('pointerdown', () => this.choose(option));
    });

    // Клавиши 1-3 — выбор без мыши (удобно на ПК).
    this.input.keyboard?.on('keydown-ONE', () => this.choose(data.options[0]));
    this.input.keyboard?.on('keydown-TWO', () => this.choose(data.options[1]));
    this.input.keyboard?.on('keydown-THREE', () => this.choose(data.options[2]));
  }

  private rarityColor(option: UpgradeOption): number {
    switch (option.kind) {
      case 'weapon':
        return 0xf97316;
      case 'weapon-upgrade':
        return 0xfde68a;
      case 'evolution':
        return 0x38bdf8;
      default:
        return 0x0f766e;
    }
  }

  private choose(option: UpgradeOption): void {
    if (!option) return;
    this.data_.onChoose(option);
    this.scene.resume('Game');
    this.scene.stop();
  }
}
