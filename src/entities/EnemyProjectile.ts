/**
 * Снаряд врага.
 *
 * Отличается от снаряда игрока тем, что летит по прямой к игроку и
 * наносит урон при попадании. Отрисовывается тем же спрайтом страницы.
 */
import Phaser from 'phaser';

export class EnemyProjectile {
  readonly sprite: Phaser.GameObjects.Image;
  readonly damage: number;
  readonly radius: number;

  alive = true;
  age = 0;

  private dx: number;
  private dy: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sprite: string,
    dx: number,
    dy: number,
    damage: number,
    speed = 180
  ) {
    this.sprite = scene.add.image(x, y, sprite).setDepth(9);
    this.damage = damage;
    this.radius = 12;

    const len = Math.hypot(dx, dy) || 1;
    this.dx = (dx / len) * speed;
    this.dy = (dy / len) * speed;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  update(dt: number): void {
    this.age += dt;
    this.sprite.x += this.dx * (dt / 1000);
    this.sprite.y += this.dy * (dt / 1000);
    this.sprite.rotation += (dt / 1000) * 5;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
