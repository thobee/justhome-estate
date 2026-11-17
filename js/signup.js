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
  if (user && !sessionStorage.getItem("isSigningUp")) {
    // If user is already signed in, redirect to signin page
    auth.signOut().then(() => {
      window.location.href = "signin.html";
    });
  }
});

const form = document.getElementById("signup-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("signup-error").hidden = true;
  if (window.validateForm && !window.validateForm(form)) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing up...';

  sessionStorage.setItem("isSigningUp", "true");
  const name = form.name.value;
  const email = form.email.value;
  const password = form.password.value;
  const phone = form.phone?.value || "";


  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update profile with display name
    try {
      await updateProfile(user, { displayName: name });
    } catch (profileError) {
      console.warn("Profile update failed, continuing:", profileError);
      // Continue even if profile update fails
    }

    // Create user document in Firestore
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

      const userDocRef = doc(db, "users", user.uid);

      await setDoc(userDocRef, userData);

      // Verify the document was created
      // Note: We can't easily verify here without another read operation

    } catch (firestoreError) {
      console.error("Firestore document creation failed:", firestoreError);
      console.error("Firestore error code:", firestoreError.code);
      console.error("Firestore error message:", firestoreError.message);

      // Check if it's a permission error
      if (firestoreError.code === 'permission-denied') {
        console.error("Firestore permission denied - check security rules");
        showFormError("signup-error", "Account created but database save failed due to permissions. Please contact support.");
      } else {
        showFormError("signup-error", "Account created but profile setup failed. Please contact support if you experience issues.");
      }

      // Don't continue with success flow if Firestore failed
      sessionStorage.removeItem("isSigningUp");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      return; // Exit the function without proceeding to success flow
    }

    // Keep user signed in after successful signup

    // Show success notification and redirect to dashboard
    if (typeof showNotification === 'function') {
      showNotification();
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200); // Give time for notification to be seen
    } else {
      alert("Sign up successful! Welcome to JustHome!");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.error("Signup error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);

    // Check if user was actually created despite the error
    const currentUser = auth.currentUser;

    // Handle specific Firebase errors
    let errorMessage = "An error occurred during signup. Please try again.";

    if (error.code === 'auth/network-request-failed') {
      errorMessage = "Network error. Please check your internet connection and try again. If the problem persists, the account may have been created - try signing in instead.";
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = "This email is already registered. Please use a different email or try signing in.";
    } else if (error.code === 'auth/weak-password') {
      errorMessage = "Password is too weak. Please use at least 6 characters.";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Please enter a valid email address.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    showFormError("signup-error", errorMessage);
    sessionStorage.removeItem("isSigningUp");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

// Google signup functionality removed - button not present in signup.html

function showFormError(id, message) {
  const box = document.getElementById(id);
  if (!box) return alert(message);
  box.querySelector("span").textContent = message;
  box.hidden = false;
  box.focus();
}
