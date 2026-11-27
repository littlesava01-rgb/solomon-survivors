import { describe, expect, it } from 'vitest';
import { RUN, SCALING, SPAWN, WORLD, XP, isMobile } from '../src/config/gameConfig';

/**
 * Тесты конфигурации баланса.
 *
 * Проверяют, что числа сходится и что сложность растёт плавно —
 * именно эти значения будем крутить при балансировке.
 */
describe('конфигурация баланса', () => {
  it('мир достаточно большой для 15-минутного забега', () => {
    expect(WORLD.width).toBeGreaterThanOrEqual(3000);
    expect(WORLD.height).toBeGreaterThanOrEqual(3000);
    expect(WORLD.tileSize).toBe(64);
  });

  it('интервал спавна уменьшается, но не ниже минимума', () => {
    expect(SPAWN.intervalStartMs).toBeGreaterThan(SPAWN.intervalMinMs);
    expect(SPAWN.intervalDecreasePerMinuteMs).toBeGreaterThan(0);
  });

  it('потолок масштабирования HP не даёт бесконечного роста', () => {
    expect(SCALING.hpCapMultiplier).toBeGreaterThan(1);
    expect(SCALING.hpCapMultiplier).toBeLessThanOrEqual(10);
  });

  it('кривая XP растёт', () => {
    const xpFor = (level: number) => XP.base * Math.pow(level, XP.multiplier);
    expect(xpFor(2)).toBeGreaterThan(xpFor(1));
    expect(xpFor(10)).toBeGreaterThan(xpFor(5));
  });

  it('число вариантов на выбор при level-up — 3', () => {
    expect(XP.levelUpChoices).toBe(3);
  });

  it('длительность забега на телефоне короче, чем на десктопе', () => {
    expect(RUN.durationMinutesMobile).toBeLessThan(RUN.durationMinutes);
    expect(RUN.durationMinutes).toBeGreaterThan(0);
  });

  it('isMobile не падает в среде без navigator', () => {
    expect(typeof isMobile()).toBe('boolean');
  });
});
