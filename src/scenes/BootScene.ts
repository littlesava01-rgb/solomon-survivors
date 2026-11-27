/**
 * Загрузка ресурсов и подготовка текстур.
 *
 * Грузим: 110 иконок интерфейса, 3 позы Соломона, спрайты врагов/оружия
 * (art/sprites/) и один фон-панорама для меню.
 */
import Phaser from 'phaser';
import { ICONS } from '../assets/icons';
import { SPRITES } from '../assets/sprites';
import poseWink from '../../Assets/solomon/pose-wink.png';
import poseHello from '../../Assets/solomon/pose-hello.png';
import poseIdle from '../../Assets/solomon/pose-idle.png';
import bgUniversity from '../assets/bg-university.webp';

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
    for (const [name, url] of Object.entries(SPRITES)) {
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
