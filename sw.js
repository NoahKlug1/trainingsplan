// Version erhöhen, wenn sich Dateien ändern → Handy lädt neue Version
const CACHE = "trainingsplan-v14";
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "plan.js",
  "app.js",
  "body-shapes.js",
  "body.js",
  "config.js",
  "sync.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (Updates kommen sofort an), offline aus dem Cache
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Supabase-Anfragen (Login, Daten) nie cachen
  if (new URL(e.request.url).hostname.endsWith(".supabase.co")) return;
  // eigene Dateien am HTTP-Cache vorbei neu prüfen, damit Updates sofort ankommen
  const own = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    fetch(e.request, own ? { cache: "no-cache" } : undefined)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
