/* Live sky backdrop: stars, a low sun behind a cloud sea, three drifting cloud layers.
   Surges forward when the section changes; the horizon colour shifts per section. */
(function () {
  'use strict';
  var cv = document.getElementById('sky');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var THEMES = {
    dark: {
      glow: [[244, 164, 76], [238, 120, 92], [70, 178, 214], [152, 128, 238], [96, 152, 242], [236, 112, 150], [248, 192, 86]],
      alpha: [0.55, 0.50, 0.62], cloudTop: 'rgb(176,196,232)', cloudBot: 'rgb(34,50,86)',
      top: '#050914', mid: '#0B1630', bot: '#0A1222', horizon: function (g) { return [20 + g[0] * 0.16, 36 + g[1] * 0.14, 70 + g[2] * 0.12]; },
      stars: true, sun: [0.72, 0.30, 0.08], core: 'rgba(255,246,226,0.95)', coreMid: null, spill: 0.5, screen: true,
      vig: [[0, 'rgba(5,9,20,0.55)'], [0.2, 'rgba(5,9,20,0)'], [0.82, 'rgba(8,13,26,0)'], [1, 'rgba(8,13,26,0.78)']],
      side: ['rgba(6,11,22,0.66)', 'rgba(6,11,22,0)']
    },
    light: {
      glow: [[255, 206, 130], [255, 176, 150], [150, 226, 236], [206, 190, 252], [170, 204, 255], [255, 180, 200], [255, 220, 130]],
      alpha: [0.92, 0.88, 0.96], cloudTop: 'rgb(255,255,255)', cloudBot: 'rgb(170,194,230)',
      top: '#6FA9EA', mid: '#ACD0F6', bot: '#EAF2FB', horizon: function (g) { return [128 + g[0] * 0.5, 128 + g[1] * 0.5, 128 + g[2] * 0.5]; },
      stars: false, sun: [0.95, 0.55, 0.16], core: 'rgba(255,255,255,1)', coreMid: 'rgba(255,250,232,0.85)', spill: 0.38, screen: false,
      vig: [[0, 'rgba(234,242,251,0)'], [0.84, 'rgba(234,242,251,0)'], [1, 'rgba(234,242,251,0.75)']],
      side: ['rgba(240,246,253,0.55)', 'rgba(240,246,253,0)']
    }
  };
  function mode() { return document.documentElement.getAttribute('data-mode') === 'light' ? 'light' : 'dark'; }
  var T = THEMES[mode()], GLOW = T.glow, tabIndex = 0;
  var LAYERS = [
    { y: 0.800, s: 0.36, v: 5,  n: 11 },
    { y: 0.885, s: 0.70, v: 13, n: 7 },
    { y: 1.040, s: 1.45, v: 32, n: 5 }
  ];
  var W = 0, H = 0, dpr = 1, t = 0, last = 0, raf = 0;
  var glow = GLOW[0].slice(), target = GLOW[0];
  var boost = 0, dir = 1, mx = 0, my = 0, tmx = 0, tmy = 0;
  var stars = [], clouds = [], sprites = { dark: [], light: [] }, shoot = null, nextShoot = 5;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }

  function makeSprite(th) {
    var w = 640, h = 240, c = document.createElement('canvas'), g, i;
    c.width = w; c.height = h; g = c.getContext('2d');
    for (i = 0; i < 30; i++) {
      var u = Math.random(), dome = 1 - Math.pow(Math.abs(u - 0.5) * 2, 1.7);
      var x = w * (0.13 + 0.74 * u), r = rnd(30, 58) * (0.55 + 0.65 * dome);
      var y = h * 0.70 - Math.random() * dome * h * 0.40;
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.60)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.24)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    }
    g.globalCompositeOperation = 'destination-out';
    var e = g.createLinearGradient(0, h * 0.66, 0, h * 0.94);
    e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = e; g.fillRect(0, h * 0.66, w, h * 0.34);
    g.globalCompositeOperation = 'source-atop';
    var s = g.createLinearGradient(0, h * 0.22, 0, h * 0.88);
    s.addColorStop(0, th.cloudTop); s.addColorStop(1, th.cloudBot);
    g.fillStyle = s; g.fillRect(0, 0, w, h);
    return c;
  }

  function build() {
    var i, k;
    stars = [];
    var n = Math.min(240, Math.round(W * H / 7000));
    for (i = 0; i < n; i++) stars.push({ x: Math.random(), y: Math.pow(Math.random(), 1.4) * 0.74, r: rnd(0.5, 1.5), ph: rnd(0, 6.28), d: rnd(0.2, 1) });
    clouds = [];
    var unit = Math.max(W, 700) / 1440;
    for (k = 0; k < LAYERS.length; k++) {
      var L = LAYERS[k], sw = 640 * L.s * unit, span = W + sw * 2;
      for (i = 0; i < L.n; i++) clouds.push({
        k: k, si: (Math.random() * 5) | 0, w: sw * rnd(0.8, 1.3),
        x: (i + Math.random() * 0.7) / L.n * span - sw, yo: rnd(-0.012, 0.012), fl: Math.random() < 0.5
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
    W = cv.clientWidth; H = cv.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 1.75);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    build();
    if (reduce) draw(0);
  }

  function draw(dt) {
    var i, vel = 1 + dir * boost * 11, hy = H * 0.80, hx = W * 0.72 - mx * 18;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, T.top); bg.addColorStop(0.46, T.mid);
    bg.addColorStop(0.80, rgba(T.horizon(glow), 1));
    bg.addColorStop(1, T.bot);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    /* stars */
    ctx.lineCap = 'round';
    for (i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x -= vel * s.d * dt * 0.0035;
      if (s.x < -0.02) s.x += 1.04; else if (s.x > 1.02) s.x -= 1.04;
      var sx = s.x * W - mx * 10 * s.d, sy = s.y * H - my * 6 * s.d;
      var a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.6 + s.d) + s.ph))) * (1 - s.y / 0.8);
      var len = (vel - 1) * s.d * 5;
      if (Math.abs(len) > 1.5) {
        ctx.strokeStyle = 'rgba(220,232,255,' + a + ')'; ctx.lineWidth = s.r;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + len, sy); ctx.stroke();
      } else if (T.stars) {
        ctx.fillStyle = 'rgba(220,232,255,' + a + ')';
        ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, 6.2832); ctx.fill();
      }
    }

    /* shooting star */
    if (!reduce && T.stars) {
      nextShoot -= dt;
      if (nextShoot <= 0 && !shoot) { shoot = { x: rnd(0.15, 0.8) * W, y: rnd(0.05, 0.3) * H, life: 0 }; nextShoot = rnd(9, 18); }
      if (shoot) {
        shoot.life += dt; var p = shoot.life / 0.9;
        if (p >= 1) shoot = null; else {
          var x0 = shoot.x + p * 260, y0 = shoot.y + p * 90;
          var sg = ctx.createLinearGradient(x0, y0, x0 - 120, y0 - 42);
          sg.addColorStop(0, 'rgba(255,255,255,' + (1 - p) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = sg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - 120, y0 - 42); ctx.stroke();
        }
      }
    }

    /* low sun and horizon glow */
    var R = Math.max(W, H) * 0.8;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(1, 0.46);
    var rg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    rg.addColorStop(0, rgba(glow, T.sun[0])); rg.addColorStop(0.22, rgba(glow, T.sun[1])); rg.addColorStop(0.6, rgba(glow, T.sun[2])); rg.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = rg; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
    var cr = Math.max(26, W * 0.03);
    var core = ctx.createRadialGradient(hx, hy, 0, hx, hy, cr * 2.4);
    core.addColorStop(0, T.core); core.addColorStop(0.32, T.coreMid || rgba(glow, 0.55)); core.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(hx, hy, cr * 2.4, 0, 6.2832); ctx.fill();

    /* clouds, far to near */
    for (i = 0; i < clouds.length; i++) {
      var c = clouds[i], L = LAYERS[c.k], h = c.w * 0.375, span = W + c.w * 2;
      c.x -= vel * L.v * dt;
      if (c.x < -c.w) c.x += span; else if (c.x > W + c.w) c.x -= span;
      var cx = c.x - mx * (8 + c.k * 14), cy = (L.y + c.yo) * H - h * 0.8 - my * (3 + c.k * 6);
      ctx.globalAlpha = T.alpha[c.k]; var sp = sprites[T === THEMES.light ? 'light' : 'dark'][c.si];
      if (c.fl) { ctx.save(); ctx.translate(cx + c.w, cy); ctx.scale(-1, 1); ctx.drawImage(sp, 0, 0, c.w, h); ctx.restore(); }
      else ctx.drawImage(sp, cx, cy, c.w, h);
      if (c.k === 0 && i === LAYERS[0].n - 1) {
        /* warm light spilling over the cloud sea, between the far and nearer layers */
        ctx.globalAlpha = 1; if (T.screen) ctx.globalCompositeOperation = 'screen';
        ctx.save(); ctx.translate(hx, hy); ctx.scale(1, 0.3);
        var wg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.7);
        wg.addColorStop(0, rgba(glow, T.spill)); wg.addColorStop(1, rgba(glow, 0));
        ctx.fillStyle = wg; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;

    /* legibility: darken the top, the bottom and the text side */
    var v = ctx.createLinearGradient(0, 0, 0, H);
    T.vig.forEach(function (st) { v.addColorStop(st[0], st[1]); });
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    var lg = ctx.createLinearGradient(0, 0, W * 0.66, 0);
    lg.addColorStop(0, T.side[0]); lg.addColorStop(1, T.side[1]);
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W * 0.66, H);
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0), k;
    last = now; t += dt;
    boost *= Math.pow(0.05, dt);
    if (boost < 0.002) boost = 0;
    for (k = 0; k < 3; k++) glow[k] += (target[k] - glow[k]) * Math.min(1, dt * 2.4);
    mx += (tmx - mx) * Math.min(1, dt * 3); my += (tmy - my) * Math.min(1, dt * 3);
    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  for (var q = 0; q < 5; q++) { sprites.dark.push(makeSprite(THEMES.dark)); sprites.light.push(makeSprite(THEMES.light)); }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('deck:tab', function (e) {
    tabIndex = e.detail.index;
    target = GLOW[e.detail.index % GLOW.length];
    if (reduce) { glow = target.slice(); draw(0); return; }
    if (e.detail.first) { glow = target.slice(); return; }
    dir = e.detail.dir; boost = 1;
  });
  window.addEventListener('deck:theme', function () {
    T = THEMES[mode()]; GLOW = T.glow; target = GLOW[tabIndex % GLOW.length]; glow = target.slice();
    if (reduce) draw(0);
  });
  if (reduce) { draw(0); return; }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    tmx = e.clientX / W * 2 - 1; tmy = e.clientY / H * 2 - 1;
    document.documentElement.style.setProperty('--px', (-tmx * 7).toFixed(1) + 'px');
    document.documentElement.style.setProperty('--py', (-tmy * 5).toFixed(1) + 'px');
  });
  document.addEventListener('visibilitychange', function () {
    cancelAnimationFrame(raf);
    if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  last = performance.now(); raf = requestAnimationFrame(frame);
})();
