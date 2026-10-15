#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_pages.py · 生成英语站的 5 个页面（同一壳，不同标题/描述/data-page）

页面：index / vocab / sentences / phonetics / sections
（pdf.html 为独立页，含工具条 + iframe 阅读器，**手工维护，不由本脚本生成**；NAV 里的「原文」链接指向它）
运行：python3 scripts/gen_pages.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

NAV = [
    ("index.html", "首页", "Start"),
    ("vocab.html", "词汇", "Vocabulary"),
    ("sentences.html", "场景句", "Sentences"),
    ("phonetics.html", "语音·音标", "Phonetics"),
    ("sections.html", "大类导览", "Sections"),
    ("pdf.html", "原文", "Original"),
]

PAGES = [
    ("index", "index.html", "首页", "Start", "词汇 / 场景句 / 语音音标 / 大类导览 —— 一站复习。"),
    ("vocab", "vocab.html", "词汇", "Vocabulary",
     "17 大类 / 493 场景 / 7000+ 词条，英文 / 音标 / 中文三行对照，可逐条朗读。"),
    ("sentences", "sentences.html", "场景句", "Sentences",
     "4900+ 场景句（英文 / 中文）+ 1200+ 条句子解析：短语用法、单词说明、句型搭配。"),
    ("phonetics", "phonetics.html", "语音·音标", "Phonetics",
     "从全书 7000 条音标反推的英语音素表：25 元音 + 26 辅音，每个音素配书中例词。"),
    ("sections", "sections.html", "大类导览", "Sections",
     "17 个 Section 的构成与学习建议，按 Part / 场景逐层展开。"),
]

SHELL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} · 15000 英语单词 · Englishheft</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/english.css?v=8">
<link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg?v=3">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/favicon-32.png?v=3">
<link rel="icon" type="image/png" sizes="16x16" href="assets/img/favicon-16.png?v=3">
<link rel="apple-touch-icon" sizes="180x180" href="assets/img/apple-touch-icon.png?v=3">
<link rel="manifest" href="manifest.webmanifest?v=3">
<meta property="og:type" content="website">
<meta property="og:title" content="{title} · 15000 英语单词 · Englishheft">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="assets/img/og-image.png">
</head>
<body data-page="{page}">
<nav class="topnav">
  <div class="nav-inner">
    <a href="index.html" class="nav-brand">
      <span class="brand-mark">E</span>
      <span class="nav-brand-text">
        <span class="nav-brand-title">ENGLISHHEFT</span>
        <span class="nav-brand-sub">Jian (Jack) Wu · 15000 英语单词口袋书</span>
      </span>
    </a>
    <div class="nav-links" id="navLinks">
{nav}
    </div>
    <div class="nav-tools">
      <button class="theme-toggle" id="themeToggle" title="切换深色 / 浅色">◐</button>
      <button class="nav-burger" id="navBurger" title="菜单" aria-label="菜单">☰</button>
    </div>
  </div>
</nav>
<main class="page-wrap">
  <div class="page-head">
    <div class="page-kicker">{kicker} · {kickerEn}</div>
    <h1 class="page-title">{titleZh} <em>{titleEm}</em></h1>
    <p class="page-desc">{desc}
      <span class="lbk-extra">课外教材 · Extra</span>
      <span class="sc-note">词汇不计入德语站生词表</span>
    </p>
  </div>
  <div id="app"></div>
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-row">
{foot}
      <a class="footer-chip" href="https://deutschheft.pages.dev/" target="_blank" rel="noopener">↗ Mein Deutschheft（德语站）</a>
    </div>
    <div class="footer-copyright">© 2026 Jian (Jack) Wu · Englishheft（《15000英语单词口袋书》蒸馏）· Stand 2026-10-15 ·
      <a href="https://github.com/jianwu-atlas" target="_blank" rel="noopener">GitHub</a>
    </div>
  </div>
</footer>
</main>

<script src="assets/js/data/english.js?v=1"></script>
{extra_scripts}<script src="assets/js/site.js?v=6"></script>
<script src="assets/js/annotate-en.js?v=1"></script>
<script src="assets/js/offline.js?v=1"></script>
</body>
</html>
"""


def main() -> int:
    for page, fname, zh, en, desc in PAGES:
        nav = "\n".join(
            '      <a href="%s"%s>%s</a>' % (h, ' class="active"' if h == fname else "", z)
            for h, z, _ in NAV)
        foot = "\n".join(
            '      <a class="footer-chip" href="%s">%s</a>' % (h, z) for h, z, _ in NAV)
        title_zh, title_em = (zh, en) if page != "index" else ("英语单词", "学习站")
        # 场景句页额外加载 en-de.js（德文对照 + 逐词 IPA，由 scripts/build_en_de.py 生成）
        extra = '<script src="assets/js/data/en-de.js?v=1"></script>\n' if page == "sentences" else ""
        html = SHELL.format(page=page, title=f"{zh} · {en}", desc=desc, nav=nav, foot=foot,
                            kicker="15000 英语单词口袋书", kickerEn=en,
                            titleZh=title_zh, titleEm=title_em, extra_scripts=extra)
        (ROOT / fname).write_text(html, encoding="utf-8")
        print(f"  ✓ {fname}")
    print(f"[✓] 已生成 {len(PAGES)} 个页面")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
