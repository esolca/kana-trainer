/* Offline-Cache fuer den Kana Trainer.
   Die Version kommt als ?v=... von der Seite (Byline in Kana-Trainer.html) und wird hier nicht gepflegt. */
var VERSION = new URL(self.location.href).searchParams.get('v') || '0';
var CACHE = 'kana-' + VERSION;
/* eigene Cache-Namen: "kana-" plus Versionsnummer, z. B. kana-1.3.0 (oder kana-0 ohne Version) */
var OWN = /^kana-\d+(\.\d+)*$/;
var FILES = ['./', 'index.html', 'Kana-Trainer.html', 'app.js', 'style.css', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

/* nur alte eigene Caches loeschen; andere Apps unter esolca.github.io teilen sich denselben Cache-Speicher */
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return OWN.test(k) && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Sofort aus dem Cache antworten (funktioniert ohne Netz) und im Hintergrund aktualisieren;
   eine neue Version ist damit ab dem naechsten Start aktiv. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req, { cache: 'no-cache' }).then(function (res) {
        if (res.ok) c.put(req, res.clone());
        return res;
      });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net;
    });
  }));
});
