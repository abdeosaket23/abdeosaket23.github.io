# Personal portfolio site

A dark, single-page portfolio: sticky profile sidebar on the left, and a panel on
the right that switches between **About**, **Resume**, **Portfolio**, and
**Contact** without reloading. Plain HTML, CSS, and JavaScript — no build step,
no framework, no dependencies beyond Google Fonts.

Layout and design language follow the open-source
[vCard](https://github.com/codewithsadee/vcard-personal-portfolio) template
(MIT), rewritten here from scratch with inline SVG icons instead of an icon CDN.

```
index.html          all the content — this is the file you edit
css/styles.css      theme tokens at the top, then layout
js/main.js          tabs, sidebar toggle, filters, modal, contact form
assets/img/         avatar, testimonial avatars, project thumbs, tool logos
assets/files/       drop resume.pdf here
404.html            styled not-found page
```

---

## Editing it

Every spot you need to change in `index.html` is marked with an `EDIT` comment.

| What | Where |
|---|---|
| Page title, description, social preview | `<head>` |
| Name and job title | `.sidebar-info` |
| Email, education, location rows | `.contacts-list` |
| Social links | `.social-list` and the sidebar |
| Bio paragraphs | `.about-text` |
| "My Expertise" cards | `.service-list` — duplicate a `<li class="service-item">` |
| Testimonials | `.testimonials-list` — duplicate a `<li class="testimonials-item">` |
| Tool logos | `.clients-list` |
| Education / experience entries | `.timeline-list` — duplicate a `<li class="timeline-item">` |
| Skill bars | `.skills-list` |
| Projects | `.project-list` — see below |
| Contact form | `.contact-form` |

Start with a find-and-replace across the whole file:

- `you@example.com` → your email
- `YOUR-HANDLE` → your LinkedIn handle
- `Saket Abdeo` → your name
- the bracketed blanks like `[Your Program]`, `[N]`, `[outcome]`

### Adding a project

Copy one `<li class="project-item">` and change four things:

```html
<li class="project-item active" data-filter-item data-category="web design">
  <a href="https://link-to-your-case-study" target="_blank" rel="noopener">
    <figure class="project-img">
      <div class="project-item-icon-box"> …eye icon, leave as-is… </div>
      <img src="assets/img/project-3.svg" alt="Project name" loading="lazy" />
    </figure>
    <h3 class="project-title">Project name</h3>
    <p class="project-category">Web Design</p>
  </a>
</li>
```

`data-category` drives the filters. The filter row (desktop) and the dropdown
(mobile) are both generated from whatever categories exist on the cards, so a new
category creates its own filter button automatically — nothing else to update.
Keep `class="active"` on new items so they show under "all", and keep the
`.project-category` text matching `data-category`.

### Swapping images

Files in `assets/img/` are SVG placeholders. Drop your real images in the same
folder and update the `src` (change the `.svg` extension to `.jpg`/`.png`):

- `my-avatar` — sidebar photo, square, ~400×400
- `avatar-1`, `avatar-2` — testimonial headshots, square, ~200×200
- `project-1` … `project-6` — 4:3 ratio, ~800×600
- `logo-1` … `logo-6` — tool logos, wide; they're greyscaled until hovered

Put your resume PDF at `assets/files/resume.pdf` and the download button works.

### Restyling

The top of `css/styles.css` is a block of custom properties — colours, gradients,
shadows, font sizes. The accent is `--orange-yellow-crayola` plus the two
`--bg-gradient-yellow-*` and `--text-gradient-yellow` values; change those four
and the whole site moves to a different colour. Type is Poppins, loaded from
Google Fonts in `index.html`.

---

## Making the contact form actually send

GitHub Pages serves static files only, so it can't process a form. Two options:

1. **Formspree (free tier).** Sign up at <https://formspree.io>, create a form,
   and paste the endpoint into `action=""` on `<form data-form>`.
2. **Do nothing.** Until that endpoint is set, submitting opens the visitor's
   email client pre-filled. Set `FALLBACK_EMAIL` in `js/main.js` to your address.

---

## Previewing locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Publishing on GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.

A repo only becomes a *user site* (served at `username.github.io`) when its name
matches the username exactly. Rename the repo to **`abdeosaket23.github.io`** for
the clean URL; any other name serves at
`abdeosaket23.github.io/<repo-name>/`, which works identically — every path in
this template is relative.

Custom domain? Add a `CNAME` file at the repo root containing just the domain,
then point a CNAME DNS record at `abdeosaket23.github.io`.

`.nojekyll` is included so GitHub serves the files as-is.

---

## License

MIT.
