/**
 * Менеджер оружия: решает, когда и куда стрелять.
 *
 * Оружие работает автоматически (как в Vampire Survivors) — игрок только
 * двигается. Каждое оружие хранит свой таймер и уровень.
 */
import { Projectile, type ProjectileKind } from '../entities/Projectile';
import { WEAPONS, type WeaponDef, type WeaponKind } from '../data/weapons';
import type { Enemy } from '../entities/Enemy';
import type { PersistentEffects } from '../systems/PersistentEffects';

export interface WeaponRuntime {
  def: WeaponDef;
  level: number;
  cooldownTimer: number;
  /** Позиция орбитального оружия вокруг игрока. */
  orbitAngle: number;
}

export interface WeaponContext {
  playerX: number;
  playerY: number;
  enemies: Enemy[];
  damageMultiplier: number;
  /** Постоянные эффекты (орбита, зоны) — их держит сцена. */
  effects: PersistentEffects;
  /** Создаёт снаряд. Функция передаётся сценой — там пул объектов. */
  spawnProjectile: (opts: {
    x: number;
    y: number;
    sprite: string;
    kind: ProjectileKind;
    damage: number;
    speed: number;
    radius: number;
    pierce: number;
    lifetime: number;
    dx?: number;
    dy?: number;
    arcHalfAngle?: number;
  }) => Projectile;
}

export class WeaponManager {
  private readonly runtimes = new Map<string, WeaponRuntime>();

  /** Постоянные эффекты: орбита и зоны. Их держит сцена. */
  effects?: PersistentEffects;

  /** Добавляет оружие или повышает его уровень. */
  add(weaponId: string): void {
    const def = WEAPONS.find((w) => w.id === weaponId);
    if (!def) return;

    const existing = this.runtimes.get(weaponId);
    if (existing) {
      existing.level = Math.min(existing.level + 1, def.levels.length);
      return;
    }
    this.runtimes.set(weaponId, {
      def,
      level: 1,
      cooldownTimer: 0,
      orbitAngle: 0,
    });
  }

  /** Уровень оружия (0 — не взято). */
  levelOf(weaponId: string): number {
    return this.runtimes.get(weaponId)?.level ?? 0;
  }

  get all(): WeaponRuntime[] {
    return [...this.runtimes.values()];
  }

  get count(): number {
    return this.runtimes.size;
  }

  reset(): void {
    this.runtimes.clear();
  }

  /** Обновляет таймеры и стреляет. */
  update(dt: number, ctx: WeaponContext): void {
    for (const rt of this.runtimes.values()) {
      // У орбиты и зоны свой таймер — их обрабатывает updateContinuous.
      // Если трогать cooldown здесь, зона не появится никогда:
      // таймер будет перезаписываться каждый кадр.
      if (rt.def.kind === 'orbit' || rt.def.kind === 'zone') continue;

      rt.cooldownTimer -= dt;
      if (rt.cooldownTimer > 0) continue;

      const level = rt.def.levels[rt.level - 1];
      rt.cooldownTimer = level.cooldownMs;

      switch (rt.def.kind as WeaponKind) {
        case 'projectile':
          this.fireProjectile(rt, level, ctx);
          break;
        case 'homing':
          this.fireHoming(rt, level, ctx);
          break;
        case 'arc':
          this.fireArc(rt, level, ctx);
          break;
        case 'beam':
          this.fireBeam(rt, level, ctx);
          break;
        case 'splash':
          this.fireSplash(rt, level, ctx);
          break;
        default:
          break;
      }
    }
  }

  /**
   * Постоянные эффекты (орбита, зона).
   *
   * Орбита: ластики кружат вокруг игрока. Зона: клякса остаётся на
   * земле в точке, где выстрелили, и жжёт врагов, пока живёт.
   */
  updateContinuous(dt: number, ctx: WeaponContext): void {
    const effects = ctx.effects;
    if (!effects) return;

    for (const rt of this.runtimes.values()) {
      const level = rt.def.levels[rt.level - 1];

      if (rt.def.kind === 'orbit') {
        // Синхронизируем число орбитальных предметов с уровнем оружия.
        const count = level.count ?? 1;
        while (effects.orbits.length < count) {
          effects.addOrbit(
            rt.def.sprite,
            ctx.playerX,
            ctx.playerY,
            level.radius ?? 60,
            this.damageOf(rt, ctx),
            22
          );
        }
        while (effects.orbits.length > count) {
          const extra = effects.orbits.pop();
          extra?.sprite.destroy();
        }
        // Обновляем радиус и урон на текущем уровне.
        for (const orbit of effects.orbits) {
          orbit.radius = level.radius ?? 60;
          orbit.damage = this.damageOf(rt, ctx);
        }
      }

      if (rt.def.kind === 'zone') {
        // Зона ставится по таймеру оружия, как обычный выстрел.
        rt.cooldownTimer -= dt;
        if (rt.cooldownTimer <= 0) {
          rt.cooldownTimer = level.cooldownMs;
          const target = this.nearestEnemy(ctx);
          const x = target ? target.x : ctx.playerX;
          const y = target ? target.y : ctx.playerY;
          effects.addZone(
            rt.def.sprite,
            x,
            y,
            level.radius ?? 60,
            this.damageOf(rt, ctx),
            4000
          );
        }
      }
    }
  }

  /** Урон оружия с учётом множителя пассивок. */
  damageOf(rt: WeaponRuntime, ctx: WeaponContext): number {
    return rt.def.levels[rt.level - 1].damage * ctx.damageMultiplier;
  }

  private nearestEnemy(ctx: WeaponContext): Enemy | undefined {
    let best: Enemy | undefined;
    let bestDist = Infinity;
    for (const e of ctx.enemies) {
      if (e.isDead) continue;
      const d = Math.hypot(e.x - ctx.playerX, e.y - ctx.playerY);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private fireProjectile(rt: WeaponRuntime, level: WeaponDef['levels'][number], ctx: WeaponContext): void {
    const target = this.nearestEnemy(ctx);
    const count = level.count ?? 1;
    const baseAngle = target
      ? Math.atan2(target.y - ctx.playerY, target.x - ctx.playerX)
      : 0;

    for (let i = 0; i < count; i++) {
      // Несколько снарядов разлетаются веером.
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.22 : 0;
      const angle = baseAngle + spread;
      ctx.spawnProjectile({
        x: ctx.playerX,
        y: ctx.playerY,
        sprite: rt.def.sprite,
        kind: 'linear',
        damage: this.damageOf(rt, ctx),
        speed: level.speed ?? 320,
        radius: level.radius ?? 8,
        pierce: level.pierce ?? 0,
        // Снаряд должен долететь до дальнего врага: время жизни считаем
        // от расстояния спавна (420 px) с запасом.
        lifetime: 2500,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
      });
    }
  }

  private fireHoming(rt: WeaponRuntime, level: WeaponDef['levels'][number], ctx: WeaponContext): void {
    const count = level.count ?? 1;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      ctx.spawnProjectile({
        x: ctx.playerX,
        y: ctx.playerY,
        sprite: rt.def.sprite,
        kind: 'homing',
        damage: this.damageOf(rt, ctx),
        speed: level.speed ?? 260,
        radius: level.radius ?? 12,
        pierce: 0,
        lifetime: 2600,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
      });
    }
  }

  private fireArc(rt: WeaponRuntime, level: WeaponDef['levels'][number], ctx: WeaponContext): void {
    const target = this.nearestEnemy(ctx);
    const angle = target
      ? Math.atan2(target.y - ctx.playerY, target.x - ctx.playerX)
      : 0;
    ctx.spawnProjectile({
      x: ctx.playerX,
      y: ctx.playerY,
      sprite: rt.def.sprite,
      kind: 'arc',
      damage: this.damageOf(rt, ctx),
      speed: 0,
      radius: level.radius ?? 70,
      pierce: 99,
      lifetime: 260,
      arcHalfAngle: Math.PI / 4,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
    });
  }

  private fireBeam(rt: WeaponRuntime, level: WeaponDef['levels'][number], ctx: WeaponContext): void {
    const target = this.nearestEnemy(ctx);
    const angle = target
      ? Math.atan2(target.y - ctx.playerY, target.x - ctx.playerX)
      : 0;
    ctx.spawnProjectile({
      x: ctx.playerX,
      y: ctx.playerY,
      sprite: rt.def.sprite,
      kind: 'beam',
      damage: this.damageOf(rt, ctx),
      speed: 0,
      radius: level.radius ?? 220,
      pierce: 99,
      lifetime: 320,
      // Луч бьёт узким сектором вдоль своего направления.
      arcHalfAngle: 0.35,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
    });
  }

  private fireSplash(rt: WeaponRuntime, level: WeaponDef['levels'][number], ctx: WeaponContext): void {
    const count = level.count ?? 1;
    const target = this.nearestEnemy(ctx);
    for (let i = 0; i < count; i++) {
      const angle = target
        ? Math.atan2(target.y - ctx.playerY, target.x - ctx.playerX) + (i - count / 2) * 0.5
        : (Math.PI * 2 * i) / count;
      ctx.spawnProjectile({
        x: ctx.playerX,
        y: ctx.playerY,
        sprite: rt.def.sprite,
        kind: 'splash',
        damage: this.damageOf(rt, ctx),
        speed: 260,
        radius: level.radius ?? 70,
        pierce: 0,
        lifetime: 900,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
      });
    }
  }
}
