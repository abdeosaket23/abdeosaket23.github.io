/* ==========================================================================
   main.js — sidebar toggle, page tabs, testimonials modal, portfolio filter,
   contact form. Nothing here needs editing; content lives in index.html.
   ========================================================================== */
'use strict';

/* Attach one listener across a NodeList. */
var addEventOnElements = function (elements, type, callback) {
  Array.prototype.forEach.call(elements, function (el) {
    el.addEventListener(type, callback);
  });
};


/* --------------------------------------------------------------------------
   SIDEBAR — "Show Contacts" toggle (mobile / tablet only)
   -------------------------------------------------------------------------- */
var sidebar    = document.querySelector('[data-sidebar]');
var sidebarBtn = document.querySelector('[data-sidebar-btn]');

if (sidebar && sidebarBtn) {
  sidebarBtn.addEventListener('click', function () {
    var open = sidebar.classList.toggle('active');
    var label = sidebarBtn.querySelector('span');
    if (label) label.textContent = open ? 'Hide Contacts' : 'Show Contacts';
  });
}


/* --------------------------------------------------------------------------
   TESTIMONIALS MODAL
   -------------------------------------------------------------------------- */
var testimonialsItems = document.querySelectorAll('[data-testimonials-item]');
var modalContainer    = document.querySelector('[data-modal-container]');
var modalCloseBtn     = document.querySelector('[data-modal-close-btn]');
var overlay           = document.querySelector('[data-overlay]');

var modalImg      = document.querySelector('[data-modal-img]');
var modalTitle    = document.querySelector('[data-modal-title]');
var modalSubtitle = document.querySelector('[data-modal-subtitle]');
var modalText     = document.querySelector('[data-modal-text]');

var toggleModal = function () {
  if (!modalContainer) return;
  modalContainer.classList.toggle('active');
};

if (modalContainer) {
  addEventOnElements(testimonialsItems, 'click', function () {
    var avatar   = this.querySelector('[data-testimonials-avatar]');
    var title    = this.querySelector('[data-testimonials-title]');
    var subtitle = this.querySelector('[data-testimonials-subtitle]');
    var text     = this.querySelector('[data-testimonials-text]');

    if (avatar && modalImg) {
      modalImg.src = avatar.src;
      modalImg.alt = avatar.alt;
    }
    if (title && modalTitle)       modalTitle.textContent = title.textContent;
    if (subtitle && modalSubtitle) modalSubtitle.textContent = subtitle.textContent;
    if (text && modalText)         modalText.innerHTML = text.innerHTML;

    toggleModal();
  });

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', toggleModal);
  if (overlay)       overlay.addEventListener('click', toggleModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalContainer.classList.contains('active')) toggleModal();
  });
}


/* --------------------------------------------------------------------------
   PORTFOLIO FILTER
   Filter buttons and the mobile dropdown are both generated from the
   data-category on each project, so adding a project with a new category
   adds its filter automatically.
   -------------------------------------------------------------------------- */
var filterList   = document.querySelector('[data-filter-list]');
var selectList   = document.querySelector('[data-select-list]');
var selectBtn    = document.querySelector('[data-select]');
var selectValue  = document.querySelector('[data-select-value]');
var filterItems  = document.querySelectorAll('[data-filter-item]');

if (filterList && selectList && filterItems.length) {

  /* Collect the categories in the order they first appear. */
  var categories = [];
  Array.prototype.forEach.call(filterItems, function (item) {
    var cat = (item.dataset.category || '').trim().toLowerCase();
    if (cat && categories.indexOf(cat) === -1) categories.push(cat);
  });

  var applyFilter = function (value) {
    Array.prototype.forEach.call(filterItems, function (item) {
      var match = value === 'all' || value === item.dataset.category.toLowerCase();
      item.classList.toggle('active', match);
    });
  };

  /* --- Desktop filter buttons --- */
  ['all'].concat(categories).forEach(function (cat, i) {
    var li = document.createElement('li');
    li.className = 'filter-item';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = cat;
    btn.dataset.filterBtn = '';
    if (i === 0) btn.classList.add('active');

    li.appendChild(btn);
    filterList.appendChild(li);
  });

  /* --- Mobile dropdown --- */
  ['all'].concat(categories).forEach(function (cat) {
    var li = document.createElement('li');
    li.className = 'select-item';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = cat;
    btn.dataset.selectItem = '';

    li.appendChild(btn);
    selectList.appendChild(li);
  });

  if (selectValue) selectValue.textContent = 'all';

  var filterBtns = filterList.querySelectorAll('[data-filter-btn]');
  var lastClickedBtn = filterBtns[0];

  addEventOnElements(filterBtns, 'click', function () {
    var value = this.textContent.toLowerCase();
    if (selectValue) selectValue.textContent = this.textContent;
    applyFilter(value);

    if (lastClickedBtn) lastClickedBtn.classList.remove('active');
    this.classList.add('active');
    lastClickedBtn = this;
  });

  addEventOnElements(selectList.querySelectorAll('[data-select-item]'), 'click', function () {
    var value = this.textContent.toLowerCase();
    if (selectValue) selectValue.textContent = this.textContent;

    if (selectBtn) {
      selectBtn.classList.remove('active');
      selectBtn.setAttribute('aria-expanded', 'false');
      selectBtn.parentElement.classList.remove('active');
    }

    applyFilter(value);

    /* Keep the desktop buttons in sync. */
    Array.prototype.forEach.call(filterBtns, function (b) {
      var match = b.textContent.toLowerCase() === value;
      b.classList.toggle('active', match);
      if (match) lastClickedBtn = b;
    });
  });

  if (selectBtn) {
    selectBtn.addEventListener('click', function () {
      var open = this.classList.toggle('active');
      this.parentElement.classList.toggle('active', open);
      this.setAttribute('aria-expanded', String(open));
    });
  }
}


/* --------------------------------------------------------------------------
   CONTACT FORM
   -------------------------------------------------------------------------- */
var form       = document.querySelector('[data-form]');
var formInputs = document.querySelectorAll('[data-form-input]');
var formBtn    = document.querySelector('[data-form-btn]');
var formStatus = document.querySelector('[data-form-status]');

if (form && formBtn) {

  /* EDIT: your address — used only for the mailto fallback below. */
  var FALLBACK_EMAIL = 'you@example.com';

  /* Enable the button only once every field is valid. */
  addEventOnElements(formInputs, 'input', function () {
    formBtn.disabled = !form.checkValidity();
  });

  var setStatus = function (msg, isError) {
    if (!formStatus) return;
    formStatus.textContent = msg;
    formStatus.classList.toggle('error', !!isError);
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var action = form.getAttribute('action') || '';
    var configured = action.indexOf('YOUR_FORM_ID') === -1 && /^https?:/.test(action);
    var data = new FormData(form);

    if (!configured) {
      /* No backend wired up yet — hand off to the visitor's email client. */
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
    formBtn.disabled = true;

    fetch(action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        form.reset();
        setStatus('Thanks — your message is on its way.');
      })
      .catch(function () {
        setStatus('Something went wrong. Email me at ' + FALLBACK_EMAIL + '.', true);
        formBtn.disabled = false;
      });
  });
}


/* --------------------------------------------------------------------------
   PAGE TABS — About / Resume / Portfolio / Contact
   -------------------------------------------------------------------------- */
var navLinks = document.querySelectorAll('[data-nav-link]');
var pages    = document.querySelectorAll('[data-page]');

addEventOnElements(navLinks, 'click', function () {
  var clicked = this;
  var target = clicked.textContent.trim().toLowerCase();

  Array.prototype.forEach.call(pages, function (page) {
    page.classList.toggle('active', page.dataset.page === target);
  });

  Array.prototype.forEach.call(navLinks, function (link) {
    link.classList.toggle('active', link === clicked);
  });

  window.scrollTo(0, 0);
});
