// js/dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

// Check if user is authenticated
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "signin.html";
    return;
  }

  // Update UI with user info
  document.getElementById("user-name").textContent = user.displayName || "User";
  document.getElementById("user-email").textContent = user.email;

  if (user.photoURL) {
    const profileImage = document.getElementById("profile-image");
    profileImage.innerHTML = `<img src="${user.photoURL}" alt="Profile" class="w-full h-full rounded-full object-cover">`;
  }

  // Check for welcome parameter
  const params = new URLSearchParams(window.location.search);
  if (params.get("welcome") === "true") {
    document.getElementById("welcome-modal").classList.remove("hidden");
  }

  // Get user data from Firestore with offline handling
  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const userRole = userData.role || "user";

      // Show admin link if user is admin
      const adminLink = document.getElementById("admin-dashboard-link");
      if (userRole === "admin" && adminLink) {
        adminLink.classList.remove("hidden");
      } else if (adminLink) {
        adminLink.classList.add("hidden");
      }

      // Update last seen (only if online)
      try {
        await updateDoc(userRef, {
          lastSeen: serverTimestamp(),
        });
      } catch (updateError) {
        console.warn("Could not update last seen:", updateError.message);
      }

      // Load and display saved properties
      const savedProperties = userData.savedProperties || [];
      const savedCount = document.getElementById("saved-count");
      const savedPropertiesContainer =
        document.getElementById("saved-properties");

      // Update saved count
      savedCount.textContent = savedProperties.length;

      // Display saved properties
      if (savedProperties.length > 0) {
        savedPropertiesContainer.innerHTML = savedProperties
          .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
          .slice(0, 4)
          .map(
            (property) => `
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <img src="${property.imageUrl}" alt="${property.title}" class="w-20 h-20 object-cover rounded-lg">
              <div class="flex-1">
                <h4 class="font-medium text-gray-800 line-clamp-1">${property.title}</h4>
                <p class="text-sm text-gray-600">${property.location}</p>
                <p class="text-sm font-medium text-blue-600 mt-1">₦${property.price}</p>
              </div>
              <button onclick="removeFromSaved('${property.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          `
          )
          .join("");

        // Add remove from saved functionality
        window.removeFromSaved = async (propertyId) => {
          try {
            const property = savedProperties.find((p) => p.id === propertyId);
            await updateDoc(userRef, {
              savedProperties: arrayRemove(property),
              savedPropertyIds: arrayRemove(propertyId),
            });
            // Refresh the page to show updated list
            window.location.reload();
          } catch (error) {
            console.error("Error removing property:", error);
            alert("Error removing property. Please try again.");
          }
        };
      } else {
        savedPropertiesContainer.innerHTML = `
          <div class="text-gray-500 text-center py-8">
            <i class="fas fa-home text-4xl text-gray-300 mb-2"></i>
            <p>No saved properties yet</p>
          </div>
        `;
      }

      // Load and display user bookings
      let bookings = await loadUserBookings(user.uid);

      // If no bookings loaded (likely due to offline), try local storage fallback
      if (bookings.length === 0) {
        console.log(
          "No bookings from Firestore, checking local storage fallback..."
        );
        bookings = loadBookingsFromLocalStorage();
      }

      // Check for newly created booking from property details page
      const lastBookingId = localStorage.getItem("last_booking_id");
      if (lastBookingId && bookings.length > 0) {
        console.log("Found last booking ID:", lastBookingId);
        // Highlight the most recent booking
        const recentBooking = bookings.find((b) => b.id === lastBookingId);
        if (recentBooking) {
          console.log("Highlighting recent booking:", recentBooking);
          // You could add special styling or notification here
        }
        // Clear the stored booking ID after processing
        localStorage.removeItem("last_booking_id");
        localStorage.removeItem("last_booking_property_id");
      }

      // Update bookings count in stats
      const bookingsCount = document.getElementById("bookings-count");
      if (bookingsCount) {
        bookingsCount.textContent = bookings.length;
      }
    } else {
      // User document doesn't exist, show offline message
      showOfflineState();
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    if (error.code === "unavailable" || error.message.includes("offline")) {
      showOfflineState();
    } else {
      showErrorState();
    }
  }
});

// Handle welcome modal close
document.getElementById("welcome-close")?.addEventListener("click", () => {
  document.getElementById("welcome-modal").classList.add("hidden");
  // Remove welcome parameter from URL without reload
  window.history.replaceState({}, "", window.location.pathname);
});

// Helper function to get property image with fallbacks
function getPropertyImage(property) {
  if (!property) return "images/img1.png";

  // Check for array of images first
  if (
    property.images &&
    Array.isArray(property.images) &&
    property.images.length > 0
  ) {
    return property.images[0];
  }

  // Then check single image fields
  return property.image || property.imageUrl || "images/img1.png";
}

// Show offline state
function showOfflineState() {
  console.log("Showing offline state");

  // Update stats with offline indicators
  const savedCount = document.getElementById("saved-count");
  const bookingsCount = document.getElementById("bookings-count");

  if (savedCount) savedCount.textContent = "?";
  if (bookingsCount) bookingsCount.textContent = "?";

  // Show offline message in containers
  const savedPropertiesContainer = document.getElementById("saved-properties");
  const bookingsContainer = document.getElementById("my-bookings");

  const offlineMessage = `
    <div class="text-gray-500 text-center py-8">
      <i class="fas fa-wifi-slash text-4xl text-gray-300 mb-2"></i>
      <p class="font-medium">Offline Mode</p>
      <p class="text-sm mt-1">Unable to load data. Please check your internet connection.</p>
      <button onclick="window.location.reload()" class="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
        Retry Connection
      </button>
    </div>
  `;

  if (savedPropertiesContainer)
    savedPropertiesContainer.innerHTML = offlineMessage;
  if (bookingsContainer) bookingsContainer.innerHTML = offlineMessage;
}

// Show error state
function showErrorState() {
  console.log("Showing error state");

  const errorMessage = `
    <div class="text-gray-500 text-center py-8">
      <i class="fas fa-exclamation-triangle text-4xl text-red-300 mb-2"></i>
      <p class="font-medium">Unable to Load Data</p>
      <p class="text-sm mt-1">There was an error loading your dashboard data.</p>
      <button onclick="window.location.reload()" class="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
        Try Again
      </button>
    </div>
  `;

  const savedPropertiesContainer = document.getElementById("saved-properties");
  const bookingsContainer = document.getElementById("my-bookings");

  if (savedPropertiesContainer)
    savedPropertiesContainer.innerHTML = errorMessage;
  if (bookingsContainer) bookingsContainer.innerHTML = errorMessage;
}

// Load bookings from local storage as fallback
function loadBookingsFromLocalStorage() {
  console.log("Loading bookings from local storage fallback...");
  const bookings = [];

  // Look for payment success records in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith("payment_success_") ||
        key.startsWith("booking_fallback_"))
    ) {
      try {
        const record = JSON.parse(localStorage.getItem(key));
        if (record && (record.bookingData || record)) {
          const bookingData = record.bookingData || record;
          bookings.push({
            id:
              bookingData.id ||
              bookingData.propertyId + "_" + (record.timestamp || Date.now()),
            ...bookingData,
            status: "confirmed", // Assume successful since it was stored
            createdAt: record.timestamp || bookingData.createdAt,
            property: bookingData.propertyDetails || {
              title: bookingData.propertyTitle || "Recently Booked Property",
              location:
                bookingData.propertyLocation || "Location details unavailable",
              image: bookingData.propertyImage || "images/img1.png",
            },
          });
        }
      } catch (error) {
        console.warn("Error parsing local storage booking:", error);
      }
    }
  }

  console.log("Found", bookings.length, "bookings in local storage");

  // Display fallback bookings if any found
  if (bookings.length > 0) {
    const bookingsContainer = document.getElementById("my-bookings");

    // Sort by creation date (newest first)
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    bookingsContainer.innerHTML = bookings
      .slice(0, 3)
      .map(
        (booking) => `
        <div class="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
          <img src="${booking.property?.image || "images/img1.png"}"
               alt="${booking.property?.title || "Property"}"
               class="w-16 h-16 object-cover rounded-lg">
          <div class="flex-1">
            <h4 class="font-medium text-gray-800">${
              booking.property?.title || "Recently Booked Property"
            }</h4>
            <p class="text-sm text-gray-600">${
              booking.property?.location || "Location details unavailable"
            }</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                ✅ Confirmed
              </span>
              <span class="text-xs text-gray-500">
                ${new Date(
                  booking.moveInDate
                ).toLocaleDateString()} - ${new Date(
          booking.moveOutDate
        ).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div class="text-right">
            <p class="font-semibold text-blue-600">₦${
              booking.grandTotal?.toLocaleString() || "0"
            }</p>
            <p class="text-xs text-gray-500">${booking.duration || "N/A"}</p>
          </div>
        </div>
      `
      )
      .join("");

    // Add success indicator for newly booked property
    bookingsContainer.innerHTML += `
      <div class="text-center mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p class="text-sm text-green-800">
          <i class="fas fa-check-circle mr-1"></i>
          <strong>Booking Successful!</strong> Your property has been booked and saved.
        </p>
      </div>
    `;
  }

  return bookings;
}

// Load user bookings
async function loadUserBookings(userId) {
  try {
    let bookingsSnapshot;

    // Try the optimized query first (requires index)
    try {
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      bookingsSnapshot = await getDocs(bookingsQuery);
      console.log("✅ Successfully loaded bookings with optimized query");
    } catch (indexError) {
      console.warn(
        "❌ Index error, falling back to simple query:",
        indexError.message
      );
      console.log(
        "💡 To fix this permanently, create a composite index in Firebase Console:"
      );
      console.log("   Collection: bookings");
      console.log("   Fields: userId (ascending), createdAt (descending)");

      // Fallback to simple query without ordering
      const fallbackQuery = query(
        collection(db, "bookings"),
        where("userId", "==", userId)
      );
      bookingsSnapshot = await getDocs(fallbackQuery);
      console.log("✅ Successfully loaded bookings with fallback query");
    }
    const bookingsContainer = document.getElementById("my-bookings");
    const bookings = [];

    if (!bookingsSnapshot.empty) {
      // Get all bookings with property details
      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();

        // Get property details with offline handling
        try {
          const propertyDoc = await getDoc(
            doc(db, "properties", booking.propertyId)
          );
          if (propertyDoc.exists()) {
            const property = propertyDoc.data();
            bookings.push({
              id: bookingDoc.id,
              ...booking,
              property: property,
            });
          } else {
            // Property not found, still add booking with basic info
            bookings.push({
              id: bookingDoc.id,
              ...booking,
              property: null,
            });
          }
        } catch (propertyError) {
          console.warn(
            "Could not fetch property details:",
            propertyError.message
          );
          // Still add booking even if property fetch fails
          bookings.push({
            id: bookingDoc.id,
            ...booking,
            property: null,
          });
        }
      }

      // Sort bookings by createdAt in descending order (newest first) if not already sorted by query
      bookings.sort((a, b) => {
        const aTime = a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt || 0);
        return bTime - aTime;
      });

      // Display bookings
      bookingsContainer.innerHTML = bookings
        .slice(0, 3) // Show only first 3 bookings
        .map((booking) => {
          const statusColors = {
            pending_payment: "bg-yellow-100 text-yellow-800",
            confirmed: "bg-green-100 text-green-800",
            cancelled: "bg-red-100 text-red-800",
            draft: "bg-gray-100 text-gray-800",
          };

          const statusText = {
            pending_payment: "Payment Pending",
            confirmed: "Confirmed",
            cancelled: "Cancelled",
            draft: "Draft",
          };

          return `
            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <img src="${getPropertyImage(booking.property)}"
                   alt="${booking.property?.title || "Property"}"
                   class="w-16 h-16 object-cover rounded-lg">
              <div class="flex-1">
                <h4 class="font-medium text-gray-800">${
                  booking.property?.title || "Property"
                }</h4>
                <p class="text-sm text-gray-600">${
                  booking.property?.location || "Location"
                }</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs px-2 py-1 rounded-full ${
                    statusColors[booking.status] || statusColors.draft
                  }">
                    ${statusText[booking.status] || "Unknown"}
                  </span>
                  <span class="text-xs text-gray-500">
                    ${new Date(
                      booking.moveInDate
                    ).toLocaleDateString()} - ${new Date(
            booking.moveOutDate
          ).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-blue-600">₦${
                  booking.grandTotal?.toLocaleString() || "0"
                }</p>
                <p class="text-xs text-gray-500">${
                  booking.duration || "N/A"
                }</p>
              </div>
            </div>
          `;
        })
        .join("");

      // Add "View All" link if there are more than 3 bookings
      if (bookings.length > 3) {
        bookingsContainer.innerHTML += `
          <div class="text-center mt-4">
            <a href="#all-bookings" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View all ${bookings.length} bookings →
            </a>
          </div>
        `;
      }
    } else {
      bookingsContainer.innerHTML = `
        <div class="text-gray-500 text-center py-8">
          <i class="fas fa-calendar-check text-4xl text-gray-300 mb-2"></i>
          <p>No bookings yet</p>
          <p class="text-sm mt-1">Start exploring properties to make your first booking!</p>
        </div>
      `;
    }

    return bookings;
  } catch (error) {
    console.error("Error loading user bookings:", error);

    // Handle offline/network errors specifically
    if (
      error.code === "unavailable" ||
      error.message.includes("offline") ||
      error.message.includes("network")
    ) {
      const bookingsContainer = document.getElementById("my-bookings");
      bookingsContainer.innerHTML = `
        <div class="text-gray-500 text-center py-8">
          <i class="fas fa-wifi-slash text-4xl text-gray-300 mb-2"></i>
          <p>Unable to load bookings</p>
          <p class="text-sm mt-1">Check your internet connection and try again</p>
          <button onclick="window.location.reload()" class="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            Retry
          </button>
        </div>
      `;
    } else {
      // Generic error
      const bookingsContainer = document.getElementById("my-bookings");
      bookingsContainer.innerHTML = `
        <div class="text-gray-500 text-center py-8">
          <i class="fas fa-exclamation-triangle text-4xl text-red-300 mb-2"></i>
          <p>Unable to load bookings</p>
          <p class="text-sm mt-1">Please try refreshing the page</p>
        </div>
      `;
    }
    return [];
  }
}

// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const hamburger = document.querySelector(".hamburger");

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("active");
    hamburger.classList.toggle("active");
  });

  // Close mobile menu when clicking on a link
  const mobileLinks = mobileMenu.querySelectorAll("a");
  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("active");
      hamburger.classList.remove("active");
    });
});

// Session timeout management
let sessionTimeoutWarning;
let sessionTimeoutLogout;
let lastActivityTime = Date.now();

const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before logout

function initializeSessionTimeout() {
  // Check if user is logged in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is logged in, start session timeout
      startSessionTimeout();
    } else {
      // User is not logged in, clear any existing timeouts
      clearSessionTimeouts();
    }
  });
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
    window.location.href = `signin.html?redirect=dashboard.html`;
  });

  // Auto-redirect after 10 seconds
  setTimeout(() => {
    window.location.href = `signin.html?redirect=dashboard.html`;
  }, 10000);

  // Sign out the user
  auth.signOut().catch(error => {
    console.error("Error signing out:", error);
  });
}

// Initialize everything when page loads
document.addEventListener("DOMContentLoaded", () => {
  initializeSessionTimeout();
});

  // Close mobile menu when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !mobileMenu.contains(e.target) &&
      !mobileMenuToggle.contains(e.target) &&
      mobileMenu.classList.contains("active")
    ) {
      mobileMenu.classList.remove("active");
      hamburger.classList.remove("active");
    }
  });
}

// Handle logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error signing out:", error);
    alert("Error signing out. Please try again.");
  }
});

// Handle mobile logout button
const mobileLogoutBtn = document.getElementById("mobile-logout-btn");
if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Error signing out. Please try again.");
    }
  });
}

// Import required Firebase modules
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Handle profile image upload
async function uploadProfileImage(file) {
  try {
    const user = auth.currentUser;

    // Cloudinary upload configuration
    const cloudName = "dpiornkik"; // Your Cloudinary cloud name
    const uploadPreset = "mern-estate"; // Your unsigned upload preset
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    // Upload to Cloudinary
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    const downloadURL = data.secure_url;

    // Update user profile
    await updateProfile(user, {
      photoURL: downloadURL,
    });

    // Update UI
    const profileImage = document.getElementById("profile-image");
    profileImage.innerHTML = `<img src="${downloadURL}" alt="Profile" class="w-full h-full rounded-full object-cover">`;
    const navProfileImage = document.getElementById("nav-profile-image");
    if (navProfileImage) {
      navProfileImage.innerHTML = `<img src="${downloadURL}" alt="Profile" class="w-full h-full rounded-full object-cover">`;
    }

    // Update user document in Firestore
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      photoURL: downloadURL,
      updatedAt: serverTimestamp(),
    });

    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

// Handle edit profile
document.getElementById("edit-profile").addEventListener("click", () => {
  const user = auth.currentUser;
  const userRef = doc(db, "users", user.uid);

  // Create modal HTML
  // Create modal HTML
  const modalHTML = `
  <div id="edit-profile-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div class="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md mx-auto shadow-2xl relative">
      <div class="flex justify-between items-center mb-4 sm:mb-6">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-800">Edit Profile</h2>
        <button id="close-modal" class="text-gray-500 hover:text-gray-700 p-2">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="space-y-6">
        <!-- Profile Image -->
        <div class="flex flex-col items-center">
          <div class="relative">
            <div id="profile-preview" class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-blue-100 mb-2 flex items-center justify-center overflow-hidden">
              ${
                user.photoURL
                  ? `<img src="${user.photoURL}" alt="Profile" class="w-full h-full object-cover">`
                  : `<i class="fas fa-user text-3xl sm:text-4xl text-blue-500"></i>`
              }
            </div>
            <button id="upload-photo" class="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700">
              <i class="fas fa-camera text-sm"></i>
            </button>
          </div>
          <input type="file" id="photo-input" accept="image/*" class="hidden">
        </div>

        <!-- Profile Information -->
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input type="text" id="display-name" value="${
              user.displayName || ""
            }" 
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value="${user.email}" disabled
              class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md text-gray-500">
          </div>
        </div>

        <!-- Password Change Section -->
        <div class="space-y-3">
          <h3 class="text-sm font-medium text-gray-800 border-t pt-3">Change Password</h3>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" id="current-password" placeholder="Enter current password" 
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" id="new-password" placeholder="Enter new password" 
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" id="confirm-password" placeholder="Confirm new password" 
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button id="save-profile" class="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            Save Profile
          </button>
          <button id="change-password" class="w-full px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
            Update Password
          </button>
        </div>
      </div>
    </div>
  </div>
`;

  // Add modal to document
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add event listeners
  const modal = document.getElementById("edit-profile-modal");
  const closeModal = document.getElementById("close-modal");
  const photoInput = document.getElementById("photo-input");
  const uploadPhotoBtn = document.getElementById("upload-photo");
  const saveProfileBtn = document.getElementById("save-profile");

  closeModal.addEventListener("click", () => {
    modal.remove();
  });

  uploadPhotoBtn.addEventListener("click", () => {
    photoInput.click();
  });

  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const photoURL = await uploadProfileImage(file);
        document.querySelector(
          "#profile-preview"
        ).innerHTML = `<img src="${photoURL}" alt="Profile" class="w-full h-full object-cover">`;
      } catch (error) {
        alert("Error uploading image. Please try again.");
      }
    }
  });

  // Handle profile save
  saveProfileBtn.addEventListener("click", async () => {
    try {
      const displayName = document.getElementById("display-name").value.trim();
      if (!displayName) {
        alert("Please enter a display name");
        return;
      }

      // Update user profile
      await updateProfile(user, {
        displayName: displayName,
      });

      // Update user data in Firestore
      await updateDoc(userRef, {
        displayName: displayName,
        updatedAt: serverTimestamp(),
      });

      // Update UI
      document.getElementById("user-name").textContent = displayName;

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    }
  });

  // Handle password change
  document
    .getElementById("change-password")
    .addEventListener("click", async () => {
      try {
        const currentPassword =
          document.getElementById("current-password").value;
        const newPassword = document.getElementById("new-password").value;
        const confirmPassword =
          document.getElementById("confirm-password").value;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
          alert("Please fill in all password fields");
          return;
        }

        if (newPassword !== confirmPassword) {
          alert("New passwords do not match");
          return;
        }

        if (newPassword.length < 6) {
          alert("New password must be at least 6 characters long");
          return;
        }

        // Reauthenticate user
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, newPassword);

        // Clear password fields
        document.getElementById("current-password").value = "";
        document.getElementById("new-password").value = "";
        document.getElementById("confirm-password").value = "";

        alert("Password updated successfully!");
      } catch (error) {
        console.error("Error updating password:", error);
        if (error.code === "auth/wrong-password") {
          alert("Current password is incorrect");
        } else {
          alert("Error updating password. Please try again.");
        }
      }
    });
});
