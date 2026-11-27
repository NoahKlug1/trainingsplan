"use strict";

/* ---------- Speicher ---------- */
const KEY = "trainingsplan-v1";
const DEFAULTS = {
  settings: { startDate: null },
  days: {}      // "YYYY-MM-DD": { done: {id:true}, weights: {id:"kg"}, note: "" }
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw) return { days: raw.days || {}, settings: { ...DEFAULTS.settings, ...raw.settings } };
  } catch (e) { /* ignore */ }
  return structuredClone(DEFAULTS);
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast("Speichern fehlgeschlagen"); }
}

/* ---------- Datum ---------- */
const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function keyOf(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function mondayOf(d) { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); x.setHours(0, 0, 0, 0); return x; }
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}
function fmtDate(d) { return d.toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" }); }

if (!state.settings.startDate) { state.settings.startDate = keyOf(mondayOf(today())); save(); }

function isDeloadWeek(d) {
  const start = mondayOf(fromKey(state.settings.startDate));
  const weeks = Math.floor((mondayOf(d) - start) / (7 * 86400000));
  return weeks >= 0 && (weeks + 1) % 6 === 0;
}

/* ---------- Plan-Logik ---------- */
function sessionFor(d) {
  const s = PLAN[d.getDay()];
  if (s.rest) return s;
  const evenWeek = isoWeek(d) % 2 === 0;
  return {
    ...s,
    exercises: s.exercises.map(ex => (ex.alt && evenWeek) ? ex.alt : ex)
  };
}
function dayData(k) {
  if (!state.days[k]) state.days[k] = { done: {}, weights: {}, note: "" };
  return state.days[k];
}
function progressOf(d) {
  const s = sessionFor(d);
  if (s.rest) return null;
  const data = state.days[keyOf(d)];
  const total = s.exercises.length;
  const done = data ? s.exercises.filter(e => data.done[e.id]).length : 0;
  return { done, total, ratio: done / total };
}
function lastWeight(exId, beforeKey) {
  const group = WEIGHT_GROUP[exId] || exId;
  const keys = Object.keys(state.days).filter(k => k < beforeKey).sort().reverse();
  for (const k of keys) {
    const w = state.days[k].weights || {};
    for (const [id, val] of Object.entries(w)) {
      if (val && (WEIGHT_GROUP[id] || id) === group) return { val, date: k };
    }
  }
  return null;
}

/* ---------- UI: Heute ---------- */
let currentDay = today();

function renderToday() {
  const d = currentDay, k = keyOf(d);
  const isToday = k === keyOf(today());
  document.getElementById("dayName").textContent = DAY_NAMES[d.getDay()];
  document.getElementById("dayDate").textContent = `${isToday ? "Heute · " : ""}${fmtDate(d)} · KW ${isoWeek(d)}`;
  document.getElementById("deloadBanner").classList.toggle("hidden", !isDeloadWeek(d));

  const s = sessionFor(d);
  const card = document.getElementById("dayCard");

  if (s.rest) {
    card.innerHTML = `<div class="rest">
      <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
      <div class="rest-title">Ruhetag</div>
      <p>${s.note ? s.note + " · " : ""}Erholung ist Teil vom Training.</p></div>`;
    return;
  }

  const data = state.days[k] || { done: {}, weights: {}, note: "" };
  const p = progressOf(d);
  card.innerHTML = `
    <div class="section">
      <div class="session-meta">
        <div><div class="session-title">${s.title}</div><div class="session-place">${s.place}</div></div>
        <span class="count ${p.done === p.total ? "ok" : ""}">${p.done}/${p.total}</span>
      </div>
      <div class="bar"><div style="width:${p.ratio * 100}%"></div></div>
      <ul id="exList" class="exlist"></ul>
      <button id="allDone" class="btn ${p.done === p.total ? "ghost" : ""}">${p.done === p.total ? "Zurücksetzen" : "Alles erledigt"}</button>
    </div>
    <div class="section">
      <h2>Notiz</h2>
      <textarea id="note" class="note" placeholder="Wie lief's? Projekt, Gefühl, Schmerzen …">${escapeHtml(data.note || "")}</textarea>
    </div>`;

  const list = document.getElementById("exList");
  s.exercises.forEach(ex => {
    const done = !!data.done[ex.id];
    const last = ex.weight ? lastWeight(ex.id, k) : null;
    const el = document.createElement("li");
    el.className = "ex" + (done ? " done" : "");
    el.innerHTML = `
      <button class="check" aria-label="Erledigt"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
      <div class="exbody">
        <div class="exname">${ex.name}</div>
        <div class="exdetail">${ex.detail}</div>
        ${ex.weight ? `<div class="weightrow">
          <input type="number" inputmode="decimal" step="0.5" placeholder="kg" value="${data.weights[ex.id] ?? ""}">
          <span class="last">${last ? `Letztes Mal: ${last.val} kg` : (ex.id.includes("fb") || ex.id.includes("pull") ? "kg Zusatzgewicht" : "kg")}</span>
        </div>` : ""}
      </div>`;
    el.querySelector(".check").addEventListener("click", () => {
      const dd = dayData(k);
      dd.done[ex.id] = !dd.done[ex.id];
      if (!dd.done[ex.id]) delete dd.done[ex.id];
      save(); renderToday();
      if (progressOf(d).done === progressOf(d).total) toast("Training geschafft");
    });
    const inp = el.querySelector("input");
    if (inp) inp.addEventListener("change", () => {
      const dd = dayData(k);
      if (inp.value) dd.weights[ex.id] = inp.value; else delete dd.weights[ex.id];
      save();
    });
    list.appendChild(el);
  });

  document.getElementById("allDone").addEventListener("click", () => {
    const dd = dayData(k);
    const allDone = s.exercises.every(e => dd.done[e.id]);
    s.exercises.forEach(e => { if (allDone) delete dd.done[e.id]; else dd.done[e.id] = true; });
    save(); renderToday();
    if (!allDone) toast("Training geschafft");
  });
  document.getElementById("note").addEventListener("input", e => { dayData(k).note = e.target.value; save(); });
}

document.getElementById("prevDay").addEventListener("click", () => { currentDay = addDays(currentDay, -1); renderToday(); });
document.getElementById("nextDay").addEventListener("click", () => { currentDay = addDays(currentDay, 1); renderToday(); });

/* ---------- UI: Woche ---------- */
function trainedCount(monday) {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const p = progressOf(addDays(monday, i));
    if (p && p.ratio >= 0.5) n++;
  }
  return n;
}

function renderWeek() {
  const mon = mondayOf(today()), tk = keyOf(today());
  const grid = document.getElementById("weekGrid");
  grid.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i), k = keyOf(d), p = progressOf(d);
    let cls = "off";
    if (p) {
      if (p.done === p.total) cls = "full";
      else if (p.done > 0) cls = "part";
      else if (k < tk) cls = "miss";
      else cls = "open";
    }
    const el = document.createElement("button");
    el.className = "wd" + (k === tk ? " today" : "");
    el.innerHTML = `<div class="l">${SHORT[d.getDay()]}</div><div class="n">${d.getDate()}</div><div class="dot ${cls}"></div>`;
    el.addEventListener("click", () => { currentDay = d; switchView("today"); });
    grid.appendChild(el);
  }
  const cnt = trainedCount(mon);
  const score = document.getElementById("weekScore");
  score.textContent = `${cnt}/4 Trainings`;
  score.className = "count" + (cnt >= 4 ? " ok" : "");
  document.getElementById("weekLabel").textContent = `KW ${isoWeek(mon)} · ${mon.getDate()}.${mon.getMonth() + 1}. – ${addDays(mon, 6).getDate()}.${addDays(mon, 6).getMonth() + 1}.`;

  // Verlauf: letzte 8 Wochen
  const hist = document.getElementById("history");
  hist.innerHTML = "";
  for (let w = 7; w >= 0; w--) {
    const m = addDays(mon, -7 * w), c = trainedCount(m);
    const col = document.createElement("div");
    col.className = "hcol";
    col.innerHTML = `<div class="hval">${c}</div><div class="hbar ${c < 3 ? "low" : ""}" style="height:${(c / 4) * 80}%"></div><div class="hlabel">${isoWeek(m)}</div>`;
    hist.appendChild(col);
  }

  // Streak (aktuelle Woche zählt nur, wenn schon ≥ 3)
  let streak = 0, m = mon;
  if (trainedCount(m) < 3) m = addDays(m, -7);
  while (trainedCount(m) >= 3 && streak < 520) { streak++; m = addDays(m, -7); }
  document.getElementById("statStreak").textContent = streak;

  let total = 0;
  Object.keys(state.days).forEach(k => { const p = progressOf(fromKey(k)); if (p && p.ratio >= 0.5) total++; });
  document.getElementById("statTotal").textContent = total;
}

/* ---------- UI: Einstellungen ---------- */
function renderSettings() {
  document.getElementById("setStart").value = state.settings.startDate;
}
document.getElementById("setStart").addEventListener("change", e => {
  state.settings.startDate = e.target.value || keyOf(mondayOf(today()));
  save(); toast("Gespeichert");
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `trainingsplan-backup-${keyOf(today())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById("importInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.days) throw new Error();
    state = { days: data.days, settings: { ...DEFAULTS.settings, ...data.settings } };
    save(); renderAll(); toast("Backup importiert");
  } catch { toast("Ungültige Datei"); }
  e.target.value = "";
});
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Wirklich alle Trainingsdaten löschen?")) {
    state = structuredClone(DEFAULTS);
    state.settings.startDate = keyOf(mondayOf(today()));
    save(); renderAll(); toast("Daten gelöscht");
  }
});

/* ---------- Navigation ---------- */
function switchView(v) {
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
  if (v === "today") renderToday();
  if (v === "week") renderWeek();
  if (v === "settings") renderSettings();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  if (t.dataset.view === "today") currentDay = today();
  switchView(t.dataset.view);
}));

/* ---------- Helfer ---------- */
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}
function renderAll() { switchView(document.querySelector(".tab.active").dataset.view); }

// Beim Zurückkehren in die App auf den aktuellen Tag springen
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && document.querySelector(".tab.active").dataset.view === "today") {
    currentDay = today(); renderToday();
  }
});

switchView("today");

/* ---------- Service Worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
