# «Белка Соломон»

Игра в жанре **Vampire Survivors**: Соломон-белка отбивается от бесконечных
волн школьной атрибутики — учебников, указок, мела, ластиков и дневников.
Оружие Соломона — тоже канцелярия: карандаши, ластики, линейки, тетради.

📄 Полный дизайн: [`docs/ПЛАН-ИГРЫ.md`](docs/ПЛАН-ИГРЫ.md) ·
🖼 Аудит графики: [`docs/АНАЛИЗ-РЕСУРСОВ.md`](docs/АНАЛИЗ-РЕСУРСОВ.md) ·
🚀 Публикация: [`docs/ПУБЛИКАЦИЯ-НА-GITHUB.md`](docs/ПУБЛИКАЦИЯ-НА-GITHUB.md)

## Играть

**Онлайн:** <https://littlesava01-rgb.github.io/solomon-survivors/>

**Локально:**

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

На телефоне игра ставится как приложение (PWA): «Установить приложение» в
Chrome на Android, либо «Поделиться → На экран “Домой”» на iOS.

## Управление

| | |
|---|---|
| **WASD / стрелки** | движение |
| **Экранный джойстик** | движение на телефоне (левая нижняя четверть экрана) |
| **ESC** | выход в меню |

Оружие работает автоматически — прицеливать не нужно.

## Стек

Phaser 3 · TypeScript · Vite · vite-plugin-pwa · Vitest · GitHub Actions → GitHub Pages

## Структура

```
src/
  main.ts              — точка входа, конфиг Phaser
  config/              — баланс и константы
  data/                — таблицы врагов, оружия, апгрейдов, волн
  entities/            — Player, Enemy, Projectile, XPOrb, Pickup
  managers/            — Spawn, Weapon, Upgrade, Collision
  systems/             — ObjectPool, SpatialGrid, HUD, Input, Audio, Save
  scenes/              — Boot, Menu, Game, LevelUp, Pause, GameOver
  assets/              — спрайты, иконки, шрифты
docs/                  — дизайн, аудит ресурсов, публикация
scripts/               — подготовка спрайтов, симуляция баланса
```

## Статус

Сейчас в репозитории — **рабочий прототип**: меню, арена, движение Соломона,
камера, HUD, экранный джойстик. Боевая система (враги, оружие, апгрейды,
боссы, мета-прогрессия) — по этапам 2–5 в плане игры.

## Команды

```bash
npm run dev        # дев-сервер
npm run build      # production-сборка
npm test           # юнит-тесты (vitest)
npm run test:e2e   # e2e-тесты (playwright, desktop + mobile)
npm run deploy     # собрать и опубликовать на GitHub Pages
```

## Лицензия

MIT — см. [LICENSE](LICENSE).
