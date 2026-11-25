/* Off Duty tab: flight path, switch panel, hangar, departures board, black box. */
(function () {
  'use strict';
  var panel = document.getElementById('offduty');
  if (!panel) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- flight path ---------- */
  var map = panel.querySelector('.chart-map');
  /* simple equirectangular chart: lon -110..95, lat 70..0 */
  function px(lon, lat) { return [(lon + 110) / 205 * 760, (70 - lat) / 70 * 300]; }
  var grid = map.querySelector('.chart-map__grid');
  for (var lon = -100; lon <= 90; lon += 20) { var x = px(lon, 0)[0]; grid.appendChild(el('line', { x1: x, x2: x, y1: 0, y2: 300 })); }
  for (var lat = 10; lat <= 60; lat += 10) {
    var y = px(0, lat)[1]; grid.appendChild(el('line', { x1: 0, x2: 760, y1: y, y2: y }));
    grid.appendChild(el('text', { x: 6, y: y - 4 }, lat + '°N'));
  }
  var VISITED = [['Paris', 2.3, 48.9], ['Switzerland', 8.2, 46.8], ['Rome', 12.5, 41.9], ['Doha', 51.5, 25.3], ['Riyadh', 46.7, 24.7], ['USA', -77, 38.9]];
  var dots = map.querySelector('.chart-map__dots');
  VISITED.forEach(function (v) {
    var p = px(v[1], v[2]), g = el('g', { class: 'visit' });
    g.appendChild(el('circle', { cx: p[0], cy: p[1], r: 3.2 }));
    g.appendChild(el('text', { x: p[0] + 6, y: p[1] - 5 }, v[0]));
    dots.appendChild(g);
  });
  var HOMES = [
    { code: 'BLR', pos: px(77.6, 13), title: 'Bengaluru, India · born here', body: 'Climate setting: RAIN. Where it all started.', gauge: 'Rain', level: 0.78, wx: 'rain' },
    { code: 'DXB', pos: px(55.3, 25.2), title: 'Dubai, UAE · 2006 to 2016', body: 'Climate setting: HEAT. Grades 1 to 10, with summer highs above 40 °C. First real flight: Emirates, to Dubai.', gauge: '40 °C+', level: 0.96, wx: 'heat' },
    { code: 'YHZ', pos: px(-62, 45.6), title: 'Nova Scotia, Canada · 2023 to now', body: 'Climate setting: SNOW. Winter nights can drop below −15 °C. Snowboarding is on the list.', gauge: '−15 °C', level: 0.12, wx: 'snow' }
  ];
  HOMES.forEach(function (h, i) {
    var g = el('g', { class: 'home', 'data-i': i });
    g.appendChild(el('circle', { cx: h.pos[0], cy: h.pos[1], r: 13, class: 'home__ring' }));
    g.appendChild(el('circle', { cx: h.pos[0], cy: h.pos[1], r: 6, class: 'home__dot' }));
    g.appendChild(el('text', { x: h.pos[0], y: h.pos[1] + (i === 0 ? 30 : -20), 'text-anchor': 'middle', class: 'home__code' }, h.code));
    dots.appendChild(g);
  });
  var legs = [map.querySelector('.chart-map__leg--1'), map.querySelector('.chart-map__leg--2')];
  legs.forEach(function (l) { var n = l.getTotalLength(); l.style.setProperty('--len', n); l.style.strokeDasharray = n; l.style.strokeDashoffset = n; });
  var plane = map.querySelector('.chart-map__plane');
  var wx = panel.querySelector('.wx');
  var stopBtns = [].slice.call(panel.querySelectorAll('.stop'));
  var gaugeFill = panel.querySelector('.gauge__fill'), gaugeLabel = panel.querySelector('.gauge__label');
  var infoT = panel.querySelector('.stop-info__title'), infoB = panel.querySelector('.stop-info__body');
  var stop = -1, anim = 0;

  function placePlane(p, ang) { plane.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')'); }
  function fly(path, reverse, done) {
    cancelAnimationFrame(anim);
    var n = path.getTotalLength(), t0 = performance.now(), D = reduce ? 1 : 1400;
    (function tick(now) {
      var k = Math.min(1, (now - t0) / D), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var at = reverse ? n * (1 - e) : n * e;
      var a = path.getPointAtLength(at), b = path.getPointAtLength(Math.min(n, Math.max(0, at + (reverse ? -1 : 1))));
      placePlane(a, Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI);
      if (!reverse) path.style.strokeDashoffset = n * (1 - e);
      if (k < 1) anim = requestAnimationFrame(tick); else if (done) done();
    })(t0);
  }
  function weather(kind) {
    while (wx.firstChild) wx.removeChild(wx.firstChild);
    wx.className = 'wx wx--' + kind;
    if (reduce) return;
    var n = kind === 'heat' ? 6 : 34;
    for (var i = 0; i < n; i++) {
      var d = document.createElement('i');
      d.style.left = (Math.random() * 100).toFixed(1) + '%';
      d.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';
      d.style.animationDuration = (kind === 'rain' ? 0.6 + Math.random() * 0.5 : kind === 'snow' ? 3 + Math.random() * 3 : 3 + Math.random() * 2).toFixed(2) + 's';
      if (kind === 'snow') d.style.setProperty('--s', (2 + Math.random() * 4).toFixed(1) + 'px');
      wx.appendChild(d);
    }
  }
  function setStop(i, animate) {
    if (i === stop) return;
    var prev = stop; stop = i;
    stopBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    [].forEach.call(dots.querySelectorAll('.home'), function (g, k) { g.classList.toggle('is-on', k === i); g.classList.toggle('is-past', k < i); });
    var h = HOMES[i];
    infoT.textContent = h.title; infoB.textContent = h.body;
    gaugeLabel.textContent = h.gauge; gaugeFill.style.setProperty('--lvl', h.level);
    panel.querySelector('.gauge').className = 'gauge gauge--' + h.wx;
    weather(h.wx);
    legs.forEach(function (l, k) { if (k >= i) l.style.strokeDashoffset = l.getTotalLength(); else l.style.strokeDashoffset = 0; });
    if (animate && prev >= 0 && Math.abs(i - prev) === 1) {
      var leg = legs[Math.min(i, prev)];
      if (i > prev) { leg.style.strokeDashoffset = leg.getTotalLength(); fly(leg, false); }
      else fly(leg, true);
    } else {
      placePlane({ x: h.pos[0], y: h.pos[1] }, i === 2 ? 200 : -150);
    }
  }
  stopBtns.forEach(function (b, k) {
    b.addEventListener('click', function () {
      if (Math.abs(k - stop) > 1) { var mid = 1; setStop(mid, true); setTimeout(function () { setStop(k, true); }, reduce ? 0 : 1450); }
      else setStop(k, true);
    });
  });
  [].forEach.call(dots.querySelectorAll('.home'), function (g, k) { g.addEventListener('click', function () { stopBtns[k].click(); }); });
  setStop(0, false);

  [].forEach.call(panel.querySelectorAll('.stamp'), function (s) {
    s.addEventListener('click', function () { s.classList.remove('thunk'); void s.offsetWidth; s.classList.add('thunk'); });
  });

  /* ---------- switch panel ---------- */
  var sws = [].slice.call(panel.querySelectorAll('.sw'));
  var fact = panel.querySelector('.ovh__fact'), countEl = document.getElementById('sw-count');
  var motto = panel.querySelector('.motto'), master = document.getElementById('sw-master');
  function update(last) {
    var on = sws.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).length;
    countEl.textContent = on;
    if (last) { fact.textContent = last; fact.classList.remove('flash-in'); void fact.offsetWidth; fact.classList.add('flash-in'); }
    var all = on === sws.length;
    if (all && motto.hidden) { motto.hidden = false; panel.querySelector('.ovh').classList.add('is-all'); }
    if (!all) { motto.hidden = true; panel.querySelector('.ovh').classList.remove('is-all'); }
    if (on === 0) fact.textContent = 'All switches are off. Flip one.';
    master.textContent = all ? 'Master switch: all off' : 'Master switch: all on';
  }
  sws.forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      update(on ? b.textContent.trim() + ': ' + b.getAttribute('data-fact') : null);
    });
  });
  master.addEventListener('click', function () {
    var allOn = sws.every(function (b) { return b.getAttribute('aria-pressed') === 'true'; });
    sws.forEach(function (b, i) {
      setTimeout(function () { b.setAttribute('aria-pressed', allOn ? 'false' : 'true'); if (i === sws.length - 1) update(allOn ? null : 'Every system is on.'); }, reduce ? 0 : i * 55);
    });
  });

  /* ---------- hangar ---------- */
  var bays = [].slice.call(panel.querySelectorAll('.bay')), bay = 0;
  var bayDots = [].slice.call(panel.querySelectorAll('[data-bay-go]'));
  function goBay(i) {
    i = (i + bays.length) % bays.length;
    var dir = i > bay ? 1 : -1;
    bays.forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.style.setProperty('--dir', dir); });
    bayDots.forEach(function (d, k) { d.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    bay = i;
  }
  [].forEach.call(panel.querySelectorAll('[data-bay-step]'), function (b) { b.addEventListener('click', function () { goBay(bay + +b.getAttribute('data-bay-step')); }); });
  bayDots.forEach(function (d, k) { d.addEventListener('click', function () { goBay(k); }); });

  /* ---------- departures board (split-flap) ---------- */
  var CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  var flaps = [].slice.call(panel.querySelectorAll('.flap'));
  flaps.forEach(function (f) { f.textContent = f.getAttribute('data-t'); f.setAttribute('aria-label', f.getAttribute('data-t')); });
  function flip() {
    if (reduce) return;
    flaps.forEach(function (f, idx) {
      var target = f.getAttribute('data-t'), steps = 10 + (idx % 4) * 3, n = 0;
      var t = setInterval(function () {
        n++;
        var out = '';
        for (var i = 0; i < target.length; i++) {
          out += (n >= steps - (target.length - i) * 0.15 || target[i] === ' ') ? target[i] : CHARS[(Math.random() * CHARS.length) | 0];
        }
        f.textContent = out;
        if (n >= steps) { clearInterval(t); f.textContent = target; }
      }, 45);
    });
  }

  /* ---------- black box ---------- */
  var boxBtn = document.getElementById('box-open'), boxText = document.getElementById('box-text'), boxStatus = document.getElementById('box-status');
  var SECRET = 'I was once locked in a cage with a lion. True story. Ask me about it.';
  boxBtn.addEventListener('click', function () {
    boxBtn.disabled = true;
    panel.querySelector('.box').classList.add('is-open');
    boxStatus.textContent = 'DECRYPTING';
    var n = 0, glyphs = '#%&@$*+=?/<>';
    var t = setInterval(function () {
      n++;
      var shown = Math.floor(n / 26 * SECRET.length), out = SECRET.slice(0, shown);
      for (var i = shown; i < SECRET.length; i++) out += SECRET[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0];
      boxText.textContent = out;
      if (n >= 26) {
        clearInterval(t); boxText.textContent = SECRET; boxStatus.textContent = 'DECLASSIFIED';
        boxBtn.textContent = 'Recording played'; panel.querySelector('.classified').textContent = 'Declassified';
      }
    }, reduce ? 1 : 45);
  });

  /* replay the board flip and the doors when their view opens */
  panel.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pick]');
    if (!b) return;
    var id = b.getAttribute('data-pick');
    if (id === 'od-board') flip();
    if (id === 'od-hangar') { var h = panel.querySelector('.hangar'); h.classList.remove('is-opening'); void h.offsetWidth; h.classList.add('is-opening'); }
  });
  window.addEventListener('deck:tab', function (e) {
    if (document.querySelectorAll('[role="tabpanel"]')[e.detail.index] !== panel) return;
    var open = panel.querySelector('.card.is-on');
    if (open && open.id === 'od-board') flip();
  });
})();
