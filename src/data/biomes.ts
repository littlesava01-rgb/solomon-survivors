/**
 * Таблицы биомов арены.
 *
 * Арена — не пустая заливка: она собрана из зон с разным полом.
 * Текстуры пола приходят из scripts/gen_floors.py (бесшовные тайлы),
 * декор — из scripts/gen_props.py.
 *
 * Зоны подобраны так, чтобы переходы между ними читались: снег идёт
 * к снегу, дерево к дереву.
 */

export interface BiomeDef {
  id: string;
  name: string;
  /** Ключ текстуры пола в реестре src/assets/floors.ts. */
  floor: string;
  /** Ключи декора, которые можно рассыпать в этой зоне. */
  props: string[];
  /** Оттенок поверх пола — задаёт настроение зоны. */
  tint: number;
  /** Насколько темно зона (0 — светло, 1 — темно). */
  darkness: number;
}

export const BIOMES: BiomeDef[] = [
  {
    id: 'street',
    name: 'Улица',
    floor: 'floor-snow-asphalt',
    props: ['prop-lamp', 'prop-bin', 'prop-snowpile', 'prop-manhole', 'prop-bollard'],
    tint: 0xdce6f2,
    darkness: 0.0,
  },
  {
    id: 'old-town',
    name: 'Старый город',
    floor: 'floor-snow-cobble',
    props: ['prop-lamp', 'prop-planter', 'prop-hydrant', 'prop-crate', 'prop-manhole'],
    tint: 0xe4dcd0,
    darkness: 0.06,
  },
  {
    id: 'dorm',
    name: 'Общежитие',
    floor: 'floor-wood-floor',
    props: ['prop-crate', 'prop-bin', 'prop-planter', 'prop-snowpile'],
    tint: 0xf3ddc0,
    darkness: 0.12,
  },
  {
    id: 'corridor',
    name: 'Коридор',
    floor: 'floor-linoleum',
    props: ['prop-bin', 'prop-bollard', 'prop-planter', 'prop-manhole'],
    tint: 0xd8e4e0,
    darkness: 0.16,
  },
  {
    id: 'park',
    name: 'Сквер',
    floor: 'floor-snow-grass',
    props: ['prop-tree', 'prop-lamp', 'prop-snowpile', 'prop-planter', 'prop-bin'],
    tint: 0xd9e6d8,
    darkness: 0.04,
  },
  {
    id: 'path',
    name: 'Тропинка',
    floor: 'floor-snow-path',
    props: ['prop-tree', 'prop-snowpile', 'prop-bollard', 'prop-crate'],
    tint: 0xeef2f7,
    darkness: 0.02,
  },
];
