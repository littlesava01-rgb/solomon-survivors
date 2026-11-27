/**
 * Реестр спрайтов игры.
 *
 * Импортируются статически — так Vite анализирует их и кладёт в бандл.
 * Ключи совпадают с id из scripts/sprites_catalog.py.
 *
 * Спрайты нарисованы в art/sprites/ (см. scripts/gen_sheets.py + cut_sprites.py).
 */

import bossDiary from '../../art/sprites/boss-diary.png';
import bossDiploma from '../../art/sprites/boss-diploma.png';
import bossExam from '../../art/sprites/boss-exam.png';
import enemyBackpack from '../../art/sprites/enemy-backpack.png';
import enemyChalk from '../../art/sprites/enemy-chalk.png';
import enemyDiary from '../../art/sprites/enemy-diary.png';
import enemyEraser from '../../art/sprites/enemy-eraser.png';
import enemyInk from '../../art/sprites/enemy-ink.png';
import enemyNotebook from '../../art/sprites/enemy-notebook.png';
import enemyPencil from '../../art/sprites/enemy-pencil.png';
import enemyPointer from '../../art/sprites/enemy-pointer.png';
import enemyRuler from '../../art/sprites/enemy-ruler.png';
import enemyTextbook from '../../art/sprites/enemy-textbook.png';
import fxFormula from '../../art/sprites/fx-formula.png';
import fxHitFlash from '../../art/sprites/fx-hit-flash.png';
import pickupSatchel from '../../art/sprites/pickup-satchel.png';
import projPage from '../../art/sprites/proj-page.png';
import wpnEraser from '../../art/sprites/wpn-eraser.png';
import wpnInkSplat from '../../art/sprites/wpn-ink-splat.png';
import wpnNotebookZone from '../../art/sprites/wpn-notebook-zone.png';
import wpnPencil from '../../art/sprites/wpn-pencil.png';
import wpnPointer from '../../art/sprites/wpn-pointer.png';
import wpnRuler from '../../art/sprites/wpn-ruler.png';
import xpOrb from '../../art/sprites/xp-orb.png';

export const SPRITES = {
  // Враги
  'enemy-notebook': enemyNotebook,
  'enemy-chalk': enemyChalk,
  'enemy-pointer': enemyPointer,
  'enemy-pencil': enemyPencil,
  'enemy-ruler': enemyRuler,
  'enemy-eraser': enemyEraser,
  'enemy-textbook': enemyTextbook,
  'enemy-diary': enemyDiary,
  'enemy-ink': enemyInk,
  'enemy-backpack': enemyBackpack,
  // Снаряды и лут
  'proj-page': projPage,
  'pickup-satchel': pickupSatchel,
  // Оружие и эффекты
  'wpn-pencil': wpnPencil,
  'wpn-eraser': wpnEraser,
  'wpn-pointer': wpnPointer,
  'wpn-ruler': wpnRuler,
  'wpn-notebook-zone': wpnNotebookZone,
  'wpn-ink-splat': wpnInkSplat,
  'fx-formula': fxFormula,
  'xp-orb': xpOrb,
  'fx-hit-flash': fxHitFlash,
  // Боссы
  'boss-exam': bossExam,
  'boss-diary': bossDiary,
  'boss-diploma': bossDiploma,
} as const;

export type SpriteName = keyof typeof SPRITES;

export const SPRITE_NAMES = Object.keys(SPRITES) as SpriteName[];

/** Ссылка на спрайт по ключу. undefined, если спрайта нет. */
export function spriteUrl(name: string): string | undefined {
  return (SPRITES as Record<string, string>)[name];
}
