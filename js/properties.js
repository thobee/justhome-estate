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

    console.log("Initializing Firestore query");
    const propertiesQuery = query(collection(db, "properties"));
    console.log("Fetching properties from Firestore...");
    const querySnapshot = await getDocs(propertiesQuery);
    console.log("Properties found:", querySnapshot.size);
    console.log("Query snapshot:", querySnapshot);

    if (querySnapshot.empty) {
      properties = [];
      console.log("No properties found in database");
    } else {
      properties = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("Property Data:", {
          id: doc.id,
          title: data.title,
          status: data.status,
          imageFields: {
            image: data.image,
            imageUrl: data.imageUrl,
            images: data.images,
          },
        });
        const property = {
          id: doc.id,
          ...data,
        };
        return property;
      });
    }

    isLoading = false;
    console.log("Rendering properties:", properties.length);
    await renderProperties(properties);
    updateResultsCount(properties.length);
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
    <div class="col-span-full flex flex-col items-center justify-center py-16">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p class="text-gray-600 text-lg">Loading properties...</p>
    </div>
  `;
}

// Show error state
function showErrorState() {
  propertyGrid.innerHTML = `
    <div class="col-span-full flex flex-col items-center justify-center py-16">
      <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
      <p class="text-gray-600 text-lg mb-2">Failed to load properties</p>
      <p class="text-gray-500 text-sm">Please try again later</p>
      <button onclick="loadProperties()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Try Again
      </button>
    </div>
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

  console.log("Status check:", {
    original: status,
    normalized: normalizedStatus,
  });
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
      <div class="col-span-full flex flex-col items-center justify-center py-20">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <i class="fas fa-home text-3xl text-gray-400"></i>
        </div>
        <h3 class="text-xl font-semibold text-gray-800 mb-2">No properties found</h3>
        <p class="text-gray-600 text-center max-w-md">We couldn't find any properties matching your criteria. Try adjusting your filters or check back later for new listings.</p>
      </div>
    `;
    return;
  }

  // Build all property cards first
  let propertyCardsHTML = "";

  // Pre-fetch user bookings to avoid multiple queries
  let userBookings = [];
  if (currentUser) {
    try {
      console.log("Fetching user bookings for:", currentUser.uid);
      const userBookingsQuery = query(
        collection(db, "bookings"),
        where("userId", "==", currentUser.uid),
        where("status", "in", ["confirmed", "pending_payment"])
      );
      const userBookingsSnapshot = await getDocs(userBookingsQuery);
      userBookings = userBookingsSnapshot.docs.map(doc => doc.data());
      console.log("User bookings found:", userBookings.length);
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

    const propertyCard = `
      <article class="property-card group bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 max-w-xs animate-fade-in-up" style="animation-delay: ${
        index * 0.1
      }s">
        <div class="relative overflow-hidden">
          <!-- Image with zoom effect -->
          <div class="aspect-w-16 aspect-h-12 overflow-hidden">
            <img src="${
              property.image ||
              property.imageUrl ||
              (property.images && property.images[0]) ||
              "images/img1.png"
            }" 
                 alt="${property.title}"
                 class="property-image w-full h-60 object-cover transition-transform duration-700 group-hover:scale-110"/>
          </div>
          <!-- Gradient overlays -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80"></div>
          <div class="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent"></div>
  
          <!-- Status tags with glass effect -->
          <div class="absolute top-4 left-4 flex flex-col gap-2">
            <span class="status-badge ${
              statusInfo.color
            } bg-opacity-90 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              ${statusInfo.text}
            </span>
            ${
              property.type === "rent"
                ? `
              <span class="px-3 py-1.5 text-xs rounded-full bg-green-500 bg-opacity-90 backdrop-blur-md text-white font-medium shadow-lg flex items-center gap-1.5">
                <i class="fas fa-key text-[10px]"></i> FOR RENT
              </span>`
                : ""
            }
            ${
              property.featured
                ? `
              <span class="px-3 py-1.5 text-xs rounded-full bg-amber-400 bg-opacity-90 backdrop-blur-md text-gray-900 font-medium shadow-lg flex items-center gap-1.5">
                <i class="fas fa-star text-[10px]"></i> FEATURED
              </span>`
                : ""
            }
          </div>
  
          <!-- Action Buttons with glass effect -->
          <div class="absolute top-4 right-4 flex gap-2">
            <button onclick="shareProperty('${property.id}')"
                    class="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                    title="Share property">
              <i class="fas fa-share-alt text-gray-700 group-hover:text-blue-600 transition-colors duration-300"></i>
            </button>
            <button onclick="toggleFavorite('${property.id}')"
                    class="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                    title="${
                      isFavorited ? "Remove from favorites" : "Add to favorites"
                    }">
              <i class="fas fa-heart transition-all duration-300 ${
                isFavorited
                  ? "text-red-500 scale-110"
                  : "text-gray-700 group-hover:text-red-500"
              }"></i>
            </button>
          </div>

          <!-- Price tag with glass effect -->
          <div class="absolute bottom-4 left-4">
            <div class="bg-blue-600/90 backdrop-blur-md text-white font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-1">
              <i class="fas fa-tag text-xs"></i>
              <span>${
                property.price ? "₦" + property.price.toLocaleString() : "₦0"
              }</span>
            </div>
          </div>
        </div>
  
        <div class="p-6">
          <!-- Property Info -->
          <div class="mb-4">
            <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
              ${property.title}
            </h3>
            <div class="flex items-center gap-2 text-gray-600">
              <div class="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg">
                <i class="fas fa-map-marker-alt text-blue-500 text-xs"></i>
                <span class="text-sm font-medium line-clamp-1">${
                  property.location || "Unknown"
                }</span>
              </div>
            </div>
            ${
              (property.status === "rented" ||
                property.status === "unavailable") &&
              availabilityDate &&
              !isBookedByUser
                ? `
              <div class="flex items-center gap-2 mt-2 bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded-lg">
                <i class="fas fa-clock"></i>
                <span class="font-medium">Available from ${availabilityDate.toLocaleDateString()}</span>
              </div>
            `
                : ""
            }
          </div>
  
          <!-- Property Features with enhanced design -->
          <div class="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100">
            <div class="flex flex-col items-center p-2 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors duration-200">
              <i class="fas fa-bed text-blue-500 mb-1"></i>
              <span class="text-sm font-medium text-gray-700">${
                property.bedrooms || 0
              } Beds</span>
            </div>
            <div class="flex flex-col items-center p-2 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors duration-200">
              <i class="fas fa-bath text-blue-500 mb-1"></i>
              <span class="text-sm font-medium text-gray-700">${
                property.bathrooms || 0
              } Baths</span>
            </div>
            <div class="flex flex-col items-center p-2 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors duration-200">
              <i class="fas fa-home text-blue-500 mb-1"></i>
              <span class="text-sm font-medium text-gray-700">${
                property.type
                  ? property.type.charAt(0).toUpperCase() +
                    property.type.slice(1)
                  : "N/A"
              }</span>
            </div>
          </div>
  
          <!-- Action Buttons with enhanced design -->
          <div class="flex justify-center items-center mt-4">
            <a href="property-details.html?id=${property.id}" 
               class="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
              <i class="fas fa-search text-xs"></i>
              View Details
            </a>
          </div>
        </div>
      </article>
    `;
    propertyCardsHTML += propertyCard;
  });

  // Set all property cards at once
  propertyGrid.innerHTML = propertyCardsHTML;
}

// Filter properties
async function filterProperties() {
  const location = locationFilter.value.toLowerCase();
  const type = typeFilter.value.toLowerCase();
  const maxPrice = parseInt(priceRange.value);

  const filtered = properties.filter((property) => {
    const matchesLocation =
      !location || property.location.toLowerCase().includes(location);
    const matchesType = !type || property.type.toLowerCase() === type;
    const matchesPrice = !maxPrice || property.price <= maxPrice;
    return matchesLocation && matchesType && matchesPrice;
  });

  await renderProperties(filtered);
  updateResultsCount(filtered.length);
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

  const heartButton = document.querySelector(
    `button[onclick*="${propertyId}"]`
  );
  const heartIcon = heartButton.querySelector("i.fa-heart");

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
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: `Check out this property: ${property.title} in ${property.location}`,
        url: window.location.href,
      });
    } else {
      alert("Property link copied to clipboard!");
    }
  }
}

// Update price range display
function updatePriceRange() {
  const range = document.getElementById("price-range");
  const maxPrice = document.getElementById("max-price");
  maxPrice.textContent = `₦${range.value}${
    range.value == range.max ? "+" : ""
  }`;
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
async function handleSort(sortValue) {
  if (!properties.length) return;

  const sortedProperties = [...properties];

  switch (sortValue) {
    case "newest":
      sortedProperties.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      break;
    case "price-low":
      sortedProperties.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case "price-high":
      sortedProperties.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case "name":
      sortedProperties.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  await renderProperties(sortedProperties);
}

// Reset all filters
async function resetFilters() {
  locationFilter.value = "";
  typeFilter.value = "";
  priceRange.value = priceRange.max;
  document.getElementById("sort-select").value = "newest";

  updatePriceRange();
  await renderProperties(properties);
  updateResultsCount(properties.length);

  // Show success notification
  showNotification("Filters have been reset", "success");
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
  loadProperties();
  initializeSessionTimeout();
});

// Initial setup
updatePriceRange();
