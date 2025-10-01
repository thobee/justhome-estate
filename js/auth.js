// Firebase authentication integration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

let currentUser = null;
let userRole = null;

// Update UI based on auth state
function updateAuthUI(user, role) {
  const userSection = document.getElementById("userSection");
  const guestSection = document.getElementById("guestSection");
  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  const profileImage = document.getElementById("profile-image");
  const profileIcon = document.getElementById("profile-icon");
  const adminLink = document.getElementById("admin-dashboard-link");

  if (user) {
    // User is signed in
    userSection?.classList.remove("hidden");
    guestSection?.classList.add("hidden");

    // Update profile info
    if (profileName) profileName.textContent = user.displayName || "User";
    if (profileEmail) profileEmail.textContent = user.email;

    // Update profile image
    if (user.photoURL && profileImage) {
      profileImage.src = user.photoURL;
      profileImage.classList.remove("hidden");
      if (profileIcon) profileIcon.classList.add("hidden");
    } else {
      if (profileImage) profileImage.classList.add("hidden");
      if (profileIcon) profileIcon.classList.remove("hidden");
    }

    // Show admin link if user is admin
    if (role === "admin" && adminLink) {
      adminLink.classList.remove("hidden");
    } else if (adminLink) {
      adminLink.classList.add("hidden");
    }

    currentUser = user;
    userRole = role;
  } else {
    // No user is signed in
    userSection?.classList.add("hidden");
    guestSection?.classList.remove("hidden");

    // Reset profile info
    if (profileName) profileName.textContent = "Guest User";
    if (profileEmail) profileEmail.textContent = "Sign in to access more features";
    if (profileImage) profileImage.classList.add("hidden");
    if (profileIcon) profileIcon.classList.remove("hidden");
    if (adminLink) adminLink.classList.add("hidden");

    currentUser = null;
    userRole = null;
  }
}

// Get user role from Firestore
async function getUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data().role || "user";
    }
    return "user";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "user";
  }
}

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const role = await getUserRole(user.uid);
    updateAuthUI(user, role);
  } else {
    updateAuthUI(null, null);
  }
});

function handleLogin() {
  // Redirect to signin page
  window.location.href = "signin.html";
}

function handleSignup() {
  // Redirect to signup page
  window.location.href = "signup.html";
}

async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error signing out:", error);
    alert("Error signing out. Please try again.");
  }
}

// Export functions for global use
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
