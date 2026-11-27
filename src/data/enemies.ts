/**
 * Таблица врагов.
 *
 * Числа — баланс. Их можно крутить, не трогая геймплейный код.
 * Поле `sprite` — ключ в реестре спрайтов (src/assets/sprites.ts).
 */

export type EnemyKind = 'swarm' | 'charger' | 'bouncer' | 'tank' | 'shooter' | 'splitter' | 'dropper';

export interface EnemyDef {
  id: string;
  name: string;
  sprite: string;
  kind: EnemyKind;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  /** Вес в случайном спавне — чем больше, тем чаще появляется. */
  weight: number;
  /** Минуты с начала забега, с которых враг появляется. */
  minTime: number;
  /** Радиус коллизии (px). */
  radius: number;
  /** Масштаб спрайта. */
  scale: number;
}

export const ENEMIES: EnemyDef[] = [
  {
    id: 'notebook',
    name: 'Тетрадь',
    sprite: 'enemy-notebook',
    kind: 'swarm',
    hp: 12,
    speed: 70,
    damage: 4,
    xp: 1,
    weight: 100,
    minTime: 0,
    radius: 18,
    scale: 1,
  },
  {
    id: 'chalk',
    name: 'Мел',
    sprite: 'enemy-chalk',
    kind: 'swarm',
    hp: 6,
    speed: 130,
    damage: 3,
    xp: 1,
    weight: 80,
    minTime: 0,
    radius: 12,
    scale: 1,
  },
  {
    id: 'pointer',
    name: 'Указка',
    sprite: 'enemy-pointer',
    kind: 'charger',
    hp: 20,
    speed: 160,
    damage: 7,
    xp: 2,
    weight: 60,
    minTime: 0,
    radius: 16,
    scale: 1,
  },
  {
    id: 'pencil',
    name: 'Карандаш',
    sprite: 'enemy-pencil',
    kind: 'bouncer',
    hp: 18,
    speed: 110,
    damage: 6,
    xp: 2,
    weight: 70,
    minTime: 120000,
    radius: 15,
    scale: 1,
  },
  {
    id: 'ruler',
    name: 'Линейка',
    sprite: 'enemy-ruler',
    kind: 'shooter',
    hp: 30,
    speed: 90,
    damage: 9,
    xp: 3,
    weight: 45,
    minTime: 240000,
    radius: 18,
    scale: 1,
  },
  {
    id: 'eraser',
    name: 'Ластик',
    sprite: 'enemy-eraser',
    kind: 'splitter',
    hp: 35,
    speed: 100,
    damage: 8,
    xp: 3,
    weight: 40,
    minTime: 300000,
    radius: 18,
    scale: 1,
  },
  {
    id: 'textbook',
    name: 'Учебник',
    sprite: 'enemy-textbook',
    kind: 'tank',
    hp: 60,
    speed: 45,
    damage: 16,
    xp: 5,
    weight: 30,
    minTime: 360000,
    radius: 24,
    scale: 1,
  },
  {
    id: 'diary',
    name: 'Дневник',
    sprite: 'enemy-diary',
    kind: 'shooter',
    hp: 45,
    speed: 120,
    damage: 12,
    xp: 5,
    weight: 30,
    minTime: 480000,
    radius: 18,
    scale: 1,
  },
  {
    id: 'ink',
    name: 'Краска',
    sprite: 'enemy-ink',
    kind: 'swarm',
    hp: 40,
    speed: 100,
    damage: 10,
    xp: 4,
    weight: 25,
    minTime: 540000,
    radius: 17,
    scale: 1,
  },
  {
    id: 'backpack',
    name: 'Рюкзак',
    sprite: 'enemy-backpack',
    kind: 'dropper',
    hp: 90,
    speed: 55,
    damage: 18,
    xp: 8,
    weight: 20,
    minTime: 600000,
    radius: 26,
    scale: 1,
  },
];

/**
 * Боссы. Появляются в заданные моменты забега.
 * spawnTimeMs — от начала забега.
 */
export interface BossDef extends EnemyDef {
  spawnTimeMs: number;
  /** Большой ли спрайт — увеличенный масштаб и радиус. */
  isBoss?: boolean;
}

export const BOSSES: BossDef[] = [
  {
    id: 'boss-exam',
    name: 'Контрольная',
    sprite: 'boss-exam',
    kind: 'shooter',
    hp: 160,
    speed: 70,
    damage: 20,
    xp: 40,
    weight: 0,
    minTime: 0,
    radius: 52,
    scale: 1,
    spawnTimeMs: 5 * 60 * 1000,
    isBoss: true,
  },
  {
    id: 'boss-diary',
    name: 'Дневник с двойками',
    sprite: 'boss-diary',
    kind: 'splitter',
    hp: 240,
    speed: 80,
    damage: 22,
    xp: 60,
    weight: 0,
    minTime: 0,
    radius: 60,
    scale: 1,
    spawnTimeMs: 10 * 60 * 1000,
    isBoss: true,
  },
  {
    id: 'boss-diploma',
    name: 'Диплом',
    sprite: 'boss-diploma',
    kind: 'tank',
    hp: 400,
    speed: 60,
    damage: 26,
    xp: 100,
    weight: 0,
    minTime: 0,
    radius: 70,
    scale: 1,
    spawnTimeMs: 13 * 60 * 1000,
    isBoss: true,
  },
];

/** Враги, доступные в момент времени elapsedMs. */
export function availableEnemies(elapsedMs: number): EnemyDef[] {
  return ENEMIES.filter((e) => elapsedMs >= e.minTime);
}

/** Босс, которого пора выпустить (или null). */
export function dueBoss(elapsedMs: number, spawned: Set<string>): BossDef | null {
  for (const boss of BOSSES) {
    if (elapsedMs >= boss.spawnTimeMs && !spawned.has(boss.id)) return boss;
  }
  return null;
}
