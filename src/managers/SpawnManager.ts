/**
 * Менеджер спавна врагов.
 *
 * Враги появляются за пределами экрана и идут к Соломону. Со временем
 * их становится больше, а характеристики растут.
 */
import { availableEnemies, dueBoss, type BossDef, type EnemyDef } from '../data/enemies';
import { SCALING, SPAWN } from '../config/gameConfig';

export interface SpawnDecision {
  def: EnemyDef;
  x: number;
  y: number;
  hpMultiplier: number;
  speedMultiplier: number;
}

export class SpawnManager {
  /** Таймер до следующей волны, в мс. */
  private timer = 0;
  private readonly spawnedBosses = new Set<string>();

  /** Сколько врагов выпущено за забег (включая убитых). */
  totalSpawned = 0;

  /** Интервал между волнами на текущий момент. */
  intervalFor(elapsedMs: number): number {
    const minutes = elapsedMs / 60000;
    return Math.max(
      SPAWN.intervalMinMs,
      SPAWN.intervalStartMs - minutes * SPAWN.intervalDecreasePerMinuteMs
    );
  }

  /** Множитель HP врагов на текущий момент. */
  hpMultiplierFor(elapsedMs: number): number {
    const minutes = elapsedMs / 60000;
    return Math.min(
      SCALING.hpCapMultiplier,
      1 + minutes * SCALING.hpPerMinute
    );
  }

  /** Множитель скорости врагов на текущий момент. */
  speedMultiplierFor(elapsedMs: number): number {
    const minutes = elapsedMs / 60000;
    return 1 + minutes * SCALING.speedPerMinute;
  }

  /**
   * Следующее решение о спавне.
   *
   * Возвращает null, если пора подождать. Боссы имеют приоритет: если
   * подошло время босса, спавним его вместо обычного врага.
   */
  next(
    elapsedMs: number,
    playerX: number,
    playerY: number,
    activeCount: number,
    dt: number
  ): SpawnDecision | null {
    const boss = dueBoss(elapsedMs, this.spawnedBosses);
    if (boss) {
      this.spawnedBosses.add(boss.id);
      this.totalSpawned += 1;
      return this.decision(boss, playerX, playerY, elapsedMs);
    }

    if (activeCount >= SPAWN.maxEnemies) return null;

    // Таймер идёт в миллисекундах: иначе частота спавна зависела бы
    // от частоты кадров, а не от игрового времени.
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = this.intervalFor(elapsedMs);

    const pool = availableEnemies(elapsedMs);
    if (pool.length === 0) return null;

    const def = this.pickWeighted(pool);
    this.totalSpawned += 1;
    return this.decision(def, playerX, playerY, elapsedMs);
  }

  /** Выбор врага по весу. */
  private pickWeighted(pool: EnemyDef[]): EnemyDef {
    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    for (const e of pool) {
      roll -= e.weight;
      if (roll <= 0) return e;
    }
    return pool[pool.length - 1];
  }

  /** Позиция спавна — случайная точка на кольце за пределами экрана. */
  private decision(
    def: EnemyDef,
    playerX: number,
    playerY: number,
    elapsedMs: number
  ): SpawnDecision {
    const angle = Math.random() * Math.PI * 2;
    const radius = SPAWN.radius + Math.random() * 120;
    return {
      def,
      x: playerX + Math.cos(angle) * radius,
      y: playerY + Math.sin(angle) * radius,
      hpMultiplier: this.hpMultiplierFor(elapsedMs),
      speedMultiplier: this.speedMultiplierFor(elapsedMs),
    };
  }

  /**
   * Спавн конкретного врага в конкретной точке.
   *
   * Используется для боссов (появляются по расписанию, а не по таймеру)
   * и в тестах.
   */
  spawnSpecific(
    def: EnemyDef,
    x: number,
    y: number,
    hpMultiplier = 1,
    speedMultiplier = 1
  ): SpawnDecision {
    this.totalSpawned += 1;
    return { def, x, y, hpMultiplier, speedMultiplier };
  }

  /**
   * Босс, которого пора выпустить — для крупного эффекта появления.
   *
   * Помечает босса как выпущенного, иначе он будет спавниться
   * каждый кадр.
   */
  claimBoss(elapsedMs: number): BossDef | null {
    const boss = dueBoss(elapsedMs, this.spawnedBosses);
    if (boss) this.spawnedBosses.add(boss.id);
    return boss;
  }

  reset(): void {
    this.timer = 0;
    this.totalSpawned = 0;
    this.spawnedBosses.clear();
  }
}
