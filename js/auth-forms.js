// Shared helpers for the sign-in and sign-up pages.
window.togglePassword = (button) => {
  const input = button.parentElement.querySelector("input");
  const icon = button.querySelector("i");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  icon.classList.toggle("fa-eye", !show);
  icon.classList.toggle("fa-eye-slash", show);
  button.setAttribute("aria-label", show ? "Hide password" : "Show password");
  button.setAttribute("aria-pressed", String(show));
};

// Password strength meter (sign-up only).
const pw = document.querySelector("[data-strength-input]");
if (pw) {
  const bars = document.querySelectorAll(".password-strength");
  const text = document.getElementById("password-strength-text");
  const labels = ["Very weak", "Weak", "Medium", "Strong", "Very strong"];
  const tones = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];
  pw.addEventListener("input", () => {
    const v = pw.value;
    let n = 0;
    if (v.length >= 8) n++;
    if (/\d/.test(v)) n++;
    if (/[a-zA-Z]/.test(v)) n++;
    if (/[^A-Za-z0-9]/.test(v)) n++;
    bars.forEach((b, i) => {
      b.className = `password-strength h-1.5 flex-1 rounded-full transition-colors ${i < n ? tones[n] : "bg-ink-200"}`;
    });
    text.textContent = v ? `Password strength: ${labels[n]}` : "Use 8+ characters with a number and a symbol.";
  });
}

// Sign-up success hook used by js/signup.js.
window.showNotification = () => window.showToast?.("Registration successful! Welcome to JustHome!");
