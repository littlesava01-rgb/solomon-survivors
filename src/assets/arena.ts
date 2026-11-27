/**
 * Реестр текстур пола и декора арены.
 *
 * Пол (src/assets/floors/) — бесшовные тайлы 1024x1024 в WebP.
 * Собираются зеркалированием целой ячейки: швов не бывает по
 * построению (см. scripts/cut_floors.py). Тайл показан в мире без
 * масштабирования, поэтому период повтора равен ширине экрана и
 * фактура не читается как обои.
 *
 * Декор (src/assets/props/) — предметы видом сверху (scripts/gen_props.py).
 *
 * Импортируются статически, чтобы Vite положил их в бандл.
 */

import linoleum from './floors/linoleum.webp';
import snowAsphalt from './floors/snow-asphalt.webp';
import snowCobble from './floors/snow-cobble.webp';
import snowGrass from './floors/snow-grass.webp';
import snowPath from './floors/snow-path.webp';
import woodFloor from './floors/wood-floor.webp';

import propBin from './props/prop-bin.png';
import propBollard from './props/prop-bollard.png';
import propCrate from './props/prop-crate.png';
import propHydrant from './props/prop-hydrant.png';
import propLamp from './props/prop-lamp.png';
import propManhole from './props/prop-manhole.png';
import propPlanter from './props/prop-planter.png';
import propSnowpile from './props/prop-snowpile.png';
import propTree from './props/prop-tree.png';

export const FLOORS = {
  'floor-snow-asphalt': snowAsphalt,
  'floor-snow-cobble': snowCobble,
  'floor-wood-floor': woodFloor,
  'floor-linoleum': linoleum,
  'floor-snow-grass': snowGrass,
  'floor-snow-path': snowPath,
} as const;

export const PROPS = {
  'prop-lamp': propLamp,
  'prop-bin': propBin,
  'prop-tree': propTree,
  'prop-snowpile': propSnowpile,
  'prop-planter': propPlanter,
  'prop-bollard': propBollard,
  'prop-manhole': propManhole,
  'prop-hydrant': propHydrant,
  'prop-crate': propCrate,
} as const;

export type FloorName = keyof typeof FLOORS;
export type PropName = keyof typeof PROPS;
