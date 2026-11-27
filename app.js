"use strict";

/* ---------- Speicher ---------- */
const KEY = "trainingsplan-v1";
// days:      "YYYY-MM-DD": { done: {id:true}, weights: {id:"kg"}, note: "" }
// plan:      null = Standardplan aus plan.js, sonst eigener Plan (gleiche Struktur)
// overrides: "YYYY-MM-DD": Wochentag (0–6), dessen Training an diesem Datum stattfindet
// exMeta:    id → { name, group, muscles } – merkt sich auch gelöschte Übungen für Verlauf & Heatmap
function blank() { return { settings: { startDate: null }, days: {}, plan: null, overrides: {}, exMeta: {} }; }
function normalize(raw) {
  const s = blank();
  if (!raw || typeof raw !== "object") return s;
  return {
    settings: { ...s.settings, ...raw.settings },
    days: raw.days || {},
    plan: raw.plan || null,
    overrides: raw.overrides || {},
    exMeta: raw.exMeta || {}
  };
}
let state;
try { state = normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { state = blank(); }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast("Speichern fehlgeschlagen"); }
}

/* ---------- Datum ---------- */
const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

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
function fmtShort(d) { return `${d.getDate()}.${d.getMonth() + 1}.`; }

if (!state.settings.startDate) { state.settings.startDate = keyOf(mondayOf(today())); save(); }

function isDeloadWeek(d) {
  const start = mondayOf(fromKey(state.settings.startDate));
  const weeks = Math.floor((mondayOf(d) - start) / (7 * 86400000));
  return weeks >= 0 && (weeks + 1) % 6 === 0;
}

/* ---------- Plan-Logik ---------- */
function plan() { return state.plan || DEFAULT_PLAN; }
function slug(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function groupOf(ex) { return ex.group || slug(ex.name); }

// id → { name, group, muscles } aus Standardplan, gemerkten und aktuellen Übungen
function metaIndex() {
  const idx = {};
  const add = ex => { idx[ex.id] = { name: ex.name, group: groupOf(ex), muscles: ex.muscles || [] }; };
  const walk = p => Object.values(p).forEach(s => (s.exercises || []).forEach(ex => { add(ex); if (ex.alt) add(ex.alt); }));
  walk(DEFAULT_PLAN);
  Object.entries(state.exMeta).forEach(([id, m]) => { if (m) idx[id] = m; });
  walk(plan());
  return idx;
}

function effectiveWeekday(d) {
  const o = state.overrides[keyOf(d)];
  return o === undefined ? d.getDay() : o;
}
function sessionFor(d) {
  const wd = effectiveWeekday(d);
  const s = plan()[wd];
  const movedFrom = wd !== d.getDay() ? wd : null;
  if (s.rest) return { ...s, movedFrom };
  const evenWeek = isoWeek(d) % 2 === 0;
  return { ...s, movedFrom, exercises: s.exercises.map(ex => (ex.alt && evenWeek) ? ex.alt : ex) };
}
function dayData(k) {
  if (!state.days[k]) state.days[k] = { done: {}, weights: {}, note: "" };
  return state.days[k];
}
function progressOf(d) {
  const s = sessionFor(d);
  if (s.rest || !s.exercises.length) return null;
  const data = state.days[keyOf(d)];
  const total = s.exercises.length;
  const done = data ? s.exercises.filter(e => data.done[e.id]).length : 0;
  return { done, total, ratio: done / total };
}
function lastWeight(ex, beforeKey) {
  const meta = metaIndex(), group = groupOf(ex);
  const keys = Object.keys(state.days).filter(k => k < beforeKey).sort().reverse();
  for (const k of keys) {
    for (const [id, val] of Object.entries(state.days[k].weights || {})) {
      if (val !== "" && val != null && (meta[id] ? meta[id].group : id) === group) return { val, date: k };
    }
  }
  return null;
}

/* ---------- Icons ---------- */
const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
  move: '<svg viewBox="0 0 24 24"><path d="M7 4L3 8l4 4"/><path d="M3 8h13"/><path d="M17 20l4-4-4-4"/><path d="M21 16H8"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>'
};

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
  const movedNote = s.movedFrom !== null ? `<div class="moved">${ICON.move}Verschoben · sonst am ${DAY_NAMES[s.movedFrom]}</div>` : "";
  const actions = `
    <div class="actions">
      <button class="chip-btn" id="editBtn">${ICON.edit}${s.rest ? "Training planen" : "Bearbeiten"}</button>
      <button class="chip-btn" id="moveBtn">${ICON.move}Verschieben</button>
    </div>`;

  if (s.rest || !s.exercises.length) {
    card.innerHTML = `<div class="rest">${ICON.moon}
      <div class="rest-title">Ruhetag</div>
      <p>${s.note ? escapeHtml(s.note) + " · " : ""}Erholung ist Teil vom Training.</p></div>${movedNote}${actions}`;
    bindDayActions(d);
    return;
  }

  const data = state.days[k] || { done: {}, weights: {}, note: "" };
  const p = progressOf(d);
  card.innerHTML = `
    <div class="section">
      <div class="session-meta">
        <div><div class="session-title">${escapeHtml(s.title)}</div><div class="session-place">${escapeHtml(s.place || "")}</div></div>
        <span class="count ${p.done === p.total ? "ok" : ""}">${p.done}/${p.total}</span>
      </div>
      <div class="bar"><div style="width:${p.ratio * 100}%"></div></div>
      ${movedNote}
      <ul id="exList" class="exlist"></ul>
      <button id="allDone" class="btn ${p.done === p.total ? "ghost" : ""}">${p.done === p.total ? "Zurücksetzen" : "Alles erledigt"}</button>
      ${actions}
    </div>
    <div class="section">
      <h2>Notiz</h2>
      <textarea id="note" class="note" placeholder="Wie lief's? Projekt, Gefühl, Schmerzen …">${escapeHtml(data.note || "")}</textarea>
    </div>`;

  const list = document.getElementById("exList");
  s.exercises.forEach(ex => {
    const done = !!data.done[ex.id];
    const last = ex.weight ? lastWeight(ex, k) : null;
    const el = document.createElement("li");
    el.className = "ex" + (done ? " done" : "");
    el.innerHTML = `
      <button class="check" aria-label="Erledigt">${ICON.check}</button>
      <div class="exbody">
        <div class="exname">${escapeHtml(ex.name)}</div>
        ${ex.detail ? `<div class="exdetail">${escapeHtml(ex.detail)}</div>` : ""}
        ${ex.weight ? `<div class="weightrow">
          <input type="number" inputmode="decimal" step="0.5" placeholder="kg" value="${escapeHtml(String(data.weights[ex.id] ?? ""))}">
          <span class="last">${last ? `Letztes Mal: ${escapeHtml(String(last.val))} kg` : "kg"}</span>
        </div>` : ""}
      </div>`;
    el.querySelector(".check").addEventListener("click", () => {
      const dd = dayData(k);
      if (dd.done[ex.id]) delete dd.done[ex.id]; else dd.done[ex.id] = true;
      save(); renderToday();
      const pp = progressOf(d);
      if (pp && pp.done === pp.total) toast("Training geschafft");
    });
    const inp = el.querySelector("input");
    if (inp) inp.addEventListener("change", () => {
      const dd = dayData(k);
      if (inp.value !== "") dd.weights[ex.id] = inp.value; else delete dd.weights[ex.id];
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
  bindDayActions(d);
}

function bindDayActions(d) {
  document.getElementById("editBtn").addEventListener("click", () => openEditor(effectiveWeekday(d)));
  document.getElementById("moveBtn").addEventListener("click", () => openMove(d));
}

document.getElementById("prevDay").addEventListener("click", () => { currentDay = addDays(currentDay, -1); renderToday(); });
document.getElementById("nextDay").addEventListener("click", () => { currentDay = addDays(currentDay, 1); renderToday(); });

/* ---------- Sheet (Overlay) ---------- */
const sheet = document.getElementById("sheet");
const sheetBody = document.getElementById("sheetBody");
function openSheet(html) {
  sheetBody.innerHTML = html;
  sheet.classList.remove("hidden");
  sheetBody.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add("open")));
  document.body.classList.add("locked");
}
function closeSheet() {
  sheet.classList.remove("open");
  document.body.classList.remove("locked");
  setTimeout(() => sheet.classList.add("hidden"), 220);
}
sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });

/* ---------- Verschieben ---------- */
function openMove(d) {
  const mon = mondayOf(d), k = keyOf(d);
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const t = addDays(mon, i), tk = keyOf(t), s = sessionFor(t);
    const label = s.rest || !s.exercises.length ? "Ruhetag" : escapeHtml(s.title);
    rows.push(`<button class="list-btn row" data-key="${tk}" ${tk === k ? "disabled" : ""}>
      <span><b>${SHORT[t.getDay()]}</b> <span class="muted">${fmtShort(t)}</span></span>
      <span class="row-right"><span class="muted">${tk === k ? "dieser Tag" : label}</span>${tk === k ? "" : ICON.chevron}</span></button>`);
  }
  const hasMoves = Array.from({ length: 7 }, (_, i) => keyOf(addDays(mon, i))).some(x => state.overrides[x] !== undefined);
  openSheet(`
    <div class="sheet-head"><span></span><h3>Verschieben</h3><button class="link strong" data-close>Fertig</button></div>
    <p class="hint center">Mit welchem Tag soll <b>${DAY_NAMES[d.getDay()]}, ${fmtShort(d)}</b> tauschen?<br>Gilt nur für diese Woche.</p>
    <div class="list">${rows.join("")}</div>
    ${hasMoves ? `<button class="btn ghost spaced" id="resetMoves">Verschiebungen dieser Woche aufheben</button>` : ""}`);
  sheetBody.querySelector("[data-close]").addEventListener("click", closeSheet);
  sheetBody.querySelectorAll("[data-key]").forEach(b => b.addEventListener("click", () => {
    const other = fromKey(b.dataset.key);
    const a = effectiveWeekday(d), c = effectiveWeekday(other);
    setOverride(d, c); setOverride(other, a);
    save(); closeSheet(); renderToday();
    toast(`Getauscht mit ${DAY_NAMES[other.getDay()]}`);
  }));
  const r = document.getElementById("resetMoves");
  if (r) r.addEventListener("click", () => {
    for (let i = 0; i < 7; i++) delete state.overrides[keyOf(addDays(mon, i))];
    save(); closeSheet(); renderToday(); toast("Verschiebungen aufgehoben");
  });
}
function setOverride(d, wd) {
  const k = keyOf(d);
  if (wd === d.getDay()) delete state.overrides[k]; else state.overrides[k] = wd;
}

/* ---------- Workout-Editor ---------- */
let draft = null, draftDay = null;

function newId() { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function blankExercise() { return { id: newId(), name: "", detail: "", weight: false, muscles: [] }; }

function openEditor(wd) {
  draftDay = wd;
  draft = structuredClone(plan()[wd]);
  if (!draft.exercises) draft.exercises = [];
  openMuscles.clear();
  openSheet(`<div id="editor"></div>`);
  renderEditor();
}

const openMuscles = new Set();
function muscleSummary(list) { return list.length ? list.map(m => MUSCLES[m]).join(", ") : "Keine ausgewählt"; }
function muscleChips(list, path) {
  const open = openMuscles.has(path);
  return `
    <button type="button" class="mtoggle ${open ? "open" : ""}" data-mtoggle="${path}">
      <span class="mtoggle-label">Muskeln</span>
      <span class="mtoggle-val">${muscleSummary(list)}</span>${ICON.down}
    </button>
    ${open ? `<div class="mchips">${Object.entries(MUSCLES).map(([id, label]) =>
      `<button type="button" class="mchip ${list.includes(id) ? "on" : ""}" data-muscle="${id}" data-path="${path}">${label}</button>`).join("")}</div>` : ""}`;
}

function exerciseFields(ex, i, isAlt) {
  const path = isAlt ? `${i}.alt` : `${i}`;
  return `
    <input class="tinput strong" data-field="name" data-path="${path}" placeholder="${isAlt ? "Wechselübung (gerade KW)" : "Übung"}" value="${escapeHtml(ex.name || "")}">
    <input class="tinput" data-field="detail" data-path="${path}" placeholder="Sätze × Wdh., Dauer …" value="${escapeHtml(ex.detail || "")}">
    ${muscleChips(ex.muscles || [], path)}`;
}

function renderEditor() {
  const el = document.getElementById("editor");
  const isRest = !!draft.rest;
  el.innerHTML = `
    <div class="sheet-head">
      <button class="link muted" data-cancel>Abbrechen</button>
      <h3>${DAY_NAMES[draftDay]}</h3>
      <button class="link strong" data-save>Sichern</button>
    </div>
    <p class="hint center">Änderungen gelten für jeden ${DAY_NAMES[draftDay]}.</p>

    <label class="toggle"><span>Ruhetag</span><input type="checkbox" id="edRest" ${isRest ? "checked" : ""}><span class="switch"></span></label>

    ${isRest ? "" : `
    <div class="ed-group">
      <input class="tinput strong" id="edTitle" placeholder="Name des Trainings" value="${escapeHtml(draft.title || "")}">
      <input class="tinput" id="edPlace" placeholder="Ort" value="${escapeHtml(draft.place || "")}">
    </div>
    <h2 class="ed-h">Übungen</h2>
    <div id="edList">
      ${draft.exercises.map((ex, i) => `
        <div class="ed-ex">
          <div class="ed-ex-top">
            <span class="ed-num">${i + 1}</span>
            <div class="ed-tools">
              <button class="tool" data-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Nach oben">${ICON.up}</button>
              <button class="tool" data-down="${i}" ${i === draft.exercises.length - 1 ? "disabled" : ""} aria-label="Nach unten">${ICON.down}</button>
              <button class="tool" data-del="${i}" aria-label="Löschen">${ICON.trash}</button>
            </div>
          </div>
          ${exerciseFields(ex, i, false)}
          <div class="ed-flags">
            <label class="check-label"><input type="checkbox" data-weight="${i}" ${ex.weight ? "checked" : ""}> Gewicht tracken</label>
            <label class="check-label"><input type="checkbox" data-alttoggle="${i}" ${ex.alt ? "checked" : ""}> Wechsel in geraden KW</label>
          </div>
          ${ex.alt ? `<div class="ed-alt">${exerciseFields(ex.alt, i, true)}</div>` : ""}
        </div>`).join("")}
    </div>
    <button class="btn ghost" id="edAdd">${ICON.plus} Übung hinzufügen</button>`}
    <button class="link muted spaced block" id="edDefault">Auf Standardplan zurücksetzen</button>`;

  el.querySelector("[data-cancel]").addEventListener("click", closeSheet);
  el.querySelector("[data-save]").addEventListener("click", saveEditor);
  el.querySelector("#edRest").addEventListener("change", e => {
    draft.rest = e.target.checked;
    if (!draft.rest) {
      if (!draft.title || draft.title === "Ruhetag") draft.title = "";
      if (!draft.exercises.length) draft.exercises.push(blankExercise());
    }
    renderEditor();
  });
  el.querySelector("#edDefault").addEventListener("click", () => {
    draft = structuredClone(DEFAULT_PLAN[draftDay]);
    if (!draft.exercises) draft.exercises = [];
    renderEditor();
  });
  if (isRest) return;

  el.querySelector("#edTitle").addEventListener("input", e => { draft.title = e.target.value; });
  el.querySelector("#edPlace").addEventListener("input", e => { draft.place = e.target.value; });
  el.querySelectorAll("[data-field]").forEach(inp => inp.addEventListener("input", () => {
    exAt(inp.dataset.path)[inp.dataset.field] = inp.value;
  }));
  el.querySelectorAll("[data-muscle]").forEach(b => b.addEventListener("click", () => {
    const ex = exAt(b.dataset.path), m = b.dataset.muscle;
    ex.muscles = ex.muscles || [];
    const i = ex.muscles.indexOf(m);
    if (i >= 0) ex.muscles.splice(i, 1); else ex.muscles.push(m);
    b.classList.toggle("on", i < 0);
    el.querySelector(`[data-mtoggle="${b.dataset.path}"] .mtoggle-val`).textContent = muscleSummary(ex.muscles);
  }));
  el.querySelectorAll("[data-mtoggle]").forEach(b => b.addEventListener("click", () => {
    const p = b.dataset.mtoggle;
    if (openMuscles.has(p)) openMuscles.delete(p); else openMuscles.add(p);
    renderEditor();
  }));
  el.querySelectorAll("[data-weight]").forEach(c => c.addEventListener("change", () => { draft.exercises[c.dataset.weight].weight = c.checked; }));
  el.querySelectorAll("[data-alttoggle]").forEach(c => c.addEventListener("change", () => {
    const ex = draft.exercises[c.dataset.alttoggle];
    if (c.checked) ex.alt = { id: newId(), name: "", detail: "", muscles: [] }; else delete ex.alt;
    renderEditor();
  }));
  el.querySelectorAll("[data-up]").forEach(b => b.addEventListener("click", () => swapEx(+b.dataset.up, -1)));
  el.querySelectorAll("[data-down]").forEach(b => b.addEventListener("click", () => swapEx(+b.dataset.down, 1)));
  el.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => { draft.exercises.splice(+b.dataset.del, 1); renderEditor(); }));
  el.querySelector("#edAdd").addEventListener("click", () => {
    draft.exercises.push(blankExercise());
    renderEditor();
    const names = el.querySelectorAll('[data-field="name"]:not([data-path*="alt"])');
    names[names.length - 1].focus();
  });
}

function exAt(path) {
  const [i, alt] = path.split(".");
  return alt ? draft.exercises[i].alt : draft.exercises[i];
}
function swapEx(i, dir) {
  const j = i + dir, a = draft.exercises;
  if (j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]];
  renderEditor();
}

function saveEditor() {
  const out = structuredClone(draft);
  if (!out.rest) {
    out.exercises = out.exercises.filter(ex => (ex.name || "").trim());
    out.exercises.forEach(ex => { if (ex.alt && !(ex.alt.name || "").trim()) delete ex.alt; });
    if (!out.exercises.length) { toast("Mindestens eine Übung mit Namen"); return; }
    out.title = (out.title || "").trim() || "Training";
    out.place = (out.place || "").trim();
    // Gleicher Name wie eine bestehende Übung → gleiche Gewichtsgruppe
    const byName = {};
    Object.values(metaIndex()).forEach(m => { byName[slug(m.name)] = byName[slug(m.name)] || m.group; });
    const assign = ex => { ex.name = ex.name.trim(); ex.group = byName[slug(ex.name)] || slug(ex.name); };
    out.exercises.forEach(ex => { assign(ex); if (ex.alt) assign(ex.alt); });
  } else {
    out.title = "Ruhetag";
  }
  // alte Übungen merken, damit Verlauf und Heatmap sie weiter kennen
  const idx = metaIndex();
  (plan()[draftDay].exercises || []).forEach(ex => {
    state.exMeta[ex.id] = idx[ex.id];
    if (ex.alt) state.exMeta[ex.alt.id] = idx[ex.alt.id];
  });
  if (!state.plan) state.plan = structuredClone(DEFAULT_PLAN);
  state.plan[draftDay] = out;
  save(); closeSheet(); renderAll(); toast("Plan gespeichert");
}

/* ---------- UI: Woche ---------- */
function trainedCount(monday) {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const p = progressOf(addDays(monday, i));
    if (p && p.ratio >= 0.5) n++;
  }
  return n;
}
function plannedCount() { return Object.values(plan()).filter(s => !s.rest && s.exercises && s.exercises.length).length; }

function renderWeek() {
  const mon = mondayOf(today()), tk = keyOf(today()), goal = plannedCount();
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
  score.textContent = `${cnt}/${goal} Trainings`;
  score.className = "count" + (cnt >= goal ? " ok" : "");
  document.getElementById("weekLabel").textContent = `KW ${isoWeek(mon)} · ${fmtShort(mon)} – ${fmtShort(addDays(mon, 6))}`;
  document.getElementById("weekGoal").textContent = `Ziel ${goal}`;

  const hist = document.getElementById("history");
  hist.innerHTML = "";
  for (let w = 7; w >= 0; w--) {
    const m = addDays(mon, -7 * w), c = trainedCount(m);
    const col = document.createElement("div");
    col.className = "hcol";
    col.innerHTML = `<div class="hval">${c}</div><div class="hbar ${c < 3 ? "low" : ""}" style="height:${Math.min(1, c / Math.max(goal, 1)) * 80}%"></div><div class="hlabel">${isoWeek(m)}</div>`;
    hist.appendChild(col);
  }

  let streak = 0, m = mon;
  if (trainedCount(m) < 3) m = addDays(m, -7);
  while (trainedCount(m) >= 3 && streak < 520) { streak++; m = addDays(m, -7); }
  document.getElementById("statStreak").textContent = streak;

  let total = 0;
  Object.keys(state.days).forEach(k => { const p = progressOf(fromKey(k)); if (p && p.ratio >= 0.5) total++; });
  document.getElementById("statTotal").textContent = total;
}

/* ---------- UI: Fortschritt ---------- */
let heatRange = 7, chartGroup = null;

function renderProgress() {
  renderHeatmap();
  renderWeights();
}

function renderHeatmap() {
  document.querySelectorAll("[data-range]").forEach(b => b.classList.toggle("on", +b.dataset.range === heatRange));
  const meta = metaIndex(), counts = {};
  Object.keys(MUSCLES).forEach(m => { counts[m] = 0; });
  const from = keyOf(addDays(today(), -(heatRange - 1))), to = keyOf(today());
  Object.entries(state.days).forEach(([k, data]) => {
    if (k < from || k > to) return;
    Object.keys(data.done || {}).forEach(id => (meta[id] ? meta[id].muscles : []).forEach(m => { if (m in counts) counts[m]++; }));
  });
  const max = Math.max(...Object.values(counts));
  const level = {};
  Object.entries(counts).forEach(([m, c]) => { level[m] = max ? c / max : 0; });
  document.getElementById("bodyFront").innerHTML = bodySvg("front", level);
  document.getElementById("bodyBack").innerHTML = bodySvg("back", level);

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const trained = sorted.filter(([, c]) => c > 0);
  const untrained = sorted.filter(([, c]) => c === 0).map(([m]) => MUSCLES[m]);
  const out = document.getElementById("muscleList");
  if (!trained.length) {
    out.innerHTML = `<p class="hint center">In den letzten ${heatRange} Tagen noch keine Übung abgehakt.</p>`;
    return;
  }
  out.innerHTML = `
    <div class="mlist">${trained.map(([m, c]) => `
      <div class="mrow"><span>${MUSCLES[m]}</span>
        <span class="mbar"><span style="width:${(c / max) * 100}%"></span></span>
        <span class="mval">${c}×</span></div>`).join("")}
    </div>
    ${untrained.length ? `<p class="hint">Nicht trainiert: ${untrained.join(", ")}</p>` : ""}`;
}
document.querySelectorAll("[data-range]").forEach(b => b.addEventListener("click", () => { heatRange = +b.dataset.range; renderHeatmap(); }));

function weightSeries() {
  const meta = metaIndex(), series = {};
  Object.keys(state.days).sort().forEach(k => {
    Object.entries(state.days[k].weights || {}).forEach(([id, val]) => {
      const kg = parseFloat(String(val).replace(",", "."));
      if (isNaN(kg)) return;
      const g = meta[id] ? meta[id].group : id;
      const s = series[g] = series[g] || { points: [], name: meta[id] ? meta[id].name : id };
      const last = s.points[s.points.length - 1];
      if (last && last.k === k) last.kg = Math.max(last.kg, kg); else s.points.push({ k, kg });
    });
  });
  // Namen bevorzugt aus dem aktuellen Plan
  Object.values(plan()).forEach(s => (s.exercises || []).forEach(ex => { const g = groupOf(ex); if (series[g]) series[g].name = ex.name; }));
  return series;
}

function renderWeights() {
  const series = weightSeries(), groups = Object.keys(series);
  const chips = document.getElementById("weightChips"), box = document.getElementById("weightChart");
  if (!groups.length) {
    chips.innerHTML = "";
    box.innerHTML = `<p class="hint">Trag bei Übungen ein Gewicht ein, dann siehst du hier deinen Verlauf.</p>`;
    return;
  }
  if (!series[chartGroup]) chartGroup = [...groups].sort((a, b) => series[b].points.length - series[a].points.length)[0];
  chips.innerHTML = groups.map(g => `<button class="seg-chip ${g === chartGroup ? "on" : ""}" data-group="${escapeHtml(g)}">${escapeHtml(series[g].name)}</button>`).join("");
  chips.querySelectorAll("[data-group]").forEach(b => b.addEventListener("click", () => { chartGroup = b.dataset.group; renderWeights(); }));

  const pts = series[chartGroup].points;
  const first = pts[0], last = pts[pts.length - 1];
  const best = Math.max(...pts.map(p => p.kg));
  const diff = last.kg - first.kg;
  const fmt = n => (Math.round(n * 10) / 10).toLocaleString("de-AT");

  const W = 320, H = 150, L = 34, R = 16, T = 12, B = 24;
  const t0 = fromKey(first.k).getTime(), t1 = fromKey(last.k).getTime();
  let lo = Math.min(...pts.map(p => p.kg)), hi = best;
  if (hi - lo < 2) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const x = p => pts.length === 1 ? (L + W - R) / 2 : L + ((fromKey(p.k).getTime() - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = kg => T + (1 - (kg - lo) / (hi - lo)) * (H - T - B);
  const coords = pts.map(p => `${x(p).toFixed(1)},${y(p.kg).toFixed(1)}`);
  const area = `M${x(first).toFixed(1)},${H - B} L${coords.join(" L")} L${x(last).toFixed(1)},${H - B} Z`;
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad];

  box.innerHTML = `
    <div class="wstats">
      <div><span class="wnum">${fmt(last.kg)}</span><span class="wlabel">kg aktuell</span></div>
      <div><span class="wnum">${fmt(best)}</span><span class="wlabel">kg Bestwert</span></div>
      <div><span class="wnum ${diff > 0 ? "up" : ""}">${diff > 0 ? "+" : ""}${fmt(diff)}</span><span class="wlabel">kg seit ${fmtShort(fromKey(first.k))}</span></div>
    </div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf ${escapeHtml(series[chartGroup].name)}">
      ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 3.5}" class="axis" text-anchor="end">${fmt(v)}</text>`).join("")}
      ${pts.length > 1 ? `<path d="${area}" class="area"/><polyline points="${coords.join(" ")}" class="line"/>` : ""}
      ${pts.map((p, i) => `<circle cx="${x(p)}" cy="${y(p.kg)}" r="${i === pts.length - 1 ? 4 : 2.6}" class="pt ${i === pts.length - 1 ? "last" : ""}"><title>${fmtShort(fromKey(p.k))}: ${fmt(p.kg)} kg</title></circle>`).join("")}
      <text x="${L}" y="${H - 6}" class="axis">${fmtShort(fromKey(first.k))}</text>
      ${pts.length > 1 ? `<text x="${W - R}" y="${H - 6}" class="axis" text-anchor="end">${fmtShort(fromKey(last.k))}</text>` : ""}
    </svg>
    <p class="hint">${pts.length} ${pts.length === 1 ? "Eintrag" : "Einträge"}</p>`;
}

/* ---------- UI: Einstellungen ---------- */
function renderSettings() {
  document.getElementById("setStart").value = state.settings.startDate;
  const list = document.getElementById("planList");
  list.innerHTML = WEEK_ORDER.map(wd => {
    const s = plan()[wd];
    const label = s.rest ? "Ruhetag" : escapeHtml(s.title);
    return `<button class="list-btn row" data-wd="${wd}"><span>${DAY_NAMES[wd]}</span><span class="row-right"><span class="muted">${label}</span>${ICON.chevron}</span></button>`;
  }).join("");
  list.querySelectorAll("[data-wd]").forEach(b => b.addEventListener("click", () => openEditor(+b.dataset.wd)));
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
    state = normalize(data);
    save(); renderAll(); toast("Backup importiert");
  } catch { toast("Ungültige Datei"); }
  e.target.value = "";
});
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Wirklich alle Trainingsdaten und Planänderungen löschen?")) {
    state = blank();
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
  if (v === "progress") renderProgress();
  if (v === "settings") renderSettings();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  if (t.dataset.view === "today") currentDay = today();
  switchView(t.dataset.view);
}));

/* ---------- Helfer ---------- */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}
function renderAll() { switchView(document.querySelector(".tab.active").dataset.view); }

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && document.querySelector(".tab.active").dataset.view === "today" && sheet.classList.contains("hidden")) {
    currentDay = today(); renderToday();
  }
});

switchView("today");

/* ---------- Service Worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
