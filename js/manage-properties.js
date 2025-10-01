import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

const propertyList = document.getElementById("property-list");
const addPropertyBtn = document.getElementById("add-property-btn");
const propertyModal = document.getElementById("property-modal");
const propertyForm = document.getElementById("property-form");
const closeModalBtn = document.getElementById("close-modal");
const modalTitle = document.getElementById("modal-title");

let editingId = null;

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadProperties();
  } else {
    window.location.href = "signin.html";
  }
});

// Redirect to add property page
addPropertyBtn.addEventListener("click", () => {
  window.location.href = "add-property.html";
});

// Add/Edit property
propertyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Form submission started");
  const title = propertyForm.title.value;
  const location = propertyForm.location.value;
  const type = propertyForm.type.value;
  const bedrooms = parseInt(propertyForm.bedrooms.value) || 0;
  const bathrooms = parseInt(propertyForm.bathrooms.value) || 0;
  const parking = parseInt(propertyForm.parking.value) || 0;
  const furnished = propertyForm.furnished.checked;
  const description = propertyForm.description.value;
  const price = propertyForm.price.value;

  // Cloudinary image upload
  let imageUrl = "";
  const imageFile = propertyForm.image.files[0];
  if (imageFile) {
    const cloudName = "drt0cxw2c"; // Your Cloudinary cloud name
    const uploadPreset = "ml_default"; // Your Cloudinary upload preset
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", uploadPreset);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      imageUrl = data.secure_url;
    } catch (err) {
      alert("Image upload failed.");
      return;
    }
  }

  const propertyData = {
    title,
    location,
    type,
    bedrooms,
    bathrooms,
    parking,
    furnished,
    description,
    price,
    image: imageUrl || null,
    agentId: auth.currentUser.uid, // Add agentId for security
  };

  try {
    if (editingId) {
      // Edit
      await updateDoc(doc(db, "properties", editingId), propertyData);
      alert("Property updated successfully!");
      loadProperties();
    } else {
      // Add
      await addDoc(collection(db, "properties"), propertyData);
      alert("Property added successfully!");
      window.location.href = "manage-properties.html";
    }
  } catch (error) {
    console.error("Error saving property:", error);
    alert("Failed to save property: " + error.message);
  }
});

// Load properties
async function loadProperties() {
  propertyList.innerHTML =
    '<p class="col-span-3 text-center text-gray-500">Loading...</p>';
  try {
    const querySnapshot = await getDocs(collection(db, "properties"));
    if (querySnapshot.empty) {
      propertyList.innerHTML =
        '<p class="col-span-3 text-center text-gray-500">No properties found.</p>';
      return;
    }
    propertyList.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.agentId !== auth.currentUser.uid) return; // Only show properties for the current agent
      const card = document.createElement("div");
      card.className =
        "bg-white p-6 rounded-xl property-card-shadow flex flex-col gap-2";
      card.innerHTML = `
        ${
          data.image
            ? `<img src="${data.image}" alt="${data.title}" class="w-full h-32 object-cover rounded mb-2" />`
            : ""
        }
        <h3 class="text-lg font-semibold text-gray-800 mb-1">${data.title}</h3>
        <p class="text-sm text-gray-600 mb-1"><i class="fas fa-map-marker-alt text-blue-600"></i> ${
          data.location
        }</p>
        <p class="text-sm text-gray-600 mb-1">Type: <span class="font-semibold">${
          data.type || ""
        }</span></p>
        <p class="text-sm text-gray-600 mb-1">Bedrooms: ${
          data.bedrooms || 0
        } | Bathrooms: ${data.bathrooms || 0} | Parking: ${
        data.parking || 0
      }</p>
        <p class="text-sm text-gray-600 mb-1">${
          data.furnished ? "Furnished" : "Unfurnished"
        }</p>
        <p class="text-sm text-gray-600 mb-2">${data.description || ""}</p>
        <p class="text-sm text-blue-600 font-bold mb-2">₦${data.price}/month</p>
        <div class="flex gap-2 mt-auto">
          <a href="property-details.html?id=${
            docSnap.id
          }" class="px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-600 hover:text-white">
            <i class="fas fa-eye"></i> View Details
          </a>
          <button class="edit-btn px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-600 hover:text-white" data-id="${
            docSnap.id
          }"><i class="fas fa-edit"></i> Edit</button>
          <button class="delete-btn px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-600 hover:text-white" data-id="${
            docSnap.id
          }"><i class="fas fa-trash"></i> Delete</button>
        </div>
      `;
      propertyList.appendChild(card);
    });

    // Attach edit/delete listeners
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const docSnap = await getDoc(doc(db, "properties", id)); // Fixed: Use getDoc for single document
        const property = docSnap.data();
        if (property) {
          editingId = id;
          modalTitle.textContent = "Edit Property";
          propertyForm.title.value = property.title;
          propertyForm.location.value = property.location;
          propertyForm.type.value = property.type || "";
          propertyForm.bedrooms.value = property.bedrooms || 0;
          propertyForm.bathrooms.value = property.bathrooms || 0;
          propertyForm.parking.value = property.parking || 0;
          propertyForm.furnished.checked = !!property.furnished;
          propertyForm.description.value = property.description || "";
          propertyForm.price.value = property.price;
          propertyModal.classList.remove("hidden");
        }
      });
    });
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Delete this property?")) {
          await deleteDoc(doc(db, "properties", id));
          loadProperties();
        }
      });
    });
  } catch (error) {
    console.error("Error loading properties:", error);
    propertyList.innerHTML =
      '<p class="col-span-3 text-center text-gray-500">Error loading properties.</p>';
  }
}

// Initial load
loadProperties();
