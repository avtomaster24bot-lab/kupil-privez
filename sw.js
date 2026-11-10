/* Купил — Привёз service worker. Удаляем только свои кэши kupil-privez-*:
   кэши vezu-platform-* и vezu-static-* на том же домене не трогаем. */
var CACHE = 'kupil-privez-v4';
var SHELL = ['./', 'index.html', 'card.html', 'privacy.html', 'css/style.css', 'js/config.js', 'js/app.js',
  'js/vendor/qrcode.js', 'favicon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/apple-touch-icon.png', 'img/van.jpg', 'img/van.webp', 'img/og.jpg',
  'fonts/playfair.woff2', 'fonts/playfair-italic.woff2', 'fonts/franklin.woff2',
  'js/geo.js', 'js/vendor/leaflet/leaflet.js', 'js/vendor/leaflet/leaflet.css',
  'js/vendor/leaflet/images/marker-icon.png', 'js/vendor/leaflet/images/marker-icon-2x.png',
  'js/vendor/leaflet/images/marker-shadow.png', 'js/vendor/leaflet/images/layers.png',
  'js/vendor/leaflet/images/layers-2x.png'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k.indexOf('kupil-privez-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok && res.type === 'basic') {
      var copy = res.clone(), url = new URL(req.url); url.search = ''; url.hash = '';
      caches.open(CACHE).then(function (c) { c.put(url.href, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('./') || Response.error(); });
  }));
});
