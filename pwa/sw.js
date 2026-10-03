/* Fonte : l'appli s'ouvre même sans réseau. Les pages sont reprises du réseau dès qu'il revient, pour rester à jour. */
const VERSION = "__VERSION__";
const CACHE = "fonte-" + VERSION, EXT = "fonte-ext";
const FONTS = ["barlow-400", "barlow-500", "barlow-600", "barlow-condensed-600", "barlow-condensed-800"].flatMap(f => [`fonts/${f}-latin.woff2`, `fonts/${f}-latin-ext.woff2`]);
const CORE = ["./", "index.html", "carnet.html", "pwa.js", "manifest.webmanifest", "fonts/fonts.css", ...FONTS, "icons/icon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("fonte-") && k !== CACHE && k !== EXT).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (name, req, res) => caches.open(name).then(c => c.put(req, res)).catch(() => { /* quota */ });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return; // coach, paiement : toujours le réseau
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") {
      e.respondWith(fetch(req).then(res => { if (res.ok) put(CACHE, req, res.clone()); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match(url.pathname.endsWith("carnet.html") ? "carnet.html" : "index.html"))));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => { if (res.ok) put(CACHE, req, res.clone()); return res; })));
    return;
  }
  // polices et bibliothèque PDF : servies du cache, rafraîchies en arrière-plan
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$|(^|\.)cdnjs\.cloudflare\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(EXT).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
      return hit || net;
    })));
  }
});
