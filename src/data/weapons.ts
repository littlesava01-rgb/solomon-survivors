/**
 * Таблица оружия и пассивок.
 *
 * У каждого оружия 5 уровней: `levels[i]` — параметры i-го уровня
 * (индекс 0 = уровень 1). Эволюция открывается на 5-м уровне и требует
 * указанной пассивки.
 */

export type WeaponKind = 'projectile' | 'orbit' | 'arc' | 'beam' | 'zone' | 'splash' | 'homing';

export interface WeaponLevel {
  damage: number;
  cooldownMs: number;
  /** Дополнительный урон по уровню (для orbit/zone — за тик). */
  count?: number;
  /** Размер/радиус оружия в px. */
  radius?: number;
  /** Скорость снаряда px/сек. */
  speed?: number;
  /** Сколько врагов пробивает снаряд. */
  pierce?: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  kind: WeaponKind;
  sprite: string;
  /** Урон на попадание. */
  levels: WeaponLevel[];
  /** Апгрейд, превращающий оружие в эволюцию. */
  evolution?: { id: string; name: string; requires: string; description: string };
  /** Редкость в карточках апгрейда: 1 обычная, 2 редкая, 3 легендарная. */
  rarity: 1 | 2 | 3;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: 'pencil',
    name: 'Карандаш',
    description: 'Бросает карандаши в ближайшего врага.',
    kind: 'projectile',
    sprite: 'wpn-pencil',
    rarity: 1,
    levels: [
      { damage: 8, cooldownMs: 900, count: 1, speed: 320, pierce: 0, radius: 8 },
      { damage: 9, cooldownMs: 850, count: 2, speed: 330, pierce: 0, radius: 8 },
      { damage: 11, cooldownMs: 800, count: 2, speed: 340, pierce: 0, radius: 9 },
      { damage: 13, cooldownMs: 750, count: 3, speed: 350, pierce: 0, radius: 9 },
      { damage: 16, cooldownMs: 700, count: 4, speed: 360, pierce: 1, radius: 10 },
    ],
    evolution: {
      id: 'clever',
      name: 'Остроум',
      requires: 'attackSpeed',
      description: 'Град карандашей во все стороны.',
    },
  },
  {
    id: 'eraser',
    name: 'Ластик',
    description: 'Вращается вокруг Соломона и стирает врагов на касание.',
    kind: 'orbit',
    sprite: 'wpn-eraser',
    rarity: 1,
    levels: [
      { damage: 6, cooldownMs: 100, count: 1, radius: 60 },
      { damage: 8, cooldownMs: 100, count: 1, radius: 70 },
      { damage: 10, cooldownMs: 100, count: 2, radius: 75 },
      { damage: 12, cooldownMs: 100, count: 2, radius: 85 },
      { damage: 15, cooldownMs: 100, count: 3, radius: 95 },
    ],
    evolution: {
      id: 'chessboard',
      name: 'Шахматная доска',
      requires: 'speed',
      description: 'Четыре ластика, отталкивают врагов.',
    },
  },
  {
    id: 'pointer',
    name: 'Указка',
    description: 'Бьёт по дуге перед Соломоном.',
    kind: 'arc',
    sprite: 'wpn-pointer',
    rarity: 2,
    levels: [
      { damage: 14, cooldownMs: 1400, radius: 70 },
      { damage: 17, cooldownMs: 1350, radius: 80 },
      { damage: 20, cooldownMs: 1300, radius: 90 },
      { damage: 24, cooldownMs: 1200, radius: 100 },
      { damage: 30, cooldownMs: 1100, radius: 115 },
    ],
    evolution: {
      id: 'pointer-sword',
      name: 'Указка-меч',
      requires: 'damage',
      description: 'Длинный режущий выпад с критическим уроном.',
    },
  },
  {
    id: 'ruler',
    name: 'Линейка',
    description: 'Прямая черта сквозь всех врагов на линии.',
    kind: 'beam',
    sprite: 'wpn-ruler',
    rarity: 2,
    levels: [
      { damage: 20, cooldownMs: 2200, radius: 220 },
      { damage: 24, cooldownMs: 2100, radius: 260 },
      { damage: 28, cooldownMs: 2000, radius: 300 },
      { damage: 34, cooldownMs: 1900, radius: 340 },
      { damage: 42, cooldownMs: 1800, radius: 400 },
    ],
    evolution: {
      id: 'drafting',
      name: 'Чертёжная линейка',
      requires: 'attackSpeed',
      description: 'Две линии крест-накрест, двойной урон.',
    },
  },
  {
    id: 'notebook',
    name: 'Тетрадь',
    description: 'Клякса на земле: урон по времени внутри.',
    kind: 'zone',
    sprite: 'wpn-notebook-zone',
    rarity: 2,
    levels: [
      { damage: 4, cooldownMs: 4000, radius: 60 },
      { damage: 6, cooldownMs: 3800, radius: 70 },
      { damage: 8, cooldownMs: 3600, radius: 80 },
      { damage: 11, cooldownMs: 3400, radius: 90 },
      { damage: 15, cooldownMs: 3000, radius: 110 },
    ],
  },
  {
    id: 'ink',
    name: 'Краска',
    description: 'Навесом: чернильная лужа с уроном по площади.',
    kind: 'splash',
    sprite: 'wpn-ink-splat',
    rarity: 3,
    levels: [
      { damage: 22, cooldownMs: 2800, count: 1, radius: 70 },
      { damage: 26, cooldownMs: 2600, count: 1, radius: 80 },
      { damage: 30, cooldownMs: 2400, count: 2, radius: 85 },
      { damage: 36, cooldownMs: 2200, count: 2, radius: 95 },
      { damage: 44, cooldownMs: 2000, count: 3, radius: 105 },
    ],
  },
  {
    id: 'formula',
    name: 'Формула',
    description: 'Самонаводящиеся снаряды ищут врага сами.',
    kind: 'homing',
    sprite: 'fx-formula',
    rarity: 3,
    levels: [
      { damage: 12, cooldownMs: 1600, count: 1, speed: 260, radius: 12 },
      { damage: 14, cooldownMs: 1500, count: 2, speed: 270, radius: 12 },
      { damage: 17, cooldownMs: 1400, count: 2, speed: 280, radius: 13 },
      { damage: 20, cooldownMs: 1300, count: 3, speed: 290, radius: 13 },
      { damage: 25, cooldownMs: 1200, count: 4, speed: 300, radius: 14 },
    ],
    evolution: {
      id: 'erudition',
      name: 'Эрудиция',
      requires: 'pickup',
      description: 'Формулы бьют по площади и лечат за убийство.',
    },
  },
];

/** Пассивки: мгновенное усиление без отдельного оружия. */
export interface PassiveDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Значение прироста на 1 уровень. */
  value: number;
  levels: number;
  rarity: 1 | 2 | 3;
}

export const PASSIVES: PassiveDef[] = [
  {
    id: 'maxHp',
    name: 'Закалка',
    description: '+20 к максимуму здоровья.',
    icon: 'grade-solomon',
    value: 20,
    levels: 5,
    rarity: 1,
  },
  {
    id: 'damage',
    name: 'Злость',
    description: '+20% ко всему урону.',
    icon: 'ui-warning',
    value: 0.2,
    levels: 5,
    rarity: 2,
  },
  {
    id: 'attackSpeed',
    name: 'Спешка',
    description: '+15% скорости атаки.',
    icon: 'ui-clock',
    value: 0.15,
    levels: 5,
    rarity: 2,
  },
  {
    id: 'speed',
    name: 'Лёгкость',
    description: '+15% скорости передвижения.',
    icon: 'ui-target',
    value: 0.15,
    levels: 5,
    rarity: 1,
  },
  {
    id: 'pickup',
    name: 'Внимание',
    description: '+25% радиуса подбора зачёток.',
    icon: 'ui-mood-graph',
    value: 0.25,
    levels: 5,
    rarity: 1,
  },
  {
    id: 'magnet',
    name: 'Магнит',
    description: '+40% радиуса притяжения зачёток.',
    icon: 'ui-savings-goal',
    value: 0.4,
    levels: 5,
    rarity: 2,
  },
  {
    id: 'armor',
    name: 'Броня',
    description: 'Снижает входящий урон на 1.',
    icon: 'ui-key',
    value: 1,
    levels: 3,
    rarity: 2,
  },
  {
    id: 'regen',
    name: 'Регенерация',
    description: 'Восстанавливает 1 здоровья в секунду.',
    icon: 'ui-credit',
    value: 1,
    levels: 3,
    rarity: 3,
  },
];

/** Максимум оружия и пассивок одновременно. */
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;

/** Стартовое оружие новой игры. */
export const STARTING_WEAPONS = ['pencil'];
