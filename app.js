/* GRE Physics Uz — Telegram Mini App.
 * Ma'lumotlar: moduller.json (modullar, "GRE haqida"), darslar/index.json,
 *              darslar/<ID>/{theory, solved, quiz, homework, glossary}.json
 * Til qoidasi: UZ (yoki RU) tanlansa — har bir blok avval o'zbekcha (ruscha), ostida ko'k rangda inglizcha;
 *              EN tanlansa — faqat inglizcha.
 * Holat xotirada (URL "#" Telegram ma'lumotlari uchun band). Deep link: ?startapp=B0-L01 yoki ?dars=B0-L01&bolim=test
 */
(() => {
  "use strict";

  // ------------------------------------------------------------------ interfeys matnlari (bir tilli)
  const T = {
    modules:  { uz: "Modullar", ru: "Модули", en: "Modules" },
    module:   { uz: "modul", ru: "модуль", en: "module" },
    lessons:  { uz: "dars", ru: "уроков", en: "lessons" },
    ready:    { uz: "tayyor", ru: "готово", en: "ready" },
    planned:  { uz: "rejada", ru: "в плане", en: "planned" },
    soon:     { uz: "Darslar tez orada qo'shiladi.", ru: "Уроки скоро появятся.", en: "Lessons are coming soon." },
    sequence: { uz: "Darslar ketma-ketligi", ru: "Последовательность уроков", en: "Lesson sequence" },
    later:    { uz: "tez orada", ru: "скоро", en: "coming soon" },
    tabs: {
      nazariya:  { i: "📘", uz: "Nazariya", ru: "Теория", en: "Theory" },
      lugat:     { i: "📖", uz: "Lug'at", ru: "Словарь", en: "Glossary" },
      masalalar: { i: "🧩", uz: "Masalalar", ru: "Задачи", en: "Problems" },
      test:      { i: "🧠", uz: "Test", ru: "Тест", en: "Quiz" },
      mustaqil:  { i: "📝", uz: "Mustaqil", ru: "Сам. работа", en: "Homework" },
    },
    show:     { uz: "Yechimni ko'rsatish", ru: "Показать решение", en: "Show solution" },
    hide:     { uz: "Yechimni yashirish", ru: "Скрыть решение", en: "Hide solution" },
    answer:   { uz: "Javob", ru: "Ответ", en: "Answer" },
    basis:    { uz: "Asos", ru: "Основа", en: "Basis" },
    diff:     { easy: { uz: "oson", ru: "лёгкая", en: "easy" }, medium: { uz: "o'rta", ru: "средняя", en: "medium" },
                hard: { uz: "qiyin", ru: "сложная", en: "hard" } },
    question: { uz: "Savol", ru: "Вопрос", en: "Question" },
    next:     { uz: "Keyingi savol", ru: "Следующий вопрос", en: "Next question" },
    results:  { uz: "Natijani ko'rish", ru: "Посмотреть результат", en: "See results" },
    correct:  { uz: "To'g'ri!", ru: "Верно!", en: "Correct!" },
    wrong:    { uz: "Noto'g'ri. To'g'ri javob:", ru: "Неверно. Правильный ответ:", en: "Wrong. Correct answer:" },
    restart:  { uz: "Qaytadan yechish", ru: "Решить заново", en: "Try again" },
    of:       { uz: "to'g'ri", ru: "верно", en: "correct" },
    review:   { uz: "Savolni bosib, yechimini qayta ko'ring.", ru: "Нажмите на вопрос, чтобы снова посмотреть решение.", en: "Tap a question to review its solution." },
    distr:    { uz: "Noto'g'ri variantlar tahlili", ru: "Разбор неверных вариантов", en: "Why the other choices are wrong" },
    search:   { uz: "Qidirish…", ru: "Поиск…", en: "Search…" },
    hwnote:   { uz: "Yechimlar berilmaydi — javoblaringizni kanal izohlarida yozing.", ru: "Решения не приводятся — пишите ответы в комментариях канала.",
                en: "Solutions are not provided — post your answers in the channel comments." },
    counts:   { solved: { uz: "masala", ru: "задач", en: "problems" }, quiz: { uz: "test", ru: "тестов", en: "quiz items" },
                homework: { uz: "mustaqil", ru: "сам. задач", en: "homework" }, glossary: { uz: "atama", ru: "терминов", en: "terms" } },
    loadErr:  { uz: "Ma'lumotni yuklab bo'lmadi. Internetni tekshirib, qayta oching.", ru: "Не удалось загрузить данные. Проверьте интернет и откройте снова.",
                en: "Could not load data. Check your connection and reopen." },
  };
  // javob va variantlardagi o'zbekcha so'zlar (boshqa tillar uchun)
  const LOCAL = {
    ru: [["kv. birlik", "кв. ед."], ["komplanar", "компланарны"], ["sharqdan shimolga", "к северу от востока"],
         ["$\\vec A$ va $\\vec B$ ga bog'liq", "зависит от $\\vec A$ и $\\vec B$"], ["yoki ", "или "]],
    en: [["kv. birlik", "sq. units"], ["komplanar", "coplanar"], ["sharqdan shimolga", "north of east"],
         ["$\\vec A$ va $\\vec B$ ga bog'liq", "depends on $\\vec A$ and $\\vec B$"], ["yoki ", "or "]],
    uz: [],
  };
  const TAB_ORDER = ["nazariya", "lugat", "masalalar", "test", "mustaqil"];
  const LETTERS = "ABCDE";
  // Belgilash: bitta harfli vektor — \vec A (qisqa strelka), ikki nuqta — \overrightarrow{AB}
  const KATEX_MACROS = {};

  // ------------------------------------------------------------------ holat
  const store = {
    get(k, d) { try { const v = localStorage.getItem("gre:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("gre:" + k, JSON.stringify(v)); } catch { /* xotira yo'q */ } },
  };
  let lang = store.get("lang", "uz");
  const cache = {};
  const $ = (s, el = document) => el.querySelector(s);
  const view = $("#view");
  const t = (o) => (o && (o[lang] ?? o.uz)) || "";
  const locIn = (s, L) => LOCAL[L].reduce((a, [x, y]) => a.split(x).join(y), s);

  // ------------------------------------------------------------------ marshrut holati
  const qs = new URLSearchParams(location.search);
  const state = qs.get("dars")
    ? { view: "lesson", id: qs.get("dars").toUpperCase(), tab: qs.get("bolim") || "nazariya" }
    : { view: "home" };

  // ------------------------------------------------------------------ Telegram
  let tg = null;
  function initTelegram() {
    const w = window.Telegram && window.Telegram.WebApp;
    if (!w || tg) return;
    tg = w;
    try {
      tg.ready(); tg.expand();
      tg.BackButton.onClick(() => goBack());
      const sp = tg.initDataUnsafe && tg.initDataUnsafe.start_param;   // ?startapp=B0-L01
      if (sp && state.view === "home") go({ view: "lesson", id: sp.toUpperCase().replace(/_/g, "-"), tab: "nazariya" });
      else syncBack();
    } catch (e) { /* Telegram'dan tashqarida — oddiy sahifa */ }
  }
  const tgScript = document.querySelector('script[src*="telegram-web-app"]');
  if (tgScript) tgScript.addEventListener("load", initTelegram);
  window.addEventListener("load", initTelegram);
  const haptic = (kind) => { try { tg && tg.HapticFeedback.notificationOccurred(kind); } catch { } };

  // ------------------------------------------------------------------ formulalar va matn
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MATH = /\$\$([\s\S]+?)\$\$|\$((?:[^$\\]|\\[\s\S])+?)\$/g;
  function tex(src, display) {
    try { return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false, macros: { ...KATEX_MACROS } }); }
    catch { return esc(src); }
  }
  // matn (+ **qalin**) va $..$ / $$..$$ formulalar -> HTML
  function rich(text) {
    if (text == null) return "";
    const parts = [];
    let s = String(text).replace(MATH, (m, d, i) => { parts.push([d ?? i, d !== undefined]); return `\u0000${parts.length - 1}\u0000`; });
    s = esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return s.replace(/\u0000(\d+)\u0000/g, (m, n) => tex(parts[+n][0], parts[+n][1]));
  }
  // Ikki tilli blok: asosiy til + (uz/ru rejimida) ko'k rangdagi inglizcha tarjima
  function bi(obj, tag = "div", cls = "") {
    if (!obj) return "";
    const main = obj[lang] ?? obj.uz ?? "";
    let html = `<${tag} class="${cls}">${rich(main)}</${tag}>`;
    if (lang !== "en" && obj.en && obj.en.trim() !== String(main).trim()) {
      html += `<${tag} class="${cls} tr" lang="en">${rich(obj.en)}</${tag}>`;
    }
    return `<div class="bi">${html}</div>`;
  }
  // o'zbekcha manbali qisqa matnni (variant, javob) har bir tilga moslash
  const biLoc = (s) => ({ uz: s, ru: locIn(s, "ru"), en: locIn(s, "en") });

  async function getJSON(path) {
    if (!cache[path]) cache[path] = fetch(path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); });
    return cache[path];
  }
  const base = (id) => `darslar/${id}/`;

  function zoomable(root) {
    root.querySelectorAll("img").forEach((img) => {
      img.loading = "lazy";
      img.addEventListener("click", () => { const z = $("#zoom"); $("img", z).src = img.src; z.hidden = false; });
    });
  }
  $("#zoom").addEventListener("click", (e) => { e.currentTarget.hidden = true; });

  // ------------------------------------------------------------------ marshrut
  function go(s) { Object.assign(state, s); render(); syncBack(); window.scrollTo(0, 0); }
  function goBack() {
    if (state.view === "lesson") go({ view: "module", mod: state.mod || "M1" });
    else go({ view: "home" });
  }
  function syncBack() {
    const deep = state.view !== "home";
    $("#back").hidden = !!tg || !deep;
    try { tg && (deep ? tg.BackButton.show() : tg.BackButton.hide()); } catch { }
  }
  $("#back").addEventListener("click", goBack);
  document.querySelectorAll(".langs button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang; store.set("lang", lang); paintLang(); render();
  }));
  function paintLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll(".langs button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  }
  function header(kicker, title) { $("#kicker").textContent = kicker; $("#title").textContent = title; }
  function fail() { view.innerHTML = `<div class="card err">${esc(t(T.loadErr))}</div>`; }

  async function render() {
    try {
      if (state.view === "home") return await home();
      if (state.view === "module") return await moduleView(state.mod);
      if (state.view === "about") return await about();
      return await lesson(state.id, TAB_ORDER.includes(state.tab) ? state.tab : "nazariya");
    } catch (e) { console.error(e); fail(); }
  }

  // ------------------------------------------------------------------ bosh sahifa: modullar
  async function home() {
    $("#tabs").hidden = true;
    header("GRE PHYSICS · UZ", t(T.modules));
    const [M, idx] = await Promise.all([getJSON("moduller.json"), getJSON("darslar/index.json")]);
    view.innerHTML = `<div class="hero">${bi(M.hero.title, "div", "ht")}${bi(M.hero.sub, "div", "hs")}</div><div class="mods">` +
      M.modules.map((m) => {
        const ready = idx.filter((L) => L.module === m.id).length;
        const meta = m.about ? "" : `<div class="mmeta"><span class="chip ${ready ? "ok" : ""}">${ready} ${esc(t(T.ready))}</span>
            <span class="muted">${m.planned} ${esc(t(T.lessons))} ${esc(t(T.planned))}</span></div>`;
        return `<button class="card mod" data-id="${m.id}">
            <div class="mtop"><div class="mnum">${m.icon}</div><div class="mk">${m.n}-${esc(t(T.module))}</div></div>
            <div class="mbody">${bi(m.title, "div", "mt")}${meta}</div></button>`;
      }).join("") + `</div>`;
    view.querySelectorAll(".mod").forEach((b) => b.addEventListener("click", () => {
      const m = M.modules.find((x) => x.id === b.dataset.id);
      go(m.about ? { view: "about" } : { view: "module", mod: m.id });
    }));
  }

  // ------------------------------------------------------------------ modul sahifasi
  async function moduleView(mid) {
    $("#tabs").hidden = true;
    const [M, idx] = await Promise.all([getJSON("moduller.json"), getJSON("darslar/index.json")]);
    const m = M.modules.find((x) => x.id === mid) || M.modules[0];
    header(`${m.n}-${t(T.module)}`, t(m.title));
    const lessons = idx.filter((L) => L.module === m.id);
    const byId = Object.fromEntries(lessons.map((L) => [L.id, L]));
    const plan = (m.plan && m.plan.length) ? m.plan : lessons.map((L) => ({ id: L.id, title: L.title }));
    const rows = plan.map((p, i) => {
      const L = byId[p.id];
      const stats = L ? `<div class="stats">${Object.entries(L.counts).map(([k, n]) => `<span>${n} ${esc(t(T.counts[k]))}</span>`).join("")}</div>` : "";
      const chip = L ? `<span class="chip ok">${esc(t(T.ready))}</span>` : `<span class="chip">${esc(t(T.later))}</span>`;
      return `<${L ? "button" : "div"} class="lrow ${L ? "lesson" : "off"}" data-id="${p.id}">
          <div class="lnum">${i + 1}</div>
          <div class="lbody"><div class="lhead"><span class="code">${p.id}</span>${chip}</div>${bi(p.title, "div", "lt")}${stats}</div>
          ${L ? '<div class="chev">›</div>' : ""}</${L ? "button" : "div"}>`;
    }).join("");
    view.innerHTML = `<section class="card">${bi(m.title, "h2")}${bi(m.desc, "p")}
        <div class="mmeta"><span class="chip ${lessons.length ? "ok" : ""}">${lessons.length} ${esc(t(T.ready))}</span>
        <span class="muted">${m.planned} ${esc(t(T.lessons))} ${esc(t(T.planned))}</span></div></section>` +
      (plan.length ? `<section class="card seq"><h2>${esc(t(T.sequence))}</h2>${rows}</section>` : `<div class="card muted">${esc(t(T.soon))}</div>`);
    view.querySelectorAll(".lesson").forEach((b) => b.addEventListener("click", () => go({ view: "lesson", id: b.dataset.id, tab: "nazariya", mod: m.id })));
  }

  // ------------------------------------------------------------------ GRE haqida
  async function about() {
    $("#tabs").hidden = true;
    const M = await getJSON("moduller.json");
    const m = M.modules.find((x) => x.about);
    header(`${m.n}-${t(T.module)}`, t(m.title));
    view.innerHTML = `<article class="card md">${blocks(M.about, "")}</article>`;
  }

  // ------------------------------------------------------------------ bloklar (nazariya va "GRE haqida")
  function blocks(list, figBase) {
    let html = "", inList = false;
    const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
    for (const b of list) {
      if (b.t !== "li") closeList();
      if (b.t === "h1") continue;
      else if (b.t === "h2") html += bi(b, "h2");
      else if (b.t === "p") html += bi(b, "p");
      else if (b.t === "note") html += bi(b, "p", "note");
      else if (b.t === "li") { if (!inList) { html += `<ul class="blist">`; inList = true; } html += `<li>${bi(b, "div")}</li>`; }
      else if (b.t === "m") html += `<div class="fm">${tex(b.m, true)}</div>`;
      else if (b.t === "fig") html += `<figure><img src="${figBase}${b.src[lang] || b.src.uz}" alt="${b.fig}"></figure>`;
      else if (b.t === "tbl") html += `<div class="tbl">${b.rows.map((r) => `<div class="trow"><div class="tn">${bi(r, "div")}</div>
          <div class="tv">${r.m ? tex(r.m, false) : esc(r.v)}</div></div>`).join("")}</div>`;
      else if (b.t === "links") html += `<div class="links">${b.items.map((x) => `<a class="btn ghost wide" href="${x.url}" target="_blank" rel="noopener">${esc(t(x))} ↗</a>`).join("")}</div>`;
    }
    closeList();
    return html;
  }

  // ------------------------------------------------------------------ dars
  async function lesson(id, tab) {
    const [idx, M] = await Promise.all([getJSON("darslar/index.json"), getJSON("moduller.json")]);
    const L = idx.find((x) => x.id === id);
    if (!L) { go({ view: "home" }); return; }
    state.mod = L.module;
    const m = M.modules.find((x) => x.id === L.module);
    header(`${L.id} · ${m ? t(m.title) : ""}`, t(L.title));
    const nav = $("#tabs");
    nav.hidden = false;
    nav.innerHTML = TAB_ORDER.map((k) => `<button data-t="${k}" class="${k === tab ? "on" : ""}"><span class="i">${T.tabs[k].i}</span>${esc(t(T.tabs[k]))}</button>`).join("");
    nav.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => go({ tab: b.dataset.t })));
    view.innerHTML = `<div class="card muted">…</div>`;
    await ({ nazariya: theory, lugat: glossary, masalalar: solved, test: quiz, mustaqil: homework })[tab](id);
  }

  async function theory(id) {
    const B = await getJSON(`${base(id)}theory.json`);
    view.innerHTML = `<article class="card md">${blocks(B, base(id))}</article>`;
    zoomable(view);
  }

  async function glossary(id) {
    const g = await getJSON(`${base(id)}glossary.json`);
    view.innerHTML = `<input class="search" type="search" placeholder="${esc(t(T.search))}"><div class="card" id="gl"></div>`;
    const box = $("#gl");
    const paint = (q) => {
      const rows = g.filter((x) => !q || [x.en, x[lang]].join(" ").toLowerCase().includes(q));
      box.innerHTML = rows.map((x) => `<div class="term">
          <div class="tm">${esc(x[lang] || x.en)}</div>
          ${lang !== "en" ? `<div class="tr" lang="en">${esc(x.en)}</div>` : ""}
          ${x.formula ? `<div class="f">${tex(x.formula, false)}</div>` : ""}</div>`).join("") || `<div class="muted">—</div>`;
    };
    paint("");
    $(".search").addEventListener("input", (e) => paint(e.target.value.trim().toLowerCase()));
  }

  // yechim qadamlari: {uz:[...], ru:[...], en:[...]} parallel; har qadam: matn (+ $$formula$$)
  function steps(sol, tag = "ol") {
    const split = (x) => { const k = x.indexOf("$$"); return k < 0 ? [x, ""] : [x.slice(0, k).trim(), x.slice(k)]; };
    const main = sol[lang] || sol.uz, en = sol.en || [];
    return `<${tag} class="steps">${main.map((s, i) => {
      const [txt, math] = split(s), [txtEn] = split(en[i] || "");
      return `<li>${txt ? bi({ [lang]: txt, en: txtEn }, "div") : ""}${math ? `<div class="fm">${rich(math)}</div>` : ""}</li>`;
    }).join("")}</${tag}>`;
  }

  async function solved(id) {
    const S = await getJSON(`${base(id)}solved.json`);
    view.innerHTML = S.map((s, i) => `<section class="card">
        <div class="row"><span class="code">${s.id.split("-").pop()}</span><span class="chip ${s.difficulty}">${esc(t(T.diff[s.difficulty]))}</span></div>
        ${bi(s.statement, "p")}
        ${s.figure ? `<img class="fig" src="${base(id)}${s.figure}" alt="${s.id}">` : ""}
        <button class="btn ghost wide" data-i="${i}">${esc(t(T.show))}</button>
        <div class="sol" id="sol${i}" hidden>
          ${steps(s.solution)}
          <div class="answer"><b>${esc(t(T.answer))}:</b> ${tex(locIn(s.answer, lang), false)}
            <div class="basis"><b>${esc(t(T.basis))}:</b> ${bi(s.basis, "span")}</div></div>
        </div></section>`).join("");
    zoomable(view);
    view.querySelectorAll("button[data-i]").forEach((b) => b.addEventListener("click", () => {
      const box = $(`#sol${b.dataset.i}`);
      box.hidden = !box.hidden;
      b.textContent = t(box.hidden ? T.show : T.hide);
    }));
  }

  // ---- test: bittadan savol, darhol tekshirish, natija
  async function quiz(id) {
    const Q = await getJSON(`${base(id)}quiz.json`);
    const key = `${id}:quiz`;
    const st = store.get(key, { i: 0, a: {} });
    const qObj = (q) => ({ uz: q.question_uz, ru: q.question_ru, en: q.question_en });

    const paint = () => {
      if (st.i >= Q.length) return results();
      const q = Q[st.i];
      const chosen = st.a[q.id];
      const done = chosen !== undefined;
      const pct = Math.round(100 * st.i / Q.length);
      const dist = q.distractors ? Object.keys(q.distractors).map((k) => `<li><b>(${k})</b> ${bi({ uz: q.distractors[k], ru: (q.distractors_ru || {})[k], en: (q.distractors_en || {})[k] }, "span")}</li>`).join("") : "";
      view.innerHTML = `<div class="muted">${esc(t(T.question))} ${st.i + 1} / ${Q.length}</div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <section class="card">${bi(qObj(q), "p")}
          <div class="opts">${q.options.map((o, k) => {
            const cls = done ? (k === q.correct ? "ok" : (k === chosen ? "bad" : "")) : "";
            return `<button class="opt ${cls}" data-k="${k}" ${done ? "disabled" : ""}><span class="l">${LETTERS[k]}</span><span class="ot">${bi(biLoc(o.replace(/^\([A-E]\)\s*/, "")), "span")}</span></button>`;
          }).join("")}</div>
          ${done ? `<div class="sol">
            <div class="verdict ${chosen === q.correct ? "ok" : "bad"}">${chosen === q.correct ? esc(t(T.correct)) : `${esc(t(T.wrong))} ${LETTERS[q.correct]}`}</div>
            ${steps(q.full_solution, "ul")}
            ${dist ? `<div class="distr"><b>${esc(t(T.distr))}:</b><ul>${dist}</ul></div>` : ""}
            <p><button class="btn wide" id="nx">${esc(t(st.i === Q.length - 1 ? T.results : T.next))}</button></p></div>` : ""}
        </section>`;
      view.querySelectorAll(".opt:not([disabled])").forEach((b) => b.addEventListener("click", () => {
        st.a[q.id] = +b.dataset.k; store.set(key, st);
        haptic(+b.dataset.k === q.correct ? "success" : "error");
        paint();
      }));
      const nx = $("#nx");
      if (nx) nx.addEventListener("click", () => { st.i += 1; store.set(key, st); paint(); window.scrollTo(0, 0); });
    };

    const results = () => {
      const ok = Q.filter((q) => st.a[q.id] === q.correct).length;
      view.innerHTML = `<section class="card score">
          <div class="n">${ok} / ${Q.length}</div><div class="muted">${esc(t(T.of))}</div>
          <div class="dots">${Q.map((q, k) => `<span class="${st.a[q.id] === q.correct ? "ok" : "bad"}" data-k="${k}">${k + 1}</span>`).join("")}</div>
          <div class="muted">${esc(t(T.review))}</div>
          <p><button class="btn wide" id="rs">${esc(t(T.restart))}</button></p></section>`;
      view.querySelectorAll(".dots span").forEach((d) => d.addEventListener("click", () => { st.i = +d.dataset.k; paint(); }));
      $("#rs").addEventListener("click", () => { st.i = 0; st.a = {}; store.set(key, st); paint(); });
    };
    paint();
  }

  async function homework(id) {
    const H = await getJSON(`${base(id)}homework.json`);
    view.innerHTML = `<section class="card"><div class="muted" style="margin-bottom:6px">${esc(t(T.hwnote))}</div>
      <ol class="hw">${H.map((h) => `<li>${bi(h.statement, "div")} <span class="chip ${h.difficulty}">${esc(t(T.diff[h.difficulty]))}</span></li>`).join("")}</ol></section>`;
  }

  // ------------------------------------------------------------------ start
  paintLang();
  render();
  syncBack();
})();
