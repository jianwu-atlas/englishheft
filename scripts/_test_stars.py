# -*- coding: utf-8 -*-
"""验证 B1 重点句收藏（⭐）：句子就地强调 + localStorage 持久化 + 复习页清单 + 首页/导览计数。
用法（需 anaconda 解释器，仅它有 playwright）：
  /Users/Jack/opt/anaconda3/bin/python3 scripts/_test_stars.py
"""
import os
import socket
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
B = "http://127.0.0.1:8653/"
PORT = 8653

console_errs = []


def ready(port=PORT):
    for _ in range(40):
        try:
            socket.create_connection(("127.0.0.1", port), 0.3).close()
            return
        except OSError:
            time.sleep(0.25)
    raise SystemExit("http server 未就绪")


server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
    cwd=DIST, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    ready()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        ctx = browser.new_context()
        pg = ctx.new_page()
        pg.on("console", lambda m: console_errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: console_errs.append(f"pageerror: {e}"))

        # ---------- 1. 场景句页：默认音标 + 收藏 ----------
        pg.goto(B + "sentences.html", wait_until="networkidle", timeout=90000)
        pg.wait_for_timeout(800)
        label = pg.locator("#ipaToggle").inner_text()
        n_ruby = pg.locator("ruby.ipa").count()
        rt_color = pg.evaluate("""() => { const r = document.querySelector('ruby.ipa rt');
            return r ? getComputedStyle(r).color : ''; }""")
        w_color = pg.evaluate("""() => { const r = document.querySelector('ruby.ipa');
            return r ? getComputedStyle(r).color : ''; }""")
        print(f"[i] 音标默认档 = {label!r}，ruby={n_ruby}，单词色={w_color}，rt 色={rt_color}")
        assert "常用" in label, f"音标默认应为「常用」，实际 {label!r}"
        assert n_ruby > 0, "默认应已标注音标（无需点击）"
        assert rt_color == "rgb(0, 144, 214)", f"音标应为蓝色 #0090D6，实际 {rt_color}"
        assert w_color == "rgb(0, 144, 214)", f"被标注的单词本身也应为蓝色 #0090D6，实际 {w_color}"

        scene = pg.locator(".sc-scene").first
        n_btn = scene.locator(".s-star").count()
        print(f"[i] 首个场景 ☆ 按钮 = {n_btn}")
        assert n_btn >= 5, f"每句都应有 ☆ 按钮，实际 {n_btn}"

        scene.locator(".s-star").nth(0).click()
        scene.locator(".s-star").nth(2).click()
        pg.wait_for_timeout(250)
        store = pg.evaluate("() => localStorage.getItem('englishheft_stars')")
        n_starred = pg.locator(".sc-turn.starred").count()
        print(f"[i] 收藏后 storage = {store}，就地高亮 {n_starred} 句")
        assert store and len(eval(store)) == 2, f"应写入 2 条重点句，实际 {store}"
        assert n_starred == 2, f"应有 2 句就地高亮，实际 {n_starred}"
        assert scene.locator(".s-star.on").count() == 2, "已收藏的按钮应为 ★（.on 状态）"

        # ---------- 2. 刷新后仍保留 ----------
        pg.reload(wait_until="networkidle")
        pg.wait_for_timeout(600)
        n_after = pg.locator(".sc-turn.starred").count()
        print(f"[i] 刷新后就地高亮 = {n_after}")
        assert n_after == 2, f"刷新后重点句应保持 2 句，实际 {n_after}"

        # ---------- 3. 复习页清单 ----------
        pg.goto(B + "review.html", wait_until="networkidle")
        pg.wait_for_timeout(500)
        rows = pg.locator(".star-card .sc-turn").count()
        head = pg.locator(".star-head .prog-head").inner_text()
        print(f"[i] 复习页重点句行 = {rows}，头部 = {head.strip()!r}")
        assert rows == 2, f"复习页应列 2 句重点句，实际 {rows}"
        assert "重点句" in head and "2" in head, f"头部应含「重点句 · 共 2 句」，实际 {head!r}"
        assert pg.locator(".star-card .s-zh").count() == 2, "每条重点句应带中文"
        assert pg.locator(".star-card .s-speak").count() == 2, "每条重点句应有 🔊"
        assert pg.locator(".star-card .star-meta a").count() == 2, "每条重点句应有回原场景的链接"

        # ---------- 4. 移出重点 ----------
        pg.locator(".star-card .s-star").first.click()
        pg.wait_for_timeout(400)
        rows2 = pg.locator(".star-card .sc-turn").count()
        store2 = pg.evaluate("() => localStorage.getItem('englishheft_stars')")
        print(f"[i] 移出 1 条后 行={rows2} storage={store2}")
        assert rows2 == 1 and len(eval(store2)) == 1, f"移出后应剩 1 句，实际 rows={rows2} {store2}"

        # ---------- 5. 首页 / 导览计数 ----------
        pg.goto(B + "index.html", wait_until="networkidle")
        pg.wait_for_timeout(300)
        desc = pg.evaluate("""() => { const a = [...document.querySelectorAll('.en-card')]
            .find(x => x.getAttribute('href') === 'review.html');
            return a ? a.querySelector('.en-card-desc').textContent : null; }""")
        print(f"[i] 首页复习卡描述 = {desc!r}")
        assert desc and "1 句重点句" in desc, f"首页应显示「1 句重点句」，实际 {desc!r}"

        pg.goto(B + "sections.html", wait_until="networkidle")
        pg.wait_for_timeout(300)
        entry = pg.locator(".rev-entry").inner_text()
        print(f"[i] 导览入口 = {entry.strip()!r}")
        assert "重点句" in entry and "1" in entry, f"导览入口应含重点句计数，实际 {entry!r}"

        # ---------- 6. 空态 ----------
        pg.goto(B + "sentences.html", wait_until="networkidle")
        pg.wait_for_timeout(400)
        pg.evaluate("() => localStorage.removeItem('englishheft_stars')")
        pg.goto(B + "review.html", wait_until="networkidle")
        pg.wait_for_timeout(400)
        assert pg.locator(".star-empty").count() == 1, "无重点句时应显示空态引导"
        ctx.close()
        browser.close()

    real = [e for e in console_errs if "speechSynthesis" not in e.lower() and "voice" not in e.lower()]
    print(f"[i] console errors (filtered): {len(real)}")
    for e in real[:10]:
        print("   ERR:", e[:160])
    assert not real, f"有 {len(real)} 个未预期 console error"
    print("[✓] B1 重点句收藏（⭐）全部通过")
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except Exception:
        server.kill()
