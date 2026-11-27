#!/usr/bin/env bash
#
# Сборка и публикация на GitHub Pages через ветку gh-pages.
#
# Зачем: пока у токена GitHub нет scope "workflow", в репозиторий нельзя
# запушить файл .github/workflows/deploy.yml, поэтому автоматический деплой
# через Actions недоступен. Этот скрипт делает то же самое вручную.
#
# Когда токен получит scope workflow, можно вернуться к Actions-деплою
# (см. docs/ПУБЛИКАЦИЯ-НА-GITHUB.md) и не запускать этот скрипт.
#
# Использование:
#   bash scripts/deploy_pages.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

REPO="${GITHUB_REPOSITORY:-littlesava01-rgb/solomon-survivors}"
OWNER="$(echo "$REPO" | cut -d/ -f1)"
NAME="$(echo "$REPO" | cut -d/ -f2)"
BRANCH="gh-pages"
WORKTREE=".deploy_worktree"

echo "==> Сборка (BASE_PATH=/$NAME/)"
BASE_PATH="/$NAME/" npx vite build

echo "==> Готовим ветку $BRANCH в отдельном worktree"
git worktree remove --force "$WORKTREE" 2>/dev/null || true
rm -rf "$WORKTREE"
git worktree add --detach "$WORKTREE" >/dev/null

cd "$WORKTREE"
# Ветка-сирота с уникальным именем: локальная gh-pages уже может существовать,
# и checkout --orphan с её именем падал бы с ошибкой.
git checkout --orphan "deploy-tmp-$$" 2>/dev/null
git rm -rf --cached . -q 2>/dev/null || true
# Чистим рабочее дерево worktree — основной проект не затрагивается
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

echo "==> Копируем сборку в корень ветки"
cp -r ../dist/. .
# Pages не должен отдавать папки «_» как служебные
touch .nojekyll

echo "==> Коммит и пуш"
git add -A
git commit -q -m "deploy: обновление GitHub Pages" || echo "    (изменений нет — пропускаем коммит)"
git push --force origin "HEAD:refs/heads/$BRANCH"

cd ..
git worktree remove --force "$WORKTREE" 2>/dev/null || true
rm -rf "$WORKTREE"
git worktree prune

echo
echo "Готово: https://${OWNER}.github.io/${NAME}/"
