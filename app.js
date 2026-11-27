"use strict";

/* ---------- Speicher ---------- */
const KEY = "trainingsplan-v1";
const DEFAULTS = {
  settings: { bodyweight: null, factor: 1.8, scoop: 25, startDate: null },
  days: {},     // "YYYY-MM-DD": { done: {id:true}, weights: {id:"kg"}, note: "" }
  protein: {}   // "YYYY-MM-DD": [{ g, src: "food"|"powder", t }]
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw) return { ...DEFAULTS, ...raw, settings: { ...DEFAULTS.settings, ...raw.settings } };
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
  document.getElementById("dayName").textContent = isToday ? `Heute · ${DAY_NAMES[d.getDay()]}` : DAY_NAMES[d.getDay()];
  document.getElementById("dayDate").textContent = `${fmtDate(d)} · KW ${isoWeek(d)}`;
  document.getElementById("deloadBanner").classList.toggle("hidden", !isDeloadWeek(d));

  const s = sessionFor(d);
  const card = document.getElementById("dayCard");

  if (s.rest) {
    card.innerHTML = `<div class="card rest"><div class="emoji">😴</div><h2>Ruhetag</h2>
      <p class="muted">${s.note ? s.note + " – " : ""}Erholung ist Teil vom Training.</p></div>`;
    return;
  }

  const data = state.days[k] || { done: {}, weights: {}, note: "" };
  const p = progressOf(d);
  card.innerHTML = `
    <div class="card">
      <div class="sessionhead"><h2>${s.title}</h2><span class="pill ${p.done === p.total ? "ok" : ""}">${p.done}/${p.total}</span></div>
      <div class="place">📍 ${s.place}</div>
      <div id="exList"></div>
      <button id="allDone" class="btn full">${p.done === p.total ? "Alles zurücksetzen" : "Ganzes Training erledigt ✓"}</button>
    </div>
    <div class="card">
      <h2>Notiz</h2>
      <textarea id="note" class="note" placeholder="Wie lief's? Projekt, Gefühl, Schmerzen …">${escapeHtml(data.note || "")}</textarea>
    </div>`;

  const list = document.getElementById("exList");
  s.exercises.forEach(ex => {
    const done = !!data.done[ex.id];
    const last = ex.weight ? lastWeight(ex.id, k) : null;
    const el = document.createElement("div");
    el.className = "ex" + (done ? " done" : "");
    el.innerHTML = `
      <button class="check" aria-label="Erledigt">${done ? "✓" : ""}</button>
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
      if (progressOf(d).done === progressOf(d).total) toast("Training geschafft! 💪");
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
    if (!allDone) toast("Training geschafft! 💪");
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
    let sym = "–", cls = "off";
    if (p) {
      if (p.done === p.total) { sym = "✓"; cls = "full"; }
      else if (p.done > 0) { sym = "◐"; cls = "part"; }
      else if (k < tk) { sym = "✕"; cls = "miss"; }
      else { sym = "○"; cls = ""; }
    }
    const el = document.createElement("button");
    el.className = "wd" + (k === tk ? " today" : "");
    el.style.color = "inherit";
    el.innerHTML = `<div class="l">${SHORT[d.getDay()]}</div><div class="l">${d.getDate()}.</div><div class="s ${cls}">${sym}</div>`;
    el.addEventListener("click", () => { currentDay = d; switchView("today"); });
    grid.appendChild(el);
  }
  const cnt = trainedCount(mon);
  const score = document.getElementById("weekScore");
  score.textContent = `${cnt}/4 Trainings`;
  score.className = "pill" + (cnt >= 4 ? " ok" : "");

  // Verlauf: letzte 8 Wochen
  const hist = document.getElementById("history");
  hist.innerHTML = "";
  for (let w = 7; w >= 0; w--) {
    const m = addDays(mon, -7 * w), c = trainedCount(m);
    const col = document.createElement("div");
    col.className = "hcol";
    col.innerHTML = `<div class="hval">${c}</div><div class="hbar ${c < 3 ? "low" : ""}" style="height:${(c / 4) * 80}%"></div><div class="hlabel">KW${isoWeek(m)}</div>`;
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

/* ---------- UI: Protein ---------- */
function targetG() {
  const bw = Number(state.settings.bodyweight);
  return bw ? Math.round(bw * Number(state.settings.factor || 1.8)) : null;
}
function sumDay(k, src) {
  return (state.protein[k] || []).filter(e => !src || e.src === src).reduce((a, e) => a + e.g, 0);
}
function addProtein(g, src) {
  g = Math.round(Number(g));
  if (!g || g <= 0) return;
  const k = keyOf(today());
  (state.protein[k] = state.protein[k] || []).push({ g, src, t: Date.now() });
  save(); renderProtein();
  toast(`+${g} g ${src === "powder" ? "(Pulver)" : ""}`);
}

function renderProtein() {
  const k = keyOf(today()), tgt = targetG(), sum = sumDay(k);
  document.getElementById("proteinToday").textContent = tgt ? `${sum} / ${tgt} g` : `${sum} g`;
  document.getElementById("proteinToday").className = "pill" + (tgt && sum >= tgt ? " ok" : "");
  document.getElementById("proteinBar").style.width = tgt ? Math.min(100, (sum / tgt) * 100) + "%" : "0";
  document.getElementById("proteinTargetText").textContent = tgt
    ? `Ziel: ${tgt} g (${state.settings.factor} g × ${state.settings.bodyweight} kg)`
    : "Trag dein Körpergewicht in den Einstellungen ein, dann bekommst du ein Tagesziel.";
  document.getElementById("addScoop").textContent = `+ Shake (${state.settings.scoop} g)`;

  const list = document.getElementById("proteinList");
  list.innerHTML = "";
  (state.protein[k] || []).forEach((e, i) => {
    const li = document.createElement("li");
    const time = new Date(e.t).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
    li.innerHTML = `<span>${e.g} g<span class="tag ${e.src}">${e.src === "powder" ? "Pulver" : "Essen"}</span></span>
      <span><span class="muted small">${time}</span><button class="del" aria-label="Löschen">×</button></span>`;
    li.querySelector(".del").addEventListener("click", () => { state.protein[k].splice(i, 1); save(); renderProtein(); });
    list.appendChild(li);
  });

  renderReco(tgt);
  renderProteinChart(tgt);
}

function renderReco(tgt) {
  const el = document.getElementById("reco");
  const bw = Number(state.settings.bodyweight);
  if (!bw) { el.innerHTML = `<p class="muted">Erst Körpergewicht in den Einstellungen eintragen.</p>`; return; }

  // letzte 7 Tage inkl. heute, nur Tage mit Einträgen
  const days = [];
  for (let i = 0; i < 7; i++) {
    const k = keyOf(addDays(today(), -i));
    if ((state.protein[k] || []).length) days.push(k);
  }
  if (days.length < 3) {
    el.innerHTML = `<p class="muted">Trag an mindestens 3 Tagen dein Protein ein (bisher ${days.length}). Dann kann ich sagen, ob du über das Essen genug bekommst.</p>`;
    return;
  }
  const foodAvg = Math.round(days.reduce((a, k) => a + sumDay(k, "food"), 0) / days.length);
  const minG = Math.round(bw * 1.6);
  const scoop = Number(state.settings.scoop) || 25;

  if (foodAvg >= minG) {
    el.innerHTML = `<div class="reco-verdict no">Nein, nicht nötig</div>
      <p>Über das Essen kommst du im Schnitt auf <b>${foodAvg} g</b> pro Tag. Das Minimum für Kraftaufbau (1,6 g/kg = ${minG} g) schaffst du schon ohne Pulver.</p>`;
  } else {
    const gap = (tgt || minG) - foodAvg;
    const shakes = Math.max(1, Math.round(gap / scoop));
    el.innerHTML = `<div class="reco-verdict yes">Ja, lohnt sich</div>
      <p>Über das Essen kommst du im Schnitt auf <b>${foodAvg} g</b>, Minimum wären ${minG} g. Bis zu deinem Ziel fehlen ca. <b>${gap} g</b> pro Tag, das sind etwa <b>${shakes} Shake${shakes > 1 ? "s" : ""}</b> à ${scoop} g. Mehr Protein über das Essen wäre die Alternative.</p>`;
  }
  el.innerHTML += `<p class="muted small">Basis: ${days.length} eingetragene Tage der letzten Woche, nur Essen gezählt.</p>`;
}

function renderProteinChart(tgt) {
  const chart = document.getElementById("proteinChart");
  chart.innerHTML = "";
  const vals = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today(), -i), k = keyOf(d);
    vals.push({ d, f: sumDay(k, "food"), p: sumDay(k, "powder") });
  }
  const max = Math.max(tgt || 0, ...vals.map(v => v.f + v.p), 50) * 1.1;
  const h = 120; // px Balkenbereich
  vals.forEach(v => {
    const col = document.createElement("div");
    col.className = "bcol";
    col.innerHTML = `<div class="bstack" style="height:${((v.f + v.p) / max) * h}px">
        <div class="f" style="flex:${v.f}"></div><div class="p" style="flex:${v.p}"></div></div>
      <div class="blabel">${SHORT[v.d.getDay()]}</div>`;
    chart.appendChild(col);
  });
  if (tgt) {
    const line = document.createElement("div");
    line.className = "goalline";
    line.style.bottom = (20 + (tgt / max) * h) + "px";
    chart.appendChild(line);
  }
}

document.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => addProtein(b.dataset.add, "food")));
document.getElementById("addScoop").addEventListener("click", () => addProtein(state.settings.scoop, "powder"));
document.getElementById("proteinForm").addEventListener("submit", e => {
  e.preventDefault();
  const inp = document.getElementById("proteinInput");
  addProtein(inp.value, document.getElementById("proteinSrc").value);
  inp.value = "";
});

/* ---------- UI: Einstellungen ---------- */
function renderSettings() {
  document.getElementById("setWeight").value = state.settings.bodyweight ?? "";
  document.getElementById("setFactor").value = state.settings.factor;
  document.getElementById("setScoop").value = state.settings.scoop;
  document.getElementById("setStart").value = state.settings.startDate;
}
[["setWeight", "bodyweight"], ["setFactor", "factor"], ["setScoop", "scoop"], ["setStart", "startDate"]].forEach(([id, key]) => {
  document.getElementById(id).addEventListener("change", e => {
    const v = e.target.value;
    state.settings[key] = key === "startDate" ? (v || keyOf(mondayOf(today()))) : (v === "" ? null : Number(v));
    save(); toast("Gespeichert");
  });
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
    if (!data.days || !data.protein) throw new Error();
    state = { ...DEFAULTS, ...data, settings: { ...DEFAULTS.settings, ...data.settings } };
    save(); renderAll(); toast("Backup importiert");
  } catch { toast("Ungültige Datei"); }
  e.target.value = "";
});
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Wirklich alle Trainings- und Proteindaten löschen?")) {
    state = structuredClone(DEFAULTS);
    state.settings.startDate = keyOf(mondayOf(today()));
    save(); renderAll(); toast("Daten gelöscht");
  }
});

/* ---------- Navigation ---------- */
const TITLES = { today: "Training", week: "Woche", protein: "Protein", settings: "Einstellungen" };
function switchView(v) {
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
  document.getElementById("viewTitle").textContent = TITLES[v];
  if (v === "today") renderToday();
  if (v === "week") renderWeek();
  if (v === "protein") renderProtein();
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
