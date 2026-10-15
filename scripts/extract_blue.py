#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""extract_blue.py · 抽取书中所有「蓝色强调」片段（含所在页码与纵坐标）

书中蓝色 = RGB(0, 158, 231)（non_stroking_color = (0.0, 0.6196, 0.9059)）
用途：还原书本的强调标注 —— 词表里的英文词、以及**句子里被标蓝的短语**。

产出：~/.workbuddy/wiki-knowledge-en/raw/en15000-blue.json
      [{ "page": 206, "top": 123.4, "text": "security guards" }, ...]

用法：python3 scripts/extract_blue.py   （约 3–6 分钟）
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pdfplumber

PDF = Path("/Users/Jack/Library/CloudStorage/OneDrive-Personal/01_个人_Personal/2_书籍_Books/"
           "15000英语单词口袋书-最重要.pdf")
OUT = Path.home() / ".workbuddy/wiki-knowledge-en/raw/en15000-blue.json"
BLUE = (0.0, 0.6196, 0.9059)


def is_blue(c) -> bool:
    if c is None:
        return False
    try:
        t = tuple(round(float(x), 3) for x in (c if not isinstance(c, (int, float)) else (c,)))
    except Exception:
        return False
    if len(t) != 3:
        return False
    return abs(t[0] - BLUE[0]) < .05 and abs(t[1] - BLUE[1]) < .05 and abs(t[2] - BLUE[2]) < .05


def main() -> int:
    out = []
    with pdfplumber.open(PDF) as pdf:
        n = len(pdf.pages)
        for i, pg in enumerate(pdf.pages):
            try:
                hits = [ch for ch in pg.chars if is_blue(ch.get("non_stroking_color"))]
            except Exception:
                continue
            segs, cur, prev = [], [], None
            for ch in hits:
                if prev is not None and ((ch["top"] - prev["top"]) > 3 or (ch["x0"] - prev["x1"]) > 6):
                    segs.append(cur)
                    cur = []
                cur.append(ch)
                prev = ch
            if cur:
                segs.append(cur)
            for s in segs:
                txt = "".join(x["text"] for x in s).strip()
                if txt:
                    out.append({"page": i + 1, "top": round(s[0]["top"], 1), "text": txt})
            if (i + 1) % 200 == 0:
                print(f"  …{i + 1}/{n} 页，已收集 {len(out)} 段", flush=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    pages = len({x["page"] for x in out})
    print(f"[✓] 已生成 {OUT}（{len(out)} 段蓝色标注，覆盖 {pages} 页）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
