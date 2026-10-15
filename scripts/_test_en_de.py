# -*- coding: utf-8 -*-
"""验证 #77 场景句「德文对照 + 逐词 IPA + de-DE 朗读」试点（Section 1）。
用法（需 anaconda 解释器，仅它有 playwright）：
  cd dist && python3 -m http.server 8651 --bind 127.0.0.1 &
  /Users/Jack/opt/anaconda3/bin/python3 scripts/_test_en_de.py
"""
import os
import socket
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
B = "http://127.0.0.1:8651/"
PORT = 8651

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
        browser = p.chromium.launch()
        pg = browser.new_page()
        pg.on("console", lambda m: console_errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: console_errs.append(f"pageerror: {e}"))

        pg.goto(B + "sentences.html", wait_until="networkidle", timeout=90000)
        pg.wait_for_timeout(300)

        n_deu = pg.locator(".s-deu").count()
        print(f"[i] .s-deu elements in DOM (Part 1.1): {n_deu}")
        assert n_deu > 0, "应渲染出德文对照行（Section 1 有 EN_DE 数据）"

        # 默认 show-de 关：德文行应隐藏
        disp_off = pg.evaluate(
            "() => getComputedStyle(document.querySelector('.s-deu')).display")
        print(f"[i] 默认（关）.s-deu display = {disp_off!r}")
        assert disp_off == "none", f"默认应隐藏德文行，实际 {disp_off}"

        # 打开「🇩🇪 德语对照」
        pg.click("#deToggle")
        pg.wait_for_timeout(150)
        has_show_de = pg.evaluate("() => document.querySelector('#app').classList.contains('show-de')")
        disp_on = pg.evaluate(
            "() => getComputedStyle(document.querySelector('.s-deu')).display")
        n_ipa = pg.locator(".deu-ipa").count()
        n_w = pg.locator(".deu-w").count()
        n_speak = pg.locator(".s-speak-de").count()
        first_text = pg.evaluate("() => document.querySelector('.s-deu').textContent")
        print(f"[i] show-de={has_show_de}  .s-deu display={disp_on!r}")
        print(f"[i] .deu-w={n_w}  .deu-ipa={n_ipa}  .s-speak-de={n_speak}")
        print(f"[i] 首句德文: {first_text.strip()[:80]!r}")
        assert has_show_de, "点击后 #app 应带 show-de 类"
        assert disp_on != "none", "打开后德文行应可见"
        assert n_w > 0, "应有逐词 span"
        assert n_ipa > 0, "应有逐词 IPA"
        assert n_speak > 0, "应有德语朗读按钮"
        assert "wie" in first_text or "Uhr" in first_text, "首句应含德语内容"

        # de-DE 朗读函数存在
        fn = pg.evaluate("() => typeof window.__enSpeakDe === 'function'")
        assert fn, "window.__enSpeakDe 应为函数"

        # 切到其它无数据的 Part 不应报错（EN_DE 未命中 → 不渲染德文行，仍正常显示英文）
        # Section 2 的 chip
        pg.goto(B + "sentences.html", wait_until="networkidle")
        pg.wait_for_timeout(200)
        # 点第二个 Section tab（17 个大类的第 2 个）
        pg.evaluate("() => { const t=document.querySelectorAll('.sc-tabs .chip')[1]; if(t) t.click(); }")
        pg.wait_for_timeout(300)
        n2 = pg.locator(".s-deu").count()
        print(f"[i] Section 2（无德文数据）.s-deu 数量 = {n2}")
        # 允许为 0（无数据）；关键是不报错、英文仍在
        n_en = pg.locator(".sc-turn-body .s-de").count()
        print(f"[i] Section 2 英文句行数 = {n_en}")
        assert n_en > 0, "无德文数据的 Part 仍应正常渲染英文句"

        browser.close()

    real = [e for e in console_errs if "speechSynthesis" not in e.lower()
            and "voice" not in e.lower()]
    print(f"[i] console errors (filtered): {len(real)}")
    for e in real[:10]:
        print("   ERR:", e[:160])
    assert not real, f"有 {len(real)} 个未预期 console error"
    print("[✓] #77 德文对照 + 逐词 IPA + de-DE 朗读 全部通过")
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except Exception:
        server.kill()
