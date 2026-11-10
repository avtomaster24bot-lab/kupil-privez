/* Геолокация, карта Leaflet, Nominatim и OSRM — как в VEZU.
   Запросы уходят только на OSM/Nominatim/OSRM, не на наш сервер. */
(function () {
  'use strict';
  var KARAGANDA = { lat: 49.805, lon: 73.109 };
  var gcache = {};
  var map, layerA, layerB, mode = 'from', onDone = null;
  var draft = { from: '', to: '', fromGeo: null, toGeo: null };

  function tfetch(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 8000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      clearTimeout(tm);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }
  function shortAddress(j) {
    var a = (j && j.address) || {};
    var street = a.road || a.pedestrian || a.footway || a.residential || '';
    var place = street ? street + (a.house_number ? ', ' + a.house_number : '') : (a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.village || '');
    var city = a.city || a.town || a.village || a.county || a.state || '';
    var r = [place, city !== place ? city : ''].filter(Boolean).join(', ');
    if (!r && j && j.display_name) r = j.display_name.split(',').slice(0, 3).join(',').trim();
    return r;
  }
  function reverse(lat, lon) {
    return tfetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=ru&zoom=18&addressdetails=1&lat=' + lat + '&lon=' + lon, 7000)
      .then(function (j) { return shortAddress(j); });
  }
  function geocode(q, city) {
    q = String(q || '').trim();
    if (!q) return Promise.reject(new Error('empty'));
    var m = q.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
    if (m) return Promise.resolve({ lat: +m[1], lon: +m[2] });
    if (city && q.toLowerCase().indexOf(city.toLowerCase()) < 0) q += ', ' + city;
    if (gcache[q]) return Promise.resolve(gcache[q]);
    return tfetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kz&accept-language=ru&q=' + encodeURIComponent(q), 8000)
      .then(function (j) {
        if (!j || !j[0]) throw new Error('notfound');
        return (gcache[q] = { lat: +j[0].lat, lon: +j[0].lon });
      });
  }
  function straight(a, b) {
    var R = 6371, rad = Math.PI / 180, dLa = (b.lat - a.lat) * rad, dLo = (b.lon - a.lon) * rad;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function routeKm(a, b) {
    return tfetch('https://router.project-osrm.org/route/v1/driving/' + a.lon + ',' + a.lat + ';' + b.lon + ',' + b.lat + '?overview=false', 9000)
      .then(function (j) {
        if (!j || j.code !== 'Ok' || !j.routes || !j.routes[0]) throw new Error('noroute');
        return { km: j.routes[0].distance / 1000, how: 'route' };
      })
      .catch(function () { return { km: straight(a, b) * 1.3, how: 'line' }; });
  }
  function gisPoint(g) {
    return 'https://2gis.kz/geo/' + (+g.lon).toFixed(6) + ',' + (+g.lat).toFixed(6);
  }
  /* Проверено: 2ГИС принимает точки через | и открывает автомаршрут.
     Формат routeSearch/rsType/car уводит на главную города — его не используем. */
  function gisRoute(a, b) {
    return 'https://2gis.kz/directions/points/' +
      (+a.lon).toFixed(6) + ',' + (+a.lat).toFixed(6) + '|' +
      (+b.lon).toFixed(6) + ',' + (+b.lat).toFixed(6);
  }
  function locate(cb) {
    if (!navigator.geolocation) { cb({ code: 0, message: 'Геолокация в этом браузере недоступна.' }); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var g = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      var coords = g.lat.toFixed(5) + ', ' + g.lon.toFixed(5);
      reverse(g.lat, g.lon).then(function (addr) { return addr || coords; }, function () { return coords; }).then(function (addr) {
        cb(null, { lat: g.lat, lon: g.lon, addr: addr });
      });
    }, function (e) {
      var c = e && e.code;
      cb({
        code: c,
        message: c === 1 ? 'Нужно разрешить доступ к геолокации в браузере.' : c === 3 ? 'Не удалось определить место: время вышло.' : 'Не удалось определить место.'
      });
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }

  function $(id) { return document.getElementById(id); }
  function pinIcon(letter, color) {
    return window.L.divIcon({
      className: 'kp-pin',
      html: '<span class="kp-pin-dot" style="background:' + color + '">' + letter + '</span>',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
  }
  function status() {
    var el = $('mapStatus'); if (!el) return;
    var a = draft.fromGeo ? (draft.from || 'точка А') : 'не отмечено';
    var b = draft.toGeo ? (draft.to || 'точка Б') : 'не отмечено';
    el.textContent = 'Откуда: ' + a + '  ·  Куда: ' + b;
  }
  function putPin(which, g) {
    if (!map || !window.L) return;
    var layer = which === 'from' ? layerA : layerB;
    if (layer) map.removeLayer(layer);
    var mk = window.L.marker([g.lat, g.lon], { icon: pinIcon(which === 'from' ? 'A' : 'B', which === 'from' ? '#6E1422' : '#C4A574'), draggable: true });
    mk.addTo(map);
    mk.on('dragend', function () {
      var ll = mk.getLatLng();
      applyPoint(which, { lat: ll.lat, lon: ll.lng }, true);
    });
    if (which === 'from') layerA = mk; else layerB = mk;
  }
  function applyPoint(which, g, doRev) {
    draft[which + 'Geo'] = { lat: g.lat, lon: g.lon };
    if (!doRev) {
      status();
      return;
    }
    var coords = g.lat.toFixed(5) + ', ' + g.lon.toFixed(5);
    reverse(g.lat, g.lon).then(function (addr) { return addr || coords; }, function () { return coords; }).then(function (addr) {
      draft[which] = addr;
      status();
    });
  }
  function fit() {
    if (!map) return;
    var pts = [];
    if (draft.fromGeo) pts.push([draft.fromGeo.lat, draft.fromGeo.lon]);
    if (draft.toGeo) pts.push([draft.toGeo.lat, draft.toGeo.lon]);
    if (pts.length === 2) map.fitBounds(pts, { padding: [36, 36], maxZoom: 14 });
    else if (pts.length === 1) map.setView(pts[0], 15);
  }
  function setMode(next) {
    mode = next === 'to' ? 'to' : 'from';
    var bg = $('mapOverlay'); if (!bg) return;
    bg.querySelectorAll('[data-map-mode]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-map-mode') === mode);
    });
    var hint = $('mapHint');
    if (hint) hint.textContent = mode === 'from' ? 'Нажмите на карту: это точка «Откуда».' : 'Нажмите на карту: это точка «Куда».';
  }
  function ensureOverlay() {
    if ($('mapOverlay')) return;
    var bg = document.createElement('div');
    bg.id = 'mapOverlay';
    bg.className = 'map-bg';
    bg.hidden = true;
    bg.innerHTML = '<div class="map-sheet" role="dialog" aria-modal="true" aria-label="Карта маршрута">' +
      '<button type="button" class="sheet-x" data-map-close aria-label="Закрыть">×</button>' +
      '<h2>Отметьте точки</h2>' +
      '<div class="map-modes" role="tablist">' +
      '<button type="button" class="on" data-map-mode="from">Откуда</button>' +
      '<button type="button" data-map-mode="to">Куда</button></div>' +
      '<div id="kpMap" class="map-canvas" role="application" aria-label="Карта"></div>' +
      '<p class="map-hint" id="mapHint">Нажмите на карту: это точка «Откуда».</p>' +
      '<p class="map-status" id="mapStatus" aria-live="polite"></p>' +
      '<div class="map-actions">' +
      '<button type="button" class="btn btn-ghost" data-map-geo>Где я</button>' +
      '<button type="button" class="btn btn-yel" data-map-done>Готово</button>' +
      '</div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', function (e) {
      if (e.target === bg || (e.target.closest && e.target.closest('[data-map-close]'))) closeMap(false);
    });
    bg.querySelectorAll('[data-map-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-map-mode')); });
    });
    bg.querySelector('[data-map-done]').addEventListener('click', function () { closeMap(true); });
    bg.querySelector('[data-map-geo]').addEventListener('click', function () {
      var btn = bg.querySelector('[data-map-geo]');
      btn.disabled = true; btn.textContent = 'Ищу…';
      locate(function (err, res) {
        btn.disabled = false; btn.textContent = 'Где я';
        if (err) { var s = $('mapStatus'); if (s) s.textContent = err.message; return; }
        draft[mode + 'Geo'] = { lat: res.lat, lon: res.lon };
        draft[mode] = res.addr;
        putPin(mode, res);
        map.setView([res.lat, res.lon], 15);
        status();
        if (mode === 'from' && !draft.toGeo) setMode('to');
      });
    });
  }
  function initMap() {
    if (!window.L) return;
    var el = $('kpMap');
    if (map) { map.invalidateSize(); return; }
    if (window.L.Icon && window.L.Icon.Default) {
      window.L.Icon.Default.mergeOptions({ imagePath: 'js/vendor/leaflet/images/' });
    }
    map = window.L.map(el, { zoomControl: true, attributionControl: true });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    map.on('click', function (ev) {
      var g = { lat: ev.latlng.lat, lon: ev.latlng.lng };
      var which = mode;
      putPin(which, g);
      applyPoint(which, g, true);
      if (which === 'from' && !draft.toGeo) setMode('to');
    });
  }
  function openMap(opts) {
    opts = opts || {};
    onDone = opts.onDone || null;
    draft = {
      from: opts.from || '',
      to: opts.to || '',
      fromGeo: opts.fromGeo ? { lat: +opts.fromGeo.lat, lon: +opts.fromGeo.lon } : null,
      toGeo: opts.toGeo ? { lat: +opts.toGeo.lat, lon: +opts.toGeo.lon } : null
    };
    ensureOverlay();
    var bg = $('mapOverlay');
    bg.hidden = false;
    document.body.classList.add('map-open');
    setMode(draft.fromGeo && !draft.toGeo ? 'to' : 'from');
    status();
    setTimeout(function () {
      initMap();
      if (!map) return;
      if (layerA) { map.removeLayer(layerA); layerA = null; }
      if (layerB) { map.removeLayer(layerB); layerB = null; }
      if (draft.fromGeo) putPin('from', draft.fromGeo);
      if (draft.toGeo) putPin('to', draft.toGeo);
      if (draft.fromGeo || draft.toGeo) fit();
      else map.setView([KARAGANDA.lat, KARAGANDA.lon], 12);
      map.invalidateSize();
    }, 60);
  }
  function closeMap(ok) {
    var bg = $('mapOverlay');
    if (bg) bg.hidden = true;
    document.body.classList.remove('map-open');
    if (ok && onDone) {
      onDone({
        from: draft.from,
        to: draft.to,
        fromGeo: draft.fromGeo,
        toGeo: draft.toGeo
      });
    }
    onDone = null;
  }

  window.KP_GEO = {
    KARAGANDA: KARAGANDA,
    reverse: reverse,
    geocode: geocode,
    routeKm: routeKm,
    locate: locate,
    gisPoint: gisPoint,
    gisRoute: gisRoute,
    openMap: openMap,
    closeMap: closeMap
  };
})();
