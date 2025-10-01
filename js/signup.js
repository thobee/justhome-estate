// js/signup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

// Sign out any existing user when the page loads
(async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Error signing out:", error);
  }
})();

// Check if user is already signed in
onAuthStateChanged(auth, (user) => {
  if (user) {
    // If user is already signed in, redirect to signin page
    auth.signOut().then(() => {
      window.location.href = "signin.html";
    });
  }
});

const form = document.getElementById("signup-form");
console.log("Signup form found:", form);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Form submitted, preventing default");

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing up...';
  console.log("Submit button disabled and text changed");

  sessionStorage.setItem("isSigningUp", "true");
  const name = form.name.value;
  const email = form.email.value;
  const password = form.password.value;
  const phone = form.phone?.value || "";

  console.log("Form data:", { name, email, password: "***", phone });

  try {
    console.log("Starting Firebase auth user creation...");
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("Auth user created successfully:", user.uid, user.email);

    // Update profile with display name
    console.log("Updating user profile...");
    try {
      await updateProfile(user, { displayName: name });
      console.log("Profile updated successfully");
    } catch (profileError) {
      console.warn("Profile update failed, continuing:", profileError);
      // Continue even if profile update fails
    }

    // Create user document in Firestore
    console.log("Creating user document in Firestore...");
    const userData = {
      name,
      email,
      phone,
      role: "user",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      savedProperties: [],
      recentViews: [],
      profileComplete: false,
    };

    try {
      console.log("Firestore db object:", db);
      console.log("User UID for document:", user.uid);
      console.log("User data to save:", userData);

      const userDocRef = doc(db, "users", user.uid);
      console.log("Document reference created:", userDocRef);

      await setDoc(userDocRef, userData);
      console.log("User document created in Firestore successfully");

      // Verify the document was created
      console.log("Verifying document creation...");
      // Note: We can't easily verify here without another read operation

    } catch (firestoreError) {
      console.error("Firestore document creation failed:", firestoreError);
      console.error("Firestore error code:", firestoreError.code);
      console.error("Firestore error message:", firestoreError.message);

      // Check if it's a permission error
      if (firestoreError.code === 'permission-denied') {
        console.error("Firestore permission denied - check security rules");
        alert("Account created but database save failed due to permissions. Please contact support.");
      } else {
        alert("Account created but profile setup failed. Please contact support if you experience issues.");
      }

      // Don't continue with success flow if Firestore failed
      sessionStorage.removeItem("isSigningUp");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      return; // Exit the function without proceeding to success flow
    }

    // Keep user signed in after successful signup
    console.log("User will remain signed in after signup");
    console.log("Current auth state:", auth.currentUser?.email);

    // Show success notification and redirect to dashboard
    console.log("Showing success notification and redirecting...");
    if (typeof showNotification === 'function') {
      console.log("showNotification function found, calling it");
      showNotification();
      setTimeout(() => {
        console.log("Redirecting to dashboard.html");
        window.location.href = "dashboard.html";
      }, 3000); // Give time for notification to be seen
    } else {
      console.log("showNotification function not found, using alert");
      alert("Sign up successful! Welcome to JustHome!");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.error("Signup error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);

    // Check if user was actually created despite the error
    console.log("Checking if user was created despite error...");
    const currentUser = auth.currentUser;
    console.log("Current user after error:", currentUser?.email);

    // Handle specific Firebase errors
    let errorMessage = "An error occurred during signup. Please try again.";

    if (error.code === 'auth/network-request-failed') {
      errorMessage = "Network error. Please check your internet connection and try again. If the problem persists, the account may have been created - try signing in instead.";
      console.log("Network error - user might have been created, suggesting signin");
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = "This email is already registered. Please use a different email or try signing in.";
    } else if (error.code === 'auth/weak-password') {
      errorMessage = "Password is too weak. Please use at least 6 characters.";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Please enter a valid email address.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    alert("Signup failed: " + errorMessage);
    sessionStorage.removeItem("isSigningUp");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

// Google signup functionality removed - button not present in signup.html
