import {
  SAMPLE_PROPERTIES,
  escapeHtml as e,
  normalizeProperty,
  filterProperties,
  safeReturn,
  money,
} from "./catalog-core.js";
import {
  backend,
  listings,
  savedHomes,
  toggleSaved,
  requestViewing,
  viewings,
} from "./platform.js";

const page = document.body.dataset.page;
const main = document.getElementById("main");
let properties = SAMPLE_PROPERTIES.map((item) =>
  normalizeProperty(item.id, item),
);
let saved = new Set();
let visibleCount = 6;
let currentProperty;
const query = new URLSearchParams(location.search);
if (query.has("demo")) {
  query.delete("demo");
  history.replaceState(
    null,
    "",
    location.pathname + (query.size ? "?" + query : ""),
  );
}
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const href = (path) => {
  const url = new URL(path, location.href);
  return url.pathname.split("/").pop() + url.search;
};
const destination = () => location.pathname.split("/").pop() + location.search;
const loginHref = () =>
  "signin.html?redirect=" + encodeURIComponent(destination());
const icons = () => window.lucide?.createIcons();
window.addEventListener("load", icons, { once: true });
function toast(message) {
  document.querySelector(".toast")?.remove();
  const element = document.createElement("div");
  element.className = "toast";
  element.role = "status";
  element.textContent = message;
  document.body.append(element);
  setTimeout(() => element.remove(), 4500);
}
function notice(
  message,
  error = false,
  target = document.getElementById("form-feedback"),
) {
  if (!target) return toast(message);
  target.className = "notice" + (error ? " error" : "");
  target.setAttribute("role", error ? "alert" : "status");
  target.textContent = message;
}
function readableError(error) {
  const errors = {
    "auth/invalid-credential":
      "Email or password is incorrect. Please check both.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use":
      "This email already has an account. Please sign in.",
    "auth/weak-password": "Use at least 8 characters for your password.",
    "auth/too-many-requests":
      "Too many attempts. Wait a little before trying again.",
    "auth/network-request-failed":
      "Check your internet connection and try again.",
    "permission-denied":
      "This action is unavailable with the current database permissions.",
    unavailable: "We could not reach the database. Please try again.",
  };
  return (
    errors[error.code] ||
    "We could not complete this request. Please try again."
  );
}
async function withTimeout(promise, milliseconds = 12000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Connection timed out")),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
function renderShell() {
  const nav = [
    ["index.html", "Home"],
    ["properties.html", "Find a home"],
    ["neighborhoods.html", "Areas"],
    ["renting-guide.html", "Renting guide"],
    ["contact.html", "Contact"],
  ];
  document.getElementById("site-header").innerHTML =
    `<header class="site-header"><div class="container nav-row">
    <a class="brand" href="${href("index.html")}" aria-label="JustHome home">${icon("house")}JustHome<span style="color:var(--green)">.</span></a>
    <nav class="nav-links" id="main-nav" aria-label="Main navigation">${nav.map(([path, label]) => `<a href="${href(path)}" ${location.pathname.endsWith(path) || (path === "index.html" && location.pathname === "/") ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
    <div class="nav-actions" id="nav-account"><a class="text-link nav-signin" href="${href("signin.html")}">Sign in</a><a class="button secondary" href="${href("dashboard.html")}">My account</a></div>
    <button class="icon-button mobile-toggle" id="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="main-nav">${icon("menu")}</button>
  </div></header>`;
  document.getElementById("site-footer").innerHTML =
    `<footer class="site-footer"><div class="container"><div class="footer-top">
    <div><a class="brand" href="${href("index.html")}">${icon("house")}JustHome.</a><p>A clearer way to discover your next home. Browse, shortlist, and request a viewing in one place.</p></div>
    <div class="footer-links"><div><strong>Discover</strong><a href="${href("properties.html")}">Browse homes</a><a href="${href("properties.html?location=Lagos")}">Homes in Lagos</a><a href="${href("properties.html?location=Abuja")}">Homes in Abuja</a></div>
    <div><strong>JustHome</strong><a href="${href("about.html")}">About us</a><a href="${href("contact.html")}">Contact</a><a href="${href("dashboard.html")}">Your shortlist</a></div>
    <div><strong>Good to know</strong><a href="${href("renting-guide.html")}">Renting guide</a><a href="${href("faq.html")}">Common questions</a><a href="${href("privacy.html")}">Privacy</a><a href="${href("terms.html")}">Terms</a><a href="${href("signin.html")}">Sign in</a></div></div>
    </div><div class="footer-bottom"><span>© ${new Date().getFullYear()} JustHome</span><span>Find your place. Make it home.</span></div></div></footer>`;
  const toggle = document.getElementById("menu-toggle");
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "Close menu" : "Open menu");
    document.getElementById("main-nav").classList.toggle("open", expanded);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.getElementById("main-nav").classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }
  });
  icons();
}
function searchFields() {
  return `<div class="field"><label for="q">City, area, or property</label><input id="q" name="q" type="search" placeholder="Where would you like to live?" value="${e(query.get("q") || "")}"></div>
  <div class="field"><label for="type">Property type</label><select id="type" name="type"><option value="">Any type</option>${["apartment", "duplex", "villa", "office"].map((type) => `<option value="${type}" ${query.get("type") === type ? "selected" : ""}>${type[0].toUpperCase() + type.slice(1)}</option>`).join("")}</select></div>
  <div class="field"><label for="max">Monthly budget</label><select id="max" name="max"><option value="">Any budget</option>${[100000, 250000, 500000, 1000000].map((value) => `<option value="${value}" ${query.get("max") === String(value) ? "selected" : ""}>Up to ${money(value)}</option>`).join("")}</select></div>
  <button class="button" type="submit">${icon("search")}Search homes</button>`;
}
function card(property) {
  return `<article class="property-card"><div class="property-art">
    <a href="${href("property-details.html?id=" + encodeURIComponent(property.id))}" tabindex="-1" aria-hidden="true"><img src="${e(property.image)}" alt="" loading="lazy" width="640" height="480"></a>
    <span class="tag">${property.isSample ? "Sample listing" : e(property.status === "active" ? "Available" : property.status[0].toUpperCase() + property.status.slice(1))}</span>
    <button class="icon-button ${saved.has(property.id) ? "saved" : ""}" data-save="${e(property.id)}" aria-pressed="${saved.has(property.id)}" aria-label="${saved.has(property.id) ? "Unsave" : "Save"} ${e(property.title)}" title="Save home">${icon("heart")}</button>
    </div><div class="property-info"><span class="price">${money(property.price)} <small>/ month</small></span>
    <h3><a href="${href("property-details.html?id=" + encodeURIComponent(property.id))}">${e(property.title)}</a></h3>
    <p class="location">${icon("map-pin")}${e(property.location)}</p><div class="facts"><span>${icon("bed-double")}${property.bedrooms} beds</span><span>${icon("bath")}${property.bathrooms} baths</span><span>${icon("maximize")}${property.area ? property.area + " m²" : e(property.type)}</span></div></div></article>`;
}
function featuredHomes() {
  return properties
    .filter(
      (property) =>
        property.isSample || ["available", "active"].includes(property.status),
    )
    .slice(0, 6);
}
function gridState(message, title = "No homes found", action = "") {
  return `<div class="empty-state"><h2>${e(title)}</h2><p>${e(message)}</p>${action}</div>`;
}
function skeletons() {
  return '<div class="skeleton"></div>'.repeat(3);
}
function renderHome() {
  document.getElementById("featured-grid").innerHTML = featuredHomes()
    .map(card)
    .join("");
}
function renderCatalog() {
  main.innerHTML = `<div class="container"><div class="page-heading"><p class="eyebrow">Find your place</p><h1>${query.get("saved") === "1" ? "Your saved homes" : "Homes to make your own"}</h1><p>Compare spaces, explore the details, and keep your favourites close.</p></div>
    <div class="filters"><form class="search-form" id="catalog-search">${searchFields()}</form><div class="filters-extra"><a class="text-link" href="${href("properties.html")}">Clear filters</a><label>Sort by <select id="sort"><option value="">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div></div>
    <div class="results-toolbar"><span id="result-count" role="status">Finding homes...</span><a class="text-link" href="${href("properties.html?saved=1")}">${icon("heart")}Saved homes</a></div><div class="property-grid" id="catalog-grid">${properties.slice(0, visibleCount).map(card).join("")}</div><div class="more-row"><button class="button secondary" id="load-more" hidden>Show more homes</button></div></div><div style="height:60px"></div>`;
  document
    .getElementById("catalog-search")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      ["q", "type", "max"].forEach((key) => {
        query.set(key, values.get(key));
      });
      history.replaceState(null, "", "properties.html?" + query);
      visibleCount = 6;
      updateCatalog();
    });
  document.getElementById("sort").addEventListener("change", updateCatalog);
  document.getElementById("load-more").addEventListener("click", () => {
    visibleCount += 6;
    updateCatalog();
  });
}
function updateCatalog() {
  const results = filterProperties(properties, {
    q: query.get("q"),
    location: query.get("location"),
    type: query.get("type"),
    max: query.get("max"),
    sort: document.getElementById("sort").value,
    saved: query.get("saved") === "1" ? saved : null,
  });
  document.getElementById("catalog-grid").innerHTML = results.length
    ? results.slice(0, visibleCount).map(card).join("")
    : gridState(
        "Try a different area or budget, or clear your filters.",
        "No matching homes",
        `<a class="button secondary" href="${href("properties.html")}">Browse all homes</a>`,
      );
  document.getElementById("result-count").textContent =
    results.length + (results.length === 1 ? " home" : " homes") + " found";
  document.getElementById("load-more").hidden = results.length <= visibleCount;
  icons();
}
async function renderDetails() {
  main.innerHTML =
    '<div class="container section"><div class="skeleton"></div><p role="status">Loading property details...</p></div>';
  const id = query.get("id");
  if (!id) {
    main.innerHTML = `<div class="container section">${gridState("Choose a home from the listings first.", "Find a home to explore", `<a class="button" href="${href("properties.html")}">Browse homes</a>`)}</div>`;
    return;
  }
  currentProperty = SAMPLE_PROPERTIES.find((item) => item.id === id);
  if (!currentProperty) {
    const api = await withTimeout(backend());
    const snapshot = await withTimeout(
      api.getDoc(api.doc(api.db, "properties", id)),
    );
    currentProperty = snapshot.exists()
      ? normalizeProperty(snapshot.id, snapshot.data())
      : null;
  }
  if (!currentProperty) {
    main.innerHTML = `<div class="container section">${gridState("This listing may have been removed.", "Home not found", `<a class="button" href="${href("properties.html")}">Back to listings</a>`)}</div>`;
    return;
  }
  const p = normalizeProperty(id, currentProperty);
  currentProperty = p;
  document.title = p.title + " | JustHome";
  const available = !p.isSample && ["active", "available"].includes(p.status);
  const images = p.images.length ? p.images : [p.image];
  main.innerHTML = `<div class="container"><nav class="breadcrumb" aria-label="Breadcrumb"><a class="text-link" href="${href("properties.html")}">${icon("arrow-left")}All homes</a><span>/</span><span>${e(p.type)}</span></nav>
    <div class="gallery"><img src="${e(images[0])}" alt="${e(p.title)}" width="960" height="640">${images[1] ? `<img src="${e(images[1])}" alt="Additional view of ${e(p.title)}" width="640" height="640">` : `<img src="${e(images[0])}" alt="" width="640" height="640">`}</div>
    <div class="detail-layout"><div><p class="eyebrow">${e(p.type)} · ${e(p.status)}</p><h1>${e(p.title)}</h1><p class="location">${icon("map-pin")}${e(p.location)}</p><div class="facts"><span>${icon("bed-double")}${p.bedrooms} bedrooms</span><span>${icon("bath")}${p.bathrooms} bathrooms</span><span>${icon("maximize")}${p.area ? p.area + " m²" : "Area to be confirmed"}</span></div>
    <div class="detail-section"><h2>A little more about this home</h2><p>${e(p.description || "Contact the listing agent for a full description and current availability.")}</p></div>
    <div class="detail-section"><h2>Before you decide</h2><p>Request a viewing, confirm the rental period and extra fees, and inspect the property before making any payment. Listing information is provided by the property owner or agent.</p></div>
    <button class="button secondary" data-save="${e(p.id)}" aria-pressed="${saved.has(p.id)}">${icon("heart")}${saved.has(p.id) ? "Saved to shortlist" : "Save this home"}</button></div>
    <aside class="booking-panel"><p class="price">${money(p.price)} <small>/ month</small></p><h2>${p.isSample ? "Looking for a home like this?" : "See it in person"}</h2><p class="form-note">${p.isSample ? "This sample apartment illustrates the type of home you can explore. It is not an available rental." : "Request a preferred date. The agent still needs to confirm."}</p>
    ${available ? `<form id="viewing-form" class="stack"><div class="field"><label for="name">Your name</label><input id="name" name="name" autocomplete="name" required maxlength="100"></div><div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254"></div><div class="field"><label for="date">Preferred date</label><input id="date" name="date" type="date" required></div><div class="field"><label for="message">Anything we should know? <small>(optional)</small></label><textarea id="message" name="message" maxlength="1000" placeholder="Your preferred time or questions"></textarea></div><div id="form-feedback" class="notice"></div><button class="button" type="submit">${icon("calendar-check")}Request a viewing</button></form>` : `<div class="notice">${p.isSample ? "Ask us about similar published homes." : "This home is currently unavailable for viewing."}</div><a class="button secondary" style="margin-top:16px" href="contact.html">Contact us ${icon("arrow-right")}</a>`}</aside></div></div>`;
  const form = document.getElementById("viewing-form");
  if (form) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    form.date.min = today.toISOString().slice(0, 10);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.date.value < form.date.min) {
        notice("Choose today or a future date.", true);
        return;
      }
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      button.textContent = "Sending request...";
      try {
        await requestViewing(p, Object.fromEntries(new FormData(form)));
        notice("Viewing requested. Your date is awaiting confirmation.");
        form.reset();
      } catch (error) {
        if (error.code === "signin") location.href = loginHref();
        else notice(readableError(error), true);
      } finally {
        button.disabled = false;
        button.innerHTML = icon("calendar-check") + "Request a viewing";
        icons();
      }
    });
  }
}
async function renderDashboard() {
  {
    const api = await withTimeout(backend());
    if (!api.auth.currentUser) {
      location.href = loginHref();
      return;
    }
  }
  const requests = await withTimeout(viewings());
  main.innerHTML = `<div class="container"><div class="page-heading"><p class="eyebrow">Your next chapter</p><h1>Your home search, together.</h1><p>Keep your shortlist close and follow up on your viewing requests.</p></div><div class="account-grid"><section><div class="section-heading"><h2>Saved homes <small>(${saved.size})</small></h2><a class="text-link" href="${href("properties.html")}">Find more ${icon("arrow-right")}</a></div><div class="property-grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))">${
    properties
      .filter((item) => saved.has(item.id))
      .map(card)
      .join("") ||
    gridState(
      "Tap the heart on a listing to keep it here.",
      "Your shortlist starts here",
      `<a class="button" href="${href("properties.html")}">Explore homes</a>`,
    )
  }</div></section><section><h2>Viewing requests</h2>${requests.length ? requests.map((item) => `<div class="request-row"><h3>${e(item.propertyTitle)}</h3><p>${e(item.date)} · ${e(item.status)}</p><a class="text-link" href="${href("property-details.html?id=" + encodeURIComponent(item.propertyId))}">View home ${icon("arrow-up-right")}</a></div>`).join("") : '<p class="form-note">No viewing requests yet. Open a home you like and request a date.</p>'}</section></div></div><div style="height:70px"></div>`;
}
function renderAuth() {
  const signup = page === "signup";
  main.innerHTML = `<div class="auth-layout"><aside class="auth-aside"><img src="images/optimized/home.webp" alt=""><div><p class="eyebrow" style="color:var(--accent)">A place for your next chapter</p><h1>A home search that feels a little more human.</h1><p>Your favourite homes and viewing requests, all in one place.</p><a class="button secondary" style="color:white" href="index.html">Browse homes ${icon("arrow-up-right")}</a></div></aside>
    <div class="auth-form-wrap"><div class="auth-form"><h1 style="font-size:28px;margin-bottom:8px">${signup ? "Make yourself at home." : "Welcome home."}</h1><p>${signup ? "Create an account to save homes and request viewings." : "Sign in to pick up your home search."}</p><form id="account-form" class="stack">
    ${signup ? '<div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" required maxlength="100"></div>' : ""}
    <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254"></div>
    <div class="field"><label for="password">Password</label><div class="password-wrap"><input id="password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" required ${signup ? 'minlength="8"' : ""}><button type="button" id="toggle-password" aria-label="Show password">${icon("eye")}</button></div>${signup ? '<small class="form-note">Use at least 8 characters.</small>' : ""}</div>
    ${signup ? '<label class="form-note"><input name="terms" type="checkbox" required> I agree to the <a href="terms.html">terms</a> and <a href="privacy.html">privacy notice</a>.</label>' : '<button type="button" id="reset-password" class="text-link" style="background:none;border:0;padding:0;justify-self:start">Forgot password?</button>'}
    <div class="notice" id="form-feedback"></div><button class="button" type="submit">${signup ? "Create account" : "Sign in"} ${icon("arrow-right")}</button></form>
    <p class="form-note" style="margin-top:22px">${signup ? "Already have an account?" : "New to JustHome?"} <a class="text-link" href="${signup ? "signin.html" : "signup.html"}?redirect=${encodeURIComponent(safeReturn(query.get("redirect")))}">${signup ? "Sign in" : "Create account"}</a></p><a class="text-link" href="index.html">Back to home ${icon("arrow-up-right")}</a></div></div></div>`;
  const form = document.getElementById("account-form");
  document
    .getElementById("toggle-password")
    .addEventListener("click", (event) => {
      const visible = form.password.type === "password";
      form.password.type = visible ? "text" : "password";
      event.currentTarget.setAttribute(
        "aria-label",
        visible ? "Hide password" : "Show password",
      );
      event.currentTarget.innerHTML = icon(visible ? "eye-off" : "eye");
      icons();
    });
  document
    .getElementById("reset-password")
    ?.addEventListener("click", async () => {
      if (!form.email.value || !form.email.validity.valid) {
        notice("Enter your email above first.", true);
        form.email.focus();
        return;
      }
      const button = document.getElementById("reset-password");
      button.disabled = true;
      try {
        const api = await withTimeout(backend());
        await api.sendPasswordResetEmail(api.auth, form.email.value.trim());
        notice(
          "If this account exists, a reset link will arrive in your inbox.",
        );
      } catch (error) {
        notice(readableError(error), true);
      } finally {
        button.disabled = false;
      }
    });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = signup ? "Creating account..." : "Signing in...";
    let accountCreated = false;
    try {
      const api = await withTimeout(backend());
      const email = form.email.value.trim();
      if (signup) {
        const result = await api.createUserWithEmailAndPassword(
          api.auth,
          email,
          form.password.value,
        );
        accountCreated = true;
        await api.updateProfile(result.user, {
          displayName: form.elements.namedItem("name").value.trim(),
        });
        await api.setDoc(api.doc(api.db, "users", result.user.uid), {
          name: result.user.displayName,
          email,
          role: "user",
          createdAt: api.serverTimestamp(),
          savedProperties: [],
          recentViews: [],
        });
      } else
        await api.signInWithEmailAndPassword(
          api.auth,
          email,
          form.password.value,
        );
      notice("You are signed in. Opening your account...");
      location.href = safeReturn(query.get("redirect"));
    } catch (error) {
      notice(
        accountCreated
          ? "Your account was created, but the profile could not be saved. Contact support or try signing in."
          : readableError(error),
        true,
      );
      button.disabled = false;
      button.textContent = signup ? "Create account" : "Sign in";
    }
  });
}
function renderAbout() {
  main.innerHTML = `<div class="container content-prose"><p class="eyebrow">About JustHome</p><h1>Good places. Clear choices.</h1><p>Finding a home should start with useful information: where it is, what it costs, and whether it fits your life. JustHome brings those decisions into one clear property search.</p><h2>From first look to first viewing</h2><p>Search homes by area and budget, compare the details, save a shortlist, and request a viewing through your account. Rental prices are shown in Nigerian naira with the listing period alongside them.</p><h2>Built with care</h2><p>JustHome brings property search, saved homes, and viewing requests into one place. Sign in to keep your shortlist and manage your enquiries. Some example apartments are marked Sample listing; published properties show their current availability.</p><h2>A thoughtful next step</h2><p>A viewing request is an expression of interest, not a reservation or a payment. Confirm availability, prices, and terms directly with the property owner or agent.</p><a class="button" href="${href("properties.html")}">Explore homes ${icon("arrow-right")}</a></div>`;
}
function renderContact() {
  main.innerHTML = `<div class="container"><div class="page-heading"><p class="eyebrow">Let's talk</p><h1>A question about your search?</h1><p>Send your question here. For a specific home, request a viewing from its listing.</p></div><div class="detail-layout"><div><h2>Keep the details handy</h2><p style="color:var(--muted)">Include the property name, area, and what you would like to know. Never send passwords or payment details.</p><a class="text-link" href="${href("properties.html")}">Find a listing ${icon("arrow-right")}</a><div class="notice" style="margin-top:24px">Sign in to send a message and keep your enquiry connected to your account.</div></div><form class="booking-panel stack" id="contact-form"><div class="field"><label for="name">Your name</label><input id="name" name="name" autocomplete="name" maxlength="100" required></div><div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" required></div><div class="field"><label for="message">Your message</label><textarea id="message" name="message" required maxlength="2000" minlength="10"></textarea></div><div class="notice" id="form-feedback"></div><button type="submit" class="button">Send message ${icon("arrow-right")}</button></form></div></div>`;
  const form = document.getElementById("contact-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    button.textContent = "Sending...";
    try {
      const fields = Object.fromEntries(new FormData(form));
      {
        const api = await withTimeout(backend());
        if (!api.auth.currentUser) {
          location.href = loginHref();
          return;
        }
        await api.addDoc(api.collection(api.db, "messages"), {
          ...fields,
          userId: api.auth.currentUser.uid,
          status: "unread",
          createdAt: api.serverTimestamp(),
        });
      }
      notice("Message submitted successfully.");
      form.reset();
    } catch (error) {
      notice(readableError(error), true);
    } finally {
      button.disabled = false;
      button.textContent = "Send message";
    }
  });
}
async function updateAccountNav() {
  if (["signin", "signup"].includes(page)) return;
  try {
    const api = await withTimeout(backend(), 8000);
    const user = api.auth.currentUser;
    if (!user) return;
    document.getElementById("nav-account").innerHTML =
      `<a class="button secondary" href="dashboard.html">${icon("user-round")}My account</a><button class="icon-button" id="logout" aria-label="Sign out" title="Sign out">${icon("log-out")}</button>`;
    document.getElementById("logout").addEventListener("click", async () => {
      try {
        await api.signOut(api.auth);
        location.href = "index.html";
      } catch {
        toast("Could not sign out. Please try again.");
      }
    });
    icons();
  } catch {
    /* Public navigation remains usable when Firebase is offline. */
  }
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-save]");
  if (!button) return;
  button.disabled = true;
  try {
    saved = await toggleSaved(button.dataset.save);
    button.setAttribute("aria-pressed", String(saved.has(button.dataset.save)));
    button.classList.toggle("saved", saved.has(button.dataset.save));
    button.setAttribute(
      "aria-label",
      saved.has(button.dataset.save) ? "Remove saved home" : "Save home",
    );
    if (button.classList.contains("button"))
      button.innerHTML =
        icon("heart") +
        (saved.has(button.dataset.save)
          ? "Saved to shortlist"
          : "Save this home");
    toast(
      saved.has(button.dataset.save)
        ? "Added to your shortlist."
        : "Removed from your shortlist.",
    );
    if (page === "dashboard") await renderDashboard();
    if (page === "properties" && query.get("saved") === "1") updateCatalog();
    icons();
  } catch (error) {
    if (error.code === "signin") location.href = loginHref();
    else toast(readableError(error));
  } finally {
    button.disabled = false;
  }
});
renderShell();
if (page === "home") renderHome();
if (page === "properties") renderCatalog();
if (["signin", "signup"].includes(page)) renderAuth();
if (page === "about") renderAbout();
if (page === "contact") renderContact();
if (page === "privacy" || page === "terms") {
  main.innerHTML = `<div class="container content-prose"><h1>${page === "privacy" ? "Privacy notice" : "Using JustHome"}</h1><p>JustHome uses Firebase to manage accounts, saved listings, viewing requests, and contact messages.</p><h2>${page === "privacy" ? "Your information" : "Listings and viewings"}</h2><p>${page === "privacy" ? "Passwords are handled by Firebase Authentication. Your shortlist and enquiries are associated with your account. Do not send passwords, bank details, or sensitive documents in messages. Contact us for questions about your account information." : "Confirm prices, availability, and rental terms with the listing agent before committing. A viewing request still needs confirmation and does not reserve a property. Homes marked Sample listing are examples and cannot be booked."}</p><h2>Questions?</h2><p>For help with a listing, your account, or an enquiry, use our contact page.</p><a class="text-link" href="contact.html">Contact JustHome ${icon("arrow-right")}</a></div>`;
}
icons();
void updateAccountNav();
try {
  if (page === "properties") updateCatalog();
  if (page === "details") await renderDetails();
  if (["home", "properties", "dashboard"].includes(page)) {
    if (page === "dashboard") {
      const api = await withTimeout(backend());
      if (!api.auth.currentUser) {
        location.href = loginHref();
      } else {
        [saved, properties] = await Promise.all([
          withTimeout(savedHomes()),
          withTimeout(listings()),
        ]);
        await renderDashboard();
      }
    } else {
      const [savedResult, listingsResult] = await Promise.allSettled([
        withTimeout(savedHomes(), 8000),
        withTimeout(listings(), 10000),
      ]);
      if (savedResult.status === "fulfilled") saved = savedResult.value;
      if (listingsResult.status === "fulfilled")
        properties = listingsResult.value;
      else {
        const feedback = document.createElement("p");
        feedback.className = "notice";
        feedback.setAttribute("role", "status");
        feedback.textContent =
          "Published listings could not load. You can browse sample apartments while we reconnect.";
        (
          document.getElementById("featured-grid") ||
          document.getElementById("catalog-grid")
        ).before(feedback);
      }
      if (page === "home")
        document.getElementById("featured-grid").innerHTML = featuredHomes()
          .map(card)
          .join("");
      if (page === "properties") updateCatalog();
    }
  }
} catch {
  main.innerHTML =
    '<div class="container section">' +
    gridState(
      "Check your connection and try again.",
      "We could not load this page",
      '<button class="button secondary" onclick="location.reload()">Try again</button> <a class="text-link" href="properties.html">Browse homes</a>',
    ) +
    "</div>";
}

document.querySelectorAll("img").forEach((img) =>
  img.addEventListener(
    "error",
    () => {
      if (!img.src.endsWith("home.webp"))
        img.src = "images/optimized/home.webp";
    },
    { once: true },
  ),
);
icons();
