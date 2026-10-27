# -*- coding: utf-8 -*-
"""验证 B2 离线包：自动预缓存核心包 + 状态面板 + 断网可用 + 下载全部（含 PDF）。
用法（需 anaconda 解释器）：
  /Users/Jack/opt/anaconda3/bin/python3 scripts/_test_offline.py
"""
import os
import socket
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
B = "http://127.0.0.1:8654/"
PORT = 8654
CORE_MIN = 28          # 全量 29 个文件减去教材 PDF


def ready(port=PORT):
    for _ in range(40):
        try:
            socket.create_connection(("127.0.0.1", port), 0.3).close()
            return
        except OSError:
            time.sleep(0.25)
    raise SystemExit("http server 未就绪")


def cache_count(pg):
    return pg.evaluate("""async () => { let n = 0;
        for (const k of await caches.keys()) { const c = await caches.open(k); n += (await c.keys()).length; }
        return n }""")


server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
    cwd=DIST, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    ready()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        ctx = browser.new_context()
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))

        # ---------- 1. 不点任何按钮，install 自动预缓存核心包 ----------
        pg.goto(B + "index.html", wait_until="networkidle", timeout=90000)
        t0 = time.time()
        n = 0
        while time.time() - t0 < 60:
            n = cache_count(pg)
            if n >= CORE_MIN:
                break
            pg.wait_for_timeout(1000)
        print(f"[i] 自动预缓存 {n} 个文件（{time.time() - t0:.0f}s，未点按钮）")
        assert n >= CORE_MIN, f"install 应自动缓存核心包（≥{CORE_MIN} 个），实际 {n}"
        assert "✓" in pg.locator("#offlineBtn").inner_text(), "按钮应显示已缓存状态"

        # ---------- 2. 状态面板 ----------
        pg.locator("#offlineBtn").click()
        pg.wait_for_timeout(600)
        core = pg.locator(".of-core").inner_text()
        pdf = pg.locator(".of-pdf").inner_text()
        size = pg.locator(".of-size").inner_text()
        print(f"[i] 面板：核心={core!r} PDF={pdf!r} 占用={size!r}")
        assert "✓" in core, f"核心页面应显示已完成，实际 {core!r}"
        assert "未缓存" in pdf, f"PDF 默认应未缓存，实际 {pdf!r}"
        assert "MB" in size and "不含 PDF" in size, f"占用应标注不含 PDF，实际 {size!r}"
        assert pg.locator("#offlinePanel.show").count() == 1, "点按钮应展开面板"

        # ---------- 3. 断网：打开在线时从未访问过的页面 ----------
        ctx.set_offline(True)
        pg.wait_for_timeout(500)
        assert pg.locator("#netBar").count() == 1, "断网应出现状态条"
        print(f"[i] 断网状态条：{pg.locator('#netBar').inner_text()!r}")
        for name, sel, least in [("sentences.html", ".sc-turn", 40), ("vocab.html", ".en-word", 40),
                                 ("phonetics.html", ".ph-row", 45), ("sections.html", ".sc-scene", 10)]:
            pg.goto(B + name, wait_until="domcontentloaded", timeout=30000)
            pg.wait_for_timeout(800)
            got = pg.locator(sel).count()
            print(f"[i] 离线 {name}: {got} × {sel}")
            assert got >= least, f"断网时 {name} 应正常渲染（≥{least}），实际 {got}"

        # ---------- 4. 下载全部（含 PDF） ----------
        ctx.set_offline(False)
        pg.goto(B + "index.html", wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(1000)
        pg.locator("#offlineBtn").click()
        pg.wait_for_timeout(400)
        pg.locator(".of-go").click()
        t0 = time.time()
        while time.time() - t0 < 120:
            if "✓" in pg.locator("#offlineBtn").inner_text() or "失败" in pg.locator("#offlineBtn").inner_text():
                break
            pg.wait_for_timeout(1000)
        print(f"[i] 下载全部 {time.time() - t0:.0f}s → {pg.locator('#offlineBtn').inner_text()!r}")
        assert "✓ 离线可用" in pg.locator("#offlineBtn").inner_text(), "下载全部后应显示「✓ 离线可用」"
        assert "6.5 MB ✓" in pg.locator(".of-pdf").inner_text(), "PDF 应显示已缓存"

        # ---------- 5. 断网看 PDF 页 ----------
        ctx.set_offline(True)
        pg.goto(B + "pdf.html", wait_until="domcontentloaded", timeout=30000)
        pg.wait_for_timeout(600)
        assert pg.locator("iframe").count() == 1, "断网时 pdf.html 应仍有阅读器 iframe"
        ctx.set_offline(False)
        ctx.close()
        browser.close()

    assert not errs, f"有 pageerror：{errs[:3]}"
    print("[✓] B2 离线包（自动预缓存 + 面板 + 断网可用 + 下载全部）全部通过")
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except Exception:
        server.kill()
