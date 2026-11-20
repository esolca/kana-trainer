/* Offline-Cache fuer den Kana Trainer.
   Die Version kommt als ?v=... von der Seite (Byline in Kana-Trainer.html) und wird hier nicht gepflegt. */
var VERSION = new URL(self.location.href).searchParams.get('v') || '0';
var CACHE = 'kana-' + VERSION;
/* eigene Cache-Namen: "kana-" plus Versionsnummer, z. B. kana-1.3.0 (oder kana-0 ohne Version) */
var OWN = /^kana-\d+(\.\d+)*$/;
var FILES = ['./', 'index.html', 'Kana-Trainer.html', 'app.js', 'style.css', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-512.png'];
/* nur diese Adressen (ohne ?Query und #Anker) landen im Cache; so kann kein Link den Cache aufblaehen */
var KEYS = FILES.map(function (f) { return new URL(f, self.location.href).href; });
/* so lange wartet die Seite aufs Netz, bevor sie die gespeicherte Fassung nimmt */
var TIMEOUT = 3000;

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

/* Zuerst das Netz (eine neue Version ist so schon beim naechsten Start aktiv), nach TIMEOUT
   oder ohne Netz die gespeicherte Fassung. Antwortet das Netz spaeter doch, wird der Cache
   trotzdem aktualisiert. Fremde Adressen und Dateien ausserhalb von FILES gehen direkt ans Netz. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  url.search = '';
  url.hash = '';
  var key = url.href;
  if (KEYS.indexOf(key) < 0) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    var net = fetch(req, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) return res;
      return c.put(key, res.clone()).then(function () { return res; }, function () { return res; });
    });
    e.waitUntil(net.catch(function () {}));
    return new Promise(function (resolve, reject) {
      var settled = false;
      function give(res) { if (!settled) { settled = true; clearTimeout(timer); resolve(res); } }
      var timer = setTimeout(function () {
        c.match(key).then(function (hit) { if (hit) give(hit); });
      }, TIMEOUT);
      net.then(function (res) {
        if (res.ok) return give(res);
        return c.match(key).then(function (hit) { give(hit || res); });
      }, function (err) {
        return c.match(key).then(function (hit) {
          if (hit) return give(hit);
          if (!settled) { settled = true; clearTimeout(timer); reject(err); }
        });
      });
    });
  }));
});
