/* PLANSROW — interactions */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;

  /* ── LOADER (2D point dissolve) ── */
  (function loader() {
    var el = document.getElementById('loader');
    var pct = document.getElementById('loaderPct');
    var cv = document.getElementById('loaderCanvas');
    if (!el) return;
    function done() { el.classList.add('is-done'); setTimeout(function () { el.remove(); }, 800); }
    if (reduce) { if (pct) pct.textContent = '100'; setTimeout(done, 300); return; }

    var ctx = cv.getContext('2d'), W, H, pts = [];
    function size() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
    size();
    for (var i = 0; i < 140; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, tx: W/2 + (Math.random()-0.5)*260, ty: H/2 + (Math.random()-0.5)*120 });
    var p = 0, start = performance.now();
    (function tick(t) {
      p = Math.min(1, (t - start) / 1400);
      var e = 1 - Math.pow(1 - p, 3);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#ED2422';
      for (var i = 0; i < pts.length; i++) {
        var o = pts[i], x = o.x + (o.tx - o.x) * e, y = o.y + (o.ty - o.y) * e;
        ctx.globalAlpha = 0.4 + 0.6 * e;
        ctx.fillRect(x, y, 2, 2);
      }
      if (pct) pct.textContent = String(Math.floor(p * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick); else setTimeout(done, 350);
    })(start);
    addEventListener('resize', size);
  })();

  /* ── CUSTOM CURSOR + coordinate readout ── */
  (function cursor() {
    if (coarse) return;
    var c = document.getElementById('cursor'), co = document.getElementById('cursorCoords');
    var x = innerWidth/2, y = innerHeight/2, cx = x, cy = y;
    addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      var X = (e.clientX / innerWidth * 200 - 100).toFixed(1);
      var Y = (100 - e.clientY / innerHeight * 200).toFixed(1);
      var Z = (Math.sin(e.clientX * 0.01) * 4 + 4).toFixed(2);
      co.textContent = 'X ' + X + ' · Y ' + Y + ' · Z ' + Z;
    }, { passive: true });
    document.querySelectorAll('a,button,.tilt,.acc__q').forEach(function (el) {
      el.addEventListener('mouseenter', function () { c.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { c.classList.remove('is-hover'); });
    });
    (function r() { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; c.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)'; requestAnimationFrame(r); })();
  })();

  /* ── NAV scroll state + mobile menu ── */
  (function nav() {
    var nav = document.getElementById('nav'), burger = document.getElementById('burger'), links = document.querySelector('.nav__links');
    addEventListener('scroll', function () { nav.classList.toggle('nav--scrolled', scrollY > 40); }, { passive: true });
    if (burger) burger.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open);
    });
    links && links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); });
    });
  })();

  /* ── REVEAL on scroll ── */
  (function reveal() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal,.stat,.step').forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 0.07 + 's';
      io.observe(el);
    });
  })();

  /* ── COUNT-UP stats ── */
  (function counters() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || '', dur = 1400, t0;
        if (reduce) { el.textContent = end + suf; return; }
        requestAnimationFrame(function step(t) {
          t0 = t0 || t; var p = Math.min(1, (t - t0) / dur), e2 = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * e2) + suf;
          if (p < 1) requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.stat__num').forEach(function (el) { io.observe(el); });
  })();

  /* ── 3D TILT cards ── */
  (function tilt() {
    if (coarse || reduce) return;
    document.querySelectorAll('.tilt').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = 'perspective(800px) rotateY(' + ((px - 0.5) * 9) + 'deg) rotateX(' + ((0.5 - py) * 9) + 'deg) translateZ(6px)';
        card.style.setProperty('--mx', px * 100 + '%'); card.style.setProperty('--my', py * 100 + '%');
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  })();

  /* ── FAQ accordion ── */
  (function faq() {
    document.querySelectorAll('.acc__q').forEach(function (q) {
      q.addEventListener('click', function () {
        var open = q.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('.acc__q').forEach(function (o) {
          o.setAttribute('aria-expanded', 'false'); o.nextElementSibling.style.maxHeight = null;
        });
        if (!open) { q.setAttribute('aria-expanded', 'true'); var a = q.nextElementSibling; a.style.maxHeight = a.scrollHeight + 'px'; }
      });
    });
  })();

  /* ── newsletter (demo) ── */
  (function news() {
    var f = document.getElementById('news'), m = document.getElementById('newsMsg');
    if (!f) return;
    f.addEventListener('submit', function (e) { e.preventDefault(); m.textContent = '✓ THANK YOU — YOUR SUBMISSION HAS BEEN RECEIVED.'; f.querySelector('input').value = ''; });
  })();
})();
