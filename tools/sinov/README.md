# Mini App sinov skriptlari (bulut konteynerida ishlatilgan)

- `pg_test.py <url> <out>` — progress/profil (57 tekshiruv).
- `lg_test.py` — kurs lug'ati (19 tekshiruv).
- `audit.py <repo> <out.json>` — barcha darslar JSON auditi (tarjimalar, formulalar, KaTeX, limitlar, takrorlar).
- `browser_audit.py uz|ru|en` — barcha darslar × 5 bo'lim brauzerda (katex-error, xom LaTeX, til aralashuvi).
- `fix_ru_units.py` — RU formulalaridagi kirillcha birliklarni xalqaro birlikka almashtirish (darslar/B0-L0*/ da ishga tushiriladi;
  manba papkalaridagi JSON larga ham qo'llash mumkin).

Yo'llar `/home/claude/...` va `http://127.0.0.1:8811` ga moslangan: `python3 -m http.server 8811` (repo ildizida), playwright + google-chrome.
