/* GRE Physics Uz — Telegram Mini App.
 * Ma'lumotlar: darslar/index.json va darslar/<ID>/{theory_<til>.md, solved, quiz, homework, glossary}.json
 * Holat xotirada saqlanadi (URL "#" qismi Telegram'ning o'z ma'lumotlari uchun band — unga tegmaymiz).
 * To'g'ridan-to'g'ri ochish: t.me/<bot>/<app>?startapp=B0-L01  yoki  index.html?dars=B0-L01&bolim=test
 */
(() => {
  "use strict";

  // ------------------------------------------------------------------ matnlar
  const T = {
    lessons:  { uz: "Darslar", ru: "Уроки", en: "Lessons" },
    hero:     { uz: "Noldan GRE Physics 700+ gacha: nazariya, yechilgan masalalar va GRE uslubidagi testlar.",
                ru: "С нуля до GRE Physics 700+: теория, решённые задачи и тесты в стиле GRE.",
                en: "From zero to GRE Physics 700+: theory, worked problems and GRE-style quizzes." },
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
    review:   { uz: "Savolni bosib, yechimini qayta ko'ring.", ru: "Нажмите на вопрос, чтобы снова посмотреть решение.",
                en: "Tap a question to review its solution." },
    distr:    { uz: "Chalg'ituvchi variantlar", ru: "", en: "" },
    search:   { uz: "Qidirish…", ru: "Поиск…", en: "Search…" },
    hwnote:   { uz: "Yechimlar berilmaydi — javoblaringizni kanal izohlarida yozing.",
                ru: "Решения не приводятся — пишите ответы в комментариях канала.",
                en: "Solutions are not provided — post your answers in the channel comments." },
    counts:   { solved: { uz: "masala", ru: "задач", en: "problems" }, quiz: { uz: "test", ru: "тестов", en: "quiz items" },
                homework: { uz: "mustaqil", ru: "сам. задач", en: "homework" }, glossary: { uz: "atama", ru: "терминов", en: "terms" } },
    loadErr:  { uz: "Ma'lumotni yuklab bo'lmadi. Internetni tekshirib, qayta oching.",
                ru: "Не удалось загрузить данные. Проверьте интернет и откройте снова.",
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

  // ------------------------------------------------------------------ holat
  const store = {
    get(k, d) { try { const v = localStorage.getItem("gre:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("gre:" + k, JSON.stringify(v)); } catch { /* xotira yo'q — e'tiborsiz */ } },
  };
  let lang = store.get("lang", "uz");
  const cache = {};
  const $ = (s, el = document) => el.querySelector(s);
  const view = $("#view");
  const t = (o) => (o && (o[lang] ?? o.uz)) || "";
  const loc = (s) => LOCAL[lang].reduce((a, [x, y]) => a.split(x).join(y), s);

  // ------------------------------------------------------------------ Telegram
  let tg = null;
  function initTelegram() {
    const w = window.Telegram && window.Telegram.WebApp;
    if (!w || tg) return;
    tg = w;
    try {
      tg.ready(); tg.expand();
      tg.BackButton.onClick(() => goBack());
      const sp = tg.initDataUnsafe && tg.initDataUnsafe.start_param;   // t.me/<bot>/<app>?startapp=B0-L01
      if (sp && !state.id) go(sp.toUpperCase().replace(/_/g, "-"), "nazariya");
      else syncBack();
    } catch (e) { /* Telegram'dan tashqarida — oddiy sahifa */ }
  }
  const tgScript = document.querySelector('script[src*="telegram-web-app"]');
  if (tgScript) tgScript.addEventListener("load", initTelegram);
  window.addEventListener("load", initTelegram);
  const haptic = (kind) => { try { tg && tg.HapticFeedback.notificationOccurred(kind); } catch { } };

  // ------------------------------------------------------------------ formulalar va matn
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  function tex(src, display) {
    try { return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false }); }
    catch { return esc(src); }
  }
  // matn + $..$ / $$..$$ formulalar -> HTML. md=true bo'lsa, markdown sifatida
  function rich(text, md = false) {
    const parts = [];
    const tokenized = text.replace(MATH, (m, d, i) => { parts.push([d ?? i, d !== undefined]); return `%%M${parts.length - 1}%%`; });
    let html = md ? marked.parse(tokenized) : esc(tokenized);
    return html.replace(/%%M(\d+)%%/g, (m, n) => tex(parts[+n][0], parts[+n][1]));
  }

  async function getJSON(path) {
    if (!cache[path]) cache[path] = fetch(path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); });
    return cache[path];
  }
  async function getText(path) {
    if (!cache[path]) cache[path] = fetch(path).then((r) => { if (!r.ok) throw new Error(path); return r.text(); });
    return cache[path];
  }
  const base = (id) => `darslar/${id}/`;

  function zoomable(root, prefix) {
    root.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (prefix && !/^(https?:|data:|darslar\/)/.test(src)) img.setAttribute("src", prefix + src);
      img.loading = "lazy";
      img.addEventListener("click", () => { const z = $("#zoom"); $("img", z).src = img.src; z.hidden = false; });
    });
  }
  $("#zoom").addEventListener("click", (e) => { e.currentTarget.hidden = true; });

  // ------------------------------------------------------------------ marshrut
  const qs = new URLSearchParams(location.search);
  const state = { id: (qs.get("dars") || "").toUpperCase(), tab: qs.get("bolim") || "nazariya" };
  function route() {
    if (!state.id) return home();
    lesson(state.id, TAB_ORDER.includes(state.tab) ? state.tab : "nazariya");
  }
  function go(id, tab) {
    state.id = id; state.tab = tab || "nazariya";
    store.set("last", state);
    route(); syncBack(); window.scrollTo(0, 0);
  }
  function goBack() { go("", ""); }
  function syncBack() {
    const inLesson = !!state.id;
    $("#back").hidden = !!tg || !inLesson;
    try { tg && (inLesson ? tg.BackButton.show() : tg.BackButton.hide()); } catch { }
  }
  $("#back").addEventListener("click", goBack);

  document.querySelectorAll(".langs button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang; store.set("lang", lang); paintLang(); route();
  }));
  function paintLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll(".langs button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  }

  // ------------------------------------------------------------------ bosh sahifa
  async function home() {
    $("#tabs").hidden = true;
    $("#kicker").textContent = "GRE Physics Uz";
    $("#title").textContent = t(T.lessons);
    let idx;
    try { idx = await getJSON("darslar/index.json"); } catch { return fail(); }
    view.innerHTML = `<div class="hero"><div class="k">GRE PHYSICS · UZ</div><p>${esc(t(T.hero))}</p></div>` +
      idx.map((L) => `<button class="card lesson" data-id="${L.id}">
          <div class="row"><span class="code">${L.id}</span><span class="muted">${esc(L.stage)}</span></div>
          <div class="big">${esc(t(L.title))}</div>
          <div class="stats">${Object.entries(L.counts).map(([k, n]) => `<span>${n} ${esc(t(T.counts[k]))}</span>`).join("")}</div>
        </button>`).join("");
    view.querySelectorAll(".lesson").forEach((b) => b.addEventListener("click", () => go(b.dataset.id, "nazariya")));
  }

  // ------------------------------------------------------------------ dars
  async function lesson(id, tab) {
    let idx;
    try { idx = await getJSON("darslar/index.json"); } catch { return fail(); }
    const L = idx.find((x) => x.id === id);
    if (!L) { goBack(); return; }
    $("#kicker").textContent = `${L.id} · ${L.stage}`;
    $("#title").textContent = t(L.title);
    const nav = $("#tabs");
    nav.hidden = false;
    nav.innerHTML = TAB_ORDER.map((k) => `<button data-t="${k}" class="${k === tab ? "on" : ""}"><span class="i">${T.tabs[k].i}</span>${esc(t(T.tabs[k]))}</button>`).join("");
    nav.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => go(id, b.dataset.t)));
    view.innerHTML = `<div class="card muted">…</div>`;
    try {
      await ({ nazariya: theory, lugat: glossary, masalalar: solved, test: quiz, mustaqil: homework })[tab](id);
    } catch (e) { console.error(e); fail(); }
  }
  function fail() { view.innerHTML = `<div class="card err">${esc(t(T.loadErr))}</div>`; }

  async function theory(id) {
    const md = await getText(`${base(id)}theory_${lang}.md`);
    view.innerHTML = `<article class="card md">${rich(md, true)}</article>`;
    zoomable(view, base(id));
  }

  async function glossary(id) {
    const g = await getJSON(`${base(id)}glossary.json`);
    view.innerHTML = `<input class="search" type="search" placeholder="${esc(t(T.search))}"><div class="card" id="gl"></div>`;
    const box = $("#gl");
    const order = lang === "en" ? ["en", "uz", "ru"] : lang === "ru" ? ["ru", "en", "uz"] : ["uz", "en", "ru"];
    const paint = (q) => {
      const rows = g.filter((x) => !q || [x.en, x.uz, x.ru].join(" ").toLowerCase().includes(q));
      box.innerHTML = rows.map((x) => `<div class="term"><div class="en">${esc(x[order[0]])}</div>
          <div class="tr muted">${esc(x[order[1]])} · ${esc(x[order[2]])}</div>
          ${x.formula ? `<div class="f">${tex(x.formula, false)}</div>` : ""}</div>`).join("") || `<div class="muted">—</div>`;
    };
    paint("");
    $(".search").addEventListener("input", (e) => paint(e.target.value.trim().toLowerCase()));
  }

  async function solved(id) {
    const S = await getJSON(`${base(id)}solved.json`);
    view.innerHTML = S.map((s, i) => `<section class="card">
        <div class="row"><span class="code">${s.id.split("-").pop()}</span><span class="chip ${s.difficulty}">${esc(t(T.diff[s.difficulty]))}</span></div>
        <p>${rich(s.statement[lang] || s.statement.uz)}</p>
        ${s.figure ? `<img class="fig" src="${base(id)}${s.figure}" alt="${s.id}">` : ""}
        <button class="btn ghost wide" data-i="${i}">${esc(t(T.show))}</button>
        <div class="sol" id="sol${i}" hidden>
          <ol class="steps">${(s.solution[lang] || s.solution.uz).map((st) => `<li>${rich(st)}</li>`).join("")}</ol>
          <div class="answer"><b>${esc(t(T.answer))}:</b> ${tex(loc(s.answer), false)}
            <div class="basis"><b>${esc(t(T.basis))}:</b> ${rich(s.basis[lang] || s.basis.uz)}</div></div>
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
    const qkey = { uz: "question_uz", ru: "question_ru", en: "question_en" }[lang];

    const paint = () => {
      if (st.i >= Q.length) return results();
      const q = Q[st.i];
      const chosen = st.a[q.id];
      const done = chosen !== undefined;
      const pct = Math.round(100 * st.i / Q.length);
      view.innerHTML = `<div class="muted">${esc(t(T.question))} ${st.i + 1} / ${Q.length}</div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <section class="card"><p>${rich(q[qkey] || q.question_uz)}</p>
          <div class="opts">${q.options.map((o, k) => {
            const cls = done ? (k === q.correct ? "ok" : (k === chosen ? "bad" : "")) : "";
            return `<button class="opt ${cls}" data-k="${k}" ${done ? "disabled" : ""}><span class="l">${LETTERS[k]}</span><span>${rich(loc(o.replace(/^\([A-E]\)\s*/, "")))}</span></button>`;
          }).join("")}</div>
          ${done ? `<div class="sol">
            <div class="verdict ${chosen === q.correct ? "ok" : "bad"}">${chosen === q.correct ? esc(t(T.correct)) : `${esc(t(T.wrong))} ${LETTERS[q.correct]}`}</div>
            <ul class="steps">${(q.full_solution[lang] || q.full_solution.uz).map((s) => `<li>${rich(s)}</li>`).join("")}</ul>
            ${lang === "uz" && q.distractors ? `<div class="distr"><b>${esc(t(T.distr))}:</b> ${Object.entries(q.distractors).map(([k, v]) => `(${k}) ${rich(v)}`).join("; ")}</div>` : ""}
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
      <ol class="hw">${H.map((h) => `<li>${rich(h.statement[lang] || h.statement.uz)} <span class="chip ${h.difficulty}">${esc(t(T.diff[h.difficulty]))}</span></li>`).join("")}</ol></section>`;
  }

  // ------------------------------------------------------------------ start
  paintLang();
  route();
  syncBack();
})();
