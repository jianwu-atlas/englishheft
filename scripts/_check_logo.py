#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""_check_logo.py · 本地验证新 logo：favicon 引用 / SVG 内容 / 头部导航渲染（临时脚本）"""
import io
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


def main() -> int:
    ok = fail = 0

    def check(name, cond, detail=""):
        nonlocal ok, fail
        if cond:
            ok += 1
            print(f"  [PASS] {name}")
        else:
            fail += 1
            print(f"  [FAIL] {name} {detail}")

    svg_text = (DIST / "assets" / "img" / "favicon.svg").read_text(encoding="utf-8")
    check("favicon.svg 为 E 印章（含书本蓝第四点，无旧 D）",
          "E</text>" in svg_text and "#009EE7" in svg_text and "D</text>" not in svg_text,
          svg_text[:100])

    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={"width": 1280, "height": 360})

        for page in ("index.html", "vocab.html"):
            pg.goto((DIST / page).as_uri())
            pg.wait_for_timeout(500)

            fav_href = pg.eval_on_selector(
                "link[rel='icon'][type='image/svg+xml']", "el => el.href")
            check(f"{page}: favicon 引用带 ?v=2", "?v=2" in fav_href, fav_href)

            bg = pg.eval_on_selector(
                ".brand-mark", "el => getComputedStyle(el).backgroundImage")
            check(f"{page}: 导航品牌 mark 指向新 svg（?v=33）", "favicon.svg?v=33" in bg, bg)

            box = pg.eval_on_selector(
                ".brand-mark",
                "el => { const r = el.getBoundingClientRect();"
                " return {x: r.x, y: r.y, width: r.width, height: r.height}; }")
            shot = pg.screenshot(clip=box)
            im = Image.open(io.BytesIO(shot)).convert("RGB")
            px = im.getpixel((8, 8))
            check(f"{page}: 品牌 mark 渲染为深色印泥（#201B14 系）",
                  px[0] < 60 and px[1] < 60 and px[2] < 50, str(px))

        pg.goto((DIST / "index.html").as_uri())
        pg.wait_for_timeout(500)
        pg.screenshot(path="/tmp/en_logo_header.png",
                     clip={"x": 0, "y": 0, "width": 1280, "height": 70})
        br.close()

    print(f"logo 检查：{ok} 通过 / {fail} 失败（头部截图 /tmp/en_logo_header.png）")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
