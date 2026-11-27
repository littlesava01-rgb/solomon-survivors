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
 */
import blendXCorridorPark0 from './blends/blend-x-corridor-park-0.webp';
import blendXDormOldTown1 from './blends/blend-x-dorm-old-town-1.webp';
import blendXOldTownDorm0 from './blends/blend-x-old-town-dorm-0.webp';
import blendXOldTownStreet1 from './blends/blend-x-old-town-street-1.webp';
import blendXParkCorridor1 from './blends/blend-x-park-corridor-1.webp';
import blendXParkPath0 from './blends/blend-x-park-path-0.webp';
import blendXPathPark1 from './blends/blend-x-path-park-1.webp';
import blendXStreetOldTown0 from './blends/blend-x-street-old-town-0.webp';
import blendYCorridorStreet1 from './blends/blend-y-corridor-street-1.webp';
import blendYDormPath0 from './blends/blend-y-dorm-path-0.webp';
import blendYOldTownPark0 from './blends/blend-y-old-town-park-0.webp';
import blendYParkOldTown1 from './blends/blend-y-park-old-town-1.webp';
import blendYPathDorm1 from './blends/blend-y-path-dorm-1.webp';
import blendYStreetCorridor0 from './blends/blend-y-street-corridor-0.webp';

export const BLENDS = {
  'blend-x-corridor-park-0': blendXCorridorPark0,
  'blend-x-dorm-old-town-1': blendXDormOldTown1,
  'blend-x-old-town-dorm-0': blendXOldTownDorm0,
  'blend-x-old-town-street-1': blendXOldTownStreet1,
  'blend-x-park-corridor-1': blendXParkCorridor1,
  'blend-x-park-path-0': blendXParkPath0,
  'blend-x-path-park-1': blendXPathPark1,
  'blend-x-street-old-town-0': blendXStreetOldTown0,
  'blend-y-corridor-street-1': blendYCorridorStreet1,
  'blend-y-dorm-path-0': blendYDormPath0,
  'blend-y-old-town-park-0': blendYOldTownPark0,
  'blend-y-park-old-town-1': blendYParkOldTown1,
  'blend-y-path-dorm-1': blendYPathDorm1,
  'blend-y-street-corridor-0': blendYStreetCorridor0,
} as const;

export type BlendName = keyof typeof BLENDS;
