"""Chiqarilgan darslarning ma'lumot sifati auditi (Mini App JSON).
Ishlatish: python3 audit.py <repo> <out.json>
"""
import json, re, sys, os, subprocess, collections

REPO, OUT = sys.argv[1], sys.argv[2]
D = lambda *p: os.path.join(REPO, *p)
LANGS = ("uz", "ru", "en")
MATH = re.compile(r"\$\$([\s\S]+?)\$\$|\$((?:[^$\\]|\\[\s\S])+?)\$")
CYR = re.compile(r"[А-Яа-яЁё]")
UZW = re.compile(r"(\b(va|ning|bilan|uchun|qanday|bo'lgan|bo'ladi|toping|nechaga|marta|qiymati|kuchi|tezligi)\b|o'|g')", re.I)
issues = []
tex_jobs = []


def add(lesson, item, kind, detail, sev="xato"):
    issues.append({"dars": lesson, "joy": item, "tur": kind, "tafsilot": detail, "daraja": sev})


def maths(s):
    return [m.group(1) if m.group(1) is not None else m.group(2) for m in MATH.finditer(s or "")]


def outside(s):
    return MATH.sub(" ", s or "")


def tex(lesson, item, s, display=False):
    for m in MATH.finditer(s or ""):
        d = m.group(1) is not None
        src = m.group(1) if d else m.group(2)
        tex_jobs.append({"l": lesson, "i": item, "t": src, "d": d or display})
        if re.search(r"(?<!\\)%", src):
            add(lesson, item, "math-foiz", f"$...$ ichida % (KaTeX izoh belgisi): {src[:60]}")


def tri(lesson, item, obj, need=LANGS, parity=True, kind_prefix=""):
    """Uch tilli blokni tekshirish: bo'sh emas, til aralashmagan, formulalar bir xil."""
    if not isinstance(obj, dict):
        add(lesson, item, "format", f"uch tilli blok emas: {str(obj)[:60]}"); return
    for L in need:
        if not str(obj.get(L) or "").strip():
            add(lesson, item, "tarjima-yo'q", f"{L} bo'sh")
    for L in LANGS:
        s = obj.get(L) or ""
        if s.count("$") % 2:
            add(lesson, item, "dollar", f"{L}: $ soni toq")
        tex(lesson, item, s)
        o = outside(s)
        if L in ("uz", "en") and CYR.search(o):
            add(lesson, item, "til-aralash", f"{L} matnida kirill: …{CYR.search(o).group(0)}… «{o.strip()[:70]}»")
        if L == "en" and UZW.search(o):
            w = UZW.search(o).group(0)
            if not re.search(r"\b[A-Za-z]*'[a-z]\b", w):
                add(lesson, item, "til-aralash", f"en matnida o'zbekcha belgi «{w}»: «{o.strip()[:80]}»", "ehtimol")
        if L == "ru" and len(re.sub(r"[^A-Za-zА-Яа-я]", "", o)) > 15 and not CYR.search(o):
            add(lesson, item, "til-aralash", f"ru matnida kirill yo'q: «{o.strip()[:70]}»")
    if parity and all(obj.get(L) for L in LANGS):
        c = {L: collections.Counter(re.sub(r"\\ |\\,|\s|=$", "", x) for x in maths(obj[L])) for L in LANGS}
        if not (c["uz"] == c["ru"] == c["en"]):
            diff = {L: sorted((c[L] - c["uz"]).elements())[:3] for L in ("ru", "en")}
            diffu = sorted(((c["ru"] | c["en"]) - c["uz"]).elements())[:3]
            miss = {L: sorted((c["uz"] - c[L]).elements())[:3] for L in ("ru", "en")}
            add(lesson, item, "formula-farq", f"uz↔ru/en formulalar farqi: ortiq {diff}, yetishmaydi {miss}", "ogohlantirish")


def steps_check(lesson, item, sol, rules):
    if not isinstance(sol, dict):
        add(lesson, item, "format", "yechim uch tilli emas"); return
    n = {L: len(sol.get(L) or []) for L in LANGS}
    if len(set(n.values())) != 1:
        add(lesson, item, "qadam-soni", f"qadamlar soni tillarda har xil: {n}")
    for k in range(min(n.values())):
        blk = {L: sol[L][k] for L in LANGS}
        tri(lesson, f"{item} {k+1}-qadam", blk)
        for L in LANGS:
            s = blk[L]
            j = s.find("$$")
            if j >= 0 and s[j + 2:].lstrip().startswith("["):
                add(lesson, f"{item} {k+1}-qadam", "display-[", "display formula [ bilan boshlanadi")
            if "**" in s:
                add(lesson, f"{item} {k+1}-qadam", "markdown", f"{L}: qadam matnida ** ")
    if rules is not None:
        if len(rules) != n["uz"]:
            add(lesson, item, "ramka-soni", f"rules {len(rules)} ≠ qadamlar {n['uz']}")
        for k, r in enumerate(rules):
            if r:
                tri(lesson, f"{item} {k+1}-ramka", r)


def fig_exists(lesson, item, path):
    if path and not os.path.exists(D("darslar", lesson, path)):
        add(lesson, item, "rasm-yo'q", path)


idx = json.load(open(D("darslar/index.json")))
M = json.load(open(D("moduller.json")))
plan = {p["id"]: p for m in M["modules"] for p in (m.get("plan") or [])}
all_q, all_s, all_h = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(list)
stats = {}

for Lsn in idx:
    lid = Lsn["id"]
    B1 = lid.startswith("B1")
    th = json.load(open(D("darslar", lid, "theory.json")))
    S = json.load(open(D("darslar", lid, "solved.json")))
    Q = json.load(open(D("darslar", lid, "quiz.json")))
    H = json.load(open(D("darslar", lid, "homework.json")))
    G = json.load(open(D("darslar", lid, "glossary.json")))
    stats[lid] = {"theory_chars": sum(len(b.get(L, "") or "") for b in th for L in LANGS), "S": len(S), "Q": len(Q), "H": len(H), "G": len(G)}
    # index va plan
    c = Lsn.get("counts", {})
    for k, v in (("solved", S), ("quiz", Q), ("homework", H), ("glossary", G)):
        if c.get(k) != len(v):
            add(lid, "index.json", "son-farq", f"{k}: index {c.get(k)} ≠ fayl {len(v)}")
    if lid in plan and plan[lid]["title"] != Lsn["title"]:
        add(lid, "moduller.json", "nom-farq", f"plan: {plan[lid]['title'].get('uz')} | index: {Lsn['title'].get('uz')}", "ogohlantirish")
    # nazariya
    for i, b in enumerate(th):
        it = f"nazariya n{i} ({b['t']})"
        if b["t"] in ("h1", "h2", "p", "li", "note"):
            tri(lid, it, b)
            if b["t"] == "h2" and any("$" in (b.get(L) or "") for L in LANGS):
                add(lid, it, "h2-formula", "sarlavhada $")
        elif b["t"] == "m":
            tex_jobs.append({"l": lid, "i": it, "t": b["m"], "d": True})
        elif b["t"] == "fig":
            for L, p in (b.get("src") or {}).items():
                fig_exists(lid, it, p)
            if b.get("cap"):
                tri(lid, it + " osti", b["cap"])
        elif b["t"] == "tbl":
            for k, r in enumerate(b["rows"]):
                tri(lid, f"{it} qator {k}", r)
                if r.get("m"):
                    tex_jobs.append({"l": lid, "i": f"{it} qator {k}", "t": r["m"], "d": False})
    # yechilgan masalalar
    for s in S:
        it = s["id"].split("-")[-1]
        tri(lid, it + " shart", s["statement"])
        steps_check(lid, it, s["solution"], s.get("rules") if B1 else None)
        if B1 and not any(s.get("rules") or []):
            add(lid, it, "ramka-yo'q", "yechimda yashil ramka yo'q")
        if not str(s.get("answer") or "").strip():
            add(lid, it, "javob-yo'q", "")
        else:
            tex_jobs.append({"l": lid, "i": it + " javob", "t": s["answer"], "d": False})
        tri(lid, it + " asos", s["basis"])
        fig_exists(lid, it, s.get("figure"))
        if B1 and not s.get("figure"):
            add(lid, it, "rasm-yo'q", "yechilgan masalada chizma yo'q", "ogohlantirish")
        all_s[re.sub(r"\s+", " ", s["statement"]["uz"]).strip()].append(f"{lid} {it}")
    # testlar
    letters = collections.Counter()
    for q in Q:
        it = q["id"].split("-")[-1]
        tri(lid, it + " savol", {"uz": q["question_uz"], "ru": q["question_ru"], "en": q["question_en"]})
        for L in LANGS:
            n = len(q["question_" + L])
            if n > 300:
                add(lid, it, "savol-uzun", f"{L}: {n} belgi (Telegram quiz ≤ 300)", "xato" if L == "uz" else "ogohlantirish")
        opts = q["options"]
        if len(opts) != 5:
            add(lid, it, "variantlar", f"{len(opts)} ta variant")
        if not (0 <= q["correct"] < len(opts)):
            add(lid, it, "to'g'ri-javob", f"correct={q['correct']}")
        letters["ABCDE"[q["correct"]]] += 1
        bodies = [re.sub(r"^\([A-E]\)\s*", "", o) for o in opts]
        if len(set(b.replace(" ", "") for b in bodies)) != len(bodies):
            add(lid, it, "variant-takror", f"bir xil variantlar: {bodies}")
        for k, o in enumerate(opts):
            if not o.startswith(f"({'ABCDE'[k]})"):
                add(lid, it, "variant-harf", o[:40], "ogohlantirish")
            tex(lid, f"{it} variant {'ABCDE'[k]}", o)
            if len(o) > 100:
                add(lid, it, "variant-uzun", f"{'ABCDE'[k]}: {len(o)} belgi (Telegram ≤ 100)")
            if CYR.search(outside(o)):
                add(lid, it, "variant-til", f"variantda kirill (Mini App tarjima qilmaydi): {o[:50]}")
        e = q["explanation_200"]
        if len(e) > 200:
            add(lid, it, "izoh-uzun", f"{len(e)} belgi")
        if e.count("\n") > 1:
            add(lid, it, "izoh-qator", f"{e.count(chr(10)) + 1} qator (Telegram ≤ 2)")
        if not e.startswith(f"To'g'ri: {'ABCDE'[q['correct']]}."):
            add(lid, it, "izoh-boshi", f"«{e[:20]}» ≠ To'g'ri: {'ABCDE'[q['correct']]}.")
        for ch in "^_\\$":
            if ch in e:
                add(lid, it, "izoh-latex", f"izohda «{ch}»: {e[:80]}")
                break
        dk = set(q.get("distractors") or {})
        need = set("ABCDE") - {"ABCDE"[q["correct"]]}
        if dk != need:
            add(lid, it, "distraktor-kalit", f"{sorted(dk)} ≠ {sorted(need)}")
        for k in dk:
            tri(lid, f"{it} tahlil {k}", {"uz": q["distractors"].get(k), "ru": (q.get("distractors_ru") or {}).get(k), "en": (q.get("distractors_en") or {}).get(k)}, parity=False)
            for ch in "^_\\$":
                if ch in (q["distractors"].get(k) or ""):
                    add(lid, f"{it} tahlil {k}", "distraktor-latex", q["distractors"][k][:60]); break
        steps_check(lid, it, q["full_solution"], q.get("rules") if B1 else None)
        if B1 and not any(q.get("rules") or []):
            add(lid, it, "ramka-yo'q", "test yechimida yashil ramka yo'q")
        fig_exists(lid, it, q.get("figure"))
        all_q[re.sub(r"\s+", " ", q["question_uz"]).strip()].append(f"{lid} {it}")
    if len(Q) == 15 and sorted(letters.values()) != [3, 3, 3, 3, 3]:
        add(lid, "test", "harf-taqsimot", dict(letters), "ogohlantirish")
    stats[lid]["letters"] = dict(letters)
    # mustaqil ish
    for h in H:
        it = h["id"].split("-")[-1]
        tri(lid, it, h["statement"])
        fig_exists(lid, it, h.get("figure"))
        all_h[re.sub(r"\s+", " ", h["statement"]["uz"]).strip()].append(f"{lid} {it}")
    # lug'at
    seen = {}
    for i, g in enumerate(G):
        it = f"lug'at g{i}"
        for L in LANGS:
            if not str(g.get(L) or "").strip():
                add(lid, it, "lug'at-bo'sh", f"{L} bo'sh: {g}")
        if CYR.search(g.get("en", "") + g.get("uz", "")):
            add(lid, it, "lug'at-til", str(g))
        if g.get("ru") and not CYR.search(g["ru"]) and len(g["ru"]) > 3 and not re.fullmatch(r"[A-Za-z0-9 \-–'()]+", g.get("en", "")) == None:
            pass
        k = (g.get("en") or "").strip().lower()
        if k in seen:
            add(lid, it, "lug'at-takror", f"«{g['en']}» g{seen[k]} da ham", "ogohlantirish")
        seen[k] = i
        if g.get("formula"):
            tex_jobs.append({"l": lid, "i": it + " formula", "t": g["formula"], "d": False})

# darslararo takrorlar
for name, dct in (("test", all_q), ("masala", all_s), ("mustaqil", all_h)):
    for txt, where in dct.items():
        if len(where) > 1:
            add(where[0].split()[0], ", ".join(where), "takror", f"{name} sharti bir xil: «{txt[:70]}»")

# KaTeX
json.dump(tex_jobs, open("/tmp/tex_jobs.json", "w"))
js = r"""
const katex = require(process.argv[2]);
const jobs = require('/tmp/tex_jobs.json'); const bad = [];
for (const j of jobs) { try { katex.renderToString(j.t, {displayMode: j.d, throwOnError: true, strict: false}); }
  catch (e) { bad.push({l: j.l, i: j.i, t: j.t.slice(0, 80), e: String(e.message).slice(0, 120)}); } }
console.log(JSON.stringify({n: jobs.length, bad}));
"""
open("/tmp/katex_run.js", "w").write(js)
r = subprocess.run(["node", "/tmp/katex_run.js", D("lib/katex/katex.min.js")], capture_output=True, text=True)
kr = json.loads(r.stdout)
for b in kr["bad"]:
    add(b["l"], b["i"], "katex", f"{b['e']} | {b['t']}")

json.dump({"issues": issues, "stats": stats, "katex_n": kr["n"]}, open(OUT, "w"), ensure_ascii=False, indent=1)
cnt = collections.Counter((i["daraja"], i["tur"]) for i in issues)
print("KaTeX ifodalar:", kr["n"])
for (sev, k), n in sorted(cnt.items()):
    print(f"{sev:14s} {k:20s} {n}")
print("Jami:", len(issues))
