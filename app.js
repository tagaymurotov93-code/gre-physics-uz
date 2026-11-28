/* GRE Physics Uz — Telegram Mini App.
 * Ma'lumotlar: moduller.json (modullar, "GRE haqida"), darslar/index.json,
 *              darslar/<ID>/{theory, solved, quiz, homework, glossary}.json
 * Til qoidasi: UZ (yoki RU) tanlansa — har bir blok avval o'zbekcha (ruscha), ostida ko'k rangda inglizcha;
 *              EN tanlansa — faqat inglizcha.
 * Holat xotirada (URL "#" Telegram ma'lumotlari uchun band). Deep link: ?startapp=B0-L01 yoki ?dars=B0-L01&bolim=test
 * Aniq joy (izoh tizimi): ?startapp=B1-L11__masalalar__S05q3  yoki  ?dars=B1-L11&bolim=masalalar&joy=S05q3;
 *   izohni ochish: ?startapp=izoh__142. Har bir izohlanadigan blokda data-a="<joy>" (izoh.js ishlatadi):
 *   nazariya n<i> (jadval qatori n<i>r<k>), lug'at g<i>, masala S01 / S01s (shart) / S01f (rasm) / S01q<n> (qadam) / S01a (javob),
 *   test Q01 / Q01s / Q01o<A-E> (variant) / Q01q<n> / Q01d<A-E> (tahlil), mustaqil H01.
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
    rightIs:  { uz: "To'g'ri javob:", ru: "Правильный ответ:", en: "Correct answer:" },
    restart:  { uz: "Qaytadan yechish", ru: "Решить заново", en: "Try again" },
    of:       { uz: "to'g'ri", ru: "верно", en: "correct" },
    review:   { uz: "Savolni bosib, yechimini qayta ko'ring.", ru: "Нажмите на вопрос, чтобы снова посмотреть решение.", en: "Tap a question to review its solution." },
    distr:    { uz: "Noto'g'ri variantlar tahlili", ru: "Разбор неверных вариантов", en: "Why the other choices are wrong" },
    search:   { uz: "Qidirish…", ru: "Поиск…", en: "Search…" },
    hwnote:   { uz: "Yechimlar berilmaydi — javoblaringizni kanal izohlarida yozing.", ru: "Решения не приводятся — пишите ответы в комментариях канала.",
                en: "Solutions are not provided — post your answers in the channel comments." },
    counts:   { solved: { uz: "masala", ru: "задач", en: "problems" }, quiz: { uz: "test", ru: "тестов", en: "quiz items" },
                homework: { uz: "mustaqil", ru: "сам. задач", en: "homework" }, glossary: { uz: "atama", ru: "терминов", en: "terms" } },
    prevLesson: { uz: "Oldingi dars", ru: "Предыдущий урок", en: "Previous lesson" },
    nextLesson: { uz: "Keyingi dars", ru: "Следующий урок", en: "Next lesson" },
    prevMod:  { uz: "Oldingi modul", ru: "Предыдущий модуль", en: "Previous module" },
    nextMod:  { uz: "Keyingi modul", ru: "Следующий модуль", en: "Next module" },
    loadErr:  { uz: "Ma'lumotni yuklab bo'lmadi. Internetni tekshirib, qayta oching.", ru: "Не удалось загрузить данные. Проверьте интернет и откройте снова.",
                en: "Could not load data. Check your connection and reopen." },
  };
  // javob va variantlardagi o'zbekcha so'zlar (boshqa tillar uchun)
  const LOCAL = {
    ru: [["kv. birlik", "кв. ед."], ["komplanar", "компланарны"], ["sharqdan shimolga", "к северу от востока"],
         ["$\\vec a$ va $\\vec b$ ga bog'liq", "зависит от $\\vec a$ и $\\vec b$"], ["yoki ", "или "]],
    en: [["kv. birlik", "sq. units"], ["komplanar", "coplanar"], ["sharqdan shimolga", "north of east"],
         ["$\\vec a$ va $\\vec b$ ga bog'liq", "depends on $\\vec a$ and $\\vec b$"], ["yoki ", "or "]],
    uz: [],
  };
  const TAB_ORDER = ["nazariya", "lugat", "masalalar", "test", "mustaqil"];
  const LETTERS = "ABCDE";
  // Belgilash: bitta harfli vektor — \vec a (qisqa strelka, kichik harf), ikki nuqta — \overrightarrow{AB}
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
  // qo'shimcha modullar (izoh.js) uchun umumiy interfeys: GRE.on("render", f), GRE.emit(...)
  const hooks = {};
  window.GRE = {
    on(ev, f) { (hooks[ev] = hooks[ev] || []).push(f); },
    emit(ev, ...a) { (hooks[ev] || []).forEach((f) => { try { f(...a); } catch (e) { console.error(e); } }); },
  };
  // HTML qismining birinchi tegiga data-a="<joy>" qo'shadi
  const A = (html, a) => html.replace(/^(\s*<[a-zA-Z0-9]+)/, `$1 data-a="${a}"`);
  const sid = (id) => String(id).split("-").pop();     // "B1-L11-S05" -> "S05"

  // ------------------------------------------------------------------ marshrut holati
  const qs = new URLSearchParams(location.search);
  const state = qs.get("dars")
    ? { view: "lesson", id: qs.get("dars").toUpperCase(), tab: qs.get("bolim") || "nazariya", joy: qs.get("joy") || null }
    : { view: "home" };
  // start_param: "B0-L01" | "B0_L01" | "B1-L11__masalalar__S05q3" | "izoh__142"
  function parseStart(sp) {
    if (!sp) return null;
    const p = sp.split("__");
    if (p[0] === "izoh") return { izoh: p[1] };
    if (p[0] === "admin") return { view: "admin" };
    return { view: "lesson", id: p[0].toUpperCase().replace(/_/g, "-"), tab: p[1] || "nazariya", joy: p[2] || null };
  }
  if (qs.get("izoh")) state.izoh = qs.get("izoh");
  if (qs.get("sahifa") === "admin") state.view = "admin";

  // ------------------------------------------------------------------ Telegram
  let tg = null;
  function initTelegram() {
    const w = window.Telegram && window.Telegram.WebApp;
    if (!w || tg) return;
    tg = w;
    try {
      tg.ready(); tg.expand();
      tg.BackButton.onClick(() => goBack());
      const sp = parseStart(tg.initDataUnsafe && tg.initDataUnsafe.start_param);   // ?startapp=B0-L01
      if (sp && sp.izoh) {
        // bot xabaridagi "javobni ochish" — profil sahifasi ochiladi, ustida o'sha izoh (izoh.js)
        window.GRE.pendingIzoh = sp.izoh;
        if (extViews.profil && state.view === "home") go({ view: "profil" }); else syncBack();
        window.GRE.emit("izoh");
      }
      else if (sp && state.view === "home") go(sp);
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
  // rasmga havola: [[F02]] -> "2-rasm" / "рис. 2" / "Fig. 2" (bosilganda rasmga o'tadi)
  const FIGLBL = { uz: (n) => `${n}-rasm`, ru: (n) => `рис. ${n}`, en: (n) => `Fig. ${n}` };
  // matn (+ **qalin**) va $..$ / $$..$$ formulalar -> HTML
  function rich(text, L = lang) {
    if (text == null) return "";
    const parts = [];
    let s = String(text).replace(MATH, (m, d, i) => { parts.push([d ?? i, d !== undefined]); return `\u0000${parts.length - 1}\u0000`; });
    s = esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[\[(F(\d+))\]\]/g, (m, id, n) => `<a class="figref" href="#fig-${id}" data-fig="${id}">${(FIGLBL[L] || FIGLBL.en)(+n)}</a>`);
    return s.replace(/\u0000(\d+)\u0000/g, (m, n) => tex(parts[+n][0], parts[+n][1]));
  }
  // Ikki tilli blok: asosiy til + (uz/ru rejimida) ko'k rangdagi inglizcha tarjima
  function bi(obj, tag = "div", cls = "") {
    if (!obj) return "";
    const main = obj[lang] ?? obj.uz ?? "";
    let html = `<${tag} class="${cls}">${rich(main, obj[lang] != null ? lang : "uz")}</${tag}>`;
    if (lang !== "en" && obj.en && obj.en.trim() !== String(main).trim()) {
      html += `<${tag} class="${cls} tr" lang="en">${rich(obj.en, "en")}</${tag}>`;
    }
    return `<div class="bi">${html}</div>`;
  }
  // o'zbekcha manbali qisqa matnni (variant, javob) har bir tilga moslash
  const biLoc = (s) => ({ uz: s, ru: locIn(s, "ru"), en: locIn(s, "en") });

  async function getJSON(path) {
    if (!cache[path]) cache[path] = fetch(path, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(path); return r.json(); });
    return cache[path];
  }
  const base = (id) => `darslar/${id}/`;
  // rasmlar ham yangi versiyada yuklansin (Telegram keshi eski rasmni ko'rsatmasligi uchun)
  const VER = (document.querySelector('script[src^="app.js"]')?.src.match(/v=(\d+)/) || [])[1] || "";

  function zoomable(root) {
    root.querySelectorAll("img").forEach((img) => {
      img.loading = "lazy";
      img.addEventListener("click", () => { const z = $("#zoom"); $("img", z).src = img.src; z.hidden = false; });
    });
  }
  $("#zoom").addEventListener("click", (e) => { e.currentTarget.hidden = true; });
  // matndagi rasm havolasi: rasmga silliq o'tish va qisqa yoritish
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a.figref");
    if (!a) return;
    e.preventDefault();
    const f = document.getElementById("fig-" + a.dataset.fig);
    if (!f) return;
    f.scrollIntoView({ behavior: "smooth", block: "center" });
    f.classList.remove("flash"); void f.offsetWidth; f.classList.add("flash");
    haptic("success");
  });

  // ------------------------------------------------------------------ marshrut
  function go(s) { Object.assign(state, s); render(); syncBack(); window.scrollTo(0, 0); }
  function goBack() {
    if (state.view === "lesson") go({ view: "module", mod: state.mod || "M1" });
    else if (extViews[state.view] && extViews[state.view].back) go(extViews[state.view].back());
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

  // qo'shimcha modullar o'z sahifasini qo'shishi mumkin: GRE.addView("profil", async () => {...}) (progress.js)
  const extViews = {};
  async function render() {
    try {
      if (extViews[state.view]) { $("#tabs").hidden = true; await extViews[state.view](); }
      else if (state.view === "home") await home();
      else if (state.view === "module") await moduleView(state.mod);
      else if (state.view === "about") await about();
      else if (state.view === "lesson") {
        await lesson(state.id, TAB_ORDER.includes(state.tab) ? state.tab : "nazariya");
        if (state.view === "lesson") { focusJoy(); window.GRE.emit("render", state); }
      }
      else { $("#tabs").hidden = true; view.innerHTML = `<div class="card muted">…</div>`; }   // kengaytma sahifa (admin.js) hali yuklanmagan
      window.GRE.emit("view", state);     // har qanday sahifa chizilgandan keyin (progress.js)
    } catch (e) { console.error(e); fail(); }
  }

  // aniq joyga o'tish (deep link yoki "Joyini ko'rsatish"): yopiq yechimni ochadi, blokni yoritadi
  function focusJoy() {
    const a = state.joy;
    state.joy = null;
    if (!a) return;
    const el = view.querySelector(`[data-a="${CSS.escape(a)}"]`);
    if (!el) return;
    const sol = el.closest(".sol[hidden]");
    if (sol) {
      sol.hidden = false;
      const b = view.querySelector(`button[data-i="${sol.id.slice(3)}"]`);
      if (b) b.textContent = t(T.hide);
    }
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "center" });
      el.classList.remove("joyflash"); void el.offsetWidth; el.classList.add("joyflash");
    });
    // yuqoridagi rasmlar keyin yuklanib sahifani surib yuborsa — blokni qayta markazga olib kelish
    [300, 800, 1600, 2600].forEach((ms) => setTimeout(() => {
      if (!el.isConnected) return;
      const r = el.getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight - 80) el.scrollIntoView({ block: "center" });
    }, ms));
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
    list.forEach((b, i) => {
      const a = "n" + i;
      if (b.t !== "li") closeList();
      if (b.t === "h1") return;
      else if (b.t === "h2") html += A(bi(b, "h2"), a);
      else if (b.t === "p") html += A(bi(b, "p"), a);
      else if (b.t === "note") html += A(bi(b, "p", "note"), a);
      else if (b.t === "li") { if (!inList) { html += `<ul class="blist">`; inList = true; } html += `<li data-a="${a}">${bi(b, "div")}</li>`; }
      else if (b.t === "m") html += `<div class="fm" data-a="${a}">${tex(b.m, true)}</div>`;
      else if (b.t === "fig") html += `<figure id="fig-${b.fig}" data-a="${a}" data-fig="${b.fig}"><img src="${figBase}${b.src[lang] || b.src.uz}?v=${VER}" alt="${esc(t(b.cap || {}) || b.fig)}">
          ${b.cap ? `<figcaption>${bi(b.cap, "span")}</figcaption>` : ""}</figure>`;
      else if (b.t === "tbl") html += `<div class="tbl">${b.rows.map((r, k) => `<div class="trow" data-a="${a}r${k}"><div class="tn">${bi(r, "div")}</div>
          <div class="tv">${r.m ? tex(r.m, false) : esc(r.v)}</div></div>`).join("")}</div>`;
      else if (b.t === "links") html += `<div class="links">${b.items.map((x) => `<a class="btn ghost wide" href="${x.url}" target="_blank" rel="noopener">${esc(t(x))} ↗</a>`).join("")}</div>`;
    });
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
      const rows = g.map((x, i) => ({ ...x, i })).filter((x) => !q || [x.en, x[lang]].join(" ").toLowerCase().includes(q));
      box.innerHTML = rows.map((x) => `<div class="term" data-a="g${x.i}">
          <div class="tm">${esc(x[lang] || x.en)}</div>
          ${lang !== "en" ? `<div class="tr" lang="en">${esc(x.en)}</div>` : ""}
          ${x.formula ? `<div class="f">${tex(x.formula, false)}</div>` : ""}</div>`).join("") || `<div class="muted">—</div>`;
    };
    paint("");
    $(".search").addEventListener("input", (e) => { paint(e.target.value.trim().toLowerCase()); window.GRE.emit("render", state); });
  }

  // yechim qadamlari: {uz:[...], ru:[...], en:[...]} parallel; har qadam: matn (+ $$formula$$)
  // B1+: rules[i] — shu qadamda ishlatilgan qoida/ta'rif/formula (yashil ramka; uz/ru + ko'k inglizcha)
  function steps(sol, tag = "ol", rules = null, pfx = "") {
    const split = (x) => { const k = x.indexOf("$$"); return k < 0 ? [x, ""] : [x.slice(0, k).trim(), x.slice(k)]; };
    const main = sol[lang] || sol.uz, en = sol.en || [];
    return `<${tag} class="steps">${main.map((s, i) => {
      const [txt, math] = split(s), [txtEn] = split(en[i] || "");
      const r = rules && rules[i];
      return `<li${pfx ? ` data-a="${pfx}q${i + 1}"` : ""}>${txt ? bi({ [lang]: txt, en: txtEn }, "div") : ""}${math ? `<div class="fm">${rich(math)}</div>` : ""}${r ? `<div class="rule">${bi(r, "div")}</div>` : ""}</li>`;
    }).join("")}</${tag}>`;
  }

  async function solved(id) {
    const S = await getJSON(`${base(id)}solved.json`);
    view.innerHTML = S.map((s, i) => { const a = sid(s.id); return `<section class="card" data-a="${a}">
        <div class="row"><span class="code">${a}</span><span class="chip ${s.difficulty}">${esc(t(T.diff[s.difficulty]))}</span></div>
        ${A(bi(s.statement, "p"), a + "s")}
        ${s.figure ? `<img class="fig" data-a="${a}f" src="${base(id)}${s.figure}?v=${VER}" alt="${s.id}">` : ""}
        <button class="btn ghost wide" data-i="${i}">${esc(t(T.show))}</button>
        <div class="sol" id="sol${i}" hidden>
          ${steps(s.solution, "ol", s.rules, a)}
          <div class="answer" data-a="${a}a"><b>${esc(t(T.answer))}:</b> ${tex(locIn(s.answer, lang), false)}
            <div class="basis"><b>${esc(t(T.basis))}:</b> ${bi(s.basis, "span")}</div></div>
        </div></section>`; }).join("");
    zoomable(view);
    view.querySelectorAll("button[data-i]").forEach((b) => b.addEventListener("click", () => {
      const box = $(`#sol${b.dataset.i}`);
      box.hidden = !box.hidden;
      b.textContent = t(box.hidden ? T.show : T.hide);
      if (!box.hidden) window.GRE.emit("solution", id, +b.dataset.i, S.length);
    }));
  }

  // ---- test: bittadan savol, darhol tekshirish, natija
  async function quiz(id) {
    const Q = await getJSON(`${base(id)}quiz.json`);
    const key = `${id}:quiz`;
    const st = store.get(key, { i: 0, a: {} });
    const qObj = (q) => ({ uz: q.question_uz, ru: q.question_ru, en: q.question_en });
    // deep link test savoliga olib kelsa — o'sha savol yechimi bilan "ko'rib chiqish" rejimida ochiladi (javob yozilmaydi)
    let peek = null;
    const jm = state.joy && state.joy.match(/^Q\d+/);
    if (jm) { const k = Q.findIndex((q) => sid(q.id) === jm[0]); if (k >= 0) { st.i = k; peek = Q[k].id; } }
    window.GRE.emit("quizload", id, Q, st);

    const paint = () => {
      if (st.i >= Q.length) return results();
      const q = Q[st.i];
      const a = sid(q.id);
      const chosen = st.a[q.id];
      const done = chosen !== undefined || peek === q.id;
      const pct = Math.round(100 * st.i / Q.length);
      if (peek === q.id && chosen === undefined) window.GRE.emit("peek", id, st.i, Q.length);
      const dist = q.distractors ? Object.keys(q.distractors).map((k) => `<li data-a="${a}d${k}"><b>(${k})</b> ${bi({ uz: q.distractors[k], ru: (q.distractors_ru || {})[k], en: (q.distractors_en || {})[k] }, "span")}</li>`).join("") : "";
      view.innerHTML = `<div class="muted">${esc(t(T.question))} ${st.i + 1} / ${Q.length}</div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <section class="card" data-a="${a}">${A(bi(qObj(q), "p"), a + "s")}
          ${q.figure ? `<img class="fig" data-a="${a}f" src="${base(id)}${q.figure}?v=${VER}" alt="${q.id}">` : ""}
          <div class="opts">${q.options.map((o, k) => {
            const cls = done ? (k === q.correct ? "ok" : (k === chosen ? "bad" : "")) : "";
            return `<button class="opt ${cls}" data-k="${k}" data-a="${a}o${LETTERS[k]}" ${done ? "disabled" : ""}><span class="l">${LETTERS[k]}</span><span class="ot">${bi(biLoc(o.replace(/^\([A-E]\)\s*/, "")), "span")}</span></button>`;
          }).join("")}</div>
          ${done ? `<div class="sol">
            ${chosen === undefined ? `<div class="verdict ok">${esc(t(T.rightIs))} ${LETTERS[q.correct]}</div>` :
              `<div class="verdict ${chosen === q.correct ? "ok" : "bad"}">${chosen === q.correct ? esc(t(T.correct)) : `${esc(t(T.wrong))} ${LETTERS[q.correct]}`}</div>`}
            ${steps(q.full_solution, "ul", q.rules, a)}
            ${dist ? `<div class="distr"><b>${esc(t(T.distr))}:</b><ul>${dist}</ul></div>` : ""}
            <p><button class="btn wide" id="nx">${esc(t(st.i === Q.length - 1 ? T.results : T.next))}</button></p></div>` : ""}
        </section>`;
      zoomable(view);
      view.querySelectorAll(".opt:not([disabled])").forEach((b) => b.addEventListener("click", () => {
        st.a[q.id] = +b.dataset.k; store.set(key, st);
        window.GRE.emit("answer", id, st.i, +b.dataset.k, +b.dataset.k === q.correct, Q.length);
        haptic(+b.dataset.k === q.correct ? "success" : "error");
        paint();
      }));
      const nx = $("#nx");
      if (nx) nx.addEventListener("click", () => { st.i += 1; store.set(key, st); paint(); window.scrollTo(0, 0); });
      if (drawn++) window.GRE.emit("render", state);
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
      if (drawn++) window.GRE.emit("render", state);
    };
    let drawn = 0;
    paint();
  }

  async function homework(id) {
    const H = await getJSON(`${base(id)}homework.json`);
    view.innerHTML = `<section class="card"><div class="muted" style="margin-bottom:6px">${esc(t(T.hwnote))}</div>
      <ol class="hw">${H.map((h) => `<li data-a="${sid(h.id)}">${bi(h.statement, "div")}${h.figure ? `<img class="fig" data-a="${sid(h.id)}f" src="${base(id)}${h.figure}?v=${VER}" alt="${h.id}">` : ""} <span class="chip ${h.difficulty}">${esc(t(T.diff[h.difficulty]))}</span></li>`).join("")}</ol></section>`;
    zoomable(view);
    await lessonNav(id);
  }

  // ------------------------------------------------------------------ oldingi / keyingi dars (mustaqil ish oxirida)
  // Tartib: moduller.json dagi modullar ketma-ketligi, modul ichida `plan` tartibi; faqat tayyor (index.json dagi) darslar.
  // Modul chegarasida qo'shni modulning birinchi/oxirgi tayyor darsiga o'tadi (tugmada "Keyingi modul" deb yoziladi).
  async function lessonSeq() {
    const [M, idx] = await Promise.all([getJSON("moduller.json"), getJSON("darslar/index.json")]);
    const ready = Object.fromEntries(idx.map((L) => [L.id, L]));
    const seq = [];
    M.modules.forEach((m) => {
      if (m.about) return;
      const ids = (m.plan || []).map((p) => p.id).filter((x) => ready[x] && ready[x].module === m.id);
      idx.forEach((L) => { if (L.module === m.id && !ids.includes(L.id)) ids.push(L.id); });
      ids.forEach((x) => seq.push(ready[x]));
    });
    return seq;
  }
  async function lessonNav(id) {
    const seq = await lessonSeq();
    const i = seq.findIndex((L) => L.id === id);
    if (i < 0) return;
    const cur = seq[i], prev = seq[i - 1], next = seq[i + 1];
    const btn = (L, dir) => {
      if (!L) return `<div class="lnav-b off" aria-hidden="true"></div>`;
      const other = L.module !== cur.module;
      const k = dir < 0 ? `‹ ${t(other ? T.prevMod : T.prevLesson)}` : `${t(other ? T.nextMod : T.nextLesson)} ›`;
      return `<button class="lnav-b ${dir < 0 ? "prev" : "next"}" data-id="${L.id}" data-m="${L.module}">
          <span class="lnav-k">${esc(k)}</span><span class="code">${L.id}</span><span class="lnav-t">${esc(t(L.title))}</span></button>`;
    };
    if (state.view !== "lesson" || state.id !== id || state.tab !== "mustaqil") return;   // foydalanuvchi bu orada boshqa joyga o'tgan
    const old = $("#lessonNav"); if (old) old.remove();
    view.insertAdjacentHTML("beforeend", `<nav class="lnav" id="lessonNav">${btn(prev, -1)}${btn(next, 1)}</nav>`);
    view.querySelectorAll(".lnav-b[data-id]").forEach((b) => b.addEventListener("click", () => {
      go({ view: "lesson", id: b.dataset.id, tab: "nazariya", mod: b.dataset.m, joy: null });
    }));
  }

  // ------------------------------------------------------------------ start
  Object.assign(window.GRE, { state, go, render, T, t, rich, bi, esc, tex, getJSON, base, store, haptic, view, VER, sid,
    steps, biLoc, zoomable, header, LETTERS, TAB_ORDER,
    addView(name, fn, back) { extViews[name] = fn; if (back) fn.back = back; },
    lang: () => lang, tg: () => tg });
  paintLang();
  render();
  syncBack();
})();
