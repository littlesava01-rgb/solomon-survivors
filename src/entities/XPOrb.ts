/**
 * Зачётка — сферa опыта, которую нужно собрать.
 *
 * Выпадает из убитых врагов, притягивается магнитом, даёт XP.
 */
import Phaser from 'phaser';

export class XPOrb {
  readonly sprite: Phaser.GameObjects.Image;
  value: number;
  alive = true;
  age = 0;

  /** Притягивается ли к игроку. */
  magnetized = false;

  private bobPhase: number;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    this.value = value;
    this.sprite = scene.add.image(x, y, 'xp-orb');
    this.sprite.setDepth(6);
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  /** Двигается к игроку, если притянута. */
  update(dt: number, targetX: number, targetY: number, magnetRange: number): void {
    this.age += dt;

    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (!this.magnetized && dist <= magnetRange) {
      this.magnetized = true;
    }

    if (this.magnetized && dist > 0) {
      // Чем ближе — тем быстрее летит.
      const pull = 220 + (1 - Math.min(dist, 400) / 400) * 520;
      this.sprite.x += (dx / dist) * pull * (dt / 1000);
      this.sprite.y += (dy / dist) * pull * (dt / 1000);
    } else {
      // Лёгкое покачивание, чтобы зачётки было видно на земле.
      this.bobPhase += dt / 300;
      this.sprite.y += Math.sin(this.bobPhase) * 0.15;
    }

    this.sprite.rotation = Math.sin(this.bobPhase * 0.5) * 0.2;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
