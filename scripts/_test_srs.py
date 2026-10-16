# -*- coding: utf-8 -*-
"""验证 A3 场景级 Leitner SRS 复习队列（review.html + 首页/导览入口 + done→入盒 + 迁移）。
用法（需 anaconda 解释器，仅它有 playwright）：
  /Users/Jack/opt/anaconda3/bin/python3 scripts/_test_srs.py
"""
import os
import socket
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
B = "http://127.0.0.1:8652/"
PORT = 8652

# 种子：1.1.1（盒1·今日到期）、3.1.1（盒3·今日到期）、2.1.1（盒2·3天后·未到）
SEED = """
(() => {
  const now = Date.now(); const DAY = 86400000;
  localStorage.setItem('englishheft_srs', JSON.stringify({
    '1.1.1': { b: 1, d: now - 1000 },
    '2.1.1': { b: 2, d: now + 3 * DAY },
    '3.1.1': { b: 3, d: now - 5000 },
  }));
  localStorage.setItem('englishheft_done', JSON.stringify(['1.1.1','2.1.1','3.1.1']));
})();
"""
# 迁移场景：只 seed done、不 seed srs → 页面加载时 srsMigrate 应把 done 场景入盒 1
SEED_MIG = """
(() => {
  localStorage.setItem('englishheft_srs', '{}');
  localStorage.setItem('englishheft_done', JSON.stringify(['1.1.2']));
})();
"""

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

        # ---------- Context 1：主 SRS 机制 ----------
        ctx = browser.new_context()
        ctx.add_init_script(SEED)
        pg = ctx.new_page()
        pg.on("console", lambda m: console_errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: console_errs.append(f"pageerror: {e}"))

        # 首页复习卡：今日到期 2
        pg.goto(B + "index.html", wait_until="networkidle", timeout=90000)
        pg.wait_for_timeout(200)
        card = pg.evaluate("""() => {
            const a = [...document.querySelectorAll('.en-card')].find(x => x.getAttribute('href') === 'review.html');
            return a ? a.querySelector('.en-card-num').textContent : null;
        }""")
        print(f"[i] 首页复习卡 num = {card!r}")
        assert card and "2" in card and "到期" in card, f"首页复习卡应显示「2 场景今日到期」，实际 {card!r}"

        # 大类导览：复习入口今日到期 2
        pg.goto(B + "sections.html", wait_until="networkidle")
        pg.wait_for_timeout(200)
        entry = pg.evaluate("""() => {
            const a = document.querySelector('.rev-entry');
            return a ? a.textContent : null;
        }""")
        print(f"[i] 导览复习入口 = {entry!r}")
        assert entry and "2" in entry and "到期" in entry, f"导览复习入口应显示「2 场景今日到期」，实际 {entry!r}"

        # review.html：2 张到期卡、头部计数、自评按钮、词/句渲染
        pg.goto(B + "review.html", wait_until="networkidle")
        pg.wait_for_timeout(300)
        n_due = pg.locator(".rev-card").count()
        print(f"[i] review.html 到期场景卡 = {n_due}")
        assert n_due == 2, f"应渲染 2 张到期卡（1.1.1 / 3.1.1），实际 {n_due}"
        has_211 = pg.evaluate("""() => !!document.querySelector('.rev-card[data-sceneno="2.1.1"]')""")
        assert not has_211, "未到期的 2.1.1 不应出现在复习队列"
        head = pg.evaluate("""() => document.querySelector('.rev-head .prog-head').textContent""")
        print(f"[i] review 头部 = {head.strip()!r}")
        assert "今日到期" in head and "2" in head, f"头部应含「今日到期 2」，实际 {head!r}"
        n_keep = pg.locator(".rev-keep").count()
        n_forget = pg.locator(".rev-forget").count()
        assert n_keep == 2 and n_forget == 2, f"每卡应有记住/又忘按钮（keep={n_keep}, forget={n_forget}）"
        n_words = pg.locator(".rev-card .en-word").count()
        n_sents = pg.locator(".rev-card .s-de").count()
        print(f"[i] 复习卡内 词条={n_words} 英文句={n_sents}")
        assert n_words > 0 and n_sents > 0, "复习卡应渲染词条与场景句"

        # 记住（升盒）：1.1.1 → 盒2，队列 2→1
        pg.locator('.rev-card[data-sceneno="1.1.1"] .rev-keep').click()
        pg.wait_for_timeout(200)
        s1 = pg.evaluate("""() => JSON.parse(localStorage.getItem('englishheft_srs'))['1.1.1']""")
        print(f"[i] 记住后 1.1.1 = {s1}")
        assert s1 and s1["b"] == 2, f"记住后 1.1.1 应升盒 1→2，实际 {s1}"
        n2 = pg.locator(".rev-card").count()
        assert n2 == 1, f"记住 1.1.1 后队列应剩 1 张（3.1.1），实际 {n2}"

        # 又忘（回盒1）：3.1.1 → 盒1（明日到期，今日出队），队列 1→0（空态）
        pg.locator('.rev-card[data-sceneno="3.1.1"] .rev-forget').click()
        pg.wait_for_timeout(200)
        s3 = pg.evaluate("""() => JSON.parse(localStorage.getItem('englishheft_srs'))['3.1.1']""")
        print(f"[i] 又忘后 3.1.1 = {s3}")
        assert s3 and s3["b"] == 1, f"又忘后 3.1.1 应回盒 1，实际 {s3}"
        n3 = pg.locator(".rev-card").count()
        empty = pg.evaluate("""() => !!document.querySelector('.rev-empty')""")
        print(f"[i] 又忘后 队列卡={n3} 空态={empty}")
        assert n3 == 0 and empty, f"又忘 3.1.1 后今日队列应为空并显示空态，实际 n3={n3} empty={empty}"
        ctx.close()

        # ---------- Context 2：done→入盒 + 一次性迁移 ----------
        ctx2 = browser.new_context()
        ctx2.add_init_script(SEED_MIG)  # done=[1.1.2]，srs={} → 迁移应入 1.1.2 盒1
        pg2 = ctx2.new_page()
        pg2.on("console", lambda m: console_errs.append(m.text) if m.type == "error" else None)
        pg2.on("pageerror", lambda e: console_errs.append(f"pageerror: {e}"))
        pg2.goto(B + "index.html", wait_until="networkidle")
        pg2.wait_for_timeout(200)
        mig = pg2.evaluate("""() => JSON.parse(localStorage.getItem('englishheft_srs'))['1.1.2']""")
        print(f"[i] 迁移后 1.1.2 = {mig}")
        assert mig and mig["b"] == 1, f"迁移应把已学 1.1.2 入盒 1，实际 {mig}"
        ctx2.close()

        # Context 3：done 切换实时入/出队列（1.1.2 不在 srs）
        ctx3 = browser.new_context()
        ctx3.add_init_script(SEED)
        pg3 = ctx3.new_page()
        pg3.on("console", lambda m: console_errs.append(m.text) if m.type == "error" else None)
        pg3.on("pageerror", lambda e: console_errs.append(f"pageerror: {e}"))
        pg3.goto(B + "vocab.html", wait_until="networkidle")
        pg3.wait_for_timeout(300)
        pg3.evaluate("""() => localStorage.setItem('englishheft_srs', '{}')""")  # 清空，避免迁移干扰
        no = pg3.evaluate("""() => document.querySelector('.sc-scene[data-sceneno="1.1.2"]').dataset.sceneno""")
        assert no == "1.1.2", f"vocab 默认视图应有 1.1.2 场景卡，实际 {no!r}"
        pg3.locator('.sc-scene[data-sceneno="1.1.2"] .sc-done').click()
        pg3.wait_for_timeout(150)
        e1 = pg3.evaluate("""() => JSON.parse(localStorage.getItem('englishheft_srs'))['1.1.2']""")
        print(f"[i] 标记已学后 1.1.2 = {e1}")
        assert e1 and e1["b"] == 1, f"标记已学应入盒 1，实际 {e1}"
        pg3.locator('.sc-scene[data-sceneno="1.1.2"] .sc-done').click()
        pg3.wait_for_timeout(150)
        e2 = pg3.evaluate("""() => JSON.parse(localStorage.getItem('englishheft_srs'))['1.1.2']""")
        print(f"[i] 取消已学后 1.1.2 = {e2}")
        assert e2 is None, f"取消已学应移出队列，实际 {e2}"
        ctx3.close()

        browser.close()

    real = [e for e in console_errs if "speechSynthesis" not in e.lower() and "voice" not in e.lower()]
    print(f"[i] console errors (filtered): {len(real)}")
    for e in real[:10]:
        print("   ERR:", e[:160])
    assert not real, f"有 {len(real)} 个未预期 console error"
    print("[✓] A3 场景级 Leitner SRS 复习队列 全部通过")
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except Exception:
        server.kill()
