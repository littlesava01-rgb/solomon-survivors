/**
 * Враг на арене.
 *
 * Данные и поведение берутся из таблицы src/data/enemies.ts: сам класс
 * отвечает только за движение, урон и смерть.
 */
import Phaser from 'phaser';
import type { EnemyDef } from '../data/enemies';

export interface EnemyState {
  def: EnemyDef;
  sprite: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  /** Множитель урона от игровых пассивок. */
  damageMultiplier: number;
  /** Замедление от луж краски (0..1). */
  slow: number;
  /** Таймер телеграфа перед рывком (charger). */
  chargeTimer: number;
  /** Фаза рывка: >0 — летит вперёд, 0 — отдыхает. */
  chargeActive: number;
  /** Направление рывка. */
  chargeDx: number;
  chargeDy: number;
  /** Таймер между выстрелами (shooter). */
  shootTimer: number;
  /** Уникальный id — для отладки и дедупликации. */
  uid: number;
}

let UID = 1;

export class Enemy {
  readonly state: EnemyState;

  /** Множитель скорости от сложности забега. */
  private readonly speedMultiplier: number;

  constructor(
    scene: Phaser.Scene,
    def: EnemyDef,
    x: number,
    y: number,
    hpMultiplier = 1,
    speedMultiplier = 1
  ) {
    const sprite = scene.add.image(x, y, def.sprite);
    sprite.setScale(def.scale);

    const hp = Math.round(def.hp * hpMultiplier);
    this.speedMultiplier = speedMultiplier;

    this.state = {
      def,
      sprite,
      hp,
      maxHp: hp,
      damageMultiplier: 1,
      slow: 0,
      chargeTimer: 0,
      chargeActive: 0,
      chargeDx: 0,
      chargeDy: 0,
      shootTimer: scene.time.now + 1500 + Math.random() * 1500,
      uid: UID++,
    };
  }

  get x(): number {
    return this.state.sprite.x;
  }

  get y(): number {
    return this.state.sprite.y;
  }

  /** Радиус коллизии — нужен системам эффектов. */
  get radius(): number {
    return this.state.def.radius;
  }

  get isDead(): boolean {
    return this.state.hp <= 0;
  }

  /** Наносит урон. Возвращает true, если враг погиб. */
  takeDamage(amount: number): boolean {
    this.state.hp -= amount;
    return this.state.hp <= 0;
  }

  /** Обновление поведения. Возвращает true, если враг погиб. */
  update(dt: number, targetX: number, targetY: number): boolean {
    const s = this.state;
    const dx = targetX - s.sprite.x;
    const dy = targetY - s.sprite.y;
    const dist = Math.hypot(dx, dy) || 1;

    let speed = s.def.speed * this.speedMultiplier * (1 - s.slow);

    switch (s.def.kind) {
      case 'charger': {
        if (s.chargeActive > 0) {
          // Рывок по прямой — скорость выше, направление зафиксировано.
          s.chargeActive -= dt;
          s.sprite.x += s.chargeDx * speed * 1.8 * (dt / 1000);
          s.sprite.y += s.chargeDy * speed * 1.8 * (dt / 1000);
        } else {
          s.chargeTimer -= dt;
          if (s.chargeTimer <= 0) {
            s.chargeTimer = 1600;
            s.chargeActive = 600;
            s.chargeDx = dx / dist;
            s.chargeDy = dy / dist;
          }
          s.sprite.x += (dx / dist) * speed * (dt / 1000);
          s.sprite.y += (dy / dist) * speed * (dt / 1000);
        }
        break;
      }
      case 'bouncer': {
        // Подпрыгивает: движение рывками, а не плавно.
        s.chargeTimer -= dt;
        if (s.chargeTimer <= 0) {
          s.chargeTimer = 420;
        }
        const bounce = 1 + Math.abs(Math.sin(s.chargeTimer / 120)) * 0.8;
        s.sprite.x += (dx / dist) * speed * bounce * (dt / 1000);
        s.sprite.y += (dy / dist) * speed * bounce * (dt / 1000);
        break;
      }
      case 'shooter': {
        // Держит дистанцию и стреляет.
        const desired = 220;
        const dir = dist > desired ? 1 : -0.4;
        s.sprite.x += (dx / dist) * speed * dir * (dt / 1000);
        s.sprite.y += (dy / dist) * speed * dir * (dt / 1000);
        break;
      }
      default: {
        s.sprite.x += (dx / dist) * speed * (dt / 1000);
        s.sprite.y += (dy / dist) * speed * (dt / 1000);
      }
    }

    // Замедление от луж краски со временем проходит.
    if (s.slow > 0) {
      s.slow = Math.max(0, s.slow - dt / 2000);
    }

    // Спрайт всегда лицом к игроку (спрайты фронтальные, поэтому просто
    // «качает» верх-вниз при движении).
    s.sprite.setScale(
      s.def.scale * (1 + Math.sin(this.state.uid + performance.now() / 200) * 0.02),
      s.def.scale * (1 - Math.sin(this.state.uid + performance.now() / 200) * 0.02)
    );

    return this.isDead;
  }

  destroy(): void {
    this.state.sprite.destroy();
  }
}
