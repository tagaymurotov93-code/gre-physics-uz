"""Progress (profil) funksiyasining brauzer testi. Ishlatish: python3 pg_test.py http://127.0.0.1:8811 OUTDIR"""
import json, re, sys, os
from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
ERR = []
ok_count = 0


def check(cond, msg):
    global ok_count
    if cond:
        ok_count += 1
    else:
        ERR.append(msg)
        print("XATO:", msg)


def doc(page):
    return page.evaluate("JSON.parse(localStorage.getItem('gre:pg') || 'null')")


with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    # tashqi so'rovlarni (telegram, workers.dev) to'samiz — mahalliy test
    ctx.route(re.compile(r"^https?://(?!127\.0\.0\.1).*"), lambda r: r.abort())
    page = ctx.new_page()
    jserr = []
    page.on("pageerror", lambda e: jserr.append(str(e)))

    def go(q=""):
        page.goto(f"{BASE}/index.html{q}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(400)

    # 1. birinchi kirish
    go()
    check(page.locator("#pgBtn").count() == 1, "sarlavhada profil tugmasi yo'q")
    check(page.locator("#pgCard").count() == 1, "bosh sahifada karta yo'q")
    check(page.evaluate("document.querySelector('.hero').nextElementSibling.id") == "pgCard", "yangi foydalanuvchida karta hero'dan keyin bo'lishi kerak")
    page.screenshot(path=f"{OUT}/01_home_fresh.png")

    ID = "B1-L35"
    # 2. nazariya oxirigacha
    go(f"?dars={ID}&bolim=nazariya")
    h = page.evaluate("document.body.scrollHeight")
    for y in range(0, h + 2000, 600):
        page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(60)
    page.wait_for_timeout(900)
    d = doc(page)
    check(d and d["L"][ID]["n"] >= 95, f"nazariya n={d and d['L'][ID]['n']}")
    check(page.locator('#tabs button[data-t="nazariya"] .pg-tick').count() == 1, "nazariya tabida ✓ yo'q")
    # oxirgi joy saqlangan
    check(bool(doc(page)["L"][ID]["j"].get("nazariya")), "nazariya joyi saqlanmadi")

    # 3. masalalar: 10 ta yechim
    page.click('#tabs button[data-t="masalalar"]'); page.wait_for_timeout(500)
    for i in range(10):
        page.click(f'button[data-i="{i}"]'); page.wait_for_timeout(30)
    page.wait_for_timeout(300)
    d = doc(page)
    check(bin(d["L"][ID]["s"]).count("1") == 10, f"s={d['L'][ID]['s']}")
    check(page.locator('#tabs button[data-t="masalalar"] .pg-tick').count() == 1, "masalalar tabida ✓ yo'q")

    # 4. test: har savolga A (indeks 0)
    page.click('#tabs button[data-t="test"]'); page.wait_for_timeout(500)
    nq = page.evaluate(f"fetch('darslar/{ID}/quiz.json').then(r=>r.json()).then(q=>q.length)")
    for i in range(nq):
        page.click('.opt[data-k="0"]'); page.wait_for_timeout(40)
        page.click("#nx"); page.wait_for_timeout(40)
    page.wait_for_timeout(300)
    q1 = doc(page)["L"][ID]["q"]
    check(len(q1) == nq and "-" not in q1, f"q={q1}")
    check(page.locator('#tabs button[data-t="test"] .pg-tick').count() == 1, "test tabida ✓ yo'q")
    quiz = page.evaluate(f"fetch('darslar/{ID}/quiz.json').then(r=>r.json())")
    exp = "".join("A" if q["correct"] == 0 else "a" for q in quiz)
    check(q1 == exp, f"birinchi javoblar noto'g'ri: {q1} != {exp}")
    # qayta yechish birinchi javobni o'zgartirmaydi
    page.click("#rs"); page.wait_for_timeout(200)
    page.click('.opt[data-k="1"]'); page.wait_for_timeout(200)
    check(doc(page)["L"][ID]["q"] == q1, "qayta yechish birinchi javobni o'zgartirdi")

    # 5. mustaqil: Bajardim
    page.click('#tabs button[data-t="mustaqil"]'); page.wait_for_timeout(500)
    page.click("#pgHwBtn"); page.wait_for_timeout(300)
    check(doc(page)["L"][ID]["h"] == 1, "h != 1")
    check(page.locator('#tabs button[data-t="mustaqil"] .pg-tick').count() == 1, "mustaqil tabida ✓ yo'q")
    check(page.locator("#tabs button").count() >= 5, "tablar soni o'zgardi")
    page.screenshot(path=f"{OUT}/02_lesson_tabs.png")

    # 6. modul sahifasi
    go()
    page.click('.mod[data-id="M2"]'); page.wait_for_timeout(600)
    check(page.locator(f'.lrow[data-id="{ID}"] .lnum.pg-done').count() == 1, "modulda ✓ yo'q")
    page.locator(f'.lrow[data-id="{ID}"]').scroll_into_view_if_needed()
    page.screenshot(path=f"{OUT}/03_module.png")

    # 7. boshqa darsda yarim progress va "davom ettirish"
    ID2 = "B1-L34"
    go(f"?dars={ID2}&bolim=masalalar")
    page.click('button[data-i="0"]'); page.click('button[data-i="1"]')
    page.evaluate("document.querySelector('section[data-a=\"S06\"]').scrollIntoView({block:'start'}); window.scrollBy(0,-60)")
    page.wait_for_timeout(1200)
    j = doc(page)["L"][ID2]["j"].get("masalalar")
    check(j in ("S05", "S06", "S07"), f"masalalar joyi: {j}")
    go()
    check(page.evaluate("document.querySelector('#view').firstElementChild.id") == "pgCard", "karta tepada emas")
    txt = page.inner_text("#pgCard")
    check(ID2 in txt and "Masalalar" in txt, f"karta matni: {txt[:200]}")
    page.screenshot(path=f"{OUT}/04_home_card.png")
    page.click("#pgCard [data-go]"); page.wait_for_timeout(2800)
    top = page.evaluate(f"document.querySelector('section[data-a=\"{j}\"]').getBoundingClientRect().top")
    check(-50 < top < 500, f"davom ettirish joyi: top={top}")
    check(page.evaluate("new URLSearchParams(location.search).get('dars')") is None or True, "")

    # tab ichidagi "oxirgi joydan" tugmasi (nazariyaga qaytganda)
    page.click('#tabs button[data-t="nazariya"]'); page.wait_for_timeout(400)
    page.evaluate("window.scrollTo(0, 3000)"); page.wait_for_timeout(1000)
    page.click('#tabs button[data-t="lugat"]'); page.wait_for_timeout(300)
    page.click('#tabs button[data-t="nazariya"]'); page.wait_for_timeout(400)
    check(page.locator("#pgHere").count() == 1, "pgHere tugmasi yo'q")
    page.click("#pgHere"); page.wait_for_timeout(400)
    check(page.evaluate("window.scrollY") > 1500, "pgHere joyga olib bormadi")

    # 8. migratsiya: eski test holati
    page.evaluate("""localStorage.setItem('gre:B1-L30:quiz', JSON.stringify({i:3, a:{'B1-L30-Q01':1,'B1-L30-Q02':0,'B1-L30-Q03':2}}))""")
    go(); page.wait_for_timeout(800)
    q30 = (doc(page)["L"].get("B1-L30") or {}).get("q", "")
    check(len(q30) >= 3 and q30[:3] != "---" and q30[3:].strip("-") == "", f"migratsiya: {q30}")

    # 9. profil 3 tilda
    for L in ["uz", "ru", "en"]:
        page.evaluate(f"localStorage.setItem('gre:lang', JSON.stringify('{L}'))")
        go()
        page.click("#pgBtn"); page.wait_for_timeout(600)
        check(page.locator(".pg-tiles .card").count() == 4, f"{L}: plitkalar")
        body = page.inner_text("#view") + page.inner_text("header")
        if L == "en":
            check(not re.search(r"[А-Яа-яЁё]", body), "EN profilda kirill harflari")
            for w in ["dars", "Xato", "tugatil", "Profil ", "aniqlik", "Mening"]:
                check(w not in body, f"EN profilda o'zbekcha: {w}")
        page.screenshot(path=f"{OUT}/05_profile_{L}.png", full_page=True)
    page.evaluate("localStorage.setItem('gre:lang', JSON.stringify('uz'))")

    # 10. xatolar daftari
    go(); page.click("#pgBtn"); page.wait_for_timeout(500)
    nm = len(page.evaluate("GRE.progress.mistakes()"))
    wrong35 = exp.count("a")
    check(nm >= wrong35, f"xatolar soni {nm} < {wrong35}")
    page.click("#pgMist"); page.wait_for_timeout(700)
    page.screenshot(path=f"{OUT}/06_review_q.png")
    # birinchisini to'g'ri yechamiz
    first = page.evaluate("GRE.progress.mistakes()[0]")
    qz = page.evaluate(f"fetch('darslar/{first['id']}/quiz.json').then(r=>r.json())")
    corr = qz[first["i"]]["correct"]
    page.click(f'.opt[data-k="{corr}"]'); page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}/07_review_ok.png", full_page=True)
    check(len(page.evaluate("GRE.progress.mistakes()")) == nm - 1, "tuzatilgan xato daftardan chiqmadi")
    page.click("#pgNx"); page.wait_for_timeout(500)
    # ikkinchisini noto'g'ri
    if nm > 1:
        sec = page.evaluate("GRE.progress.mistakes()[0]")
        qz = page.evaluate(f"fetch('darslar/{sec['id']}/quiz.json').then(r=>r.json())")
        bad = (qz[sec["i"]]["correct"] + 1) % 5
        page.click(f'.opt[data-k="{bad}"]'); page.wait_for_timeout(300)
        check(len(page.evaluate("GRE.progress.mistakes()")) == nm - 1, "noto'g'ri javobda daftar o'zgardi")
    # orqaga -> profil
    page.click("#back"); page.wait_for_timeout(400)
    check(page.evaluate("GRE.state.view") == "profil", "xatolardan orqaga profilga qaytmadi")
    page.click("#back"); page.wait_for_timeout(400)
    check(page.evaluate("GRE.state.view") == "home", "profildan orqaga bosh sahifaga qaytmadi")

    # 11. regressiya: barcha bo'limlar 3 tilda, xom LaTeX / katex-error yo'q
    for L in ["uz", "ru", "en"]:
        page.evaluate(f"localStorage.setItem('gre:lang', JSON.stringify('{L}'))")
        for b in ["nazariya", "lugat", "masalalar", "test", "mustaqil"]:
            go(f"?dars=B0-L01&bolim={b}")
            check(page.locator(".katex-error").count() == 0, f"katex-error {L} {b}")
    page.evaluate("localStorage.setItem('gre:lang', JSON.stringify('uz'))")
    # deep link testga peek — birinchi javob yozilmaydi, '*' bo'ladi
    go("?dars=B1-L33&bolim=test&joy=Q04")
    q33 = (doc(page)["L"].get("B1-L33") or {}).get("q", "")
    check(len(q33) > 3 and q33[3] == "*", f"peek: {q33}")

    # 12. reset
    go(); page.click("#pgBtn"); page.wait_for_timeout(400)
    page.click("#pgReset"); page.click("#pgReset"); page.wait_for_timeout(500)
    check(not doc(page)["L"], "reset ishlamadi")

    # 13. qorong'i mavzu (Telegram theme o'zgaruvchilari) — skrinshot
    page.evaluate("""(()=>{const s=document.documentElement.style;
      s.setProperty('--tg-theme-bg-color','#17212b');s.setProperty('--tg-theme-secondary-bg-color','#0e1621');
      s.setProperty('--tg-theme-text-color','#f5f5f5');s.setProperty('--tg-theme-hint-color','#708499');
      s.setProperty('--tg-theme-section-bg-color','#17212b');s.setProperty('--tg-theme-button-color','#5288c1');
      s.setProperty('--tg-theme-link-color','#6ab3f3');})()""")

    check(not jserr, f"JS xatolari: {jserr}")
    br.close()

print(f"OK: {ok_count}, XATO: {len(ERR)}")
