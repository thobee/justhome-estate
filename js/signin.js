// js/signin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBo5JRHCEmp3PftMAmHQxJspCPzX0RRPKY",
  authDomain: "estatejs-7c477.firebaseapp.com",
  projectId: "estatejs-7c477",
  storageBucket: "estatejs-7c477.appspot.com",
  messagingSenderId: "156544193291",
  appId: "1:156544193291:web:96e317eb953cf7194fc80e",
  measurementId: "G-T5HCCR6C7M",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Get redirect URL from query params
const params = new URLSearchParams(window.location.search);
const redirectUrl = safeRedirect(params.get("redirect"), "dashboard.html");

// Sign out any existing user when the page loads
await auth.signOut();

const form = document.getElementById("signin-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("signin-error").hidden = true;
  if (window.validateForm && !window.validateForm(form)) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    const email = form.email.value;
    const password = form.password.value;

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update or create user document with last login time
    const userRef = doc(db, "users", user.uid);

    try {
      // Try to update existing document
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      });
    } catch (updateError) {
      // If document doesn't exist, create it
      if (updateError.code === 'not-found' || updateError.message.includes('No document to update')) {
        await setDoc(userRef, {
          name: user.displayName || user.email.split('@')[0], // Fallback name
          email: user.email,
          role: "user",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          savedProperties: [],
          recentViews: [],
          profileComplete: false,
        });
      } else {
        // Re-throw other errors
        throw updateError;
      }
    }

    // Show success notification
    showSigninSuccessNotification();

    // Redirect after showing notification
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 900);
  } catch (error) {
    console.warn("Signin error:", error.code);
    showFormError("signin-error", friendlyAuthError(error));
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

document
  .getElementById("google-signin")
  .addEventListener("click", async (e) => {
    e.preventDefault();
    const btn = e.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Signing in with Google...';

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Update or create user document
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          name: user.displayName,
          email: user.email,
          role: "agent",
          lastLogin: serverTimestamp(),
          photoURL: user.photoURL,
          profileComplete: true,
        },
        { merge: true }
      );

      // Show success notification
      showSigninSuccessNotification();

      // Redirect after showing notification
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 2000);
    } catch (error) {
      console.error("Google signin error:", error);
      alert(error.message);
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

// Function to show signin success notification
function showSigninSuccessNotification() {
  if (window.showToast) return window.showToast("Successfully signed in!");
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll(".signin-notification");
  existingNotifications.forEach((notification) => notification.remove());

  // Create notification element
  const notification = document.createElement("div");
  notification.className = "signin-notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transform translate-x-full transition-all duration-300";
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="fas fa-check-circle"></i>
      <span class="font-medium">Successfully signed in!</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Forgot Password functionality
document.getElementById("forgot-password-link").addEventListener("click", (e) => {
  e.preventDefault();
  showForgotPasswordModal();
});

// Function to show forgot password modal
function showForgotPasswordModal() {
  const modalHTML = `
    <div id="forgot-password-modal" class="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
      <div class="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-lift sm:p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-envelope text-2xl text-blue-600"></i>
          </div>
          <h3 id="forgot-password-title" class="text-xl font-bold text-gray-800 mb-2">Reset Your Password</h3>
          <p class="text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <form id="forgot-password-form" class="space-y-4">
          <div>
            <label for="reset-email" class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              id="reset-email"
              required
              class="field"
              placeholder="Enter your email"
            />
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              id="cancel-reset"
              class="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary flex-1"
            >
              Send Reset Link
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("forgot-password-modal");
  const form = document.getElementById("forgot-password-form");
  const cancelBtn = document.getElementById("cancel-reset");

  // Close modal when clicking cancel
  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("reset-email").value.trim();

    if (!email) {
      showNotification("Please enter your email address", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";


    try {
      await sendPasswordResetEmail(auth, email);
      modal.remove();
      showNotification("Password reset email sent! Check your inbox.", "success");
    } catch (error) {
      console.error("Password reset error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to send reset email. Please try again.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }

      showNotification(errorMessage, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Function to show notifications (reused from existing code)
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification-toast");
  existingNotifications.forEach((notification) => notification.remove());

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification-toast fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-all duration-300`;

  // Set colors based on type
  const colors = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
    warning: "bg-yellow-500 text-black",
  };

  notification.classList.add(...colors[type].split(" "));
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="fas ${
        type === "success"
          ? "fa-check-circle"
          : type === "error"
          ? "fa-exclamation-circle"
          : "fa-info-circle"
      }"></i>
      <span class="font-medium">${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Plain-language messages for common Firebase auth errors, shown under the form.
function friendlyAuthError(error) {
  const map = {
    "auth/invalid-credential": "That email and password don't match. Check them and try again.",
    "auth/wrong-password": "That email and password don't match. Check them and try again.",
    "auth/user-not-found": "We couldn't find an account with that email.",
    "auth/invalid-email": "Enter a valid email address, like name@example.com.",
    "auth/too-many-requests": "Too many attempts. Wait a moment, then try again.",
    "auth/network-request-failed": "You seem to be offline. Check your connection and try again.",
    "auth/email-already-in-use": "An account with that email already exists. Try logging in instead.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
  };
  return map[error?.code] || "Something went wrong. Please try again.";
}

function showFormError(id, message) {
  const box = document.getElementById(id);
  if (!box) return alert(message);
  box.querySelector("span").textContent = message;
  box.hidden = false;
  box.focus();
}

// Only allow same-site relative redirects (blocks javascript: and off-site URLs).
function safeRedirect(value, fallback) {
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\\)/i.test(value.trim())) return fallback;
  return value;
}
