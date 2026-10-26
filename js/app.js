/* ==========================================================================
   Marci Metzger Homes — interactions
   Vanilla JS, progressive enhancement. Every feature works without a build.
   ========================================================================== */

(() => {
  "use strict";

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  root.classList.add("js");

  const storage = {
    get(area, key) {
      try {
        return window[area].getItem(key);
      } catch (error) {
        return null;
      }
    },
    set(area, key, value) {
      try {
        window[area].setItem(key, value);
      } catch (error) {
        /* Storage can be unavailable in private or hardened browsers. */
      }
    },
  };

  const formatMoney = (value) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  const scrollToElement = (element, offset = 28) => {
    if (!element) return;
    const header = $("[data-header]");
    const headerHeight = header ? header.offsetHeight : 0;
    const top = element.getBoundingClientRect().top + window.scrollY - headerHeight - offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  };

  /* ----------------------------------------------------------------------
     Page intro
     ---------------------------------------------------------------------- */
  let motionStarted = false;
  const readyCallbacks = [];

  const onPageReady = (callback) => {
    if (motionStarted) callback();
    else readyCallbacks.push(callback);
  };

  const startMotion = () => {
    if (motionStarted) return;
    motionStarted = true;
    initCursor();
    initMagnetic();
    parallaxEnabled = finePointer.matches && !reduceMotion.matches;
    updateScroll();
    readyCallbacks.splice(0).forEach((callback) => callback());
  };

  const intro = $("[data-intro]");
  const pageRegions = [
    $(".skip-link"),
    $("[data-header]"),
    $("main"),
    $(".site-footer"),
  ].filter(Boolean);

  let introFinished = false;
  let introTimer = 0;

  const finishIntro = (remember = true) => {
    if (introFinished) return;
    introFinished = true;
    window.clearTimeout(introTimer);

    body.classList.remove("is-loading");
    body.classList.add("is-ready");
    pageRegions.forEach((region) => {
      region.inert = false;
    });

    if (intro) {
      intro.classList.add("is-leaving");
      window.setTimeout(() => intro.remove(), 950);
    }

    if (remember) storage.set("sessionStorage", "mm-intro-seen", "1");
    startMotion();
  };

  const showIntro = Boolean(
    intro &&
      !root.classList.contains("no-intro") &&
      !reduceMotion.matches &&
      !window.location.hash
  );

  if (showIntro) {
    body.classList.add("is-loading");
    pageRegions.forEach((region) => {
      region.inert = true;
    });
    intro.addEventListener("click", () => finishIntro(), { once: true });
    document.addEventListener(
      "keydown",
      (event) => {
        if (!introFinished && (event.key === "Escape" || event.key === "Enter")) {
          finishIntro();
        }
      },
      { passive: true }
    );
    introTimer = window.setTimeout(() => finishIntro(), 1350);
  } else {
    root.classList.add("no-intro");
    body.classList.add("is-ready");
    if (intro) intro.remove();
    introFinished = true;
    window.setTimeout(startMotion, 0);
  }

  /* ----------------------------------------------------------------------
     Header, scroll progress, active section, parallax
     ---------------------------------------------------------------------- */
  const header = $("[data-header]");
  const progress = $("[data-progress]");
  const parallaxItems = $$("[data-parallax]");
  const navLinks = $$(".site-nav__list a");
  const trackedSections = [
    ["home", $("#home")],
    ["listings", $("#listings")],
    ["about", $("#about")],
    ["services", $("#services")],
    ["gallery", $("#gallery")],
    ["lets-move", $("#lets-move")],
  ].filter(([, section]) => section);

  let parallaxEnabled = false;
  let scrollQueued = false;
  let activeSection = "";

  const updateParallax = () => {
    const viewportHeight = window.innerHeight;
    parallaxItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > viewportHeight + 120) return;
      const strong = item.dataset.parallax === "strong";
      const limit = strong ? 42 : 15;
      const center = rect.top + rect.height / 2 - viewportHeight / 2;
      const shift = Math.max(-limit, Math.min(limit, center * (strong ? -0.075 : -0.035)));
      item.style.setProperty("--py", `${shift.toFixed(1)}px`);
    });
  };

  const updateActiveSection = () => {
    if (!trackedSections.length) return;
    const marker = window.innerHeight * 0.36;
    let current = trackedSections[0][0];
    trackedSections.forEach(([id, section]) => {
      if (section.getBoundingClientRect().top <= marker) current = id;
    });
    if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) {
      current = trackedSections[trackedSections.length - 1][0];
    }
    if (current === activeSection) return;
    activeSection = current;
    navLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === `#${current}`;
      link.classList.toggle("is-active", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const updateScroll = () => {
    scrollQueued = false;
    const y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 24);

    if (progress) {
      const max = root.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      progress.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }

    updateActiveSection();
    if (parallaxEnabled) updateParallax();
  };

  const requestScrollUpdate = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScroll);
  };

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  window.addEventListener("load", requestScrollUpdate);

  /* ----------------------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------------------- */
  const nav = $("#primary-nav");
  const navToggle = $("[data-nav-toggle]");
  let menuOpen = false;
  let menuFocusTimer = 0;

  const menuFocusable = () => {
    if (!nav) return [];
    return [
      ...$$('a[href], button:not([disabled])', nav),
      ...(navToggle ? [navToggle] : []),
    ];
  };

  const openMenu = () => {
    if (!nav || !navToggle || menuOpen) return;
    menuOpen = true;
    nav.classList.add("is-open");
    header.classList.add("is-menu");
    body.classList.add("menu-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    window.clearTimeout(menuFocusTimer);
    menuFocusTimer = window.setTimeout(() => {
      const firstLink = $("a[href]", nav);
      if (firstLink) firstLink.focus({ preventScroll: true });
    }, 90);
  };

  const closeMenu = (restoreFocus = true) => {
    if (!nav || !navToggle || !menuOpen) return;
    menuOpen = false;
    window.clearTimeout(menuFocusTimer);
    nav.classList.remove("is-open");
    header.classList.remove("is-menu");
    body.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    if (restoreFocus) navToggle.focus({ preventScroll: true });
  };

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      if (menuOpen) closeMenu();
      else openMenu();
    });
  }

  if (nav) {
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
  }

  $$(".brand, .header-phone").forEach((link) => {
    link.addEventListener("click", () => {
      if (menuOpen) closeMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!menuOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = menuFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !focusable.includes(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !focusable.includes(active))) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (menuOpen && window.innerWidth > 1060) closeMenu(false);
  });

  /* ----------------------------------------------------------------------
     Listings
     ---------------------------------------------------------------------- */
  const LISTINGS = [
    {
      id: 6,
      addr: "2210 Desert Willow Dr",
      loc: "Mountain Falls",
      type: "House",
      price: 649000,
      bd: 4,
      ba: 3,
      sf: 2480,
      tag: "New",
      img: "images/g2.jpg",
      alt: "A warmly lit desert home with a pool at dusk",
      w: 1200,
      h: 600,
    },
    {
      id: 5,
      addr: "980 Quail Run Ct",
      loc: "Calvada Valley",
      type: "House",
      price: 389000,
      bd: 3,
      ba: 2,
      sf: 1760,
      tag: "Active",
      img: "images/s2.jpg",
      alt: "A modern white home with a lawn and mountains in the distance",
      w: 730,
      h: 730,
    },
    {
      id: 4,
      addr: "415 Mesquite Ridge Rd",
      loc: "Hafen Ranch",
      type: "House",
      price: 525000,
      bd: 4,
      ba: 3,
      sf: 2210,
      tag: "Active",
      img: "images/hero.jpg",
      alt: "A contemporary white residence with a reflecting pool at dusk",
      w: 1920,
      h: 1280,
    },
    {
      id: 3,
      addr: "77 Spring View Ln",
      loc: "Mountain Falls",
      type: "Townhome",
      price: 312000,
      bd: 2,
      ba: 2,
      sf: 1340,
      tag: "Pending",
      img: "images/g1.jpg",
      alt: "A light-filled kitchen and living space with a marble island",
      w: 1200,
      h: 600,
    },
    {
      id: 2,
      addr: "1305 Homestead Rd",
      loc: "Pahrump Valley",
      type: "Commercial",
      price: 875000,
      bd: 0,
      ba: 2,
      sf: 3900,
      tag: "Active",
      img: "images/s1.jpg",
      alt: "A bright commercial interior styled with a white table and greenery",
      w: 730,
      h: 730,
    },
    {
      id: 1,
      addr: "3320 Sagebrush Ave",
      loc: "Calvada Valley",
      type: "House",
      price: 279000,
      bd: 2,
      ba: 1,
      sf: 1120,
      tag: "Active",
      img: "images/g3.jpg",
      alt: "A set of house keys resting on a weathered wood table",
      w: 1200,
      h: 600,
    },
  ];

  const sortOptions = {
    new: (a, b) => b.id - a.id,
    old: (a, b) => a.id - b.id,
    pa: (a, b) => a.price - b.price,
    pd: (a, b) => b.price - a.price,
    bl: (a, b) => a.bd - b.bd,
    bh: (a, b) => b.bd - a.bd,
    al: (a, b) => a.ba - b.ba,
    ah: (a, b) => b.ba - a.ba,
  };

  const searchForm = $("#search");
  const results = $("#results");
  const resultCount = $("#count");
  const contactMessage = $("#contact-message");
  const contactForm = $("#contact");
  const contactName = $("#contact-name");
  let filterTimer = 0;

  const filterListings = () => {
    const data = new FormData(searchForm);
    const location = data.get("loc") || "";
    const type = data.get("type") || "";
    const beds = data.get("bd");
    const baths = data.get("ba");
    const min = Number(data.get("min")) || 0;
    const max = Number(data.get("max")) || 0;
    const sort = data.get("sort") || "new";

    return LISTINGS.filter((listing) => {
      if (location && listing.loc !== location) return false;
      if (type && listing.type !== type) return false;
      if (beds !== "" && beds !== null) {
        if (beds === "0") {
          if (listing.bd !== 0) return false;
        } else if (listing.bd < Number(beds)) return false;
      }
      if (baths && listing.ba < Number(baths)) return false;
      if (min && listing.price < min) return false;
      if (max && listing.price > max) return false;
      return true;
    }).sort(sortOptions[sort] || sortOptions.new);
  };

  const listingMarkup = (listing, index) => {
    const bedLabel = listing.bd ? `${listing.bd} bd` : listing.type === "Commercial" ? "—" : "Studio";
    return `<article class="listing" style="--i:${index}">
      <figure class="listing__media">
        <img src="${listing.img}" alt="${listing.alt}" width="${listing.w}" height="${listing.h}" loading="lazy" decoding="async">
        <span class="listing__tag">${listing.tag}</span>
        <span class="listing__num" aria-hidden="true">No. ${String(listing.id).padStart(2, "0")}</span>
      </figure>
      <div class="listing__body">
        <p class="listing__price">${formatMoney(listing.price)}</p>
        <h3 class="listing__addr">${listing.addr}</h3>
        <p class="listing__loc">${listing.loc} · ${listing.type}</p>
        <dl class="listing__specs">
          <div><dt>Beds</dt><dd>${bedLabel}</dd></div>
          <div><dt>Baths</dt><dd>${listing.ba}</dd></div>
          <div><dt>Sq ft</dt><dd>${listing.sf.toLocaleString("en-US")}</dd></div>
        </dl>
        <button class="listing__ask" type="button" data-ask="${listing.id}">
          Ask about this ${listing.type === "Commercial" ? "property" : "home"}
        </button>
      </div>
    </article>`;
  };

  const renderListings = (announce = false) => {
    if (!searchForm || !results || !resultCount) return;
    const list = filterListings();
    resultCount.textContent =
      list.length === 0
        ? "No homes found"
        : `${list.length} ${list.length === 1 ? "home" : "homes"} found`;

    results.innerHTML = list.length
      ? list.map(listingMarkup).join("")
      : `<div class="empty">
          <p>No homes match those filters. Try a wider price range or another location.</p>
          <button class="text-link" type="button" data-clear-filters>Clear filters</button>
        </div>`;

    if (announce) scrollToElement(resultCount);
  };

  const resetFilters = () => {
    if (!searchForm) return;
    searchForm.reset();
    renderListings();
    const locationSelect = searchForm.elements.loc;
    if (locationSelect) locationSelect.focus({ preventScroll: true });
  };

  if (searchForm) {
    const locationSelect = searchForm.elements.loc;
    if (locationSelect) {
      const locations = [...new Set(LISTINGS.map((listing) => listing.loc))];
      locationSelect.innerHTML =
        '<option value="">All locations</option>' +
        locations.map((location) => `<option>${location}</option>`).join("");
    }

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      window.clearTimeout(filterTimer);
      renderListings(true);
    });

    searchForm.addEventListener("change", () => {
      window.clearTimeout(filterTimer);
      renderListings();
    });

    $$("input", searchForm).forEach((input) => {
      input.addEventListener("input", () => {
        window.clearTimeout(filterTimer);
        filterTimer = window.setTimeout(() => renderListings(), 220);
      });
    });

    const resetButton = $("[data-reset]", searchForm);
    if (resetButton) resetButton.addEventListener("click", resetFilters);

    renderListings();
  }

  if (results) {
    results.addEventListener("click", (event) => {
      if (event.target.closest("[data-clear-filters]")) {
        resetFilters();
        return;
      }

      const askButton = event.target.closest("[data-ask]");
      if (!askButton) return;
      const listing = LISTINGS.find((item) => item.id === Number(askButton.dataset.ask));
      if (!listing) return;

      if (contactMessage) {
        contactMessage.value = `Hi Marci, I'd like more information about ${listing.addr} in ${listing.loc}, listed at ${formatMoney(listing.price)}.`;
      }

      const status = $("#formmsg");
      if (status) {
        status.textContent = "";
        status.removeAttribute("data-state");
      }

      scrollToElement($(".contact__form-wrap"));
      window.setTimeout(
        () => {
          if (contactName) contactName.focus({ preventScroll: true });
        },
        reduceMotion.matches ? 60 : 550
      );
    });
  }

  /* ----------------------------------------------------------------------
     Gallery viewer
     ---------------------------------------------------------------------- */
  const galleryButtons = $$(".gallery__item");
  const lightbox = $("#lightbox");

  if (galleryButtons.length && lightbox) {
    const lightboxImage = $("#lb-img");
    const lightboxCaption = $("#lb-caption");
    const lightboxCount = $("#lb-count");
    const closeButton = $("#lb-close");
    const previousButton = $("#lb-prev");
    const nextButton = $("#lb-next");
    let currentPhoto = 0;
    let lastTrigger = null;
    let touchStart = null;

    if (lightboxCaption) lightboxCaption.setAttribute("aria-live", "polite");
    if (lightboxCount) lightboxCount.setAttribute("aria-live", "polite");

    const photos = galleryButtons.map((button) => {
      const image = $("img", button);
      const caption = $(".gallery__caption", button);
      return {
        src: image ? image.getAttribute("src") : "",
        alt: image ? image.getAttribute("alt") : "",
        width: image ? image.getAttribute("width") : "",
        height: image ? image.getAttribute("height") : "",
        caption: caption ? caption.textContent.trim() : "",
        trigger: button,
      };
    });

    const pad = (number) => String(number).padStart(2, "0");

    const setPhoto = (index) => {
      currentPhoto = (index + photos.length) % photos.length;
      const photo = photos[currentPhoto];
      if (!photo || !lightboxImage) return;
      lightboxImage.src = photo.src;
      lightboxImage.alt = photo.alt;
      if (photo.width) lightboxImage.setAttribute("width", photo.width);
      if (photo.height) lightboxImage.setAttribute("height", photo.height);
      if (lightboxCaption) lightboxCaption.textContent = photo.caption;
      if (lightboxCount) lightboxCount.textContent = `${pad(currentPhoto + 1)} / ${pad(photos.length)}`;

      const nextPhoto = photos[(currentPhoto + 1) % photos.length];
      const previousPhoto = photos[(currentPhoto - 1 + photos.length) % photos.length];
      [nextPhoto, previousPhoto].forEach((item) => {
        if (!item) return;
        const preload = new Image();
        preload.src = item.src;
      });
    };

    const openLightbox = (index, trigger) => {
      lastTrigger = trigger || null;
      setPhoto(index);
      body.classList.add("lightbox-open");
      if (typeof lightbox.showModal === "function") {
        if (!lightbox.open) lightbox.showModal();
      } else {
        lightbox.setAttribute("open", "");
      }
    };

    const afterClose = () => {
      body.classList.remove("lightbox-open");
      const target = lastTrigger;
      lastTrigger = null;
      if (target) target.focus({ preventScroll: true });
    };

    const closeLightbox = () => {
      if (typeof lightbox.close === "function" && lightbox.open) {
        lightbox.close();
      } else {
        lightbox.removeAttribute("open");
        afterClose();
      }
    };

    galleryButtons.forEach((button, index) => {
      button.addEventListener("click", () => openLightbox(index, button));
    });

    if (closeButton) closeButton.addEventListener("click", closeLightbox);
    if (previousButton) previousButton.addEventListener("click", () => setPhoto(currentPhoto - 1));
    if (nextButton) nextButton.addEventListener("click", () => setPhoto(currentPhoto + 1));

    lightbox.addEventListener("close", afterClose);

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPhoto(currentPhoto - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setPhoto(currentPhoto + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setPhoto(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setPhoto(photos.length - 1);
      }
    });

    lightbox.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.changedTouches[0];
        touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
      },
      { passive: true }
    );

    lightbox.addEventListener(
      "touchend",
      (event) => {
        if (!touchStart) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        setPhoto(currentPhoto + (dx < 0 ? 1 : -1));
      },
      { passive: true }
    );
  }

  /* ----------------------------------------------------------------------
     Office hours — Pahrump is on Pacific time
     ---------------------------------------------------------------------- */
  const officeChip = $("[data-office-chip]");
  const officeStatus = $("#open");

  const pahrumpMinutes = () => {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
      const parts = formatter.formatToParts(new Date());
      const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
      const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
      return hour * 60 + minute;
    } catch (error) {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
  };

  const updateOfficeStatus = () => {
    const minutes = pahrumpMinutes();
    const isOpen = minutes >= 8 * 60 && minutes < 19 * 60;
    const chipText = isOpen ? "Open now · until 7:00 pm" : "Closed · opens daily at 8:00 am";
    const statusText = isOpen
      ? "Open now, until 7:00 pm."
      : "Closed now. Opens daily at 8:00 am.";

    if (officeChip && officeChip.textContent !== chipText) officeChip.textContent = chipText;
    if (officeStatus) {
      if (officeStatus.textContent !== statusText) officeStatus.textContent = statusText;
      officeStatus.dataset.state = isOpen ? "open" : "closed";
    }
  };

  updateOfficeStatus();
  window.setInterval(updateOfficeStatus, 60000);

  /* ----------------------------------------------------------------------
     Contact form validation
     ---------------------------------------------------------------------- */
  if (contactForm) {
    const nameInput = $("#contact-name");
    const emailInput = $("#contact-email");
    const nameError = $("#name-error");
    const emailError = $("#email-error");
    const formStatus = $("#formmsg");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const setFieldState = (input, errorElement, message) => {
      if (!input) return false;
      if (message) {
        input.setAttribute("aria-invalid", "true");
        if (errorElement) errorElement.textContent = message;
        return false;
      }
      input.removeAttribute("aria-invalid");
      if (errorElement) errorElement.textContent = "";
      return true;
    };

    const validateName = () => {
      const value = nameInput ? nameInput.value.trim() : "";
      return setFieldState(
        nameInput,
        nameError,
        value ? "" : "Please enter your name."
      );
    };

    const validateEmail = () => {
      const value = emailInput ? emailInput.value.trim() : "";
      if (!value) return setFieldState(emailInput, emailError, "Please enter your email address.");
      if (!emailPattern.test(value)) {
        return setFieldState(emailInput, emailError, "Please enter a valid email address.");
      }
      return setFieldState(emailInput, emailError, "");
    };

    if (nameInput) {
      nameInput.addEventListener("blur", validateName);
      nameInput.addEventListener("input", () => {
        if (nameInput.getAttribute("aria-invalid") === "true") validateName();
      });
    }

    if (emailInput) {
      emailInput.addEventListener("blur", validateEmail);
      emailInput.addEventListener("input", () => {
        if (emailInput.getAttribute("aria-invalid") === "true") validateEmail();
      });
    }

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const nameValid = validateName();
      const emailValid = validateEmail();

      if (!nameValid || !emailValid) {
        if (formStatus) {
          formStatus.dataset.state = "error";
          formStatus.textContent = "Please check the highlighted fields.";
        }
        const firstInvalid = !nameValid ? nameInput : emailInput;
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const firstName = nameInput.value.trim().split(/\s+/)[0];
      if (formStatus) {
        formStatus.dataset.state = "success";
        formStatus.textContent = `Thanks, ${firstName}. Marci's team will be in touch soon.`;
        formStatus.focus({ preventScroll: true });
      }
      contactForm.reset();
      setFieldState(nameInput, nameError, "");
      setFieldState(emailInput, emailError, "");
    });
  }

  /* ----------------------------------------------------------------------
     Cookie notice and footer year
     ---------------------------------------------------------------------- */
  const cookie = $("#cookie");
  const cookieAccept = $("[data-cookie-accept]");

  if (cookie && !storage.get("localStorage", "mm-cookie-choice")) {
    onPageReady(() => {
      window.setTimeout(() => {
        cookie.hidden = false;
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => cookie.classList.add("is-visible"));
        });
      }, 1000);
    });

    if (cookieAccept) {
      cookieAccept.addEventListener("click", () => {
        storage.set("localStorage", "mm-cookie-choice", "accepted");
        cookie.classList.remove("is-visible");
        window.setTimeout(() => {
          cookie.hidden = true;
        }, 450);
      });
    }
  }

  const year = $("#yr");
  if (year) year.textContent = new Date().getFullYear();

  /* ----------------------------------------------------------------------
     Reveals
     ---------------------------------------------------------------------- */
  const revealItems = $$("[data-reveal]");
  if (revealItems.length) {
    const revealAll = () => revealItems.forEach((item) => item.classList.add("is-visible"));
    if ("IntersectionObserver" in window && !reduceMotion.matches) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
      );
      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealAll();
    }
  }

  /* ----------------------------------------------------------------------
     Custom cursor
     ---------------------------------------------------------------------- */
  function initCursor() {
    if (!finePointer.matches || reduceMotion.matches || !matchMedia("(pointer: fine)").matches) {
      return;
    }
    const cursor = $("[data-cursor-el]");
    if (!cursor) return;
    const cursorLabel = $(".cursor__label", cursor);
    root.classList.add("has-cursor");
    cursor.classList.add("is-hidden");

    let queued = false;
    let moved = false;
    let pointerX = -100;
    let pointerY = -100;

    const setState = (target) => {
      const control = target.closest("input, select, textarea");
      const labelled = target.closest("[data-cursor]");
      const interactive = target.closest("a, button, [role='button'], label");

      cursor.classList.toggle("is-hidden", !moved || Boolean(control));
      cursor.classList.toggle("is-label", Boolean(labelled) && !control);
      cursor.classList.toggle("is-link", Boolean(interactive) && !labelled && !control);
      if (cursorLabel) cursorLabel.textContent = labelled ? labelled.dataset.cursor || "" : "";
    };

    document.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") return;
        moved = true;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (event.target instanceof Element) setState(event.target);
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(() => {
          queued = false;
          cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        });
      },
      { passive: true }
    );

    document.addEventListener("pointerover", (event) => {
      if (!(event.target instanceof Element)) return;
      setState(event.target);
    });

    document.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
    document.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
    document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
    document.addEventListener("mouseout", (event) => {
      if (!event.relatedTarget) cursor.classList.add("is-hidden");
    });
    window.addEventListener("blur", () => cursor.classList.add("is-hidden"));
  }

  /* ----------------------------------------------------------------------
     Magnetic buttons
     ---------------------------------------------------------------------- */
  function initMagnetic() {
    if (!finePointer.matches || reduceMotion.matches) return;
    $$(".magnetic").forEach((element) => {
      let settleTimer = 0;
      element.addEventListener("pointerenter", () => {
        window.clearTimeout(settleTimer);
        element.style.transition = "";
      });
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.16;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.2;
        element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
      element.addEventListener("pointerleave", () => {
        window.clearTimeout(settleTimer);
        element.style.transition = "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
        element.style.transform = "translate3d(0, 0, 0)";
        settleTimer = window.setTimeout(() => {
          element.style.transition = "";
          element.style.transform = "";
        }, 470);
      });
    });
  }
})();
