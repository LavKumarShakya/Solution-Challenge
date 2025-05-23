import { auth } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

// Show loading state while checking authentication
showLoadingState();

// DOM elements
const studyPlanButton = document.querySelector(".secondary-button");
const studyPlanModal = document.getElementById("studyPlanModal");
const closeStudyPlanButton = document.getElementById("closeStudyPlanModal");
const closeResultButton = document.getElementById("closeResultBtn");
const processingStep = document.getElementById("processingStep");
const resultStep = document.getElementById("resultStep");
const dashboardLogoutBtn = document.getElementById("dashboard-logout-btn");

// Event listeners for study plan modal
if (studyPlanButton) {
  studyPlanButton.addEventListener("click", openStudyPlanModal);
}
if (closeStudyPlanButton) {
  closeStudyPlanButton.addEventListener("click", closeStudyPlanModal);
}
if (closeResultButton) {
  closeResultButton.addEventListener("click", closeStudyPlanModal);
}

// Functions for study plan modal
function openStudyPlanModal() {
  if (studyPlanModal) {
    studyPlanModal.style.display = "flex";
    simulateAIProcessing();
  }
}

function closeStudyPlanModal() {
  if (studyPlanModal) {
    studyPlanModal.style.display = "none";
    // Reset the modal state
    if (processingStep) processingStep.style.display = "block";
    if (resultStep) resultStep.style.display = "none";
  }
}

// Simulate AI processing
function simulateAIProcessing() {
  const progressText = document.getElementById("aiProgressText");
  const progressBar = document.querySelector(".progress-bar");

  let progress = 0;
  const interval = setInterval(() => {
    progress += 5;
    if (progressText) progressText.textContent = progress;
    if (progressBar) progressBar.style.width = `${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
      // Show the result after processing is complete
      setTimeout(() => {
        if (processingStep) processingStep.style.display = "none";
        if (resultStep) resultStep.style.display = "block";
      }, 500);
    }
  }, 300);
}

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    console.log("User is signed in:", user);
    updateUserProfile(user);
    hideLoadingState(); // Hide loading state when user data is loaded
  } else {
    // User is signed out, redirect to login page
    console.log("No user is signed in");
    window.location.href = "../html/login.html";
  }
});

/**
 * Updates the dashboard UI with the user's profile information
 */
function updateUserProfile(user) {
  // Get user information
  const userName = user.displayName || "User"; // Use displayName instead of name
  const userEmail = user.email || "No email provided";
  const userPhoto = user.photoURL || "../images/default-avatar.svg"; // Provide a default avatar

  // Update UI elements
  document.getElementById("user-name").textContent = userName;

  // Update email if element exists
  const userEmailElement = document.getElementById("user-email");
  if (userEmailElement) {
    userEmailElement.textContent = userEmail;
  }

  // Update profile photo if element exists
  const userPhotoElement = document.getElementById("user-photo");
  if (userPhotoElement) {
    userPhotoElement.src = userPhoto;
    userPhotoElement.alt = `${userName}'s profile picture`;
  }

  // Add user interests (can be expanded later)
  const userInterestsElement = document.querySelector(".user-interests");
  if (userInterestsElement) {
    userInterestsElement.innerHTML = `
            <span class="interest-tag">AI</span>
            <span class="interest-tag">Machine Learning</span>
            <span class="interest-tag">Web Development</span>
        `;
  }
}

// Get current user data
function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          reject(new Error("No user logged in"));
        }
      },
      reject
    );
  });
}

// Loading state helpers
function showLoadingState() {
  const mainContent = document.querySelector(".profile-page");
  if (mainContent) {
    mainContent.style.opacity = "0.7";
    const loadingEl = document.createElement("div");
    loadingEl.className = "loading-overlay";
    loadingEl.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading your profile...</span>
      </div>
    `;
    document.body.appendChild(loadingEl);
  }
}

function hideLoadingState() {
  const mainContent = document.querySelector(".profile-page");
  const loadingEl = document.querySelector(".loading-overlay");

  if (mainContent) {
    mainContent.style.opacity = "1";
  }

  if (loadingEl) {
    loadingEl.remove();
  }
}

// Setup logout functionality
if (dashboardLogoutBtn) {
  dashboardLogoutBtn.addEventListener("click", handleLogout);
}

// Handle logout function
function handleLogout() {
  signOut(auth)
    .then(() => {
      console.log("User signed out successfully");
      window.location.href = "../html/login.html";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
}
