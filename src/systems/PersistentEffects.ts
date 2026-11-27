/**
 * Постоянные эффекты оружия: орбита и зоны на земле.
 *
 * У этих видов оружия нет «снаряда» — они живут на арене постоянно:
 * ластик кружит вокруг Соломона, клякса и лужа краски лежат на земле
 * и жгут тех, кто туда зашёл.
 */
import Phaser from 'phaser';

/** Ластик на орбите вокруг игрока. */
export interface OrbitItem {
  sprite: Phaser.GameObjects.Image;
  angle: number;
  radius: number;
  damage: number;
  /** Внутренний радиус, куда врагов не задевает (свой хвост). */
  hitRadius: number;
}

/** Зона урона на земле. */
export interface GroundZone {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  radius: number;
  damage: number;
  /** Осталось времени жизни, мс. */
  life: number;
  /** Урон наносится каждые tickMs. */
  tickMs: number;
  tickTimer: number;
}

/** Минимальные данные о враге, нужные эффектам. */
export interface EffectTarget {
  x: number;
  y: number;
  radius: number;
  isDead: boolean;
}

export class PersistentEffects {
  readonly orbits: OrbitItem[] = [];
  readonly zones: GroundZone[] = [];

  private orbitAngle = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Добавляет орбитальный предмет (ластик). */
  addOrbit(
    spriteKey: string,
    x: number,
    y: number,
    radius: number,
    damage: number,
    hitRadius: number
  ): void {
    const sprite = this.scene.add.image(x, y, spriteKey).setDepth(7);
    this.orbits.push({
      sprite,
      angle: this.orbitAngle,
      radius,
      damage,
      hitRadius,
    });
    this.orbitAngle += (Math.PI * 2) / Math.max(1, this.orbits.length);
  }

  /** Добавляет зону на земле (клякса, лужа краски). */
  addZone(
    spriteKey: string,
    x: number,
    y: number,
    radius: number,
    damage: number,
    lifeMs: number,
    tickMs = 250
  ): void {
    const sprite = this.scene.add.image(x, y, spriteKey).setDepth(4).setAlpha(0.75);
    sprite.setDisplaySize(radius * 2, radius * 2);
    this.zones.push({
      sprite,
      x,
      y,
      radius,
      damage,
      life: lifeMs,
      tickMs,
      tickTimer: tickMs,
    });
  }

  /** Убирает все эффекты (перезапуск забега). */
  clear(): void {
    for (const o of this.orbits) o.sprite.destroy();
    for (const z of this.zones) z.sprite.destroy();
    this.orbits.length = 0;
    this.zones.length = 0;
  }

  /**
   * Обновляет эффекты.
   *
   * Возвращает список попаданий, которые нужно применить в сцене
   * (попаданий по орбите и зонам).
   */
  update(
    dt: number,
    playerX: number,
    playerY: number,
    enemies: EffectTarget[]
  ): { enemyIndex: number; damage: number }[] {
    const hits: { enemyIndex: number; damage: number }[] = [];

    // Орбита вращается вокруг игрока.
    for (const orbit of this.orbits) {
      orbit.angle += (dt / 1000) * 2.2;
      const ox = playerX + Math.cos(orbit.angle) * orbit.radius;
      const oy = playerY + Math.sin(orbit.angle) * orbit.radius;
      orbit.sprite.setPosition(ox, oy);
      orbit.sprite.rotation += (dt / 1000) * 6;

      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.isDead) continue;
        const d = Math.hypot(e.x - ox, e.y - oy);
        if (d <= orbit.hitRadius + e.radius) {
          hits.push({ enemyIndex: i, damage: orbit.damage });
        }
      }
    }

    // Зоны живут своё время и тикают уроном.
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      zone.life -= dt;
      zone.tickTimer -= dt;

      if (zone.life <= 0) {
        zone.sprite.destroy();
        this.zones.splice(i, 1);
        continue;
      }

      if (zone.tickTimer <= 0) {
        zone.tickTimer = zone.tickMs;
        for (let e = 0; e < enemies.length; e++) {
          const en = enemies[e];
          if (en.isDead) continue;
          const d = Math.hypot(en.x - zone.x, en.y - zone.y);
          if (d <= zone.radius + en.radius) {
            hits.push({ enemyIndex: e, damage: zone.damage });
          }
        }
      }
    }

    return hits;
  }
}
