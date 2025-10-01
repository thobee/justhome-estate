// Function to show welcome modal for new users
function showWelcomeModal() {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white p-8 rounded-xl w-full max-w-md">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Welcome to JustHome!</h2>
      <p class="text-gray-600 mb-6">Let's complete your agent profile to get started.</p>
      
      <form id="complete-profile-form" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-2">Full Name</label>
          <input type="text" name="name" class="w-full p-2 border rounded-lg" value="${
            auth.currentUser.displayName || ""
          }" required />
        </div>
        
        <div>
          <label class="block text-sm text-gray-600 mb-2">Phone Number</label>
          <input type="tel" name="phone" class="w-full p-2 border rounded-lg" required />
        </div>
        
        <div>
          <label class="block text-sm text-gray-600 mb-2">Agency Name (Optional)</label>
          <input type="text" name="agency" class="w-full p-2 border rounded-lg" />
        </div>
        
        <div>
          <label class="block text-sm text-gray-600 mb-2">Profile Photo</label>
          <input type="file" name="photo" accept="image/*" class="w-full p-2 border rounded-lg" />
        </div>
        
        <div>
          <label class="block text-sm text-gray-600 mb-2">Bio</label>
          <textarea name="bio" rows="3" class="w-full p-2 border rounded-lg" placeholder="Tell potential clients about yourself..."></textarea>
        </div>
        
        <div class="flex gap-4 pt-4">
          <button type="submit" class="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Complete Profile
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle form submission
  const form = document.getElementById("complete-profile-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      const formData = new FormData(form);
      let photoURL = auth.currentUser.photoURL;

      // Handle photo upload if provided
      const photoFile = formData.get("photo");
      if (photoFile.size > 0) {
        const cloudName = "dpiornkik";
        const uploadPreset = "mern-estate";
        const photoFormData = new FormData();
        photoFormData.append("file", photoFile);
        photoFormData.append("upload_preset", uploadPreset);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: photoFormData,
          }
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        photoURL = data.secure_url;
      }

      // Update user profile
      await updateProfile(auth.currentUser, {
        displayName: formData.get("name"),
        photoURL: photoURL,
      });

      // Update user document
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: formData.get("name"),
        phone: formData.get("phone"),
        agency: formData.get("agency") || null,
        bio: formData.get("bio") || null,
        photoURL: photoURL,
        profileComplete: true,
        updatedAt: serverTimestamp(),
      });

      // Remove modal and reload page
      modal.remove();
      window.location.reload();
    } catch (error) {
      console.error("Error completing profile:", error);
      alert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Complete Profile";
    }
  });
}
