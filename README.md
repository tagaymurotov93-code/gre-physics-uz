# GRE Physics Uz — Telegram Mini App

Kanal obunachilari uchun interaktiv darslar: nazariya (jonli formulalar, KaTeX), uch tilli lug'at,
yechilgan masalalar ("Yechimni ko'rsatish"), darhol tekshiriladigan GRE uslubidagi test va mustaqil ish.
Tillar: o'zbek / rus / ingliz. Server kerak emas — GitHub Pages'da bepul ishlaydi.

> ⚠️ Bu papka **ochiq (public)** GitHub repozitoriysi bo'ladi. Bu yerga faqat dars materiallari tushadi:
> shaxsiy hujjatlar, token, `manbalar/` dagi kitoblar va mustaqil ish javoblari hech qachon qo'yilmaydi
> (`eksport.py` javoblarni avtomatik olib tashlaydi).

## Tuzilma
```
index.html, app.js, style.css    — ilovaning o'zi
lib/                             — KaTeX va marked (internetdagi CDN'ga bog'liq emas)
darslar/index.json               — darslar ro'yxati
darslar/B0-L01/                  — dars ma'lumotlari: theory_uz/ru/en.md, *.json, figures/
tools/eksport.py                 — dars papkasidan shu yerga ko'chiruvchi skript
```

## Yangi dars qo'shish
```
cd C:\Users\User\Hujjatlar_GRE_Physics
python miniapp\tools\eksport.py B0-L02
```
So'ng GitHub Desktop'da **Commit** → **Push origin**. 1–2 daqiqada Mini App yangilanadi.

## Bir martalik sozlash
1. **GitHub akkaunt:** github.com → Sign up (bepul).
2. **GitHub Desktop:** desktop.github.com dan o'rnating va akkauntingiz bilan kiring.
3. **Repozitoriy:** GitHub Desktop → File → *Add local repository* → shu `miniapp` papkasini tanlang →
   "create a repository" taklifiga rozi bo'ling → nom: `gre-physics-uz` → **Publish repository**
   (⚠️ "Keep this code private" belgisini **olib tashlang**).
4. **GitHub Pages:** github.com'da repozitoriy → Settings → Pages → *Branch: main*, papka */ (root)* → Save.
   1–2 daqiqadan so'ng manzil chiqadi: `https://<login>.github.io/gre-physics-uz/`.
5. **Telegram'ga ulash (BotFather'da, Telegram ilovasining o'zida):**
   `/newapp` → `@GREPhysicsUz_bot` → nom: *GRE Physics Uz* → tavsif → rasm: `bot\miniapp_rasm_640x360.png`
   → GIF so'rasa `/empty` → URL: yuqoridagi github.io manzili → qisqa nom: `darslar`.
   Natija: **https://t.me/GREPhysicsUz_bot/darslar**
6. **Kanalga havola:** postga shu havolani qo'ying. Ma'lum darsni to'g'ridan-to'g'ri ochish:
   `https://t.me/GREPhysicsUz_bot/darslar?startapp=B0-L01`
