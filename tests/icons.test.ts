import { describe, expect, it } from 'vitest';
import { ICONS, ICON_NAMES, iconUrl } from '../src/assets/icons';

/**
 * Тест реестра иконок.
 *
 * Проверяет, что все 110 иконок на месте и что ключи совпадают с именами
 * файлов — иначе в игре появятся «битые» картинки.
 */
describe('реестр иконок', () => {
  it('содержит все 110 иконок', () => {
    expect(ICON_NAMES.length).toBe(110);
  });

  it('не содержит дубликатов ключей', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it('возвращает ссылку для существующей иконки', () => {
    const url = iconUrl('btn-play');
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
    expect(url!.length).toBeGreaterThan(0);
  });

  it('возвращает undefined для неизвестной иконки', () => {
    expect(iconUrl('не-существует')).toBeUndefined();
  });

  it('все ключи в нижнем регистре и через дефис', () => {
    for (const name of ICON_NAMES) {
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('содержит иконки, нужные для меню', () => {
    for (const required of ['btn-play', 'btn-back', 'btn-sound', 'solomon']) {
      expect(ICONS).toHaveProperty(required);
    }
  });
});
