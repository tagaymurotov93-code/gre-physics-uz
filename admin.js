/* GRE Physics Uz — Admin panel (ishlab chiquvchi uchun statistika). Faqat Telegram ichida ishlaydi.
 *
 * Kim ko'radi: server (izoh-server/worker.js) admin guruh administratorlari va ADMIN_IDS ro'yxatini tekshiradi.
 * Bu faylda hech qanday ma'lumot yo'q — hammasi /api/admin/* dan, Telegram initData imzosi bilan so'raladi;
 * boshqa foydalanuvchi bu sahifani ochsa ham server 403 qaytaradi.
 * Kirish: Profil → «📊 Admin panel» (faqat adminlarda ko'rinadi) yoki ?startapp=admin.
 * Interfeys faqat o'zbek tilida (admin uchun).
 */
(() => {
  "use strict";
  const G = window.GRE;
  if (!G) return;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = G.esc;
  const API = () => String(window.PROGRESS_API || window.IZOH_API || "").replace(/\/+$/, "");
  const initData = () => { const w = G.tg() || (window.Telegram && window.Telegram.WebApp); return (w && w.initData) || ""; };
  const uz = (o) => (o && (o.uz || o.en)) || "";

  const A = { tab: "umumiy", kun: 30, user: null, lesson: null, q: "", sort: "oxirgi", qsort: "tartib", lsort: "tartib" };
  const cache = new Map();
  async function api(path, fresh) {
    if (!fresh && cache.has(path)) return cache.get(path);
    const r = await fetch(API() + path, { headers: { "X-Init-Data": initData() } });
    if (r.status === 403 || r.status === 401) throw new Error("ruxsat");
    if (!r.ok) throw new Error("http " + r.status);
    const j = await r.json();
    cache.set(path, j);
    return j;
  }

  // ------------------------------------------------------------------ formatlash
  const num = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const pc = (a, b) => (b ? Math.round(100 * a / b) + "%" : "—");
  const dur = (s) => { const m = Math.round((s || 0) / 60); const hh = Math.floor(m / 60); return hh ? `${hh} soat ${m % 60} daq` : `${m} daq`; };
  const durS = (s) => { const m = Math.round((s || 0) / 60); return m >= 60 ? `${(m / 60).toFixed(m >= 600 ? 0 : 1)} s` : `${m} d`; };
  const dd = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
  const dt = (ms) => ms ? new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms)) : "—";
  function ago(ms) {
    if (!ms) return "—";
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 2) return "hozir";
    if (m < 60) return `${m} daq oldin`;
    const hh = Math.floor(m / 60);
    if (hh < 24) return `${hh} soat oldin`;
    const d = Math.floor(hh / 24);
    return d < 30 ? `${d} kun oldin` : dt(ms).slice(0, 10);
  }
  const src = (k) => (!k ? "To'g'ridan-to'g'ri" : k === "izoh" ? "Bot xabari (izoh javobi)" : k === "admin" ? "Admin havolasi" : k);
  const TABN = { nazariya: "Nazariya", lugat: "Lug'at", masalalar: "Masalalar", test: "Test", mustaqil: "Mustaqil" };
  const KIND = { savol: "❓", xato: "⚠️", taklif: "💡", boshqa: "💬" };
  const STAT = { open: "javob kutmoqda", answered: "javob berildi", fixed: "tuzatildi", closed: "yopilgan" };
  const title = (id) => { const L = G.progress && G.progress.info(id); return L ? uz(L.title) : ""; };

  // ------------------------------------------------------------------ ustunli grafik (bitta qator ma'lumot, bitta rang)
  // Teginish/kursor bilan har kunning qiymati grafik ustidagi satrda ko'rinadi (standart — oxirgi kun).
  let chartN = 0;
  function bars(rows, val, label, fmt, opt = {}) {
    const id = "adc" + (++chartN);
    const max = Math.max(1, ...rows.map(val));
    const n = rows.length;
    const cols = rows.map((r, i) => {
      const v = val(r), hgt = v ? Math.max(2, Math.round(100 * v / max)) : 0;
      return `<div class="ad-col" data-i="${i}" title="${esc(label(r) + ": " + fmt(v))}"><div class="ad-bar" style="height:${hgt}%"></div></div>`;
    }).join("");
    const ticks = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1].map((i) => `<span style="left:${(100 * (i + 0.5) / n).toFixed(2)}%">${esc(opt.tick ? opt.tick(rows[i]) : label(rows[i]))}</span>`).join("") : "";
    setTimeout(() => {
      const box = document.getElementById(id); if (!box) return;
      const read = $(".ad-read", box), cs = [...box.querySelectorAll(".ad-col")];
      const show = (i) => { cs.forEach((c, k) => c.classList.toggle("on", k === i)); read.innerHTML = `<b>${esc(fmt(val(rows[i])))}</b> · ${esc(label(rows[i]))}${opt.extra ? ` · ${esc(opt.extra(rows[i]))}` : ""}`; };
      const pick = (ev) => { const c = ev.target.closest(".ad-col"); if (c) show(+c.dataset.i); };
      box.addEventListener("pointermove", pick); box.addEventListener("pointerdown", pick);
      show(n - 1);
    });
    return `<div class="ad-chart" id="${id}"><div class="ad-read"></div>
      <div class="ad-plot"><span class="ad-max">${esc(fmt(max))}</span><div class="ad-cols" style="grid-template-columns:repeat(${n},1fr)">${cols}</div></div>
      <div class="ad-ticks">${ticks}</div></div>`;
  }
  const tile = (v, l, sub) => `<div class="card ad-tile"><b>${v}</b><span>${esc(l)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
  const meter = (f, cls = "") => `<div class="ad-meter ${cls}"><i style="width:${Math.round(100 * Math.min(1, Math.max(0, f)))}%"></i></div>`;

  // ------------------------------------------------------------------ sahifa
  G.addView("admin", async () => {
    G.header("ADMIN · GRE PHYSICS UZ", "Statistika");
    const v = G.view;
    if (!initData()) { v.innerHTML = `<div class="card">Admin panel faqat Telegram ichida ochiladi (@GREPhysicsUz_bot → Darslar).</div>`; return; }
    if (G.progress) await G.progress.meta().catch(() => { });
    const segs = [["umumiy", "Umumiy"], ["oquvchilar", "O'quvchilar"], ["darslar", "Darslar"], ["testlar", "Testlar"]];
    const cur = A.user ? "oquvchilar" : A.tab;
    v.innerHTML = `<div class="ad-seg">${segs.map(([k, l]) => `<button data-k="${k}" class="${k === cur ? "on" : ""}">${l}</button>`).join("")}</div>
      <div id="adBody"><div class="card muted">Yuklanmoqda…</div></div>`;
    v.querySelectorAll(".ad-seg button").forEach((b) => b.addEventListener("click", () => {
      A.tab = b.dataset.k; A.user = null; G.render(); window.scrollTo(0, 0);
    }));
    const body = $("#adBody");
    try {
      if (A.user) await userCard(body, A.user);
      else await ({ umumiy: overview, oquvchilar: users, darslar: lessons, testlar: quiz })[A.tab](body);
    } catch (e) {
      body.innerHTML = e.message === "ruxsat"
        ? `<div class="card">⛔ Bu sahifa faqat admin uchun. Admin — «GRE izohlar» guruhining administratorlari (yoki serverdagi ADMIN_IDS).</div>`
        : `<div class="card err">Ma'lumotni yuklab bo'lmadi (${esc(e.message)}). <button class="btn ghost" id="adRetry">Qayta urinish</button></div>`;
      const rb = $("#adRetry"); if (rb) rb.addEventListener("click", () => { cache.clear(); G.render(); });
    }
  }, () => (A.user ? (A.user = null, { view: "admin" }) : { view: "profil" }));

  const refreshBtn = () => `<p><button class="btn ghost wide" id="adRef">↻ Yangilash</button></p>`;
  function bindRefresh(el) { const b = $("#adRef", el); if (b) b.addEventListener("click", () => { cache.clear(); G.render(); }); }

  // ------------------------------------------------------------------ Umumiy
  async function overview(el) {
    const d = await api(`/api/admin/umumiy?kun=${A.kun}`);
    const D = d.days;
    const newSum = D.reduce((s, x) => s + x.new, 0), secSum = D.reduce((s, x) => s + x.secs, 0);
    const qn = D.reduce((s, x) => s + x.qn, 0), qok = D.reduce((s, x) => s + x.qok, 0);
    const hmax = Math.max(1, ...d.hours);
    const smax = Math.max(1, ...d.sources.map((x) => x.n));
    el.innerHTML = `
      <div class="ad-tiles">
        ${tile(num(d.users), "Jami o'quvchilar", `botga yozish mumkin: ${num(d.write_ok)}`)}
        ${tile(num(d.dau), "Bugun faol")}
        ${tile(num(d.wau), "7 kunda faol")}
        ${tile(num(d.mau), "30 kunda faol")}
      </div>
      <div class="ad-per">${[7, 30, 90].map((k) => `<button data-k="${k}" class="${k === A.kun ? "on" : ""}">${k} kun</button>`).join("")}</div>
      <section class="card"><h2>Faol o'quvchilar</h2><div class="muted ad-sub">kuniga · ${A.kun} kunda yangi: ${num(newSum)}</div>
        ${bars(D, (x) => x.users, (x) => dd(x.day), (v) => `${num(v)} faol`, { extra: (x) => `yangi ${x.new} · kirish ${x.opens}` })}</section>
      <section class="card"><h2>Yangi o'quvchilar</h2><div class="muted ad-sub">kuniga · jami ${num(newSum)}</div>
        ${bars(D, (x) => x.new, (x) => dd(x.day), (v) => `${num(v)} yangi`)}</section>
      <section class="card"><h2>O'qish vaqti</h2><div class="muted ad-sub">kuniga, daqiqa · jami ${dur(secSum)}${D.some((x) => x.users) ? ` · faol kunda o'rtacha ${dur(secSum / Math.max(1, D.reduce((s, x) => s + x.users, 0)))}` : ""}</div>
        ${bars(D, (x) => Math.round(x.secs / 60), (x) => dd(x.day), (v) => `${num(v)} daq`)}</section>
      <section class="card"><h2>Qaysi soatlarda o'qishadi</h2><div class="muted ad-sub">Toshkent vaqti · ${A.kun} kun · katak qancha to'q bo'lsa, shuncha ko'p o'quvchi</div>
        <div class="ad-hours" id="adHours">${d.hours.map((n, k) => `<div class="ad-hc" data-k="${k}" title="${k}:00 — ${n}" style="--a:${(0.08 + 0.92 * n / hmax).toFixed(3)}"></div>`).join("")}</div>
        <div class="ad-hticks"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
        <div class="ad-read" id="adHr">Katakni bosing</div></section>
      <section class="card"><h2>Qaytib kelish</h2>
        <div class="ad-kv"><span>7 kundan keyin qaytganlar</span><b>${pc(d.ret7.back, d.ret7.n)}</b><small>${d.ret7.back} / ${d.ret7.n}</small></div>
        <div class="ad-kv"><span>30 kundan keyin qaytganlar</span><b>${pc(d.ret30.back, d.ret30.n)}</b><small>${d.ret30.back} / ${d.ret30.n}</small></div>
        <div class="ad-kv"><span>Testga birinchi javoblar (${A.kun} kun)</span><b>${pc(qok, qn)}</b><small>to'g'ri · ${num(qn)} javob</small></div>
        <div class="muted ad-sub">Qaytib kelish: kamida 7 (30) kun oldin kelgan o'quvchilardan qanchasi o'sha muddatdan keyin yana kirgan.</div></section>
      <section class="card"><h2>Yangi o'quvchilar qayerdan keldi</h2><div class="muted ad-sub">Mini App qaysi havola bilan birinchi marta ochilgan (${A.kun} kun)</div>
        ${d.sources.length ? d.sources.map((x) => `<div class="ad-src"><span>${esc(src(x.k))}</span><b>${num(x.n)}</b>${meter(x.n / smax)}</div>`).join("") : `<div class="muted">Hali ma'lumot yo'q.</div>`}
        <div class="muted ad-sub">Maslahat: kanal postidagi havolaga dars ID'sini qo'shing (…/darslar?startapp=B1-L04) — shunda qaysi post o'quvchi olib kelgani ko'rinadi.</div></section>
      <section class="card"><h2>Izohlar</h2>
        <div class="ad-kv"><span>Javob kutayotgan</span><b>${num(d.comments.open)}</b></div>
        <div class="ad-kv"><span>${A.kun} kunda yozilgan</span><b>${num(d.comments.recent)}</b></div></section>
      ${refreshBtn()}`;
    el.querySelectorAll(".ad-per button").forEach((b) => b.addEventListener("click", () => { A.kun = +b.dataset.k; G.render(); }));
    const hr = $("#adHr");
    el.querySelectorAll(".ad-hc").forEach((c) => c.addEventListener("pointerdown", () => {
      el.querySelectorAll(".ad-hc").forEach((x) => x.classList.toggle("on", x === c));
      const k = +c.dataset.k; hr.innerHTML = `<b>${num(d.hours[k])}</b> o'quvchi-kun · ${String(k).padStart(2, "0")}:00–${String(k + 1).padStart(2, "0")}:00`;
    }));
    bindRefresh(el);
  }

  // ------------------------------------------------------------------ O'quvchilar ro'yxati
  async function users(el) {
    const SORTS = [["oxirgi", "Oxirgi kirish"], ["yangi", "Yangilar"], ["vaqt", "Ko'p vaqt"], ["darslar", "Ko'p dars"]];
    el.innerHTML = `<div class="ad-tools"><input class="search ad-q" id="adQ" type="search" placeholder="Ism, @username yoki ID" value="${esc(A.q)}">
        <select id="adSort">${SORTS.map(([k, l]) => `<option value="${k}" ${k === A.sort ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div id="adList"><div class="card muted">Yuklanmoqda…</div></div>`;
    const list = $("#adList");
    let items = [], next = 0, total = 0;
    const row = (u) => {
      const acc = u.qn ? ` · test ${pc(u.qok, u.qn)}` : "";
      const lst = u.last && u.last.id ? ` · hozir: ${esc(u.last.id)}` : "";
      return `<button class="lrow ad-u" data-id="${u.id}"><div class="lbody">
          <div class="lhead"><b>${esc(u.name || "—")}</b>${u.username ? `<span class="muted">@${esc(u.username)}</span>` : ""}</div>
          <div class="muted ad-ul">${esc(ago(u.last_seen))} · ${u.days} kun · ${dur(u.secs)}</div>
          <div class="muted ad-ul">✓ ${u.done} / ${u.started} dars${acc}${lst}${u.comments ? ` · 💬 ${u.comments}` : ""}</div>
        </div><div class="chev">›</div></button>`;
    };
    const paint = () => {
      list.innerHTML = `<section class="card ad-ulist"><div class="muted ad-sub">Topildi: ${num(total)}</div>
        ${items.length ? items.map(row).join("") : `<div class="muted">Hech kim topilmadi.</div>`}
        ${next ? `<button class="btn ghost wide" id="adMore">Yana ko'rsatish</button>` : ""}</section>${refreshBtn()}`;
      list.querySelectorAll(".ad-u").forEach((b) => b.addEventListener("click", () => { A.user = +b.dataset.id; G.render(); window.scrollTo(0, 0); }));
      const mb = $("#adMore", list); if (mb) mb.addEventListener("click", () => load(true));
      bindRefresh(list);
    };
    async function load(more) {
      const off = more ? next : 0;
      const j = await api(`/api/admin/foydalanuvchilar?saralash=${A.sort}&q=${encodeURIComponent(A.q)}&offset=${off}`);
      items = more ? items.concat(j.items) : j.items; next = j.next; total = j.total;
      paint();
    }
    let tm = null;
    $("#adQ").addEventListener("input", (ev) => { clearTimeout(tm); tm = setTimeout(() => { A.q = ev.target.value.trim(); load(false).catch(() => { }); }, 400); });
    $("#adSort").addEventListener("change", (ev) => { A.sort = ev.target.value; load(false).catch(() => { }); });
    await load(false);
  }

  // ------------------------------------------------------------------ O'quvchi kartasi
  async function userCard(el, id) {
    const d = await api(`/api/admin/foydalanuvchi?id=${id}`);
    const u = d.user;
    const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
    const byDay = Object.fromEntries(d.days.map((x) => [x.day, x]));
    const D = [];
    for (let k = 29; k >= 0; k--) { const day = new Date(Date.parse(today) - k * 864e5).toISOString().slice(0, 10); D.push({ day, ...(byDay[day] || { secs: 0, opens: 0 }) }); }
    const qn = d.lessons.reduce((s, x) => s + x.qn, 0), qok = d.lessons.reduce((s, x) => s + x.qok, 0);
    const done = d.lessons.filter((x) => x.pct >= 100).length;
    const P = [["N", 1, "Nazariya"], ["M", 2, "Masalalar"], ["T", 4, "Test"], ["S", 8, "Mustaqil"]];
    const lrow = (x) => `<div class="ad-lr"><div class="ad-lh"><span class="code">${esc(x.lesson_id)}</span><span class="ad-lt">${esc(title(x.lesson_id))}</span><b>${x.pct}%</b></div>
        ${meter(x.pct / 100, x.pct >= 100 ? "ok" : "")}
        <div class="muted ad-ul">${P.map(([l, b, n]) => `<span class="ad-pt ${x.parts & b ? "on" : ""}" title="${n}">${l}</span>`).join("")}
          ${x.qn ? ` test ${x.qok}/${x.qn}` : ""} · ${esc(ago(x.updated_at))}${x.done_at ? ` · tugatgan ${esc(dt(x.done_at).slice(0, 10))}` : ""}</div></div>`;
    el.innerHTML = `
      <section class="card ad-who"><h2>${esc(u.name || "—")}</h2>
        ${u.username ? `<a class="ad-link" id="adTg" href="https://t.me/${esc(u.username)}">@${esc(u.username)} ↗</a>` : `<div class="muted">username yo'q</div>`}
        <div class="ad-kv"><span>Telegram ID</span><b><code>${u.id}</code></b><button class="btn ghost ad-copy" id="adCopy">Nusxa</button></div>
        <div class="ad-kv"><span>Birinchi kirish</span><b>${esc(dt(u.first_seen))}</b></div>
        <div class="ad-kv"><span>Oxirgi kirish</span><b>${esc(ago(u.last_seen))}</b></div>
        <div class="ad-kv"><span>Qayerdan kelgan</span><b>${esc(src((u.source || "").split("__")[0]))}</b></div>
        <div class="ad-kv"><span>Bot unga yoza oladimi</span><b>${u.write_ok ? "ha" : "noma'lum"}</b></div>
        ${d.last && d.last.id ? `<div class="ad-kv"><span>Hozirgi joyi</span><b>${esc(d.last.id)} · ${esc(TABN[d.last.tab] || d.last.tab)}</b></div>` : ""}
      </section>
      <div class="ad-tiles">
        ${tile(num(d.days.length), "Faol kunlar")}
        ${tile(esc(dur(u.secs)), "O'qish vaqti")}
        ${tile(`${done}<small> / ${d.lessons.length}</small>`, "Tugatgan / boshlagan")}
        ${tile(pc(qok, qn), "Test aniqligi", qn ? `${qn} ta birinchi javob` : "")}
      </div>
      <section class="card"><h2>So'nggi 30 kun</h2><div class="muted ad-sub">kuniga o'qish vaqti, daqiqa</div>
        ${bars(D, (x) => Math.round(x.secs / 60), (x) => dd(x.day), (v) => `${num(v)} daq`, { extra: (x) => `kirish ${x.opens || 0}` })}</section>
      <section class="card"><h2>Darslar</h2><div class="muted ad-sub">N — nazariya, M — masalalar, T — test, S — mustaqil (yashil — tugatilgan qism)</div>
        ${d.lessons.length ? d.lessons.map(lrow).join("") : `<div class="muted">Hali dars boshlanmagan.</div>`}</section>
      ${d.comments.length ? `<section class="card"><h2>Izohlari</h2>${d.comments.map((c) => `<div class="ad-kv"><span>${KIND[c.kind] || "💬"} #A-${c.id} · ${esc(c.lesson)}</span><small>${esc(STAT[c.status] || c.status)} · ${esc(dt(c.created_at).slice(0, 10))}</small></div>`).join("")}</section>` : ""}
      <p><button class="btn ghost wide" id="adBack">‹ O'quvchilar ro'yxati</button></p>`;
    $("#adBack").addEventListener("click", () => { A.user = null; G.render(); });
    $("#adCopy").addEventListener("click", async (ev) => {
      try { await navigator.clipboard.writeText(String(u.id)); ev.currentTarget.textContent = "✓"; } catch { ev.currentTarget.textContent = String(u.id); }
    });
    const ta = $("#adTg");
    if (ta) ta.addEventListener("click", (ev) => { const w = G.tg(); if (w && w.openTelegramLink) { ev.preventDefault(); w.openTelegramLink(ta.href); } });
  }

  // ------------------------------------------------------------------ Darslar
  async function lessons(el) {
    const d = await api("/api/admin/darslar");
    const by = Object.fromEntries(d.items.map((x) => [x.lesson_id, x]));
    let ids = G.progress ? G.progress.order() : d.items.map((x) => x.lesson_id);
    const SORTS = [["tartib", "Kurs tartibida"], ["kop", "Ko'p boshlangan"], ["tugatish", "Past tugatish"], ["aniqlik", "Past test aniqligi"]];
    const st = (id) => by[id] || { started: 0, done: 0, avg: 0, p1: 0, p2: 0, p3: 0, p4: 0, qn: 0, qok: 0 };
    const withData = ids.filter((id) => by[id]);
    if (A.lsort === "kop") ids = withData.sort((a, b) => st(b).started - st(a).started);
    else if (A.lsort === "tugatish") ids = withData.filter((id) => st(id).started >= 3).sort((a, b) => st(a).done / st(a).started - st(b).done / st(b).started);
    else if (A.lsort === "aniqlik") ids = withData.filter((id) => st(id).qn >= 10).sort((a, b) => st(a).qok / st(a).qn - st(b).qok / st(b).qn);
    const maxS = Math.max(1, ...d.items.map((x) => x.started));
    const row = (id) => {
      const x = st(id);
      return `<button class="ad-lr ad-lb ${x.started ? "" : "off"}" data-id="${esc(id)}">
        <div class="ad-lh"><span class="code">${esc(id)}</span><span class="ad-lt">${esc(title(id))}</span><b>${x.started}</b></div>
        ${meter(x.started / maxS)}
        ${x.started ? `<div class="muted ad-ul">tugatgan ${x.done} (${pc(x.done, x.started)}) · o'rtacha ${Math.round(x.avg)}% · N ${x.p1} · M ${x.p2} · T ${x.p3} · S ${x.p4}${x.qn ? ` · test ${pc(x.qok, x.qn)}` : ""}</div>` : ""}</button>`;
    };
    el.innerHTML = `<div class="ad-tools"><select id="adLs">${SORTS.map(([k, l]) => `<option value="${k}" ${k === A.lsort ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <section class="card"><div class="muted ad-sub">Raqam — darsni boshlagan o'quvchilar. N/M/T/S — shu qismni tugatganlar soni (qayerda tashlab ketilayotgani ko'rinadi). Bosing — test tahlili.</div>
        ${ids.length ? ids.map(row).join("") : `<div class="muted">Bu saralash uchun ma'lumot yetarli emas.</div>`}</section>${refreshBtn()}`;
    $("#adLs").addEventListener("change", (ev) => { A.lsort = ev.target.value; G.render(); });
    el.querySelectorAll(".ad-lb").forEach((b) => b.addEventListener("click", () => { A.lesson = b.dataset.id; A.tab = "testlar"; G.render(); window.scrollTo(0, 0); }));
    bindRefresh(el);
  }

  // matnni qisqartirish: formula ($...$) o'rtasidan kesilmaydi
  function cut(s, n) {
    if (s.length <= n) return s;
    let t = s.slice(0, n);
    if (((t.match(/(?<!\\)\$/g) || []).length) % 2) t = t.slice(0, t.lastIndexOf("$"));
    return t.replace(/\s+\S*$/, "") + " …";
  }

  // ------------------------------------------------------------------ Testlar: savollar bo'yicha birinchi javoblar
  async function quiz(el) {
    const all = await api("/api/admin/test?dars=" + encodeURIComponent(A.lesson || "B0-L01"));
    const ls = all.lessons;
    if (!A.lesson || !ls.some((x) => x.lesson_id === A.lesson)) A.lesson = (ls[0] && ls[0].lesson_id) || A.lesson;
    if (!A.lesson) { el.innerHTML = `<div class="card muted">Hali testga javob yo'q.</div>`; return; }
    const d = A.lesson === all.id ? all : await api("/api/admin/test?dars=" + encodeURIComponent(A.lesson));
    let Q = [];
    try { Q = await G.getJSON(`${G.base(A.lesson)}quiz.json`); } catch { }
    const per = {};
    for (const r of d.items) (per[r.q] = per[r.q] || {})[r.ch] = r.n;
    const L = "ABCDE";
    let rows = Q.map((q, i) => {
      const c = per[i] || {};
      const cnt = [...L].map((x, k) => (c[x] || 0) + (c[x.toLowerCase()] || 0));
      const n = cnt.reduce((s, x) => s + x, 0);
      const ok = cnt[q.correct] || 0;
      let wk = -1; cnt.forEach((x, k) => { if (k !== q.correct && x > 0 && (wk < 0 || x > cnt[wk])) wk = k; });
      return { i, q, cnt, n, ok, p: n ? ok / n : null, wk };
    });
    if (A.qsort === "qiyin") rows = rows.filter((r) => r.n).sort((a, b) => a.p - b.p);
    const lsOpts = ls.map((x) => `<option value="${esc(x.lesson_id)}" ${x.lesson_id === A.lesson ? "selected" : ""}>${esc(x.lesson_id)} · ${esc(title(x.lesson_id)).slice(0, 40)} (${x.n})</option>`).join("");
    const card = (r) => {
      const qt = r.q.question_uz || "";
      return `<div class="ad-qq"><div class="ad-lh"><span class="code">Q${String(r.i + 1).padStart(2, "0")}</span>
          <span class="ad-lt">${r.n ? `to'g'ri <b>${pc(r.ok, r.n)}</b> · ${r.n} javob` : "javob yo'q"}</span></div>
        <div class="ad-qt">${G.rich(cut(qt, 160), "uz")}</div>
        ${r.n ? `<div class="ad-opts">${[...L].map((x, k) => `<div class="ad-opt ${k === r.q.correct ? "ok" : ""}"><span>${x}${k === r.q.correct ? " ✓" : ""}</span>${meter(r.cnt[k] / r.n, k === r.q.correct ? "ok" : "")}<small>${pc(r.cnt[k], r.n)}</small></div>`).join("")}</div>
          ${r.n >= 5 && r.wk >= 0 && r.cnt[r.wk] / r.n >= 0.25 ? `<div class="ad-warn">Ko'p tanlangan xato javob: ${L[r.wk]} (${pc(r.cnt[r.wk], r.n)}) — savol yoki shu variantni tekshirib ko'ring.</div>` : ""}` : ""}</div>`;
    };
    el.innerHTML = `<div class="ad-tools"><select id="adLes">${lsOpts}</select>
        <select id="adQs"><option value="tartib" ${A.qsort === "tartib" ? "selected" : ""}>Savollar tartibida</option><option value="qiyin" ${A.qsort === "qiyin" ? "selected" : ""}>Eng qiyinlari avval</option></select></div>
      <section class="card"><div class="muted ad-sub">Har o'quvchining faqat <b>birinchi</b> javobi hisoblanadi (yechimni oldin ko'rganlar kirmaydi). ✓ — to'g'ri javob.</div>
        ${rows.length ? rows.map(card).join("") : `<div class="muted">Bu dars testiga hali javob yo'q.</div>`}</section>${refreshBtn()}`;
    $("#adLes").addEventListener("change", (ev) => { A.lesson = ev.target.value; G.render(); });
    $("#adQs").addEventListener("change", (ev) => { A.qsort = ev.target.value; G.render(); });
    bindRefresh(el);
  }

  // ?sahifa=admin bilan ochilgan bo'lsa, app.js bu sahifani hali bilmagan — qayta chizish
  if (G.state.view === "admin") G.render();
})();
