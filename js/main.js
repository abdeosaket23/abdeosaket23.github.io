/* ==========================================================================
   main.js — nav, scroll reveal, portfolio filters, contact form.
   Nothing here needs editing for normal use; all content lives in index.html.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Current year in the footer ---------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Mobile menu ------------------------------------------------- */
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');

  if (nav && navToggle) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    // Close the menu after tapping a link.
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Header shadow on scroll ------------------------------------- */
  var header = document.getElementById('siteHeader');
  var onScroll = function () {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Highlight the nav link for the section you're viewing -------- */
  var sections = Array.prototype.slice.call(
    document.querySelectorAll('main section[id]')
  );
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav a[href^="#"]:not(.btn)')
  );

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Scroll reveal ----------------------------------------------- */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if ('IntersectionObserver' in window) {
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealables.forEach(function (el) { revealer.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- Portfolio filters ------------------------------------------- */
  /* Filter buttons are built from the data-category on each .project card,
     so adding a project with a new category adds its filter automatically. */
  var filtersEl  = document.getElementById('filters');
  var projectsEl = document.getElementById('projects');

  if (filtersEl && projectsEl) {
    var projects = Array.prototype.slice.call(projectsEl.querySelectorAll('.project'));
    var categories = [];

    projects.forEach(function (p) {
      var cat = (p.dataset.category || '').trim();
      if (cat && categories.indexOf(cat) === -1) categories.push(cat);
    });

    var makeButton = function (label, value, isActive) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter' + (isActive ? ' active' : '');
      btn.textContent = label;
      btn.dataset.filter = value;
      btn.setAttribute('aria-pressed', String(isActive));
      return btn;
    };

    filtersEl.appendChild(makeButton('All', '*', true));
    categories.forEach(function (cat) {
      filtersEl.appendChild(makeButton(cat, cat, false));
    });

    filtersEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;

      var value = btn.dataset.filter;

      Array.prototype.forEach.call(filtersEl.children, function (b) {
        var active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      projects.forEach(function (p) {
        p.hidden = !(value === '*' || p.dataset.category === value);
      });
    });
  }

  /* ---------- Contact form ------------------------------------------------ */
  /* If the Formspree endpoint hasn't been filled in yet, fall back to opening
     the visitor's email client so the form is never a dead end. */
  var form   = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');

  if (form) {
    // EDIT: your address — used only for the mailto fallback.
    var FALLBACK_EMAIL = 'you@example.com';

    var setStatus = function (msg, isError) {
      if (!status) return;
      status.textContent = msg;
      status.classList.toggle('error', !!isError);
    };

    form.addEventListener('submit', function (e) {
      var action = form.getAttribute('action') || '';
      var configured = action.indexOf('YOUR_FORM_ID') === -1 && /^https?:/.test(action);

      var data = new FormData(form);
      var name = (data.get('name') || '').toString();
      var email = (data.get('email') || '').toString();
      var message = (data.get('message') || '').toString();

      if (!configured) {
        e.preventDefault();
        var subject = encodeURIComponent('Website enquiry from ' + name);
        var body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
        window.location.href =
          'mailto:' + FALLBACK_EMAIL + '?subject=' + subject + '&body=' + body;
        setStatus('Opening your email app…');
        return;
      }

      e.preventDefault();
      setStatus('Sending…');

      fetch(action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          form.reset();
          setStatus('Thanks — your message is on its way.');
        })
        .catch(function () {
          setStatus('Something went wrong. Email me directly at ' + FALLBACK_EMAIL + '.', true);
        });
    });
  }
})();
