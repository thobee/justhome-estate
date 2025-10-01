// js/add-property.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
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

// Check authentication
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "signin.html";
  }
});

const propertyForm = document.getElementById("property-form");

propertyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
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
      const cloudName = "dpiornkik"; // Your Cloudinary cloud name
      const uploadPreset = "mern-estate"; // Your unsigned upload preset
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
      if (data.error) {
        throw new Error(data.error.message);
      }
      imageUrl = data.secure_url;
    }

    // Save to Firestore
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
      agentId: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "properties"), propertyData);
    alert("Property added successfully!");
    window.location.href = "manage-properties.html";
  } catch (error) {
    console.error("Error adding property:", error);
    alert("Failed to add property: " + error.message);
  }
});
