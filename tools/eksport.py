# -*- coding: utf-8 -*-
"""Dars paketini Mini App repozitoriysiga eksport qiladi.

Ishlatish (Hujjatlar_GRE_Physics papkasida):
    python miniapp\\tools\\eksport.py B0-L01

Nima qiladi: <dars papkasi>/theory.md, glossary.json, solved.json, quiz.json, homework.json va
figures/*.png ni miniapp/darslar/<ID>/ ga ko'chiradi, theory.md ni uch tilga ajratadi va
miniapp/darslar/index.json ro'yxatini yangilaydi. Javoblar yashirin (homework answer_hidden)
va manba kodlari Mini App'ga KIRITILMAYDI.
"""
import argparse, json, os, re, shutil, sys

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))     # miniapp/
BASE = os.path.dirname(APP)                                             # Hujjatlar_GRE_Physics
STAGES = {"B0": "0-bosqich · Matematik apparat", "B1": "1-bosqich · Maktab fizikasi",
          "B2": "2-bosqich · Umumiy fizika", "B3": "3-bosqich · GRE darajasi", "B4": "4-bosqich · GRE strategiya"}


def find_lesson(code):
    for stage in sorted(os.listdir(BASE)):
        sp = os.path.join(BASE, stage)
        if os.path.isdir(sp) and stage[:2].isdigit():
            for d in os.listdir(sp):
                if d.upper().startswith(code.upper()) and os.path.isdir(os.path.join(sp, d)):
                    return os.path.join(sp, d)
    sys.exit(f"{code} darsi topilmadi.")


def split_theory(md):
    front = {}
    m = re.match(r"^---\n(.*?)\n---\n", md, flags=re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                front[k.strip()] = v.strip()
        md = md[m.end():]
    md = re.sub(r"<!--.*?-->", "", md, flags=re.S)
    parts = re.split(r"^(?=# )", md, flags=re.M)
    parts = [p.strip() for p in parts if p.strip().startswith("# ")]
    return front, dict(zip(("uz", "ru", "en"), parts))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dars", help="dars kodi, masalan B0-L01")
    ap.add_argument("--manba", help="dars papkasi (ko'rsatilmasa avtomatik topiladi)")
    a = ap.parse_args()
    src = a.manba or find_lesson(a.dars)
    lid = a.dars.upper()
    dst = os.path.join(APP, "darslar", lid)
    shutil.rmtree(dst, ignore_errors=True)
    os.makedirs(os.path.join(dst, "figures"))

    front, th = split_theory(open(os.path.join(src, "theory.md"), encoding="utf-8").read())
    # o'zbekcha qismdagi chizmalarni bo'lim raqami bo'yicha rus va ingliz qismlariga ham qo'yamiz
    figs_by_sec, sec = {}, None
    for line in th.get("uz", "").splitlines():
        m = re.match(r"## (\d+)\.", line)
        if m:
            sec = m.group(1)
        if line.startswith("![") and sec:
            figs_by_sec.setdefault(sec, []).append(line.strip())
    for lang in ("ru", "en"):
        if lang in th and "![" not in th[lang]:
            out, cur = [], None
            for chunk in re.split(r"(?=^## )", th[lang], flags=re.M):
                m = re.match(r"## (\d+)\.", chunk)
                out.append(chunk.rstrip() + "\n")
                if m and m.group(1) in figs_by_sec:
                    out.append("\n" + "\n\n".join(figs_by_sec[m.group(1)]) + "\n\n")
            th[lang] = "".join(out)
    for lang, text in th.items():
        open(os.path.join(dst, f"theory_{lang}.md"), "w", encoding="utf-8").write(text + "\n")

    J = lambda n: json.load(open(os.path.join(src, n), encoding="utf-8"))
    solved, quiz, hw, gloss = J("solved.json"), J("quiz.json"), J("homework.json"), J("glossary.json")
    for h in hw:                                  # javoblar Mini App'da ko'rinmasin
        h.pop("answer_hidden", None)
    for name, data in (("solved", solved), ("quiz", quiz), ("homework", hw), ("glossary", gloss)):
        json.dump(data, open(os.path.join(dst, f"{name}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    figs = 0
    for f in sorted(os.listdir(os.path.join(src, "figures"))):
        if f.endswith(".png"):
            shutil.copy(os.path.join(src, "figures", f), os.path.join(dst, "figures", f))
            figs += 1

    idx_path = os.path.join(APP, "darslar", "index.json")
    idx = json.load(open(idx_path, encoding="utf-8")) if os.path.exists(idx_path) else []
    entry = {"id": lid, "stage": STAGES.get(lid[:2], ""),
             "title": {k: front.get(f"title_{k}", lid) for k in ("uz", "ru", "en")},
             "counts": {"solved": len(solved), "quiz": len(quiz), "homework": len(hw), "glossary": len(gloss)}}
    idx = [e for e in idx if e["id"] != lid] + [entry]
    idx.sort(key=lambda e: e["id"])
    json.dump(idx, open(idx_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"✓ {lid}: nazariya (3 til), {len(solved)} masala, {len(quiz)} test, {len(hw)} mustaqil, "
          f"{len(gloss)} atama, {figs} rasm → miniapp/darslar/{lid}/")


if __name__ == "__main__":
    main()
