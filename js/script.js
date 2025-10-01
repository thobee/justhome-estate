// Mock property data (for demo purposes)
// Handle newsletter form submission
function handleNewsletterSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // For demo purposes, we'll just show a success message
  // In a real application, you would send this data to your server
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    interests: formData.get("interests"),
  };

  // Create success message
  const successMessage = document.createElement("div");
  successMessage.className =
    "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-500 transform translate-y-0";
  successMessage.textContent =
    "Thank you for subscribing! We will keep you updated.";

  // Add message to DOM
  document.body.appendChild(successMessage);

  // Reset form
  form.reset();

  // Remove message after 3 seconds
  setTimeout(() => {
    successMessage.style.transform = "translateY(-100%)";
    setTimeout(() => successMessage.remove(), 500);
  }, 3000);

  return false;
}

document.addEventListener("DOMContentLoaded", () => {
  // Mock property data
  const properties = [
    {
      id: 1,
      title: "Modern City Apartment",
      location: "Lagos, Nigeria",
      type: "Apartment",
      budget: "501-1000",
      beds: 2,
      baths: 1,
      size: "100 sqft",
      image: "images/img1.png",
      status: "For Rent",
      daysListed: 5,
      agent: "John Doe",
    },
    {
      id: 2,
      title: "Luxury Downtown Villa",
      location: "Abuja, Nigeria",
      type: "Villa",
      budget: "1001+",
      beds: 4,
      baths: 3,
      size: "250 sqft",
      image: "images/img1.png",
      status: "For Sale",
      daysListed: 12,
      agent: "Jane Smith",
    },
    {
      id: 3,
      title: "Office Space at Northwest",
      location: "Port Harcourt, Nigeria",
      type: "Office",
      budget: "0-500",
      beds: 0,
      baths: 1,
      size: "180 sqft",
      image: "images/img1.png",
      status: "For Lease",
      daysListed: 3,
      agent: "Mike Johnson",
    },
  ];

  // Select elements
  const locationSelect = document.querySelector(
    '.search-input[aria-label="Location"]'
  );
  const typeSelect = document.querySelector(
    '.search-input[aria-label="Property type"]'
  );
  const priceSlider = document.getElementById("price-range");
  const minPrice = document.getElementById("min-price");
  const maxPrice = document.getElementById("max-price");
  const bedsSelect = document.querySelector(
    '.search-input[aria-label="Bedrooms"]'
  );
  const bathsSelect = document.querySelector(
    '.search-input[aria-label="Bathrooms"]'
  );
  const searchBtn = document.querySelector(".search-btn");
  const clearFiltersBtn = document.querySelector(".clear-filters-btn");
  const apartmentsGrid = document.querySelector(".apartments-grid");
  const mapView = document.querySelector(".map-view");
  const viewButtons = document.querySelectorAll(".view-btn");
  const sortSelect = document.querySelector(".sort-select");
  const loadMoreBtn = document.querySelector(".load-more-btn");
  const noResults = document.createElement("p");
  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.querySelector(".main-nav");

  let currentPage = 0;
  const itemsPerPage = 6;
  let maxPriceValue = 2000;

  // Update price display
  if (priceSlider) {
    priceSlider.addEventListener("input", () => {
      maxPriceValue = priceSlider.value;
      if (minPrice) minPrice.textContent = `₦0`;
      if (maxPrice)
        maxPrice.textContent =
          maxPriceValue === "2000" ? "₦2000+" : `₦${maxPriceValue}`;
    });
  }

  // Toggle mobile menu
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (mainNav) mainNav.classList.toggle("active");
    });
  }

  // Filter and sort properties
  function filterAndSortProperties() {
    const location = locationSelect?.value.toLowerCase() || "";
    const type = typeSelect?.value.toLowerCase() || "";
    const maxBudget = parseInt(priceSlider?.value || 2000);
    const minBeds = bedsSelect?.value ? parseInt(bedsSelect.value) : 0;
    const minBaths = bathsSelect?.value ? parseInt(bathsSelect.value) : 0;
    const sortBy = sortSelect?.value || "";

    let filteredProperties = properties.filter((property) => {
      const budgetRange = property.budget.split("-");
      const minBudget = parseInt(budgetRange[0]) || 0;
      const maxBudgetProp =
        budgetRange[1] === "+" ? 2000 : parseInt(budgetRange[1]) || 0;
      const matchesLocation =
        !location || property.location.toLowerCase().includes(location);
      const matchesType = !type || property.type.toLowerCase() === type;
      const matchesBudget = maxBudget >= maxBudgetProp;
      const matchesBeds = !minBeds || property.beds >= minBeds;
      const matchesBaths = !minBaths || property.baths >= minBaths;
      return (
        matchesLocation &&
        matchesType &&
        matchesBudget &&
        matchesBeds &&
        matchesBaths
      );
    });

    // Sort properties
    filteredProperties.sort((a, b) => {
      const aBudget = parseBudget(a.budget);
      const bBudget = parseBudget(b.budget);
      switch (sortBy) {
        case "price-low":
          return aBudget - bBudget;
        case "price-high":
          return bBudget - aBudget;
        case "date":
          return b.id - a.id; // Simulate newer first
        default:
          return 0;
      }
    });

    // Paginate
    const start = currentPage * itemsPerPage;
    const paginatedProperties = filteredProperties.slice(
      start,
      start + itemsPerPage
    );

    // Render
    if (apartmentsGrid) apartmentsGrid.innerHTML = "";
    if (mapView)
      mapView.innerHTML =
        "<p>Map view placeholder (integrate with a map API like Google Maps).</p>";
    [apartmentsGrid, mapView].forEach((el) => el?.classList.remove("active"));
    if (paginatedProperties.length === 0) {
      if (noResults) {
        noResults.textContent = "No properties match your criteria.";
        noResults.className = "no-results";
        if (apartmentsGrid) apartmentsGrid.appendChild(noResults);
      }
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
    } else {
      const activeView =
        document.querySelector(".view-btn.active")?.dataset.view;
      if (activeView === "grid") {
        if (apartmentsGrid) apartmentsGrid.classList.add("active");
        paginatedProperties.forEach((property) => {
          const card = document.createElement("article");
          card.classList.add("property-card");
          card.innerHTML = `
            <div class="property-image">
              <img src="${property.image}" alt="${property.title}" />
              <span class="status-badge">${property.status}</span>
              <button class="favorite-btn" aria-label="Add to favorites">
                <i class="fas fa-heart"></i>
              </button>
            </div>
            <div class="property-content">
              <h3 class="property-title">${property.title}</h3>
              <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${
                property.location
              }</p>
              <p class="property-details">Listed ${
                property.daysListed
              } days ago</p>
              <div class="property-features">
                <span><i class="fas fa-bed"></i> ${property.beds}</span>
                <span><i class="fas fa-bath"></i> ${property.baths}</span>
                <span><i class="fas fa-ruler-combined"></i> ${
                  property.size
                }</span>
              </div>
              <p class="agent-info"><i class="fas fa-user"></i> Agent: ${
                property.agent
              }</p>
              <div class="property-footer">
                <span class="property-price">₦${property.budget
                  .replace("-", " - ")
                  .replace(
                    "+",
                    "+"
                  )}<span class="price-period">/month</span></span>
                <button class="view-details-btn">View Details</button>
              </div>
            </div>
          `;
          if (apartmentsGrid) apartmentsGrid.appendChild(card);
        });
      } else {
        if (mapView) mapView.classList.add("active");
      }
      if (loadMoreBtn)
        loadMoreBtn.style.display =
          filteredProperties.length > paginatedProperties.length
            ? "block"
            : "none";
      document.querySelectorAll(".favorite-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const icon = btn.querySelector("i");
          icon.classList.toggle("fas");
          icon.classList.toggle("far");
          if (icon.classList.contains("fas")) {
            icon.style.color = "#dc2626";
          } else {
            icon.style.color = "#6b7280";
          }
        });
      });
    }
  }

  // Parse budget for sorting
  function parseBudget(budget) {
    const [min, max] = budget.split("-");
    return max === "+" ? 2000 : (parseInt(max) + parseInt(min)) / 2 || 0;
  }

  // Event listeners
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      currentPage = 0;
      filterAndSortProperties();
    });
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      [locationSelect, typeSelect, bedsSelect, bathsSelect].forEach(
        (select) => select && (select.value = "")
      );
      if (priceSlider) priceSlider.value = 2000;
      if (minPrice) minPrice.textContent = "₦0";
      if (maxPrice) maxPrice.textContent = "₦2000+";
      currentPage = 0;
      filterAndSortProperties();
    });
  }
  [
    locationSelect,
    typeSelect,
    bedsSelect,
    bathsSelect,
    sortSelect,
    priceSlider,
  ].forEach((el) => {
    if (el) {
      el.addEventListener("change", () => {
        currentPage = 0;
        filterAndSortProperties();
      });
    }
  });
  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      viewButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentPage = 0;
      filterAndSortProperties();
    });
  });
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      currentPage++;
      filterAndSortProperties();
    });
  }

  // Initialize
  filterAndSortProperties();

  // Handle mobile menu toggle
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
      const icon = mobileMenuButton.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-bars");
        icon.classList.toggle("fa-times");
      }
    });

    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !mobileMenuButton.contains(e.target) &&
        !mobileMenu.contains(e.target)
      ) {
        mobileMenu.classList.add("hidden");
        const icon = mobileMenuButton.querySelector("i");
        if (icon && icon.classList.contains("fa-times")) {
          icon.classList.remove("fa-times");
          icon.classList.add("fa-bars");
        }
      }
    });
  }

  // Handle scroll for header
  window.addEventListener("scroll", () => {
    const header = document.querySelector(".main-header");
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }
  });
});
