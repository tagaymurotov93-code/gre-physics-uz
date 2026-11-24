# -*- coding: utf-8 -*-
"""Kurs bo'yicha umumiy lug'atni yig'adi: darslar/*/glossary.json -> darslar/lugat.json
Ishlatish (miniapp papkasida yoki repo ildizida):  python tools/lugat_yig.py
eksport.py har eksportdan keyin buni avtomatik chaqiradi.

Format (ixcham): {"v": 1, "darslar": ["B0-L01", ...],
                  "t": [{"en": .., "uz": .., "ru": .., "f": formula, "d": [["B1-L35", 0], ...]}, ...]}
Bir xil inglizcha atama (katta-kichik harfsiz) bir yozuvga birlashtiriladi; "d" — qaysi darsda, nechanchi o'rinda.
"""
import json, os

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build(app=APP):
    D = os.path.join(app, "darslar")
    idx = json.load(open(os.path.join(D, "index.json"), encoding="utf-8"))
    terms, by = [], {}
    for L in idx:
        p = os.path.join(D, L["id"], "glossary.json")
        if not os.path.exists(p):
            continue
        for i, g in enumerate(json.load(open(p, encoding="utf-8"))):
            en = (g.get("en") or "").strip()
            if not en:
                continue
            k = en.lower()
            if k not in by:
                by[k] = {"en": en, "uz": g.get("uz", ""), "ru": g.get("ru", ""), "f": g.get("formula", "") or "", "d": []}
                terms.append(by[k])
            e = by[k]
            if not e["f"] and g.get("formula"):
                e["f"] = g["formula"]
            e["d"].append([L["id"], i])
    out = {"v": 1, "darslar": [L["id"] for L in idx], "t": terms}
    json.dump(out, open(os.path.join(D, "lugat.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return len(terms), sum(len(t["d"]) for t in terms)


if __name__ == "__main__":
    n, m = build()
    print(f"✓ lugat.json: {n} ta atama ({m} ta darsdagi yozuv)")
