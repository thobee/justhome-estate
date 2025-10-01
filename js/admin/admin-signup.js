// js/admin-signup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
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

// Ensure any active session is cleared
(async () => {
  try {
    await auth.signOut();
  } catch (err) {
    console.warn("Signout before signup failed:", err.message);
  }
})();

// Prevent already signed-in users from staying here
onAuthStateChanged(auth, (user) => {
  if (user) {
    auth.signOut().then(() => {
      window.location.href = "signin.html";
    });
  }
});

const form = document.getElementById("admin-signup-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("📝 Admin signup form submitted");

  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing up...';

  try {
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    
    console.log("📋 Signup data:", { name, email, password: "***" });

    // Create Auth account
    console.log("🔐 Creating Firebase Auth account...");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("✅ Auth account created:", {
      uid: user.uid,
      email: user.email
    });

    // Update display name
    console.log("👤 Updating display name...");
    await updateProfile(user, { displayName: name });
    console.log("✅ Display name updated");

    // Store Admin in Firestore
    console.log("📄 Creating user document in Firestore...");
    const userDocRef = doc(db, "users", user.uid);
    const userData = {
      name,
      email,
      role: "admin", // 🔑 KEY DIFFERENCE
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      propertiesManaged: 0,
    };
    
    console.log("📋 User data to store:", userData);
    
    try {
      await setDoc(userDocRef, userData);
      console.log("✅ User document created in Firestore");
    } catch (firestoreError) {
      console.error("❌ Firestore error:", firestoreError);
      throw new Error("Failed to create user document: " + firestoreError.message);
    }

    // Verify the document was created
    console.log("🔍 Verifying document creation...");
    try {
      const verifyDoc = await getDoc(userDocRef);
      console.log("📊 Document verification:", {
        exists: verifyDoc.exists(),
        data: verifyDoc.exists() ? verifyDoc.data() : null
      });
      
      if (!verifyDoc.exists()) {
        throw new Error("Document verification failed - document does not exist");
      }
      
      const userData = verifyDoc.data();
      if (userData.role !== "admin") {
        throw new Error("Document verification failed - role is not admin: " + userData.role);
      }
      
      console.log("✅ Document verification successful - admin role confirmed");
    } catch (verifyError) {
      console.error("❌ Document verification failed:", verifyError);
      throw new Error("Document verification failed: " + verifyError.message);
    }

    // Sign out after signup
    console.log("🚪 Signing out after successful signup...");
    await auth.signOut();
    console.log("✅ Signout complete");
    alert("Admin signup successful! Please sign in.");
    window.location.href = "signin.html";
  } catch (err) {
    console.error("❌ Admin signup error:", err);
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// Google signup for admins
document.getElementById("google-signup")?.addEventListener("click", async (e) => {
  e.preventDefault();
  console.log("🔍 Google signup button clicked");
  
  try {
    console.log("🔐 Attempting Google signup...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("✅ Google signup successful:", {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });

    // Force role = admin
    console.log("📄 Creating admin user document in Firestore...");
    const userDocRef = doc(db, "users", user.uid);
    const userData = {
      name: user.displayName,
      email: user.email,
      role: "admin",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      photoURL: user.photoURL,
    };
    
    console.log("📋 Google user data to store:", userData);
    await setDoc(userDocRef, userData, { merge: true });
    console.log("✅ Google user document created in Firestore");

    // Verify the document was created
    console.log("🔍 Verifying Google document creation...");
    const verifyDoc = await getDoc(userDocRef);
    console.log("📊 Google document verification:", {
      exists: verifyDoc.exists(),
      data: verifyDoc.exists() ? verifyDoc.data() : null
    });

    console.log("🚪 Signing out after Google signup...");
    await auth.signOut();
    console.log("✅ Google signout complete");
    alert("Admin signup successful! Please sign in.");
    window.location.href = "signin.html";
  } catch (err) {
    console.error("❌ Google admin signup error:", err);
    alert(err.message);
  }
});
