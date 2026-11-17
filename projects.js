/* Project dashboards. Every number comes from data/projects.json, which was
   extracted from the project repositories (results files, notebook outputs,
   reports) or recomputed from the repository's own dataset. */
(function () {
  'use strict';
  var D = null;

  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function pct(v, d) { return (v * 100).toFixed(d == null ? 1 : d) + '%'; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  /* horizontal bar list with an optional reference line */
  function bars(out, rows, opts) {
    clear(out);
    var lo = opts.lo, hi = opts.hi;
    function x(v) { return Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); }
    rows.forEach(function (r, i) {
      var row = h('div', 'hbar' + (r.hi ? ' hbar--hi' : '') + (r.alt ? ' hbar--alt' : ''));
      row.style.setProperty('--i', i);
      row.appendChild(h('span', 'bar__label', r.label));
      var track = h('span', 'bar__track');
      var fill = h('span', 'bar__fill');
      track.appendChild(fill);
      if (opts.ref != null) {
        var ref = h('span', 'bar__ref'); ref.style.left = x(opts.ref) + '%'; track.appendChild(ref);
      }
      row.appendChild(track);
      row.appendChild(h('span', 'bar__val', opts.fmt(r.v)));
      out.appendChild(row);
      requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.width = x(r.v) + '%'; }); });
    });
  }

  function wire(card, state, render) {
    [].forEach.call(card.querySelectorAll('[data-k]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k');
        state[k] = b.getAttribute('data-v');
        [].forEach.call(card.querySelectorAll('[data-k="' + k + '"]'), function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        render();
      });
    });
    render();
  }

  var dash = {
    startup: function (card) {
      var S = D.startup, st = { ds: 'infl', met: 'acc' };
      var out = card.querySelector('[data-out]'), cap = card.querySelector('[data-cap]');
      wire(card, st, function () {
        var vals = S[st.met][st.ds];
        var rows = S.models.map(function (m) { return { label: S.names[m], v: vals[m] }; })
          .sort(function (a, b) { return b.v - a.v; });
        rows[0].hi = true;
        var acc = st.met === 'acc', base = acc ? S.baseline[st.ds] : 0.5;
        bars(out, rows, { lo: acc ? 0.55 : 0.45, hi: acc ? 0.75 : 0.8, ref: base, fmt: function (v) { return pct(v); } });
        cap.textContent = 'Best holdout ' + (acc ? 'accuracy' : 'AUROC') + ' per model, ' +
          (st.ds === 'infl' ? 'with' : 'without') + ' the global inflation data. The line marks ' +
          (acc ? 'always guessing the majority class (' + pct(base) + ').' : 'chance (50%).');
      });
    },

    fifa: function (card) {
      var F = D.fifa, st = { task: 'age' };
      var out = card.querySelector('[data-out]'), cap = card.querySelector('[data-cap]');
      var models = [['lr', 'Logistic regression'], ['gb', 'Gradient boosting'], ['xgb', 'XGBoost']];
      wire(card, st, function () {
        var T = F.tasks[st.task];
        clear(out);
        var key = h('div', 'grouped__key');
        models.forEach(function (m) { key.appendChild(h('span', 'k k--' + m[0], m[1])); });
        out.appendChild(key);
        T.bands.forEach(function (band, i) {
          var g = h('div', 'grouped__row');
          g.appendChild(h('span', 'grouped__label', band));
          var cols = h('div', 'grouped__cols');
          models.forEach(function (m, j) {
            var v = T[m[0]][i], b = h('span', 'gbar gbar--' + m[0]);
            b.title = m[1] + ': ' + pct(v, 0);
            b.style.setProperty('--d', (i * 3 + j) * 40 + 'ms');
            var f = h('i'); b.appendChild(f); b.appendChild(h('b', null, pct(v, 0)));
            cols.appendChild(b);
            requestAnimationFrame(function () { requestAnimationFrame(function () { f.style.width = v * 100 + '%'; }); });
          });
          g.appendChild(cols); out.appendChild(g);
        });
        cap.textContent = 'Test accuracy for each ' + T.label.toLowerCase() + ', one model per band against the rest (252 test players), from the project notebook.';
      });
    },

    ocular: function (card) {
      var O = D.ocular, st = { cmp: 'ours' };
      var out = card.querySelector('[data-out]'), cap = card.querySelector('[data-cap]');
      wire(card, st, function () {
        var rows = O.ours.map(function (r, i) { return { label: r[0], v: r[1], hi: i === 0 }; });
        if (st.cmp === 'both') rows = rows.concat(O.paper.map(function (r) { return { label: r[0] + ' (paper)', v: r[1], alt: true }; }));
        rows.sort(function (a, b) { return b.v - a.v; });
        bars(out, rows, { lo: 30, hi: 80, fmt: function (v) { return v.toFixed(1) + '%'; } });
        cap.textContent = st.cmp === 'both'
          ? 'Grey bars: "A Benchmark of Ocular Disease Intelligent Recognition: One Shot for Multi-disease Detection", same dataset, as cited in the project report.'
          : 'Accuracy of each approach, from the project\'s final report.';
      });
    },

    movies: function (card) {
      var M = D.movies, st = { m: 'pearson' };
      var out = card.querySelector('[data-out]'), cap = card.querySelector('[data-cap]');
      var names = { year: 'Year', score: 'Score', votes: 'Votes', budget: 'Budget', gross: 'Gross', runtime: 'Runtime' };
      wire(card, st, function () {
        var mat = M[st.m], n = M.cols.length;
        clear(out);
        out.style.setProperty('--n', n);
        out.appendChild(h('span', 'heat__corner'));
        M.cols.forEach(function (c) { out.appendChild(h('span', 'heat__col', names[c])); });
        var best = { v: -2 };
        M.cols.forEach(function (r, i) {
          out.appendChild(h('span', 'heat__row', names[r]));
          M.cols.forEach(function (c, j) {
            var v = mat[i][j], cell = h('span', 'heat__cell');
            var a = Math.abs(v);
            cell.style.setProperty('--a', i === j ? 0.06 : (0.08 + a * 0.92).toFixed(3));
            cell.classList.add(v < 0 ? 'neg' : 'pos');
            if (i === j) cell.classList.add('diag');
            cell.style.setProperty('--d', (i + j) * 30 + 'ms');
            cell.textContent = i === j ? '' : v.toFixed(2);
            cell.title = names[r] + ' and ' + names[c] + ': ' + v.toFixed(3);
            cell.tabIndex = i === j ? -1 : 0;
            cell.setAttribute('aria-label', cell.title);
            if (i < j && v > best.v) best = { v: v, a: names[r], b: names[c] };
            out.appendChild(cell);
          });
        });
        cap.textContent = st.m.charAt(0).toUpperCase() + st.m.slice(1) + ' correlation across ' + M.n.toLocaleString('en-US') +
          ' films. Strongest pair: ' + best.a + ' and ' + best.b + ' (' + best.v.toFixed(2) + '). Recomputed from the project\'s movies.csv.';
      });
    },

    pose: function (card) { pose(card); }
  };

  /* ---------- pose demo: angle maths and rules from the project's yogadet.js ---------- */
  function angle(a, b, c) {
    var r = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0]);
    var d = Math.abs(r * 180 / Math.PI);
    if (d > 180) d = 360 - d;
    return Math.round(d);
  }
  function inr(v, lo, hi) { return v > lo && v < hi; }
  function classify(A) {
    var hits = [];
    if ((inr(A.lHKA, 25, 40) || inr(A.rHKA, 25, 40)) && (inr(A.lHKA, 170, 185) || inr(A.rHKA, 170, 185))) hits.push('Tree Pose');
    if (inr(A.lSEW, 165, 195) && inr(A.rSEW, 165, 195) && inr(A.lESH, 80, 110) && inr(A.rESH, 80, 110)) {
      if ((inr(A.lHKA, 165, 195) || inr(A.rHKA, 165, 195)) && (inr(A.lHKA, 80, 120) || inr(A.rHKA, 80, 120))) hits.push('Warrior II Pose');
      if (inr(A.lHKA, 160, 195) && inr(A.rHKA, 160, 195) && inr(A.rSHK, 160, 195) && inr(A.lSHK, 160, 195)) hits.push('T Pose');
    }
    return hits;
  }
  var PRESETS = {
    t:       { lw: [36, 92],  le: [84, 92],  rw: [264, 92], re: [216, 92], lk: [138, 206], la: [136, 262], rk: [162, 206], ra: [164, 262] },
    warrior: { lw: [36, 92],  le: [84, 92],  rw: [264, 92], re: [216, 92], lk: [104, 200], la: [72, 250],  rk: [214, 170], ra: [214, 250] },
    tree:    { lw: [146, 16], le: [112, 52], rw: [154, 16], re: [188, 52], lk: [140, 206], la: [140, 262], rk: [206, 186], ra: [146, 182] }
  };
  var FIXED = { nose: [150, 50], sc: [150, 92], ls: [124, 92], rs: [176, 92], lh: [138, 152], rh: [162, 152] };
  var BONES = [['nose', 'sc'], ['ls', 'rs'], ['ls', 'le'], ['le', 'lw'], ['rs', 're'], ['re', 'rw'], ['ls', 'lh'], ['rs', 'rh'], ['lh', 'rh'], ['lh', 'lk'], ['lk', 'la'], ['rh', 'rk'], ['rk', 'ra']];
  var NS = 'http://www.w3.org/2000/svg';

  function pose(card) {
    var svg = card.querySelector('.pose__fig'), dl = card.querySelector('[data-angles]'), verdict = card.querySelector('[data-verdict]');
    var P = {}, k;
    for (k in FIXED) P[k] = FIXED[k].slice();
    function load(name) { var p = PRESETS[name]; for (var j in p) P[j] = p[j].slice(); }
    load('t');

    var ground = document.createElementNS(NS, 'path');
    ground.setAttribute('d', 'M20 268H280'); ground.setAttribute('class', 'pose__ground'); svg.appendChild(ground);
    var lines = BONES.map(function () { var l = document.createElementNS(NS, 'line'); l.setAttribute('class', 'pose__bone'); svg.appendChild(l); return l; });
    var head = document.createElementNS(NS, 'circle'); head.setAttribute('r', 17); head.setAttribute('class', 'pose__head'); svg.appendChild(head);
    var dots = {};
    Object.keys(P).forEach(function (j) {
      if (j === 'nose' || j === 'sc') return;
      var c = document.createElementNS(NS, 'circle');
      var drag = !(j in FIXED);
      c.setAttribute('r', drag ? 8 : 4.5);
      c.setAttribute('class', drag ? 'pose__joint pose__joint--drag' : 'pose__joint');
      if (drag) { c.setAttribute('tabindex', '0'); c.setAttribute('role', 'slider'); c.setAttribute('aria-label', 'Joint ' + j + ', use arrow keys to move'); }
      svg.appendChild(c); dots[j] = c;
    });

    var LABELS = [['lSEW', 'Left elbow'], ['rSEW', 'Right elbow'], ['lESH', 'Left shoulder'], ['rESH', 'Right shoulder'], ['lSHK', 'Left hip'], ['rSHK', 'Right hip'], ['lHKA', 'Left knee'], ['rHKA', 'Right knee']];
    var cells = {};
    LABELS.forEach(function (L) {
      var d = h('div'); d.appendChild(h('dt', null, L[1])); var v = h('dd'); d.appendChild(v); dl.appendChild(d); cells[L[0]] = v;
    });

    function draw() {
      BONES.forEach(function (b, i) {
        lines[i].setAttribute('x1', P[b[0]][0]); lines[i].setAttribute('y1', P[b[0]][1]);
        lines[i].setAttribute('x2', P[b[1]][0]); lines[i].setAttribute('y2', P[b[1]][1]);
      });
      head.setAttribute('cx', P.nose[0]); head.setAttribute('cy', P.nose[1]);
      for (var j in dots) { dots[j].setAttribute('cx', P[j][0]); dots[j].setAttribute('cy', P[j][1]); }
      var A = {
        lSEW: angle(P.ls, P.le, P.lw), rSEW: angle(P.rs, P.re, P.rw),
        lESH: angle(P.le, P.ls, P.lh), rESH: angle(P.re, P.rs, P.rh),
        lSHK: angle(P.ls, P.lh, P.lk), rSHK: angle(P.rs, P.rh, P.rk),
        lHKA: angle(P.lh, P.lk, P.la), rHKA: angle(P.rh, P.rk, P.ra)
      };
      for (var a in cells) cells[a].textContent = A[a] + '°';
      var hits = classify(A);
      verdict.textContent = hits.length ? 'Detected: ' + hits.join(', ') + '.' : 'No pose detected.';
      verdict.classList.toggle('is-hit', hits.length > 0);
    }

    var active = null;
    function toLocal(e) {
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var m = svg.getScreenCTM().inverse(), q = pt.matrixTransform(m);
      return [Math.max(6, Math.min(294, q.x)), Math.max(6, Math.min(294, q.y))];
    }
    Object.keys(dots).forEach(function (j) {
      if (j in FIXED) return;
      var c = dots[j];
      c.addEventListener('pointerdown', function (e) { active = j; c.setPointerCapture(e.pointerId); e.preventDefault(); clearPreset(); });
      c.addEventListener('pointermove', function (e) { if (active !== j) return; P[j] = toLocal(e); draw(); });
      c.addEventListener('pointerup', function () { active = null; });
      c.addEventListener('keydown', function (e) {
        var d = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
        if (!d) return;
        e.preventDefault(); e.stopPropagation(); clearPreset();
        P[j] = [P[j][0] + d[0], P[j][1] + d[1]]; draw();
      });
    });
    var pres = [].slice.call(card.querySelectorAll('[data-preset]'));
    function clearPreset() { pres.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); }
    pres.forEach(function (b) {
      b.addEventListener('click', function () {
        load(b.getAttribute('data-preset'));
        pres.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        svg.classList.remove('is-moving'); void svg.offsetWidth; svg.classList.add('is-moving');
        draw();
      });
    });
    draw();
  }

  fetch('data/projects.json').then(function (r) { return r.json(); }).then(function (d) {
    D = d;
    [].forEach.call(document.querySelectorAll('[data-dash]'), function (card) {
      var f = dash[card.getAttribute('data-dash')];
      if (f) try { f(card); } catch (e) { if (window.console) console.error(e); }
    });
  }).catch(function () {
    [].forEach.call(document.querySelectorAll('[data-dash] [data-cap]'), function (c) { c.textContent = 'Chart data could not be loaded.'; });
  });

  /* ---------- rocket launch on the Skills tab ---------- */
  var panel = document.getElementById('skills'), relaunch = document.getElementById('relaunch');
  var count = panel && panel.querySelector('.launch__count'), timers = [];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function launch() {
    if (!panel || reduce) return;
    timers.forEach(clearTimeout); timers = [];
    panel.classList.remove('is-launching', 'is-lit');
    void panel.offsetWidth;
    panel.classList.add('is-counting');
    ['3', '2', '1', 'Liftoff'].forEach(function (t, i) {
      timers.push(setTimeout(function () { count.textContent = t; count.classList.remove('tick'); void count.offsetWidth; count.classList.add('tick'); }, i * 420));
    });
    timers.push(setTimeout(function () { panel.classList.add('is-launching'); }, 1260));
    timers.push(setTimeout(function () { panel.classList.add('is-lit'); }, 1700));
    timers.push(setTimeout(function () { panel.classList.remove('is-counting'); count.textContent = ''; }, 2300));
  }

  /* ---------- skills: "where I used this" ---------- */
  var PROOF = {
    'p-delay': ['Flight delay risk', 'Project', 'projects'],
    'p-startup': ['Start-up success prediction', 'Project', 'projects'],
    'p-fifa': ['FIFA dataset analysis', 'Project', 'projects'],
    'p-pose': ['Human pose estimation', 'Project', 'projects'],
    'p-ocular': ['Ocular disease recognition', 'Project', 'projects'],
    'p-movies': ['Movie dataset correlations', 'Project', 'projects'],
    'x-stfx': ['Systems Analyst, St Francis Xavier University', 'Experience', 'experience'],
    'x-vihang': ['Operations Analyst, Team Vihang', 'Experience', 'experience'],
    'x-arcis': ['Team Arcis website, finance and sponsorship', 'Experience', 'experience'],
    'x-vraio': ['Development Intern, Vraio Software Solutions', 'Experience', 'experience'],
    'x-ctire': ['Customer Support Representative, Canadian Tire', 'Experience', 'experience'],
    'x-career': ['Student Career Advisor, St Francis Xavier University', 'Experience', 'experience'],
    'x-driveu': ['Driver, DriveU', 'Experience', 'experience'],
    'x-xpatrol': ['Lead, X-Patrol', 'Experience', 'experience'],
    'x-pita': ['Crew Member, Pita Pit', 'Experience', 'experience'],
    'c-sql': ['The Ultimate MySQL Bootcamp', 'Certification', 'education'],
    'c-pbi': ['Microsoft Power BI Desktop for Business Intelligence', 'Certification', 'education'],
    'c-excel': ['Excel for Beginners', 'Certification', 'education'],
    'c-tf': ['Tensor Flow Developer Bootstrap', 'Certification', 'education'],
    'c-html': ['HTML and CSS to build and launch a website', 'Certification', 'education'],
    'c-py': ['Programming with Python', 'Certification', 'education'],
    'c-pyds': ['Python Data Structures', 'Certification', 'education'],
    'c-devops': ['Introduction to DevOps', 'Certification', 'education'],
    'e-bsc': ['BSc in Computer Science, Dayananda Sagar College of Engineering', 'Education', 'education'],
    'e-msc': ['Masters in Applied Computer Science, St Francis Xavier University', 'Education', 'education'],
    'self': ['Learned on my own, hands-on', 'Self-taught', null]
  };
  var CERT_OF = { 'c-sql': 1, 'c-pbi': 1, 'c-excel': 1, 'c-tf': 1, 'c-html': 1, 'c-py': 1, 'c-pyds': 1, 'c-devops': 1 };
  var tip = document.getElementById('proof');
  if (tip) {
    var tipH = tip.querySelector('.proof__h'), tipL = tip.querySelector('ul'), owner = null, hideT = 0;
    var hover = window.matchMedia('(hover: hover)').matches;
    [].forEach.call(document.querySelectorAll('[data-proof]'), function (chip) {
      chip.tabIndex = 0;
      chip.setAttribute('role', 'button');
      chip.setAttribute('aria-haspopup', 'true');
      chip.setAttribute('aria-expanded', 'false');
      chip.setAttribute('aria-describedby', 'proof');
      if (hover) {
        chip.addEventListener('mouseenter', function () { open(chip); });
        chip.addEventListener('mouseleave', later);
      }
      chip.addEventListener('focus', function () { open(chip); });
      chip.addEventListener('click', function () { if (owner === chip && !hover) close(); else open(chip); });
      chip.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowDown' || e.key === 'Enter') { var a = tipL.querySelector('button'); if (a) { e.preventDefault(); open(chip); a.focus(); } }
      });
    });
    tip.addEventListener('mouseenter', function () { clearTimeout(hideT); });
    tip.addEventListener('mouseleave', later);
    tip.addEventListener('focusout', function (e) { if (!tip.contains(e.relatedTarget) && e.relatedTarget !== owner) later(); });
    document.addEventListener('click', function (e) { if (owner && !tip.contains(e.target) && e.target !== owner) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && owner) { var o = owner; close(); o.focus(); } });
    window.addEventListener('deck:tab', close);

    function later() { clearTimeout(hideT); hideT = setTimeout(function () { if (!tip.contains(document.activeElement)) close(); }, 160); }
    function close() { clearTimeout(hideT); if (owner) owner.setAttribute('aria-expanded', 'false'); owner = null; tip.hidden = true; }
    function open(chip) {
      clearTimeout(hideT);
      if (owner === chip && !tip.hidden) return;
      if (owner) owner.setAttribute('aria-expanded', 'false');
      owner = chip; chip.setAttribute('aria-expanded', 'true');
      tipH.textContent = (chip.getAttribute('data-name') || chip.textContent) + ' · where it comes from';
      while (tipL.firstChild) tipL.removeChild(tipL.firstChild);
      chip.getAttribute('data-proof').split(/\s+/).forEach(function (key) {
        var p = PROOF[key]; if (!p) return;
        var li = h('li'), b = h(p[2] ? 'button' : 'div', p[2] ? null : 'proof__static');
        if (p[2]) b.type = 'button';
        b.appendChild(h('span', 'proof__kind', p[1]));
        b.appendChild(h('span', 'proof__name', p[0]));
        if (p[2]) b.addEventListener('click', function () {
          close();
          if (window.deckGo) window.deckGo(p[2], CERT_OF[key] ? 'e-certs' : key);
        });
        li.appendChild(b); tipL.appendChild(li);
      });
      tip.hidden = false;
      var host = panel.getBoundingClientRect(), r = chip.getBoundingClientRect();
      var w = tip.offsetWidth, ht = tip.offsetHeight;
      var left = Math.max(8, Math.min(r.left - host.left + r.width / 2 - w / 2, host.width - w - 8));
      var top = r.bottom - host.top + 8;
      if (r.bottom + ht + 12 > window.innerHeight - 70) top = r.top - host.top - ht - 8;
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
      tip.style.setProperty('--ax', (r.left - host.left + r.width / 2 - left) + 'px');
      tip.classList.toggle('is-above', top < r.top - host.top);
    }
  }
  window.addEventListener('deck:tab', function (e) { if (e.detail.index === 3) launch(); });
  if (relaunch) relaunch.addEventListener('click', launch);
})();
