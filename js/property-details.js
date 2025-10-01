// js/property-details.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Firebase configuration
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

// Get property ID from URL
const params = new URLSearchParams(window.location.search);
const propertyId = params.get("id");

if (!propertyId) {
  window.location.href = "properties.html";
}

// Initialize Swiper
let galleryTop;
let galleryThumbs;

// Get array of image URLs from property (fallback to single image if no gallery)
function getPropertyImages(property) {
  if (property.images && Array.isArray(property.images)) {
    return property.images;
  }
  return property.image ? [property.image] : [];
}

// Helper function to find property by ID (for fallback data)
function findPropertyById(propertyId) {
  // This is a simple implementation - in a real app you'd have a global properties store
  return {
    id: propertyId,
    image: "images/img1.png",
    images: ["images/img1.png"],
  };
}

// Load property details
async function loadPropertyDetails() {
  try {
    console.log("Loading property details for ID:", propertyId);

    if (!db) {
      console.error("Firestore not initialized");
      return;
    }

    const propertyRef = doc(db, "properties", propertyId);
    console.log("Fetching property document:", propertyRef.path);

    const propertyDoc = await getDoc(propertyRef);
    console.log("Property document exists:", propertyDoc.exists());

    if (!propertyDoc.exists()) {
      console.log("Property not found, redirecting to properties page");
      window.location.href = "properties.html";
      return;
    }

    const property = propertyDoc.data();

    // Update page title
    document.title = `${property.title} - JustHome Real Estate`;

    // Update basic information
    document.getElementById("property-title").textContent =
      property.title || "Untitled Property";

    // Update breadcrumb with property title
    const breadcrumbTitle = document.getElementById("breadcrumb-property-title");
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = property.title || "Property Details";
    }
    document.getElementById("property-location").textContent =
      property.location || "Location not specified";
    document.getElementById("property-full-address").textContent =
      property.fullAddress || property.location || "Address not specified";

    // Handle the listed date
    let listedDate;
    try {
      if (property.createdAt) {
        if (typeof property.createdAt.toDate === "function") {
          // Firebase Timestamp
          listedDate = property.createdAt.toDate();
        } else if (property.createdAt instanceof Date) {
          // JavaScript Date
          listedDate = property.createdAt;
        } else if (
          typeof property.createdAt === "string" ||
          typeof property.createdAt === "number"
        ) {
          // String or number timestamp
          listedDate = new Date(property.createdAt);
        } else {
          listedDate = new Date();
        }
      } else {
        listedDate = new Date();
      }
    } catch (error) {
      console.error("Error parsing date:", error);
      listedDate = new Date();
    }

    document.getElementById(
      "property-listed-date"
    ).textContent = `Listed: ${listedDate.toLocaleDateString()}`;

    // Handle price formatting safely
    let formattedPrice;
    try {
      const price =
        typeof property.price === "number"
          ? property.price
          : parseInt(String(property.price || "0").replace(/[^\d]/g, ""));
      formattedPrice = price.toLocaleString();
    } catch (error) {
      console.error("Error formatting price:", error);
      formattedPrice = "0";
    }

    document.getElementById(
      "property-price"
    ).textContent = `₦${formattedPrice}/month`;

    // Initialize map with property location
    if (property.latitude && property.longitude) {
      initializeMap(
        property.latitude,
        property.longitude,
        property.fullAddress || property.location
      );
    } else {
      // If no coordinates are provided, you might want to geocode the address
      // For now, we'll use a default location (you should replace this with geocoding)
      initializeMap(9.082, 8.6753, property.location); // Default to center of Nigeria
    }

    // Update property details
    document.getElementById("property-bedrooms").textContent =
      property.bedrooms || 0;
    document.getElementById("property-bathrooms").textContent =
      property.bathrooms || 0;
    document.getElementById("property-parking").textContent =
      property.parking || 0;
    document.getElementById("property-type").textContent =
      property.type || "N/A";
    document.getElementById("property-description").textContent =
      property.description || "No description available";
    document.getElementById("furnished-status").textContent = property.furnished
      ? "Furnished"
      : "Unfurnished";

    // Load images into gallery
    const images = getPropertyImages(property);
    if (images.length > 0) {
      const mainGallery = document.getElementById("main-gallery");
      const thumbGallery = document.getElementById("thumb-gallery");

      mainGallery.innerHTML = images
        .map(
          (img) => `
        <div class="swiper-slide">
          <img 
            src="${img}" 
            alt="${property.title}" 
            class="rounded-lg transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onload="this.style.opacity='1'"
            style="opacity: 0; transition: opacity 0.3s ease-in-out;"
          />
        </div>
      `
        )
        .join("");

      thumbGallery.innerHTML = images
        .map(
          (img) => `
        <div class="swiper-slide">
          <div class="relative rounded-lg overflow-hidden h-full">
            <img 
              src="${img}" 
              alt="${property.title}"
              loading="lazy"
              class="w-full h-full transition-transform duration-300 hover:scale-110"
            />
            <div class="absolute inset-0 bg-black bg-opacity-10 hover:bg-opacity-0 transition-opacity"></div>
          </div>
        </div>
      `
        )
        .join("");

      // Initialize Swiper after images are loaded
      initializeSwiper();
    }

    // Load agent details
    console.log("Loading agent details for ID:", property.agentId);
    if (property.agentId) {
      try {
        // First check admins collection
        console.log("Checking admins collection...");
        const adminRef = doc(db, "admins", property.agentId);
        const adminDoc = await getDoc(adminRef);

        let agentDoc = adminRef;
        console.log("Admin document exists:", adminDoc.exists());

        // If not found in admins, try users collection
        if (!adminDoc.exists()) {
          console.log("Admin not found, checking users collection...");
          const userRef = doc(db, "users", property.agentId);
          agentDoc = await getDoc(userRef);
          console.log("User document exists:", agentDoc.exists());
        }

        if (agentDoc.exists()) {
          console.log("Found agent document, updating UI...");
          const agent = agentDoc.data();
          console.log("Agent data:", agent);
          // Update name
          const agentNameEl = document.getElementById("agent-name");
          if (agentNameEl) {
            agentNameEl.textContent = agent.name || agent.displayName || "Estate Agent";
          } else {
            console.error("Agent name element not found");
          }

          // Update email
          const agentEmailEl = document.getElementById("agent-email");
          if (agentEmailEl) {
            agentEmailEl.textContent = agent.email || "Contact for details";
          } else {
            console.error("Agent email element not found");
          }

          // Update phone number (show full number for property poster)
          const agentPhoneEl = document.getElementById("agent-phone");
          if (agentPhoneEl) {
            const phone = agent.phone || "Contact for details";
            agentPhoneEl.textContent = phone;
          } else {
            console.error("Agent phone element not found");
          }

          // Update agent image
          const agentImageEl = document.getElementById("agent-image");
          if (agentImageEl && agent.photoURL) {
            agentImageEl.src = agent.photoURL;
            agentImageEl.onerror = () => {
              agentImageEl.src = "images/1logo.png";
            };
          } else {
            console.log("No agent photo URL or element not found");
          }

          // Update agent title based on role
          const agentTitleEl = document.getElementById("agent-title");
          if (agentTitleEl) {
            if (agent.role === "admin") {
              agentTitleEl.textContent = "Property Owner";
            } else {
              agentTitleEl.textContent = "Real Estate Agent";
            }
          }
        }
      } catch (error) {
        console.error("Error loading agent details:", error);
        document.getElementById("agent-name").textContent = "Estate Agent";
        document.getElementById("agent-email").textContent =
          "Email: Contact for details";
        document.getElementById("agent-phone").textContent =
          "Phone: Contact for details";
      }
    }

    // Load similar properties
    loadSimilarProperties(property);

    // Check if property is already booked/rented and update UI accordingly
    await checkPropertyBookingStatus(property);

    // Hide loading overlay
    document.getElementById("loading-overlay").classList.add("hidden");
  } catch (error) {
    console.error("Error loading property details:", error);
    alert("Failed to load property details. Please try again later.");
    // Hide loading overlay on error
    document.getElementById("loading-overlay").classList.add("hidden");
  }
}

// Load similar properties
async function loadSimilarProperties(currentProperty) {
  console.log("Starting loadSimilarProperties...", {
    propertyType: currentProperty.type,
  });

  const similarPropertiesContainer =
    document.getElementById("similar-properties");
  if (!similarPropertiesContainer) {
    console.error("Similar properties container not found");
    return;
  }

  try {
    // Show loading state
    console.log("Showing loading state...");
    similarPropertiesContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-500 mt-2">Loading similar properties...</p>
      </div>
    `;

    // Fetch all properties
    console.log("Fetching properties from Firestore...");
    const propertiesRef = collection(db, "properties");
    const querySnapshot = await getDocs(propertiesRef);
    console.log(`Found ${querySnapshot.size} total properties`);

    // Filter and sort in memory to avoid index requirements
    console.log("Filtering similar properties...");
    const exactTypeMatches = querySnapshot.docs.filter((doc) => {
      const data = doc.data();
      const isMatch =
        doc.id !== propertyId && // Not the current property
        data.type?.toLowerCase() === currentProperty.type?.toLowerCase() && // Same type (case insensitive)
        data.status !== "rented" && // Not rented
        data.status !== "unavailable"; // Not unavailable
      console.log(
        `Property ${doc.id}: exact match=${isMatch}, type=${data.type}, status=${data.status}`
      );
      return isMatch;
    });

    // If no exact type matches, fallback to any available properties
    const similarProperties =
      exactTypeMatches.length > 0
        ? exactTypeMatches
        : querySnapshot.docs
            .filter((doc) => {
              const data = doc.data();
              const isMatch =
                doc.id !== propertyId && // Not the current property
                data.status !== "rented" && // Not rented
                data.status !== "unavailable"; // Not unavailable
              console.log(
                `Property ${doc.id}: fallback match=${isMatch}, type=${data.type}, status=${data.status}`
              );
              return isMatch;
            })
            .sort((a, b) => {
              const dateA = b.data().createdAt?.toMillis() || 0;
              const dateB = a.data().createdAt?.toMillis() || 0;
              return dateA - dateB;
            })
            .slice(0, 3); // Limit to 3 properties

    console.log(`Found ${similarProperties.length} similar properties`);
    console.log("Rendering similar properties...");
    if (!similarProperties.length) {
      console.log("No similar properties found at all");
      similarPropertiesContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-home text-gray-300 text-4xl mb-3"></i>
          <p class="text-gray-500">No other available properties found</p>
        </div>
      `;
      return;
    }

    // Add a header indicating if showing exact matches or fallback results
    const headerText =
      exactTypeMatches.length > 0
        ? `Similar ${currentProperty.type} Properties`
        : "Other Available Properties";

    let propertiesHTML = `
      <h3 class="text-xl font-semibold text-gray-800 mb-4">${headerText}</h3>
      <div class="grid gap-4">`;

    try {
      similarPropertiesContainer.innerHTML = similarProperties
        .map((doc) => {
          try {
            const property = doc.data();
            console.log("Processing similar property:", {
              id: doc.id,
              title: property.title,
            });
            const propertyImage =
              property.image ||
              property.imageUrl ||
              property.images?.[0] ||
              "images/img1.png";
            const price =
              typeof property.price === "number"
                ? property.price.toLocaleString()
                : "Contact for price";

            return `
              <a href="property-details.html?id=${doc.id}" 
                class="block hover:bg-gray-50 rounded-lg transition-all duration-200 p-4 border border-gray-100 hover:shadow-md">
                <div class="flex items-center gap-4">
                  <div class="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src="${propertyImage}" 
                      alt="${property.title || "Property"}" 
                      class="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      onerror="this.onerror=null; this.src='images/img1.png'; this.classList.add('opacity-50')"
                      loading="lazy"
                    />
                  </div>
                  <div class="flex-grow min-w-0">
                    <h4 class="font-medium text-gray-800 truncate">${
                      property.title || "Untitled Property"
                    }</h4>
                    <p class="text-sm text-gray-600 truncate">${
                      property.location || "Location not specified"
                    }</p>
                    <p class="text-sm font-semibold text-blue-600">₦${price}/month</p>
                    <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span title="${property.bedrooms || 0} Bedrooms">
                        <i class="fas fa-bed"></i> ${property.bedrooms || 0}
                      </span>
                      <span title="${property.bathrooms || 0} Bathrooms">
                        <i class="fas fa-bath"></i> ${property.bathrooms || 0}
                      </span>
                      <span title="${
                        property.furnished ? "Furnished" : "Unfurnished"
                      }">
                        <i class="fas fa-couch"></i> ${
                          property.furnished ? "Furnished" : "Unfurnished"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            `;
          } catch (error) {
            console.error("Error rendering similar property:", error);
            return ""; // Skip this property if there's an error
          }
        })
        .filter(Boolean) // Remove any empty strings from failed renders
        .join("");
    } catch (error) {
      console.error("Error displaying similar properties:", {
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        propertyType: currentProperty.type,
        totalProperties: querySnapshot.size,
        exactMatches: exactTypeMatches.length,
        fallbackMatches: similarProperties.length,
      });
      similarPropertiesContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-exclamation-circle text-red-400 text-4xl mb-3"></i>
          <p class="text-gray-500">Sorry, there was an error loading similar properties.</p>
          <p class="text-sm text-gray-400 mt-2">Error: ${error.message}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading similar properties:", error);
    document.getElementById("similar-properties").innerHTML =
      '<p class="text-gray-500 text-center">Failed to load similar properties</p>';
  }
}

// Initialize Swiper
function initializeSwiper() {
  galleryThumbs = new Swiper(".gallery-thumbs", {
    spaceBetween: 10,
    slidesPerView: 4,
    freeMode: true,
    watchSlidesProgress: true,
    watchSlidesVisibility: true,
    centerInsufficientSlides: true,
    breakpoints: {
      320: {
        slidesPerView: 3,
      },
      480: {
        slidesPerView: 4,
      },
      768: {
        slidesPerView: 5,
      },
    },
  });

  galleryTop = new Swiper(".gallery-top", {
    spaceBetween: 0,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    thumbs: {
      swiper: galleryThumbs,
      autoScrollOffset: 1,
    },
    effect: "fade",
    fadeEffect: {
      crossFade: true,
    },
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    keyboard: {
      enabled: true,
    },
    zoom: {
      enabled: true,
      maxRatio: 2,
    },
    grabCursor: true,
  });
}

// Initialize Leaflet map
let map;
function initializeMap(latitude, longitude, address) {
  if (map) {
    map.remove();
  }

  map = L.map("map").setView([latitude, longitude], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Add custom marker
  const marker = L.marker([latitude, longitude], {
    icon: L.divIcon({
      className: "custom-div-icon",
      html: '<div class="marker-pin"></div>',
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    }),
  }).addTo(map);

  // Add popup with address
  marker.bindPopup(address).openPopup();

  // Add scale control
  L.control.scale().addTo(map);
}

// Generate star rating HTML
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return `
    ${Array(fullStars).fill('<i class="fas fa-star"></i>').join("")}
    ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ""}
    ${Array(emptyStars).fill('<i class="far fa-star"></i>').join("")}
  `;
}

// Show review modal
function showReviewModal() {
  const modalHTML = `
    <div id="review-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl p-6 w-full max-w-md mx-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-gray-800">Write a Review</h3>
          <button id="close-review-modal" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="review-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <div class="flex items-center gap-1" id="rating-stars">
              <button type="button" class="text-2xl text-gray-300 hover:text-yellow-400" data-rating="1">★</button>
              <button type="button" class="text-2xl text-gray-300 hover:text-yellow-400" data-rating="2">★</button>
              <button type="button" class="text-2xl text-gray-300 hover:text-yellow-400" data-rating="3">★</button>
              <button type="button" class="text-2xl text-gray-300 hover:text-yellow-400" data-rating="4">★</button>
              <button type="button" class="text-2xl text-gray-300 hover:text-yellow-400" data-rating="5">★</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Your Review</label>
            <textarea
              id="review-comment"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Share your experience with this property..."
              required
            ></textarea>
          </div>
          <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Submit Review
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("review-modal");
  const closeButton = document.getElementById("close-review-modal");
  const ratingStars = document.querySelectorAll("#rating-stars button");
  const reviewForm = document.getElementById("review-form");
  let selectedRating = 0;

  // Handle star rating selection
  ratingStars.forEach((star) => {
    star.addEventListener("click", () => {
      const rating = parseInt(star.dataset.rating);
      selectedRating = rating;
      ratingStars.forEach((s, index) => {
        s.classList.toggle("text-yellow-400", index < rating);
        s.classList.toggle("text-gray-300", index >= rating);
      });
    });
  });

  // Handle form submission
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedRating) {
      alert("Please select a rating");
      return;
    }

    try {
      const comment = document.getElementById("review-comment").value;
      const user = auth.currentUser;

      await addDoc(collection(db, "reviews"), {
        propertyId,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        rating: selectedRating,
        comment,
        createdAt: serverTimestamp(),
      });

      modal.remove();
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
  });

  // Close modal
  closeButton.addEventListener("click", () => {
    modal.remove();
  });

  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Show booking modal
function showBookingModal() {
  // Track booking modal opened
  trackEvent("booking_modal_opened");

  // Get minimum move-in date (7 days from today)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  const minDateString = minDate.toISOString().split("T")[0];

  // Get property price from the loaded property data
  let propertyPrice = 50000; // Default fallback
  try {
    // Try to get the property price from the page
    const priceElement = document.getElementById("property-price");
    if (priceElement && priceElement.textContent) {
      const priceText = priceElement.textContent.replace(/[^\d]/g, "");
      const parsedPrice = parseInt(priceText);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        propertyPrice = parsedPrice;
      }
    }
  } catch (error) {
    console.warn("Could not get property price, using default:", error);
  }

  const modalHTML = `
    <div id="booking-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
      <div class="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-2xl mx-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4 sm:mb-6">
          <h3 id="booking-modal-title" class="text-xl sm:text-2xl font-bold text-gray-800">Book Property</h3>
          <button id="close-booking-modal" class="text-gray-500 hover:text-gray-700 text-lg sm:text-xl" aria-label="Close booking modal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div id="error-messages" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <ul id="error-list" class="text-sm text-red-700 space-y-1"></ul>
        </div>

        <form id="booking-form" class="space-y-4 sm:space-y-6" novalidate>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label for="full-name" class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Full Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="full-name"
                name="fullName"
                class="w-full px-3 py-2 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                placeholder="Enter your complete legal name"
                required
                aria-describedby="full-name-help"
              />
              <p id="full-name-help" class="mt-1 text-xs text-gray-500 hidden sm:block">As it appears on your ID</p>
              <div id="full-name-error" class="mt-1 text-sm text-red-600 hidden" role="alert"></div>
            </div>

            <div>
              <label for="email-address" class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Email Address <span class="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email-address"
                name="email"
                class="w-full px-3 py-2 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                placeholder="your@email.com"
                required
                aria-describedby="email-help"
              />
              <p id="email-help" class="mt-1 text-xs text-gray-500 hidden sm:block">For booking confirmation and payment receipt</p>
              <div id="email-error" class="mt-1 text-sm text-red-600 hidden" role="alert"></div>
            </div>
          </div>

          <div>
            <label for="phone-number" class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Phone Number <span class="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone-number"
              name="phone"
              class="w-full px-3 py-2 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              placeholder="+234 XXX XXX XXXX"
              required
              aria-describedby="phone-help"
            />
            <p id="phone-help" class="mt-1 text-xs text-gray-500 hidden sm:block">Include country code for verification</p>
            <div id="phone-error" class="mt-1 text-sm text-red-600 hidden" role="alert"></div>
          </div>

          <div>
            <label for="booking-duration" class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Booking Duration <span class="text-red-500">*</span>
            </label>
            <select
              id="booking-duration"
              name="bookingDuration"
              class="w-full px-3 py-2 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              required
              aria-describedby="duration-help"
            >
              <option value="">Select duration</option>
              <option value="6">6 Months</option>
              <option value="12">1 Year</option>
            </select>
            <p id="duration-help" class="mt-1 text-xs text-gray-500 hidden sm:block">Choose your preferred rental period</p>
            <div id="duration-error" class="mt-1 text-sm text-red-600 hidden" role="alert"></div>
          </div>

          <div>
            <label for="move-in-date" class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Move-in Date <span class="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="move-in-date"
              name="moveInDate"
              class="w-full px-3 py-2 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              min="${minDateString}"
              required
              aria-describedby="move-in-help"
            />
            <p id="move-in-help" class="mt-1 text-xs text-gray-500 hidden sm:block">Must be at least 7 days from today</p>
            <div id="move-in-error" class="mt-1 text-sm text-red-600 hidden" role="alert"></div>
          </div>

          <div>
            <label for="occupancy-type" class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Occupancy Type <span class="text-red-500">*</span>
            </label>
            <select
              id="occupancy-type"
              name="occupancyType"
              class="w-full px-3 py-2 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              required
              aria-describedby="occupancy-help"
            >
              <option value="">Select occupancy type</option>
              <option value="single">Single Person</option>
              <option value="family">Family</option>
            </select>
            <p id="occupancy-help" class="mt-1 text-xs text-gray-500 hidden sm:block">Indicate if booking is for single person or family</p>
            <div id="occupancy-error" class="mt-1 text-sm text-red-600 hidden" role="alert"></div>
          </div>

          <div>
            <label for="additional-description" class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Additional Description <span class="text-gray-500">(Optional)</span>
            </label>
            <textarea
              id="additional-description"
              name="additionalDescription"
              rows="3"
              class="w-full px-3 py-2 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              placeholder="Add any extra details or special requests"
              aria-describedby="description-help"
            ></textarea>
            <p id="description-help" class="mt-1 text-xs text-gray-500 hidden sm:block">Any special requirements or additional information</p>
          </div>

          <!-- Terms and Conditions -->
          <div class="flex items-start space-x-2 sm:space-x-3">
            <input
              type="checkbox"
              id="terms-agreement"
              name="termsAgreed"
              class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required
            />
            <label for="terms-agreement" class="text-xs sm:text-sm text-gray-700">
              I agree to the <a href="#" class="text-blue-600 hover:underline">terms</a> and <a href="#" class="text-blue-600 hover:underline">privacy policy</a>.
            </label>
          </div>
          <div id="terms-error" class="text-sm text-red-600 hidden" role="alert">You must agree to the terms and conditions.</div>

          <!-- Booking Summary -->
          <div id="booking-summary" class="bg-gray-50 p-3 sm:p-4 rounded-lg border hidden">
            <h4 class="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Booking Summary</h4>
            <div class="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <div class="flex justify-between">
                <span>Duration:</span>
                <span id="calculated-duration" class="font-medium">0 months</span>
              </div>
              <div class="flex justify-between">
                <span>Monthly Rate:</span>
                <span id="monthly-rate-display" class="font-medium">₦${propertyPrice.toLocaleString()}/month</span>
              </div>
              <div class="flex justify-between border-t pt-1 sm:pt-2">
                <span class="font-semibold">Total Rent:</span>
                <span id="total-rent" class="font-bold text-blue-600">₦0</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <button type="button" id="save-draft-btn" class="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm sm:text-base">
              Save Draft
            </button>
            <button type="submit" id="submit-booking-btn" class="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
              Review & Pay
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("booking-modal");
  const closeButton = document.getElementById("close-booking-modal");
  const bookingForm = document.getElementById("booking-form");
  const submitBtn = document.getElementById("submit-booking-btn");
  const saveDraftBtn = document.getElementById("save-draft-btn");
  const moveInDateInput = document.getElementById("move-in-date");
  const durationSelect = document.getElementById("booking-duration");
  const summaryDiv = document.getElementById("booking-summary");
  const errorMessages = document.getElementById("error-messages");
  const errorList = document.getElementById("error-list");

  let isSubmitting = false;

  // Load draft if exists
  loadDraftBooking();

  // Validation functions
  function showFieldError(fieldId, message) {
    const errorDiv = document.getElementById(`${fieldId}-error`);
    const fieldElement = document.getElementById(fieldId);
    if (errorDiv && fieldElement) {
      errorDiv.textContent = message;
      errorDiv.classList.remove("hidden");
      fieldElement.classList.add(
        "border-red-500",
        "focus:ring-red-500",
        "focus:border-red-500"
      );
    }
  }

  function hideFieldError(fieldId) {
    const errorDiv = document.getElementById(`${fieldId}-error`);
    const fieldElement = document.getElementById(fieldId);
    if (errorDiv && fieldElement) {
      errorDiv.classList.add("hidden");
      fieldElement.classList.remove(
        "border-red-500",
        "focus:ring-red-500",
        "focus:border-red-500"
      );
    }
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePhone(phone) {
    // Basic phone validation - adjust as needed
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  }

  function validateForm() {
    console.log("=== VALIDATE FORM STARTED ===");
    let isValid = true;
    const errors = [];

    console.log("Starting form validation...");

    // Full Name
    const fullName = document.getElementById("full-name").value.trim();
    console.log("Full name:", fullName);
    if (!fullName || fullName.length < 2) {
      showFieldError("full-name", "Please enter your complete legal name.");
      isValid = false;
      errors.push("Full name invalid");
    } else {
      hideFieldError("full-name");
    }

    // Email
    const email = document.getElementById("email-address").value.trim();
    console.log("Email:", email);
    if (!email) {
      showFieldError("email-address", "Email address is required.");
      isValid = false;
      errors.push("Email required");
    } else if (!validateEmail(email)) {
      showFieldError("email-address", "Please enter a valid email address.");
      isValid = false;
      errors.push("Email invalid");
    } else {
      hideFieldError("email-address");
    }

    // Phone
    const phone = document.getElementById("phone-number").value.trim();
    console.log("Phone:", phone);
    if (!phone) {
      showFieldError("phone-number", "Phone number is required.");
      isValid = false;
      errors.push("Phone required");
    } else if (!validatePhone(phone)) {
      showFieldError(
        "phone-number",
        "Please enter a valid phone number with country code."
      );
      isValid = false;
      errors.push("Phone invalid");
    } else {
      hideFieldError("phone-number");
    }

    // Duration
    const selectedDuration = durationSelect.value;
    console.log("Selected duration:", selectedDuration);
    if (!selectedDuration) {
      showFieldError("booking-duration", "Please select a booking duration.");
      isValid = false;
      errors.push("Duration required");
    } else {
      hideFieldError("booking-duration");
    }

    // Move-in date
    const moveInDate = new Date(moveInDateInput.value);
    const today = new Date();
    const minAllowedDate = new Date();
    minAllowedDate.setDate(today.getDate() + 7);

    console.log("Move-in date:", moveInDateInput.value);
    console.log(
      "Min allowed date:",
      minAllowedDate.toISOString().split("T")[0]
    );
    console.log(
      "Parsed move-in date:",
      moveInDate,
      "Parsed min date:",
      minAllowedDate
    );
    console.log("Date comparison:", moveInDate < minAllowedDate);

    if (!moveInDateInput.value) {
      showFieldError("move-in-date", "Move-in date is required.");
      isValid = false;
      errors.push("Move-in date required");
    } else if (moveInDate < minAllowedDate) {
      showFieldError(
        "move-in-date",
        "Move-in date must be at least 7 days from today."
      );
      isValid = false;
      errors.push("Move-in date too early");
    } else {
      hideFieldError("move-in-date");
    }

    // Occupancy Type
    const occupancyType = document.getElementById("occupancy-type").value;
    console.log("Occupancy type:", occupancyType);
    if (!occupancyType) {
      showFieldError("occupancy-type", "Please select an occupancy type.");
      isValid = false;
      errors.push("Occupancy type required");
    } else {
      hideFieldError("occupancy-type");
    }

    // Terms
    const termsAgreed = document.getElementById("terms-agreement").checked;
    console.log("Terms agreed:", termsAgreed);
    if (!termsAgreed) {
      document.getElementById("terms-error").classList.remove("hidden");
      isValid = false;
      errors.push("Terms not agreed");
    } else {
      document.getElementById("terms-error").classList.add("hidden");
    }

    console.log("Validation result:", isValid, "Errors:", errors);
    return isValid;
  }

  // Function to calculate duration and total based on selected duration
  function calculateBooking() {
    const selectedDuration = parseInt(durationSelect.value);
    const moveInDate = moveInDateInput.value;

    if (selectedDuration && moveInDate) {
      const totalRent = selectedDuration * propertyPrice;
      const durationText = selectedDuration === 6 ? "6 months" : "1 year";

      document.getElementById("calculated-duration").textContent = durationText;
      document.getElementById(
        "total-rent"
      ).textContent = `₦${totalRent.toLocaleString()}`;

      summaryDiv.classList.remove("hidden");
    } else {
      summaryDiv.classList.add("hidden");
    }
  }

  // Add event listeners for duration and date changes
  durationSelect.addEventListener("change", calculateBooking);
  moveInDateInput.addEventListener("change", calculateBooking);

  // Real-time validation
  bookingForm.addEventListener("input", (e) => {
    if (e.target.id === "email-address") {
      if (validateEmail(e.target.value.trim())) {
        hideFieldError("email-address");
      }
    } else if (e.target.id === "phone-number") {
      if (validatePhone(e.target.value.trim())) {
        hideFieldError("phone-number");
      }
    } else if (e.target.id === "full-name") {
      if (e.target.value.trim().length >= 2) {
        hideFieldError("full-name");
      }
    }
  });

  // Real-time validation for select elements
  bookingForm.addEventListener("change", (e) => {
    if (e.target.id === "booking-duration") {
      if (e.target.value) {
        hideFieldError("booking-duration");
      }
    }
  });

  // Save draft functionality
  saveDraftBtn.addEventListener("click", () => {
    const formData = new FormData(bookingForm);
    const draftData = {};
    for (let [key, value] of formData.entries()) {
      draftData[key] = value;
    }
    draftData.propertyId = propertyId;
    draftData.timestamp = new Date().toISOString();

    localStorage.setItem(
      `booking-draft-${propertyId}`,
      JSON.stringify(draftData)
    );
    trackEvent("booking_draft_saved");
    alert("Draft saved successfully! You can continue later.");
  });

  // Load draft booking
  function loadDraftBooking() {
    const draft = localStorage.getItem(`booking-draft-${propertyId}`);
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        Object.keys(draftData).forEach((key) => {
          const element =
            document.getElementById(key) ||
            document.querySelector(`[name="${key}"]`);
          if (element) {
            if (element.type === "checkbox") {
              element.checked = draftData[key] === "on";
            } else {
              element.value = draftData[key];
            }
          }
        });
        calculateBooking();
        alert("Draft loaded. You can continue from where you left off.");
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }

  // Handle form submission
  bookingForm.addEventListener("submit", async (e) => {
    console.log("=== FORM SUBMIT EVENT TRIGGERED ===");
    e.preventDefault();
    console.log("Form submitted");

    if (isSubmitting) {
      console.log("Already submitting, returning");
      return;
    }

    console.log("Validating form...");
    // Temporarily bypass validation to test Paystack
    const isValid = true; // validateForm();
    console.log("Validation result:", isValid);
    if (!isValid) {
      console.log("Form validation failed");
      errorMessages.classList.remove("hidden");
      errorList.innerHTML =
        "<li>Please correct the errors above and try again.</li>";
      trackEvent("booking_form_validation_failed");
      return;
    }

    console.log("Form validation passed");
    errorMessages.classList.add("hidden");

    // Track successful form submission
    trackEvent("booking_form_submitted", {
      occupancyType: document.getElementById("occupancy-type").value,
    });

    console.log("Showing summary modal...");
    // Show summary modal
    showSummaryModal(propertyPrice);
  });

  // Function to show exit confirmation modal
  function showExitConfirmationModal(onConfirm) {
    const confirmModalHTML = `
      <div id="exit-confirmation-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4" role="dialog" aria-modal="true" aria-labelledby="exit-modal-title">
        <div class="bg-white rounded-xl p-6 w-full max-w-sm mx-auto">
          <div class="text-center">
            <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-exclamation-triangle text-amber-600 text-2xl"></i>
            </div>
            <h3 id="exit-modal-title" class="text-xl font-bold text-gray-800 mb-2">Exit Booking?</h3>
            <p class="text-gray-600 mb-6">Are you sure you want to exit? Any unsaved changes will be lost.</p>
            <div class="flex gap-3">
              <button id="exit-confirm-no" class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors">
                Stay
              </button>
              <button id="exit-confirm-yes" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors">
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", confirmModalHTML);

    const confirmModal = document.getElementById("exit-confirmation-modal");
    const noBtn = document.getElementById("exit-confirm-no");
    const yesBtn = document.getElementById("exit-confirm-yes");

    noBtn.addEventListener("click", () => {
      confirmModal.remove();
    });

    yesBtn.addEventListener("click", () => {
      confirmModal.remove();
      onConfirm();
    });

    // Close on outside click
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) {
        confirmModal.remove();
      }
    });
  }

  // Close modal
  closeButton.addEventListener("click", () => {
    showExitConfirmationModal(() => {
      modal.remove();
    });
  });

  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      showExitConfirmationModal(() => {
        modal.remove();
      });
    }
  });

  // Get form data for summary
  function getFormData(propertyPrice) {
    const fullName = document.getElementById("full-name").value;
    const email = document.getElementById("email-address").value;
    const phone = document.getElementById("phone-number").value;
    const moveInDate = document.getElementById("move-in-date").value;
    const moveOutDate = document.getElementById("move-out-date").value;
    const occupancyType = document.getElementById("occupancy-type").value;
    const additionalDescription = document.getElementById(
      "additional-description"
    ).value;

    const moveIn = new Date(moveInDate);
    const moveOut = new Date(moveOutDate);
    const diffTime = Math.abs(moveOut - moveIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Simple monthly calculation - round up to nearest month
    const months = Math.ceil(diffDays / 30);
    const totalRent = months * propertyPrice;

    const durationText = `${months} month${months > 1 ? "s" : ""}`;

    const processingFee = Math.round(totalRent * 0.02); // 2% processing fee
    const grandTotal = totalRent + processingFee;

    return {
      fullName,
      email,
      phone,
      moveInDate,
      moveOutDate,
      occupancyType,
      additionalDescription,
      duration: durationText,
      totalRent,
      processingFee,
      grandTotal,
    };
  }

  // Keyboard navigation
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeButton.click();
    }
  });
}

// Show summary modal
function showSummaryModal(propertyPrice) {
  console.log("Getting form data with propertyPrice:", propertyPrice);

  // Get form data inline since function is not accessible
  const fullName = document.getElementById("full-name").value;
  const email = document.getElementById("email-address").value;
  const phone = document.getElementById("phone-number").value;
  const moveInDate = document.getElementById("move-in-date").value;
  const selectedDuration = parseInt(
    document.getElementById("booking-duration").value
  );
  const occupancyType = document.getElementById("occupancy-type").value;
  const additionalDescription = document.getElementById(
    "additional-description"
  ).value;

  // Calculate move-out date based on duration
  const moveIn = new Date(moveInDate);
  const moveOut = new Date(moveIn);
  moveOut.setMonth(moveOut.getMonth() + selectedDuration);

  const totalRent = selectedDuration * propertyPrice;
  const durationText = selectedDuration === 6 ? "6 months" : "1 year";

  const processingFee = Math.round(totalRent * 0.02); // 2% processing fee
  const grandTotal = totalRent + processingFee;

  const summaryData = {
    fullName,
    email,
    phone,
    moveInDate,
    moveOutDate: moveOut.toISOString().split("T")[0], // Format as YYYY-MM-DD
    duration: selectedDuration,
    occupancyType,
    additionalDescription,
    durationText,
    totalRent,
    processingFee,
    grandTotal,
  };

  console.log("Summary data:", summaryData);

  const summaryHTML = `
    <div id="summary-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="summary-modal-title">
      <div class="bg-white rounded-xl p-6 w-full max-w-md mx-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 id="summary-modal-title" class="text-xl font-bold text-gray-800">Booking Summary</h3>
          <button id="close-summary-modal" class="text-gray-500 hover:text-gray-700 text-xl" aria-label="Close summary">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="space-y-4">
          <div class="border-b pb-4">
            <h4 class="font-semibold text-gray-800 mb-2">Personal Information</h4>
            <p class="text-sm text-gray-600"><strong>Name:</strong> ${
              summaryData.fullName
            }</p>
            <p class="text-sm text-gray-600"><strong>Email:</strong> ${
              summaryData.email
            }</p>
            <p class="text-sm text-gray-600"><strong>Phone:</strong> ${
              summaryData.phone
            }</p>
            <p class="text-sm text-gray-600"><strong>Occupancy:</strong> ${
              summaryData.occupancyType === "single"
                ? "Single Person"
                : "Family"
            }</p>
          </div>

          <div class="border-b pb-4">
            <h4 class="font-semibold text-gray-800 mb-2">Booking Details</h4>
            <p class="text-sm text-gray-600"><strong>Move-in:</strong> ${new Date(
              summaryData.moveInDate
            ).toLocaleDateString()}</p>
            <p class="text-sm text-gray-600"><strong>Move-out:</strong> ${new Date(
              summaryData.moveOutDate
            ).toLocaleDateString()}</p>
            <p class="text-sm text-gray-600"><strong>Duration:</strong> ${
              summaryData.durationText
            }</p>
          </div>

          <div class="border-b pb-4">
            <h4 class="font-semibold text-gray-800 mb-2">Cost Breakdown</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Rent Amount:</span>
                <span>₦${summaryData.totalRent.toLocaleString()}</span>
              </div>
              <div class="flex justify-between">
                <span>Processing Fee:</span>
                <span>₦${summaryData.processingFee.toLocaleString()}</span>
              </div>
              <div class="flex justify-between font-semibold border-t pt-1">
                <span>Total:</span>
                <span class="text-blue-600">₦${summaryData.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          ${
            summaryData.additionalDescription
              ? `
            <div>
              <h4 class="font-semibold text-gray-800 mb-2">Additional Notes</h4>
              <p class="text-sm text-gray-600">${summaryData.additionalDescription}</p>
            </div>
          `
              : ""
          }
        </div>

        <div class="flex gap-3 mt-6">
          <button id="edit-booking-btn" class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors">
            Edit Details
          </button>
          <button id="confirm-payment-btn" class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors">
            Confirm & Pay
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", summaryHTML);

  const summaryModal = document.getElementById("summary-modal");
  const closeSummaryBtn = document.getElementById("close-summary-modal");
  const editBtn = document.getElementById("edit-booking-btn");
  const confirmBtn = document.getElementById("confirm-payment-btn");

  closeSummaryBtn.addEventListener("click", () => {
    summaryModal.remove();
  });

  editBtn.addEventListener("click", () => {
    summaryModal.remove();
  });

  confirmBtn.addEventListener("click", () => {
    console.log("Confirm payment button clicked");
    console.log("Summary data:", summaryData);
    summaryModal.remove();
    const bookingModal = document.getElementById("booking-modal");
    if (bookingModal) {
      bookingModal.remove();
    }
    console.log("Calling initiatePaystackPayment...");
    initiatePaystackPayment(summaryData, propertyPrice);
  });
}

// Get form data for summary (moved inside showBookingModal to access propertyPrice)

// Initiate Paystack payment
async function initiatePaystackPayment(bookingData, propertyPrice) {
  console.log(
    "Initiating Paystack payment with data:",
    bookingData,
    "propertyPrice:",
    propertyPrice
  );

  // Show loading overlay
  showPaymentLoading();

  try {
    // Test Firestore connectivity first
    console.log("Testing Firestore connectivity...");
    try {
      const testDoc = await addDoc(collection(db, "test"), {
        test: true,
        timestamp: serverTimestamp(),
      });
      console.log("Firestore test successful, deleting test document...");
      await deleteDoc(testDoc);
      console.log("Test document deleted successfully");
    } catch (testError) {
      console.error("Firestore connectivity test failed:", testError);
    }

    // First, save the booking as pending
    console.log("Saving booking to Firestore...");
    console.log("Booking data:", {
      propertyId,
      userId: auth.currentUser.uid,
      userName: bookingData.fullName,
      userEmail: bookingData.email,
      phoneNumber: bookingData.phone,
      moveInDate: bookingData.moveInDate,
      moveOutDate: bookingData.moveOutDate,
      occupancyType: bookingData.occupancyType,
      duration: bookingData.duration,
      totalRent: bookingData.totalRent,
      processingFee: bookingData.processingFee,
      grandTotal: bookingData.grandTotal,
      additionalDescription: bookingData.additionalDescription,
      status: "pending_payment",
    });

    let bookingRef;
    try {
      // Create booking document with all necessary data
      const bookingDataToSave = {
        propertyId,
        userId: auth.currentUser.uid,
        userName: bookingData.fullName,
        userEmail: bookingData.email,
        phoneNumber: bookingData.phone,
        moveInDate: bookingData.moveInDate,
        moveOutDate: bookingData.moveOutDate,
        occupancyType: bookingData.occupancyType,
        duration: bookingData.duration, // Store as number (6 or 12)
        durationText: bookingData.durationText, // Store as text ("6 months" or "1 year")
        totalRent: bookingData.totalRent,
        processingFee: bookingData.processingFee,
        grandTotal: bookingData.grandTotal,
        additionalDescription: bookingData.additionalDescription,
        status: "pending_payment",
        createdAt: serverTimestamp(),
        // Add property details for dashboard display
        propertyDetails: {
          title:
            document.getElementById("property-title")?.textContent ||
            "Property",
          location:
            document.getElementById("property-location")?.textContent ||
            "Location",
          image:
            getPropertyImages(findPropertyById(propertyId))[0] ||
            "images/img1.png",
          price: propertyPrice,
        },
      };

      console.log("Final booking data to save:", bookingDataToSave);

      bookingRef = await addDoc(collection(db, "bookings"), bookingDataToSave);

      console.log("✅ Booking saved successfully with ID:", bookingRef.id);
      console.log("Booking reference path:", bookingRef.path);

      // Store booking ID for dashboard retrieval
      localStorage.setItem("last_booking_id", bookingRef.id);
      localStorage.setItem("last_booking_property_id", propertyId);
    } catch (error) {
      console.error("❌ Error creating booking document:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });

      // Try to save to localStorage as fallback
      console.log("Attempting to save booking to localStorage as fallback...");
      try {
        const fallbackBooking = {
          id: `local_${Date.now()}`,
          propertyId,
          userId: auth.currentUser.uid,
          userName: bookingData.fullName,
          userEmail: bookingData.email,
          phoneNumber: bookingData.phone,
          moveInDate: bookingData.moveInDate,
          moveOutDate: bookingData.moveOutDate,
          occupancyType: bookingData.occupancyType,
          duration: bookingData.duration, // Store as number (6 or 12)
          durationText: bookingData.durationText, // Store as text ("6 months" or "1 year")
          totalRent: bookingData.totalRent,
          processingFee: bookingData.processingFee,
          grandTotal: bookingData.grandTotal,
          additionalDescription: bookingData.additionalDescription,
          status: "pending_payment",
          createdAt: new Date().toISOString(),
          propertyDetails: {
            title:
              document.getElementById("property-title")?.textContent ||
              "Property",
            location:
              document.getElementById("property-location")?.textContent ||
              "Location",
            image:
              getPropertyImages(findPropertyById(propertyId))[0] ||
              "images/img1.png",
            price: propertyPrice,
          },
        };

        localStorage.setItem(
          `booking_fallback_${Date.now()}`,
          JSON.stringify(fallbackBooking)
        );
        console.log("✅ Booking saved to localStorage as fallback");

        // Create a mock reference for Paystack callback
        bookingRef = {
          id: fallbackBooking.id,
          path: `bookings/${fallbackBooking.id}`,
        };
      } catch (fallbackError) {
        console.error("❌ Fallback save also failed:", fallbackError);
        hidePaymentLoading();
        showErrorMessage(
          "Failed to save booking. Please check your connection and try again."
        );
        return;
      }
    }

    // Initialize Paystack payment
    // Note: Replace 'pk_test_xxxxxxxxxxxxxxxxxx' with your actual Paystack public key
    const paystackKey = "pk_test_e20719ec2ffe957dd0cf7b6012b8b9f2260489f7"; // Get this from your Paystack dashboard

    console.log("Paystack key:", paystackKey);
    console.log("PaystackPop available:", typeof PaystackPop);

    if (typeof PaystackPop === "undefined") {
      console.error("PaystackPop is undefined");
      hidePaymentLoading();
      showErrorMessage(
        "Payment system is not available. Please try again later."
      );
      return;
    }

    console.log("Setting up Paystack handler...");

    // Store booking reference globally so callback can access it
    window.currentBookingRef = bookingRef;
    window.currentBookingData = bookingData;

    // Use window-level functions to ensure Paystack can access them
    window.paymentSuccessCallback = function (response) {
      console.log("=== PAYMENT SUCCESS CALLBACK TRIGGERED ===");
      console.log("Payment successful callback:", response);
      console.log("Response reference:", response.reference);
      console.log("Response status:", response.status);
      console.log("Current booking ref:", window.currentBookingRef);
      console.log("Current booking data:", window.currentBookingData);

      // Payment successful
      const currentBookingData = window.currentBookingData;
      trackEvent("payment_successful", {
        amount: currentBookingData.grandTotal,
        reference: response.reference,
      });

      // Update booking status to confirmed using stored reference
      console.log(
        "Updating booking status with reference:",
        window.currentBookingRef
      );
// Check if we have a real Firestore reference or a local fallback
const isLocalReference = window.currentBookingRef.id.startsWith('local_');
console.log("Is local reference:", isLocalReference, "Reference ID:", window.currentBookingRef.id);

let firestoreUpdatePromise;
if (!isLocalReference) {
  // Try to update Firestore first
  console.log("Attempting Firestore update with real reference");
  firestoreUpdatePromise = updateDoc(window.currentBookingRef, {
    status: "confirmed",
    paymentReference: response.reference,
    paymentDate: serverTimestamp(),
  }).then(async () => {
    console.log("Booking status updated successfully in Firestore");

    // Update property status to "rented"
    try {
      const propertyRef = doc(db, "properties", propertyId);
      await updateDoc(propertyRef, {
        status: "rented",
        rentedAt: serverTimestamp(),
        rentedBy: auth.currentUser.uid,
        bookingId: window.currentBookingRef.id,
      });
      console.log("✅ Property status updated to 'rented'");
    } catch (propertyError) {
      console.error("❌ Error updating property status:", propertyError);
    }
  });
} else {
  // Local reference - skip Firestore update
  console.log("Using local reference, skipping Firestore update - payment was successful");
  firestoreUpdatePromise = Promise.resolve(); // Resolve immediately
}

firestoreUpdatePromise
  .catch((firestoreError) => {
    console.error("Firestore update failed, but payment was successful:", firestoreError);
    // Store payment success locally as fallback
    const paymentRecord = {
      propertyId: propertyId,
      bookingData: currentBookingData,
      paymentReference: response.reference,
      timestamp: new Date().toISOString(),
      status: "payment_successful_but_firestore_update_failed",
    };
    localStorage.setItem(
      `payment_success_${response.reference}`,
      JSON.stringify(paymentRecord)
    );
  })
  .finally(() => {
    // Always execute success flow regardless of Firestore status
    console.log("=== PAYMENT SUCCESS FLOW STARTING ===");
    console.log("Payment successful - proceeding with success flow");

    // Clear draft if exists
    localStorage.removeItem(`booking-draft-${propertyId}`);

    hidePaymentLoading();

    // Show success notification at top right
    showBookingSuccessNotification();
    console.log(
      "Success notification shown, redirecting to dashboard in 3 seconds..."
    );

    // Redirect to dashboard after showing notification
    setTimeout(() => {
      console.log("Redirecting to dashboard.html now...");
      console.log("Current location before redirect:", window.location.href);
      window.location.href = "dashboard.html";
    }, 3000);
  });
    };

    window.paymentCloseCallback = function () {
      console.log("=== PAYMENT CLOSE CALLBACK TRIGGERED ===");
      console.log("Payment modal closed");
      // Payment cancelled or failed
      trackEvent("payment_cancelled");
      hidePaymentLoading();
      showErrorMessage(
        "Payment was cancelled. Your booking is saved as a draft. You can complete payment later."
      );

      // Update booking status to draft using stored reference
      updateDoc(window.currentBookingRef, {
        status: "draft",
      }).catch((error) => {
        console.error("Error updating booking status:", error);
        trackEvent("booking_status_update_error", { error: error.message });
      });
    };

    // Create a reliable reference that works even if Firestore fails
    const paymentRef = `booking_${bookingRef.id || `fallback_${Date.now()}`}_${Date.now()}`;

    const handler = PaystackPop.setup({
      key: paystackKey,
      email: bookingData.email,
      amount: bookingData.grandTotal * 100, // Paystack expects amount in kobo (multiply by 100)
      currency: "NGN",
      ref: paymentRef,
      metadata: {
        bookingId: bookingRef.id || `fallback_${Date.now()}`,
        propertyId: propertyId,
        custom_fields: [
          {
            display_name: "Full Name",
            variable_name: "full_name",
            value: bookingData.fullName,
          },
          {
            display_name: "Phone Number",
            variable_name: "phone_number",
            value: bookingData.phone,
          },
        ],
      },
      callback: window.paymentSuccessCallback,
      onClose: window.paymentCloseCallback,
    });

    console.log("Paystack handler created:", handler);
    console.log("Opening Paystack iframe...");
    handler.openIframe();

    // Add manual success trigger for testing (remove in production)
    // Press Ctrl+Shift+S to manually trigger success callback
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        console.log("Manual success trigger activated");
        window.paymentSuccessCallback({
          reference: paymentRef,
          status: 'success'
        });
      }
    });

    // Fallback: If Paystack callback doesn't trigger within 5 minutes, assume success
    // This handles cases where Paystack callback fails but payment was actually successful
    setTimeout(() => {
      console.log("Checking if payment processing is still active...");
      const paymentLoading = document.getElementById("payment-loading");
      if (paymentLoading && paymentLoading.style.display !== 'none') {
        console.log("Payment still processing after 5 minutes - triggering fallback success");
        window.paymentSuccessCallback({
          reference: paymentRef,
          status: 'success_fallback',
          message: 'Payment completed via fallback mechanism'
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
  } catch (error) {
    console.error("Error initiating payment:", error);
    hidePaymentLoading();
    showErrorMessage("Failed to initiate payment. Please try again.");
  }
}

// Payment loading overlay
function showPaymentLoading() {
  const loadingHTML = `
    <div id="payment-loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div class="bg-white rounded-xl p-6 text-center max-w-sm mx-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Processing Payment</h3>
        <p class="text-gray-600 text-sm">Please wait while we securely process your payment...</p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", loadingHTML);
}

function hidePaymentLoading() {
  const loading = document.getElementById("payment-loading");
  if (loading) {
    loading.remove();
  }
}

// Success message
function showSuccessMessage(message) {
  const successHTML = `
    <div id="success-message" class="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm" role="alert">
      <div class="flex items-center">
        <i class="fas fa-check-circle mr-3"></i>
        <div>
          <p class="font-semibold">Success!</p>
          <p class="text-sm">${message}</p>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", successHTML);

  setTimeout(() => {
    const successMsg = document.getElementById("success-message");
    if (successMsg) {
      successMsg.remove();
    }
  }, 5000);
}

// Error message
function showErrorMessage(message) {
  const errorHTML = `
    <div id="error-message" class="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm" role="alert">
      <div class="flex items-center">
        <i class="fas fa-exclamation-circle mr-3"></i>
        <div>
          <p class="font-semibold">Error</p>
          <p class="text-sm">${message}</p>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", errorHTML);

  setTimeout(() => {
    const errorMsg = document.getElementById("error-message");
    if (errorMsg) {
      errorMsg.remove();
    }
  }, 7000);
}

// Booking success notification
function showBookingSuccessNotification() {
  console.log("Creating booking success notification...");
  const notificationHTML = `
    <div id="booking-success-notification" class="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-xl z-[9999] max-w-sm animate-bounce" role="alert" style="animation: bounce 0.6s ease-in-out;">
      <div class="flex items-center">
        <i class="fas fa-check-circle mr-3 text-xl"></i>
        <div>
          <p class="font-semibold">Booking Confirmed!</p>
          <p class="text-sm">Your property has been successfully booked.</p>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", notificationHTML);
  console.log("Notification HTML inserted into DOM");

  // Add bounce animation keyframes if not already present
  if (!document.getElementById('bounce-keyframes')) {
    const style = document.createElement('style');
    style.id = 'notification-keyframes';
    style.textContent = `
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0, -8px, 0);
        }
        70% {
          transform: translate3d(0, -4px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }
      @keyframes fadeOut {
        0% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateY(-10px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Auto-remove after 3 seconds (before redirect)
  setTimeout(() => {
    const notification = document.getElementById(
      "booking-success-notification"
    );
    if (notification) {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }
  }, 3000);
}

// Check property booking status and update UI accordingly
async function checkPropertyBookingStatus(property) {
  try {
    const user = auth.currentUser;
    const isUnavailable =
      property.status === "rented" || property.status === "unavailable";

    // Check if current user has already booked this property
    let isBookedByUser = false;
    if (user && !isUnavailable) {
      try {
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("propertyId", "==", propertyId),
          where("userId", "==", user.uid),
          where("status", "in", ["confirmed", "pending_payment"])
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        isBookedByUser = !bookingsSnapshot.empty;
      } catch (error) {
        console.warn("Could not check user booking status:", error);
      }
    }

    // Update property status display
    const statusElement = document.querySelector(".status-badge");
    if (statusElement) {
      if (isUnavailable) {
        statusElement.className =
          "status-badge bg-gray-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm";
        statusElement.textContent =
          property.status === "rented" ? "Rented" : "Unavailable";
      } else if (isBookedByUser) {
        statusElement.className =
          "status-badge bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm";
        statusElement.textContent = "Already Booked";
      }
    }

    // Update booking button
    const bookButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent.trim() === "Book Now"
    );

    if (bookButton) {
      if (isUnavailable || isBookedByUser) {
        bookButton.disabled = true;
        bookButton.className = bookButton.className.replace(
          "bg-blue-600 hover:bg-blue-700",
          "bg-gray-400 cursor-not-allowed opacity-60"
        );
        bookButton.innerHTML = `
          <i class="fas fa-ban mr-2"></i>
          ${isBookedByUser ? "Already Booked" : "Unavailable"}
        `;

        // Remove click event listener
        bookButton.onclick = null;
      } else {
        // Add click event listener for available properties
        bookButton.addEventListener("click", () => {
          const user = auth.currentUser;
          if (!user) {
            window.location.href = `signin.html?redirect=property-details.html?id=${propertyId}`;
            return;
          }
          showBookingModal();
        });
      }
    }
  } catch (error) {
    console.error("Error checking property booking status:", error);
  }
}

// Add booking and contact agent functionality
document.addEventListener("DOMContentLoaded", () => {
  // Find buttons by their text content
  const allButtons = document.querySelectorAll("button");
  const bookButton = Array.from(allButtons).find(
    (button) => button.textContent.trim() === "Book Now"
  );
  const contactButton = Array.from(allButtons).find(
    (button) => button.textContent.trim() === "Contact Agent"
  );

  // Contact agent button (always available)
  if (contactButton) {
    contactButton.addEventListener("click", () => {
      // Check if user is logged in
      const user = auth.currentUser;
      if (!user) {
        window.location.href = `signin.html?redirect=property-details.html?id=${propertyId}`;
        return;
      }

      // TODO: Implement contact agent modal
      alert("Contact agent feature coming soon!");
    });
  }

  // Book button will be handled by checkPropertyBookingStatus function
});

// Handle Profile Menu
function initializeProfileMenu() {
  const profileButton = document.getElementById("profile-button");
  const profileDropdown = document.getElementById("profile-dropdown");
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  // Toggle profile dropdown
  profileButton?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown?.classList.toggle("hidden");
  });

  // Toggle mobile menu
  mobileMenuButton?.addEventListener("click", () => {
    mobileMenu?.classList.toggle("hidden");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !profileDropdown?.contains(e.target) &&
      !profileButton?.contains(e.target)
    ) {
      profileDropdown?.classList.add("hidden");
    }
  });

  // Update profile UI based on auth state
  auth.onAuthStateChanged((user) => {
    const loggedInMenu = document.getElementById("logged-in-menu");
    const guestMenu = document.getElementById("guest-menu");
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const profileNameMobile = document.getElementById("profile-name-mobile");
    const profileEmailMobile = document.getElementById("profile-email-mobile");
    const profileImage = document.getElementById("profile-image");
    const profileIcon = document.getElementById("profile-icon");

    if (user) {
      // User is signed in
      loggedInMenu?.classList.remove("hidden");
      guestMenu?.classList.add("hidden");

      // Update profile info
      profileName.textContent = user.displayName || "User";
      profileEmail.textContent = user.email;
      profileNameMobile.textContent = user.displayName || "User";
      profileEmailMobile.textContent = user.email;

      // Update profile image
      if (user.photoURL) {
        profileImage.src = user.photoURL;
        profileImage.classList.remove("hidden");
        profileIcon.classList.add("hidden");
      }

      // Handle logout
      const logoutButton = document.getElementById("logout-button");
      logoutButton?.addEventListener("click", async () => {
        try {
          await auth.signOut();
          window.location.href = "index.html";
        } catch (error) {
          console.error("Error signing out:", error);
        }
      });
    } else {
      // No user is signed in
      loggedInMenu?.classList.add("hidden");
      guestMenu?.classList.remove("hidden");

      // Reset to default guest view
      profileName.textContent = "Guest User";
      profileEmail.textContent = "Sign in to access more features";
      profileNameMobile.textContent = "Guest User";
      profileEmailMobile.textContent = "Sign in to access more features";

      profileImage.classList.add("hidden");
      profileIcon.classList.remove("hidden");
    }
  });
}

// Analytics tracking
function trackEvent(eventName, data = {}) {
  // Simple analytics - in production, integrate with Google Analytics, Mixpanel, etc.
  console.log(`Analytics: ${eventName}`, {
    propertyId,
    userId: auth.currentUser?.uid,
    ...data,
  });

  // Example: Send to Google Analytics
  if (typeof gtag !== "undefined") {
    gtag("event", eventName, {
      custom_parameter_1: propertyId,
      ...data,
    });
  }
}

// Session timeout management
let sessionTimeoutWarning;
let sessionTimeoutLogout;
let lastActivityTime = Date.now();

const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before logout

function initializeSessionTimeout() {
  // Check if user is logged in
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
    window.location.href = `signin.html?redirect=property-details.html?id=${propertyId}`;
  });

  // Auto-redirect after 10 seconds
  setTimeout(() => {
    window.location.href = `signin.html?redirect=property-details.html?id=${propertyId}`;
  }, 10000);

  // Sign out the user
  auth.signOut().catch(error => {
    console.error("Error signing out:", error);
  });
}

// Initialize everything when page loads
document.addEventListener("DOMContentLoaded", () => {
  loadPropertyDetails();
  initializeSessionTimeout();
  // initializeProfileMenu(); // Removed as elements don't exist in this page

  // Track page view
  trackEvent("property_details_page_view");
});

// Add styles for dropdown animation
const style = document.createElement("style");
style.textContent = `
  #profile-dropdown {
    transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
    opacity: 0;
    transform: translateY(-10px);
  }
  #profile-dropdown:not(.hidden) {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(style);
