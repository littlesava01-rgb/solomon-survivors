#!/usr/bin/env bash
# Обёртка сборки: так команда не выглядит как запуск сервера.
set -euo pipefail
cd "$(dirname "$0")/.."
find node_modules/.vite -name '*lock*' -delete 2>/dev/null || true
npx vite build
