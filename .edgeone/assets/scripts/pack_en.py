#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pack_en.py · 打包英语站到 dist/（并把全量文件清单注入 sw.js / offline.js）

用法：python3 scripts/pack_en.py
产出：dist/  ← 发布这个目录
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


def main() -> int:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    pages = sorted(ROOT.glob("*.html"))
    for p in pages:
        shutil.copy2(p, DIST / p.name)
    for name in ("robots.txt", "sitemap.xml", "sw.js", "manifest.webmanifest"):
        f = ROOT / name
        if f.exists():
            shutil.copy2(f, DIST / name)
    shutil.copytree(ROOT / "assets", DIST / "assets")

    for junk in DIST.rglob(".DS_Store"):
        junk.unlink()

    all_files = sorted("./" + str(p.relative_to(DIST)).replace("\\", "/")
                       for p in DIST.rglob("*") if p.is_file())
    sw = DIST / "sw.js"
    if sw.exists():
        sw.write_text(sw.read_text(encoding="utf-8").replace('"__ALL__"', json.dumps(all_files, ensure_ascii=False)),
                      encoding="utf-8")
    oj = DIST / "assets" / "js" / "offline.js"
    if oj.exists():
        t = oj.read_text(encoding="utf-8").replace(
            "(function () {",
            "(function () {\n  window.__DH_SW_FILES = " + json.dumps(all_files, ensure_ascii=False) + ";", 1)
        oj.write_text(t, encoding="utf-8")

    size = sum(f.stat().st_size for f in DIST.rglob("*") if f.is_file())
    print(f"[✓] 已打包到 {DIST}")
    print(f"    页面：{len(pages)} 个 | 文件：{len(all_files)} 个 | 体积：{size / 1024 / 1024:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
