import re, json, sys
from playwright.sync_api import sync_playwright
LANG = sys.argv[1]
B = "http://127.0.0.1:8811/index.html"
ids = [x["id"] for x in json.load(open("/home/claude/repo/darslar/index.json"))]
bad = []
JS = r"""() => { const c = document.querySelector('#view').cloneNode(true);
  c.querySelectorAll('.katex, .katex-display').forEach(k => k.remove());
  return { txt: c.textContent, kerr: document.querySelectorAll('.katex-error').length,
           imgs: [...document.querySelectorAll('#view img')].length }; }"""
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    c = br.new_context(viewport={"width": 390, "height": 844})
    c.route(re.compile(r"^https?://(?!127\.0\.0\.1).*"), lambda r: r.abort())
    c.add_init_script(f"localStorage.setItem('gre:lang', JSON.stringify('{LANG}'))")
    pg = c.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    for id in ids:
        for b in ["nazariya", "lugat", "masalalar", "test", "mustaqil"]:
            pg.goto(f"{B}?dars={id}&bolim={b}")
            try: pg.wait_for_selector("#view .card:not(.muted), #view .search", timeout=8000)
            except Exception: bad.append((id, b, "yuklanmadi")); continue
            if b == "test":
                pg.click('.opt[data-k="0"]'); pg.wait_for_selector("#nx")
            r = pg.evaluate(JS)
            t = r["txt"]
            if r["kerr"]: bad.append((id, b, f"katex-error {r['kerr']}"))
            m = re.search(r".{0,30}(\$|\\(frac|mathrm|vec|cdot|alpha|Delta|sqrt|text)).{0,30}", t)
            if m: bad.append((id, b, "xom LaTeX: " + m.group(0)))
            if LANG == "en":
                t2 = t.replace("@GREPhysicsUzInnovation", "")
                m = re.search(r".{0,30}[А-Яа-яЁё].{0,30}", t2)
                if m: bad.append((id, b, "EN da kirill: " + m.group(0)))
                m = re.search(r".{0,30}\b(va|ning|uchun|bilan|toping|bo'lgan|qiymati)\b.{0,30}", t2)
                if m: bad.append((id, b, "EN da o'zbekcha: " + m.group(0)))
            if LANG == "ru":
                m = re.search(r".{0,30}\b(toping|bo'lgan|qiymati|nechta|ning)\b.{0,30}", t)
                if m: bad.append((id, b, "RU da o'zbekcha: " + m.group(0)))
    br.close()
json.dump({"lang": LANG, "bad": bad, "errs": errs[:20]}, open(f"/home/claude/tests/ba_{LANG}.json", "w"), ensure_ascii=False, indent=1)
print(LANG, "sahifalar:", len(ids) * 5, "muammo:", len(bad), "JS xato:", len(errs))
