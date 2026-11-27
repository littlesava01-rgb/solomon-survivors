# -*- coding: utf-8 -*-
"""Прямой вызов cheapvibecode /v1/images/generations с quality=low.

Зачем не tool image_generate: модель gpt-image-2.6-sunburst не входит
в каталог плагина openai -> идёт passthrough без параметра quality.
Требование "low" выполнимо только прямым запросом к /v1/images/generations.
"""
import base64
import json
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

CONFIG = os.path.expandvars(r"%LOCALAPPDATA%\hermes\config.yaml")
BASE = "https://cheapvibecode.ru/v1/images/generations"
MODEL = "gpt-image-2.6-sunburst"


def api_key() -> str:
    text = open(CONFIG, encoding="utf-8").read()
    m = re.search(r"custom_providers:.*?api_key:\s*(\S+)", text, re.S)
    if not m:
        raise SystemExit("не найден api_key в config.yaml")
    return m.group(1).strip()


KEY = api_key()


def generate(prompt: str, size: str = "1024x1024", out: str | None = None,
             quality: str = "low", timeout: int = 600, retries: int = 6):
    """Один запрос к модели. Возвращает путь к сохранённому PNG.

    429 от провайдера — обычное дело при нескольких воркерах, поэтому
    backoff экспоненциальный с потолком ~3 минут.
    """
    body = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "size": size,
        "quality": quality,
        "n": 1,
    }).encode("utf-8")
    last = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                BASE, data=body,
                headers={"Authorization": f"Bearer {KEY}",
                         "Content-Type": "application/json"},
                method="POST")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if data.get("error"):
                raise RuntimeError(data["error"])
            b64 = data["data"][0]["b64_json"]
            blob = base64.b64decode(b64)
            if out:
                os.makedirs(os.path.dirname(out), exist_ok=True)
                with open(out, "wb") as fh:
                    fh.write(blob)
                return out
            return blob
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < retries:
                delay = min(15 * (attempt + 1), 180)
                print(f"    retry {attempt + 1}/{retries} через {delay}s: {str(exc)[:80]}",
                      flush=True)
                time.sleep(delay)
    raise RuntimeError(f"генерация не удалась: {last}")


def run_jobs(jobs, workers=4, size="1024x1024", quality="low"):
    """jobs: список dict(prompt=..., out=...)."""
    results = []

    def one(job):
        t0 = time.time()
        try:
            generate(job["prompt"], size=job.get("size", size), out=job["out"],
                     quality=job.get("quality", quality))
            return (job["out"], "ok", round(time.time() - t0, 1))
        except Exception as exc:  # noqa: BLE001
            return (job["out"], "FAIL " + str(exc)[:160], round(time.time() - t0, 1))

    with ThreadPoolExecutor(max_workers=workers) as pool:
        for res in pool.map(one, jobs):
            results.append(res)
            print(f"{res[1]:<12} {res[2]:>6}s  {res[0]}", flush=True)
    return results
