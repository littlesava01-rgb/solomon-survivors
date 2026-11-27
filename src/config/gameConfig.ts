/**
 * Глобальная конфигурация игры «Белка Соломон».
 *
 * Все числовые настройки баланса живут здесь и в src/data/*.ts, чтобы их
 * можно было крутить, не трогая геймплейный код.
 */

/** Размер игрового мира (px). Арена — единая, без скроллинга по карте. */
export const WORLD = {
  width: 4000,
  height: 4000,
  tileSize: 64,
} as const;

/** Параметры Соломона. */
export const PLAYER = {
  speed: 150, // px/сек
  // 20 HP: ранние враги бьют по 3-5, поэтому терпеть можно четыре
  // попадания подряд, а не два. С 10 HP игрок умирал за две секунды
  // от толпы тетрадей.
  maxHp: 20,
  pickupRange: 60,
  magnetRange: 80,
  // Неуязвимость после удара: без неё касание врага наносит урон
  // каждый кадр.
  invincibilityMs: 800,
  spriteScale: 0.22, // 300x340 -> ~66x76
} as const;

/** Спавн врагов. */
export const SPAWN = {
  intervalStartMs: 2000,
  intervalMinMs: 300,
  intervalDecreasePerMinuteMs: 50,
  // Радиус спавна — чуть за пределами экрана. Слишком большой: оружие
  // не долетает до первых врагов, и начало забега проходит впустую.
  radius: 420,
  maxEnemies: 150,
  despawnDistance: 1200,
} as const;

/** Опыт и уровни. */
export const XP = {
  base: 10,
  multiplier: 1.4,
  orbValue: 1,
  orbLifetimeMs: 30000,
  levelUpChoices: 3,
} as const;

/** Масштабирование сложности со временем. */
export const SCALING = {
  hpPerMinute: 0.08,
  hpCapMultiplier: 5,
  speedPerMinute: 0.04,
  spawnRatePerMinute: 0.12,
} as const;

/** Камера. */
export const CAMERA = {
  lerp: 0.08,
  zoomDesktop: 1.0,
  zoomMobile: 0.85,
} as const;

/** Длительность забега. */
export const RUN = {
  durationMinutes: 15,
  durationMinutesMobile: 10,
  chestIntervalMs: 60000,
} as const;

/** Цвета интерфейса — палитра из docs/АНАЛИЗ-РЕСУРСОВ.md. */
export const PALETTE = {
  cream: '#fff7ed',
  accent: '#f97316',
  shadow: '#7c2d12',
  parchment: '#fde68a',
  brown: '#92400e',
  teal: '#0f766e',
  cold: '#1e3a5f',
  night: '#1e293b',
} as const;

/**
 * Определяет мобильное устройство: джойстик вместо клавиатуры.
 *
 * Проверка по user-agent + наличию тач-событий. Флаг `?mobile=1` в адресе
 * принудительно включает мобильный режим — так удобно тестировать джойстик
 * на десктопе.
 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('mobile')) {
    return true;
  }
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    ('ontouchstart' in navigator && navigator.maxTouchPoints > 0)
  );
}
