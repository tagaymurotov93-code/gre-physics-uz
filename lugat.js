/* GRE Physics Uz — kurs bo'yicha umumiy lug'at va qidiruv.
 * Ma'lumot: darslar/lugat.json (tools/lugat_yig.py yig'adi; eksport.py har eksportda yangilaydi).
 * lugat.json da hali yo'q yangi darslar bo'lsa — ularning glossary.json i ish vaqtida qo'shiladi.
 * Bosh sahifada qidiruv tugmasi, "lugat" sahifasi: uz / ru / en bo'yicha qidirish, atamadan darsga o'tish.
 */
(() => {
  "use strict";
  const G = window.GRE;
  if (!G) return;
  const $ = (s, el = document) => el.querySelector(s);
  const L = () => G.lang();
  const t = (o) => (o && (o[L()] ?? o.uz)) || "";
  const esc = G.esc;

  const T = {
    title:  { uz: "Kurs lug'ati", ru: "Словарь курса", en: "Course glossary" },
    entry:  { uz: (n) => `${n} ta atama · o'zbek, rus, ingliz tillarida`, ru: (n) => `${n} терминов · на узбекском, русском и английском`,
              en: (n) => `${n} terms · in Uzbek, Russian and English` },
    ph:     { uz: "Atama qidirish (uz / ru / en)…", ru: "Поиск термина (uz / ru / en)…", en: "Search terms (uz / ru / en)…" },
    total:  { uz: (n) => `${n} ta atama`, ru: (n) => `${n} терминов`, en: (n) => `${n} terms` },
    found:  { uz: (n) => `${n} ta topildi`, ru: (n) => `Найдено: ${n}`, en: (n) => `${n} found` },
    none:   { uz: "Hech narsa topilmadi.", ru: "Ничего не найдено.", en: "Nothing found." },
    more:   { uz: "Ko'proq ko'rsatish", ru: "Показать ещё", en: "Show more" },
    hint:   { uz: "Dars kodini bossangiz — o'sha darsning lug'atida atama ochiladi.",
              ru: "Нажмите на код урока — термин откроется в словаре этого урока.",
              en: "Tap a lesson code to open the term in that lesson's glossary." },
  };
  const tf = (o, ...a) => { const v = o[L()] ?? o.uz; return typeof v === "function" ? v(...a) : v; };

  // ------------------------------------------------------------------ ma'lumot
  let DATA = null;
  const norm = (s) => String(s || "").toLowerCase().replace(/[‘’ʻʼ`´]/g, "'").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  async function load() {
    if (DATA) return DATA;
    const idx = await G.getJSON("darslar/index.json");
    let base = { darslar: [], t: [] };
    try { base = await G.getJSON("darslar/lugat.json"); } catch { /* fayl yo'q — hammasi ish vaqtida */ }
    const terms = base.t.map((x) => ({ ...x, d: x.d.slice() }));
    const by = new Map(terms.map((x) => [norm(x.en), x]));
    const have = new Set(base.darslar || []);
    const missing = idx.filter((x) => !have.has(x.id));
    const extra = await Promise.all(missing.map((x) => G.getJSON(`${G.base(x.id)}glossary.json`).then((g) => [x.id, g]).catch(() => [x.id, []])));
    extra.forEach(([id, g]) => g.forEach((e, i) => {
      const k = norm(e.en); if (!k) return;
      let x = by.get(k);
      if (!x) { x = { en: e.en, uz: e.uz || "", ru: e.ru || "", f: e.formula || "", d: [] }; by.set(k, x); terms.push(x); }
      x.d.push([id, i]);
    }));
    terms.forEach((x) => { x.h = norm([x.en, x.uz, x.ru].join(" | ")); x.hf = norm(x.f); });
    const titles = Object.fromEntries(idx.map((x) => [x.id, x]));
    DATA = { terms, titles };
    return DATA;
  }

  // ------------------------------------------------------------------ bosh sahifadagi kirish tugmasi
  G.on("view", async (st) => {
    if (st.view !== "home") return;
    const v = G.view;
    if ($("#lgEntry", v)) return;
    let n = "";
    try { const b = await G.getJSON("darslar/lugat.json"); n = b.t.length; } catch { }
    if (G.state.view !== "home" || $("#lgEntry", v)) return;
    const html = `<button class="card lg-entry" id="lgEntry" type="button"><span class="lg-ic" aria-hidden="true">🔎</span>
      <span class="lg-tx"><b>${esc(t(T.title))}</b>${n ? `<span class="muted">${esc(tf(T.entry, n))}</span>` : ""}</span><span class="chev">›</span></button>`;
    const mods = $(".mods", v);
    if (mods) mods.insertAdjacentHTML("beforebegin", html); else v.insertAdjacentHTML("beforeend", html);
    $("#lgEntry", v).addEventListener("click", () => G.go({ view: "lugat" }));
  });

  // ------------------------------------------------------------------ lug'at sahifasi
  let lastQ = "";
  G.addView("lugat", async () => {
    G.header("GRE PHYSICS · UZ", t(T.title));
    const v = G.view;
    v.innerHTML = `<input class="search lg-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="${esc(t(T.ph))}">
      <div class="muted lg-n"></div><div class="card lg-list" id="lgList"><div class="muted">…</div></div>`;
    const { terms, titles } = await load();
    const inp = $(".lg-q", v), box = $("#lgList", v), cnt = $(".lg-n", v);
    const lang = L();
    const key = (x) => norm(x[lang] || x.en).replace(/^[^0-9a-zа-я'ʻ]+/i, "");
    const sorted = terms.slice().sort((a, b) => key(a).localeCompare(key(b), lang === "en" ? "en" : lang === "ru" ? "ru" : "uz"));
    let list = sorted, shown = 0;
    const PAGE = 50;

    const row = (x) => {
      const main = x[lang] || x.en;
      const chips = x.d.map(([id, i]) => `<button class="chip lg-d" data-id="${id}" data-i="${i}" title="${esc(t((titles[id] || {}).title || {}))}">${id}</button>`).join("");
      return `<div class="term lg-term"><div class="tm">${esc(main)}</div>
        ${lang !== "en" && x.en !== main ? `<div class="tr" lang="en">${esc(x.en)}</div>` : ""}
        ${lang === "uz" && x.ru ? `<div class="lg-ru">${esc(x.ru)}</div>` : ""}
        ${x.f ? `<div class="f">${G.tex(x.f, false)}</div>` : ""}
        <div class="lg-ds">${chips}</div></div>`;
    };
    const paintMore = () => {
      const part = list.slice(shown, shown + PAGE);
      shown += part.length;
      const old = $("#lgMore", box); if (old) old.remove();
      box.insertAdjacentHTML("beforeend", part.map(row).join("") +
        (shown < list.length ? `<button class="btn ghost wide" id="lgMore">${esc(t(T.more))} (${list.length - shown})</button>` : ""));
      const m = $("#lgMore", box); if (m) m.addEventListener("click", paintMore);
    };
    const paint = (q) => {
      lastQ = q;
      const words = norm(q).split(" ").filter(Boolean);
      if (!words.length) list = sorted;
      else {
        const nq = norm(q);
        list = sorted.filter((x) => words.every((w) => x.h.includes(w) || x.hf.includes(w)));
        const rank = (x) => (key(x).startsWith(nq) ? 0 : x.h.split(" | ").some((s) => s.startsWith(nq)) ? 1 : 2);
        list.sort((a, b) => rank(a) - rank(b));
      }
      cnt.textContent = words.length ? tf(T.found, list.length) : `${tf(T.total, terms.length)} · ${t(T.hint)}`;
      box.innerHTML = list.length ? "" : `<div class="muted">${esc(t(T.none))}</div>`;
      shown = 0;
      if (list.length) paintMore();
    };
    let tm = null;
    inp.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(() => paint(inp.value), 120); });
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".lg-d");
      if (!b) return;
      const id = b.dataset.id;
      G.go({ view: "lesson", id, tab: "lugat", joy: "g" + b.dataset.i, mod: (titles[id] || {}).module });
    });
    inp.value = lastQ;
    paint(lastQ);
  }, () => ({ view: "home" }));
})();
