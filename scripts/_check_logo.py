#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""_check_logo.py · 本地验证双色块 logo：SVG 内容 / 引用版本 / 导航 mark 渲染（临时脚本）

⚠️ 必须用 anaconda 解释器运行（受管 python 无 playwright）：
   /Users/Jack/opt/anaconda3/bin/python3 scripts/_check_logo.py
"""
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
    check("favicon.svg 为双色块版（#003366/#00CCCC + 英语 + Ying Yu）",
          "#003366" in svg_text and "#00CCCC" in svg_text
          and "英</text>" in svg_text and "Yu</text>" in svg_text, svg_text[:120])
    check("favicon.svg 无旧 E 印章残留（#201B14/#C9A227/#009EE7/E 字母）",
          not any(t in svg_text for t in ("#201B14", "#C9A227", "#009EE7", "E</text>")))

    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={"width": 1280, "height": 360})

        for page in ("index.html", "vocab.html"):
            pg.goto((DIST / page).as_uri())
            pg.wait_for_timeout(500)

            fav_href = pg.eval_on_selector(
                "link[rel='icon'][type='image/svg+xml']", "el => el.href")
            check(f"{page}: favicon 引用带 ?v=3", "?v=3" in fav_href, fav_href)

            bg = pg.eval_on_selector(
                ".brand-mark", "el => getComputedStyle(el).backgroundImage")
            check(f"{page}: 导航品牌 mark 指向新 svg（?v=34）", "favicon.svg?v=34" in bg, bg)

            box = pg.eval_on_selector(
                ".brand-mark",
                "el => { const r = el.getBoundingClientRect();"
                " return {x: r.x, y: r.y, width: r.width, height: r.height}; }")
            shot = pg.screenshot(clip=box)
            im = Image.open(io.BytesIO(shot)).convert("RGBA")
            W, H = im.size
            # mark 34px ≈ svg 512 → px = svg/512*W
            def px_at(sx, sy):
                return im.getpixel((int(sx / 512 * W), int(sy / 512 * H)))
            navy = px_at(220, 160)   # 左深蓝块内
            teal = px_at(300, 300)   # 右青绿块内
            check(f"{page}: mark 内深蓝像素正确",
                  abs(navy[0]) < 30 and navy[1] < 90 and 80 < navy[2] < 130, str(navy))
            check(f"{page}: mark 内青绿像素正确",
                  teal[0] < 60 and teal[1] > 170 and teal[2] > 170, str(teal))

        pg.goto((DIST / "index.html").as_uri())
        pg.wait_for_timeout(500)
        pg.screenshot(path="/tmp/en_logo_header.png",
                     clip={"x": 0, "y": 0, "width": 1280, "height": 70})
        br.close()

    print(f"logo 检查：{ok} 通过 / {fail} 失败（头部截图 /tmp/en_logo_header.png）")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
