/* Off Duty tab: climate flight path, switch panel, pre-flight quiz, black box. */
(function () {
  'use strict';
  var panel = document.getElementById('offduty');
  if (!panel) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(sel) { return panel.querySelector(sel); }

  /* ---------- flight path: rain, heat, snow ---------- */
  var scene = $('.scene'), wx = $('.wx');
  var kicker = $('.scene__kicker'), city = $('.scene__city'), line = $('.scene__line'), thermoV = $('.thermo__v');
  var stopBtns = [].slice.call(panel.querySelectorAll('.stop'));
  var STOPS = [
    { kind: 'rain', kicker: 'Rain · born here', city: 'Bengaluru, India', line: 'Where it all started. Monsoon skies and green everywhere.', temp: '24 °C', lvl: 0.45 },
    { kind: 'heat', kicker: 'Heat · 2006 to 2016', city: 'Dubai, UAE', line: 'Grades 1 to 10 under a desert sun. My first flight: Emirates, to Dubai.', temp: '40 °C+', lvl: 0.95 },
    { kind: 'snow', kicker: 'Snow · 2023 to now', city: 'Nova Scotia, Canada', line: 'From 40 °C to below −15 °C. Snowboarding is next on the list.', temp: '−15 °C', lvl: 0.08 }
  ];
  var cur = -1, playT = [];

  function particles(kind) {
    while (wx.firstChild) wx.removeChild(wx.firstChild);
    if (reduce) return;
    var n = kind === 'rain' ? 70 : kind === 'snow' ? 55 : 9;
    for (var i = 0; i < n; i++) {
      var d = document.createElement('i');
      d.style.left = (Math.random() * 104 - 2).toFixed(1) + '%';
      d.style.animationDelay = (-Math.random() * 4).toFixed(2) + 's';
      if (kind === 'rain') d.style.animationDuration = (0.45 + Math.random() * 0.35).toFixed(2) + 's';
      if (kind === 'snow') { d.style.animationDuration = (4 + Math.random() * 4).toFixed(2) + 's'; d.style.setProperty('--s', (2 + Math.random() * 4).toFixed(1) + 'px'); d.style.setProperty('--x', (Math.random() * 40 - 20).toFixed(0) + 'px'); }
      if (kind === 'heat') { d.style.left = (i * 11 + Math.random() * 6).toFixed(1) + '%'; d.style.animationDuration = (3 + Math.random() * 2).toFixed(2) + 's'; }
      wx.appendChild(d);
    }
    wx.className = 'wx wx--' + kind;
  }
  function go(i, fromPlay) {
    if (i === cur) return;
    if (!fromPlay) { playT.forEach(clearTimeout); playT = []; }
    var prev = cur; cur = i;
    var s = STOPS[i];
    stopBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    scene.setAttribute('data-stop', i);
    scene.style.setProperty('--lvl', s.lvl);
    /* a plane crosses the scene on every change of home */
    if (prev >= 0 && !reduce) {
      scene.classList.remove('is-flying', 'fly-back'); void scene.offsetWidth;
      scene.classList.add('is-flying'); if (i < prev) scene.classList.add('fly-back');
    }
    var hud = $('.scene__hud');
    hud.classList.remove('is-in'); void hud.offsetWidth;
    kicker.textContent = s.kicker; city.textContent = s.city; line.textContent = s.line; thermoV.textContent = s.temp;
    hud.classList.add('is-in');
    particles(s.kind);
  }
  stopBtns.forEach(function (b, k) { b.addEventListener('click', function () { go(k); }); });
  document.getElementById('scene-play').addEventListener('click', function () {
    playT.forEach(clearTimeout); playT = [];
    cur = -1; go(0, true);
    playT.push(setTimeout(function () { go(1, true); }, 2600));
    playT.push(setTimeout(function () { go(2, true); }, 5200));
  });
  go(0);

  /* ---------- switch panel ---------- */
  var sws = [].slice.call(panel.querySelectorAll('.sw'));
  var fact = $('.ovh__fact'), countEl = document.getElementById('sw-count');
  var motto = $('.motto'), master = document.getElementById('sw-master');
  document.getElementById('sw-total').textContent = sws.length;
  function update(last) {
    var on = sws.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).length;
    countEl.textContent = on;
    if (last) { fact.textContent = last; fact.classList.remove('flash-in'); void fact.offsetWidth; fact.classList.add('flash-in'); }
    var all = on === sws.length;
    motto.hidden = !all;
    $('.ovh').classList.toggle('is-all', all);
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

  /* ---------- pre-flight quiz ---------- */
  var Q = [
    ['Where did I go to school from grade 1 to grade 10?', ['Bengaluru', 'Dubai', 'Nova Scotia'], 1, 'Dubai, from 2006 to 2016.'],
    ['Which aircraft is my favourite?', ['Airbus A380', 'Boeing 777', 'Concorde'], 1, 'The Boeing 777.'],
    ['How many hours have I logged on Flight Simulator X?', ['25', '250', '2,500'], 1, '250 hours, and counting.'],
    ['What do I cook best?', ['Pasta', 'Biryani', 'Tacos'], 0, 'Pasta.'],
    ['Which F1 driver do I back?', ['Lewis Hamilton', 'Charles Leclerc', 'Max Verstappen'], 2, 'Max Verstappen, Red Bull Racing.'],
    ['Which ship would I captain?', ['Titanic', 'The Black Pearl', 'Queen Mary 2'], 1, 'The Black Pearl.']
  ];
  var qi = 0, score = 0;
  var qn = document.getElementById('quiz-n'), qt = document.getElementById('quiz-text'), qo = document.getElementById('quiz-opts');
  var qf = document.getElementById('quiz-fb'), bar = document.getElementById('quiz-bar'), pass = document.getElementById('quiz-pass'), qbox = $('.quiz__q');
  function ask() {
    var q = Q[qi];
    qn.textContent = 'Question ' + (qi + 1) + ' of ' + Q.length;
    qt.textContent = q[0];
    qf.textContent = ''; qf.className = 'quiz__fb';
    bar.style.width = (qi / Q.length * 100) + '%';
    while (qo.firstChild) qo.removeChild(qo.firstChild);
    q[1].forEach(function (opt, k) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'quiz__opt'; b.textContent = opt;
      b.addEventListener('click', function () { answer(k, b); });
      qo.appendChild(b);
    });
    qbox.classList.remove('is-in'); void qbox.offsetWidth; qbox.classList.add('is-in');
  }
  function answer(k, b) {
    var q = Q[qi], right = k === q[2];
    [].forEach.call(qo.children, function (o, j) { o.disabled = true; if (j === q[2]) o.classList.add('is-right'); });
    if (!right) b.classList.add('is-wrong'); else score++;
    qf.textContent = (right ? 'Correct. ' : 'Not quite. ') + q[3];
    qf.className = 'quiz__fb ' + (right ? 'is-right' : 'is-wrong');
    setTimeout(function () { qi++; if (qi < Q.length) ask(); else finish(); }, reduce ? 600 : 1500);
  }
  function finish() {
    bar.style.width = '100%';
    qbox.hidden = true; pass.hidden = false;
    var cls = score === Q.length ? 'First' : score >= 4 ? 'Business' : score >= 2 ? 'Economy' : 'Standby';
    document.getElementById('pass-score').textContent = score + ' / ' + Q.length;
    document.getElementById('pass-class').textContent = cls;
    document.getElementById('pass-msg').textContent = score === Q.length ? 'Perfect. You clearly read the whole site.' : score >= 4 ? 'Nearly perfect. Come say hi.' : 'Plenty more to learn. Ask me in person.';
    var st = document.getElementById('pass-stamp');
    st.textContent = cls === 'Standby' ? 'STANDBY' : 'CLEARED';
    st.classList.remove('thunk'); void st.offsetWidth; st.classList.add('thunk');
    pass.classList.remove('is-in'); void pass.offsetWidth; pass.classList.add('is-in');
  }
  document.getElementById('quiz-again').addEventListener('click', function () { qi = 0; score = 0; pass.hidden = true; qbox.hidden = false; ask(); });
  ask();

  /* ---------- black box ---------- */
  var boxBtn = document.getElementById('box-open'), boxText = document.getElementById('box-text'), boxStatus = document.getElementById('box-status');
  var SECRET = 'I was once locked in a cage with a lion. True story. Ask me about it.';
  boxBtn.addEventListener('click', function () {
    boxBtn.disabled = true;
    $('.box').classList.add('is-open');
    boxStatus.textContent = 'DECRYPTING';
    var n = 0, glyphs = '#%&@$*+=?/<>';
    var t = setInterval(function () {
      n++;
      var shown = Math.floor(n / 26 * SECRET.length), out = SECRET.slice(0, shown);
      for (var i = shown; i < SECRET.length; i++) out += SECRET[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0];
      boxText.textContent = out;
      if (n >= 26) {
        clearInterval(t); boxText.textContent = SECRET; boxStatus.textContent = 'DECLASSIFIED';
        boxBtn.textContent = 'Recording played'; $('.classified').textContent = 'Declassified';
      }
    }, reduce ? 1 : 45);
  });
})();
