from playwright.sync_api import sync_playwright
import sys

B = "http://127.0.0.1:8641/"
errs, res = [], []
with sync_playwright() as p:
    br = p.chromium.launch(args=["--no-sandbox"])
    pg = br.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

    # ---------- ① 音标三态（默认「常用」，蓝色强调） ----------
    pg.goto(B + "sentences.html", wait_until="networkidle", timeout=90000); pg.wait_for_timeout(900)
    res.append(("音标开关存在", pg.locator("#ipaToggle").count() == 1))
    res.append((f"默认档：{pg.locator('#ipaToggle').inner_text()}", "常用" in pg.locator("#ipaToggle").inner_text()))
    r0 = pg.locator("ruby.ipa").count()
    res.append((f"默认即标注（{r0} 处，无需点击）", r0 > 0))
    BASIC_JS = """() => {
        const BASIC = new Set(['a','an','the','is','are','of','in','to','at','we','will','can','my','i','you','it','that','this']);
        return [...document.querySelectorAll('ruby.ipa')]
          .filter(r => BASIC.has(String((r.firstChild && r.firstChild.nodeValue) || '').toLowerCase().trim())).length;
    }"""
    n_the = pg.evaluate(BASIC_JS)
    res.append((f"默认不标基础功能词（基础词标注 {n_the} 处）", n_the == 0))
    rt_color = pg.evaluate("""() => { const r = document.querySelector('ruby.ipa rt');
        return r ? getComputedStyle(r).color : ''; }""")
    res.append((f"音标为蓝色强调（{rt_color}）", rt_color == "rgb(0, 144, 214)"))

    pg.click("#ipaToggle"); pg.wait_for_timeout(700)
    lab1 = pg.locator("#ipaToggle").inner_text(); r1 = pg.locator("ruby.ipa").count()
    res.append((f"第二态：{lab1}（{r1} 处）", "全部" in lab1 and r1 > r0))
    res.append((f"「全部」比「常用」多标注 {r1 - r0} 处", r1 > r0))
    n_the_all = pg.evaluate(BASIC_JS)
    res.append((f"「全部」也标基础功能词（基础词标注 {n_the_all} 处）", n_the_all > 0))
    res.append(("「全部」挡按钮金色", "all" in (pg.locator("#ipaToggle").get_attribute("class") or "")))

    pg.click("#ipaToggle"); pg.wait_for_timeout(700)
    res.append((f"第三态：{pg.locator('#ipaToggle').inner_text()}（{pg.locator('ruby.ipa').count()} 处）",
                "关" in pg.locator("#ipaToggle").inner_text() and pg.locator("ruby.ipa").count() == 0))

    # ---------- ② 书本蓝色强调 ----------
    pg.click("#ipaToggle"); pg.wait_for_timeout(600)   # 回到「常用」，便于同时验证共存
    n_hl = pg.locator("mark.en-hl").count()
    res.append((f"蓝色强调 mark {n_hl} 个", n_hl > 0))
    if n_hl:
        t = pg.locator("mark.en-hl").first.inner_text()
        res.append((f"首个强调：「{t}」", len(t) > 1))
    res.append(("词表英文词为蓝色（.en-en 有蓝色变量）",
                pg.evaluate("() => getComputedStyle(document.querySelector('.en-word .en-en') || document.body).color") != ""))

    # ---------- ③ 中德对照 ----------
    pg.goto(B + "vocab.html", wait_until="networkidle", timeout=90000); pg.wait_for_timeout(900)
    res.append(("德语对照开关存在", pg.locator("#deToggle").count() == 1))
    n_de = pg.locator(".en-word .en-de").count()
    res.append((f"带德语对照的词条 {n_de} 个", n_de > 0))
    vis0 = pg.locator(".en-word .en-de").first.is_visible() if n_de else False
    res.append((f"默认隐藏（visible={vis0}）", not vis0))
    pg.click("#deToggle"); pg.wait_for_timeout(700)
    vis1 = pg.locator(".en-word .en-de").first.is_visible() if n_de else False
    res.append((f"开启后显示（visible={vis1}）", vis1))
    if n_de:
        res.append((f"样例：{pg.locator('.en-word .en-de').first.inner_text()[:30]}",
                    len(pg.locator(".en-word .en-de").first.inner_text()) > 3))
    pg.click("#deToggle"); pg.wait_for_timeout(500)
    res.append(("再次点击恢复隐藏", not pg.locator(".en-word .en-de").first.is_visible()))

    # ---------- 回归 ----------
    pg.goto(B + "index.html", wait_until="networkidle", timeout=60000); pg.wait_for_timeout(600)
    res.append((f"首页仍正常（{pg.locator('.en-card').count()} 卡）", pg.locator(".en-card").count() == 6))
    res.append(("音标开关在首页也在", pg.locator("#ipaToggle").count() == 1))
    br.close()

print("\n=== 英语站三项新功能验证 ===")
ok = True
for n, v in res:
    print(f"  {'✅' if v else '❌'} {n}"); ok = ok and v
print("\nJS 错误:", errs[:4] if errs else "无 ✅")
sys.exit(0 if ok and not errs else 1)
