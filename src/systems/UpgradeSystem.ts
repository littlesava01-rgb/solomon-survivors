/**
 * Система уровней и апгрейдов.
 *
 * Как в Vampire Survivors: за опыт игрок растёт в уровне, и каждый раз
 * выбирает одну из трёх карточек — новое оружие, прокачка оружия или
 * пассивка.
 */
import { MAX_WEAPONS, PASSIVES, WEAPONS } from '../data/weapons';
import type { WeaponManager } from '../managers/WeaponManager';

export type UpgradeKind = 'weapon' | 'weapon-upgrade' | 'passive' | 'evolution';

export interface UpgradeOption {
  kind: UpgradeKind;
  id: string;
  title: string;
  description: string;
  /** Иконка: спрайт оружия или иконка из набора 110 иконок. */
  icon: string;
  /** Ссылка на оружие, если это его улучшение. */
  weaponId?: string;
  /** Ссылка на пассивку. */
  passiveId?: string;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  damageMultiplier: number;
  attackSpeedMultiplier: number;
  speedMultiplier: number;
  pickupMultiplier: number;
  magnetMultiplier: number;
  armor: number;
  regenPerSecond: number;
}

/** Текущие уровни пассивок. */
export type PassiveLevels = Record<string, number>;

export class UpgradeSystem {
  xp = 0;
  level = 1;

  /** Уровни пассивок по id. */
  passives: PassiveLevels = {};

  /** Уровни оружия (дублируем для удобства отображения). */
  weaponLevels: Record<string, number> = {};

  constructor(private readonly weapons: WeaponManager) {}

  /** Сколько опыта нужно на следующий уровень. */
  xpForNextLevel(): number {
    return Math.floor(10 * Math.pow(this.level, 1.4));
  }

  /** Текущий прогресс уровня (0..1). */
  levelProgress(): number {
    const need = this.xpForNextLevel();
    if (need <= 0) return 0;
    return Math.min(1, this.xp / need);
  }

  /**
   * Добавляет опыт. Возвращает true, если уровень повысился
   * (тогда нужно показать карточки).
   */
  addXp(amount: number): boolean {
    this.xp += amount;
    let leveled = false;
    // За один раз может подняться несколько уровней (крупный босс).
    while (this.xp >= this.xpForNextLevel()) {
      this.xp -= this.xpForNextLevel();
      this.level += 1;
      leveled = true;
    }
    return leveled;
  }

  /** Три случайных варианта апгрейда. */
  rollOptions(count = 3): UpgradeOption[] {
    const options: UpgradeOption[] = [];

    // 1. Новое оружие, если есть место и ещё не взято.
    const ownedWeapons = new Set(Object.keys(this.weaponLevels));
    const newWeapons = WEAPONS.filter(
      (w) => !ownedWeapons.has(w.id) && this.weapons.count < MAX_WEAPONS
    );
    if (newWeapons.length > 0) {
      const w = this.pickWeighted(newWeapons);
      options.push({
        kind: 'weapon',
        id: `weapon-${w.id}`,
        title: w.name,
        description: w.description,
        icon: w.sprite,
        weaponId: w.id,
      });
    }

    // 2. Прокачка уже взятого оружия.
    const upgradable = WEAPONS.filter((w) => {
      const lvl = this.weaponLevels[w.id] ?? 0;
      return lvl > 0 && lvl < w.levels.length;
    });
    if (upgradable.length > 0) {
      const w = this.pickWeighted(upgradable);
      const nextLevel = (this.weaponLevels[w.id] ?? 0) + 1;
      options.push({
        kind: 'weapon-upgrade',
        id: `upgrade-${w.id}`,
        title: `${w.name} ${nextLevel}`,
        description: this.upgradeDescription(w.id, nextLevel),
        icon: w.sprite,
        weaponId: w.id,
      });
    }

    // 3. Пассивка.
    const availablePassives = PASSIVES.filter((p) => {
      const lvl = this.passives[p.id] ?? 0;
      return lvl < p.levels;
    });
    if (availablePassives.length > 0) {
      const p = this.pickWeighted(availablePassives);
      options.push({
        kind: 'passive',
        id: `passive-${p.id}`,
        title: `${p.name} ${(this.passives[p.id] ?? 0) + 1}`,
        description: p.description,
        icon: p.icon,
        passiveId: p.id,
      });
    }

    // Добиваем до нужного количества повторениями (их нельзя выбрать,
    // но картошек должно быть ровно три).
    while (options.length < count && options.length > 0) {
      options.push(options[options.length % 3]);
    }
    return options.slice(0, count);
  }

  /** Применяет выбранный апгрейд. */
  apply(option: UpgradeOption): void {
    switch (option.kind) {
      case 'weapon': {
        if (option.weaponId) {
          this.weapons.add(option.weaponId);
          this.weaponLevels[option.weaponId] =
            (this.weaponLevels[option.weaponId] ?? 0) + 1;
        }
        break;
      }
      case 'weapon-upgrade': {
        if (option.weaponId) {
          this.weapons.add(option.weaponId);
          this.weaponLevels[option.weaponId] =
            (this.weaponLevels[option.weaponId] ?? 0) + 1;
        }
        break;
      }
      case 'passive': {
        if (option.passiveId) {
          this.passives[option.passiveId] =
            (this.passives[option.passiveId] ?? 0) + 1;
        }
        break;
      }
      case 'evolution':
        break;
    }
  }

  /** Текущие характеристики игрока с учётом пассивок. */
  stats(base: { maxHp: number; speed: number; pickupRange: number; magnetRange: number }): PlayerStats {
    const s: PlayerStats = {
      maxHp: base.maxHp,
      hp: base.maxHp,
      damageMultiplier: 1,
      attackSpeedMultiplier: 1,
      speedMultiplier: 1,
      pickupMultiplier: 1,
      magnetMultiplier: 1,
      armor: 0,
      regenPerSecond: 0,
    };

    for (const [id, level] of Object.entries(this.passives)) {
      const def = PASSIVES.find((p) => p.id === id);
      if (!def) continue;
      switch (id) {
        case 'maxHp':
          s.maxHp += def.value * level;
          break;
        case 'damage':
          s.damageMultiplier += def.value * level;
          break;
        case 'attackSpeed':
          s.attackSpeedMultiplier += def.value * level;
          break;
        case 'speed':
          s.speedMultiplier += def.value * level;
          break;
        case 'pickup':
          s.pickupMultiplier += def.value * level;
          break;
        case 'magnet':
          s.magnetMultiplier += def.value * level;
          break;
        case 'armor':
          s.armor += def.value * level;
          break;
        case 'regen':
          s.regenPerSecond += def.value * level;
          break;
      }
    }
    return s;
  }

  private pickWeighted<T extends { rarity: number }>(pool: T[]): T {
    const total = pool.reduce((sum, e) => sum + e.rarity, 0);
    let roll = Math.random() * total;
    for (const e of pool) {
      roll -= e.rarity;
      if (roll <= 0) return e;
    }
    return pool[pool.length - 1];
  }

  private upgradeDescription(weaponId: string, nextLevel: number): string {
    const def = WEAPONS.find((w) => w.id === weaponId);
    if (!def) return '';
    const level = def.levels[nextLevel - 1];
    const parts: string[] = [];
    if (level.count && level.count > 1) parts.push(`${level.count} снаряда`);
    parts.push(`урон ${level.damage}`);
    if (level.pierce) parts.push('пробитие');
    if (level.radius) parts.push(`радиус ${level.radius}`);
    return parts.join(', ');
  }

  reset(): void {
    this.xp = 0;
    this.level = 1;
    this.passives = {};
    this.weaponLevels = {};
  }
}
