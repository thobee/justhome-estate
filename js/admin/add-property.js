// admin/add-property.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBo5JRHCEmp3PftMAmHQxJspCPzX0RRPKY",
  authDomain: "estatejs-7c477.firebaseapp.com",
  projectId: "estatejs-7c477",
  storageBucket: "estatejs-7c477.appspot.com",
  messagingSenderId: "156544193291",
  appId: "1:156544193291:web:96e317eb953cf7194fc80e",
  measurementId: "G-T5HCCR6C7M",
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Admin authentication check
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("🚪 No user, redirecting to signin");
    window.location.href = "signin.html";
    return;
  }

  console.log("👤 Admin authenticated:", user.uid);
  
  // Load properties on page load
  loadProperties();
});

// Load and display properties
function loadProperties() {
  console.log("📊 Loading properties...");
  
  const propertiesList = document.getElementById("propertiesList");
  if (!propertiesList) return;

  // Set up real-time listener for properties
  const propertiesQuery = query(collection(db, "properties"), orderBy("createdAt", "desc"));
  
  onSnapshot(propertiesQuery, (snapshot) => {
    console.log("📈 Properties updated:", snapshot.size);
    
    if (snapshot.empty) {
      propertiesList.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-gray-500">
            No properties found. Add your first property below.
          </td>
        </tr>
      `;
      return;
    }

    propertiesList.innerHTML = snapshot.docs.map(doc => {
      const property = doc.data();
      const date = new Date(property.createdAt?.seconds ? property.createdAt.seconds * 1000 : property.createdAt);
      
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-12 w-12">
                ${property.image ? 
                  `<img class="h-12 w-12 rounded-lg object-cover" src="${property.image}" alt="${property.title}">` :
                  `<div class="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                     <i class="fas fa-home text-gray-400"></i>
                   </div>`
                }
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">${property.title}</div>
                <div class="text-sm text-gray-500">${property.bedrooms} bed • ${property.bathrooms} bath</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ₦${parseInt(property.price).toLocaleString()}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
              ${property.type}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${property.location}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${date.toLocaleDateString()}
          </td>
        </tr>
      `;
    }).join('');
  });
}

// Property form submission
const propertyForm = document.getElementById("addPropertyForm");

if (propertyForm) {
  propertyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📝 Property form submitted");

    const submitBtn = propertyForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding Property...";

    try {
      // Get form values using proper IDs
      const title = document.getElementById("title").value;
      const type = document.getElementById("type").value;
      const price = document.getElementById("price").value;
      const location = document.getElementById("location").value;
      const bedrooms = parseInt(document.getElementById("bedrooms").value) || 0;
      const bathrooms = parseInt(document.getElementById("bathrooms").value) || 0;
      const description = document.getElementById("description").value;

      console.log("📋 Form data:", { title, type, price, location, bedrooms, bathrooms });

      // Cloudinary upload (first image only)
      let imageUrl = "";
      const imageInput = document.getElementById("property-images");
      if (imageInput && imageInput.files.length > 0) {
        console.log("📸 Uploading image to Cloudinary...");
        const imageFile = imageInput.files[0];
        const cloudName = "dpiornkik";
        const uploadPreset = "mern-estate";

        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        imageUrl = data.secure_url;
        console.log("✅ Image uploaded:", imageUrl);
      }

      // Save property to Firestore
      console.log("💾 Saving property to Firestore...");
      const propertyData = {
        title,
        type,
        price: parseInt(price),
        location,
        bedrooms,
        bathrooms,
        description,
        image: imageUrl || null,
        agentId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "properties"), propertyData);
      console.log("✅ Property added successfully!");
      
      // Show success toast
      showToast("Property added successfully!", "success");
      
      // Reset form
      propertyForm.reset();
      
    } catch (error) {
      console.error("❌ Error adding property:", error);
      showToast("Failed to add property: " + error.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Toast notification function
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = "block";
    
    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }
}

// Enhanced logout function
window.handleLogout = async function() {
  try {
    console.log("🚪 Admin logging out...");
    await signOut(auth);
    window.location.href = "signin.html";
  } catch (error) {
    console.error("❌ Logout error:", error);
    alert("Failed to log out. Please try again.");
  }
};
