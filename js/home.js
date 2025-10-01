// Simple Intersection Observer for animations
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Add animation classes when element is visible
        entry.target.classList.add("animate-slide-up");
        observer.unobserve(entry.target); // Only animate once
      }
    });
  },
  {
    threshold: 0.1,
    rootMargin: "0px",
  }
);

// Observe elements for animation
document.querySelectorAll(".stat-card, .animate-on-scroll").forEach((el) => {
  observer.observe(el);
});

// Enhance search functionality
const searchForm = document.querySelector("#search-form");
if (searchForm) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const location = document.querySelector("#location-select").value;
    const type = document.querySelector("#type-select").value;
    const price = document.querySelector("#price-select").value;

    // Construct URL with parameters
    const params = new URLSearchParams();
    if (location) params.append("location", location);
    if (type) params.append("type", type);
    if (price) params.append("price", price);

    // Redirect to properties page with filters
    window.location.href = `properties.html?${params.toString()}`;
  });
}

// Add parallax effect to hero section
const heroSection = document.querySelector(".hero-section");
if (heroSection) {
  window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset;
    heroSection.style.backgroundPositionY = scrolled * 0.5 + "px";
  });
}

// Enhance select dropdowns with labels
document.querySelectorAll("select").forEach((select) => {
  select.addEventListener("change", function () {
    this.classList.toggle("selected", this.value !== "");
  });
});

// Session timeout management
let sessionTimeoutWarning;
let sessionTimeoutLogout;
let lastActivityTime = Date.now();

const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before logout

function initializeSessionTimeout() {
  // Check if user is logged in (assuming auth is available from js/auth.js)
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      if (user) {
        // User is logged in, start session timeout
        startSessionTimeout();
      } else {
        // User is not logged in, clear any existing timeouts
        clearSessionTimeouts();
      }
    });
  }
}

function startSessionTimeout() {
  // Clear any existing timeouts
  clearSessionTimeouts();

  // Get last activity time from localStorage or set current time
  const storedTime = localStorage.getItem('lastActivityTime');
  if (storedTime) {
    lastActivityTime = parseInt(storedTime);
  } else {
    lastActivityTime = Date.now();
    localStorage.setItem('lastActivityTime', lastActivityTime.toString());
  }

  // Calculate time until warning and logout
  const timeUntilWarning = SESSION_TIMEOUT - WARNING_TIME - (Date.now() - lastActivityTime);
  const timeUntilLogout = SESSION_TIMEOUT - (Date.now() - lastActivityTime);

  // Set warning timeout
  if (timeUntilWarning > 0) {
    sessionTimeoutWarning = setTimeout(() => {
      showSessionTimeoutWarning();
    }, timeUntilWarning);
  } else if (timeUntilLogout > 0) {
    // If warning time has passed but logout time hasn't, show warning immediately
    showSessionTimeoutWarning();
  }

  // Set logout timeout
  if (timeUntilLogout > 0) {
    sessionTimeoutLogout = setTimeout(() => {
      handleSessionTimeout();
    }, timeUntilLogout);
  } else {
    // If logout time has passed, logout immediately
    handleSessionTimeout();
  }

  // Track user activity
  trackUserActivity();
}

function clearSessionTimeouts() {
  if (sessionTimeoutWarning) {
    clearTimeout(sessionTimeoutWarning);
    sessionTimeoutWarning = null;
  }
  if (sessionTimeoutLogout) {
    clearTimeout(sessionTimeoutLogout);
    sessionTimeoutLogout = null;
  }
}

function trackUserActivity() {
  // Track various user activities
  const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  activities.forEach(activity => {
    document.addEventListener(activity, updateActivityTime, { passive: true });
  });

  // Also track visibility change (when user switches tabs)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateActivityTime();
    }
  });
}

function updateActivityTime() {
  lastActivityTime = Date.now();
  localStorage.setItem('lastActivityTime', lastActivityTime.toString());

  // Reset timeouts
  startSessionTimeout();
}

function showSessionTimeoutWarning() {
  const warningModalHTML = `
    <div id="session-timeout-warning" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="timeout-warning-title">
      <div class="bg-white rounded-xl p-6 w-full max-w-md mx-auto">
        <div class="text-center">
          <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-clock text-amber-600 text-2xl"></i>
          </div>
          <h3 id="timeout-warning-title" class="text-xl font-bold text-gray-800 mb-2">Session Expiring Soon</h3>
          <p class="text-gray-600 mb-6">Your session will expire in 5 minutes due to inactivity. Would you like to stay logged in?</p>
          <div class="flex gap-3">
            <button id="extend-session" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
              Stay Logged In
            </button>
            <button id="logout-now" class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors">
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", warningModalHTML);

  const warningModal = document.getElementById("session-timeout-warning");
  const extendBtn = document.getElementById("extend-session");
  const logoutBtn = document.getElementById("logout-now");

  extendBtn.addEventListener("click", () => {
    warningModal.remove();
    updateActivityTime();
  });

  logoutBtn.addEventListener("click", () => {
    warningModal.remove();
    handleSessionTimeout();
  });

  // Auto-close warning after 30 seconds if no action taken
  setTimeout(() => {
    if (warningModal && warningModal.parentNode) {
      warningModal.remove();
    }
  }, 30000);
}

function handleSessionTimeout() {
  // Clear stored activity time
  localStorage.removeItem('lastActivityTime');

  // Show timeout message
  const timeoutModalHTML = `
    <div id="session-timeout-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="timeout-modal-title">
      <div class="bg-white rounded-xl p-6 w-full max-w-md mx-auto">
        <div class="text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-sign-out-alt text-red-600 text-2xl"></i>
          </div>
          <h3 id="timeout-modal-title" class="text-xl font-bold text-gray-800 mb-2">Session Expired</h3>
          <p class="text-gray-600 mb-6">You have been logged out due to inactivity. Please sign in again to continue.</p>
          <button id="signin-redirect" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
            Sign In Again
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", timeoutModalHTML);

  const timeoutModal = document.getElementById("session-timeout-modal");
  const signinBtn = document.getElementById("signin-redirect");

  signinBtn.addEventListener("click", () => {
    window.location.href = `signin.html?redirect=index.html`;
  });

  // Auto-redirect after 10 seconds
  setTimeout(() => {
    window.location.href = `signin.html?redirect=index.html`;
  }, 10000);

  // Sign out the user
  if (typeof auth !== 'undefined') {
    auth.signOut().catch(error => {
      console.error("Error signing out:", error);
    });
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  // Add smooth scroll behavior
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Initialize session timeout
  initializeSessionTimeout();
});
