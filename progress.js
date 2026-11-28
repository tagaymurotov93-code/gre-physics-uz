/* GRE Physics Uz — shaxsiy progress va statistika (Mini App profili).
 *
 * Saqlash: localStorage["gre:pg"] (tezkor kesh, internetsiz ham ishlaydi) +
 *          server (Cloudflare Worker + D1) — window.PROGRESS_API berilgan va Telegram ichida bo'lsa.
 *          Server bo'lmasa yoki xato bersa — progress qurilmada saqlanib turadi, keyin sinxronlanadi.
 *
 * Ma'lumot modeli (doc):
 *   { v: 1, u: <ms>, last: { id, tab, u }, d: ["2026-11-24", ...] (faol kunlar),
 *     L: { "<DARS_ID>": { n, s, q, h, r, j, u } } }
 *   n — nazariyaning ko'rilgan qismi, 0..100 (95+ = o'qildi)
 *   s — ochilgan yechimlar bitmaskasi (S01 = 1-bit)
 *   q — testga BIRINCHI javoblar, har savolga bitta belgi:
 *       "-" javob yo'q, "*" javobdan oldin yechim ko'rilgan, "A".."E" to'g'ri, "a".."e" noto'g'ri,
 *       "+" yechim ko'rilgandan keyin javob berilgan (aniqlikka kirmaydi)
 *   h — mustaqil ish "Bajardim" (0/1)
 *   r — Xatolar daftarida qayta ishlab tuzatilgan savollar bitmaskasi
 *   j — har bo'limdagi oxirgi joy: { nazariya: "n40", masalalar: "S05", mustaqil: "H07" }
 *
 * Dars tugatilishi (har biri 25 %): nazariya oxirigacha ko'rildi; yechimlarning ≥ 2/3 qismi ochildi;
 * testning hamma savoliga javob berildi; mustaqil ish "Bajardim" deb belgilandi.
 *
 * app.js bilan aloqa (window.GRE): hodisalar view / solution / answer / peek / quizload, GRE.addView(...).
 */
(() => {
  "use strict";
  const G = window.GRE;
  if (!G) return;
  const $ = (s, el = document) => el.querySelector(s);
  const L = () => G.lang();
  const t = (o) => (o && (o[L()] ?? o.uz)) || "";
  const esc = G.esc;

  // ------------------------------------------------------------------ matnlar (bir tilli interfeys)
  const T = {
    profile:   { uz: "Mening profilim", ru: "Мой профиль", en: "My profile" },
    status:    { uz: "Mening holatim", ru: "Мой прогресс", en: "My progress" },
    open:      { uz: "Profil", ru: "Профиль", en: "Profile" },
    hello:     { uz: (n) => `Salom, ${n}!`, ru: (n) => `Привет, ${n}!`, en: (n) => `Hi, ${n}!` },
    start:     { uz: "Boshlash", ru: "Начать", en: "Start" },
    startTxt:  { uz: "Kursni birinchi darsdan boshlang — progressingiz shu yerda ko'rinadi.",
                 ru: "Начните курс с первого урока — здесь появится ваш прогресс.",
                 en: "Start the course with the first lesson — your progress will appear here." },
    cont:      { uz: "Davom ettirish", ru: "Продолжить", en: "Continue" },
    nextL:     { uz: "Keyingi dars", ru: "Следующий урок", en: "Next lesson" },
    contHere:  { uz: "Oxirgi joydan davom ettirish", ru: "Продолжить с места остановки", en: "Continue where you left off" },
    done:      { uz: "tugatilgan", ru: "пройдено", en: "completed" },
    doneL:     { uz: "Tugatilgan darslar", ru: "Пройдено уроков", en: "Lessons completed" },
    started:   { uz: "Boshlangan", ru: "Начато", en: "In progress" },
    acc:       { uz: "aniqlik", ru: "точность", en: "accuracy" },
    accL:      { uz: "Test aniqligi (1-urinish)", ru: "Точность тестов (1-я попытка)", en: "Quiz accuracy (1st try)" },
    answers:   { uz: "javob", ru: "ответов", en: "answers" },
    week:      { uz: "bu hafta", ru: "эта неделя", en: "this week" },
    days30:    { uz: "Faol kunlar (30 kun)", ru: "Активные дни (30 дней)", en: "Active days (30 days)" },
    of:        { uz: "dan", ru: "из", en: "of" },
    modules:   { uz: "Modullar bo'yicha", ru: "По модулям", en: "By module" },
    ready:     { uz: "tayyor", ru: "готово", en: "ready" },
    planned:   { uz: "dars rejada", ru: "уроков в плане", en: "lessons planned" },
    activity:  { uz: "Faollik (8 hafta)", ru: "Активность (8 недель)", en: "Activity (8 weeks)" },
    nLessons:  { uz: (n) => `${n} ta dars`, ru: (n) => `уроков: ${n}`, en: (n) => `${n} ${n === 1 ? "lesson" : "lessons"}` },
    inprog:    { uz: "Davom etayotgan darslar", ru: "Уроки в процессе", en: "Lessons in progress" },
    weak:      { uz: "E'tibor talab qiladigan darslar", ru: "Уроки, требующие внимания", en: "Lessons to review" },
    weakNote:  { uz: "1-urinishdagi aniqlik eng past bo'lgan testlar.", ru: "Тесты с самой низкой точностью с 1-й попытки.",
                 en: "Quizzes with the lowest first-try accuracy." },
    mist:      { uz: "Xatolar daftari", ru: "Тетрадь ошибок", en: "Mistake notebook" },
    mistTxt:   { uz: "Birinchi urinishda xato qilingan testlar. Qayta yechib, to'g'ri javob bersangiz — daftardan chiqadi.",
                 ru: "Тесты, в которых была ошибка с первой попытки. Решите заново правильно — и они уйдут из тетради.",
                 en: "Quiz items you missed on the first try. Solve them again correctly to clear them." },
    mistGo:    { uz: (n) => `Qayta ishlash (${n})`, ru: (n) => `Прорешать (${n})`, en: (n) => `Practice (${n})` },
    mistNone:  { uz: "Hozircha xato yo'q 👍", ru: "Ошибок пока нет 👍", en: "No mistakes yet 👍" },
    mistItem:  { uz: (i, n) => `Xato ${i} / ${n}`, ru: (i, n) => `Ошибка ${i} / ${n}`, en: (i, n) => `Mistake ${i} / ${n}` },
    fixed:     { uz: "Tuzatildi — daftardan chiqdi.", ru: "Исправлено — убрано из тетради.", en: "Fixed — removed from the notebook." },
    again:     { uz: "Hali xato — daftarda qoladi.", ru: "Пока неверно — остаётся в тетради.", en: "Still wrong — stays in the notebook." },
    next:      { uz: "Keyingi", ru: "Дальше", en: "Next" },
    finish:    { uz: "Yakunlash", ru: "Завершить", en: "Finish" },
    mistEnd:   { uz: (a, b) => `${b} tadan ${a} tasi tuzatildi.`, ru: (a, b) => `Исправлено ${a} из ${b}.`, en: (a, b) => `${a} of ${b} fixed.` },
    toProfile: { uz: "Profilga qaytish", ru: "Вернуться в профиль", en: "Back to profile" },
    hwDone:    { uz: "Bajardim", ru: "Выполнил(а)", en: "Done" },
    hwDoneOn:  { uz: "Bajarildi ✓", ru: "Выполнено ✓", en: "Done ✓" },
    hwAsk:     { uz: "Mustaqil masalalarni ishlab bo'lgach belgilang.", ru: "Отметьте, когда решите задачи для самостоятельной работы.",
                 en: "Mark this when you have worked through the homework problems." },
    parts:     { nazariya: { uz: "Nazariya", ru: "Теория", en: "Theory" }, masalalar: { uz: "Masalalar", ru: "Задачи", en: "Problems" },
                 test: { uz: "Test", ru: "Тест", en: "Quiz" }, mustaqil: { uz: "Mustaqil", ru: "Сам. работа", en: "Homework" } },
    privT:     { uz: "Ma'lumotlaringiz", ru: "Ваши данные", en: "Your data" },
    privTxt:   { uz: "Telegram ichida Mini App serverda faqat Telegram ismingiz, nickname (username) va ID'ingizni saqlaydi; ular siz bilan qayta aloqa uchun kerak. Bundan tashqari darslardagi progress, faol kunlar va o'qish vaqti saqlanadi — progressingiz boshqa qurilmada ham ko'rinishi va kursni yaxshilash uchun. Telefon raqam va boshqa ma'lumotlar olinmaydi.",
                 ru: "Внутри Telegram Mini App хранит на сервере только ваше имя в Telegram, никнейм (username) и ID — они нужны, чтобы связаться с вами. Кроме того, сохраняются прогресс по урокам, дни активности и время занятий — чтобы прогресс был виден на других устройствах и чтобы улучшать курс. Номер телефона и другие данные не собираются.",
                 en: "Inside Telegram, the Mini App stores on its server only your Telegram name, username and ID, which are needed to get back in touch with you. It also stores your lesson progress, active days and study time, so your progress shows on other devices and the course can be improved. Your phone number and other data are not collected." },
    privDel:   { uz: "Ma'lumotlarimni o'chirish", ru: "Удалить мои данные", en: "Delete my data" },
    privAsk:   { uz: "Yana bir marta bosing — serverdagi ma'lumotlaringiz va progress o'chadi", ru: "Нажмите ещё раз — ваши данные на сервере и прогресс будут удалены",
                 en: "Tap again — your data on the server and your progress will be erased" },
    privDone:  { uz: "Ma'lumotlaringiz o'chirildi. Ilovadan foydalanishda davom etsangiz, yangi ma'lumotlar yana saqlanadi.",
                 ru: "Ваши данные удалены. Если продолжите пользоваться приложением, новые данные снова будут сохраняться.",
                 en: "Your data has been deleted. If you keep using the app, new data will be stored again." },
    privErr:   { uz: "O'chirib bo'lmadi — internetni tekshirib, qayta urinib ko'ring.", ru: "Не удалось удалить — проверьте интернет и попробуйте снова.",
                 en: "Could not delete — check your connection and try again." },
    admin:     { uz: "📊 Admin panel", ru: "📊 Админ-панель", en: "📊 Admin panel" },
    synced:    { uz: "Progress Telegram hisobingizga bog'langan — boshqa qurilmada ham ko'rinadi.",
                 ru: "Прогресс привязан к вашему аккаунту Telegram — виден и на других устройствах.",
                 en: "Progress is linked to your Telegram account and shows on your other devices." },
    local:     { uz: "Progress shu qurilmada saqlanadi.", ru: "Прогресс хранится на этом устройстве.", en: "Progress is stored on this device." },
    reset:     { uz: "Progressni tozalash", ru: "Сбросить прогресс", en: "Reset progress" },
    resetAsk:  { uz: "Yana bir marta bosing — hammasi o'chadi", ru: "Нажмите ещё раз — всё будет удалено", en: "Tap again — everything will be erased" },
    qa:        { uz: "Savollarim va javoblar", ru: "Мои вопросы и ответы", en: "My questions and replies" },
    qaTxt:     { uz: "Darslar bo'yicha yozgan savol va fikrlaringiz hamda ularga berilgan javoblar.",
                 ru: "Ваши вопросы и замечания по урокам и ответы на них.", en: "Your questions and comments on lessons, and the replies to them." },
    qaNew:     { uz: (n) => `${n} ta yangi javob`, ru: (n) => `Новых ответов: ${n}`, en: (n) => `${n} new ${n === 1 ? "reply" : "replies"}` },
    qaWait:    { uz: (n) => `${n} tasi javob kutmoqda`, ru: (n) => `Ожидают ответа: ${n}`, en: (n) => `${n} awaiting a reply` },
    qaBtn:     { uz: "📂 Mening izohlarim", ru: "📂 Мои комментарии", en: "📂 My comments" },
    nothing:   { uz: "Hali boshlangan dars yo'q.", ru: "Пока нет начатых уроков.", en: "No lessons started yet." },
    wd:        { uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"], ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"], en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] },
  };
  const tf = (o, ...a) => { const v = o[L()] ?? o.uz; return typeof v === "function" ? v(...a) : v; };

  // ------------------------------------------------------------------ saqlash
  const KEY = "pg";
  const empty = () => ({ v: 1, u: 0, last: null, d: [], L: {} });
  let doc = G.store.get(KEY, null);
  if (!doc || doc.v !== 1 || typeof doc.L !== "object") doc = empty();
  const dirty = new Set();
  let metaDirty = false;
  const now = () => Date.now();
  const day = (ms = now()) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  let saveTimer = null;
  function save(id) {
    doc.u = now();
    if (id) dirty.add(id); else metaDirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { G.store.set(KEY, doc); }, 150);
    Sync.schedule();
  }
  function flushLocal() { clearTimeout(saveTimer); G.store.set(KEY, doc); }
  function les(id) {
    let e = doc.L[id];
    if (!e) e = doc.L[id] = { n: 0, s: 0, q: "", h: 0, r: 0, j: {}, u: 0 };
    if (!e.j || typeof e.j !== "object") e.j = {};
    return e;
  }
  function active(id) {
    const d = day();
    if (doc.d[doc.d.length - 1] !== d) { doc.d.push(d); doc.d = doc.d.slice(-400); metaDirty = true; }
    if (id) les(id).u = now();
  }
  const setChar = (s, i, ch, len) => { s = (s || "").padEnd(Math.max(len, i + 1), "-"); return s.slice(0, i) + ch + s.slice(i + 1); };
  const pop = (x) => { let c = 0; while (x) { c += x & 1; x >>>= 1; } return c; };

  // ------------------------------------------------------------------ server bilan sinxronlash (ixtiyoriy)
  // Worker API (izoh-server/worker.js ga qo'shiladi):
  //   GET  /api/progress            -> { doc }       (sarlavha X-Init-Data — Telegram initData, izoh tizimidagidek)
  //   POST /api/progress            <- { L: {id: entry}, last, d }   (faqat o'zgargan darslar)
  //   POST /api/progress/reset
  const Sync = (() => {
    const API = String(window.PROGRESS_API || "").replace(/\/+$/, "");
    const initData = () => { const w = G.tg() || (window.Telegram && window.Telegram.WebApp); return (w && w.initData) || ""; };
    let off = false, timer = null, busy = false, pulled = false;
    // faol o'qish vaqti: sahifa ko'rinib turgan va oxirgi 2 daqiqada teginish/aylantirish bo'lgan har 15 s hisoblanadi
    const SK = "pgsec";
    let secs = Number(G.store.get(SK, 0)) || 0, lastAct = Date.now(), lastPush = Date.now();
    ["pointerdown", "touchstart", "scroll", "keydown", "wheel"].forEach((ev) => window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true, capture: true }));
    setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastAct > 120000) return;
      secs += 15; G.store.set(SK, secs);
      if (secs >= 60 && Date.now() - lastPush > 180000) push();      // uzoq o'qishda ham 3 daqiqada bir yuboriladi
    }, 15000);
    const on = () => !!API && !off && !!initData();
    async function req(path, body, keepalive, raw) {
      const r = await fetch(API + path, { method: body ? "POST" : "GET", keepalive: !!keepalive,
        headers: { "Content-Type": "application/json", "X-Init-Data": initData() }, body: body ? JSON.stringify(body) : undefined });
      if (raw) return r;
      if (r.status === 404 || r.status === 401 || r.status === 403) { off = true; throw new Error("off"); }
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }
    async function pull() {
      if (!on() || pulled) return;
      try {
        const j = await req("/api/progress");
        pulled = true;
        if (j && j.admin && !G.isAdmin) { G.isAdmin = true; G.emit("admin"); }
        if (j && j.doc) { mergeDoc(j.doc); flushLocal(); redraw(); }
        // serverda yo'q, lekin qurilmada bor narsalarni yuborish (birinchi ulanish)
        Object.keys(doc.L).forEach((id) => dirty.add(id)); metaDirty = true;
        push();
      } catch { /* keyin */ }
    }
    async function push(keepalive) {
      if (!on() || busy || !pulled || (!dirty.size && !metaDirty && secs < 15)) return;
      const ids = [...dirty]; dirty.clear();
      const meta = metaDirty; metaDirty = false;
      const s = Math.min(secs, 1800);
      const L = Object.fromEntries(ids.map((id) => [id, doc.L[id]]).filter((x) => x[1]));
      // dars foizi va tugatilgan qismlar (admin statistikasi uchun; hisob Mini App'dagi bilan bir xil)
      const m = {};
      if (IDX) Object.keys(L).forEach((id) => { const p = parts(id);
        m[id] = { f: pct(p.frac), p: (p.nazariya >= 1 ? 1 : 0) | (p.masalalar >= 1 ? 2 : 0) | (p.test >= 1 ? 4 : 0) | (p.mustaqil >= 1 ? 8 : 0) }; });
      const body = { L, m, last: doc.last, d: doc.d.slice(-120), u: doc.u, s };
      busy = true; lastPush = Date.now();
      try { await req("/api/progress", body, keepalive); secs = Math.max(0, secs - s); G.store.set(SK, secs); }
      catch { ids.forEach((id) => dirty.add(id)); metaDirty = metaDirty || meta; }
      finally { busy = false; }
    }
    function schedule() { if (!on()) return; clearTimeout(timer); timer = setTimeout(() => push(), 4000); }
    async function reset() { if (on()) { try { await req("/api/progress/reset", {}); } catch { } } }
    // serverdagi barcha shaxsiy ma'lumotni o'chirish; true — o'chirildi (yoki server ulanmagan, o'chiradigan narsa yo'q)
    async function forget() {
      if (!API || !initData()) return true;
      try { const r = await req("/api/men/ochirish", {}, false, true); if (!r.ok) return false; secs = 0; G.store.set(SK, 0); return true; }
      catch { return false; }
    }
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { flushLocal(); push(true); } });
    window.addEventListener("pagehide", () => { flushLocal(); push(true); });
    return { pull, push, schedule, reset, forget, on, enabled: () => !!API && !!initData() };
  })();

  function mergeEntry(a, b) {
    if (!a) return b; if (!b) return a;
    const q = []; const n = Math.max((a.q || "").length, (b.q || "").length);
    const rank = (c) => (c === undefined || c === "-" ? 0 : c === "*" ? 1 : 2);
    for (let i = 0; i < n; i++) { const x = (a.q || "")[i], y = (b.q || "")[i]; q.push(rank(x) >= rank(y) ? (x || "-") : y); }
    const newer = (a.u || 0) >= (b.u || 0) ? a : b;
    return { n: Math.max(a.n || 0, b.n || 0), s: (a.s | b.s) >>> 0, q: q.join(""), h: Math.max(a.h || 0, b.h || 0),
      r: (a.r | b.r) >>> 0, j: { ...(newer === a ? b.j : a.j), ...(newer.j || {}) }, u: Math.max(a.u || 0, b.u || 0) };
  }
  function mergeDoc(o) {
    if (!o || typeof o !== "object") return;
    Object.entries(o.L || {}).forEach(([id, e]) => { doc.L[id] = mergeEntry(doc.L[id], e); });
    doc.d = [...new Set([...(doc.d || []), ...(o.d || [])])].sort().slice(-400);
    if (o.last && (!doc.last || (o.last.u || 0) > (doc.last.u || 0))) doc.last = o.last;
  }

  // ------------------------------------------------------------------ hisoblash
  let IDX = null, MODS = null;
  async function meta() {
    if (!IDX) [IDX, MODS] = await Promise.all([G.getJSON("darslar/index.json"), G.getJSON("moduller.json")]);
    return { idx: IDX, M: MODS };
  }
  const info = (id) => (IDX || []).find((x) => x.id === id);
  // dars tartibi: modul plan ro'yxati bo'yicha (faqat tayyor darslar)
  function order() {
    if (!IDX || !MODS) return [];
    const ready = new Set(IDX.map((x) => x.id)); const out = [];
    MODS.modules.forEach((m) => {
      const plan = (m.plan && m.plan.length) ? m.plan.map((p) => p.id) : IDX.filter((x) => x.module === m.id).map((x) => x.id);
      plan.forEach((id) => { if (ready.has(id) && !out.includes(id)) out.push(id); });
    });
    IDX.forEach((x) => { if (!out.includes(x.id)) out.push(x.id); });
    return out;
  }
  function parts(id) {
    const e = doc.L[id], c = (info(id) || {}).counts || {};
    if (!e) return { nazariya: 0, masalalar: 0, test: 0, mustaqil: 0, frac: 0, any: false };
    const nS = c.solved || 15, nQ = c.quiz || (e.q || "").length || 15;
    const needS = Math.max(1, Math.ceil(nS * 2 / 3));
    const answered = [...(e.q || "")].filter((ch) => /[A-Ea-e+]/.test(ch)).length;
    const p = {
      nazariya: e.n >= 95 ? 1 : (e.n || 0) / 100,
      masalalar: Math.min(1, pop(e.s || 0) / needS),
      test: Math.min(1, answered / nQ),
      mustaqil: e.h ? 1 : 0,
    };
    p.frac = (p.nazariya + p.masalalar + p.test + p.mustaqil) / 4;
    p.any = p.frac > 0 || !!e.u;
    p.answered = answered; p.nQ = nQ;
    return p;
  }
  const pct = (x) => Math.round(100 * x);
  function accOf(q) {
    let ok = 0, bad = 0;
    for (const ch of q || "") { if (/[A-E]/.test(ch)) ok++; else if (/[a-e]/.test(ch)) bad++; }
    return { ok, bad, n: ok + bad, p: ok + bad ? ok / (ok + bad) : null };
  }
  function totals() {
    const ids = order();
    let done = 0, started = 0, ok = 0, bad = 0;
    ids.forEach((id) => {
      const p = parts(id);
      if (p.frac >= 1) done++; else if (p.any) started++;
      const a = accOf((doc.L[id] || {}).q); ok += a.ok; bad += a.bad;
    });
    const d30 = new Set(doc.d.filter((d) => d >= day(now() - 29 * 864e5))).size;
    return { ready: ids.length, done, started, ok, bad, acc: ok + bad ? ok / (ok + bad) : null, d30 };
  }
  function mistakes() {
    const out = [];
    order().forEach((id) => {
      const e = doc.L[id]; if (!e) return;
      [...(e.q || "")].forEach((ch, i) => { if (/[a-e]/.test(ch) && !((e.r >>> i) & 1)) out.push({ id, i }); });
    });
    return out;
  }
  function resumeTarget() {
    const ids = order();
    const last = doc.last && info(doc.last.id) ? doc.last : null;
    if (last && parts(last.id).frac < 1) {
      const p = parts(last.id);
      // tugallanmagan birinchi bo'limga emas — oxirgi ochilgan bo'limga qaytaramiz
      const tab = last.tab && last.tab !== "lugat" ? last.tab : (["nazariya", "masalalar", "test", "mustaqil"].find((k) => p[k] < 1) || "nazariya");
      return { id: last.id, tab, joy: tab === "test" ? null : ((doc.L[last.id] || {}).j || {})[tab] || null, kind: "cont" };
    }
    // oxirgi dars tugagan (yoki hech narsa yo'q) — tartib bo'yicha birinchi tugallanmagan dars
    const startFrom = last ? ids.indexOf(last.id) + 1 : 0;
    const nxt = ids.slice(startFrom).find((id) => parts(id).frac < 1) || ids.find((id) => parts(id).frac < 1);
    if (!nxt) return null;
    return { id: nxt, tab: "nazariya", joy: null, kind: last ? "next" : "start" };
  }
  function goResume(r) { G.go({ view: "lesson", id: r.id, tab: r.tab, joy: r.joy, mod: (info(r.id) || {}).module }); }

  // ------------------------------------------------------------------ kichik UI bo'laklari
  const bar = (x, cls = "") => `<div class="pg-bar ${cls}"><i style="width:${pct(x)}%"></i></div>`;
  function weekDots() {
    const set = new Set(doc.d); let h = "";
    for (let k = 6; k >= 0; k--) { const d = day(now() - k * 864e5); h += `<i class="${set.has(d) ? "on" : ""}${k === 0 ? " today" : ""}"></i>`; }
    return `<span class="pg-week">${h}</span>`;
  }
  function heat() {
    // 8 hafta × 7 kun, ustunlar — haftalar (dushanbadan), oxirgi ustun — joriy hafta
    const set = new Set(doc.d);
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const wd = (today.getDay() + 6) % 7;                     // 0 = dushanba
    const startMs = today.getTime() - (wd + 7 * 7) * 864e5;
    let cells = "";
    for (let w = 0; w < 8; w++) for (let k = 0; k < 7; k++) {
      const ms = startMs + (w * 7 + k) * 864e5;
      const fut = ms > today.getTime();
      cells += `<i style="grid-column:${w + 2};grid-row:${k + 1}" class="${fut ? "fut" : set.has(day(ms)) ? "on" : ""}"></i>`;
    }
    const labels = T.wd[L()] || T.wd.en;
    return `<div class="pg-heat">${labels.map((x, k) => `<span style="grid-column:1;grid-row:${k + 1}">${k % 2 ? "" : esc(x)}</span>`).join("")}${cells}</div>`;
  }
  function ring(p) { return `style="--p:${pct(p)}"`; }

  // ------------------------------------------------------------------ bosh sahifa: "Mening holatim" kartasi
  async function decorateHome() {
    await meta();
    const v = G.view;
    if (G.state.view !== "home" || $("#pgCard", v)) return;
    const r = resumeTarget();
    const tt = totals();
    const fresh = !Object.keys(doc.L).length;
    let html;
    if (fresh) {
      const id = r ? r.id : (IDX[0] && IDX[0].id);
      const I = info(id);
      html = `<section class="card pg-card" id="pgCard">
        <div class="pg-h"><span>${esc(t(T.status))}</span></div>
        <div class="muted">${esc(t(T.startTxt))}</div>
        ${I ? `<button class="btn wide pg-go" data-go="1">▶ ${esc(t(T.start))}: ${esc(id)} · ${esc(t(I.title))}</button>` : ""}
      </section>`;
    } else {
      const I = r && info(r.id);
      const p = r ? parts(r.id) : null;
      const label = r ? (r.kind === "cont" ? `${t(T.cont)} — ${t(T.parts[r.tab] || T.parts.nazariya)}` : `${t(T.nextL)}`) : "";
      html = `<section class="card pg-card" id="pgCard">
        <div class="pg-h"><span>${esc(t(T.status))}</span><button class="pg-link" data-prof="1">${esc(t(T.open))} ›</button></div>
        ${I ? `<div class="pg-cur"><span class="code">${esc(r.id)}</span> ${esc(t(I.title))}</div>
          ${r.kind === "cont" ? `${bar(p.frac)}<div class="muted pg-sub"><b class="pg-pc">${pct(p.frac)}%</b>${partsLine(r.id)}</div>` : ""}
          <button class="btn wide pg-go" data-go="1">▶ ${esc(label)}</button>` : ""}
        <div class="pg-mini">
          <div><b>${tt.done}<small>/${tt.ready}</small></b><span>${esc(t(T.done))}</span></div>
          <div><b>${tt.acc == null ? "—" : pct(tt.acc) + "%"}</b><span>${esc(t(T.acc))}</span></div>
          <div>${weekDots()}<span>${esc(t(T.week))}</span></div>
        </div></section>`;
    }
    const hero = $(".hero", v);
    if (fresh && hero) hero.insertAdjacentHTML("afterend", html); else v.insertAdjacentHTML("afterbegin", html);
    const go = $("#pgCard [data-go]", v);
    if (go) go.addEventListener("click", () => goResume(r || { id: IDX[0].id, tab: "nazariya" }));
    const pr = $("#pgCard [data-prof]", v);
    if (pr) pr.addEventListener("click", () => G.go({ view: "profil" }));
    // modul kartalarida progress chizig'i
    v.querySelectorAll(".mod[data-id]").forEach((b) => {
      const ids = IDX.filter((x) => x.module === b.dataset.id).map((x) => x.id);
      if (!ids.length || $(".pg-bar", b)) return;
      const f = ids.reduce((s, id) => s + parts(id).frac, 0) / ids.length;
      if (f > 0) ($(".mbody", b) || b).insertAdjacentHTML("beforeend", bar(f, "thin"));
    });
  }
  function partsLine(id) {
    const p = parts(id);
    return `<span class="pg-pts">${["nazariya", "masalalar", "test", "mustaqil"].map((k) =>
      `<span class="pg-pt ${p[k] >= 1 ? "on" : ""}">${p[k] >= 1 ? "✓ " : ""}${esc(t(T.parts[k]))}</span>`).join("")}</span>`;
  }

  // ------------------------------------------------------------------ modul sahifasi: dars holatlari
  async function decorateModule() {
    await meta();
    G.view.querySelectorAll(".lrow.lesson[data-id]").forEach((row) => {
      const p = parts(row.dataset.id);
      if (!p.any || $(".pg-chip", row)) return;
      const num = $(".lnum", row);
      if (p.frac >= 1) { num.classList.add("pg-done"); num.textContent = "✓"; }
      else { num.classList.add("pg-part"); num.setAttribute("style", `--p:${pct(p.frac)}`); }
      const head = $(".lhead", row);
      if (head) head.insertAdjacentHTML("beforeend", `<span class="chip pg-chip ${p.frac >= 1 ? "ok" : ""}">${p.frac >= 1 ? "✓" : pct(p.frac) + "%"}</span>`);
    });
  }

  // ------------------------------------------------------------------ dars sahifasi: kuzatish
  let obs = null, scrollFn = null;
  function cleanupLesson() {
    if (obs) { obs.disconnect(); obs = null; }
    if (scrollFn) { window.removeEventListener("scroll", scrollFn); scrollFn = null; }
  }
  function paintTabs(id) {
    const p = parts(id);
    document.querySelectorAll("#tabs button[data-t]").forEach((b) => {
      const k = b.dataset.t;
      let tick = $(".pg-tick", b);
      const on = p[k] >= 1;
      if (on && !tick) b.insertAdjacentHTML("beforeend", `<b class="pg-tick" aria-hidden="true">✓</b>`);
      else if (!on && tick) tick.remove();
    });
  }
  const TOP = { nazariya: 'article.md [data-a^="n"]', masalalar: "section[data-a]", mustaqil: "ol.hw > li[data-a]" };
  async function decorateLesson() {
    await meta();
    const { id, tab } = G.state;
    if (!info(id)) return;
    const e = les(id);
    active(id);
    doc.last = { id, tab, u: now() };
    save(id);
    paintTabs(id);
    const v = G.view;

    // nazariya: qayergacha ko'rilgani
    if (tab === "nazariya") {
      const els = [...v.querySelectorAll(TOP.nazariya)];
      const num = (el) => parseInt(el.dataset.a.slice(1), 10) || 0;
      const total = Math.max(1, ...els.map(num));
      obs = new IntersectionObserver((ents) => {
        let mx = -1;
        ents.forEach((x) => { if (x.isIntersecting) mx = Math.max(mx, num(x.target)); });
        if (mx < 0) return;
        const n = Math.min(100, Math.round(100 * mx / total));
        if (n > (e.n || 0)) { const was = e.n >= 95; e.n = n; active(id); save(id); if (!was && n >= 95) paintTabs(id); }
      }, { rootMargin: "0px 0px -15% 0px" });
      els.forEach((el) => obs.observe(el));
    }
    // mustaqil ish: "Bajardim"
    if (tab === "mustaqil" && !$("#pgHw", v)) {
      const lnav = $("#lessonNav", v);   // "Oldingi / Keyingi" tugmalari eng pastda qolsin
      (lnav || v).insertAdjacentHTML(lnav ? "beforebegin" : "beforeend", `<section class="card pg-hw" id="pgHw"><div class="muted">${esc(t(T.hwAsk))}</div>
        <button class="btn wide ${e.h ? "pg-on" : ""}" id="pgHwBtn">${esc(t(e.h ? T.hwDoneOn : T.hwDone))}</button></section>`);
      $("#pgHwBtn").addEventListener("click", (ev) => {
        e.h = e.h ? 0 : 1; active(id); save(id);
        ev.currentTarget.classList.toggle("pg-on", !!e.h);
        ev.currentTarget.textContent = t(e.h ? T.hwDoneOn : T.hwDone);
        if (e.h) G.haptic("success");
        paintTabs(id);
      });
    }
    // oxirgi joy: o'qish paytida eslab qolinadi, keyingi kirishda "Davom ettirish" tugmasi
    const sel = TOP[tab];
    if (sel) {
      const saved = e.j[tab];
      const els = () => [...v.querySelectorAll(sel)];
      const startJoy = G.state.joy;  // focusJoy hali ishlamagan bo'lishi mumkin
      if (saved && !startJoy && saved !== (els()[0] || {}).dataset?.a && v.querySelector(`[data-a="${CSS.escape(saved)}"]`) && !$("#pgHere", v)) {
        v.insertAdjacentHTML("afterbegin", `<button class="pg-here" id="pgHere">↓ ${esc(t(T.contHere))}</button>`);
        $("#pgHere").addEventListener("click", (ev) => {
          ev.currentTarget.remove();
          const el = v.querySelector(`[data-a="${CSS.escape(saved)}"]`);
          if (el) { el.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); el.classList.remove("joyflash"); void el.offsetWidth; el.classList.add("joyflash"); }
        });
      }
      let tmr = null;
      scrollFn = () => {
        if (tmr) return;
        tmr = setTimeout(() => {
          tmr = null;
          if (G.state.view !== "lesson" || G.state.id !== id || G.state.tab !== tab) return;
          if (window.scrollY < 40) return;
          const el = els().find((x) => x.getBoundingClientRect().bottom > 80);
          if (el && e.j[tab] !== el.dataset.a) { e.j[tab] = el.dataset.a; const h = $("#pgHere", v); if (h) h.remove(); save(id); }
        }, 700);
      };
      window.addEventListener("scroll", scrollFn, { passive: true });
    }
  }

  // ------------------------------------------------------------------ app.js hodisalari
  G.on("view", (st) => {
    cleanupLesson();
    paintHeader();
    if (st.view === "home") decorateHome();
    else if (st.view === "module") decorateModule();
    else if (st.view === "lesson") decorateLesson();
  });
  G.on("solution", (id, i) => {
    const e = les(id);
    if (!((e.s >>> i) & 1)) { e.s = (e.s | (1 << i)) >>> 0; active(id); save(id); paintTabs(id); }
  });
  G.on("peek", (id, i, n) => {
    const e = les(id);
    if ((e.q || "")[i] === undefined || e.q[i] === "-") { e.q = setChar(e.q, i, "*", n); save(id); }
  });
  G.on("answer", (id, i, k, ok, n) => {
    const e = les(id);
    const cur = (e.q || "")[i];
    if (cur === undefined || cur === "-") e.q = setChar(e.q, i, ok ? "ABCDE"[k] : "abcde"[k], n);
    else if (cur === "*") e.q = setChar(e.q, i, "+", n);
    else return;   // birinchi javob allaqachon yozilgan — qayta yechish aniqlikka ta'sir qilmaydi
    active(id); save(id); paintTabs(id);
  });
  // eski versiyada yechilgan test (gre:<ID>:quiz) — birinchi javoblar sifatida ko'chirish
  G.on("quizload", (id, Q, st) => migrateQuiz(id, Q, st));
  function migrateQuiz(id, Q, st) {
    const e = doc.L[id];
    if (e && /[^-]/.test(e.q || "")) return false;
    const a = (st && st.a) || {};
    if (!Object.keys(a).length) return false;
    const x = les(id);
    x.q = Q.map((q) => (a[q.id] === undefined ? "-" : (a[q.id] === q.correct ? "ABCDE" : "abcde")[a[q.id]] || "-")).join("");
    x.u = x.u || now();
    save(id);
    return true;
  }
  async function migrateAll() {
    const keys = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const m = k && k.match(/^gre:(B\d+-L\d+):quiz$/); if (m) keys.push(m[1]); } } catch { return; }
    let changed = false;
    for (const id of keys) {
      if (doc.L[id] && /[^-]/.test(doc.L[id].q || "")) continue;
      try { const Q = await G.getJSON(`${G.base(id)}quiz.json`); changed = migrateQuiz(id, Q, G.store.get(`${id}:quiz`, null)) || changed; } catch { }
    }
    if (changed) redraw();
  }

  // ------------------------------------------------------------------ sarlavhadagi profil tugmasi
  function paintHeader() {
    let b = $("#pgBtn");
    if (!b) {
      const langs = $(".top .langs");
      if (!langs) return;
      langs.insertAdjacentHTML("beforebegin", `<button class="pg-hbtn" id="pgBtn" type="button">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><b class="pg-dot" hidden></b></button>`);
      b = $("#pgBtn");
      b.addEventListener("click", () => { if (G.state.view !== "profil") G.go({ view: "profil" }); });
    }
    b.setAttribute("aria-label", t(T.open));
    b.classList.toggle("on", G.state.view === "profil" || G.state.view === "xatolar");
    setDot(G.izoh ? G.izoh.unread() : G.store.get("izoh:unread", 0));
  }
  // izoh tizimidan yangi javob kelsa — profil ikonkasida qizil belgi va profil bo'limi yangilanadi
  function setDot(n) {
    const d = $("#pgBtn .pg-dot"); if (d) { d.hidden = !n; d.textContent = n > 9 ? "9+" : n || ""; }
    const q = $("#pgQa"); if (q) paintQa(q);
  }
  G.on("izohUnread", setDot);
  function qaHtml() {
    const hol = (G.izoh && G.izoh.holat()) || { unread: G.store.get("izoh:unread", 0), open: 0 };
    const n = G.izoh ? G.izoh.unread() : hol.unread;
    return `<h2>💬 ${esc(t(T.qa))}</h2>
      ${n ? `<div class="pg-qanew">${esc(tf(T.qaNew, n))}</div>` : `<div class="muted">${esc(t(T.qaTxt))}</div>`}
      ${hol.open ? `<div class="muted pg-sub">${esc(tf(T.qaWait, hol.open))}</div>` : ""}
      <button class="btn wide ${n ? "" : "ghost"} pg-go" id="pgQaBtn">${esc(t(T.qaBtn))}</button>`;
  }
  function paintQa(box) {
    box.innerHTML = qaHtml();
    const hot = !!(G.izoh && G.izoh.unread());
    box.classList.toggle("pg-qa-hot", hot);
    const tiles = $(".pg-tiles", G.view);
    if (hot && tiles && tiles.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING) tiles.before(box);   // yangi javob — tepaga
    $("#pgQaBtn", box).addEventListener("click", () => G.izoh && G.izoh.open());
  }
  function redraw() {
    const v = G.state.view;
    if (v === "home" || v === "profil" || v === "module") G.render();
  }

  // ------------------------------------------------------------------ profil sahifasi
  G.addView("profil", async () => {
    await meta();
    const v = G.view;
    G.header("GRE PHYSICS · UZ", t(T.profile));
    const tt = totals();
    const w = G.tg() || (window.Telegram && window.Telegram.WebApp);
    const user = w && w.initDataUnsafe && w.initDataUnsafe.user;
    const ids = order();

    const mods = MODS.modules.filter((m) => !m.about).map((m) => {
      const mi = IDX.filter((x) => x.module === m.id).map((x) => x.id);
      const dn = mi.filter((id) => parts(id).frac >= 1).length;
      const f = mi.length ? mi.reduce((s, id) => s + parts(id).frac, 0) / mi.length : 0;
      return `<div class="pg-mod"><div class="pg-mh"><span>${m.icon || ""} ${esc(t(m.title))}</span>
        <span class="muted">${mi.length ? `✓ ${dn} / ${mi.length}` : `${m.planned || 0} ${esc(t(T.planned))}`}</span></div>${mi.length ? bar(f, "thin") : ""}</div>`;
    }).join("");

    // davom etayotgan darslar — modullar bo'yicha yig'ilgan (yopiq) guruhlar; guruh ichida oxirgi ochilgani tepada
    const prog = ids.filter((id) => { const p = parts(id); return p.any && p.frac < 1; })
      .sort((a, b) => ((doc.L[b] || {}).u || 0) - ((doc.L[a] || {}).u || 0));
    const progRow = (id) => { const p = parts(id); return `<button class="lrow pg-row" data-res="${id}">
        <div class="lnum pg-part" ${ring(p.frac)}></div><div class="lbody"><div class="lhead"><span class="code">${id}</span>
        <span class="chip">${pct(p.frac)}%</span></div><div class="lt">${esc(t(info(id).title))}</div>
        <div class="muted pg-sub">${partsLine(id)}</div></div><div class="chev">›</div></button>`; };
    const progHtml = prog.length ? MODS.modules.filter((m) => !m.about).map((m) => {
      const g = prog.filter((id) => info(id).module === m.id);
      if (!g.length) return "";
      const avg = g.reduce((s, id) => s + parts(id).frac, 0) / g.length;
      return `<details class="pg-grp"><summary><span class="pg-gt">${m.icon || ""} ${esc(t(m.title))}</span>
          <span class="chip">${esc(tf(T.nLessons, g.length))} · ${pct(avg)}%</span></summary>${g.map(progRow).join("")}</details>`;
    }).join("") : `<div class="muted">${esc(t(T.nothing))}</div>`;

    const weak = ids.map((id) => ({ id, a: accOf((doc.L[id] || {}).q) })).filter((x) => x.a.n >= 5 && x.a.p < 0.7)
      .sort((a, b) => a.a.p - b.a.p).slice(0, 3);
    const weakHtml = weak.length ? `<section class="card"><h2>${esc(t(T.weak))}</h2><div class="muted">${esc(t(T.weakNote))}</div>
      ${weak.map((x) => `<button class="lrow pg-row" data-test="${x.id}"><div class="lnum pg-weak">${pct(x.a.p)}</div>
        <div class="lbody"><div class="lhead"><span class="code">${x.id}</span><span class="chip">${x.a.ok}/${x.a.n}</span></div>
        <div class="lt">${esc(t(info(x.id).title))}</div></div><div class="chev">›</div></button>`).join("")}</section>` : "";

    const mist = mistakes();
    const anyQuiz = tt.ok + tt.bad > 0;
    v.innerHTML = `
      ${user && user.first_name ? `<div class="pg-hello">${esc(tf(T.hello, user.first_name))}</div>` : ""}
      <div class="pg-tiles">
        <div class="card"><b>${tt.done}<small> / ${tt.ready}</small></b><span>${esc(t(T.doneL))}</span></div>
        <div class="card"><b>${tt.started}</b><span>${esc(t(T.started))}</span></div>
        <div class="card"><b>${tt.acc == null ? "—" : pct(tt.acc) + "%"}</b><span>${esc(t(T.accL))}${anyQuiz ? ` · ${tt.ok + tt.bad} ${esc(t(T.answers))}` : ""}</span></div>
        <div class="card"><b>${tt.d30}</b><span>${esc(t(T.days30))}</span></div>
      </div>
      ${G.izoh && G.izoh.inTg() ? `<section class="card pg-qa" id="pgQa"></section>` : ""}
      <section class="card"><h2>${esc(t(T.mist))}</h2><div class="muted">${esc(t(T.mistTxt))}</div>
        ${mist.length ? `<button class="btn wide pg-go" id="pgMist">${esc(tf(T.mistGo, mist.length))}</button>`
          : `<div class="pg-none">${esc(anyQuiz ? t(T.mistNone) : "—")}</div>`}</section>
      <section class="card"><h2>${esc(t(T.inprog))}</h2>${progHtml}</section>
      ${weakHtml}
      <section class="card"><h2>${esc(t(T.modules))}</h2>${mods}</section>
      <section class="card"><h2>${esc(t(T.activity))}</h2>${heat()}</section>
      ${G.isAdmin ? `<p><button class="btn wide" id="pgAdmin">${esc(t(T.admin))}</button></p>` : ""}
      <div class="muted pg-note">${esc(t(Sync.enabled() ? T.synced : T.local))}</div>
      <p><button class="btn ghost wide pg-reset" id="pgReset">${esc(t(T.reset))}</button></p>
      ${Sync.enabled() ? `<section class="card pg-priv"><h2>🔒 ${esc(t(T.privT))}</h2><div class="muted">${esc(t(T.privTxt))}</div>
        <div class="pg-privmsg" id="pgPrivMsg" hidden></div>
        <button class="btn ghost wide pg-reset" id="pgForget">${esc(t(T.privDel))}</button></section>` : ""}`;
    const ab = $("#pgAdmin"); if (ab) ab.addEventListener("click", () => G.go({ view: "admin" }));
    const fb = $("#pgForget");
    if (fb) {
      let armedF = false;
      fb.addEventListener("click", async (ev) => {
        const btn = ev.currentTarget;
        if (!armedF) { armedF = true; btn.textContent = t(T.privAsk); btn.classList.add("pg-danger");
          setTimeout(() => { armedF = false; const b = $("#pgForget"); if (b && !b.disabled) { b.textContent = t(T.privDel); b.classList.remove("pg-danger"); } }, 4000); return; }
        btn.disabled = true;
        const ok = await Sync.forget();
        const msg = $("#pgPrivMsg");
        if (ok) {
          doc = empty(); dirty.clear(); metaDirty = false; flushLocal();
          try { Object.keys(localStorage).filter((k) => /^gre:B\d+-L\d+:quiz$/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch { }
          G.haptic("warning");
          await G.render();
          const m2 = $("#pgPrivMsg"); if (m2) { m2.hidden = false; m2.textContent = t(T.privDone); m2.scrollIntoView({ block: "center" }); }
        } else {
          btn.disabled = false; armedF = false; btn.textContent = t(T.privDel); btn.classList.remove("pg-danger");
          if (msg) { msg.hidden = false; msg.textContent = t(T.privErr); }
        }
      });
    }
    v.querySelectorAll("[data-res]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.res, p = parts(id);
      const tab = ["nazariya", "masalalar", "test", "mustaqil"].find((k) => p[k] < 1) || "nazariya";
      G.go({ view: "lesson", id, tab, joy: tab === "test" ? null : (doc.L[id].j || {})[tab] || null, mod: info(id).module });
    }));
    v.querySelectorAll("[data-test]").forEach((b) => b.addEventListener("click", () => G.go({ view: "lesson", id: b.dataset.test, tab: "test", mod: info(b.dataset.test).module })));
    const qa = $("#pgQa");
    if (qa) {
      paintQa(qa);
      G.izoh.refresh().then(() => { const q = $("#pgQa"); if (q) paintQa(q); });
    }
    const mb = $("#pgMist"); if (mb) mb.addEventListener("click", () => { review = null; G.go({ view: "xatolar" }); });
    let armed = false;
    $("#pgReset").addEventListener("click", async (ev) => {
      if (!armed) { armed = true; ev.currentTarget.textContent = t(T.resetAsk); ev.currentTarget.classList.add("pg-danger");
        setTimeout(() => { armed = false; const b = $("#pgReset"); if (b) { b.textContent = t(T.reset); b.classList.remove("pg-danger"); } }, 4000); return; }
      doc = empty(); dirty.clear(); metaDirty = false; flushLocal();
      try { Object.keys(localStorage).filter((k) => /^gre:B\d+-L\d+:quiz$/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch { }
      await Sync.reset();
      G.haptic("warning");
      G.render();
    });
  }, () => ({ view: "home" }));

  // ------------------------------------------------------------------ Xatolar daftari: qayta yechish
  let review = null;   // { list, k, fixed }
  G.addView("xatolar", async () => {
    await meta();
    const v = G.view;
    G.header(t(T.profile).toUpperCase(), t(T.mist));
    if (!review) review = { list: mistakes(), k: 0, fixed: 0 };
    const R = review;
    if (R.k >= R.list.length) {
      v.innerHTML = `<section class="card score"><div class="n">${R.fixed} / ${R.list.length}</div>
        <div class="muted">${esc(tf(T.mistEnd, R.fixed, R.list.length))}</div>
        <p><button class="btn wide" id="pgBackP">${esc(t(T.toProfile))}</button></p></section>`;
      $("#pgBackP").addEventListener("click", () => { review = null; G.go({ view: "profil" }); });
      return;
    }
    const it = R.list[R.k];
    const Q = await G.getJSON(`${G.base(it.id)}quiz.json`);
    const q = Q[it.i];
    if (!q) { R.k++; return G.render(); }
    const a = G.sid(q.id);
    const qObj = { uz: q.question_uz, ru: q.question_ru, en: q.question_en };
    let chosen;
    const paint = () => {
      const done = chosen !== undefined;
      v.innerHTML = `<div class="muted">${esc(tf(T.mistItem, R.k + 1, R.list.length))} · <span class="code">${esc(it.id)} ${esc(a)}</span></div>
        <div class="progress"><i style="width:${pct(R.k / R.list.length)}%"></i></div>
        <section class="card">${G.bi(qObj, "p")}
          ${q.figure ? `<img class="fig" src="${G.base(it.id)}${q.figure}?v=${G.VER}" alt="${esc(q.id)}">` : ""}
          <div class="opts">${q.options.map((o, k) => {
            const cls = done ? (k === q.correct ? "ok" : (k === chosen ? "bad" : "")) : "";
            return `<button class="opt ${cls}" data-k="${k}" ${done ? "disabled" : ""}><span class="l">${G.LETTERS[k]}</span><span class="ot">${G.bi(G.biLoc(o.replace(/^\([A-E]\)\s*/, "")), "span")}</span></button>`;
          }).join("")}</div>
          ${done ? `<div class="sol"><div class="verdict ${chosen === q.correct ? "ok" : "bad"}">${esc(t(chosen === q.correct ? T.fixed : T.again))}</div>
            ${G.steps(q.full_solution, "ul", q.rules)}
            <p><button class="btn wide" id="pgNx">${esc(t(R.k === R.list.length - 1 ? T.finish : T.next))}</button></p></div>` : ""}
        </section>`;
      G.zoomable(v);
      v.querySelectorAll(".opt:not([disabled])").forEach((b) => b.addEventListener("click", () => {
        chosen = +b.dataset.k;
        if (chosen === q.correct) { const e = les(it.id); e.r = (e.r | (1 << it.i)) >>> 0; R.fixed++; active(it.id); save(it.id); G.haptic("success"); }
        else { active(); save(); G.haptic("error"); }
        paint();
      }));
      const nx = $("#pgNx");
      if (nx) nx.addEventListener("click", () => { R.k++; G.render(); window.scrollTo(0, 0); });
    };
    paint();
  }, () => { review = null; return { view: "profil" }; });

  // ------------------------------------------------------------------ start
  paintHeader();
  meta().then(() => {
    // skript kech yuklangan bo'lsa — allaqachon chizilgan sahifani bezash
    if (G.state.view === "home" && $(".mods", G.view) && !$("#pgCard", G.view)) decorateHome();
    else if (G.state.view === "module" && $(".lrow", G.view)) decorateModule();
    migrateAll();
    Sync.pull();
  }).catch(() => { });
  window.addEventListener("load", () => Sync.pull());
  G.on("admin", () => { if (G.state.view === "profil") G.render(); });
  G.progress = { doc: () => doc, parts, totals, mistakes, resumeTarget, info, order, meta, mods: () => MODS };
})();
