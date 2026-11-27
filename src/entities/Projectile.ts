/**
 * Снаряд оружия.
 *
 * Универсальный: тип поведения задаёт WeaponDef.kind, параметры — уровнем
 * оружия. Так один класс покрывает все семь видов оружия.
 */
import Phaser from 'phaser';

export type ProjectileKind = 'linear' | 'homing' | 'orbit' | 'arc' | 'beam' | 'zone' | 'splash';

export interface ProjectileOptions {
  x: number;
  y: number;
  sprite: string;
  kind: ProjectileKind;
  damage: number;
  speed: number;
  radius: number;
  pierce: number;
  /** Время жизни в мс. */
  lifetime: number;
  /** Направление для линейных снарядов. */
  dx?: number;
  dy?: number;
  /** Цвет вспышки при попадании. */
  tint?: number;
  /** Для дуги и луча: полураствор сектора в радианах. */
  arcHalfAngle?: number;
}

export class Projectile {
  readonly sprite: Phaser.GameObjects.Image;
  readonly kind: ProjectileKind;
  readonly damage: number;
  readonly speed: number;
  readonly radius: number;
  readonly tint?: number;

  /** Осталось пробитий (0 = исчезает после первого попадания). */
  pierce: number;

  /** Список врагов, которых снаряд уже задел (для pierce). */
  hitSprites: Phaser.GameObjects.Image[] = [];

  alive = true;
  age = 0;

  /** Время жизни в мс. */
  readonly lifetime: number;

  /** Цель для самонаводящихся снарядов. */
  target?: Phaser.GameObjects.Image;

  /** Урон за тик (orbit/zone). */
  tickDamage = 0;
  /** Таймер между тиками. */
  tickTimer = 0;

  private dx: number;
  private dy: number;

  /** Полураствор сектора для дуги и луча (undefined — круговой урон). */
  readonly arcHalfAngle?: number;

  constructor(scene: Phaser.Scene, opts: ProjectileOptions) {
    this.kind = opts.kind;
    this.damage = opts.damage;
    this.speed = opts.speed;
    this.radius = opts.radius;
    this.pierce = opts.pierce;
    this.tint = opts.tint;
    this.arcHalfAngle = opts.arcHalfAngle;

    this.sprite = scene.add.image(opts.x, opts.y, opts.sprite);
    this.sprite.setDepth(8);

    const len = Math.hypot(opts.dx ?? 1, opts.dy ?? 0) || 1;
    this.dx = (opts.dx ?? 1) / len;
    this.dy = (opts.dy ?? 0) / len;

    this.lifetime = opts.lifetime;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  /** Уже истекло время жизни. */
  get expired(): boolean {
    return this.age >= this.lifetime;
  }

  update(dt: number): void {
    this.age += dt;
    if (this.kind === 'linear' || this.kind === 'splash') {
      this.sprite.x += this.dx * this.speed * (dt / 1000);
      this.sprite.y += this.dy * this.speed * (dt / 1000);
    }
    this.sprite.rotation += (dt / 1000) * 4;
  }

  /** Скорость самонаведения к цели. */
  steer(targetX: number, targetY: number, turnRate: number): void {
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    this.dx += (nx - this.dx) * turnRate;
    this.dy += (ny - this.dy) * turnRate;
    const nlen = Math.hypot(this.dx, this.dy) || 1;
    this.dx /= nlen;
    this.dy /= nlen;
  }

  /**
   * Попадает ли точка (targetX, targetY) в зону поражения.
   *
   * Для дуги и луча это сектор: угол до цели должен попадать в
   * arcHalfAngle от направления снаряда. Для остальных — обычный круг.
   */
  hits(targetX: number, targetY: number, extraRadius = 0): boolean {
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.radius + extraRadius) return false;

    if (this.arcHalfAngle !== undefined) {
      if (dist < 1) return true;
      const angle = Math.atan2(dy, dx);
      const dir = Math.atan2(this.dy, this.dx);
      let diff = Math.abs(angle - dir) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      return diff <= this.arcHalfAngle;
    }
    return true;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
