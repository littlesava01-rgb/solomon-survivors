/**
 * Загрузка ресурсов и подготовка текстур.
 *
 * На этой стапе загружаются только те ассеты, которые уже существуют:
 * 110 иконок, 3 позы Соломона и один фон-панорама для меню.
 * Спрайты врагов и оружия появятся в src/assets/ после генерации
 * (см. docs/АНАЛИЗ-РЕСУРСОВ.md, раздел 4).
 */
import Phaser from 'phaser';
import { ICONS } from '../assets/icons';
import poseWink from '../../Assets/solomon/pose-wink.png';
import poseHello from '../../Assets/solomon/pose-hello.png';
import poseIdle from '../../Assets/solomon/pose-idle.png';
import bgUniversity from '../assets/bg-university.png';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image('solomon-idle', poseIdle);
    this.load.image('solomon-wink', poseWink);
    this.load.image('solomon-hello', poseHello);
    this.load.image('bg-university', bgUniversity);

    for (const [name, url] of Object.entries(ICONS)) {
      this.load.image(name, url);
    }
  }

  create(): void {
    // Гасим HTML-экран загрузки, когда Phaser уже готов показать сцену.
    const boot = document.getElementById('boot');
    if (boot) {
      boot.classList.add('hidden');
      window.setTimeout(() => boot.remove(), 400);
    }

    this.scene.start('Menu');
  }
}
