// js/admin-signin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
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
const provider = new GoogleAuthProvider();

// Clear any existing session before signin
auth.signOut().catch(err => console.warn("Signout failed:", err.message));

const form = document.getElementById("admin-signin-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("📝 Form submission started");

  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    const email = form.email.value;
    const password = form.password.value;
    console.log("🔐 Attempting email/password signin for:", email);

    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Email/password signin successful:", {
      uid: result.user.uid,
      email: result.user.email
    });

    // Verify admin role
    console.log("📄 Verifying admin role...");
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);

    console.log("📊 User document exists:", userSnap.exists());
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log("📋 User data:", {
        name: userData.name,
        email: userData.email,
        role: userData.role
      });
      
      if (userData.role !== "admin") {
        console.error("❌ Access denied - User role is not admin:", userData.role);
        await auth.signOut();
        alert("Access denied. This account is not an Admin.");
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }
      
      console.log("✅ Admin role verified successfully");
      
      // Update last login
      console.log("🔄 Updating last login timestamp...");
      await updateDoc(userRef, { lastLogin: serverTimestamp() });
      console.log("✅ Last login updated, redirecting to dashboard...");
      window.location.href = "dashboard.html";
    } else {
      console.error("❌ Access denied - User document does not exist in Firestore");
      await auth.signOut();
      alert("Access denied. This account is not an Admin.");
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } catch (err) {
    console.error("❌ Email/password signin error:", err);
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// Google signin
document.getElementById("google-signin")?.addEventListener("click", async (e) => {
  e.preventDefault();
  console.log("🔍 Google signin button clicked");

  try {
    console.log("🔐 Attempting Google signin...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("✅ Google signin successful:", {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });

    console.log("📄 Checking user role in Firestore...");
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    console.log("📊 Google user document exists:", snap.exists());
    
    if (snap.exists()) {
      const userData = snap.data();
      console.log("📋 Google user data:", {
        name: userData.name,
        email: userData.email,
        role: userData.role
      });
      
      if (userData.role !== "admin") {
        console.error("❌ Google signin denied - User role is not admin:", userData.role);
        alert("This Google account is not registered as Admin.");
        await auth.signOut();
        return;
      }
      
      console.log("✅ Google admin role verified successfully");
      
      // Update last login
      console.log("🔄 Updating Google user last login...");
      await setDoc(
        userRef,
        {
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ Google signin complete, redirecting to dashboard...");
      window.location.href = "dashboard.html";
    } else {
      console.error("❌ Google signin denied - User document does not exist in Firestore");
      alert("This Google account is not registered as Admin.");
      await auth.signOut();
      return;
    }
  } catch (err) {
    console.error("❌ Google admin signin error:", err);
    alert(err.message);
  }
});
