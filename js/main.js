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
     6.  competency radar
     7.  skill bars
     8.  card tilt + spotlight
     9.  testimonials modal
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

    $$('.service-item, .metric-card, .cert-card, .timeline-item, .skills-item', block)
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
   6. COMPETENCY RADAR
   Rings, spokes, the value polygon, and labels are all drawn from the
   <li data-label data-value> entries in the markup.
   -------------------------------------------------------------------------- */
(function () {
  var svg = $('[data-radar]');
  var data = $('[data-radar-data]');
  if (!svg || !data) return;

  var axes = $$('li', data).map(function (li) {
    return {
      label: li.dataset.label || '',
      value: Math.max(0, Math.min(100, parseFloat(li.dataset.value) || 0))
    };
  });
  if (axes.length < 3) return;

  var CX = 200, CY = 150, R = 100;
  var n = axes.length;

  /* Angle for axis i, starting at 12 o'clock and going clockwise. */
  var angle = function (i) { return (Math.PI * 2 * i) / n - Math.PI / 2; };
  var point = function (i, r) {
    return {
      x: CX + Math.cos(angle(i)) * r,
      y: CY + Math.sin(angle(i)) * r
    };
  };

  var parts = [];

  /* Rings at 25 / 50 / 75 / 100% */
  [0.25, 0.5, 0.75, 1].forEach(function (f) {
    var d = axes.map(function (_, i) {
      var p = point(i, R * f);
      return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    }).join(' ') + ' Z';
    parts.push('<path class="ring" d="' + d + '"/>');
  });

  /* Spokes */
  axes.forEach(function (_, i) {
    var p = point(i, R);
    parts.push('<line class="spoke" x1="' + CX + '" y1="' + CY + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) + '"/>');
  });

  /* Value polygon */
  var shape = axes.map(function (a, i) {
    var p = point(i, R * (a.value / 100));
    return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
  }).join(' ') + ' Z';
  parts.push('<path class="shape" d="' + shape + '"/>');

  /* Vertex dots */
  axes.forEach(function (a, i) {
    var p = point(i, R * (a.value / 100));
    parts.push('<circle class="dot" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3"/>');
  });

  /* Labels, nudged outward and aligned by which side they sit on */
  axes.forEach(function (a, i) {
    var p = point(i, R + 24);
    var cos = Math.cos(angle(i));
    var anchor = Math.abs(cos) < 0.25 ? 'middle' : (cos > 0 ? 'start' : 'end');
    parts.push(
      '<text class="axis-label" x="' + p.x.toFixed(1) + '" y="' + p.y.toFixed(1) + '" text-anchor="' + anchor + '">' + a.label + '</text>' +
      '<text class="axis-value" x="' + p.x.toFixed(1) + '" y="' + (p.y + 13).toFixed(1) + '" text-anchor="' + anchor + '">' + a.value + '</text>'
    );
  });

  svg.innerHTML = parts.join('');
})();


/* --------------------------------------------------------------------------
   7. SKILL BARS — width and the percentage label both come from data-level.
   -------------------------------------------------------------------------- */
(function () {
  var items = $$('.skills-item');
  if (!items.length) return;

  items.forEach(function (item) {
    var level = Math.max(0, Math.min(100, parseFloat(item.dataset.level) || 0));
    var label = $('data', item);
    var fill  = $('.skill-progress-fill', item);
    if (label) { label.textContent = level + '%'; label.setAttribute('value', level); }
    if (fill)  item.dataset.target = level;
  });

  var section = $('.skill');
  if (!section) return;

  var run = function () {
    items.forEach(function (item) {
      var fill = $('.skill-progress-fill', item);
      if (fill) fill.style.width = (item.dataset.target || 0) + '%';
    });
  };

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run();
        io.disconnect();
      });
    }, { threshold: 0.25 });
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

  var cards = $$('.service-item, .metric-card, .cert-card, .testimonials-item .content-card');
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
   9. TESTIMONIALS MODAL
   -------------------------------------------------------------------------- */
(function () {
  var items = $$('[data-testimonials-item]');
  var container = $('[data-modal-container]');
  if (!container || !items.length) return;

  var modalImg      = $('[data-modal-img]');
  var modalTitle    = $('[data-modal-title]');
  var modalSubtitle = $('[data-modal-subtitle]');
  var modalText     = $('[data-modal-text]');

  var toggle = function () { container.classList.toggle('active'); };

  items.forEach(function (item) {
    item.addEventListener('click', function () {
      var avatar   = $('[data-testimonials-avatar]', item);
      var title    = $('.testimonials-item-title', item);
      var subtitle = $('.testimonials-item-subtitle', item);
      var text     = $('.testimonials-text', item);

      if (avatar && modalImg) { modalImg.src = avatar.src; modalImg.alt = avatar.alt; }
      if (title && modalTitle)       modalTitle.textContent = title.textContent;
      if (subtitle && modalSubtitle) modalSubtitle.textContent = subtitle.textContent;
      if (text && modalText)         modalText.innerHTML = text.innerHTML;

      toggle();
    });
  });

  on($$('[data-modal-close-btn], [data-overlay]'), 'click', toggle);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && container.classList.contains('active')) toggle();
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
  var FALLBACK_EMAIL = 'you@example.com';

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

    fetch(action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        form.reset();
        setStatus('Thanks — your message is on its way.');
        toast('Message sent');
      })
      .catch(function () {
        setStatus('Something went wrong. Email me at ' + FALLBACK_EMAIL + '.', true);
        btn.disabled = false;
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

  /* --- Swipe left/right to change panel (touch) --- */
  if (content) {
    var startX = 0, startY = 0, tracking = false, dragging = false;
    var THRESHOLD = 60;   /* px before a swipe counts */
    var SLOP = 14;        /* px before we decide it's horizontal */

    content.addEventListener('touchstart', function (e) {
      /* Ignore swipes that begin inside a horizontally scrolling strip. */
      if (e.target.closest('.has-scrollbar, .cmdk, .modal-container')) return;
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
    if ($('.cmdk.active') || $('.modal-container.active')) return;

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
    print:  '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M8 17h8v4H8z"/>'
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
        window.open('assets/files/resume.pdf', '_blank', 'noopener');
      } },
    { title: 'Open LinkedIn',               icon: icon.link,  run: function () {
        var a = $('.social-list a[href*="linkedin"]');
        if (a) window.open(a.href, '_blank', 'noopener');
      } },
    { title: 'Open GitHub',                 icon: icon.link,  run: function () {
        var a = $('.social-list a[href*="github"]');
        if (a) window.open(a.href, '_blank', 'noopener');
      } },
    { title: 'Print resume',                icon: icon.print, run: function () {
        goToPage('resume');
        setTimeout(function () { window.print(); }, 350);
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
