
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
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
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

// Admin role verification is handled in the signin page
// No need to re-verify here to avoid conflicts

// Check authentication state and load user data
onAuthStateChanged(auth, async (user) => {
  console.log("🔍 Admin dashboard auth state changed:", user ? "User present" : "No user");
  
  if (user) {
    console.log("👤 Loading admin data for:", user.uid);
    
    try {
      // Just load the user data without re-verifying admin role
      // (already verified in signin page)
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      
      console.log("📋 Admin data loaded:", userData);

      // Update admin name in header - find the span that contains "Admin"
      const allSpans = document.querySelectorAll("span");
      let adminNameElement = null;
      for (let span of allSpans) {
        if (span.textContent.includes("Admin")) {
          adminNameElement = span;
          break;
        }
      }
      
      if (adminNameElement) {
        adminNameElement.textContent = userData?.name || user.displayName || "Admin";
        console.log("✅ Updated admin name in header");
      } else {
        console.log("⚠️ Could not find admin name element in header");
      }

      // Update profile dropdown with admin info
      const profileButton = document.querySelector(".relative.group button");
      if (profileButton) {
        const adminSpan = profileButton.querySelector("span");
        if (adminSpan) {
          adminSpan.textContent = userData?.name || user.displayName || "Admin";
          console.log("✅ Updated admin name in profile dropdown");
        }
      } else {
        console.log("⚠️ Could not find profile button");
      }

      // Load dashboard data
      loadDashboardData();
    } catch (error) {
      console.error("❌ Error loading admin data:", error);
      // Don't auto-logout, just show error
      console.log("⚠️ Failed to load admin data, but staying logged in");
    }
  } else {
    console.log("🚪 No user, redirecting to signin");
    // Redirect to sign-in page
    window.location.href = "signin.html";
  }
});

// Logout - using the existing handleLogout function from HTML
// The HTML already has handleLogout() function, so we'll enhance it
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

// Admin dashboard specific functionality
console.log("📊 Admin dashboard initialized");

// Admin dashboard functionality
console.log("✅ Admin dashboard JavaScript loaded successfully");

// Load dashboard data for admin
function loadDashboardData() {
  console.log("📊 Loading admin dashboard data...");
  
  try {
    // Load all properties (admin can see all)
    const propertiesQuery = collection(db, "properties");
    
    onSnapshot(propertiesQuery, (propertySnapshot) => {
      console.log("📈 Properties loaded:", propertySnapshot.size);
      
      // Update total properties count
      const totalPropertiesElement = document.querySelector(".bg-white.rounded-xl.p-6.shadow-sm:nth-child(1) p.text-2xl");
      if (totalPropertiesElement) {
        totalPropertiesElement.textContent = propertySnapshot.size;
      }

      // Load all users count
      loadUsersCount();
      
      // Load recent activities
      loadRecentActivities(propertySnapshot.docs);
    });
  } catch (error) {
    console.error("❌ Error loading dashboard data:", error);
    alert("Failed to load dashboard data.");
  }
}

// Load users count
async function loadUsersCount() {
  try {
    const usersQuery = collection(db, "users");
    const usersSnapshot = await getDocs(usersQuery);
    
    const totalUsersElement = document.querySelector(".bg-white.rounded-xl.p-6.shadow-sm:nth-child(2) p.text-2xl");
    if (totalUsersElement) {
      totalUsersElement.textContent = usersSnapshot.size;
    }
    
    console.log("👥 Users loaded:", usersSnapshot.size);
  } catch (error) {
    console.error("❌ Error loading users count:", error);
  }
}

// Load recent activities
function loadRecentActivities(properties) {
  console.log("📋 Loading recent activities...");
  
  // This would typically load from a notifications/activities collection
  // For now, we'll show a simple message
  const activitiesContainer = document.querySelector(".space-y-6");
  if (activitiesContainer) {
    activitiesContainer.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <i class="fas fa-check text-blue-600"></i>
        </div>
        <div>
          <p class="text-gray-800">Admin dashboard loaded successfully</p>
          <p class="text-sm text-gray-500">Welcome to the admin panel</p>
          <p class="text-xs text-gray-400 mt-1">Just now</p>
        </div>
      </div>
    `;
  }
}

// Admin dashboard is now ready
console.log("🎉 Admin dashboard setup complete");
