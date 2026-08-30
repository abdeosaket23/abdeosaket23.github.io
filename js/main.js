/* ==========================================================================
   main.js
   Nothing here needs editing for normal use — all content lives in index.html.
   Sections, in order:
     0.  helpers
     1.  ticker tape
     2.  scroll progress + background parallax
     3.  sidebar toggle + copy email + toast
     4.  scroll reveal (staggered)
     5.  metric counters + sparklines
     8.  card tilt + spotlight
     10. portfolio filter
     11. contact form
     12. page tabs, swipe gestures, nav indicator
     13. command palette
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------------------
   0. HELPERS
   -------------------------------------------------------------------------- */
var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

var on = function (els, type, cb, opts) {
  (els.length !== undefined ? Array.prototype.slice.call(els) : [els])
    .forEach(function (el) { if (el) el.addEventListener(type, cb, opts); });
};

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Animate a value over time with an ease-out curve. */
var animate = function (duration, step, done) {
  if (reduceMotion) { step(1); if (done) done(); return; }
  var start = null;
  var frame = function (ts) {
    if (start === null) start = ts;
    var p = Math.min((ts - start) / duration, 1);
    step(1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(frame);
    else if (done) done();
  };
  requestAnimationFrame(frame);
};


/* --------------------------------------------------------------------------
   1. TICKER TAPE
   The list is cloned once so the marquee can loop seamlessly at -50%.
   -------------------------------------------------------------------------- */
(function () {
  var track = $('[data-ticker]');
  if (!track) return;

  var list = $('.ticker-list', track);
  if (!list) return;

  var clone = list.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);
})();


/* --------------------------------------------------------------------------
   2. SCROLL PROGRESS BAR + BACKGROUND PARALLAX
   -------------------------------------------------------------------------- */
(function () {
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  var root = document.documentElement;
  var queued = false;

  var update = function () {
    queued = false;
    var max = root.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = 'scaleX(' + p + ')';
    root.style.setProperty('--bg-shift', p.toFixed(4));
  };

  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();

  /* Blobs drift a little with the cursor — desktop, pointer devices only. */
  if (!reduceMotion && window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches) {
    var blobs = $$('.blob');
    window.addEventListener('mousemove', function (e) {
      var dx = (e.clientX / window.innerWidth - 0.5);
      var dy = (e.clientY / window.innerHeight - 0.5);
      blobs.forEach(function (blob, i) {
        var depth = (i + 1) * 16;
        blob.style.setProperty('--mx', (dx * depth).toFixed(2));
        blob.style.setProperty('--my', (dy * depth).toFixed(2));
      });
    }, { passive: true });
  }
})();


/* --------------------------------------------------------------------------
   3. SIDEBAR TOGGLE, COPY EMAIL, TOAST
   -------------------------------------------------------------------------- */
var toastEl = $('[data-toast]');
var toastTimer;

var toast = function (msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
};

(function () {
  var sidebar = $('[data-sidebar]');
  var btn = $('[data-sidebar-btn]');
  if (!sidebar || !btn) return;

  btn.addEventListener('click', function () {
    var open = sidebar.classList.toggle('active');
    var label = btn.querySelector('span');
    if (label) label.textContent = open ? 'Hide Contacts' : 'Show Contacts';
  });
})();

var copyEmail = function () {
  var link = $('[data-email]');
  if (!link) return;
  var address = link.textContent.trim();

  var done = function () {
    toast('Email copied — ' + address);
    var btn = $('[data-copy-email]');
    if (btn) {
      btn.classList.add('copied');
      setTimeout(function () { btn.classList.remove('copied'); }, 1600);
    }
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(address).then(done).catch(function () {
      toast('Copy failed — ' + address);
    });
  } else {
    /* Fallback for pages served over plain http. */
    var ta = document.createElement('textarea');
    ta.value = address;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (err) { toast('Copy failed — ' + address); }
    document.body.removeChild(ta);
  }
};

on($$('[data-copy-email]'), 'click', function (e) {
  e.preventDefault();
  e.stopPropagation();
  copyEmail();
});


/* --------------------------------------------------------------------------
   4. SCROLL REVEAL
   Each [data-reveal] block fades its children up in sequence once it enters
   the viewport. Works inside tab panels too: an element that was display:none
   fires the observer as soon as its panel becomes visible.
   -------------------------------------------------------------------------- */
(function () {
  var blocks = $$('[data-reveal]');
  if (!blocks.length) return;

  /* Give each child an index so CSS can stagger the delay. */
  blocks.forEach(function (block) {
    var kids = $$(':scope > *', block);
    kids.forEach(function (kid, i) { kid.style.setProperty('--i', i); });

    $$('.service-item, .metric-card, .role, .cert-list li, .skill-tags li', block)
      .forEach(function (kid, i) { kid.style.setProperty('--i', i); });
  });

  if (!('IntersectionObserver' in window)) {
    blocks.forEach(function (b) { b.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
      /* Let the number/chart animations know their block is on screen. */
      entry.target.dispatchEvent(new CustomEvent('revealed', { bubbles: true }));
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  blocks.forEach(function (b) { io.observe(b); });
})();


/* --------------------------------------------------------------------------
   5. METRIC COUNTERS + SPARKLINES
   -------------------------------------------------------------------------- */
(function () {
  var cards = $$('.metric-card');
  if (!cards.length) return;

  /* --- Sparkline paths, drawn from the data-spark numbers --- */
  var buildSparkline = function (svg) {
    var raw = (svg.dataset.spark || '').split(',').map(parseFloat).filter(function (n) { return !isNaN(n); });
    if (raw.length < 2) return;

    var W = 100, H = 30, pad = 3;
    var min = Math.min.apply(null, raw);
    var max = Math.max.apply(null, raw);
    var span = max - min || 1;

    var pts = raw.map(function (v, i) {
      return {
        x: (i / (raw.length - 1)) * W,
        y: H - pad - ((v - min) / span) * (H - pad * 2)
      };
    });

    var line = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2);
    }).join(' ');

    /* A soft fill under the line, unique gradient id per chart. */
    var id = 'sparkFade-' + Math.round(pts[0].y * 1000) + '-' + raw.length + '-' + cards.indexOf(svg.closest('.metric-card'));

    svg.innerHTML =
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="hsl(45,100%,72%)" stop-opacity="0.30"/>' +
        '<stop offset="100%" stop-color="hsl(45,100%,72%)" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path class="spark-area" d="' + line + ' L' + W + ' ' + H + ' L0 ' + H + ' Z" fill="url(#' + id + ')"/>' +
      '<path class="spark-line" d="' + line + '"/>';

    var path = svg.querySelector('.spark-line');
    var len = path.getTotalLength ? path.getTotalLength() : 200;
    path.style.setProperty('--len', len);
  };

  /* --- Count-up --- */
  var countUp = function (el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';

    var target   = parseFloat(el.dataset.countTo);
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var prefix   = el.dataset.prefix || '';
    var suffix   = el.dataset.suffix || '';
    if (isNaN(target)) return;

    animate(1400, function (t) {
      el.textContent = prefix + (target * t).toFixed(decimals) + suffix;
    }, function () {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
    });
  };

  cards.forEach(function (card) {
    var svg = $('.sparkline', card);
    if (svg) buildSparkline(svg);
  });

  /* Fire when the metrics block reveals. */
  var section = $('.metrics');
  if (!section) return;

  var run = function () { $$('[data-count-to]', section).forEach(countUp); };

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run();
        io.disconnect();
      });
    }, { threshold: 0.3 });
    io.observe(section);
  } else {
    run();
  }
})();


/* --------------------------------------------------------------------------
   8. CARD TILT + CURSOR SPOTLIGHT (desktop pointers only)
   -------------------------------------------------------------------------- */
(function () {
  if (reduceMotion) return;
  if (!window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches) return;

  var cards = $$('.service-item, .metric-card, .role');
  cards.forEach(function (card) { card.classList.add('tilt'); });

  var MAX = 6; /* degrees */

  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var px = e.clientX - r.left;
      var py = e.clientY - r.top;

      card.style.setProperty('--px', px + 'px');
      card.style.setProperty('--py', py + 'px');

      var rx = ((py / r.height) - 0.5) * -2 * MAX;
      var ry = ((px / r.width) - 0.5) * 2 * MAX;
      card.style.transform = 'perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });
})();


/* --------------------------------------------------------------------------
   10. PORTFOLIO FILTER
   Both the desktop buttons and the mobile dropdown are generated from the
   data-category on each project, so a new category needs no other edit.
   -------------------------------------------------------------------------- */
(function () {
  var filterList = $('[data-filter-list]');
  var selectList = $('[data-select-list]');
  var selectBtn  = $('[data-select]');
  var selectVal  = $('[data-select-value]');
  var items      = $$('[data-filter-item]');
  if (!filterList || !selectList || !items.length) return;

  /* With a handful of projects every filter would show one card, which is
     worse than no filter. It appears on its own once there are enough. */
  var MIN_TO_FILTER = 5;
  if (items.length < MIN_TO_FILTER) {
    filterList.hidden = true;
    var box = $('.filter-select-box');
    if (box) box.hidden = true;
    return;
  }

  /* Collect each category once, keeping the nicely-cased label from the card's
     .project-category so the filter reads "M&A" rather than "m&a". */
  var categories = [];
  var labels = { all: 'All' };

  items.forEach(function (item) {
    var cat = (item.dataset.category || '').trim().toLowerCase();
    if (!cat) return;
    if (categories.indexOf(cat) === -1) {
      categories.push(cat);
      var shown = $('.project-category', item);
      labels[cat] = shown ? shown.textContent.trim() : cat;
    }
  });

  var all = ['all'].concat(categories);

  var apply = function (value) {
    items.forEach(function (item) {
      var match = value === 'all' || value === (item.dataset.category || '').toLowerCase();
      /* Restart the pop-in animation on each filter change. */
      item.classList.remove('active');
      if (match) {
        void item.offsetWidth;
        item.classList.add('active');
      }
    });
  };

  var makeBtn = function (cat, cls, dataAttr) {
    var li = document.createElement('li');
    li.className = cls;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = labels[cat] || cat;
    btn.dataset.value = cat;
    btn.setAttribute(dataAttr, '');
    li.appendChild(btn);
    return li;
  };

  all.forEach(function (cat, i) {
    var li = makeBtn(cat, 'filter-item', 'data-filter-btn');
    if (i === 0) li.firstChild.classList.add('active');
    filterList.appendChild(li);
    selectList.appendChild(makeBtn(cat, 'select-item', 'data-select-item'));
  });

  if (selectVal) selectVal.textContent = labels.all;

  var btns = $$('[data-filter-btn]', filterList);

  var select = function (value) {
    if (selectVal) selectVal.textContent = labels[value] || value;
    btns.forEach(function (b) { b.classList.toggle('active', b.dataset.value === value); });
    apply(value);
  };

  on(btns, 'click', function () { select(this.dataset.value); });

  on($$('[data-select-item]', selectList), 'click', function () {
    select(this.dataset.value);
    if (selectBtn) {
      selectBtn.classList.remove('active');
      selectBtn.setAttribute('aria-expanded', 'false');
      selectBtn.parentElement.classList.remove('active');
    }
  });

  if (selectBtn) {
    selectBtn.addEventListener('click', function () {
      var open = this.classList.toggle('active');
      this.parentElement.classList.toggle('active', open);
      this.setAttribute('aria-expanded', String(open));
    });
  }
})();


/* --------------------------------------------------------------------------
   11. CONTACT FORM
   -------------------------------------------------------------------------- */
(function () {
  var form   = $('[data-form]');
  var btn    = $('[data-form-btn]');
  var status = $('[data-form-status]');
  if (!form || !btn) return;

  /* EDIT: your address — used only for the mailto fallback below. */
  var FALLBACK_EMAIL = 'abdeosaket23@gmail.com';

  on($$('[data-form-input]'), 'input', function () {
    btn.disabled = !form.checkValidity();
  });

  var setStatus = function (msg, isError) {
    if (!status) return;
    status.textContent = msg;
    status.classList.toggle('error', !!isError);
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var action = form.getAttribute('action') || '';
    var configured = action.indexOf('YOUR_FORM_ID') === -1 && /^https?:/.test(action);
    var data = new FormData(form);

    if (!configured) {
      var subject = encodeURIComponent('Website enquiry from ' + (data.get('fullname') || ''));
      var body = encodeURIComponent(
        (data.get('message') || '') + '\n\n— ' + (data.get('fullname') || '') +
        ' (' + (data.get('email') || '') + ')'
      );
      window.location.href = 'mailto:' + FALLBACK_EMAIL + '?subject=' + subject + '&body=' + body;
      setStatus('Opening your email app…');
      return;
    }

    setStatus('Sending…');
    btn.disabled = true;

    var sent = function () {
      form.reset();
      btn.disabled = true;
      setStatus('Thanks — your message is on its way.');
      toast('Message sent');
    };

    var failed = function () {
      setStatus('Something went wrong. Email me at ' + FALLBACK_EMAIL + '.', true);
      btn.disabled = false;
    };

    fetch(action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        sent();
      })
      .catch(function () {
        /* A Google Apps Script endpoint answers through a redirect, and some
           browsers won't let us read that response cross-origin — the POST
           itself still went through. Retry opaquely so a delivered message
           isn't reported as a failure. A genuinely dead endpoint rejects
           here too, and is reported. */
        fetch(action, { method: 'POST', body: data, mode: 'no-cors' })
          .then(sent)
          .catch(failed);
      });
  });
})();


/* --------------------------------------------------------------------------
   12. PAGE TABS, SWIPE GESTURES, NAV INDICATOR
   -------------------------------------------------------------------------- */
var goToPage; /* exposed for the command palette below */

(function () {
  var links = $$('[data-nav-link]');
  var pages = $$('[data-page]');
  var navList = $('.navbar-list');
  var content = $('.main-content');
  if (!links.length || !pages.length) return;

  var order = links.map(function (l) { return l.textContent.trim().toLowerCase(); });
  var current = 0;

  /* --- Sliding indicator under the active tab --- */
  var indicator = document.createElement('span');
  indicator.className = 'nav-indicator';
  if (navList) navList.appendChild(indicator);

  var moveIndicator = function () {
    if (!navList) return;
    var link = links[current];
    if (!link) return;
    indicator.style.left  = link.offsetLeft + 'px';
    indicator.style.width = link.offsetWidth + 'px';
  };

  /* --- Switch panels --- */
  goToPage = function (name, opts) {
    var index = order.indexOf(String(name).toLowerCase());
    if (index === -1 || index === current) return;

    var dir = index > current ? 'slide-from-right' : 'slide-from-left';
    current = index;

    pages.forEach(function (page, i) {
      page.classList.remove('active', 'slide-from-right', 'slide-from-left');
      if (i === index) {
        page.classList.add('active');
        if (!reduceMotion) page.classList.add(dir);
      }
    });

    links.forEach(function (l, i) { l.classList.toggle('active', i === index); });
    moveIndicator();

    document.dispatchEvent(new CustomEvent('panelchange', {
      detail: { panel: pages[index], name: order[index] }
    }));

    /* The panel is in the URL, so a refresh comes back to it rather than
       dropping you on About. replaceState rather than push: the tabs aren't
       history, and stacking them would make Back feel broken. */
    try { history.replaceState(null, '', '#' + order[index]); } catch (err) { /* file:// */ }

    if (!opts || opts.scroll !== false) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  on(links, 'click', function () { goToPage(this.textContent.trim()); });

  /* Clean up the animation class so it can replay next time. */
  on(pages, 'animationend', function () {
    this.classList.remove('slide-from-right', 'slide-from-left');
  });

  window.addEventListener('resize', moveIndicator);
  window.addEventListener('load', moveIndicator);
  moveIndicator();

  /* --- Come back to where you were on a refresh ---------------------------
     The panel comes from the hash; the scroll position is kept per panel in
     sessionStorage, so it survives a reload but not a new tab. Restoration
     is manual because the browser's own guess is made against the About
     panel's height, before we've switched to the one you were on. */
  var SCROLL_KEY = 'scroll:';

  var rememberScroll = function () {
    try { sessionStorage.setItem(SCROLL_KEY + order[current], String(window.scrollY)); }
    catch (err) { /* private mode */ }
  };

  window.addEventListener('beforeunload', rememberScroll);
  /* pagehide covers the mobile case, where beforeunload often never fires. */
  window.addEventListener('pagehide', rememberScroll);

  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; }
  catch (err) { /* not supported */ }

  var fromHash = (window.location.hash || '').replace(/^#/, '').toLowerCase();
  if (order.indexOf(fromHash) > 0) goToPage(fromHash, { scroll: false });

  var restoreScroll = function () {
    var y = 0;
    try { y = parseFloat(sessionStorage.getItem(SCROLL_KEY + order[current])) || 0; }
    catch (err) { y = 0; }
    if (y <= 0) return;

    /* html carries scroll-behavior: smooth, which would animate the page down
       from the top on every refresh. Turn it off for the jump and back on
       after, so you simply arrive where you were. */
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = prev;
  };

  /* After load, and again a frame later — images and the career chart settle
     the page height after first paint, and a scroll set before that clamps. */
  window.addEventListener('load', function () {
    restoreScroll();
    requestAnimationFrame(restoreScroll);
    setTimeout(restoreScroll, 260);
  });

  /* Back/forward, or someone editing the hash by hand. */
  window.addEventListener('hashchange', function () {
    var name = (window.location.hash || '').replace(/^#/, '').toLowerCase();
    if (order.indexOf(name) !== -1) goToPage(name, { scroll: false });
  });

  /* --- Swipe left/right to change panel (touch) --- */
  if (content) {
    var startX = 0, startY = 0, tracking = false, dragging = false;
    var THRESHOLD = 60;   /* px before a swipe counts */
    var SLOP = 14;        /* px before we decide it's horizontal */

    content.addEventListener('touchstart', function (e) {
      /* Ignore swipes that begin inside a horizontally scrolling strip. */
      if (e.target.closest('.has-scrollbar, .cmdk')) return;
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      dragging = false;
    }, { passive: true });

    content.addEventListener('touchmove', function (e) {
      if (!tracking) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;

      if (!dragging) {
        if (Math.abs(dy) > Math.abs(dx)) { tracking = false; return; }  /* vertical scroll wins */
        if (Math.abs(dx) < SLOP) return;
        dragging = true;
        content.classList.add('swiping');
      }

      /* Rubber-band at the ends of the tab list. */
      var atEdge = (dx > 0 && current === 0) || (dx < 0 && current === pages.length - 1);
      content.style.transform = 'translate3d(' + (dx * (atEdge ? 0.25 : 0.4)).toFixed(1) + 'px, 0, 0)';
    }, { passive: true });

    var endSwipe = function (e) {
      if (!tracking) return;
      tracking = false;
      content.classList.remove('swiping');
      content.style.transform = '';
      if (!dragging) return;

      var endX = (e.changedTouches && e.changedTouches[0].clientX) || startX;
      var dx = endX - startX;
      if (Math.abs(dx) < THRESHOLD) return;

      var next = dx < 0 ? current + 1 : current - 1;
      if (next >= 0 && next < order.length) goToPage(order[next]);
    };

    content.addEventListener('touchend', endSwipe, { passive: true });
    content.addEventListener('touchcancel', endSwipe, { passive: true });
  }

  /* --- Keyboard: 1–4 jump to a panel, arrows step through --- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if ($('.cmdk.active')) return;

    if (e.key >= '1' && e.key <= String(order.length)) {
      goToPage(order[parseInt(e.key, 10) - 1]);
    } else if (e.key === 'ArrowRight' && current < order.length - 1) {
      goToPage(order[current + 1]);
    } else if (e.key === 'ArrowLeft' && current > 0) {
      goToPage(order[current - 1]);
    }
  });
})();


/* --------------------------------------------------------------------------
   13. COMMAND PALETTE (⌘K / Ctrl+K)
   -------------------------------------------------------------------------- */
(function () {
  var palette = $('[data-cmdk]');
  var input   = $('[data-cmdk-input]');
  var list    = $('[data-cmdk-list]');
  if (!palette || !input || !list) return;

  var icon = {
    page:   '<path d="M4 5h16M4 12h16M4 19h10"/>',
    mail:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    copy:   '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    down:   '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    link:   '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    print:  '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M8 17h8v4H8z"/>',
    home:   '<path d="m3 11 9-8 9 8M5 10v10h14V10"/>'
  };

  /* ==========================================================
     EDIT: add or remove palette entries here. `run` is what
     happens when the entry is chosen.
     ========================================================== */
  var COMMANDS = [
    { title: 'Go to About',      hint: '1', icon: icon.page,  run: function () { goToPage('about'); } },
    { title: 'Go to Resume',     hint: '2', icon: icon.page,  run: function () { goToPage('resume'); } },
    { title: 'Go to Portfolio',  hint: '3', icon: icon.page,  run: function () { goToPage('portfolio'); } },
    { title: 'Go to Contact',    hint: '4', icon: icon.page,  run: function () { goToPage('contact'); } },
    { title: 'Copy email address',          icon: icon.copy,  run: copyEmail },
    { title: 'Send me an email',            icon: icon.mail,  run: function () {
        var link = $('[data-email]');
        if (link) window.location.href = link.getAttribute('href');
      } },
    { title: 'Download resume (PDF)',       icon: icon.down,  run: function () {
        window.open('assets/files/resume.pdf?v=4', '_blank', 'noopener');
      } },
    { title: 'Open LinkedIn',               icon: icon.link,  run: function () {
        var a = $('.social-list a[href*="linkedin"]');
        if (a) window.open(a.href, '_blank', 'noopener');
      } },
    { title: 'Call',                        icon: icon.link,  run: function () {
        var a = $('.social-list a[href^="tel:"]');
        if (a) window.location.href = a.getAttribute('href');
      } },
    { title: 'Print resume',                icon: icon.print, run: function () {
        goToPage('resume');
        setTimeout(function () { window.print(); }, 350);
      } },
    { title: 'Send avatar home',            icon: icon.home,  run: function () {
        if (typeof resetAvatar === 'function') resetAvatar();
      } }
  ];

  var matches = COMMANDS.slice();
  var active = 0;

  var render = function () {
    if (!matches.length) {
      list.innerHTML = '<li class="cmdk-empty">No matches</li>';
      return;
    }
    list.innerHTML = matches.map(function (cmd, i) {
      return '<li class="cmdk-item" role="option" data-index="' + i + '" aria-selected="' + (i === active) + '">' +
               '<svg class="cmdk-item-icon" viewBox="0 0 24 24" aria-hidden="true">' + cmd.icon + '</svg>' +
               '<span class="cmdk-item-title">' + cmd.title + '</span>' +
               (cmd.hint ? '<span class="cmdk-item-hint">' + cmd.hint + '</span>' : '') +
             '</li>';
    }).join('');
  };

  var filter = function (q) {
    q = q.trim().toLowerCase();
    matches = q
      ? COMMANDS.filter(function (c) { return c.title.toLowerCase().indexOf(q) !== -1; })
      : COMMANDS.slice();
    active = 0;
    render();
  };

  var openPalette = function () {
    palette.classList.add('active');
    input.value = '';
    filter('');
    setTimeout(function () { input.focus(); }, 60);
  };

  var closePalette = function () {
    palette.classList.remove('active');
    input.blur();
  };

  var runActive = function () {
    var cmd = matches[active];
    closePalette();
    if (cmd) setTimeout(cmd.run, 120);
  };

  var move = function (delta) {
    if (!matches.length) return;
    active = (active + delta + matches.length) % matches.length;
    render();
    var el = list.querySelector('[aria-selected="true"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  };

  input.addEventListener('input', function () { filter(this.value); });

  list.addEventListener('click', function (e) {
    var item = e.target.closest('.cmdk-item');
    if (!item) return;
    active = parseInt(item.dataset.index, 10);
    runActive();
  });

  list.addEventListener('mousemove', function (e) {
    var item = e.target.closest('.cmdk-item');
    if (!item) return;
    var i = parseInt(item.dataset.index, 10);
    if (i === active) return;
    active = i;
    render();
  });

  on($$('[data-cmdk-close]'), 'click', closePalette);
  on($$('[data-cmdk-open]'), 'click', openPalette);

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      palette.classList.contains('active') ? closePalette() : openPalette();
      return;
    }
    if (!palette.classList.contains('active')) return;

    if (e.key === 'Escape')         { e.preventDefault(); closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter')     { e.preventDefault(); runActive(); }
  });

  render();
})();


/* ==========================================================================
   ==========================================================================
   SIGNATURE LAYER
     16. career chart
     17. market clock
   ==========================================================================
   ========================================================================== */


/* --------------------------------------------------------------------------
   16. CAREER CHART
   Candles are derived from consecutive data-value numbers: each year opens at
   the previous year's close and closes at its own value, with a small wick.
   -------------------------------------------------------------------------- */
(function () {
  var wrap = $('[data-career-chart]');
  var svg  = $('[data-career-svg]');
  var data = $('[data-career-data]');
  if (!wrap || !svg || !data) return;

  var rows = $$('li', data).map(function (li) {
    return {
      year:  li.dataset.year || '',
      value: parseFloat(li.dataset.value) || 0,
      label: li.dataset.label || '',
      note:  li.dataset.note || '',
      logo:  li.dataset.logo || '',
      range: li.dataset.range || '',
      months: parseFloat(li.dataset.months) || 0,
      kind:  li.dataset.kind || '',
      bleed: li.dataset.logoBleed !== undefined,
      awards: (li.dataset.awards || '').split('|').filter(Boolean)
    };
  });
  if (rows.length < 2) return;

  var BADGE = 26;                                   /* logo plate, viewBox units */
  var STAR  = 4.6;                                  /* award star, outer radius */
  var hasLogos  = rows.some(function (r) { return r.logo; });
  var hasAwards = rows.some(function (r) { return r.awards.length; });

  /* Wider than it is tall, so the whole panel fits a laptop screen without
     scrolling past the chart to reach the text under it. */
  var W = 720, H = hasLogos ? 232 : 210;
  /* Plates ride above each candle's high and stars above the plates, so the
     top padding has to clear whichever of them is in play. */
  var PAD = {
    t: hasLogos ? BADGE + 15 + (hasAwards ? 14 : 0) : 14,
    r: 42, b: 22, l: 10
  };
  var plotW = W - PAD.l - PAD.r;
  var plotH = H - PAD.t - PAD.b;

  /* Build candles. Open = previous close; wicks extend a little past both. */
  var candles = rows.map(function (row, i) {
    var open = i === 0 ? row.value * 0.82 : rows[i - 1].value;
    var close = row.value;
    var spread = Math.max(2, Math.abs(close - open) * 0.45);
    return {
      row: row,
      open: open,
      close: close,
      high: Math.max(open, close) + spread,
      low:  Math.min(open, close) - spread,
      up:   close >= open
    };
  });

  var lo = Math.min.apply(null, candles.map(function (c) { return c.low; }));
  var hi = Math.max.apply(null, candles.map(function (c) { return c.high; }));
  /* --- how tall each block is -------------------------------------------
     Height is time, not price: a block is as tall as the step was long, so a
     two-month internship draws short and a two-year role draws tall. Steps
     without a data-months fall back to the size of their own move. */
  var BODY_MIN = 13;                  /* viewBox units — the shortest stint */
  var PER_MONTH = 1.8;                /* units per month */
  var longest = Math.max.apply(null, rows.map(function (r) { return r.months; }));

  var bodyHeight = function (c) {
    if (!c.row.months) return Math.max(BODY_MIN, Math.abs(c.close - c.open));
    return Math.max(BODY_MIN, c.row.months * PER_MONTH);
  };

  /* Blocks are centred on their own close, so the scale has to keep half of
     the tallest one clear of the top and bottom of the plot. */
  var reserve = (longest ? longest * PER_MONTH : BODY_MIN) / 2 + 8;
  var innerTop = PAD.t + reserve;
  var innerBot = PAD.t + plotH - reserve;

  var y = function (v) { return innerBot - ((v - lo) / (hi - lo)) * (innerBot - innerTop); };
  var step = plotW / rows.length;
  var cx = function (i) { return PAD.l + step * (i + 0.5); };
  var bw = Math.min(26, step * 0.5);

  /* Mortarboard, drawn from the top-left of a 20-wide artwork. */
  var capMark = function (gx, gy, w) {
    return '<g class="cap-mark" transform="translate(' + gx.toFixed(1) + ' ' + gy.toFixed(1) +
             ') scale(' + (w / 20).toFixed(3) + ')">' +
        '<path d="M0 6 L10 1 L20 6 L10 11 Z"/>' +
        '<path d="M4.6 8.3 L4.6 12.6 C4.6 14.7 15.4 14.7 15.4 12.6 L15.4 8.3 L10 11 Z"/>' +
        '<path d="M18.4 7.4 L18.4 13.2" class="cap-tassel"/>' +
        '<circle cx="18.4" cy="14.4" r="1.5"/>' +
      '</g>';
  };

  /* Five-point star, drawn from its centre. */
  var starPath = function (sx, sy, r) {
    var pts = [];
    for (var k = 0; k < 10; k++) {
      var ang = -Math.PI / 2 + k * Math.PI / 5;
      var rad = k % 2 ? r * 0.42 : r;
      pts.push((sx + Math.cos(ang) * rad).toFixed(2) + ' ' + (sy + Math.sin(ang) * rad).toFixed(2));
    }
    return 'M' + pts.join(' L') + ' Z';
  };

  var parts = [];

  /* Horizontal gridlines + right-hand price axis */
  for (var g = 0; g <= 4; g++) {
    var v = lo + ((hi - lo) / 4) * g;
    var gy = y(v);
    parts.push('<line class="grid-line" x1="' + PAD.l + '" y1="' + gy.toFixed(1) + '" x2="' + (W - PAD.r) + '" y2="' + gy.toFixed(1) + '"/>');
    parts.push('<text class="axis-text" x="' + (W - PAD.r + 8) + '" y="' + (gy + 3).toFixed(1) + '">' + Math.round(v) + '</text>');
  }

  /* Candles */
  candles.forEach(function (c, i) {
    var x = cx(i);
    var cls = c.up ? 'up' : 'down';
    /* Centred on the step's own close — which is where the trend line runs —
       and as tall as the step was long. */
    var h = bodyHeight(c);
    var mid = y(c.close);
    var top = mid - h / 2;
    var bot = mid + h / 2;

    /* Wicks then have to clear the grown body, or they vanish inside it. */
    var wickTop = Math.min(y(c.high), top - 7);
    var wickBot = Math.max(y(c.low), bot + 7);
    c.wickTop = wickTop;

    var delay = (0.35 + i * 0.07).toFixed(2) + 's';

    parts.push('<line class="wick ' + cls + '" x1="' + x.toFixed(1) + '" y1="' + wickTop.toFixed(1) +
               '" x2="' + x.toFixed(1) + '" y2="' + wickBot.toFixed(1) + '" style="animation-delay:' + delay + '"/>');
    parts.push('<rect class="candle ' + cls + '" x="' + (x - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) +
               '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" style="animation-delay:' + delay + '"/>');

    /* Who the year belongs to, on a plate above the wick. The mark is an
       ordinary image, so swapping a monogram for a real logo is a file
       drop — see data-logo on the <li>. */
    if (!c.row.logo) return;
    var bx = x - BADGE / 2;
    var by = c.wickTop - BADGE - 7;
    /* A logo that is already a solid tile fills the plate instead of sitting
       on it — no white showing round the edge. It's clipped to the same
       rounded square, with a hair of overscan so antialiasing can't leave a
       seam. The files themselves are trimmed square, so nothing is cropped.
       Everything else keeps the plate, with enough padding to hold the mark
       off the corners. */
    var pad = 3.5;
    var art = c.row.bleed
      ? '<clipPath id="badgeClip' + i + '">' +
          '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) +
            '" width="' + BADGE + '" height="' + BADGE + '" rx="7"/>' +
        '</clipPath>' +
        '<image href="' + c.row.logo + '" clip-path="url(#badgeClip' + i + ')"' +
          ' x="' + (bx - 0.6).toFixed(1) + '" y="' + (by - 0.6).toFixed(1) +
          '" width="' + (BADGE + 1.2) + '" height="' + (BADGE + 1.2) +
          '" preserveAspectRatio="xMidYMid slice"/>'
      : '<rect class="badge-plate" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) +
          '" width="' + BADGE + '" height="' + BADGE + '" rx="7"/>' +
        '<image href="' + c.row.logo + '" x="' + (bx + pad).toFixed(1) + '" y="' + (by + pad).toFixed(1) +
          '" width="' + (BADGE - pad * 2) + '" height="' + (BADGE - pad * 2) +
          '" preserveAspectRatio="xMidYMid meet"/>';

    parts.push(
      '<g class="candle-badge" style="animation-delay:' + delay + '">' +
        art +
        '<rect class="badge-edge" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) +
          '" width="' + BADGE + '" height="' + BADGE + '" rx="7"/>' +
        (c.row.kind === 'study' ? capMark(bx - 12, by - 12, 14) : '') +
      '</g>'
    );

    /* An award sits above the mark as a star apiece — the tooltip names them. */
    if (!c.row.awards.length) return;
    var gap = STAR * 2 + 3;
    var sx0 = x - (c.row.awards.length - 1) * gap / 2;
    var stars = c.row.awards.map(function (_, k) {
      return '<path class="award-star" d="' + starPath(sx0 + k * gap, by - STAR - 6, STAR) + '"/>';
    }).join('');
    parts.push('<g class="candle-awards" style="animation-delay:' + delay + '">' + stars + '</g>');
  });

  /* Close-price trend line + area fill */
  var linePts = candles.map(function (c, i) { return { x: cx(i), y: y(c.close) }; });
  var lineD = linePts.map(function (p, i) {
    return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
  }).join(' ');

  parts.push(
    '<defs><linearGradient id="careerFade" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="hsl(45,100%,72%)" stop-opacity="0.22"/>' +
      '<stop offset="100%" stop-color="hsl(45,100%,72%)" stop-opacity="0"/>' +
    '</linearGradient></defs>'
  );
  parts.push('<path class="trend-area" d="' + lineD + ' L' + linePts[linePts.length - 1].x.toFixed(1) +
             ' ' + (PAD.t + plotH) + ' L' + linePts[0].x.toFixed(1) + ' ' + (PAD.t + plotH) + ' Z"/>');
  parts.push('<path class="trend" d="' + lineD + '"/>');

  /* Marker on the most recent point */
  var last = linePts[linePts.length - 1];
  parts.push('<circle class="last-halo" cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="6"/>');
  parts.push('<circle class="last-dot" cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="3.5"/>');

  /* Year labels along the bottom — thinned out on narrow charts */
  var everyN = rows.length > 10 ? 2 : 1;
  rows.forEach(function (row, i) {
    if (i % everyN !== 0 && i !== rows.length - 1) return;
    parts.push('<text class="axis-text" x="' + cx(i).toFixed(1) + '" y="' + (H - 8) +
               '" text-anchor="middle">' + row.year + '</text>');
  });

  /* Crosshair + one invisible hit-strip per year */
  parts.push('<line class="crosshair" data-cross-v y1="' + PAD.t + '" y2="' + (PAD.t + plotH) + '" x1="0" x2="0"/>');
  parts.push('<line class="crosshair" data-cross-h x1="' + PAD.l + '" x2="' + (W - PAD.r) + '" y1="0" y2="0"/>');

  candles.forEach(function (c, i) {
    parts.push('<rect class="hit" data-hit="' + i + '" x="' + (PAD.l + step * i).toFixed(1) +
               '" y="' + PAD.t + '" width="' + step.toFixed(1) + '" height="' + plotH + '"/>');
  });

  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = parts.join('');

  /* Give the trend line its dash length so the draw animation works. */
  var trend = $('.trend', svg);
  if (trend && trend.getTotalLength) trend.style.setProperty('--len', trend.getTotalLength());

  /* --- Headline quote above the chart --- */
  var first = rows[0].value;
  var latest = rows[rows.length - 1].value;
  var change = ((latest - first) / first) * 100;
  var up = change >= 0;

  var lastEl  = $('[data-career-last]');
  var deltaEl = $('[data-career-delta]');
  if (lastEl) lastEl.textContent = latest.toFixed(2);
  if (deltaEl) deltaEl.textContent = (up ? '▲ +' : '▼ ') + change.toFixed(1) + '%  since ' + rows[0].year;
  [lastEl, deltaEl].forEach(function (el) {
    if (el) el.style.color = up ? 'var(--gain)' : 'var(--loss)';
  });

  /* --- Crosshair + tooltip --- */
  var tip     = $('[data-career-tip]');
  var crossV  = $('[data-cross-v]', svg);
  var crossH  = $('[data-cross-h]', svg);
  var tipYear = $('[data-tip-year]');
  var tipLbl  = $('[data-tip-label]');
  var tipNote = $('[data-tip-note]');
  var tipAwd  = $('[data-tip-awards]');
  var tipLogo = $('[data-tip-logo]');
  var tipLogoBox = $('[data-tip-logo-box]');
  var tipKind = $('[data-tip-kind]');

  var show = function (i, clientX) {
    var c = candles[i];
    if (!c) return;

    wrap.classList.add('live');

    var px = cx(i);
    var py = y(c.close);
    if (crossV) { crossV.setAttribute('x1', px); crossV.setAttribute('x2', px); }
    if (crossH) { crossH.setAttribute('y1', py); crossH.setAttribute('y2', py); }

    if (tipYear) {
      tipYear.textContent = (c.row.range || c.row.year) +
        (c.row.months ? '  ·  ' + c.row.months + ' mo' : '');
    }
    if (tipLbl)  tipLbl.textContent  = c.row.label;
    if (tipNote) tipNote.textContent = c.row.note;

    if (tipLogo && tipLogoBox) {
      tipLogoBox.hidden = !c.row.logo;
      if (c.row.logo) tipLogo.src = c.row.logo;
      tipLogoBox.classList.toggle('bleed', c.row.bleed);
    }

    if (tipKind) {
      var study = c.row.kind === 'study';
      tipKind.textContent = study ? 'Study' : 'Work';
      tipKind.dataset.kind = study ? 'study' : 'work';
    }
    if (tipAwd) {
      tipAwd.textContent = '';
      c.row.awards.forEach(function (a) {
        /* "Name (years)" — the years drop to their own quiet line rather than
           wrapping into the middle of the title. */
        var m = a.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
        var line = document.createElement('span');

        var star = document.createElement('i');
        star.textContent = '\u2605';
        var name = document.createElement('b');
        name.textContent = m ? m[1] : a;
        line.appendChild(star);
        line.appendChild(name);

        if (m) {
          var when = document.createElement('em');
          when.textContent = m[2];
          line.appendChild(when);
        }
        tipAwd.appendChild(line);
      });
      tipAwd.hidden = !c.row.awards.length;
    }

    if (tip) {
      /* Position in CSS pixels, flipping near the right edge. */
      var rect = wrap.getBoundingClientRect();
      var left = ((px / W) * rect.width);
      var topPx = ((py / H) * rect.height);
      var tw = tip.offsetWidth || 190;
      if (left + tw + 16 > rect.width) left -= tw + 14; else left += 14;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top  = Math.max(0, topPx - 20) + 'px';
      tip.classList.add('show');
    }
  };

  var hide = function () {
    wrap.classList.remove('live');
    if (tip) tip.classList.remove('show');
  };

  $$('.hit', svg).forEach(function (hit) {
    var i = parseInt(hit.dataset.hit, 10);
    hit.addEventListener('mouseenter', function (e) { show(i, e.clientX); });
    hit.addEventListener('focus', function () { show(i); });
  });

  wrap.addEventListener('mouseleave', hide);

  /* Touch: drag across the chart to scrub through the years. */
  wrap.addEventListener('touchstart', function (e) { scrub(e); }, { passive: true });
  wrap.addEventListener('touchmove',  function (e) { scrub(e); }, { passive: true });
  wrap.addEventListener('touchend', hide, { passive: true });

  function scrub(e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    var rect = wrap.getBoundingClientRect();
    var rel = (t.clientX - rect.left) / rect.width;      /* 0–1 across the wrapper */
    var xInView = rel * W;
    var i = Math.floor((xInView - PAD.l) / step);
    if (i >= 0 && i < candles.length) show(i);
  }
})();


/* --------------------------------------------------------------------------
   17. LOCAL CLOCK
   Boston time, beside the availability line in the sidebar. The label is
   plain HTML — edit it there, not here.
   -------------------------------------------------------------------------- */
(function () {
  var clock = $('[data-clock]');
  if (!clock) return;

  var timeEls = $$('[data-clock-time]');

  var fmt = null;
  try {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (err) {
    fmt = null;   /* very old browser — fall back to local time */
  }

  var tick = function () {
    var now = new Date();
    var h, m, s;

    if (fmt) {
      var parts = {};
      fmt.formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
      h = parseInt(parts.hour, 10);
      m = parseInt(parts.minute, 10);
      s = parts.second;
    } else {
      h = now.getHours();
      m = now.getMinutes();
      s = String(now.getSeconds()).padStart(2, '0');
    }

    var text = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    timeEls.forEach(function (el) { el.textContent = text; });
  };

  tick();
  setInterval(tick, 1000);
})();


/* --------------------------------------------------------------------------
   19. 3D AVATAR
   Three behaviours in one element:
     a) docked  — the stack turns to face the cursor, with an idle float
     b) drag    — press and move to pop it out of the sidebar and carry it
     c) throw   — release with speed and it flies, bouncing off the edges
   Double-click (or the command palette) sends it home.
   -------------------------------------------------------------------------- */
var resetAvatar;   /* exposed for the command palette */

(function () {
  var av = $('[data-avatar]');
  if (!av) return;

  var stage  = $('[data-av-stage]', av);
  var shadow = $('[data-av-shadow]', av);
  if (!stage) return;

  /* ---- tunables ---------------------------------------------------------- */
  var MAX_TILT = 17;     /* degrees the stack turns at full deflection */
  var REACH    = 480;    /* px of cursor distance that maps to full tilt */
  var EASE     = 0.12;   /* how fast the tilt catches up (0–1) */
  var FRICTION = 0.94;   /* velocity retained per frame after a throw */
  var BOUNCE   = 0.68;   /* velocity retained when it hits an edge */
  var STOP     = 0.25;   /* px/frame below which motion stops */

  /* ---- state ------------------------------------------------------------- */
  var tilt = { x: 0, y: 0 };      /* current, rendered */
  var want = { x: 0, y: 0 };      /* target, from the cursor */
  var pos  = { x: 0, y: 0 };      /* page position while free */
  var vel  = { x: 0, y: 0 };
  var free = false, dragging = false, thrown = false;
  var grab = { x: 0, y: 0 };
  var last = { x: 0, y: 0, t: 0 };
  var bobT = Math.random() * 1000;

  var size = function () { return av.offsetWidth || 88; };

  /* ---- cursor → target tilt ---------------------------------------------- */
  var pointDesire = function (clientX, clientY) {
    var r = av.getBoundingClientRect();
    var dx = clientX - (r.left + r.width / 2);
    var dy = clientY - (r.top + r.height / 2);
    var clamp = function (n) { return Math.max(-1, Math.min(1, n)); };
    want.y =  clamp(dx / REACH) * MAX_TILT;   /* rotateY follows horizontal */
    want.x = -clamp(dy / REACH) * MAX_TILT;   /* rotateX follows vertical */
  };

  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      if (dragging) return;
      pointDesire(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('mouseout', function (e) {
      if (e.relatedTarget) return;        /* left the window entirely */
      want.x = 0; want.y = 0;
    });
  }

  /* ---- render loop ------------------------------------------------------- */
  var render = function () {
    /* Ease the tilt toward the target. */
    tilt.x += (want.x - tilt.x) * EASE;
    tilt.y += (want.y - tilt.y) * EASE;

    /* Idle float, only while it's sitting still and docked. */
    var bob = 0;
    if (!dragging && !free && !reduceMotion) {
      bobT += 0.016;
      bob = Math.sin(bobT) * 3;
    }

    stage.style.setProperty('--rx', tilt.x.toFixed(2));
    stage.style.setProperty('--ry', tilt.y.toFixed(2));
    stage.style.setProperty('--bob', bob.toFixed(2));

    /* The contact shadow leans and shrinks with the avatar. */
    if (shadow) {
      shadow.style.setProperty('--sx', (tilt.y * 0.45).toFixed(2));
      shadow.style.setProperty('--ss', (1 - Math.abs(tilt.y) / 90).toFixed(3));
    }

    /* Inertia after a throw. */
    if (thrown && !dragging) {
      pos.x += vel.x;
      pos.y += vel.y;
      vel.x *= FRICTION;
      vel.y *= FRICTION;

      var s = size();
      var maxX = window.innerWidth - s;
      var maxY = window.innerHeight - s;
      var hit = false;

      if (pos.x < 0)      { pos.x = 0;    vel.x = -vel.x * BOUNCE; hit = true; }
      if (pos.x > maxX)   { pos.x = maxX; vel.x = -vel.x * BOUNCE; hit = true; }
      if (pos.y < 0)      { pos.y = 0;    vel.y = -vel.y * BOUNCE; hit = true; }
      if (pos.y > maxY)   { pos.y = maxY; vel.y = -vel.y * BOUNCE; hit = true; }

      if (hit && Math.abs(vel.x) + Math.abs(vel.y) > 2) bump();

      place();
      if (Math.abs(vel.x) < STOP && Math.abs(vel.y) < STOP) thrown = false;
    }

    requestAnimationFrame(render);
  };

  var place = function () {
    av.style.setProperty('--x', pos.x.toFixed(1) + 'px');
    av.style.setProperty('--y', pos.y.toFixed(1) + 'px');
  };

  var bump = function () {
    av.classList.remove('bump');
    void av.offsetWidth;              /* restart the squash animation */
    av.classList.add('bump');
  };

  /* ---- pop out of the sidebar -------------------------------------------- */
  var popOut = function () {
    if (free) return;
    var r = av.getBoundingClientRect();
    pos.x = r.left;
    pos.y = r.top;
    free = true;
    av.classList.add('free', 'moved');
    av.classList.remove('homing');
    place();
  };

  /* ---- send it home ------------------------------------------------------ */
  resetAvatar = function () {
    if (!free) return;
    thrown = false;
    vel.x = vel.y = 0;

    /* Animate back to the empty slot, then drop out of fixed positioning. */
    var slot = av.parentElement;
    var target = slot ? slot.getBoundingClientRect() : null;

    if (target && !reduceMotion) {
      av.classList.add('homing');
      pos.x = target.left;
      pos.y = target.top;
      place();
      setTimeout(function () {
        av.classList.remove('free', 'homing');
        av.style.removeProperty('--x');
        av.style.removeProperty('--y');
        free = false;
      }, 560);
    } else {
      av.classList.remove('free', 'homing');
      av.style.removeProperty('--x');
      av.style.removeProperty('--y');
      free = false;
    }
  };

  /* ---- drag -------------------------------------------------------------- */
  var started = false;

  av.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    started = true;
    dragging = false;
    grab.x = e.clientX;
    grab.y = e.clientY;
    last.x = e.clientX;
    last.y = e.clientY;
    last.t = e.timeStamp;
    thrown = false;
    vel.x = vel.y = 0;
    av.setPointerCapture(e.pointerId);
  });

  av.addEventListener('pointermove', function (e) {
    if (!started) return;

    if (!dragging) {
      /* Wait for a real drag before hijacking the pointer. */
      if (Math.abs(e.clientX - grab.x) + Math.abs(e.clientY - grab.y) < 5) return;
      dragging = true;

      var r = av.getBoundingClientRect();
      grab.x = e.clientX - r.left;      /* where inside the avatar they grabbed */
      grab.y = e.clientY - r.top;
      popOut();
    }

    pos.x = e.clientX - grab.x;
    pos.y = e.clientY - grab.y;
    place();

    /* Lean into the direction of travel. */
    var dt = Math.max(1, e.timeStamp - last.t);
    vel.x = (e.clientX - last.x) / dt * 16;
    vel.y = (e.clientY - last.y) / dt * 16;
    want.y = Math.max(-MAX_TILT, Math.min(MAX_TILT, vel.x * 1.6));
    want.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, -vel.y * 1.6));

    last.x = e.clientX;
    last.y = e.clientY;
    last.t = e.timeStamp;
  });

  var release = function (e) {
    if (!started) return;
    started = false;
    try { av.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }

    if (!dragging) return;
    dragging = false;

    /* Flag the drag so the click that follows doesn't also flip the card. */
    av.dataset.dragged = '1';
    setTimeout(function () { delete av.dataset.dragged; }, 60);

    /* Cap the throw so it can't rocket off. */
    var cap = 42;
    vel.x = Math.max(-cap, Math.min(cap, vel.x));
    vel.y = Math.max(-cap, Math.min(cap, vel.y));
    thrown = Math.abs(vel.x) + Math.abs(vel.y) > STOP;

    want.x = want.y = 0;
  };

  av.addEventListener('pointerup', release);
  av.addEventListener('pointercancel', release);

  /* ---- send home ---------------------------------------------------------- */
  av.addEventListener('dblclick', function (e) { e.preventDefault(); resetAvatar(); });

  av.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetAvatar(); }
  });

  /* Keep it on screen if the window is resized while it's loose. */
  window.addEventListener('resize', function () {
    if (!free) return;
    var s = size();
    pos.x = Math.max(0, Math.min(window.innerWidth - s, pos.x));
    pos.y = Math.max(0, Math.min(window.innerHeight - s, pos.y));
    place();
  });

  requestAnimationFrame(render);
})();


/* --------------------------------------------------------------------------
   20. PHOTO → MEMOJI FLIP
   The card turns itself over every few seconds so both faces get seen,
   hovering brings the Memoji up on demand, and a click pins whichever
   side you want to keep.
   -------------------------------------------------------------------------- */
var toggleAvatarFace;   /* exposed for the command palette */

(function () {
  var av   = $('[data-avatar]');
  var card = $('[data-av-flip]');
  if (!av || !card) return;

  var CYCLE = 5000;          /* EDIT: ms each side holds during the idle turn */

  var showingBack = false;   /* which side is up */
  var pinned = false;        /* click locks a side */
  var hovering = false;
  var flipTimer, cycleTimer;

  var setFace = function (back) {
    if (back === showingBack) return;
    showingBack = back;

    av.style.setProperty('--flip', back ? 1 : 0);

    /* Retrigger the blur + flare. */
    av.classList.remove('flipping');
    void av.offsetWidth;
    av.classList.add('flipping');
    clearTimeout(flipTimer);
    flipTimer = setTimeout(function () { av.classList.remove('flipping'); }, 900);
  };

  /* --- the idle turn: keeps going unless something else owns the card ---
     A pin, a hover or a backgrounded tab all hold it where it is; the
     interval keeps its own phase so the rhythm survives an interruption. */
  var startCycle = function () {
    if (reduceMotion || cycleTimer) return;
    cycleTimer = setInterval(function () {
      if (pinned || hovering || document.hidden) return;
      setFace(!showingBack);
    }, CYCLE);
  };

  /* A click means "keep this side up". Pin state drives the face directly:
     pinned = Memoji, unpinned = back to the idle turn from the photo. */
  toggleAvatarFace = function () {
    pinned = !pinned;
    av.classList.toggle('pinned', pinned);
    setFace(pinned);
  };

  /* --- hover holds the Memoji, unless a side is pinned --- */
  if (window.matchMedia('(pointer: fine)').matches) {
    av.addEventListener('mouseenter', function () {
      hovering = true;
      if (!pinned) setFace(true);
    });
    av.addEventListener('mouseleave', function () {
      hovering = false;
      if (!pinned) setFace(false);
    });
  }

  /* --- click pins; but never right after a drag --- */
  av.addEventListener('click', function (e) {
    if (av.dataset.dragged === '1') return;   /* set by the drag module */
    e.preventDefault();
    toggleAvatarFace();
  });

  /* --- keyboard --- */
  av.addEventListener('keydown', function (e) {
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleAvatarFace(); }
  });

  /* A beat after load, so the first turn isn't mid-entrance. */
  setTimeout(startCycle, 1200);
})();
