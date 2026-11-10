/* Купил — Привёз — лендинг и мастер заказа. Данные никуда не отправляются:
   заказ уходит только когда человек сам открывает WhatsApp или телефон. */
(function () {
  'use strict';
  var CFG = window.GV_CFG || {};
  var PHONE = CFG.PHONE || '77027184520';
  var NAME = CFG.NAME || 'Купил — Привёз';
  var KEY = 'gv-order';

  var ROUTES = [
    { id: 'city', t: 'По городу' },
    { id: 'suburb', t: 'Пригород' },
    { id: 'inter', t: 'Межгород' }
  ];
  var CARGO = [
    { id: 'move', t: 'Переезд' },
    { id: 'furniture', t: 'Мебель' },
    { id: 'tech', t: 'Техника' },
    { id: 'build', t: 'Стройматериалы' },
    { id: 't1', t: 'Груз до 1 т' },
    { id: 't3', t: 'Груз до 3 т' },
    { id: 'other', t: 'Другое' }
  ];
  var WHEN = [
    { id: 'now', t: 'Сейчас' },
    { id: 'today', t: 'Сегодня' },
    { id: 'tomorrow', t: 'Завтра' },
    { id: 'other', t: 'В другой день' }
  ];
  var KMS = [5, 10, 15, 20, 30, 50, 100];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtPhone(p) {
    var m = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(p || '');
    return m ? '+7 ' + m[1] + ' ' + m[2] + ' ' + m[3] + ' ' + m[4] : '+' + p;
  }
  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }
  function baseUrl() {
    return location.origin + location.pathname.replace(/[^/]*$/, '').replace(/card\.html$/, '').replace(/privacy\.html$/, '');
  }
  function toast(msg, ms) {
    var el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._h); el._h = setTimeout(function () { el.classList.remove('show'); }, ms || 2200);
  }
  function copy(text) {
    function ok() { toast('Ссылка скопирована'); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); ok();
    }
  }
  function share(url, title, text) {
    if (navigator.share) navigator.share({ title: title || NAME, text: text || NAME, url: url || baseUrl() }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(url || baseUrl()); });
    else copy(url || baseUrl());
  }
  function sheet(title, html) {
    var bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><button type="button" class="sheet-x" aria-label="Закрыть">×</button><h2>' + esc(title) + '</h2><div class="sheet-b">' + html + '</div></div>';
    function close() { bg.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('.sheet-x')) close(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(bg);
    bg.querySelector('.sheet-x').focus();
    return bg;
  }

  /* ---------- PWA install ---------- */
  var installEvt = null;
  var UA = navigator.userAgent || '';
  var IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var IS_ANDROID = /Android/i.test(UA);
  function inApp() { return !!(window.TelegramWebviewProxy || /Telegram|FBAN|FBAV|FB_IAB|Instagram|Line\/|; wv\)/i.test(UA)); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; });
  window.addEventListener('appinstalled', function () { installEvt = null; toast('Готово! Иконка Купил — Привёз на главном экране.', 4000); });
  function installHelp() {
    var k = inApp()
      ? '<ol class="inst"><li>Сайт открыт внутри Telegram/WhatsApp — отсюда установить нельзя.</li><li>Нажмите <b>⋮</b> или <b>…</b> вверху и выберите <b>«Открыть в браузере»</b>.</li><li>В браузере снова нажмите <b>«Установить на телефон»</b>.</li></ol>'
      : IS_IOS
        ? '<ol class="inst"><li>Откройте сайт в <b>Safari</b>.</li><li>Нажмите <b>«Поделиться»</b> (квадрат со стрелкой) внизу.</li><li>Выберите <b>«На экран „Домой“»</b> → <b>«Добавить»</b>.</li></ol>'
        : IS_ANDROID
          ? '<ol class="inst"><li>Нажмите <b>⋮</b> (три точки) вверху справа в Chrome.</li><li>Выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>.</li><li>Нажмите <b>«Установить»</b>.</li></ol>'
          : '<ol class="inst"><li>В Chrome или Edge нажмите значок установки в адресной строке или меню <b>⋮</b> → <b>«Установить»</b>.</li><li>На телефоне откройте этот адрес в Chrome или Safari.</li></ol>';
    return sheet('Установить Купил — Привёз на телефон', k);
  }
  function doInstall() {
    if (installEvt) { var ev = installEvt; installEvt = null; ev.prompt(); ev.userChoice.catch(function () {}); }
    else installHelp();
  }
  function bindInstall() {
    document.querySelectorAll('[data-install]').forEach(function (b) {
      if (b._gv) return; b._gv = true; b.hidden = standalone();
      b.addEventListener('click', function (e) { e.preventDefault(); doInstall(); });
    });
  }

  /* ---------- QR ---------- */
  function makeQR(text) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    var q = qrcode(0, 'M'); q.addData(text, 'Byte'); q.make(); return q;
  }
  function qrSvg(text) {
    var q = makeQR(text), n = q.getModuleCount(), m = 3, path = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) path += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    var s = n + m * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges" role="img" aria-label="QR-код Купил — Привёз"><rect width="' + s + '" height="' + s + '" fill="#fff"/><path d="' + path + '" fill="#1A0A0A"/></svg>';
  }
  function qrPng(text, caption, sub) {
    var q = makeQR(text), n = q.getModuleCount(), quiet = 4, cell = Math.max(8, Math.floor(880 / (n + quiet * 2)));
    var qs = (n + quiet * 2) * cell, capH = 200;
    var cv = document.createElement('canvas'); cv.width = qs; cv.height = qs + capH;
    var g = cv.getContext('2d');
    g.fillStyle = '#6E1422'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#C4A574'; g.fillRect(0, 0, cv.width, 8);
    g.fillStyle = '#fff';
    var pad = quiet * cell;
    g.fillRect(pad - 8, pad - 8, qs - (pad - 8) * 2, qs - (pad - 8) * 2);
    g.fillStyle = '#1A0A0A';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    g.fillStyle = '#C4A574';
    g.font = '500 48px Palatino, Georgia, serif'; g.textAlign = 'center';
    g.fillText(caption || NAME, qs / 2, qs + 70);
    g.font = '500 32px Palatino, Georgia, serif';
    g.fillText(sub || fmtPhone(PHONE), qs / 2, qs + 130);
    return cv.toDataURL('image/png');
  }
  function bindQr() {
    var box = $('qrHome'); if (!box || typeof qrcode !== 'function') return;
    var url = baseUrl();
    box.innerHTML = qrSvg(url);
    var save = $('qrSave');
    if (save && !save._gv) {
      save._gv = true;
      save.addEventListener('click', function () {
        var a = document.createElement('a'); a.href = qrPng(url, NAME, fmtPhone(PHONE)); a.download = 'kupil-privez-qr.png';
        document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500);
      });
    }
  }

  /* ---------- calculator ---------- */
  function ratesFor(route) { return (CFG.RATES && CFG.RATES[route]) || CFG.RATES.city; }
  function estimate(st) {
    var R = ratesFor(st.route || 'city'), km = Math.max(0, +st.km || 0);
    if (!km) return null;
    var inc = R.inc || 0, base = R.min + Math.max(0, km - inc) * R.km;
    var loaders = +st.loaders || 0, extra = loaders * (CFG.RATES.loader || 0);
    var total = Math.round((base + extra) / 500) * 500;
    return { total: total, base: base, extra: extra, km: km, loaders: loaders, R: R };
  }
  function priceHtml(st) {
    var e = estimate(st);
    if (!e) return '<div class="price"><b>Укажите км</b><small>Примерная цена появится сразу</small></div>';
    return '<div class="price" id="priceBox"><b>Примерно ' + fmtNum(e.total) + ' ₸</b><small>Ориентир, не счёт. Точную сумму согласуем в WhatsApp.</small></div>';
  }

  /* ---------- order state ---------- */
  function blank() { return { step: 1, route: '', cargo: '', cargoOther: '', loaders: null, from: '', to: '', comment: '', km: '', when: '', whenText: '' }; }
  var st = blank();
  function load() {
    try { var x = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (x && typeof x === 'object') st = Object.assign(blank(), x); } catch (e) {}
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  function labelRoute() { var x = ROUTES.filter(function (r) { return r.id === st.route; })[0]; return x ? x.t.toLowerCase() : '—'; }
  function labelCargo() {
    if (st.cargo === 'other') return (st.cargoOther || 'Другое').trim();
    var x = CARGO.filter(function (r) { return r.id === st.cargo; })[0]; return x ? x.t : '—';
  }
  function labelLoaders() {
    if (st.loaders === 0 || st.loaders === '0') return 'не нужны';
    if (st.loaders === '4+') return '4 и больше';
    return String(st.loaders);
  }
  function labelWhen() {
    if (st.when === 'other') return (st.whenText || 'в другой день').trim();
    var x = WHEN.filter(function (r) { return r.id === st.when; })[0]; return x ? x.t.toLowerCase() : '—';
  }
  function orderText() {
    var e = estimate(st);
    var L = [
      'Заказ Купил — Привёз',
      'Маршрут: ' + labelRoute(),
      'Откуда: ' + (st.from || '—'),
      'Куда: ' + (st.to || '—'),
      'Груз: ' + labelCargo(),
      'Грузчики: ' + (st.loaders === 0 || st.loaders === '0' ? 'нет' : labelLoaders()),
      'Когда: ' + labelWhen(),
      'Дистанция: ' + (st.km ? st.km + ' км' : '—')
    ];
    if (e) L.push('Примерно: ' + fmtNum(e.total) + ' ₸');
    if (st.comment) L.push('Комментарий: ' + st.comment);
    return L.join('\n');
  }
  function waOrder() { return 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(orderText()); }

  function chips(list, key, extra) {
    return list.map(function (x) {
      var on = st[key] === x.id ? ' on" aria-pressed="true"' : '" aria-pressed="false"';
      return '<button type="button" class="chip' + on + ' data-k="' + key + '" data-v="' + esc(x.id) + '">' + esc(x.t) + (x.sub ? '<span class="sub">' + esc(x.sub) + '</span>' : '') + '</button>';
    }).join('') + (extra || '');
  }
  function nav(nextLabel, nextEnabled) {
    return '<div class="step-nav"><button type="button" class="btn btn-sm" id="backBtn">Назад</button>' +
      (nextLabel ? '<button type="button" class="btn btn-yel" id="nextBtn"' + (nextEnabled ? '' : ' disabled') + '>' + esc(nextLabel) + '</button>' : '<span></span>') + '</div>';
  }

  function renderStep() {
    var root = $('step'); if (!root) return;
    var p = $('prog'), dots = '';
    for (var i = 1; i <= 6; i++) dots += '<i class="' + (i === st.step ? 'on' : i < st.step ? 'done' : '') + '"></i>';
    if (p) p.innerHTML = dots;
    var h = '';
    if (st.step === 1) {
      h = '<h2 class="step-h">Куда везём?</h2><div class="choice">' + chips(ROUTES, 'route') + '</div>' + nav('Дальше', !!st.route);
    } else if (st.step === 2) {
      h = '<h2 class="step-h">Что везём?</h2><div class="choice grid2">' + chips(CARGO, 'cargo') + '</div>' +
        '<label class="fld other' + (st.cargo === 'other' ? ' show' : '') + '" id="otherBox"><span>Опишите груз</span><input class="inp" id="cargoOther" maxlength="80" value="' + esc(st.cargoOther) + '" placeholder="Например, пианино"></label>' +
        nav('Дальше', !!st.cargo && (st.cargo !== 'other' || !!st.cargoOther.trim()));
    } else if (st.step === 3) {
      var need = st.loaders !== null && st.loaders !== 0 && st.loaders !== '0';
      h = '<h2 class="step-h">Грузчики?</h2><div class="choice btns-2">' +
        '<button type="button" class="chip' + (st.loaders === 0 || st.loaders === '0' ? ' on' : '') + '" data-k="need" data-v="0">Не нужны</button>' +
        '<button type="button" class="chip' + (need ? ' on' : '') + '" data-k="need" data-v="yes">Нужны</button></div>';
      if (need) {
        h += '<p style="font-weight:800;margin:16px 0 8px">Сколько?</p><div class="choice grid2">' +
          [1, 2, 3, '4+'].map(function (n) {
            return '<button type="button" class="chip' + (String(st.loaders) === String(n) ? ' on' : '') + '" data-k="loaders" data-v="' + n + '">' + n + '</button>';
          }).join('') + '</div>';
      }
      h += nav('Дальше', st.loaders !== null && st.loaders !== '' && (st.loaders === 0 || st.loaders === '0' || st.loaders));
    } else if (st.step === 4) {
      h = '<h2 class="step-h">Откуда и куда?</h2>' +
        '<label class="fld"><span>Откуда</span><input class="inp" id="from" maxlength="120" value="' + esc(st.from) + '" placeholder="Адрес или район"></label>' +
        '<label class="fld"><span>Куда</span><input class="inp" id="to" maxlength="120" value="' + esc(st.to) + '" placeholder="Адрес или район"></label>' +
        '<label class="fld"><span>Комментарий <em style="font-style:normal;color:var(--muted);font-weight:600">необязательно</em></span><textarea class="inp" id="comment" maxlength="200" rows="2" placeholder="Этаж, таймаут, хрупкое…">' + esc(st.comment) + '</textarea></label>' +
        '<p style="font-weight:800;margin:8px 0">Сколько примерно километров?</p>' +
        '<div class="km-row" id="kms">' + KMS.map(function (n) {
          return '<button type="button" class="chip' + (+st.km === n ? ' on' : '') + '" data-k="km" data-v="' + n + '">' + n + '</button>';
        }).join('') + '</div>' +
        '<label class="fld"><span>Или своё число</span><input class="inp" id="kmIn" inputmode="numeric" maxlength="5" value="' + esc(st.km) + '" placeholder="км"></label>' +
        priceHtml(st) + nav('Дальше', !!(st.from.trim() && st.to.trim() && +st.km > 0));
    } else if (st.step === 5) {
      h = '<h2 class="step-h">Когда?</h2><div class="choice">' + chips(WHEN, 'when') + '</div>' +
        '<label class="fld other' + (st.when === 'other' ? ' show' : '') + '" id="whenBox"><span>День и время</span><input class="inp" id="whenText" maxlength="60" value="' + esc(st.whenText) + '" placeholder="Например, 12 ноября, 14:00"></label>' +
        nav('К заказу', !!st.when && (st.when !== 'other' || !!st.whenText.trim()));
    } else {
      var e = estimate(st);
      h = '<h2 class="step-h">Проверьте заказ</h2><div class="review">' +
        [['Маршрут', labelRoute()], ['Откуда', st.from], ['Куда', st.to], ['Груз', labelCargo()],
          ['Грузчики', st.loaders === 0 || st.loaders === '0' ? 'не нужны' : labelLoaders()],
          ['Когда', labelWhen()], ['Дистанция', st.km + ' км'],
          ['Примерно', e ? fmtNum(e.total) + ' ₸' : '—']].map(function (row) {
          return '<dl><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></dl>';
        }).join('') +
        (st.comment ? '<dl><dt>Комментарий</dt><dd>' + esc(st.comment) + '</dd></dl>' : '') +
        '</div>' +
        '<p class="muted" style="text-align:center;font-weight:700;margin-bottom:12px">Ориентир, не счёт. Точную сумму согласуем в WhatsApp.</p>' +
        '<div class="btns">' +
        '<a class="btn btn-wa btn-block" id="waSend" href="' + esc(waOrder()) + '" target="_blank" rel="noopener">Отправить в WhatsApp</a>' +
        '<a class="btn btn-call btn-block" href="tel:+' + PHONE + '">Позвонить</a>' +
        '</div>' + nav();
    }
    root.innerHTML = h;
  }

  function canNext() {
    if (st.step === 1) return !!st.route;
    if (st.step === 2) return !!st.cargo && (st.cargo !== 'other' || !!st.cargoOther.trim());
    if (st.step === 3) return st.loaders !== null && st.loaders !== '';
    if (st.step === 4) return !!(st.from.trim() && st.to.trim() && +st.km > 0);
    if (st.step === 5) return !!st.when && (st.when !== 'other' || !!st.whenText.trim());
    return true;
  }
  function syncFields() {
    var o = $('cargoOther'); if (o) st.cargoOther = o.value;
    var w = $('whenText'); if (w) st.whenText = w.value;
    var f = $('from'); if (f) st.from = f.value;
    var t = $('to'); if (t) st.to = t.value;
    var c = $('comment'); if (c) st.comment = c.value;
    var k = $('kmIn'); if (k && document.activeElement === k) st.km = k.value.replace(/\D/g, '').slice(0, 4);
    save();
  }
  function onStepClick(e) {
    var b = e.target.closest && e.target.closest('[data-k]'); if (!b) return;
    var k = b.dataset.k, v = b.dataset.v;
    if (k === 'need') {
      if (v === '0') st.loaders = 0; else st.loaders = st.loaders && st.loaders !== 0 && st.loaders !== '0' ? st.loaders : 1;
    } else if (k === 'km') { st.km = v; }
    else st[k] = v;
    save(); renderStep();
  }

  function goHome() { st.step = Math.max(1, st.step); save(); if (location.hash) location.hash = ''; else setMode(); }
  function goOrder() { if (!st.step) st.step = 1; if (location.hash === '#zakaz') setMode(); else location.hash = 'zakaz'; }
  function setMode() {
    var h = (location.hash || '').replace('#', '');
    document.body.classList.toggle('mode-order', h === 'zakaz' || h === 'order');
    document.body.classList.toggle('mode-card', h === 'card' && !!$('cardview'));
    if (document.body.classList.contains('mode-order')) renderStep();
    window.scrollTo(0, 0);
  }
  function bindWizard() {
    var box = $('wizard'); if (!box || box._gv) return; box._gv = true;
    box.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-k]')) return onStepClick(e);
      if (e.target.closest && e.target.closest('#backBtn')) {
        syncFields();
        if (st.step <= 1) { goHome(); return; }
        st.step--; save(); renderStep(); window.scrollTo(0, 0); return;
      }
      if (e.target.closest && e.target.closest('#nextBtn')) {
        syncFields(); if (!canNext()) return;
        st.step = Math.min(6, st.step + 1); save(); renderStep(); window.scrollTo(0, 0);
      }
    });
    box.addEventListener('input', function (e) {
      var el = e.target, id = el && el.id;
      if (!id) return;
      syncFields();
      if (id === 'kmIn') { st.km = el.value.replace(/\D/g, '').slice(0, 4); el.value = st.km; var pb = $('priceBox'); if (pb) pb.outerHTML = priceHtml(st); }
      var n = $('nextBtn'); if (n) n.disabled = !canNext();
      save();
    });
  }

  /* ---------- boot ---------- */
  function bindChrome() {
    document.querySelectorAll('[data-share]').forEach(function (b) {
      if (b._gv) return; b._gv = true;
      b.addEventListener('click', function () { share(baseUrl(), NAME, NAME + ' — грузоперевозки до 3 т. ' + fmtPhone(PHONE)); });
    });
    var wa = $('waHome'); if (wa) wa.href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent('Здравствуйте! Нужна перевозка, Купил — Привёз.');
    var start = $('startBtn'); if (start) start.addEventListener('click', goOrder);
    bindInstall(); bindQr();
  }
  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  load();
  bindChrome();
  bindWizard();
  if (location.hash === '#zakaz' || location.hash === '#order') setMode();
  window.addEventListener('hashchange', setMode);
  registerSW();
})();
