// js/agentdashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// Check authentication state and load user data
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (!userData) {
        // If no user document exists, create one
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName || "",
          email: user.email,
          role: "agent",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          properties: 0,
          profileComplete: false,
          photoURL: user.photoURL || null,
        });
      }

      // Update UI with user data
      document.querySelector(".gradient-text").textContent = `JustHome (${
        userData?.name || user.displayName || "Agent"
      })`;

      // Check if this is first login
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "true" && !userData?.profileComplete) {
        showWelcomeModal();
      }

      // Update profile UI
      updateProfileUI(
        userData || {
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        }
      );

      // Load dashboard data
      loadDashboardData();
    } catch (error) {
      console.error("Error loading user data:", error);
      alert("Failed to load user data. Please try again later.");
      await signOut(auth);
      window.location.href = "signin.html";
    }
  } else {
    // Redirect to sign-in page
    window.location.href = "signin.html";
  }
});

// Logout
document
  .querySelector("a:has(.fa-sign-out-alt)")
  .addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "signin.html";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to log out. Please try again.");
    }
  });

// Toggle dropdowns
const profileButton = document.querySelector(
  "button[aria-label='Agent profile']"
);
const profileDropdown = profileButton.nextElementSibling;
profileButton.addEventListener("click", () => {
  const isExpanded = profileButton.getAttribute("aria-expanded") === "true";
  profileButton.setAttribute("aria-expanded", !isExpanded);
  profileDropdown.classList.toggle("opacity-100");
  profileDropdown.classList.toggle("invisible");
  profileDropdown.classList.toggle("-translate-y-1");
});

const notificationButton = document.querySelector("button:has(.fa-bell)");
const notificationDropdown = notificationButton.nextElementSibling;
notificationButton.addEventListener("click", () => {
  notificationDropdown.classList.toggle("opacity-100");
  notificationDropdown.classList.toggle("invisible");
  notificationDropdown.classList.toggle("-translate-y-1");
});

document.addEventListener("click", (e) => {
  if (
    !profileButton.contains(e.target) &&
    !profileDropdown.contains(e.target)
  ) {
    profileDropdown.classList.add("opacity-0", "invisible", "-translate-y-1");
    profileButton.setAttribute("aria-expanded", "false");
  }
  if (
    !notificationButton.contains(e.target) &&
    !notificationDropdown.contains(e.target)
  ) {
    notificationDropdown.classList.add(
      "opacity-0",
      "invisible",
      "-translate-y-1"
    );
  }
});

// Add property modal
const modal = document.createElement("div");
modal.id = "add-property-modal";
modal.className =
  "fixed inset-0 bg-black/50 flex items-center justify-center hidden";
modal.innerHTML = `
  <div class="bg-white p-6 rounded-xl w-full max-w-md">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Add New Property</h3>
    <form id="add-property-form">
      <div class="mb-4">
        <label class="block text-sm text-gray-600">Property Name</label>
        <input type="text" name="title" class="w-full p-2 border rounded-lg" required />
      </div>
      <div class="mb-4">
        <label class="block text-sm text-gray-600">Location</label>
        <input type="text" name="location" class="w-full p-2 border rounded-lg" required />
      </div>
      <div class="mb-4">
        <label class="block text-sm text-gray-600">Price (₦/month)</label>
        <input type="text" name="price" class="w-full p-2 border rounded-lg" required />
      </div>
      <div class="flex gap-2">
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
        <button type="button" id="close-modal" class="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
      </div>
    </form>
  </div>
`;
document.querySelector("main").appendChild(modal);

const addPropertyButton = document.querySelector("button:has(.fa-plus)");
addPropertyButton.addEventListener("click", () => {
  modal.classList.remove("hidden");
});

document.querySelector("#close-modal").addEventListener("click", () => {
  modal.classList.add("hidden");
});

document
  .querySelector("#add-property-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const property = {
      title: formData.get("title"),
      location: formData.get("location"),
      price: formData.get("price"),
      createdAt: new Date(),
      agentId: auth.currentUser.uid,
    };
    try {
      await addDoc(collection(db, "properties"), property);
      modal.classList.add("hidden");
      e.target.reset();
      alert("Property added successfully!");
    } catch (error) {
      console.error("Error adding property:", error);
      alert("Failed to add property. Please try again.");
    }
  });

// Search functionality
const searchInput = document.querySelector("input[aria-label='Quick search']");
searchInput.addEventListener("input", async (e) => {
  const queryStr = e.target.value.toLowerCase();
  const propertyContainer = document.querySelector(".grid.md\\:grid-cols-3");

  if (!queryStr.trim()) {
    // If search is empty, let the main listener handle the display
    loadDashboardData();
    return;
  }

  const q = query(
    collection(db, "properties"),
    where("agentId", "==", auth.currentUser.uid),
    where("title", ">=", queryStr),
    where("title", "<=", queryStr + "\uf8ff")
  );

  try {
    const querySnapshot = await getDocs(q);
    propertyContainer.innerHTML =
      querySnapshot.size > 0
        ? querySnapshot.docs
            .map((doc) => {
              const property = doc.data();
              return `
            <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-all">
              <div class="w-24 h-20 bg-gray-200 rounded-md overflow-hidden">
                ${
                  property.image
                    ? `<img src="${property.image}" alt="${property.title}" class="w-full h-full object-cover" />`
                    : `<div class="w-full h-full flex items-center justify-center">
                       <i class="fas fa-home text-gray-400 text-2xl"></i>
                     </div>`
                }
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-medium text-gray-800">${
                  property.title
                }</h4>
                <p class="text-xs text-gray-500">
                  <i class="fas fa-map-marker-alt text-blue-500"></i> 
                  ${property.location}
                </p>
                <p class="text-sm font-semibold text-blue-600">₦${
                  property.price
                }/month</p>
                <p class="text-xs text-gray-500 mt-1">
                  ${
                    property.bedrooms || 0
                  } <i class="fas fa-bed text-gray-400"></i> | 
                  ${
                    property.bathrooms || 0
                  } <i class="fas fa-bath text-gray-400"></i>
                </p>
              </div>
            </div>
          `;
            })
            .join("")
        : '<p class="col-span-3 text-center text-gray-500 py-4">No properties found matching your search</p>';
  } catch (error) {
    console.error("Error searching properties:", error);
    alert("Failed to search properties.");
  }
});

// Load dashboard data and set up real-time listeners
function loadDashboardData() {
  try {
    // Set up real-time listener for properties
    const propertiesQuery = query(
      collection(db, "properties"),
      where("agentId", "==", auth.currentUser.uid)
    );

    onSnapshot(propertiesQuery, (propertySnapshot) => {
      // Update active listings count
      const activeListings = document.querySelector(
        ".bg-white.p-6.rounded-xl.property-card-shadow p.text-3xl"
      );
      activeListings.textContent = propertySnapshot.size;

      // Update recent properties
      const propertyContainer = document.querySelector(
        ".grid.md\\:grid-cols-3"
      );
      const recentProperties = propertySnapshot.docs
        .sort((a, b) => b.data().createdAt - a.data().createdAt)
        .slice(0, 3);

      propertyContainer.innerHTML =
        recentProperties.length > 0
          ? recentProperties
              .map((doc) => {
                const property = doc.data();
                return `
              <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-all">
                <div class="w-24 h-20 bg-gray-200 rounded-md overflow-hidden">
                  ${
                    property.image
                      ? `<img src="${property.image}" alt="${property.title}" class="w-full h-full object-cover" />`
                      : `<div class="w-full h-full flex items-center justify-center">
                         <i class="fas fa-home text-gray-400 text-2xl"></i>
                       </div>`
                  }
                </div>
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-800">${
                    property.title
                  }</h4>
                  <p class="text-xs text-gray-500">
                    <i class="fas fa-map-marker-alt text-blue-500"></i> 
                    ${property.location}
                  </p>
                  <p class="text-sm font-semibold text-blue-600">₦${
                    property.price
                  }/month</p>
                  <p class="text-xs text-gray-500 mt-1">
                    ${
                      property.bedrooms || 0
                    } <i class="fas fa-bed text-gray-400"></i> | 
                    ${
                      property.bathrooms || 0
                    } <i class="fas fa-bath text-gray-400"></i>
                  </p>
                </div>
              </div>
            `;
              })
              .join("")
          : '<p class="col-span-3 text-center text-gray-500 py-4">No properties listed yet</p>';

      // Update total value
      const totalValue = propertySnapshot.docs.reduce((sum, doc) => {
        const price = parseFloat(doc.data().price) || 0;
        return sum + price;
      }, 0);

      document.querySelector(
        ".bg-white.p-6.rounded-xl.property-card-shadow:nth-child(3) p.text-3xl"
      ).textContent = `₦${totalValue.toLocaleString()}`;
    });
  } catch (error) {
    console.error("Error setting up real-time listeners:", error);
    alert("Failed to load dashboard data.");
  }
}

// Real-time notifications
onSnapshot(collection(db, "notifications"), (snapshot) => {
  const notificationList = document.querySelector(
    ".relative .group-hover\\:opacity-100 ul"
  );
  const notificationCount = document.querySelector(".bg-red-500");
  notificationCount.textContent = snapshot.size;
  notificationList.innerHTML = snapshot.docs
    .map(
      (doc) => `<li class="text-sm text-gray-600">${doc.data().message}</li>`
    )
    .join("");
});
