import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Firebase config
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

// Check current user and set admin role
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // First check if user already has admin role
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().role === "admin") {
        console.log("User already has admin role:", user.email);
        alert("This user already has admin privileges.");
        return;
      }

      // Set admin role for the current user with additional metadata
      await setDoc(
        userRef,
        {
          role: "admin",
          email: user.email,
          displayName: user.displayName || "Admin User",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isActive: true,
          permissions: ["manage_users", "manage_properties"],
        },
        { merge: true }
      );

      console.log("Admin role set successfully for:", user.email);
      alert(
        "Admin role has been set successfully! You can now access the admin dashboard."
      );

      // Redirect to admin dashboard after successful setup
      window.location.href = "admin/dashboard.html";
    } catch (error) {
      console.error("Error setting admin role:", error);
      alert("Error setting admin role: " + error.message);
    }
  } else {
    console.log("No user logged in");
    alert("Please log in first to set admin role.");
  }
});
