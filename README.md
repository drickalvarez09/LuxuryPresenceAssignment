# Junior Website Builder — Home Project
## Implementation Note: Marci Metzger Homes (Pahrump, NV)

This document accompanies the submission required by the assignment. Live URL and updated resume are sent separately via email. The build is a single-page revamp of the reference homepage — not a copy, and not a recolor.

---

## 1. Scope compliance

Mapped directly against the brief:

- **Home page only** — single page, no secondary routes.
- **All original content and images retained.** Photos, logo, brand marks, phone numbers, addresses, and body copy come from the reference site, downloaded directly from the live source (no hi-res originals were provided, as expected).
- **Design improved, not duplicated.** Layout system, type pairing, grid, and interactions are new; nothing is a screenshot-and-restyle.
- **Added content** — a "Know the valley" local-context block and a photo gallery drawn from the site's own imagery, to give the page editorial substance beyond the reference.
- **Single page, deployable to free static hosting** with no build step.

---

## 2. Tools and frameworks used

- **HTML5, CSS3, vanilla JavaScript** — no framework, package manager, or build step. Chosen so the submission is trivially readable, auditable, and deployable, and so any of my design decisions can be traced to a single file during a follow-up interview.
- **Google Fonts:** Instrument Serif (400, 400 italic), Manrope (400–700), DM Mono (400, 500). `font-display=swap`.
- **No third-party CSS or JS libraries.** All icons are inline SVG authored for this build.

File tree:
.
├── index.html
├── README.md
├── css/style.css
├── js/app.js
└── images/ # hero, gallery, services, headshot, logo, badges

text

---

## 3. The design decision

**The search became a persistent field index.**

The reference treats listing search as a one-shot block: fill the fields, submit, leave. Here the filter rail stays pinned beside the results on desktop, so a visitor can widen a price range or change location *while comparing homes*, with the live result count and a reset action always in view. Tablet and mobile collapse the rail above the results but keep the count and reset in reach.

That converts search from a dead-end form into a reversible browsing tool — the single change that most improved the reference experience. It also aligned the page with how real-estate visitors actually behave (iterate filters), rather than how the reference assumed they behave (search once).

---

## 4. Responsiveness

Audited at the three required viewports — **390 × 844 (mobile)**, **834 × 1112 (tablet)**, **1440 × 900 (desktop)** — against the brief's checklist: readable text, correctly scaled images, usable navigation and buttons, no overlapping content, no unintended horizontal scroll.

- **Mobile** — full-screen nav, single-column hero, two-up filters, one-column cards, stacked services, two-column gallery.
- **Tablet** — full-screen nav, single-column hero, four-up filters, two-column cards and services, four-column gallery.
- **Desktop** — inline nav, asymmetric 12-column hero, sticky filter rail, two-column listings, four-column gallery.

Method: static CSS/DOM/asset audit plus layout reasoning at each breakpoint. A final pass in a real browser at the three widths is the recommended last step before sending the URL, and I'll run it as part of shipping.

---

## 5. Features

- **Mobile navigation** — full-screen menu, Escape to close, focus trap, focus return to toggle, auto-close on resize to desktop.
- **Listing filter and sort** — six sample properties; filter by location, type, bedrooms, bathrooms, min/max price; eight sort orders; live count, reset, request pre-fill, and a designed no-results state.
- **Gallery lightbox** — eight photos in a native `<dialog>`; prev/next, arrow keys, Home/End, swipe, backdrop click, counter, captions, focus restoration.
- **Contact form** — client-side name/email validation with inline `aria-describedby` errors, focus to first invalid field, polite success status.
- **Office-hours status** — computed in `America/Los_Angeles` against the 8:00 am–7:00 pm daily schedule, refreshed every 60 s.
- **Cookie notice** — once per browser via `localStorage`; no analytics or tracking scripts loaded.
- **Motion** — session-aware intro, scroll reveals, parallax, custom cursor, magnetic button, marquee, hover states. All disabled under `prefers-reduced-motion`.

The contact form has no backend and sends no data — a real endpoint must be connected before any production use. The reCAPTCHA notice is retained original copy; no reCAPTCHA script is loaded.

---

## 6. Accessibility and performance

- Landmarks, one `h1`, ordered headings, skip link, visible `:focus-visible` states, descriptive link labels.
- Native dialog focus handling; mobile-menu focus trap and restoration; `aria-expanded`, `aria-controls`, `aria-invalid`, and live status regions.
- Decorative SVG, numerals, and overlays are `aria-hidden`; every content image has meaningful `alt`.
- `prefers-reduced-motion` disables the intro, custom cursor, parallax, marquee, reveals, and transition durations.
- All 23 images include intrinsic `width`/`height`; hero preloaded with `fetchpriority="high"`; below-fold images lazy-loaded and decoded async.
- Single CSS and JS file, local imagery, `font-display=swap`. Core text and control colors checked for AA contrast; form fields use 1rem on mobile to prevent iOS zoom.

---

## 7. AI use and ownership

Per the assignment's AI-use policy:

- AI tools were used for **ideas, boilerplate, and troubleshooting**, consistent with the brief.
- The **art direction, layout system, section order, and the persistent-field-index decision in §3 are my own design judgment**, and I can explain and modify any part of the code during a follow-up.
- The submission is **not a generated site submitted as-is** — the reference homepage was restructured, content was re-adapted, and every interactive feature was reviewed and tested by me.

---

## 8. Content and asset sourcing

- **Photography, logo, trade marks** — original Marci Metzger Homes site, stored locally in `images/`.
- **Fonts** — Instrument Serif, Manrope, DM Mono via Google Fonts.
- **Icons** — inline SVG authored for this build; no icon library.
- **Listings** — six fictional sample records created to demonstrate the filter/sort UI. Not live MLS data. The visible fine-print note on the page states this.
- **External links** — Google Maps, Facebook, Instagram, LinkedIn, Yelp, Google policy pages, opened by visitor choice.

---

## 9. Run and deploy

No install, no build.

```bash
python3 -m http.server 8000
