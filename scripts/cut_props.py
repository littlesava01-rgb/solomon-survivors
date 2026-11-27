# -*- coding: utf-8 -*-
"""Нарезка листов декора в отдельные спрайты.

Делается так же, как для врагов (scripts/cut_sprites.py): ячейка сетки
3x2, обрезка по кремовому фону связностью с края, ресайз.

Спрайты декора остаются с прозрачностью — в отличие от текстур пола.

Запуск: python scripts/cut_props.py
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut_sprites import cut_cell  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "art", "props")
OUT = os.path.join(ROOT, "src", "assets", "props")

# Порядок совпадает с PROPS в gen_props.py.
NAMES = [
    "prop-lamp", "prop-bench", "prop-bin",
    "prop-tree", "prop-snowpile", "prop-planter",
    "prop-bollard", "prop-manhole", "prop-fence",
    "prop-hydrant", "prop-signpost", "prop-crate",
]

# Декор рисуется на земле: крупный размер не нужен.
TARGET = 96
COLS, ROWS = 3, 2


def main():
    os.makedirs(OUT, exist_ok=True)
    sheets = sorted(
        f for f in os.listdir(SHEETS) if f.startswith("props-") and f.endswith(".png")
    )
    if not sheets:
        print("нет листов в art/props")
        return 1

    idx = 0
    for sheet_name in sheets:
        im = Image.open(os.path.join(SHEETS, sheet_name)).convert("RGBA")
        W, H = im.size
        cw, ch = W // COLS, H // ROWS
        for i in range(COLS * ROWS):
            if idx >= len(NAMES):
                break
            cell = im.crop((i % COLS * cw, i // COLS * ch, (i % COLS + 1) * cw,
                             (i // COLS + 1) * ch))
            name = NAMES[idx]
            dest = cut_cell(cell, TARGET, TARGET, name, OUT)
            print(f"  {name:16s} <- {sheet_name} ячейка {i + 1}"
                  f" {'OK' if dest else 'ПУСТО'}")
            idx += 1

    print(f"готово: {idx} декораций в {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
