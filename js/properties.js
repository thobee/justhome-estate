import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBo5JRHCEmp3PftMAmHQxJspCPzX0RRPKY",
  authDomain: "estatejs-7c477.firebaseapp.com",
  projectId: "estatejs-7c477",
  storageBucket: "estatejs-7c477.appspot.com",
  messagingSenderId: "156544193291",
  appId: "1:156544193291:web:96e317eb953cf7194fc80e",
  measurementId: "G-T5HCCR6C7M",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Loading state management
let isLoading = true;

// DOM Elements
const propertyGrid = document.getElementById("property-grid");
const locationFilter = document.getElementById("location-filter");
const typeFilter = document.getElementById("type-filter");
const priceRange = document.getElementById("price-range");

let currentUser = null;
let properties = [];
let userSavedProperties = new Set();

// Check authentication state
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    // Load user's saved properties
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const savedProps = userDoc.data().savedProperties || [];
      userSavedProperties = new Set(savedProps);
    }
  } else {
    userSavedProperties.clear();
  }
  loadProperties();
});

// Load properties
async function loadProperties() {
  try {
    isLoading = true;
    showLoadingState();

    const propertiesQuery = query(collection(db, "properties"));
    const querySnapshot = await getDocs(propertiesQuery);

    if (querySnapshot.empty) {
      properties = [];
    } else {
      properties = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const property = {
          id: doc.id,
          ...data,
        };
        return property;
      });
    }

    isLoading = false;
    applyUrlFilters();
    await filterProperties();
  } catch (error) {
    console.error("Error loading properties:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error details:", error);
    isLoading = false;
    showErrorState();
  }
}

// Show loading state
function showLoadingState() {
  propertyGrid.innerHTML = `
    ${Array.from({ length: 6 }, () => `<li class="card p-2" aria-hidden="true"><div class="aspect-[4/3] animate-pulse rounded-2xl bg-ink-100"></div><div class="space-y-3 px-3 pb-4 pt-5"><div class="h-6 w-1/3 animate-pulse rounded bg-ink-100"></div><div class="h-4 w-2/3 animate-pulse rounded bg-ink-100"></div><div class="h-4 w-1/2 animate-pulse rounded bg-ink-100"></div></div></li>`).join("")}
  `;
}

// Show error state
function showErrorState() {
  propertyGrid.innerHTML = `
    <li class="col-span-full flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-16 text-center shadow-soft">
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600"><i class="fas fa-triangle-exclamation text-xl" aria-hidden="true"></i></span>
      <p class="mt-4 text-lg font-semibold text-ink-950">We couldn't load properties</p>
      <p class="mt-1 text-sm text-ink-600">Check your connection and try again.</p>
      <button type="button" onclick="loadProperties()" class="btn-primary mt-6">Try again</button>
    </li>
  `;
}

// Get status color and text
function getStatusInfo(status) {
  // First normalize the status
  let normalizedStatus = status?.toLowerCase();

  // Handle legacy "active" status
  if (normalizedStatus === "active") {
    normalizedStatus = "available";
  }

  const statusMap = {
    available: { color: "bg-green-500", text: "Available" },
    unavailable: { color: "bg-red-500", text: "Unavailable" },
    rented: { color: "bg-gray-500", text: "Rented" },
    sold: { color: "bg-gray-500", text: "Sold" },
  };

  return (
    statusMap[normalizedStatus] || { color: "bg-blue-500", text: "Available" }
  );
}

// Render properties to grid
async function renderProperties(propertiesToRender) {
  if (isLoading) return;

  // Clear the grid first
  propertyGrid.innerHTML = "";

  if (propertiesToRender.length === 0) {
    propertyGrid.innerHTML = `
      <li class="col-span-full flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-16 text-center shadow-soft">
        <span class="flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-500"><i class="fas fa-house text-xl" aria-hidden="true"></i></span>
        <h3 class="mt-4 text-lg font-semibold">No properties found</h3>
        <p class="mt-1 max-w-md text-sm text-ink-600">We couldn't find any properties matching your criteria. Try adjusting your filters or check back later for new listings.</p>
        <button type="button" onclick="resetFilters()" class="btn-secondary mt-6">Clear filters</button>
      </li>
    `;
    return;
  }

  // Build all property cards first
  let propertyCardsHTML = "";

  // Pre-fetch user bookings to avoid multiple queries
  let userBookings = [];
  if (currentUser) {
    try {
      const userBookingsQuery = query(
        collection(db, "bookings"),
        where("userId", "==", currentUser.uid),
        where("status", "in", ["confirmed", "pending_payment"])
      );
      const userBookingsSnapshot = await getDocs(userBookingsQuery);
      userBookings = userBookingsSnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn("Could not fetch user bookings:", error);
      console.warn("Booking fetch error code:", error.code);
      console.warn("Booking fetch error message:", error.message);
    }
  }

  propertiesToRender.forEach((property, index) => {
    const isFavorited = userSavedProperties.has(property.id);

    // Check if property is already booked by current user (using pre-fetched data)
    const isBookedByUser = userBookings.some(booking =>
      booking.propertyId === property.id
    );

    // Check if property is rented/unavailable and get availability date
    let availabilityDate = null;
    if ((property.status === "rented" || property.status === "unavailable") && !isBookedByUser) {
      // For now, we'll skip the availability date check to reduce Firestore queries
      // This can be optimized later with a single query for all properties
      // availabilityDate = new Date(); // Placeholder
    }

    const isUnavailable =
      property.status === "rented" ||
      property.status === "unavailable" ||
      isBookedByUser;

    // Determine status info
    let statusInfo;
    if (isBookedByUser) {
      // If booked by current user, show as unavailable
      statusInfo = { color: "bg-red-500", text: "Unavailable" };
    } else if (
      (property.status === "rented" || property.status === "unavailable") &&
      availabilityDate
    ) {
      // If rented/unavailable by others, show availability date
      statusInfo = {
        color: "bg-orange-500",
        text: `Available ${availabilityDate.toLocaleDateString()}`,
      };
    } else {
      // Otherwise show normal status
      statusInfo = getStatusInfo(property.status || "available");
    }

    const img =
      property.image ||
      property.imageUrl ||
      (property.images && property.images[0]) ||
      "images/opt/photo-unavailable.svg";
    const typeLabel = property.type
      ? property.type.charAt(0).toUpperCase() + property.type.slice(1)
      : "Property";
    const dot = statusInfo.text === "Available" ? "bg-emerald-500" : statusInfo.text === "Unavailable" ? "bg-red-500" : "bg-ink-400";
    const propertyCard = `
      <li>
      <article class="property-card group card relative flex h-full flex-col overflow-hidden p-2 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
        <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-100">
          <img src="${img}" alt="${escapeHtml(property.title || "Property")}" loading="${index < 3 ? "eager" : "lazy"}" decoding="async" width="800" height="600"
               onerror="this.onerror=null;this.src='images/opt/photo-unavailable.svg'"
               class="property-image h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"/>
          <div class="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span class="status-badge chip bg-white/95 text-ink-900 shadow-soft"><span class="h-1.5 w-1.5 rounded-full ${dot}" aria-hidden="true"></span>${statusInfo.text}</span>
            ${property.featured ? `<span class="chip bg-brand-700 text-white"><i class="fas fa-star text-[10px]" aria-hidden="true"></i>Featured</span>` : ""}
          </div>
          <div class="absolute right-2 top-2 z-10 flex gap-1">
            <button type="button" onclick="shareProperty('${property.id}')" aria-label="Share ${escapeHtml(property.title || "property")}"
                    class="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-soft backdrop-blur transition hover:bg-white hover:text-ink-950 active:scale-95">
              <i class="fas fa-share-nodes text-sm" aria-hidden="true"></i>
            </button>
            <button type="button" data-fav="${property.id}" onclick="toggleFavorite('${property.id}')" aria-pressed="${isFavorited}" aria-label="Save ${escapeHtml(property.title || "property")}"
                    class="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-soft backdrop-blur transition hover:bg-white active:scale-95">
              <i class="${isFavorited ? "fas text-red-600" : "far text-ink-700"} fa-heart text-sm transition" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="flex flex-1 flex-col px-3 pb-3 pt-4">
          <p class="tabular text-2xl font-bold text-ink-950">${property.price ? "₦" + Number(property.price).toLocaleString() : "Price on request"}</p>
          <h3 class="mt-1 line-clamp-2 text-lg font-semibold">
            <a href="property-details.html?id=${property.id}" class="after:absolute after:inset-0 after:rounded-3xl">${escapeHtml(property.title || "Untitled property")}</a>
          </h3>
          <p class="mt-1 flex items-center gap-2 text-sm text-ink-600"><i class="fas fa-location-dot text-xs text-ink-400" aria-hidden="true"></i><span class="line-clamp-1">${escapeHtml(property.location || "Location not set")}</span></p>
          <ul class="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-100 pt-4 text-sm text-ink-700" role="list">
            <li class="flex items-center gap-2"><i class="fas fa-bed text-ink-400" aria-hidden="true"></i>${property.bedrooms || 0} beds</li>
            <li class="flex items-center gap-2"><i class="fas fa-bath text-ink-400" aria-hidden="true"></i>${property.bathrooms || 0} baths</li>
            <li class="flex items-center gap-2"><i class="fas fa-building text-ink-400" aria-hidden="true"></i>${typeLabel}</li>
          </ul>
        </div>
      </article>
      </li>
    `;
    propertyCardsHTML += propertyCard;
  });

  // Set all property cards at once
  propertyGrid.innerHTML = propertyCardsHTML;
}

// Filter and sort properties together
function sortList(list, sortValue) {
  const sorted = [...list];
  const time = (p) => (p.createdAt?.seconds ? p.createdAt.seconds * 1000 : new Date(p.createdAt || 0).getTime());
  switch (sortValue) {
    case "price-low": return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    case "price-high": return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    case "name": return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    default: return sorted.sort((a, b) => time(b) - time(a));
  }
}

async function filterProperties() {
  const location = (locationFilter?.value || "").toLowerCase().replace("-", " ");
  const type = (typeFilter?.value || "").toLowerCase();
  const maxPrice = parseInt(priceRange?.value || "0", 10);
  const atMax = priceRange && priceRange.value === priceRange.max;

  const filtered = properties.filter((property) => {
    const matchesLocation = !location || (property.location || "").toLowerCase().includes(location);
    const matchesType = !type || (property.type || "").toLowerCase() === type;
    const matchesPrice = atMax || !maxPrice || (property.price || 0) <= maxPrice;
    return matchesLocation && matchesType && matchesPrice;
  });

  const sorted = sortList(filtered, document.getElementById("sort-select")?.value);
  await renderProperties(sorted);
  updateResultsCount(sorted.length);
}

// Pre-fill filters from the homepage search (?location=&type=&price=)
function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const setIf = (el, v) => {
    if (el && v && [...el.options].some((o) => o.value === v)) el.value = v;
  };
  setIf(locationFilter, params.get("location"));
  setIf(typeFilter, params.get("type"));
  const price = parseInt(params.get("price") || "", 10);
  if (priceRange && price > 0) {
    priceRange.value = String(Math.min(price, Number(priceRange.max)));
    updatePriceRange();
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Toggle favorite with enhanced visual feedback
async function toggleFavorite(propertyId) {
  if (!currentUser) {
    // Show login prompt with animation
    showNotification("Please sign in to save properties to favorites", "info");
    setTimeout(() => {
      window.location.href = "signin.html?redirect=properties.html";
    }, 2000);
    return;
  }

  const heartButton = document.querySelector(`button[data-fav="${propertyId}"]`);
  const heartIcon = heartButton?.querySelector("i.fa-heart");

  if (!heartButton || !heartIcon) return;

  // Add loading state
  heartButton.disabled = true;
  heartIcon.style.transform = "scale(0.8)";
  heartIcon.style.transition = "all 0.2s ease";

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);
    const property = properties.find((p) => p.id === propertyId);

    if (!property) {
      console.error("Property not found:", propertyId);
      showNotification("Property not found", "error");
      return;
    }

    const savedData = {
      id: propertyId,
      title: property.title,
      price: property.price,
      location: property.location,
      imageUrl: property.image || property.imageUrl,
      savedAt: new Date().toISOString(),
    };

    if (userSavedProperties.has(propertyId)) {
      // Remove from favorites
      await updateDoc(userRef, {
        savedProperties: arrayRemove(savedData),
        savedPropertyIds: arrayRemove(propertyId),
      });
      userSavedProperties.delete(propertyId);

      // Update UI with animation
      heartIcon.classList.remove("fas", "text-red-500");
      heartIcon.classList.add("far");
      heartButton.style.backgroundColor = "rgba(255, 255, 255, 0.9)";

      showNotification("Removed from favorites", "success");
    } else {
      // Add to favorites
      await updateDoc(userRef, {
        savedProperties: arrayUnion(savedData),
        savedPropertyIds: arrayUnion(propertyId),
      });
      userSavedProperties.add(propertyId);

      // Update UI with animation
      heartIcon.classList.remove("far");
      heartIcon.classList.add("fas", "text-red-500");
      heartButton.style.backgroundColor = "rgba(255, 255, 255, 0.95)";

      // Add pulse animation
      heartIcon.style.animation = "heartbeat 0.6s ease-in-out";

      showNotification("Added to favorites!", "success");
    }

    // Reset animations
    setTimeout(() => {
      heartIcon.style.transform = "scale(1)";
      heartIcon.style.animation = "";
      heartButton.disabled = false;
    }, 300);
  } catch (error) {
    console.error("Error toggling favorite:", error);
    showNotification("Error saving property. Please try again.", "error");

    // Reset UI on error
    heartIcon.style.transform = "scale(1)";
    heartButton.disabled = false;
  }
}

// Show notification
function showNotification(message, type = "info") {
  if (window.showToast) return window.showToast(message, type === "error" ? "error" : "success");
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(
    ".notification-toast"
  );
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

// Share property function
function shareProperty(propertyId) {
  const property = properties.find((p) => p.id === propertyId);
  if (property) {
    const url = new URL(`property-details.html?id=${propertyId}`, window.location.href).href;
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: `Check out this property: ${property.title} in ${property.location}`,
        url,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => showNotification("Property link copied to clipboard!", "success"),
        () => showNotification("Couldn't copy the link", "error")
      );
    }
  }
}

// Update price range display
function updatePriceRange() {
  const range = document.getElementById("price-range");
  const maxPrice = document.getElementById("max-price");
  if (!range || !maxPrice) return;
  const v = Number(range.value);
  const label = v >= 1e6 ? `₦${(v / 1e6).toFixed(v % 1e6 ? 1 : 0)}M` : `₦${v.toLocaleString()}`;
  maxPrice.textContent = range.value == range.max ? `${label}+` : label;
  range.setAttribute("aria-valuetext", maxPrice.textContent);
}

// Event listeners
locationFilter?.addEventListener("change", filterProperties);
typeFilter?.addEventListener("change", filterProperties);
priceRange?.addEventListener("input", () => {
  updatePriceRange();
  filterProperties();
});

// Update results count
function updateResultsCount(count) {
  const resultsCount = document.getElementById("results-count");
  if (resultsCount) {
    resultsCount.textContent = `Showing ${count} ${
      count === 1 ? "property" : "properties"
    }`;
  }
}

// Load more properties (pagination)
function loadMoreProperties() {
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    // Simulate loading more properties
    setTimeout(() => {
      // In a real app, this would fetch more properties from the database
      // For now, we'll just re-enable the button
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML =
        '<span>Load More Properties</span><i class="fas fa-arrow-down"></i>';
    }, 1500);
  }
}

// Book property from properties listing
function bookProperty(propertyId) {
  if (!currentUser) {
    showNotification("Please sign in to book properties", "info");
    setTimeout(() => {
      window.location.href = "signin.html?redirect=properties.html";
    }, 2000);
    return;
  }

  // Redirect to property details page with booking intent
  window.location.href = `property-details.html?id=${propertyId}&book=true`;
}

// Make functions globally available
window.toggleFavorite = toggleFavorite;
window.shareProperty = shareProperty;
window.bookProperty = bookProperty;
window.updatePriceRange = updatePriceRange;
window.loadProperties = loadProperties;
window.loadMoreProperties = loadMoreProperties;

// Handle sort functionality
async function handleSort() {
  await filterProperties();
}

// Reset all filters
async function resetFilters() {
  locationFilter.value = "";
  typeFilter.value = "";
  priceRange.value = priceRange.max;
  document.getElementById("sort-select").value = "newest";

  updatePriceRange();
  history.replaceState(null, "", window.location.pathname);
  await filterProperties();
}

// Make additional functions globally available
window.handleSort = handleSort;
window.resetFilters = resetFilters;
window.filterProperties = filterProperties;

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
    window.location.href = `signin.html?redirect=properties.html`;
  });

  // Auto-redirect after 10 seconds
  setTimeout(() => {
    window.location.href = `signin.html?redirect=properties.html`;
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

// Initial setup
updatePriceRange();
