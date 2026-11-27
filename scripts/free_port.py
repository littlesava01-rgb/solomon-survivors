# -*- coding: utf-8 -*-
"""Освобождает порт перед запуском тестов.

Vite не даёт запустить второй preview того же проекта, а Playwright
падает с «port is already used», если на порту остался сервер от
предыдущего прогона. Здесь просто снимаем процесс с порта.

Запуск: python scripts/free_port.py 4175
"""
import os
import subprocess
import sys


def pids_on_port(port: int) -> list[int]:
    """PID-ы процессов, слушающих порт (Windows)."""
    if os.name != "nt":
        return []

    out = subprocess.run(
        ["netstat", "-ano", "-p", "TCP"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
    ).stdout

    pids: set[int] = set()
    for line in out.splitlines():
        if f":{port}" not in line:
            continue
        parts = line.split()
        if len(parts) < 5 or parts[-1].upper() not in ("LISTENING", "ESTABLISHED"):
            continue
        try:
            pids.add(int(parts[-1]))
        except ValueError:
            continue
    return sorted(pids)


def main() -> None:
    ports = [int(a) for a in sys.argv[1:]] or [4175]
    for port in ports:
        for pid in pids_on_port(port):
            print(f"освобождаю порт {port}: kill {pid}", flush=True)
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
                capture_output=True,
                text=True,
            )


if __name__ == "__main__":
    main()
