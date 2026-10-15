"""gen_logos.py · 由 SVG 生成英语站全套位图 logo（用 Chromium 高保真栅格化）

产出（englishheft/assets/img/）：
  favicon-16.png / favicon-32.png / favicon-48.png
  apple-touch-icon.png (180)
  icon-192.png / icon-512.png / icon-512-maskable.png
  logo-mark-512.png
  og-image.png (1200×630)
运行：python3 scripts/gen_logos.py
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"

JOBS = [
    ("favicon.svg", "favicon-16.png", 16),
    ("favicon.svg", "favicon-32.png", 32),
    ("favicon.svg", "favicon-48.png", 48),
    ("favicon.svg", "apple-touch-icon.png", 180),
    ("favicon.svg", "icon-192.png", 192),
    ("favicon.svg", "icon-512.png", 512),
    ("favicon.svg", "icon-512-maskable.png", 512),
    ("favicon.svg", "logo-mark-512.png", 512),
    ("og-image.svg", "og-image.png", None),      # 用 SVG 自身尺寸 1200×630
]


def main() -> int:
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--no-sandbox"])
        for src, out, size in JOBS:
            svg = (IMG / src).read_text(encoding="utf-8")
            w = size or (1200 if src == "og-image.svg" else 512)
            h = size or (630 if src == "og-image.svg" else 512)
            pg = br.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            pg.set_content(
                f'<html><body style="margin:0;padding:0;background:transparent">'
                f'<div style="width:{w}px;height:{h}px">{svg.replace("<svg ", f"<svg width=\"{w}\" height=\"{h}\" ", 1)}</div>'
                f"</body></html>")
            pg.wait_for_timeout(120)
            pg.screenshot(path=str(IMG / out), omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
            pg.close()
            print(f"  ✓ {out}  {w}×{h}")
        br.close()
    print(f"[✓] 已生成 {len(JOBS)} 个位图 logo → {IMG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
