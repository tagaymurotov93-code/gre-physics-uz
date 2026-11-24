import re, json
from playwright.sync_api import sync_playwright
B = "http://127.0.0.1:8811/index.html"; ERR = []; ok = 0
def check(c, m):
    global ok
    if c: ok += 1
    else: ERR.append(m); print("XATO:", m)
full = json.load(open("/home/claude/repo/darslar/lugat.json"))
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    c = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    c.route(re.compile(r"^https?://(?!127\.0\.0\.1).*"), lambda r: r.abort())
    pg = c.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(400)
    check(pg.locator("#lgEntry").count() == 1, "kirish tugmasi yo'q")
    check(pg.evaluate("document.querySelector('#lgEntry').nextElementSibling.classList.contains('mods')"), "tugma modullardan oldin emas")
    pg.screenshot(path="/home/claude/shots/20_home_lugat.png")
    pg.click("#lgEntry"); pg.wait_for_timeout(700)
    check(pg.locator(".lg-term").count() == 50, f"birinchi sahifa {pg.locator('.lg-term').count()}")
    check(str(len(full["t"])) in pg.inner_text(".lg-n"), "jami soni")
    pg.screenshot(path="/home/claude/shots/21_lugat.png")
    for q, must in [("tezlanish", "acceleration"), ("ускорение", "acceleration"), ("Acceleration", "acceleration"), ("Om qonuni", "Ohm"), ("o‘tkazgich", "conductor")]:
        pg.fill(".lg-q", q); pg.wait_for_timeout(400)
        txt = pg.inner_text("#lgList")
        check(must.lower() in txt.lower(), f"qidiruv «{q}» → «{must}» topilmadi")
    pg.fill(".lg-q", "qwertyzzz"); pg.wait_for_timeout(300)
    check(pg.locator(".lg-term").count() == 0, "bo'sh natija")
    pg.fill(".lg-q", "tok ishi"); pg.wait_for_timeout(300)
    pg.screenshot(path="/home/claude/shots/22_lugat_search.png")
    chip = pg.locator(".lg-d").first
    lid, gi = chip.get_attribute("data-id"), chip.get_attribute("data-i")
    chip.click(); pg.wait_for_timeout(900)
    check(pg.evaluate("GRE.state.view") == "lesson" and pg.evaluate("GRE.state.tab") == "lugat", "darsga o'tmadi")
    el = pg.locator(f'[data-a="g{gi}"]')
    check(el.count() == 1 and "joyflash" in (el.get_attribute("class") or ""), "atama yoritilmadi")
    g = json.load(open(f"/home/claude/repo/darslar/{lid}/glossary.json"))[int(gi)]
    check(g["uz"] in el.inner_text(), "boshqa atama ochildi")
    # ko'proq
    pg.goto(B + "?x=1"); pg.wait_for_load_state("networkidle"); pg.click("#lgEntry"); pg.wait_for_timeout(500)
    pg.fill(".lg-q", ""); pg.wait_for_timeout(300)
    pg.click("#lgMore"); pg.wait_for_timeout(300)
    check(pg.locator(".lg-term").count() == 100, "ko'proq ishlamadi")
    # EN rejimi
    pg.evaluate("localStorage.setItem('gre:lang', JSON.stringify('en'))"); pg.reload(); pg.wait_for_load_state("networkidle")
    pg.click("#lgEntry"); pg.wait_for_timeout(500)
    t = pg.inner_text("#view") + pg.inner_text("header")
    check(not re.search(r"[А-Яа-я]", t), "EN da kirill")
    check("atama" not in t and "Lug'at" not in t, "EN da o'zbekcha")
    pg.evaluate("localStorage.setItem('gre:lang', JSON.stringify('uz'))")
    # yangi dars lugat.json da yo'q holat: oxirgi darsni olib tashlab beramiz
    cut = dict(full); last = full["darslar"][-1]
    cut = {"v": 1, "darslar": full["darslar"][:-1], "t": [dict(x, d=[d for d in x["d"] if d[0] != last]) for x in full["t"]]}
    cut["t"] = [x for x in cut["t"] if x["d"]]
    c2 = br.new_context(viewport={"width": 390, "height": 844})
    c2.route(re.compile(r"^https?://(?!127\.0\.0\.1).*"), lambda r: r.abort())
    c2.route(re.compile(r".*/darslar/lugat\.json.*"), lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(cut)))
    p2 = c2.new_page(); p2.goto(B + "?x=2"); p2.wait_for_load_state("networkidle"); p2.click("#lgEntry"); p2.wait_for_timeout(900)
    n2 = p2.evaluate("document.querySelector('.lg-n').textContent")
    check(str(len(full["t"])) in n2, f"ish vaqtida qo'shish: {n2}")
    g0 = json.load(open(f"/home/claude/repo/darslar/{last}/glossary.json"))[0]["en"]
    p2.fill(".lg-q", g0); p2.wait_for_timeout(300)
    check(p2.locator(f'.lg-d[data-id="{last}"]').count() > 0, "yangi dars atamalari yo'q")
    check(not errs, f"JS: {errs}")
    br.close()
print(f"OK {ok}, XATO {len(ERR)}")
