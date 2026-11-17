// Homepage: newsletter sign-up (front-end only, as before: no backend stores it yet).
const newsletter = document.getElementById("newsletter-form");
newsletter?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!window.validateForm(newsletter)) return;
  newsletter.reset();
  window.showToast("Thank you for subscribing! We will keep you updated.");
});
