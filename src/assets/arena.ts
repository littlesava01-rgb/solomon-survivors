/**
 * Реестр текстур пола и декора арены.
 *
 * Пол (src/assets/floors/) — бесшовные тайлы 256x256, собранные из
 * четвертей листа зеркалированием (scripts/cut_floors.py).
 * Декор (src/assets/props/) — предметы видом сверху (scripts/gen_props.py).
 *
 * Импортируются статически, чтобы Vite положил их в бандл.
 */

import floorLinoleum from './floors/linoleum.png';
import floorSnowAsphalt from './floors/snow-asphalt.png';
import floorSnowCobble from './floors/snow-cobble.png';
import floorSnowGrass from './floors/snow-grass.png';
import floorSnowPath from './floors/snow-path.png';
import floorWoodFloor from './floors/wood-floor.png';

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
  'floor-snow-asphalt': floorSnowAsphalt,
  'floor-snow-cobble': floorSnowCobble,
  'floor-wood-floor': floorWoodFloor,
  'floor-linoleum': floorLinoleum,
  'floor-snow-grass': floorSnowGrass,
  'floor-snow-path': floorSnowPath,
} as const;

/**
 * Декор арены.
 *
 * Только те виды, что получились видом строго сверху. Лавка, забор
 * и указатель вышли во фронтальном виде и в бесшовном сверху мире
 * смотрелись бы чужеродно — их нет в списке.
 */
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
