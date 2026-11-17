// Shared UI behaviour for the public pages: header, menus, reveals, toasts, inline validation.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Header shadow once the page scrolls.
  const header = $("[data-header]");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Mobile menu.
  const menuBtn = $("#mobile-menu-button");
  const menu = $("#mobile-menu");
  const setMenu = (open) => {
    if (!menuBtn || !menu) return;
    menu.classList.toggle("hidden", !open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    const icon = $("i", menuBtn);
    if (icon) icon.className = `fas ${open ? "fa-xmark" : "fa-bars"} text-lg`;
  };
  menuBtn?.addEventListener("click", () => setMenu(menu.classList.contains("hidden")));

  // Account dropdown.
  const accBtn = $("#user-profile-btn");
  const drop = $("#user-dropdown");
  const setDrop = (open) => {
    if (!accBtn || !drop) return;
    accBtn.setAttribute("aria-expanded", String(open));
    drop.classList.toggle("invisible", !open);
    drop.classList.toggle("opacity-0", !open);
    drop.classList.toggle("scale-95", !open);
  };
  accBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setDrop(accBtn.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (e) => {
    if (drop && !drop.contains(e.target)) setDrop(false);
    if (menu && menuBtn && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (accBtn?.getAttribute("aria-expanded") === "true") { setDrop(false); accBtn.focus(); }
    if (menuBtn?.getAttribute("aria-expanded") === "true") { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener("resize", () => { if (window.innerWidth >= 1024) setMenu(false); });

  // Mirror the guest/user state (set by auth.js on #guestSection) onto mobile-only guest links.
  const guest = $("#guestSection");
  if (guest) {
    const sync = () => $$("[data-guest-only]").forEach((el) => (el.hidden = guest.classList.contains("hidden")));
    new MutationObserver(sync).observe(guest, { attributes: true, attributeFilter: ["class"] });
    sync();
  }

  // Reveal on scroll, once. Content stays visible without JS or under reduced motion.
  const root = document.documentElement;
  const targets = $$("[data-reveal]");
  if (root.classList.contains("js-motion") && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add("is-in"));
  }

  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Toast, announced politely to screen readers.
  let region;
  window.showToast = (message, type = "success") => {
    if (!region) {
      region = document.createElement("div");
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      region.className = "pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end";
      document.body.appendChild(region);
    }
    const t = document.createElement("div");
    const tone = type === "error" ? "bg-red-700" : "bg-ink-950";
    const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";
    t.className = `pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl ${tone} px-4 py-3 text-sm font-medium text-white shadow-lift transition duration-300`;
    t.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span></span>`;
    t.querySelector("span").textContent = message;
    region.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 3500);
  };

  // Inline validation for any form marked data-validate.
  const messageFor = (el) => {
    const v = el.validity;
    const label = el.dataset.label || "This field";
    if (v.valueMissing) return el.type === "checkbox" ? "Please tick this box to continue." : `${label} is required.`;
    if (v.typeMismatch && el.type === "email") return "Enter a valid email address, like name@example.com.";
    if (v.tooShort) return `${label} must be at least ${el.minLength} characters.`;
    if (v.patternMismatch) return el.dataset.patternMessage || `${label} is not in the right format.`;
    return el.validationMessage;
  };
  const showError = (el, msg) => {
    const id = `${el.id || el.name}-error`;
    let err = document.getElementById(id);
    if (!msg) {
      el.removeAttribute("aria-invalid");
      err?.remove();
      return;
    }
    el.setAttribute("aria-invalid", "true");
    if (!err) {
      err = document.createElement("p");
      err.id = id;
      err.className = "field-error";
      const anchor = el.closest("[data-field]") || el;
      anchor.insertAdjacentElement("afterend", err);
      const desc = el.getAttribute("aria-describedby");
      if (!desc?.includes(id)) el.setAttribute("aria-describedby", `${desc ? desc + " " : ""}${id}`);
    }
    err.innerHTML = `<i class="fas fa-circle-exclamation text-xs" aria-hidden="true"></i><span></span>`;
    err.querySelector("span").textContent = msg;
  };
  window.validateField = (el) => {
    const custom = el.dataset.match ? (el.value !== document.getElementById(el.dataset.match)?.value ? "Passwords do not match." : "") : "";
    el.setCustomValidity(custom);
    const ok = el.checkValidity();
    showError(el, ok ? "" : messageFor(el));
    return ok;
  };
  window.validateForm = (form) => {
    const fields = $$("input, select, textarea", form).filter((f) => f.willValidate);
    const bad = fields.filter((f) => !window.validateField(f));
    if (bad.length) bad[0].focus();
    return bad.length === 0;
  };
  $$("form[data-validate]").forEach((form) => {
    form.noValidate = true;
    $$("input, select, textarea", form).forEach((f) => {
      f.addEventListener("blur", () => { if (f.value || f.hasAttribute("aria-invalid")) window.validateField(f); });
      f.addEventListener("input", () => { if (f.hasAttribute("aria-invalid")) window.validateField(f); });
      f.addEventListener("change", () => { if (f.type === "checkbox") window.validateField(f); });
    });
  });
})();
