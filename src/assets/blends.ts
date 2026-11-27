/**
 * Реестр переходов между биомами.
 *
 * Полосы собраны скриптом scripts/make_biome_blends.py: текстура
 * одной зоны плавно переходит в текстуру другой, поэтому шов между
 * зонами не виден. Фаза текстуры в полосе посчитана в мировых
 * координатах, так что полоса точно совпадает с обоими тайлами.
 *
 * Оттенок и затемнение зоны тоже запечены в полосу — иначе на краях
 * полосы появлялась бы цветовая ступенька.
 *
 * Переходов ровно семь: по одному на каждый стык зон.
 */
import blendXCorridorPark from './blends/blend-x-corridor-park.webp';
import blendXOldTownDorm from './blends/blend-x-old-town-dorm.webp';
import blendXParkPath from './blends/blend-x-park-path.webp';
import blendXStreetOldTown from './blends/blend-x-street-old-town.webp';
import blendYDormPath from './blends/blend-y-dorm-path.webp';
import blendYOldTownPark from './blends/blend-y-old-town-park.webp';
import blendYStreetCorridor from './blends/blend-y-street-corridor.webp';

export const BLENDS = {
  'blend-x-corridor-park': blendXCorridorPark,
  'blend-x-old-town-dorm': blendXOldTownDorm,
  'blend-x-park-path': blendXParkPath,
  'blend-x-street-old-town': blendXStreetOldTown,
  'blend-y-dorm-path': blendYDormPath,
  'blend-y-old-town-park': blendYOldTownPark,
  'blend-y-street-corridor': blendYStreetCorridor,
} as const;

export type BlendName = keyof typeof BLENDS;
