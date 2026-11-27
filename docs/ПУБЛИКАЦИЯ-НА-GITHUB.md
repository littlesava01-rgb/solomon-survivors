# Публикация на GitHub Pages

Репозиторий: **https://github.com/littlesava01-rgb/solomon-survivors**
Живая ссылка: **https://littlesava01-rgb.github.io/solomon-survivors/**

---

## Что уже сделано

| Что | Статус |
|---|---|
| Репозиторий создан (public) | ✅ `littlesava01-rgb/solomon-survivors` |
| Ветка `main` с кодом | ✅ запушено |
| Ветка `gh-pages` со сборкой | ✅ собирается и деплоится скриптом |
| Pages включён (branch: `gh-pages`, path: `/`) | ✅ адрес работает |
| PWA-манифест и иконки | ✅ в `public/icons/` |
| Тесты | ✅ 13 unit (vitest) + 9 e2e (Playwright) |

---

## Почему деплой идёт через скрипт, а не через Actions

Обычно для Pages настраивают GitHub Actions: в `.github/workflows/deploy.yml`
лежит job, который собирает проект и публикует артефакт. У нас этот файл
**не удалось запушить**, потому что у токена `gh` нет scope `workflow`:

```
! [remote rejected] HEAD -> main (refusing to allow an OAuth App to create
  or update workflow `.github/workflows/deploy.yml` without `workflow` scope)
```

Обойти это можно двумя способами. Рабочий на сейчас — первый.

### Вариант A. Деплой скриптом (работает прямо сейчас)

```bash
npm run deploy
```

Скрипт `scripts/deploy_pages.sh` собирает проект с правильным `BASE_PATH`,
кладёт сборку в корень ветки `gh-pages` и пушит её. Pages подхватывает
ветку автоматически за 10–30 секунд.

> Подробности скрипта: `scripts/deploy_pages.sh`.

### Вариант B. Переключиться на Actions (рекомендуется на будущее)

Нужен токен со scope `workflow`. Один раз в терминале:

```bash
gh auth refresh -h github.com -s workflow
```

Откроется браузер — подтвердите вход. После этого:

1. Вернуть файл `.github/workflows/deploy.yml` в репозиторий:

   ```bash
   cp docs/deploy.yml .github/workflows/deploy.yml
   git add .github/workflows/deploy.yml
   git commit -m "ci: деплой на GitHub Pages через Actions"
   git push
   ```

2. В репозитории: **Settings → Pages → Build and deployment → Source** →
   выбрать **GitHub Actions**.

3. Дальше деплой происходит сам при каждом пуше в `main` — скрипт не нужен.

Файл workflow лежит в `docs/deploy.yml` (вне `.github/`, чтобы не ломать
push до получения scope).

---

## Как обновить сайт

```bash
npm run build     # проверить, что сборка проходит
npm test          # юнит-тесты
npm run deploy    # опубликовать
```

Потом подождать 10–30 секунд и обновить страницу.

> **Две папки сборки.** `npm run build` кладёт файлы в `dist/` с `BASE_PATH="/"` —
> это локальная сборка, её проверяют `npm run preview` и e2e-тесты.
> `npm run deploy` собирает отдельно в `dist-pages/` с `BASE_PATH="/<репо>/"`.
> Папки не путаются: локальные тесты всегда гоняют правильную сборку.

---

## Как играть с телефона

1. Открыть **https://littlesava01-rgb.github.io/solomon-survivors/**
2. Chrome на Android → меню «⋮» → **«Установить приложение»** (или «Добавить на главный экран»).
3. Игра запустится в отдельном окне, без адресной строки, и будет работать офлайн.

На iOS: Safari → «Поделиться» → **«На экран “Домой”»**.

> Игра адаптируется под телефон: включается экранный джойстик (левая нижняя
> четверть экрана), камера отдаляется, таймер сокращается до 10 минут.

---

## Проверка, что всё работает

```bash
# сайт отвечает
curl -s -o /dev/null -w "%{http_code}\n" https://littlesava01-rgb.github.io/solomon-survivors/

# e2e-тесты (поднимают сборку и гоняют в Chromium)
npm run test:e2e
```

`npm run test:e2e` прогоняет и локальную сборку, и **опубликованный сайт**
(`tests/e2e/live.spec.ts`) — так проверяется, что после деплоя всё работает
у реального пользователя.

---

## Если что-то пошло не так

| Симптом | Причина и что делать |
|---|---|
| `refusing to allow an OAuth App ... without workflow scope` | Не хватает scope. Вариант B выше. |
| Сайт отдаёт 404 | Pages ещё собирается — подождите 30 секунд и перезапустите деплой: `gh api --method POST repos/littlesava01-rgb/solomon-survivors/pages/builds` |
| В консоли 404 на файлы ассетов | Не сходится `BASE_PATH`. Он подставляется в `vite.config.ts` из переменной окружения: для Pages это `/solomon-survivors/` |
| Старая версия игры на телефоне | PWA кэширует сборку. Переустановите приложение или откройте в приватной вкладке |
| Игра не грузится, белый экран | Откройте консоль браузера — скорее всего, ошибка в консоли сборки; проверьте `npm run build` локально |

---

## Что нужно сделать в самом репозитории (один раз, вручную)

Токен `gh` не может менять настройки репозитория, поэтому это придётся
сделать руками через веб-интерфейс:

1. **Settings → General → Features** — выключить *Wikis*, *Projects*,
   *Issues*, если они не нужны (чисто для порядка).
2. **Settings → Pages → Build and deployment → Source** — **Deploy from a
   branch**, ветка `gh-pages`, папка `/ (root)`. Уже настроено через API.
3. **Settings → Actions → General → Workflow permissions** — *Read and write
   permissions* (нужно, когда включите вариант B).
4. **Settings → General → Danger Zone** — если хотите, чтобы репозиторий
   оставался public: на бесплатном плане GitHub Pages доступен только для
   публичных репозиториев.

---

## Безопасность

- Токен лежит в системном хранилище `gh` (Windows Credential Manager), не в коде.
- **Не** коммитить `.env` и любые файлы с секретами — они в `.gitignore`.
- Для публичного репозитория `LICENSE` (MIT) обязателен, чтобы графика и код
  имели понятную лицензию.
