/* Flight deck: tabs, pickers, route strip, delay chart. No dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var tabs = [].slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  var ids = tabs.map(function (t) { return t.getAttribute('aria-controls'); });
  var panels = ids.map(function (id) { return document.getElementById(id); });
  var fixes = [].slice.call(document.querySelectorAll('.route__fix'));
  var line = document.querySelector('.route__line');
  var leg = document.getElementById('leg');
  var current = -1;
  var pill = document.querySelector('.tabs__pill');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function placePill() {
    if (!pill || current < 0) return;
    var a = tabs[current], st = pill.style;
    st.setProperty('--l', a.offsetLeft + 'px'); st.setProperty('--w', a.offsetWidth + 'px');
    st.setProperty('--t', a.offsetTop + 'px'); st.setProperty('--h', a.offsetHeight + 'px');
  }

  function countUp(scope) {
    [].forEach.call(scope.querySelectorAll('[data-count]'), function (n) {
      var end = +n.getAttribute('data-count'), dec = +(n.getAttribute('data-dec') || 0);
      if (reduce) { n.textContent = end.toFixed(dec); return; }
      var t0 = performance.now();
      (function tick(now) {
        var p = Math.min(1, (now - t0 - 350) / 1100); if (p < 0) p = 0;
        n.textContent = (end * (1 - Math.pow(1 - p, 3))).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* compass card for the hero instrument */
  (function () {
    var g = document.getElementById('ticks');
    if (!g) return;
    var NS = 'http://www.w3.org/2000/svg', names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    for (var d = 0; d < 360; d += 5) {
      var major = d % 30 === 0, l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', 0); l.setAttribute('x2', 0); l.setAttribute('y1', -236); l.setAttribute('y2', major ? -222 : -229);
      l.setAttribute('class', major ? 'tk tk--major' : 'tk'); l.setAttribute('transform', 'rotate(' + d + ')');
      g.appendChild(l);
      if (major) {
        var tx = document.createElementNS(NS, 'text');
        tx.setAttribute('y', -210); tx.setAttribute('transform', 'rotate(' + d + ')');
        if (names[d]) tx.setAttribute('class', 'card-pt');
        tx.textContent = names[d] || ('0' + d / 10).slice(-2);
        g.appendChild(tx);
      }
    }
  })();

  function placePlane() {
    if (!line || current < 0) return;
    var f = fixes[current], x;
    if (current === 0) x = 0;
    else if (current === fixes.length - 1) x = line.clientWidth;
    else x = f.offsetLeft + f.offsetWidth / 2;
    line.style.setProperty('--x', x + 'px');
  }

  function show(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= ids.length) i = 0;
    if (i === current) return;
    var prev = current;
    current = i;
    tabs.forEach(function (t, k) {
      t.setAttribute('aria-selected', k === i ? 'true' : 'false');
      t.tabIndex = k === i ? 0 : -1;
    });
    panels.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
    panels[i].setAttribute('data-dir', prev < 0 ? '0' : (i > prev ? '1' : '-1'));
    fixes.forEach(function (f, k) {
      f.classList.toggle('is-on', k === i);
      f.classList.toggle('is-passed', k <= i);
    });
    if (leg) leg.textContent = 'LEG ' + (i + 1) + ' OF ' + ids.length + ' · ' + tabs[i].lastChild.textContent.toUpperCase();
    placePlane(); placePill();
    if (ids[i] === 'overview') countUp(panels[i]);
    try { window.dispatchEvent(new CustomEvent('deck:tab', { detail: { index: i, dir: i > prev ? 1 : -1, first: prev < 0 } })); } catch (e) {}
    if (opts.hash !== false) {
      try { history.replaceState(null, '', '#' + ids[i]); } catch (e) { location.hash = ids[i]; }
    }
    if (opts.focusTab) tabs[i].focus();
    if (opts.scroll !== false) window.scrollTo(0, 0);
    var active = tabs[i];
    if (active.scrollIntoView && active.parentNode.scrollWidth > active.parentNode.clientWidth) {
      active.parentNode.scrollLeft = active.offsetLeft - 16;
    }
  }

  function fromHash() {
    var i = ids.indexOf(location.hash.replace('#', ''));
    show(i < 0 ? 0 : i, { hash: false });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function (e) { e.preventDefault(); show(i); });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute('data-go'), a.getAttribute('data-pick-go'));
  });

  /* open a tab, and optionally a specific item in its list */
  function go(tab, pick) {
    var i = ids.indexOf(tab);
    if (i < 0) return;
    show(i);
    if (pick) {
      var b = panels[i].querySelector('[data-pick="' + pick + '"]');
      if (b) { b.click(); b.focus({ preventScroll: true }); return; }
      var t = document.getElementById(pick);
      if (t && panels[i].contains(t)) {
        t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
        if (t.scrollIntoView) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
    panels[current].focus({ preventScroll: true });
  }
  window.deckGo = go;

  /* two-finger sideways swipe on a trackpad: the page follows the fingers,
     then slides to the next page once the swipe passes a short distance */
  var acc = 0, lastWheel = 0, lastAbs = 0, locked = false, endT = 0, dragged = null;
  function scrollsSideways(el) {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 2) {
        var ox = getComputedStyle(el).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
    }
    return false;
  }
  function follow(px) {
    var p = panels[current];
    if (dragged !== p) { release(true); dragged = p; p.style.transition = 'none'; p.style.animation = 'none'; }
    p.style.transform = 'translateX(' + px + 'px)';
    p.style.opacity = String(1 - Math.min(Math.abs(px) / 260, 0.35));
  }
  function release(instant) {
    if (!dragged) return;
    var p = dragged; dragged = null;
    p.style.transition = instant ? 'none' : 'transform .35s cubic-bezier(.2,.9,.3,1.2), opacity .35s';
    p.style.transform = ''; p.style.opacity = '';
    setTimeout(function () { p.style.transition = ''; p.style.animation = ''; }, instant ? 0 : 360);
  }
  /* One page per swipe. After a page change, all sideways scrolling is ignored
     until the trackpad has been completely still for a moment (this swallows the
     coasting that follows a flick, however long it lasts), and never sooner than
     0.8 s after the change. */
  var QUIET = 260, MIN_GAP = 800, lastSwitch = -1e9;
  window.addEventListener('wheel', function (e) {
    var now = performance.now(), gap = now - lastWheel;
    var dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
    if (Math.abs(dx) <= Math.abs(e.deltaY) * 1.1) return;
    if (scrollsSideways(e.target)) return;
    e.preventDefault();
    lastWheel = now;
    if (locked) {
      if (gap > QUIET && now - lastSwitch > MIN_GAP) { locked = false; acc = 0; }
      else return;
    }
    if (gap > QUIET) acc = 0;
    clearTimeout(endT);
    endT = setTimeout(function () { acc = 0; release(false); }, 160);
    acc += dx;
    var next = current + (acc > 0 ? 1 : -1), atEdge = next < 0 || next >= ids.length;
    follow(Math.max(-90, Math.min(90, atEdge ? -acc * 0.15 : -acc * 0.55)));
    if (!atEdge && Math.abs(acc) > 50) {
      locked = true; acc = 0; lastSwitch = now;
      release(true);
      show(next);
    }
  }, { passive: false });

  /* horizontal swipe on touch screens */
  var t0 = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1 || scrollsSideways(e.target) || e.target.closest('.pose__fig, input')) { t0 = null; return; }
    t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!t0) return;
    var p = e.changedTouches[0], dx = p.clientX - t0.x, dy = p.clientY - t0.y, dt = performance.now() - t0.t;
    t0 = null;
    if (dt > 600 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    var next = current + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < ids.length) show(next);
  }, { passive: true });
  window.addEventListener('hashchange', fromHash);
  window.addEventListener('resize', function () { placePlane(); placePill(); });
  document.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.card');
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var el = e.target, tag = el.tagName;
    var onTab = el.getAttribute && el.getAttribute('role') === 'tab';
    if (!onTab && (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON')) return;
    var n = ids.length;
    if (e.key === 'ArrowRight') { show((current + 1) % n, { focusTab: onTab }); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { show((current - 1 + n) % n, { focusTab: onTab }); e.preventDefault(); }
    else if (onTab && e.key === 'Home') { show(0, { focusTab: true }); e.preventDefault(); }
    else if (onTab && e.key === 'End') { show(n - 1, { focusTab: true }); e.preventDefault(); }
    else if (/^[1-9]$/.test(e.key) && +e.key <= ids.length) { show(+e.key - 1, { focusTab: onTab }); }
  });

  /* master / detail pickers */
  [].forEach.call(document.querySelectorAll('[data-picker]'), function (group) {
    var btns = [].slice.call(group.querySelectorAll('[data-pick]'));
    function pick(k) {
      btns.forEach(function (b, j) {
        b.setAttribute('aria-pressed', j === k ? 'true' : 'false');
        document.getElementById(b.getAttribute('data-pick')).classList.toggle('is-on', j === k);
      });
    }
    btns.forEach(function (b, k) {
      b.setAttribute('aria-controls', b.getAttribute('data-pick'));
      b.addEventListener('click', function () { pick(k); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var j = (k + d + btns.length) % btns.length;
        pick(j); btns[j].focus();
      });
    });
    pick(0);
  });

  /* copy email */
  var copy = document.getElementById('copy'), addr = document.getElementById('email');
  if (copy && addr) copy.addEventListener('click', function () {
    function done(ok) {
      copy.textContent = ok ? 'Copied' : 'Select and copy';
      setTimeout(function () { copy.textContent = 'Copy'; }, 2000);
    }
    function select() {
      var r = document.createRange(); r.selectNodeContents(addr);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    try {
      navigator.clipboard.writeText(addr.textContent).then(function () { done(true); }, function () { select(); done(false); });
    } catch (e) { select(); done(false); }
  });

  /* light / dark switch, remembered in this browser */
  var modeBtn = document.getElementById('mode');
  function syncMode() {
    var light = root.getAttribute('data-mode') === 'light';
    if (modeBtn) { modeBtn.setAttribute('aria-pressed', light ? 'true' : 'false'); modeBtn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode'); }
  }
  if (modeBtn) modeBtn.addEventListener('click', function () {
    var light = root.getAttribute('data-mode') !== 'light';
    root.classList.add('theming');
    if (light) root.setAttribute('data-mode', 'light'); else root.removeAttribute('data-mode');
    try { localStorage.setItem('fd-mode', light ? 'light' : 'dark'); } catch (e) {}
    syncMode();
    try { window.dispatchEvent(new CustomEvent('deck:theme')); } catch (e) {}
    setTimeout(function () { root.classList.remove('theming'); }, 450);
  });
  syncMode();

  fromHash();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placePlane(); placePill(); });

  /* ---------- delay chart ---------- */
  var svg = document.getElementById('chart');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var W = 560, H = 230, L = 38, R = 10, T = 10, B = 26;
  var apt = document.getElementById('apt'), hour = document.getElementById('hour');
  var readout = document.getElementById('readout'), stats = document.getElementById('stats');
  var data = null, series = null, yMax = 0.6;

  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function x(h) { return L + (h - 5) / 18 * (W - L - R); }
  function y(v) { return T + (1 - v / yMax) * (H - T - B); }
  function pct(v, d) { return (v * 100).toFixed(d == null ? 1 : d) + '%'; }
  function hh(h) { return (h < 10 ? '0' : '') + h + ':00'; }

  function draw() {
    series = apt.value === 'all' ? data.all : data.airports[apt.value];
    var top = Math.max.apply(null, series.map(function (p) { return Math.max(p.pred, p.obs); }));
    yMax = Math.max(0.5, Math.ceil(top * 10 + 0.5) / 10);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var defs = el('defs', {}), lg = el('linearGradient', { id: 'area', x1: 0, y1: 0, x2: 0, y2: 1 });
    lg.appendChild(el('stop', { offset: 0, 'stop-color': '#F2B33D', 'stop-opacity': 0.30 }));
    lg.appendChild(el('stop', { offset: 1, 'stop-color': '#F2B33D', 'stop-opacity': 0 }));
    defs.appendChild(lg); svg.appendChild(defs);
    for (var v = 0; v <= yMax + 1e-9; v += 0.1) {
      svg.appendChild(el('line', { class: 'grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }));
      svg.appendChild(el('text', { x: L - 6, y: y(v) + 3, 'text-anchor': 'end' }, Math.round(v * 100) + '%'));
    }
    for (var h = 5; h <= 23; h += 3) svg.appendChild(el('text', { x: x(h), y: H - 8, 'text-anchor': 'middle' }, hh(h)));
    svg.appendChild(el('line', { class: 'cursor', id: 'cur', y1: T, y2: H - B }));
    var d = series.map(function (p, i) { return (i ? 'L' : 'M') + x(p.h).toFixed(1) + ' ' + y(p.pred).toFixed(1); }).join('');
    svg.appendChild(el('path', { class: 'area', fill: 'url(#area)', d: d + 'L' + x(series[series.length - 1].h).toFixed(1) + ' ' + y(0) + 'L' + x(series[0].h).toFixed(1) + ' ' + y(0) + 'Z' }));
    svg.appendChild(el('path', { class: 'pred', pathLength: 1, d: d }));
    series.forEach(function (p, i) { svg.appendChild(el('circle', { class: 'obs', cx: x(p.h), cy: y(p.obs), r: 3, style: '--i:' + i })); });
    svg.appendChild(el('circle', { class: 'dot', id: 'dot', r: 5.5 }));
    mark();
  }
  function mark() {
    var h = +hour.value, p = null;
    series.forEach(function (q) { if (q.h === h) p = q; });
    var cur = svg.querySelector('#cur'), dot = svg.querySelector('#dot');
    if (!p) { readout.textContent = 'No flights in the test months at ' + hh(h) + '.'; cur.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); return; }
    cur.setAttribute('visibility', 'visible'); dot.setAttribute('visibility', 'visible');
    cur.setAttribute('x1', x(h)); cur.setAttribute('x2', x(h));
    dot.setAttribute('cx', x(h)); dot.setAttribute('cy', y(p.pred));
    readout.textContent = hh(h) + ' departures: ' + pct(p.pred) + ' predicted late, ' + pct(p.obs) + ' observed, across ' + p.n.toLocaleString('en-US') + ' flights.';
  }
  function stat(dd, small, dt) {
    var d = document.createElement('div');
    var a = document.createElement('dt'); a.textContent = dt;
    var b = document.createElement('dd'); b.textContent = dd;
    if (small) { var s = document.createElement('small'); s.textContent = small; b.appendChild(s); }
    d.appendChild(b); d.appendChild(a); stats.appendChild(d);
  }

  fetch('data/delay.json').then(function (r) { return r.json(); }).then(function (d) {
    data = d;
    Object.keys(d.airports).forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = k; apt.appendChild(o);
    });
    stat(d.flights_test.toLocaleString('en-US'), null, 'test flights the model had never seen');
    stat(d.auc.toFixed(3), 'logistic baseline ' + d.auc_logistic.toFixed(3), 'AUC, ranking late above on-time');
    stat(pct(d.top_decile.delay_rate_flagged), 'against ' + pct(d.top_decile.delay_rate_others) + ' for the rest', 'of its riskiest tenth left late');
    stat(pct(d.observed_rate_test), null, 'of test flights were late. The model runs a few points low: this summer was busier than the training year.');
    apt.addEventListener('change', draw);
    hour.addEventListener('input', mark);
    svg.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect();
      var h = Math.round(5 + ((e.clientX - r.left) / r.width * W - L) / (W - L - R) * 18);
      hour.value = Math.max(5, Math.min(23, h)); mark();
    });
    draw();
  }).catch(function () {
    readout.textContent = 'The chart data could not be loaded.';
  });
})();
