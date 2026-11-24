"""RU matnlaridagi formulalarda kirillcha birliklarni o'zbekcha (xalqaro) nusxadagi formula bilan almashtirish.
Faqat formula 'skeleti' (raqam va belgilar) bir xil bo'lsa almashtiriladi."""
import json, re, sys, glob
MATH = re.compile(r"\$\$([\s\S]+?)\$\$|\$((?:[^$\\]|\\[\s\S])+?)\$")
CYR = re.compile(r"[А-Яа-яЁё]")
def skel(x):
    x = re.sub(r"\\text\{([^}]*)\}\^(\d)", r"\\text{\1^\2}", x)
    return re.sub(r"\\(mathrm|text)\{[^}]*\}|\\mu|\\Omega|\\,|\\ |[\s{}]|[А-Яа-яЁё]", "", x)
stats = {"fixed": 0, "left": []}

def fix_pair(ru, uz, where):
    if not isinstance(ru, str) or not isinstance(uz, str) or not CYR.search("".join(m.group(0) for m in MATH.finditer(ru))):
        return ru
    rm, um = list(MATH.finditer(ru)), list(MATH.finditer(uz))
    if not um:
        stats["left"].append((where, "uz da formula yo'q")); return ru
    out, pos = [], 0
    for a, b in zip(rm, um):
        out.append(ru[pos:a.start()])
        if CYR.search(a.group(0)):
            cands = {m.group(0) for m in um if skel(m.group(0)) == skel(a.group(0)) and not CYR.search(m.group(0))}
            if skel(a.group(0)) == skel(b.group(0)) and not CYR.search(b.group(0)):
                out.append(b.group(0)); stats["fixed"] += 1
            elif len(cands) == 1:
                out.append(cands.pop()); stats["fixed"] += 1
            else:
                out.append(a.group(0)); stats["left"].append((where, a.group(0), b.group(0)))
        else:
            out.append(a.group(0))
        pos = a.end()
    out.append(ru[pos:])
    return "".join(out)

def walk(o, where):
    if isinstance(o, dict):
        if "ru" in o and "uz" in o:
            if isinstance(o["ru"], list) and isinstance(o["uz"], list):
                o["ru"] = [fix_pair(r, u, f"{where}[{i}]") for i, (r, u) in enumerate(zip(o["ru"], o["uz"]))]
            else:
                o["ru"] = fix_pair(o["ru"], o["uz"], where)
        if "question_ru" in o:
            o["question_ru"] = fix_pair(o["question_ru"], o["question_uz"], where + " savol")
        if "distractors_ru" in o and isinstance(o["distractors_ru"], dict):
            for k in o["distractors_ru"]:
                o["distractors_ru"][k] = fix_pair(o["distractors_ru"][k], (o.get("distractors") or {}).get(k), f"{where} tahlil {k}")
        for k, v in o.items():
            if isinstance(v, (dict, list)) and k not in ("ru",):
                walk(v, f"{where}.{k}")
    elif isinstance(o, list):
        for i, x in enumerate(o):
            walk(x, f"{where}[{i}]")

for f in sorted(glob.glob("darslar/B0-L0*/*.json")):
    if f.endswith("glossary.json"): continue
    s = open(f).read(); d = json.loads(s)
    before = stats["fixed"]
    walk(d, f)
    if stats["fixed"] != before:
        ind = 1 if s.startswith("[\n ") else None
        open(f, "w").write(json.dumps(d, ensure_ascii=False, indent=ind))
print("almashtirildi:", stats["fixed"])
for x in stats["left"]: print("QOLDI:", x)
