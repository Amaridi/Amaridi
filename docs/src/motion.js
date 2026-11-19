/*
 * scroll-motion-site: dependency-free scroll engine.
 *
 * One requestAnimationFrame loop. It writes smoothed CSS variables and a few classes;
 * all visuals live in CSS (see motion.css). Nothing here builds layout.
 *
 *   .sc                     gets --p (0..1 pass through the viewport) and --e (0..1 entry)
 *   <html>                  gets --sp (page progress) and --h (first HERO_DISTANCE px)
 *   [data-words]            text is split into .wd spans; .in is added once when its top passes 88% of the viewport
 *   [data-reveal-words]     text is split into .rw spans that light up with --p of the nearest .sc
 *   [data-hide-on-scroll]   gets .is-hidden while scrolling down
 *   [data-marquee]          content repeated 3 times, speed follows scroll velocity (data-direction="-1" to reverse)
 *   [data-spot]             gets --mx / --my on pointer move
 *   [data-dock]             children .dk get --s (1..1.55) by pointer distance
 *   [data-steps="5"]        on a .sc: gets data-step="0..4" from scroll, or auto-advances when the page cannot scroll
 *
 * With prefers-reduced-motion nothing runs: no .js class, variables keep their CSS fallbacks.
 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var LERP = 0.11;
  var HERO_DISTANCE = 600;
  var clamp = function (v) { return Math.min(1, Math.max(0, v)); };
  var all = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  // Splits text into word spans, keeping inline wrappers (e.g. <span class="gr">) around their words.
  var split = function (el, cls) {
    var out = [];
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    var walk = function (node, host) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          parts.forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { host.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = cls; s.setAttribute('aria-hidden', 'true'); s.textContent = w;
            host.appendChild(s); out.push(s);
          });
        } else if (n.nodeType === 1) {
          var wrap = n.cloneNode(false);
          wrap.setAttribute('aria-hidden', 'true');
          host.appendChild(wrap);
          walk(n, wrap);
        }
      });
    };
    var src = el.cloneNode(true);
    el.textContent = '';
    walk(src, el);
    return out;
  };

  var start = function () {
    all('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', Math.round(e.clientX - r.left) + 'px');
        el.style.setProperty('--my', Math.round(e.clientY - r.top) + 'px');
      });
    });
    all('[data-dock]').forEach(function (dock) {
      dock.addEventListener('pointermove', function (e) {
        all('.dk', dock).forEach(function (el) {
          var r = el.getBoundingClientRect();
          var d = Math.abs(e.clientX - (r.left + r.width / 2));
          el.style.setProperty('--s', (1 + Math.max(0, 1 - d / 130) * 0.55).toFixed(3));
        });
      });
      dock.addEventListener('pointerleave', function () {
        all('.dk', dock).forEach(function (el) { el.style.setProperty('--s', '1'); });
      });
    });
    if (reduce) return;

    root.classList.add('js');

    all('[data-words]').forEach(function (el) {
      var step = Number(el.getAttribute('data-stagger')) || 50;
      var base = Number(el.getAttribute('data-delay')) || 0;
      split(el, 'wd').forEach(function (s, i) { s.style.transitionDelay = base + i * step + 'ms'; });
    });
    all('[data-reveal-words]').forEach(function (el) {
      var spans = split(el, 'rw');
      el.style.setProperty('--rw-k', (spans.length / 0.34).toFixed(1));
      spans.forEach(function (s, i) { s.style.setProperty('--rw-i', String(i)); });
    });
    var pending = all('[data-words]');

    var items = all('.sc').map(function (el) {
      return { el: el, e: 1, p: 0.5, te: 1, tp: 0.5, se: '', sp: '', snap: true, steps: Number(el.getAttribute('data-steps')) || 0, step: -1 };
    });
    var navs = all('[data-hide-on-scroll]');
    var marquees = all('[data-marquee]').map(function (el) {
      var html = el.innerHTML;
      el.innerHTML = html + html + html;
      return { el: el, x: 0, dir: Number(el.getAttribute('data-direction')) || 1 };
    });
    var last = window.scrollY || 0;
    var h = 1;
    var vel = 0;
    var dir = 1;
    var hidden = false;
    var scrollable = false;

    setInterval(function () {
      if (scrollable) return;
      items.forEach(function (it) {
        if (!it.steps || it.el.hasAttribute('data-step-manual')) return;
        it.step = (it.step + 1) % it.steps;
        it.el.setAttribute('data-step', String(it.step));
      });
    }, 2400);

    var frame = function () {
      requestAnimationFrame(frame);
      var vh = window.innerHeight;
      var max = root.scrollHeight - vh;
      var y = window.scrollY || root.scrollTop || 0;
      var dy = y - last;
      last = y;
      scrollable = max > 200;
      vel += (Math.abs(dy) - vel) * 0.2;
      if (dy > 0.5) dir = 1;
      if (dy < -0.5) dir = -1;

      var nextHidden = y > 120 && dy > 4 ? true : dy < -4 ? false : hidden;
      if (nextHidden !== hidden) {
        hidden = nextHidden;
        navs.forEach(function (n) { n.classList.toggle('is-hidden', hidden); });
      }

      marquees.forEach(function (m) {
        var w = m.el.scrollWidth / 3;
        if (!w) return;
        m.x = (m.x + (0.5 + vel * 0.45) * dir * m.dir + w * 10) % w;
        m.el.style.transform = 'translateX(' + (-m.x).toFixed(1) + 'px)';
      });

      if (pending.length) {
        pending = pending.filter(function (el) {
          if (el.getBoundingClientRect().top > vh * 0.88) return true;
          el.classList.add('in');
          return false;
        });
      }

      if (!scrollable) return;
      root.style.setProperty('--sp', clamp(y / max).toFixed(4));
      h += (clamp(y / HERO_DISTANCE) - h) * LERP;
      root.style.setProperty('--h', h.toFixed(4));

      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        it.tp = clamp((vh - r.top) / (vh + r.height));
        it.te = clamp((vh * 0.96 - r.top) / (vh * 0.6));
        if (it.snap) {
          it.snap = false;
          it.e = it.te;
          it.p = it.tp;
        }
        it.e += (it.te - it.e) * LERP;
        it.p += (it.tp - it.p) * LERP;
        var se = it.e.toFixed(3);
        var sp = it.p.toFixed(3);
        if (se !== it.se) { it.se = se; it.el.style.setProperty('--e', se); }
        if (sp !== it.sp) { it.sp = sp; it.el.style.setProperty('--p', sp); }
        if (it.steps && !it.el.hasAttribute('data-step-manual')) {
          var step = Math.min(it.steps - 1, Math.max(0, Math.floor(((it.tp - 0.28) / 0.4) * it.steps)));
          if (step !== it.step) { it.step = step; it.el.setAttribute('data-step', String(step)); }
        }
      });
    };
    requestAnimationFrame(frame);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
