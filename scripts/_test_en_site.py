from playwright.sync_api import sync_playwright
import sys

B = "http://127.0.0.1:8641/"
errs, res = [], []
with sync_playwright() as p:
    br = p.chromium.launch(args=["--no-sandbox"])
    pg = br.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

    # 首页
    pg.goto(B + "index.html", wait_until="networkidle", timeout=90000); pg.wait_for_timeout(600)
    res.append((f"首页 6 张入口卡 {pg.locator('.en-card').count()} 个", pg.locator(".en-card").count() == 6))
    res.append((f"首页数字：{pg.locator('.en-hero-num').inner_text()}", pg.locator(".en-hero-num").inner_text().replace(",", "") == "7052"))

    # 词汇
    pg.goto(B + "vocab.html", wait_until="networkidle", timeout=90000); pg.wait_for_timeout(700)
    res.append((f"词汇页 Section {pg.locator('.sc-tabs .chip').count()} 个", pg.locator(".sc-tabs .chip").count() == 17))
    res.append((f"词条 {pg.locator('.en-word').count()} 个", pg.locator(".en-word").count() > 40))
    res.append(("三行齐全（en/ipa/zh）",
                pg.locator(".en-word .en-en").count() > 0 and pg.locator(".en-word .s-pron").count() > 0
                and pg.locator(".en-word .en-zh").count() > 0))
    pg.click("#hideZh"); pg.wait_for_timeout(400)
    res.append((f"隐藏中文生效", not pg.locator(".en-word .en-zh").first.is_visible()))
    pg.click("#hideZh"); pg.wait_for_timeout(300)
    pg.evaluate("() => { window.__sp=[]; speechSynthesis.speak = u => window.__sp.push(u.text); speechSynthesis.cancel=()=>{}; }")
    pg.locator(".en-word .s-speak").first.click(); pg.wait_for_timeout(300)
    sp = pg.evaluate("() => window.__sp")
    res.append((f"词条 🔊：{sp[:1]}", len(sp) > 0))
    pg.locator(".sc-tabs .chip").nth(2).click(); pg.wait_for_timeout(700)
    res.append((f"切 Section 后 {pg.locator('.sc-scene').count()} 场景", pg.locator(".sc-scene").count() > 3))

    # 场景句 + 解析
    pg.goto(B + "sentences.html", wait_until="networkidle", timeout=90000); pg.wait_for_timeout(700)
    n_s = pg.locator(".sc-turn").count()
    res.append((f"场景句 {n_s} 条", n_s > 10))
    n_note = pg.locator(".en-notes").count()
    res.append((f"带解析的句子 {n_note} 条", n_note > 0))
    res.append((f"解析行 {pg.locator('.en-note-line').count()} 条", pg.locator(".en-note-line").count() > 0))
    pg.click("#onlyNotes"); pg.wait_for_timeout(600)
    res.append((f"「只看有解析」后 {pg.locator('.sc-turn').count()} 条（应减少）", pg.locator(".sc-turn").count() < n_s))

    # 语音·音标
    pg.goto(B + "phonetics.html", wait_until="networkidle", timeout=90000); pg.wait_for_timeout(700)
    n_tbl = pg.locator(".ph-table").count()
    res.append((f"音素表 {n_tbl} 张（元音+辅音）", n_tbl == 2))
    n_row = pg.locator(".ph-table tbody tr").count()
    res.append((f"音素行 {n_row} 个", n_row >= 45))
    res.append((f"首个音素：{pg.locator('.ph-ipa').first.inner_text()}", pg.locator(".ph-ipa").count() > 0))

    # 大类导览
    pg.goto(B + "sections.html", wait_until="networkidle", timeout=90000); pg.wait_for_timeout(700)
    res.append((f"导览 {pg.locator('.sc-scene').count()} 个大类", pg.locator(".sc-scene").count() == 17))
    res.append((f"导语 {pg.locator('.en-intro').count()} 条", pg.locator(".en-intro").count() == 17))
    res.append((f"场景 chip {pg.locator('.en-scene-chip').count()} 个", pg.locator(".en-scene-chip").count() > 100))

    # 导航 + PWA
    pg.goto(B + "index.html", wait_until="networkidle", timeout=60000); pg.wait_for_timeout(500)
    res.append((f"导航 {pg.locator('.nav-links a').count()} 项", pg.locator(".nav-links a").count() == 7))
    sw = pg.evaluate("async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? (r.active?.state || 'reg') : 'none'; }")
    res.append((f"Service Worker：{sw}", sw in ("activated", "activating", "reg")))
    res.append((f"离线清单 {pg.evaluate('() => (window.__DH_SW_FILES || []).length')} 项",
                pg.evaluate("() => (window.__DH_SW_FILES || []).length") > 5))
    br.close()

print("\n=== Englishheft 站点验证 ===")
ok = True
for n, v in res:
    print(f"  {'✅' if v else '❌'} {n}"); ok = ok and v
print("\nJS 错误:", errs[:4] if errs else "无 ✅")
sys.exit(0 if ok and not errs else 1)
