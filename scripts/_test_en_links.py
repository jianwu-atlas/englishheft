# -*- coding: utf-8 -*-
"""验证英语站六项新功能（P0 Part 导航 + A/B 联动 + 搜索/进度/音素反查/Anki）。
用法（需 anaconda 解释器，仅它有 playwright）：
  cd dist && python3 -m http.server 8643 &
  /Users/Jack/opt/anaconda3/bin/python3 scripts/_test_en_links.py
"""
import os
import re
import socket
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
B = "http://127.0.0.1:8643/"

errs, res = [], []


def nav(pg, url, wait=250):
    pg.goto(url, wait_until="networkidle", timeout=90000)
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(wait)


def ready(port=8643):
    for _ in range(40):
        try:
            socket.create_connection(("127.0.0.1", port), 0.3).close()
            return
        except OSError:
            time.sleep(0.25)
    raise SystemExit("http server 未就绪")


server = subprocess.Popen(
    [sys.executable, "-m", "http.server", "8643", "--bind", "127.0.0.1"],
    cwd=DIST, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    ready()
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--no-sandbox"])
        pg = br.new_page()
        # 先加载一次，注销 SW 并清缓存，避免旧版离线清单接管页面
        pg.goto(B, wait_until="domcontentloaded", timeout=60000)
        pg.evaluate("""async () => {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const r of regs) { await r.unregister(); }
            const keys = await caches.keys();
            for (const k of keys) { await caches.delete(k); }
            return regs.length;
        }""")
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_timeout(300)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

        # ---------- P0：Part 二级导航 ----------
        nav(pg, B + "vocab.html")
        pg.evaluate("() => localStorage.clear()")
        pg.reload(wait_until="networkidle"); pg.wait_for_timeout(800)
        n_parts = pg.locator(".part-tabs .chip").count()
        res.append((f"词汇页 Part 导航存在（{n_parts} 个 Part）", n_parts >= 2))
        res.append(("初始 Part 1.1 高亮",
                    "on" in (pg.locator(".part-tabs .chip").first.get_attribute("class") or "")))
        n_sc0 = pg.locator(".sc-scene[data-sceneno]").count()
        pg.locator(".part-tabs .chip").nth(1).click(); pg.wait_for_timeout(700)
        n_sc1 = pg.locator(".sc-scene[data-sceneno]").count()
        first_no = pg.locator(".sc-scene[data-sceneno]").first.get_attribute("data-sceneno")
        res.append((f"切到 Part 1.2 后场景卡变化（{n_sc0} → {n_sc1}，首个 {first_no}）",
                    first_no.startswith("1.2")))
        res.append(("场景卡含互跳链接 sc-xlink", pg.locator(".sc-xlink").count() == n_sc1))
        res.append(("单词链接 en-wordlink 存在", pg.locator(".en-wordlink").count() > 10))

        # ---------- A：hash 场景级互跳（双向） ----------
        nav(pg, B + "vocab.html#sc-1-1-1")
        from playwright.sync_api import expect
        el = pg.locator('.sc-scene[data-sceneno="1.1.1"]')
        res.append(("vocab#sc-1-1-1 定位到 1.1.1 卡", el.count() == 1))
        try:
            expect(el, timeout=3000).to_have_class(".*flash.*")
            flashed = True
        except Exception:
            flashed = "flash" in (el.get_attribute("class") or "")
        res.append(("定位卡闪烁高亮（flash）", flashed))
        res.append(("Part 导航自动切到 1.1",
                    "on" in (pg.locator(".part-tabs .chip").first.get_attribute("class") or "")))
        nav(pg, B + "sentences.html#sc-1-1-1")
        el2 = pg.locator('.sc-scene[data-sceneno="1.1.1"]')
        try:
            expect(el2, timeout=3000).to_have_class(".*flash.*")
            flashed2 = True
        except Exception:
            flashed2 = "flash" in (el2.get_attribute("class") or "")
        res.append(("sentences#sc-1-1-1 定位成功", el2.count() == 1 and flashed2))
        res.append(("场景句页也有 sc-xlink（回词汇）", pg.locator(".sc-xlink").count() >= 1))

        # ---------- B：单词级联动 ----------
        nav(pg, B + "sentences.html?w=time#sc-1-1-1")
        banner = pg.locator(".wd-banner")
        res.append(("?w=time 出现单词横幅", banner.count() == 1))
        bt = re.sub(r"\s+", "", banner.inner_text()) if banner.count() else ""
        res.append((f"横幅含「10 句中命中 2 句」：{bt[:40]}", "10句中命中" in bt and "2句" in bt))
        n_hl = pg.locator("mark.wd-hl").count()
        res.append((f"高亮 mark.wd-hl ×{n_hl}", n_hl == 2))
        pg.locator("#wdClear").click(); pg.wait_for_timeout(600)
        res.append(("清除横幅后恢复", pg.locator(".wd-banner").count() == 0 and pg.locator("mark.wd-hl").count() == 0))

        # ---------- ① 全局单词搜索 ----------
        nav(pg, B + "vocab.html")
        pg.locator("#wordSearch").fill("time"); pg.wait_for_timeout(600)
        card = pg.locator(".sr-card")
        res.append(("搜索 time 出结果卡", card.count() == 1))
        ct = card.inner_text() if card.count() else ""
        res.append(("结果卡标题含「搜索 time」与命中数", "搜索 time" in ct and "/" in ct))
        n_rows = pg.locator(".sr-row").count()
        res.append((f"结果行 {n_rows} 条且均带定位按钮 sr-src",
                    n_rows > 0 and pg.locator(".sr-src").count() == n_rows))
        res.append(("sr-src 含 1.1.1（time 所在场景）", "1.1.1" in pg.locator(".sr-src", has_text="1.1.1").first.inner_text()
                    if pg.locator(".sr-src", has_text="1.1.1").count() else False))
        pg.locator(".sr-clear").click(); pg.wait_for_timeout(500)
        res.append(("退出搜索恢复场景列表", pg.locator(".sr-card").count() == 0))
        # 中文搜索
        pg.locator("#wordSearch").fill("时间"); pg.wait_for_timeout(600)
        res.append(("中文搜索「时间」有结果", pg.locator(".sr-row").count() > 0))
        pg.locator(".sr-clear").click(); pg.wait_for_timeout(400)

        # ---------- ④ Anki CSV 导出 ----------
        pg.evaluate("""() => {
            window.__anki = null;
            navigator.clipboard.writeText = t => { window.__anki = t; return Promise.resolve(); };
        }""")
        n_exp = pg.evaluate(
            "() => ENGLISH.sections[0].parts[0].scenes.reduce((a, sc) => a + sc.words.length, 0)")
        pg.locator("#copyPart").click(); pg.wait_for_timeout(500)
        anki = pg.evaluate("() => window.__anki") or ""
        rows = [r for r in anki.split("\n") if r]
        ok_fmt = bool(rows) and all(r.startswith('"') and '","' in r for r in rows)
        res.append((f"Anki 复制 {len(rows)} 行 = Part 1.1 全部词 {n_exp}", len(rows) == n_exp))
        res.append(("Anki 每行双字段 CSV（en,\"中文 pos [ipa] · 场景\"）", ok_fmt))
        res.append(("Anki 首行含场景号 1.1.1", "1.1.1" in (rows[0] if rows else "")))

        # ---------- ③ 音素反查 ----------
        nav(pg, B + "phonetics.html")
        n_ph = pg.locator(".ph-row").count()
        res.append((f"音素表行 {n_ph} 条", n_ph >= 40))
        pg.locator(".ph-row").first.click(); pg.wait_for_timeout(900)
        res.append(("点音素行跳到 vocab?ph=…", pg.url.startswith(B + "vocab.html?ph=")))
        pg.wait_for_selector(".sr-card .sr-row", timeout=8000)
        card2 = pg.locator(".sr-card")
        t2 = card2.inner_text() if card2.count() else ""
        res.append((f"音素过滤结果卡（{t2[:34].replace(chr(10), ' ')}）",
                    card2.count() == 1 and "音素" in t2 and pg.locator(".sr-row").count() > 0))

        # ---------- ② 进度打勾 ----------
        nav(pg, B + "vocab.html")
        b = pg.locator('.sc-scene[data-sceneno="1.1.1"] .sc-done')
        res.append(("场景卡有「标记已学」按钮", b.count() == 1 and "标记已学" in b.inner_text()))
        b.click(); pg.wait_for_timeout(400)
        res.append(("打勾后按钮变「✓ 已学」", "已学" in b.inner_text() and "on" in (b.get_attribute("class") or "")))
        n_done = pg.evaluate("() => (JSON.parse(localStorage.getItem('englishheft_done')||'[]')).length")
        res.append(("localStorage 记录 1 条", n_done == 1))
        nav(pg, B + "sections.html")
        ph_txt = pg.locator(".prog-card").inner_text()
        res.append((f"大类导览总进度（{ph_txt[:30]}）", "1 /" in ph_txt and "493" in ph_txt))
        badge = pg.locator(".prog-badge").first.inner_text()
        res.append((f"第 1 大类徽章 {badge.strip()}", badge.strip().startswith("1/")))
        res.append(("对应场景 chip 变绿 ✓",
                    pg.locator(".en-scene-chip.done").count() == 1))

        br.close()
finally:
    server.terminate()
    server.wait()

print("=== 英语站六项新功能验证（P0 Part 导航 + A/B 联动 + 搜索/进度/音素反查/Anki）===")
ok = True
for n, v in res:
    print(f"  {'✅' if v else '❌'} {n}")
    ok = ok and v
print("\nJS 错误:", errs[:4] if errs else "无 ✅")
sys.exit(0 if ok and not errs else 1)
