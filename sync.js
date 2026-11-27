"use strict";
/* ---------- Konto & Cloud-Sync (Supabase) ----------
   Die App bleibt offline-first: localStorage ist die Arbeitskopie, Supabase die Sicherung.
   Pro Konto gibt es eine Zeile in user_state mit dem ganzen Stand als JSON. */

const SYNC_KEY = "trainingsplan-sync"; // { userId, syncedAt (updated_at der Cloud beim letzten Abgleich), dirty }
let syncMeta;
try { syncMeta = JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { syncMeta = {}; }
function saveMeta() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(syncMeta)); } catch (e) {} }

const sb = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
let user = null, syncing = false, syncError = "", pushTimer = null, authMsg = "";

const appUrl = () => location.origin + location.pathname;
const hasLocalData = () => Object.keys(state.days).length > 0 || !!state.plan;

// wird von save() in app.js aufgerufen
function onLocalChange() {
  syncMeta.dirty = true; saveMeta();
  if (user) { clearTimeout(pushTimer); pushTimer = setTimeout(sync, 1500); renderAccount(); }
}

async function push() {
  const { data, error } = await sb.from("user_state")
    .upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() })
    .select("updated_at").single();
  if (error) throw error;
  syncMeta = { userId: user.id, syncedAt: data.updated_at, dirty: false }; saveMeta();
}

function adopt(row) {
  state = normalize(row.data);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  syncMeta = { userId: user.id, syncedAt: row.updated_at, dirty: false }; saveMeta();
  if (state.migrated) { delete state.migrated; save(); } // ergänzter Stand zurück in die Cloud
  if (sheet.classList.contains("hidden")) renderAll();
}

async function sync() {
  if (!sb || !user || syncing) return;
  if (!navigator.onLine) { syncError = "Offline – wird später synchronisiert"; renderAccount(); return; }
  syncing = true; renderAccount();
  try {
    const { data: row, error } = await sb.from("user_state")
      .select("data, updated_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    const sameUser = syncMeta.userId === user.id;

    if (!sameUser && syncMeta.userId) {
      // Gerät gehörte vorher einem anderen Konto → dessen Daten nicht übernehmen
      if (row) adopt(row);
      else { state = blank(); state.settings.startDate = keyOf(mondayOf(today())); await push(); adopt({ data: state, updated_at: syncMeta.syncedAt }); }
    } else if (!row) {
      await push();                                   // erstes Mal: Gerätedaten hochladen
    } else if (!sameUser) {
      // erstes Anmelden auf diesem Gerät, Konto hat schon Daten
      const keepLocal = hasLocalData() && confirm(
        "Auf diesem Gerät gibt es schon Trainingsdaten, in deinem Konto aber auch.\n\n" +
        "OK = Gerätedaten behalten (überschreibt das Konto)\nAbbrechen = Daten aus dem Konto laden");
      if (keepLocal) await push(); else adopt(row);
    } else if (row.updated_at !== syncMeta.syncedAt) {
      // Konto wurde auf einem anderen Gerät geändert – bei Konflikt gewinnt der neuere Stand
      if (syncMeta.dirty && (state.updatedAt || 0) > (row.data.updatedAt || 0)) await push();
      else adopt(row);
    } else if (syncMeta.dirty) {
      await push();
    }
    syncError = "";
  } catch (e) {
    syncError = "Sync fehlgeschlagen: " + (e.message || e);
  }
  syncing = false; renderAccount();
}

/* ---------- Anmelden ---------- */
const AUTH_ERRORS = {
  "Invalid login credentials": "E-Mail oder Passwort ist falsch.",
  "Email not confirmed": "Bitte bestätige zuerst deine E-Mail.",
  "User already registered": "Für diese E-Mail gibt es schon ein Konto.",
  "Password should be at least 6 characters.": "Das Passwort braucht mindestens 6 Zeichen."
};
const authText = err => AUTH_ERRORS[err.message] || err.message;

async function authAction(kind) {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPw").value;
  if (!email) return setAuthMsg("Bitte E-Mail eingeben.");
  if (kind !== "reset" && !password) return setAuthMsg("Bitte Passwort eingeben.");
  setAuthMsg("…");
  let res;
  if (kind === "in") res = await sb.auth.signInWithPassword({ email, password });
  if (kind === "up") res = await sb.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
  if (kind === "reset") res = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
  if (res.error) return setAuthMsg(authText(res.error));
  if (kind === "up" && !res.data.session) return setAuthMsg("Fast geschafft: Bestätige deine E-Mail über den Link, den du gerade bekommen hast.");
  if (kind === "reset") return setAuthMsg("Wir haben dir einen Link zum Zurücksetzen geschickt.");
  setAuthMsg("");
}
function setAuthMsg(m) { authMsg = m; const el = document.getElementById("authMsg"); if (el) el.textContent = m; }

async function signOut() {
  if (syncMeta.dirty) await sync();
  await sb.auth.signOut();
  if (confirm("Abgemeldet. Deine Daten sind im Konto gesichert.\n\nTrainingsdaten auch von diesem Gerät entfernen?")) {
    state = blank(); state.settings.startDate = keyOf(mondayOf(today()));
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    renderAll();
  }
}

/* ---------- Anzeige in den Einstellungen ---------- */
function ago(iso) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? `heute, ${d.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString("de-AT", { day: "numeric", month: "short" });
}

function renderAccount() {
  const el = document.getElementById("account");
  if (!el) return;
  if (!sb) {
    el.innerHTML = `<p class="hint">${window.supabase ? "Konten sind noch nicht eingerichtet." : "Konto gerade nicht erreichbar (offline?)."} Die App speichert alles lokal auf diesem Gerät.</p>`;
    return;
  }
  if (!user) {
    if (el.querySelector("#authEmail")) return; // Formular nicht beim Tippen neu aufbauen
    el.innerHTML = `
      <form class="auth" id="authForm" autocomplete="on">
        <input id="authEmail" type="email" placeholder="E-Mail" autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false">
        <input id="authPw" type="password" placeholder="Passwort" autocomplete="current-password">
        <button type="submit" class="btn accent">Anmelden</button>
        <button type="button" class="btn ghost" id="authUp">Konto erstellen</button>
        <button type="button" class="linkbtn" id="authReset">Passwort vergessen?</button>
        <p id="authMsg" class="hint auth-msg">${escapeHtml(authMsg)}</p>
      </form>
      <p class="hint">Mit Konto werden Plan, Trainings und Gewichte gesichert und auf all deinen Geräten synchronisiert.</p>`;
    el.querySelector("#authForm").addEventListener("submit", e => { e.preventDefault(); authAction("in"); });
    el.querySelector("#authUp").addEventListener("click", () => authAction("up"));
    el.querySelector("#authReset").addEventListener("click", () => authAction("reset"));
    return;
  }
  const status = syncing ? "Synchronisiere …"
    : syncError ? syncError
    : syncMeta.dirty ? "Änderungen noch nicht gesichert"
    : syncMeta.syncedAt ? `Gesichert · ${ago(syncMeta.syncedAt)}` : "";
  el.innerHTML = `
    <div class="list">
      <div class="list-btn row static"><span class="acc-mail">${escapeHtml(user.email || "")}</span>
        <span class="row-right sync-state ${syncError ? "err" : syncing || syncMeta.dirty ? "" : "ok"}">${escapeHtml(status)}</span></div>
      <button class="list-btn" id="syncNow">Jetzt synchronisieren</button>
      <button class="list-btn danger" id="signOut">Abmelden</button>
    </div>`;
  el.querySelector("#syncNow").addEventListener("click", () => sync());
  el.querySelector("#signOut").addEventListener("click", signOut);
}

/* ---------- Start ---------- */
if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    const prev = user;
    user = session ? session.user : null;
    if (event === "PASSWORD_RECOVERY") {
      setTimeout(async () => {
        const pw = prompt("Neues Passwort (mindestens 6 Zeichen):");
        if (!pw) return;
        const { error } = await sb.auth.updateUser({ password: pw });
        toast(error ? authText(error) : "Passwort geändert");
      }, 0);
    }
    // nicht im Callback awaiten (Supabase-Hinweis), deshalb setTimeout
    if (user && (!prev || prev.id !== user.id)) { authMsg = ""; setTimeout(sync, 0); }
    renderAccount();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
  window.addEventListener("online", () => sync());
}
renderAccount();
