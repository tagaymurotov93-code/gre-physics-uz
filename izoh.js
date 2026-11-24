/* GRE Physics Uz — izoh (fikr) tizimi.
 * O'quvchi dars ichidagi istalgan blokka (paragraf, formula, rasm, masala qadami, test varianti, lug'at atamasi)
 * savol / xato / taklif yozadi -> server (Cloudflare Worker, izoh-config.js dagi IZOH_API) -> admin guruh (@GREPhysicsUz_bot).
 * Admin javobi bot orqali o'quvchiga keladi va shu yerda, "Mening izohlarim" ro'yxatida ko'rinadi.
 * Joy aniqligi: har bir blokda data-a="<joy>" (app.js qo'yadi) + belgilangan parcha (matn, formula LaTeX'i, rasm).
 * IZOH_API bo'sh bo'lsa — modul o'chiq (tugma ko'rinmaydi).
 */
(() => {
  "use strict";
  const G = window.GRE;
  const API = String(window.IZOH_API || "").replace(/\/+$/, "");
  if (!G || !API) return;

  const BOT = window.IZOH_BOT || "https://t.me/GREPhysicsUz_bot/darslar";
  const MAXLEN = 2000, QUOTE = 300;
  const $ = (s, el = document) => el.querySelector(s);
  const L = () => G.lang();
  const t = (o) => (o && (o[L()] ?? o.uz)) || "";
  const esc = G.esc;

  // ------------------------------------------------------------------ matnlar
  const T = {
    fikr:    { uz: "Fikr", ru: "Отзыв", en: "Comment" },
    hint:    { uz: "Izoh yozmoqchi bo'lgan joyni bosing", ru: "Нажмите на место, к которому хотите оставить комментарий", en: "Tap the place you want to comment on" },
    whole:   { uz: "Butun bo'lim haqida", ru: "О всём разделе", en: "About the whole section" },
    cancel:  { uz: "Bekor qilish", ru: "Отмена", en: "Cancel" },
    mine:    { uz: "Mening izohlarim", ru: "Мои комментарии", en: "My comments" },
    selBtn:  { uz: "Izoh yozish", ru: "Комментировать", en: "Comment" },
    kinds: {
      savol:  { i: "❓", uz: "Savol", ru: "Вопрос", en: "Question" },
      xato:   { i: "⚠️", uz: "Xato", ru: "Ошибка", en: "Error" },
      taklif: { i: "💡", uz: "Taklif", ru: "Предложение", en: "Suggestion" },
      boshqa: { i: "💬", uz: "Boshqa", ru: "Другое", en: "Other" },
    },
    ph:      { uz: "Savolingiz yoki fikringizni yozing…", ru: "Напишите вопрос или замечание…", en: "Write your question or remark…" },
    send:    { uz: "Yuborish", ru: "Отправить", en: "Send" },
    sending: { uz: "Yuborilmoqda…", ru: "Отправка…", en: "Sending…" },
    sent:    { uz: "Yuborildi. Javob kelganda bot xabar beradi.", ru: "Отправлено. Когда придёт ответ, бот сообщит.", en: "Sent. The bot will notify you when there's a reply." },
    empty:   { uz: "Izoh matnini yozing", ru: "Введите текст комментария", en: "Enter your comment" },
    err:     { uz: "Yuborib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.", ru: "Не удалось отправить. Проверьте интернет и попробуйте снова.", en: "Couldn't send. Check your connection and try again." },
    rate:    { uz: "Juda ko'p izoh yozildi. Birozdan keyin urinib ko'ring.", ru: "Слишком много комментариев. Попробуйте чуть позже.", en: "Too many comments. Try again a bit later." },
    banned:  { uz: "Izoh yozish imkoniyati cheklangan.", ru: "Возможность комментировать ограничена.", en: "Commenting is restricted for your account." },
    auth:    { uz: "Sessiya eskirgan. Mini App'ni yopib, qayta oching.", ru: "Сессия устарела. Закройте и снова откройте Mini App.", en: "Session expired. Close and reopen the Mini App." },
    needTg:  { uz: "Izoh yozish uchun darsni Telegram'da, @GREPhysicsUz_bot orqali oching.", ru: "Чтобы комментировать, откройте урок в Telegram через @GREPhysicsUz_bot.",
               en: "To comment, open the lesson in Telegram via @GREPhysicsUz_bot." },
    openTg:  { uz: "Telegram'da ochish", ru: "Открыть в Telegram", en: "Open in Telegram" },
    loadErr: { uz: "Izohlarni yuklab bo'lmadi.", ru: "Не удалось загрузить комментарии.", en: "Couldn't load comments." },
    none:    { uz: "Hali izoh yozmagansiz. Dars ichida 💬 Fikr tugmasini bosing.", ru: "Комментариев пока нет. Нажмите 💬 Отзыв внутри урока.", en: "No comments yet. Tap 💬 Comment inside a lesson." },
    more:    { uz: "Yana yuklash", ru: "Загрузить ещё", en: "Load more" },
    show:    { uz: "Joyini ko'rsatish", ru: "Показать место", en: "Show place" },
    reply:   { uz: "Javob yozish", ru: "Ответить", en: "Reply" },
    replyPh: { uz: "Javobingizni yozing…", ru: "Напишите ответ…", en: "Write your reply…" },
    you:     { uz: "Siz", ru: "Вы", en: "You" },
    admin:   { uz: "Muallif", ru: "Автор", en: "Author" },
    isNew:   { uz: "yangi javob", ru: "новый ответ", en: "new reply" },
    changed: { uz: "Bu joy izoh yozilganidan keyin o'zgartirilgan.", ru: "Это место изменено после комментария.", en: "This place was changed after the comment." },
    gone:    { uz: "Bu joy darsda topilmadi (dars yangilangan bo'lishi mumkin).", ru: "Место не найдено в уроке (возможно, урок обновлён).", en: "This place wasn't found (the lesson may have been updated)." },
    fixedMsg:{ uz: "✅ Ko'rsatgan joyingiz tuzatildi. Rahmat!", ru: "✅ Отмеченное вами место исправлено. Спасибо!", en: "✅ The place you pointed out has been fixed. Thank you!" },
    closedMsg:{ uz: "Izoh yopildi.", ru: "Комментарий закрыт.", en: "The comment was closed." },
    status: {
      open:     { uz: "Javob kutilmoqda", ru: "Ожидает ответа", en: "Awaiting reply" },
      answered: { uz: "Javob berildi", ru: "Есть ответ", en: "Answered" },
      fixed:    { uz: "Tuzatildi", ru: "Исправлено", en: "Fixed" },
      closed:   { uz: "Yopilgan", ru: "Закрыто", en: "Closed" },
    },
    close:   { uz: "Yopish", ru: "Закрыть", en: "Close" },
    // joy nomlari (o'quvchi tilida ko'rsatiladi; admin uchun har doim o'zbekcha yuboriladi)
    tabs: { nazariya: { uz: "Nazariya", ru: "Теория", en: "Theory" }, lugat: { uz: "Lug'at", ru: "Словарь", en: "Glossary" },
            masalalar: { uz: "Masalalar", ru: "Задачи", en: "Problems" }, test: { uz: "Test", ru: "Тест", en: "Quiz" },
            mustaqil: { uz: "Mustaqil", ru: "Сам. работа", en: "Homework" } },
    k: {
      heading: { uz: "sarlavha", ru: "заголовок", en: "heading" }, para: { uz: "paragraf", ru: "абзац", en: "paragraph" },
      formula: { uz: "formula", ru: "формула", en: "formula" }, item: { uz: "ro'yxat bandi", ru: "пункт списка", en: "list item" },
      row: { uz: "jadval qatori", ru: "строка таблицы", en: "table row" }, note: { uz: "izoh", ru: "примечание", en: "note" },
      term: { uz: "atama", ru: "термин", en: "term" }, st: { uz: "shart", ru: "условие", en: "statement" },
      fig: { uz: "chizma", ru: "чертёж", en: "figure" }, ans: { uz: "javob", ru: "ответ", en: "answer" },
      whole: { uz: "butun bo'lim", ru: "весь раздел", en: "whole section" }, card: { uz: "umumiy", ru: "в целом", en: "overall" },
      step: { uz: (n) => `${n}-qadam`, ru: (n) => `шаг ${n}`, en: (n) => `step ${n}` },
      opt: { uz: (x) => `${x} variant`, ru: (x) => `вариант ${x}`, en: (x) => `option ${x}` },
      dis: { uz: (x) => `${x} variant tahlili`, ru: (x) => `разбор варианта ${x}`, en: (x) => `analysis of option ${x}` },
      figN: { uz: (n) => `${n}-rasm`, ru: (n) => `рис. ${n}`, en: (n) => `Fig. ${n}` },
    },
  };
  const kk = (k, lang, ...a) => { const v = T.k[k][lang] ?? T.k[k].uz; return typeof v === "function" ? v(...a) : v; };

  // ------------------------------------------------------------------ yordamchilar
  const tg = () => G.tg() || (window.Telegram && window.Telegram.WebApp) || null;
  const initData = () => { const w = tg(); return (w && w.initData) || ""; };
  const store = G.store;
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
  const fmtTime = (ms) => {
    try { return new Intl.DateTimeFormat(L() === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms)); }
    catch { return new Date(ms).toLocaleString(); }
  };
  let toastTimer;
  function toast(msg, kind = "") {
    let el = $("#izToast");
    if (!el) { el = document.createElement("div"); el.id = "izToast"; el.className = "iz-toast"; document.body.appendChild(el); }
    el.textContent = msg; el.className = "iz-toast on " + kind;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = "iz-toast"; }, 3200);
  }

  class ApiErr extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
  async function api(path, body) {
    let r;
    try {
      r = await fetch(API + path, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "X-Init-Data": initData() },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch { throw new ApiErr("network", 0); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiErr(j.error || "server", r.status);
    return j;
  }
  const errText = (e) => t(e.code === "rate" ? T.rate : e.code === "banned" ? T.banned : e.code === "auth" ? T.auth : T.err);

  // blok matni: asosiy tildagi qism, formulalar $LaTeX$ ko'rinishida (KaTeX annotatsiyasidan)
  function plain(node) {
    const c = node.cloneNode(true);
    if (c.querySelectorAll) {
      c.querySelectorAll(".bi > .tr").forEach((x) => { if (x.previousElementSibling) x.remove(); });
      c.querySelectorAll(".katex").forEach((k) => {
        const a = k.querySelector('annotation[encoding="application/x-tex"]');
        const disp = k.parentElement && k.parentElement.classList.contains("katex-display");
        k.replaceWith(document.createTextNode(a ? (disp ? ` $$${a.textContent}$$ ` : `$${a.textContent}$`) : k.textContent));
      });
      c.querySelectorAll(".katex-mathml").forEach((x) => x.remove());
      c.querySelectorAll("button.opt .l").forEach((x) => x.remove());
    }
    return (c.textContent || "").replace(/\s+/g, " ").trim();
  }

  // joyning tavsifi: "Nazariya › «Ishqalanish turlari» › formula"
  function describe(el, anchor, lang) {
    const tab = G.state.tab;
    const parts = [t2(T.tabs[tab], lang)];
    if (!el || anchor === "x") { parts.push(kk("whole", lang)); return parts.join(" › "); }
    let m;
    if (tab === "nazariya") {
      const art = el.closest("article");
      let top = el; while (top.parentElement && top.parentElement !== art) top = top.parentElement;
      for (let p = top; p; p = p.previousElementSibling) {
        const h = p.querySelector && p.querySelector("h2");
        if (h) { parts.push(`«${clip(plain(h), 60)}»`); break; }
      }
      const kid = (s) => !!el.querySelector(":scope > " + s);     // :has() eski WebView'larda yo'q
      const k = (el.matches("h2") || kid("h2")) ? "heading" : el.matches(".fm") ? "formula" : el.matches("li") ? "item"
        : el.matches(".trow") ? "row" : kid(".note") ? "note" : el.matches("figure") ? "fig" : "para";
      if (k === "fig" && (m = (el.dataset.fig || "").match(/\d+/))) parts.push(kk("figN", lang, +m[0]));
      else parts.push(kk(k, lang));
    } else if (tab === "lugat") {
      parts.push(`${kk("term", lang)} «${clip(plain($(".tm", el) || el), 50)}»`);
    } else if ((m = anchor.match(/^([SQH]\d+)(.*)$/))) {
      parts.push(m[1]);
      const r = m[2];
      if (r === "s") parts.push(kk("st", lang));
      else if (r === "f") parts.push(kk("fig", lang));
      else if (r === "a") parts.push(kk("ans", lang));
      else if (/^q\d+$/.test(r)) parts.push(kk("step", lang, +r.slice(1)));
      else if (/^o[A-E]$/.test(r)) parts.push(kk("opt", lang, r[1]));
      else if (/^d[A-E]$/.test(r)) parts.push(kk("dis", lang, r[1]));
      else if (!r && tab !== "mustaqil") parts.push(kk("card", lang));
    }
    return parts.join(" › ");
  }
  const t2 = (o, lang) => (o && (o[lang] ?? o.uz)) || "";

  // tanlangan blokdan izoh "manzili"
  function target(el, quoteText) {
    const anchor = el ? el.dataset.a : "x";
    let img = "";
    const im = el && (el.matches("img") ? el : el.matches("figure") ? $("img", el) : null);
    if (im) { const u = new URL(im.getAttribute("src"), location.href); img = u.pathname.replace(/^.*?(darslar\/)/, "$1"); }
    const full = el ? plain(el) : "";
    let quote = quoteText || full;
    if (!quote && im) quote = kk("fig", L());
    return {
      lesson: G.state.id, tab: G.state.tab, anchor,
      label: describe(el, anchor, "uz"), labelL: describe(el, anchor, L()),
      quote: clip(quote, QUOTE), img, h: el ? hash(full) : "",
    };
  }

  // ------------------------------------------------------------------ "Fikr" tugmasi va nishon
  let unread = store.get("izoh:unread", 0);
  function navButton() {
    const nav = $("#tabs");
    if (!nav || nav.hidden || G.state.view !== "lesson" || $("#izBtn", nav)) return;
    nav.insertAdjacentHTML("beforeend", `<button id="izBtn" class="iz-nav" aria-label="${esc(t(T.fikr))}"><span class="i">💬</span>${esc(t(T.fikr))}<b class="iz-badge" ${unread ? "" : "hidden"}>${unread}</b></button>`);
    $("#izBtn").addEventListener("click", onFikr);
  }
  function setBadge(n) {
    unread = n; store.set("izoh:unread", n);
    const b = $("#izBtn .iz-badge"); if (b) { b.textContent = n; b.hidden = !n; }
    const m = $("#izMineBtn .iz-badge"); if (m) { m.textContent = n; m.hidden = !n; }
    G.emit("izohUnread", n);   // progress.js: profil ikonkasidagi belgi va profil bo'limi
  }

  // o'quvchining izohlari bor joylarga belgi
  function markers() {
    const mine = store.get("izoh:mine", {});
    const set = new Set(mine[G.state.id] || []);
    G.view.querySelectorAll("[data-a].iz-has").forEach((e) => e.classList.remove("iz-has"));
    set.forEach((a) => { const [tab, an] = a.split(":"); if (tab !== G.state.tab) return; const e = G.view.querySelector(`[data-a="${CSS.escape(an)}"]`); if (e) e.classList.add("iz-has"); });
  }
  function remember(lesson, tab, anchor) {
    const mine = store.get("izoh:mine", {});
    const arr = mine[lesson] || (mine[lesson] = []);
    const key = `${tab}:${anchor}`;
    if (!arr.includes(key)) arr.push(key);
    const lessons = Object.keys(mine); if (lessons.length > 120) delete mine[lessons[0]];
    store.set("izoh:mine", mine);
  }

  // ------------------------------------------------------------------ matnni belgilash
  let sel = null, selTimer = null;
  const selChip = document.createElement("button");
  selChip.className = "iz-selchip"; selChip.hidden = true;
  document.body.appendChild(selChip);
  selChip.addEventListener("pointerdown", (e) => e.preventDefault());
  selChip.addEventListener("click", () => { if (sel) { const s = sel; clearSel(); openSheet(target(s.el, s.text)); } });
  function clearSel() { sel = null; selChip.hidden = true; try { getSelection().removeAllRanges(); } catch { } }
  document.addEventListener("selectionchange", () => {
    if (G.state.view !== "lesson" || sheetOpen()) return;
    const s = getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) { clearTimeout(selTimer); selTimer = setTimeout(() => { if (getSelection().isCollapsed) { sel = null; selChip.hidden = true; } }, 700); return; }
    const r = s.getRangeAt(0);
    let n = r.commonAncestorContainer; if (n.nodeType !== 1) n = n.parentElement;
    const host = n && n.closest("[data-a]");
    if (!host || !G.view.contains(host)) return;
    const box = document.createElement("div"); box.appendChild(r.cloneContents());
    const text = plain(box);
    if (!text) return;
    clearTimeout(selTimer);
    sel = { el: host, text };
    selChip.textContent = `💬 ${t(T.selBtn)}`;
    selChip.hidden = false;
  });

  // ------------------------------------------------------------------ joy tanlash rejimi
  let picking = false, hot = null;
  const shade = document.createElement("div"); shade.className = "iz-shade"; shade.hidden = true; document.body.appendChild(shade);
  const bar = document.createElement("div"); bar.className = "iz-pickbar"; bar.hidden = true; document.body.appendChild(bar);
  function underPoint(x, y) {
    shade.style.pointerEvents = "none";
    const e = document.elementFromPoint(x, y);
    shade.style.pointerEvents = "";
    const a = e && e.closest && e.closest("[data-a]");
    return a && G.view.contains(a) ? a : null;
  }
  function setHot(a) { if (hot) hot.classList.remove("iz-hot"); hot = a; if (hot) hot.classList.add("iz-hot"); }
  shade.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") setHot(underPoint(e.clientX, e.clientY)); });
  shade.addEventListener("click", (e) => {
    const a = underPoint(e.clientX, e.clientY);
    if (!a) return;
    setHot(a);
    try { tg() && tg().HapticFeedback.selectionChanged(); } catch { }
    setTimeout(() => { stopPick(); openSheet(target(a)); }, 120);
  });
  function startPick() {
    picking = true; document.body.classList.add("iz-picking");
    bar.innerHTML = `<div class="iz-hint">👆 ${esc(t(T.hint))}</div>
      <div class="iz-row"><button class="btn ghost" data-x="whole">${esc(t(T.whole))}</button><button class="btn ghost" data-x="cancel">${esc(t(T.cancel))}</button></div>`;
    bar.hidden = false; shade.hidden = false;
    bar.querySelector('[data-x="whole"]').onclick = () => { stopPick(); openSheet(target(null)); };
    bar.querySelector('[data-x="cancel"]').onclick = stopPick;
  }
  function stopPick() { picking = false; document.body.classList.remove("iz-picking"); bar.hidden = true; shade.hidden = true; setHot(null); }

  function onFikr() {
    if (picking) return stopPick();
    if (sel && G.view.contains(sel.el)) { const s = sel; clearSel(); return openSheet(target(s.el, s.text)); }
    startPick();
  }

  // ------------------------------------------------------------------ izoh oynasi (pastdan chiqadigan)
  const sheet = document.createElement("div"); sheet.className = "iz-sheet-wrap"; sheet.hidden = true; document.body.appendChild(sheet);
  const sheetOpen = () => !sheet.hidden;
  let current = null, kind = "savol";
  function closeSheet() { sheet.hidden = true; document.body.classList.remove("iz-lock"); current = null; }
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

  function openSheet(tg0) {
    current = tg0;
    const inTg = !!initData();
    const quoteHtml = tg0.quote ? `<div class="iz-quote">${G.rich(tg0.quote)}</div>` : "";
    const imgHtml = tg0.img ? `<img class="iz-thumb" src="${esc(tg0.img)}?v=${G.VER}" alt="">` : "";
    sheet.innerHTML = `<div class="iz-sheet" role="dialog" aria-label="${esc(t(T.fikr))}">
      <div class="iz-head"><b>💬 ${esc(t(T.fikr))}</b><button class="iz-x" aria-label="${esc(t(T.close))}">×</button></div>
      <div class="iz-where">📍 ${esc(tg0.lesson)} › ${esc(tg0.labelL)}</div>
      ${imgHtml}${quoteHtml}
      ${inTg ? `<div class="iz-kinds">${Object.entries(T.kinds).map(([k, v]) => `<button class="iz-kind ${k === kind ? "on" : ""}" data-k="${k}">${v.i} ${esc(t(v))}</button>`).join("")}</div>
      <textarea class="iz-text" maxlength="${MAXLEN}" rows="4" placeholder="${esc(t(T.ph))}"></textarea>
      <div class="iz-meta"><span class="iz-err" role="alert"></span><span class="iz-count">0 / ${MAXLEN}</span></div>
      <button class="btn wide iz-send">${esc(t(T.send))}</button>`
      : `<div class="iz-note">${esc(t(T.needTg))}</div><a class="btn wide" href="${BOT}?startapp=${encodeURIComponent(`${tg0.lesson}__${tg0.tab}__${tg0.anchor}`)}" target="_blank" rel="noopener">${esc(t(T.openTg))}</a>`}
      ${inTg ? `<button class="iz-minelink" id="izMineBtn">📂 ${esc(t(T.mine))} <b class="iz-badge" ${unread ? "" : "hidden"}>${unread}</b></button>` : ""}
    </div>`;
    sheet.hidden = false; document.body.classList.add("iz-lock");
    $(".iz-x", sheet).onclick = closeSheet;
    if (!inTg) return;
    const ta = $(".iz-text", sheet), err = $(".iz-err", sheet), cnt = $(".iz-count", sheet);
    sheet.querySelectorAll(".iz-kind").forEach((b) => b.addEventListener("click", () => {
      kind = b.dataset.k; sheet.querySelectorAll(".iz-kind").forEach((x) => x.classList.toggle("on", x === b));
    }));
    ta.addEventListener("input", () => { cnt.textContent = `${ta.value.length} / ${MAXLEN}`; err.textContent = ""; });
    $("#izMineBtn").onclick = () => { closeSheet(); openMine(); };
    $(".iz-send", sheet).onclick = () => send(ta, err, $(".iz-send", sheet));
    setTimeout(() => ta.focus(), 50);
  }

  let askedWrite = store.get("izoh:wa", false);
  function askWriteAccess() {
    const w = tg();
    const u = w && w.initDataUnsafe && w.initDataUnsafe.user;
    if (askedWrite || !w || !u || u.allows_write_to_pm || !w.requestWriteAccess || (w.isVersionAtLeast && !w.isVersionAtLeast("6.9"))) return Promise.resolve();
    askedWrite = true; store.set("izoh:wa", true);
    return new Promise((res) => { try { w.requestWriteAccess(() => res()); } catch { res(); } setTimeout(res, 15000); });
  }

  async function send(ta, err, btn) {
    const text = ta.value.trim();
    if (!text) { err.textContent = t(T.empty); ta.focus(); return; }
    if (!current || btn.disabled) return;
    btn.disabled = true; btn.textContent = t(T.sending);
    try {
      await askWriteAccess();
      const c = current;
      await api("/api/izoh", { lesson: c.lesson, tab: c.tab, anchor: c.anchor, label: c.label, quote: c.quote, img: c.img, h: c.h,
        kind, text, lang: L(), ver: G.VER });
      remember(c.lesson, c.tab, c.anchor);
      store.set("izoh:open", true);
      closeSheet(); markers();
      G.haptic("success"); toast(t(T.sent), "ok");
    } catch (e) {
      err.textContent = errText(e); G.haptic("error");
      btn.disabled = false; btn.textContent = t(T.send);
    }
  }

  // ------------------------------------------------------------------ "Mening izohlarim"
  const panel = document.createElement("div"); panel.className = "iz-panel"; panel.hidden = true; document.body.appendChild(panel);
  let items = [], next = null, focusId = null;
  function closeMine() { panel.hidden = true; document.body.classList.remove("iz-lock"); }

  async function openMine(id) {
    focusId = id ? +id : null;
    panel.innerHTML = `<div class="iz-phead"><b>📂 ${esc(t(T.mine))}</b><button class="iz-x" aria-label="${esc(t(T.close))}">×</button></div><div class="iz-list"><div class="muted">…</div></div>`;
    panel.hidden = false; document.body.classList.add("iz-lock");
    $(".iz-x", panel).onclick = closeMine;
    items = []; next = null;
    await loadMore();
  }

  async function loadMore() {
    const list = $(".iz-list", panel);
    try {
      const j = await api(`/api/izohlar${next ? `?before=${next}` : ""}`);
      items = items.concat(j.items || []); next = j.next || null;
      // serverdagi barcha izoh joylarini eslab qolish (boshqa qurilmada yozilganlar ham)
      items.forEach((c) => remember(c.lesson, c.tab, c.anchor));
      paintList();
      const unseen = (j.items || []).filter((c) => c.unread).map((c) => c.id);
      if (unseen.length) {
        api("/api/seen", { ids: unseen }).then((r) => { setBadge(r.unread || 0); store.set("izoh:open", (r.unread || 0) + (r.open || 0) > 0); }).catch(() => { });
      } else if (!next) refresh(true);
    } catch (e) {
      list.innerHTML = `<div class="card err">${esc(e.code === "auth" ? t(T.auth) : t(T.loadErr))}</div>`;
    }
  }

  function msgHtml(m) {
    if (m.a === "sys") return `<div class="iz-sys">${esc(t(m.text === "fixed" ? T.fixedMsg : T.closedMsg))}</div>`;
    const who = m.a === "admin" ? t(T.admin) : t(T.you);
    return `<div class="iz-msg ${m.a}"><div class="iz-mh"><b>${esc(who)}</b><span>${esc(fmtTime(m.t))}</span></div><div class="iz-mt">${esc(m.text)}</div></div>`;
  }

  function paintList() {
    const list = $(".iz-list", panel);
    if (!items.length) { list.innerHTML = `<div class="muted iz-empty">${esc(t(T.none))}</div>`; return; }
    list.innerHTML = items.map((c) => `<section class="card iz-item ${c.unread ? "unread" : ""}" data-id="${c.id}">
        <div class="iz-ih"><span class="iz-st ${c.status}">${esc(t(T.status[c.status] || T.status.open))}</span>
          <span class="muted">${(T.kinds[c.kind] || T.kinds.boshqa).i} #A-${c.id}</span>${c.unread ? `<span class="iz-new">${esc(t(T.isNew))}</span>` : ""}</div>
        <div class="iz-where">📍 ${esc(c.lesson)} › ${esc(c.label || "")}</div>
        ${c.quote ? `<div class="iz-quote">${G.rich(c.quote)}</div>` : ""}
        <div class="iz-thread">${(c.messages || []).map(msgHtml).join("")}</div>
        <div class="iz-actions"><button class="btn ghost" data-act="show">${esc(t(T.show))}</button>
          ${c.status !== "closed" ? `<button class="btn ghost" data-act="reply">${esc(t(T.reply))}</button>` : ""}</div>
        <div class="iz-replybox" hidden><textarea maxlength="${MAXLEN}" rows="3" placeholder="${esc(t(T.replyPh))}"></textarea>
          <div class="iz-meta"><span class="iz-err" role="alert"></span></div><button class="btn wide" data-act="sendreply">${esc(t(T.send))}</button></div>
      </section>`).join("") + (next ? `<button class="btn ghost wide" id="izMore">${esc(t(T.more))}</button>` : "");
    list.querySelectorAll(".iz-item").forEach((card) => {
      const c = items.find((x) => x.id === +card.dataset.id);
      card.querySelector('[data-act="show"]').onclick = () => showPlace(c);
      const rb = card.querySelector('[data-act="reply"]');
      if (rb) rb.onclick = () => { const box = card.querySelector(".iz-replybox"); box.hidden = !box.hidden; if (!box.hidden) box.querySelector("textarea").focus(); };
      card.querySelector('[data-act="sendreply"]').onclick = (e) => sendReply(c, card, e.currentTarget);
    });
    const more = $("#izMore"); if (more) more.onclick = () => { more.disabled = true; loadMore(); };
    if (focusId) {
      const f = list.querySelector(`.iz-item[data-id="${focusId}"]`); focusId = null;
      if (f) requestAnimationFrame(() => { f.scrollIntoView({ block: "center" }); f.classList.add("joyflash"); });
    }
  }

  async function sendReply(c, card, btn) {
    const ta = card.querySelector(".iz-replybox textarea"), err = card.querySelector(".iz-replybox .iz-err");
    const text = ta.value.trim();
    if (!text) { err.textContent = t(T.empty); return; }
    btn.disabled = true;
    try {
      const r = await api("/api/javob", { id: c.id, text });
      c.messages = (c.messages || []).concat([{ a: "user", text, t: r.t || Date.now() }]); c.status = "open";
      store.set("izoh:open", true);
      paintList(); G.haptic("success"); toast(t(T.sent), "ok");
    } catch (e) { err.textContent = errText(e); btn.disabled = false; }
  }

  function showPlace(c) {
    closeMine();
    pendingCheck = c;
    if (G.state.view === "lesson" && G.state.id === c.lesson && G.state.tab === c.tab && c.tab !== "test") {
      G.state.joy = c.anchor === "x" ? null : c.anchor; G.render();
    } else G.go({ view: "lesson", id: c.lesson, tab: c.tab, joy: c.anchor === "x" ? null : c.anchor });
  }
  // dars ochilgach: joy o'zgarganmi yoki yo'qolganmi — tekshirish
  let pendingCheck = null;
  function checkPlace() {
    const c = pendingCheck; pendingCheck = null;
    if (!c || c.anchor === "x" || G.state.id !== c.lesson) return;
    const el = G.view.querySelector(`[data-a="${CSS.escape(c.anchor)}"]`);
    if (!el) return toast(t(T.gone));
    if (c.h && hash(plain(el)) !== c.h) toast(t(T.changed));
  }

  // ------------------------------------------------------------------ holatni tekshirish (yangi javoblar)
  let lastCheck = 0;
  async function refresh(force) {
    if (!initData()) return;
    if (!force && (!store.get("izoh:open", false) || Date.now() - lastCheck < 60000)) return;
    lastCheck = Date.now();
    try {
      const r = await api("/api/holat");
      setBadge(r.unread || 0);
      store.set("izoh:open", (r.unread || 0) + (r.open || 0) > 0);
      store.set("izoh:holat", { unread: r.unread || 0, open: r.open || 0 });
      return r;
    } catch { return null; /* jim: keyingi safar */ }
  }
  // boshqa modullar uchun (progress.js profil sahifasi)
  G.izoh = { open: (id) => openMine(id), unread: () => unread, holat: () => store.get("izoh:holat", null),
    refresh: () => refresh(true), inTg: () => !!initData() };

  // ------------------------------------------------------------------ ulash
  G.on("render", () => { navButton(); markers(); checkPlace(); refresh(false); });
  G.on("izoh", () => { const id = G.pendingIzoh; G.pendingIzoh = null; if (id) openMine(id); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (picking) stopPick(); else if (sheetOpen()) closeSheet(); else if (!panel.hidden) closeMine(); } });
  // sahifa allaqachon chizilgan bo'lsa (skript kech yuklangan holat)
  if (G.state.view === "lesson") { navButton(); markers(); }
  if (G.state.izoh) { const id = G.state.izoh; G.state.izoh = null; openMine(id); }
  if (G.pendingIzoh) G.emit("izoh");
  // Telegram'dan qaytganda (ilova fonda turgan bo'lsa) — yangi javoblarni tekshirish
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(false); });
  setTimeout(() => refresh(false), 1500);
})();
