/* GRE Physics Uz — ommaviy xabar (e'lon) kartasi va «botdan xabar olish» ruxsati.
 *
 * Admin guruhda /yubor bilan yuborilgan oxirgi xabar 14 kun davomida bosh sahifa va Profil tepasida karta bo'lib turadi
 * (botga ruxsat bermagan yoki o'sha payt faol bo'lmagan o'quvchilar ham ko'rishi uchun). O'quvchi ⭐ baho qo'yishi,
 * javob yozishi yoki kartani yopishi mumkin; javob admin guruhdagi «📬 Javoblar» mavzusiga boradi.
 * Server: GET/POST /api/xabar, POST /api/men/ruxsat (izoh-server/worker.js). Faqat Telegram ichida ishlaydi.
 */
(() => {
  "use strict";
  const G = window.GRE;
  if (!G) return;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = G.esc;
  const API = () => String(window.PROGRESS_API || "").replace(/\/+$/, "");
  const tgw = () => G.tg() || (window.Telegram && window.Telegram.WebApp);
  const initData = () => { const w = tgw(); return (w && w.initData) || ""; };
  const t = (o) => (o && (o[G.lang()] ?? o.uz)) || "";
  const T = {
    title:  { uz: "Xabar", ru: "Сообщение", en: "Message" },
    photo:  { uz: "📷 Rasm/fayl bilan to'liq xabar bot chatida.", ru: "📷 Полное сообщение с фото/файлом — в чате бота.", en: "📷 The full message with the photo/file is in the bot chat." },
    rateQ:  { uz: "Baholang:", ru: "Оцените:", en: "Rate:" },
    ph:     { uz: "Javobingiz yoki taklifingiz…", ru: "Ваш ответ или предложение…", en: "Your reply or suggestion…" },
    send:   { uz: "Yuborish", ru: "Отправить", en: "Send" },
    close:  { uz: "Yopish", ru: "Закрыть", en: "Close" },
    thanks: { uz: "✅ Rahmat! Javobingiz yetkazildi.", ru: "✅ Спасибо! Ваш ответ доставлен.", en: "✅ Thank you! Your reply has been delivered." },
    rated:  { uz: "Rahmat! Bahoingiz saqlandi.", ru: "Спасибо! Оценка сохранена.", en: "Thank you! Your rating has been saved." },
    err:    { uz: "Yuborib bo'lmadi — internetni tekshirib, qayta urinib ko'ring.", ru: "Не удалось отправить — проверьте интернет и попробуйте снова.", en: "Could not send — check your connection and try again." },
    waT:    { uz: "🔔 Javoblar va yangiliklar", ru: "🔔 Ответы и новости", en: "🔔 Replies and news" },
    waTxt:  { uz: "Savollaringizga javoblar, yangi darslar va so'rovnomalarni bot orqali olishni xohlaysizmi? Telegram ruxsat so'raydi.",
              ru: "Хотите получать ответы на вопросы, новые уроки и опросы через бота? Telegram попросит разрешение.",
              en: "Would you like to get replies to your questions, new lessons and surveys from the bot? Telegram will ask for permission." },
    waYes:  { uz: "Ha, ruxsat beraman", ru: "Да, разрешаю", en: "Yes, allow" },
    waNo:   { uz: "Keyinroq", ru: "Позже", en: "Later" },
    waOk:   { uz: "✅ Rahmat! Endi javoblar bot chatiga keladi.", ru: "✅ Спасибо! Теперь ответы будут приходить в чат бота.", en: "✅ Thank you! Replies will now come to the bot chat." },
  };
  async function api(path, body) {
    const r = await fetch(API() + path, { method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "X-Init-Data": initData() }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  }
  // matn: HTML ekranlash, havolalar, qator ko'chishi
  const fmt = (s) => esc(s || "").replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)»"'])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)@([A-Za-z0-9_]{4,32})/g, '$1<a href="https://t.me/$2" target="_blank" rel="noopener">@$2</a>').replace(/\n/g, "<br>");

  // ------------------------------------------------------------------ e'lon kartasi
  let item, loaded = false, loading = null;
  const gone = new Set();
  function load() {
    if (loaded) return Promise.resolve(item);
    if (!loading) loading = (async () => {
      item = null;
      if (API() && initData()) { try { item = (await api("/api/xabar")).item; } catch { item = null; } }
      loaded = true;
      return item;
    })();
    return loading;
  }
  function cardHtml(x) {
    return `<section class="card xb" id="xbCard" data-id="${x.id}">
      <div class="xb-h">📣 ${esc(t(T.title))}<span class="muted">${new Date(x.created_at).toLocaleDateString("ru-RU")}</span></div>
      ${x.text ? `<div class="xb-t">${fmt(x.text)}</div>` : ""}
      ${x.photo ? `<div class="muted xb-n">${esc(t(T.photo))}</div>` : ""}
      ${x.rate ? `<div class="xb-rate"><span>${esc(t(T.rateQ))}</span>${[1, 2, 3, 4, 5].map((n) => `<button class="xb-star ${x.stars >= n ? "on" : ""}" data-n="${n}" aria-label="${n}">★</button>`).join("")}</div>` : ""}
      <textarea class="xb-in" id="xbIn" rows="3" maxlength="2000" placeholder="${esc(t(T.ph))}"></textarea>
      <div class="xb-row"><button class="btn" id="xbSend">${esc(t(T.send))}</button><button class="btn ghost" id="xbClose">${esc(t(T.close))}</button></div>
      <div class="xb-msg" id="xbMsg" hidden></div></section>`;
  }
  async function show() {
    const st = G.state.view;
    if (st !== "home" && st !== "profil") return;
    const x = await load();
    if (!x || gone.has(x.id) || G.state.view !== st || $("#xbCard", G.view)) return;
    const v = G.view;
    const anchor = st === "home" ? $(".hero", v) : null;
    if (anchor) anchor.insertAdjacentHTML("afterend", cardHtml(x)); else v.insertAdjacentHTML("afterbegin", cardHtml(x));
    const card = $("#xbCard", v), msg = $("#xbMsg", card);
    const say = (s) => { msg.hidden = false; msg.textContent = s; };
    const done = (s) => { gone.add(x.id); item = null; say(s); card.classList.add("xb-done"); setTimeout(() => card.remove(), 2600); };
    card.querySelectorAll(".xb-star").forEach((b) => b.addEventListener("click", async () => {
      const n = +b.dataset.n;
      card.querySelectorAll(".xb-star").forEach((s) => s.classList.toggle("on", +s.dataset.n <= n));
      x.stars = n;
      try { await api("/api/xabar", { id: x.id, stars: n }); G.haptic("success"); say(t(T.rated)); } catch { say(t(T.err)); }
    }));
    $("#xbSend", card).addEventListener("click", async (ev) => {
      const text = $("#xbIn", card).value.trim();
      if (!text) { $("#xbIn", card).focus(); return; }
      ev.currentTarget.disabled = true;
      try { await api("/api/xabar", { id: x.id, text, stars: x.stars || null }); G.haptic("success"); done(t(T.thanks)); }
      catch { ev.currentTarget.disabled = false; say(t(T.err)); }
    });
    $("#xbClose", card).addEventListener("click", () => {
      gone.add(x.id); item = null; card.remove();
      api("/api/xabar", { id: x.id, dismiss: 1 }).catch(() => { });
    });
  }

  // ------------------------------------------------------------------ «botdan xabar olish» ruxsati (bosh sahifada, bir marta)
  const WA = "wa";
  function askWrite() {
    if (G.state.view !== "home" || $("#xbWa", G.view)) return;
    const w = tgw(), u = w && w.initDataUnsafe && w.initDataUnsafe.user;
    if (!API() || !initData() || !u || u.allows_write_to_pm || !w.requestWriteAccess) return;
    if (w.isVersionAtLeast && !w.isVersionAtLeast("6.9")) return;
    const st = G.store.get(WA, null);
    if (st === "ok" || (st && Date.now() - st < 30 * 864e5)) return;           // «Keyinroq» — 30 kundan keyin qayta
    const days = (G.progress && G.progress.doc().d || []).length;
    if (days < 2) return;                                                       // yangi o'quvchini birinchi kuni bezovta qilmaslik
    const html = `<section class="card xb xb-wa" id="xbWa"><div class="xb-h">${esc(t(T.waT))}</div><div class="muted">${esc(t(T.waTxt))}</div>
      <div class="xb-row"><button class="btn" id="xbWaYes">${esc(t(T.waYes))}</button><button class="btn ghost" id="xbWaNo">${esc(t(T.waNo))}</button></div></section>`;
    const after = $("#xbCard", G.view) || $(".hero", G.view);
    if (after) after.insertAdjacentHTML("afterend", html); else G.view.insertAdjacentHTML("afterbegin", html);
    $("#xbWaNo").addEventListener("click", () => { G.store.set(WA, Date.now()); $("#xbWa").remove(); });
    $("#xbWaYes").addEventListener("click", () => {
      try {
        w.requestWriteAccess((ok) => {
          const c = $("#xbWa");
          if (ok) { G.store.set(WA, "ok"); api("/api/men/ruxsat", {}).catch(() => { }); if (c) { c.innerHTML = `<div>${esc(t(T.waOk))}</div>`; setTimeout(() => c.remove(), 2600); } }
          else { G.store.set(WA, Date.now()); if (c) c.remove(); }
        });
      } catch { G.store.set(WA, Date.now()); }
    });
  }

  G.on("view", (st) => {
    if (st.view === "home" || st.view === "profil") show().then(() => { if (G.state.view === "home") askWrite(); });
  });
  if (G.state.view === "home" || G.state.view === "profil") show().then(askWrite);
  G.xabar = { reload: () => { loaded = false; loading = null; return load(); } };
})();
