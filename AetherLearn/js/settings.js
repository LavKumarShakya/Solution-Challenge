// Settings Page JavaScript

console.log("Settings.js loading...");

// Import Firebase auth and Firestore
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

console.log("✅ Firebase modules imported");
console.log("Auth object:", !!auth);
console.log("Current user (immediate):", auth.currentUser);

// Listen for auth state changes (exactly like dashboard.js)
console.log("Setting up auth state listener...");
onAuthStateChanged(auth, (user) => {
  console.log("🔥 Auth state changed, user:", user);
  if (user) {
    // User is signed in
    console.log("✅ User is signed in:", user.email);
    // User authentication verified, continue with settings page
    updateUserProfile(user);
  } else {
    // User is signed out, redirect to login page
    console.log("❌ No user is signed in, redirecting...");
    window.location.href = "../html/login.html";
  }
});
console.log("✅ Auth state listener set up");

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded - Starting initialization...");

  // Initialize with a small delay to ensure all elements are rendered
  setTimeout(() => {
    initializeSettings();
    loadUserData();
    setupEventListeners();
    initializeCustomDropdowns();

    // Load dropdown values after a brief delay to ensure dropdowns are initialized
    setTimeout(() => {
      loadDropdownValues();
    }, 100);
  }, 100);
});

// Update user profile information
function updateUserProfile(user) {
  console.log("Updating user profile...", user?.email);

  // Wait for DOM to be ready if needed
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      updateUserProfileElements(user)
    );
  } else {
    updateUserProfileElements(user);
  }
}
// Check if user signed in with Google
function isGoogleUser(user) {
  if (!user || !user.providerData) return false;
  return user.providerData.some(provider => provider.providerId === 'google.com');
}

// Auto-populate profile fields from Google data
function populateGoogleUserData(user) {
  if (!isGoogleUser(user)) return;

  console.log("Populating Google user data...", user);
  
  // Extract first and last name from displayName
  const displayName = user.displayName || '';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Populate fields with Google data
  const firstNameInput = document.getElementById("first-name");
  const lastNameInput = document.getElementById("last-name");
  const emailInput = document.getElementById("email");
  const profilePhotoElement = document.getElementById("profile-photo");

  if (firstNameInput) {
    firstNameInput.value = firstName;
    firstNameInput.disabled = true;
    firstNameInput.classList.add('google-populated');
  }

  if (lastNameInput) {
    lastNameInput.value = lastName;
    lastNameInput.disabled = true;
    lastNameInput.classList.add('google-populated');
  }

  if (emailInput) {
    emailInput.value = user.email || '';
    emailInput.disabled = true;
    emailInput.classList.add('google-populated');
  }

  if (profilePhotoElement && user.photoURL) {
    profilePhotoElement.src = user.photoURL;
  }

  // Disable photo upload buttons for Google users
  const uploadBtn = document.getElementById("upload-photo");
  const removeBtn = document.getElementById("remove-photo");
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.classList.add('google-disabled');
  }
  if (removeBtn) {
    removeBtn.disabled = true;
    removeBtn.classList.add('google-disabled');
  }

  // Disable change password button for Google users
  const changePasswordBtn = document.getElementById("change-password-btn");
  if (changePasswordBtn) {
    changePasswordBtn.disabled = true;
    changePasswordBtn.classList.add('google-disabled');
    changePasswordBtn.innerHTML = '<i class="fas fa-key"></i> Managed by Google';
  }

  // Add Google sign-in indicator
  addGoogleSignInIndicator();
  
  console.log("Google user data populated and fields disabled");
}

// Add visual indicator for Google sign-in
function addGoogleSignInIndicator() {
  const profileSection = document.getElementById("profile-section");
  if (!profileSection || document.querySelector('.google-signin-notice')) return;

  const notice = document.createElement('div');
  notice.className = 'google-signin-notice';
  notice.innerHTML = `
    <div class="notice-content">
      <i class="fab fa-google"></i>
      <span>Profile information is managed by Google and cannot be edited here.</span>
    </div>
  `;

  const profileForm = profileSection.querySelector('.profile-form');
  if (profileForm) {
    profileForm.parentNode.insertBefore(notice, profileForm);
  }
}

// Update user profile DOM elements
function updateUserProfileElements(user) {
  console.log("Updating user profile elements...");

  // Update profile information if elements exist
  const userNameElement = document.getElementById("user-name");
  const userEmailElement = document.getElementById("user-email");
  const profilePhotoElement = document.getElementById("profile-photo");

  console.log("Profile elements found:", {
    userName: !!userNameElement,
    userEmail: !!userEmailElement,
    profilePhoto: !!profilePhotoElement,
  });

  if (userNameElement) {
    userNameElement.textContent = user.displayName || user.email || "User";
    console.log("Updated user name element");
  }

  if (userEmailElement) {
    userEmailElement.textContent = user.email || "No email provided";
    console.log("Updated user email element");
  }

  if (profilePhotoElement) {
    profilePhotoElement.src = user.photoURL || "../images/default-avatar.svg";
    profilePhotoElement.alt = `${user.displayName || "User"}'s profile picture`;
    console.log("Updated profile photo element");
  }

  // Auto-populate Google user data if applicable
  populateGoogleUserData(user);
}

// Initialize settings functionality
async function initializeSettings() {
  // Set up navigation
  setupNavigation();

  // Load saved settings after a brief delay to ensure user is authenticated
  setTimeout(async () => {
    await loadSettings();
  }, 500);
}

// Load user data (placeholder function)
function loadUserData() {
  // This function can be used to load user data from API
  // For now, we'll use localStorage data
  console.log("Loading user data...");
}

// Go back to dashboard
function goBack() {
  window.location.href = "./dashboard.html";
}

// Make goBack function globally available
window.goBack = goBack;

// Setup navigation between settings panels
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const panels = document.querySelectorAll(".settings-section");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;

      // Update active nav item
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      // Show corresponding panel
      panels.forEach((panel) => {
        panel.classList.remove("active");
        if (panel.id === `${section}-section`) {
          panel.classList.add("active");
        }
      });
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Profile photo upload
  const uploadBtn = document.getElementById("upload-photo");
  const photoInput = document.getElementById("photo-input");
  const profilePhoto = document.getElementById("profile-photo");
  const removePhotoBtn = document.getElementById("remove-photo");

  if (uploadBtn && photoInput) {
    uploadBtn.addEventListener("click", () => photoInput.click());

    photoInput.addEventListener("change", handlePhotoUpload);
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", removeProfilePhoto);
  }

  // Profile photo click to upload
  if (profilePhoto) {
    profilePhoto.parentElement.addEventListener("click", () =>
      photoInput.click()
    );
  }

  // Password change
  const changePasswordBtn = document.getElementById("change-password-btn");
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", openPasswordModal);
  }

  // Password form submission
  const passwordForm = document.getElementById("password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordChange);
  }

  // 2FA Enable
  const enable2FABtn = document.getElementById("enable-2fa-btn");
  if (enable2FABtn) {
    enable2FABtn.addEventListener("click", enable2FA);
  }

  // Logout all devices
  const logoutAllBtn = document.getElementById("logout-all-btn");
  if (logoutAllBtn) {
    logoutAllBtn.addEventListener("click", logoutAllDevices);
  }

  // Delete account
  const deleteAccountBtn = document.getElementById("delete-account-btn");
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", confirmDeleteAccount);
  }

  // Save settings
  const saveBtn = document.getElementById("save-settings");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveAllSettings);
  }

  // Change preferences button
  const changePreferencesBtn = document.getElementById("change-preferences-btn");
  if (changePreferencesBtn) {
    changePreferencesBtn.addEventListener("click", openPreferences);
  }

  // Push notifications permission
  const pushNotificationsToggle = document.getElementById("push-notifications");
  if (pushNotificationsToggle) {
    pushNotificationsToggle.addEventListener("change", handlePushNotifications);
  }
}

// Handle photo upload
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check if user is a Google user (photo upload should be disabled)
  const uploadBtn = document.getElementById("upload-photo");
  if (uploadBtn && uploadBtn.classList.contains('google-disabled')) {
    showNotification("Profile photo is managed by Google and cannot be changed", "error");
    event.target.value = ""; // Clear the file input
    return;
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    showNotification("Please select a valid image file", "error");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification("Image size should be less than 5MB", "error");
    return;
  }

  // Create file reader
  const reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById("profile-photo").src = e.target.result;
    showNotification("Profile photo updated successfully", "success");
  };
  reader.readAsDataURL(file);
}

// Remove profile photo
function removeProfilePhoto() {
  // Check if user is a Google user (photo removal should be disabled)
  const removeBtn = document.getElementById("remove-photo");
  if (removeBtn && removeBtn.classList.contains('google-disabled')) {
    showNotification("Profile photo is managed by Google and cannot be removed", "error");
    return;
  }

  document.getElementById("profile-photo").src = "../images/default-avatar.svg";
  document.getElementById("photo-input").value = "";
  showNotification("Profile photo removed", "success");
}

// Open password change modal
function openPasswordModal() {
  // Check if user is a Google user (password change should be disabled)
  const changePasswordBtn = document.getElementById("change-password-btn");
  if (changePasswordBtn && changePasswordBtn.classList.contains('google-disabled')) {
    showNotification("Password is managed by Google and cannot be changed here", "error");
    return;
  }
  
  document.getElementById("password-modal").style.display = "block";
}

// Close password change modal
function closePasswordModal() {
  document.getElementById("password-modal").style.display = "none";
  document.getElementById("password-form").reset();
}

// Handle password change
function handlePasswordChange(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  // Validate passwords
  if (newPassword !== confirmPassword) {
    showNotification("New passwords do not match", "error");
    return;
  }

  if (newPassword.length < 8) {
    showNotification("Password must be at least 8 characters long", "error");
    return;
  }

  // Simulate password change
  setTimeout(() => {
    showNotification("Password updated successfully", "success");
    closePasswordModal();
  }, 1000);
}

// Enable 2FA
function enable2FA() {
  // Show coming soon toast using the toasts.js function
  showComingSoonToast();
}

// Logout all devices
function logoutAllDevices() {
  document.getElementById("logout-all-modal").style.display = "block";
}

// Close logout all modal
function closeLogoutAllModal() {
  document.getElementById("logout-all-modal").style.display = "none";
}

// Confirm logout all devices
function confirmLogoutAll() {
  closeLogoutAllModal();
  showNotification("Signed out of all devices successfully", "success");
  // Simulate logout
  setTimeout(() => {
    window.location.href = "./login.html";
  }, 2000);
}

// Confirm account deletion
function confirmDeleteAccount() {
  document.getElementById("delete-account-modal").style.display = "block";
  
  // Set up input validation
  const input = document.getElementById("delete-confirmation-input");
  const confirmBtn = document.getElementById("confirm-delete-btn");
  
  input.value = "";
  confirmBtn.disabled = true;
  
  input.addEventListener("input", function() {
    if (input.value === "DELETE") {
      confirmBtn.disabled = false;
    } else {
      confirmBtn.disabled = true;
    }
  });
}

// Close delete account modal
function closeDeleteAccountModal() {
  document.getElementById("delete-account-modal").style.display = "none";
  document.getElementById("delete-confirmation-input").value = "";
  document.getElementById("confirm-delete-btn").disabled = true;
}

// Confirm account deletion
function confirmAccountDeletion() {
  const input = document.getElementById("delete-confirmation-input");
  
  if (input.value === "DELETE") {
    closeDeleteAccountModal();
    // Simulate account deletion
    showNotification(
      "Account deletion initiated. You will receive a confirmation email.",
      "warning"
    );
  } else {
    showNotification(
      "Account deletion cancelled - confirmation text did not match",
      "info"
    );
  }
}

// Handle push notifications permission
function handlePushNotifications(event) {
  if (event.target.checked) {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          showNotification("Push notifications enabled", "success");
        } else {
          event.target.checked = false;
          showNotification("Push notifications permission denied", "error");
        }
      });
    } else {
      event.target.checked = false;
      showNotification(
        "Push notifications not supported in this browser",
        "error"
      );
    }
  } else {
    showNotification("Push notifications disabled", "info");
  }
}

// Save all settings
async function saveAllSettings() {
  const btn = document.getElementById("save-settings");
  const originalText = btn.innerHTML;

  // Show loading state
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  btn.disabled = true;

  try {
    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Collect all form data (skip disabled Google fields)
    const settings = {
      profile: {
        firstName: document.getElementById("first-name").disabled ? undefined : document.getElementById("first-name").value,
        lastName: document.getElementById("last-name").disabled ? undefined : document.getElementById("last-name").value,
        email: document.getElementById("email").disabled ? undefined : document.getElementById("email").value,
        bio: document.getElementById("bio").value,
        location: document.getElementById("location").value,
        website: document.getElementById("website").value,
      },
      preferences: {
        language: getDropdownValue("language"),
        timezone: getDropdownValue("timezone"),
      },
      notifications: {
        emailStudyReminders: document.getElementById("email-study-reminders")
          .checked,
        emailCourseUpdates: document.getElementById("email-course-updates")
          .checked,
        emailAchievements: document.getElementById("email-achievements")
          .checked,
        pushNotifications: document.getElementById("push-notifications").checked,
      },
      lastUpdated: serverTimestamp(),
      isGoogleUser: isGoogleUser(user),
    };

    // Remove undefined values from profile
    Object.keys(settings.profile).forEach(key => {
      if (settings.profile[key] === undefined) {
        delete settings.profile[key];
      }
    });

    // Save to Firebase Firestore
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { settings }, { merge: true });

    // Also save to localStorage as backup
    localStorage.setItem("userSettings", JSON.stringify(settings));

    btn.innerHTML = '<i class="fas fa-check"></i> Saved!';

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);

    const isGoogleSignIn = document.querySelector('.google-signin-notice');
    const message = isGoogleSignIn
      ? "Settings saved successfully (Google profile fields are managed by Google)"
      : "Settings saved successfully";
    
    showNotification(message, "success");

  } catch (error) {
    console.error("Error saving settings:", error);
    btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error!';
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);

    showNotification("Failed to save settings. Please try again.", "error");
  }
}

// Helper function to get dropdown values
function getDropdownValue(selectName) {
  const select = document.querySelector(`[data-name="${selectName}"]`);
  if (!select) return "";
  
  const selectedOption = select.querySelector(".select-option.selected");
  return selectedOption ? selectedOption.getAttribute("data-value") : "";
}

// Save individual preference to Firebase
async function savePreferenceToFirebase(selectName, value) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user authenticated, saving to localStorage only");
      // Fallback to localStorage
      const settings = JSON.parse(localStorage.getItem("userSettings") || "{}");
      if (!settings.preferences) settings.preferences = {};
      settings.preferences[selectName] = value;
      localStorage.setItem("userSettings", JSON.stringify(settings));
      return;
    }

    // Save to Firebase
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, {
      [`settings.preferences.${selectName}`]: value,
      [`settings.lastUpdated`]: serverTimestamp(),
    });

    // Also save to localStorage as backup
    const settings = JSON.parse(localStorage.getItem("userSettings") || "{}");
    if (!settings.preferences) settings.preferences = {};
    settings.preferences[selectName] = value;
    localStorage.setItem("userSettings", JSON.stringify(settings));

    console.log(`Preference ${selectName} saved to Firebase:`, value);
  } catch (error) {
    console.error("Error saving preference to Firebase:", error);
    // Fallback to localStorage on error
    const settings = JSON.parse(localStorage.getItem("userSettings") || "{}");
    if (!settings.preferences) settings.preferences = {};
    settings.preferences[selectName] = value;
    localStorage.setItem("userSettings", JSON.stringify(settings));
  }
}

// Load saved settings
async function loadSettings() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user authenticated, skipping settings load");
      return;
    }

    // Try to load from Firebase first
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    let settings = {};
    
    if (userDoc.exists() && userDoc.data().settings) {
      settings = userDoc.data().settings;
      console.log("Settings loaded from Firebase:", settings);
    } else {
      // Fallback to localStorage
      settings = JSON.parse(localStorage.getItem("userSettings") || "{}");
      console.log("Settings loaded from localStorage:", settings);
    }

    // Load profile data (skip disabled Google fields)
    if (settings.profile) {
      const { firstName, lastName, email, bio, location, website } =
        settings.profile;
      
      const firstNameInput = document.getElementById("first-name");
      const lastNameInput = document.getElementById("last-name");
      const emailInput = document.getElementById("email");
      
      if (firstName && firstNameInput && !firstNameInput.disabled) {
        firstNameInput.value = firstName;
      }
      if (lastName && lastNameInput && !lastNameInput.disabled) {
        lastNameInput.value = lastName;
      }
      if (email && emailInput && !emailInput.disabled) {
        emailInput.value = email;
      }
      if (bio) document.getElementById("bio").value = bio;
      if (location) document.getElementById("location").value = location;
      if (website) document.getElementById("website").value = website;
    }

    // Load preferences (for dropdowns)
    if (settings.preferences) {
      const preferences = settings.preferences;
      
      // Set dropdown values after a delay to ensure they're initialized
      setTimeout(() => {
        if (preferences.language) setDropdownValue("language", preferences.language);
        if (preferences.timezone) setDropdownValue("timezone", preferences.timezone);
      }, 200);
    }

    // Load notification preferences
    if (settings.notifications) {
      const notifications = settings.notifications;
      if (notifications.emailStudyReminders !== undefined) {
        document.getElementById("email-study-reminders").checked =
          notifications.emailStudyReminders;
      }
      if (notifications.emailCourseUpdates !== undefined) {
        document.getElementById("email-course-updates").checked =
          notifications.emailCourseUpdates;
      }
      if (notifications.emailAchievements !== undefined) {
        document.getElementById("email-achievements").checked =
          notifications.emailAchievements;
      }
      if (notifications.pushNotifications !== undefined) {
        document.getElementById("push-notifications").checked =
          notifications.pushNotifications;
      }
    }

  } catch (error) {
    console.error("Error loading settings:", error);
    // Fallback to localStorage if Firebase fails
    const settings = JSON.parse(localStorage.getItem("userSettings") || "{}");
    console.log("Fallback: Settings loaded from localStorage:", settings);
    
    // Apply the same loading logic for localStorage fallback
    if (settings.profile) {
      const { firstName, lastName, email, bio, location, website } = settings.profile;
      
      const firstNameInput = document.getElementById("first-name");
      const lastNameInput = document.getElementById("last-name");
      const emailInput = document.getElementById("email");
      
      if (firstName && firstNameInput && !firstNameInput.disabled) {
        firstNameInput.value = firstName;
      }
      if (lastName && lastNameInput && !lastNameInput.disabled) {
        lastNameInput.value = lastName;
      }
      if (email && emailInput && !emailInput.disabled) {
        emailInput.value = email;
      }
      if (bio) document.getElementById("bio").value = bio;
      if (location) document.getElementById("location").value = location;
      if (website) document.getElementById("website").value = website;
    }
  }
}

// Helper function to set dropdown values
function setDropdownValue(selectName, value) {
  const select = document.querySelector(`[data-name="${selectName}"]`);
  if (!select) return;
  
  const option = select.querySelector(`[data-value="${value}"]`);
  if (option) {
    // Remove previous selection
    const allOptions = select.querySelectorAll(".select-option");
    allOptions.forEach((opt) => {
      opt.classList.remove("selected");
      opt.setAttribute("aria-selected", "false");
    });
    
    // Set new selection
    option.classList.add("selected");
    option.setAttribute("aria-selected", "true");
    
    // Update trigger text
    const textElement = select.querySelector(".select-text");
    if (textElement) {
      textElement.textContent = option.textContent;
    }
  }
}

// Show notification
function showNotification(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
        <i class="fas fa-${
          type === "success"
            ? "check-circle"
            : type === "error"
            ? "exclamation-circle"
            : "info-circle"
        }"></i>
        <span>${message}</span>
    `;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 100);

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Show toast notification
function showToast(message, type = "success") {
  showNotification(message, type);
}

// Modal event listeners
document.addEventListener("click", function (event) {
  const modal = document.getElementById("password-modal");
  if (event.target === modal) {
    closePasswordModal();
  }
});

// Handle escape key to close modals
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closePasswordModal();
  }
});

// Custom Dropdown Functionality
function initializeCustomDropdowns() {
  console.log("Initializing custom dropdowns...");
  const customSelects = document.querySelectorAll(".custom-select");
  console.log("Found", customSelects.length, "custom selects");
// Enhanced modal event listeners for custom confirmation modals
document.addEventListener("click", function (event) {
  const passwordModal = document.getElementById("password-modal");
  const logoutModal = document.getElementById("logout-all-modal");
  const deleteModal = document.getElementById("delete-account-modal");
  
  if (event.target === passwordModal) {
    closePasswordModal();
  }
  
  if (event.target === logoutModal) {
    closeLogoutAllModal();
  }
  
  if (event.target === deleteModal) {
    closeDeleteAccountModal();
  }
});

// Enhanced escape key handling for all modals
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closePasswordModal();
    closeLogoutAllModal();
    closeDeleteAccountModal();
  }
});

  if (customSelects.length === 0) {
    console.warn("No custom select elements found. Retrying in 500ms...");
    setTimeout(initializeCustomDropdowns, 500);
    return;
  }

  customSelects.forEach((select, index) => {
    console.log(
      `Initializing dropdown ${index + 1}:`,
      select.getAttribute("data-name")
    );

    const trigger = select.querySelector(".select-trigger");
    const options = select.querySelector(".select-options");
    const optionElements = select.querySelectorAll(".select-option");
    const textElement = select.querySelector(".select-text");

    if (!trigger || !options || !textElement) {
      console.error(`Missing elements in dropdown ${index}:`, {
        trigger: !!trigger,
        options: !!options,
        textElement: !!textElement,
      });
      return;
    }

    console.log(`Dropdown ${index + 1} has ${optionElements.length} options`);

    // Add ARIA attributes for accessibility
    const dropdownId = `dropdown-${index}`;
    select.setAttribute("role", "combobox");
    select.setAttribute("aria-expanded", "false");
    select.setAttribute("aria-haspopup", "listbox");
    select.setAttribute("tabindex", "0");
    options.setAttribute("role", "listbox");
    options.setAttribute("id", dropdownId);
    select.setAttribute("aria-owns", dropdownId);

    optionElements.forEach((option, optIndex) => {
      option.setAttribute("role", "option");
      option.setAttribute("id", `option-${index}-${optIndex}`);
    });

    // Toggle dropdown
    const toggleDropdown = function (e) {
      e.stopPropagation();
      console.log("Toggling dropdown:", select.getAttribute("data-name"));

      const isActive = trigger.classList.contains("active");

      // Close other dropdowns
      document.querySelectorAll(".custom-select").forEach((otherSelect) => {
        if (otherSelect !== select) {
          otherSelect
            .querySelector(".select-trigger")
            .classList.remove("active");
          otherSelect.querySelector(".select-options").classList.remove("show");
          otherSelect.setAttribute("aria-expanded", "false");
        }
      });

      // Toggle current dropdown
      if (!isActive) {
        trigger.classList.add("active");
        options.classList.add("show");
        select.setAttribute("aria-expanded", "true");
        console.log("Dropdown opened");
      } else {
        trigger.classList.remove("active");
        options.classList.remove("show");
        select.setAttribute("aria-expanded", "false");
        console.log("Dropdown closed");
      }
    };

    trigger.addEventListener("click", toggleDropdown);
    console.log("Click listener added to trigger");

    // Keyboard navigation
    select.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleDropdown(e);
      } else if (e.key === "Escape") {
        trigger.classList.remove("active");
        options.classList.remove("show");
        select.setAttribute("aria-expanded", "false");
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentSelected = options.querySelector(
          ".select-option.selected"
        );
        const allOptions = Array.from(optionElements);
        let newIndex = 0;

        if (currentSelected) {
          const currentIndex = allOptions.indexOf(currentSelected);
          newIndex =
            e.key === "ArrowDown"
              ? Math.min(currentIndex + 1, allOptions.length - 1)
              : Math.max(currentIndex - 1, 0);
        }

        // Remove previous selection
        allOptions.forEach((opt) => opt.classList.remove("selected"));
        // Add new selection
        allOptions[newIndex].classList.add("selected");
        allOptions[newIndex].click();
      }
    });

    // Handle option selection
    optionElements.forEach((option, optIndex) => {
      option.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log("Option clicked:", option.textContent);

        const value = option.getAttribute("data-value");
        const text = option.textContent;
        const selectName = select.getAttribute("data-name");

        // Update selected option
        optionElements.forEach((opt) => {
          opt.classList.remove("selected");
          opt.setAttribute("aria-selected", "false");
        });
        option.classList.add("selected");
        option.setAttribute("aria-selected", "true");

        // Update trigger text
        textElement.textContent = text;

        // Close dropdown
        trigger.classList.remove("active");
        options.classList.remove("show");
        select.setAttribute("aria-expanded", "false");

        // Save to Firebase and localStorage
        savePreferenceToFirebase(selectName, value);

        // Show success message
        showToast(`${text} selected successfully!`, "success");
      });
      console.log(`Click listener added to option ${optIndex + 1}`);
    });

    console.log(`Dropdown ${index + 1} initialization complete`);
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", function () {
    document.querySelectorAll(".custom-select").forEach((select) => {
      select.querySelector(".select-trigger").classList.remove("active");
      select.querySelector(".select-options").classList.remove("show");
      select.setAttribute("aria-expanded", "false");
    });
  });
  console.log("Custom dropdowns initialization complete");
}

// Load saved dropdown values (now integrated into loadSettings)
function loadDropdownValues() {
  // This function is now deprecated in favor of the integrated approach in loadSettings
  // Keeping it for backward compatibility, but it will try to load from current auth user
  if (auth.currentUser) {
    loadSettings(); // This will load all settings including dropdowns
  } else {
    // Fallback to localStorage for non-authenticated users
    const settings = JSON.parse(localStorage.getItem("userSettings") || "{}");

    if (settings.preferences) {
      document.querySelectorAll(".custom-select").forEach((select) => {
        const selectName = select.getAttribute("data-name");
        const savedValue = settings.preferences[selectName];

        if (savedValue) {
          setDropdownValue(selectName, savedValue);
        }
      });
    }
  }
}

// Open preferences overlay
function openPreferences() {
  window.location.href = "./preferences-overlay.html";
}
