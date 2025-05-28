import { auth } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

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
const profileSettingsBtn = document.getElementById("profile-settings-btn");

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

// Event listener for profile settings
if (profileSettingsBtn) {
  profileSettingsBtn.addEventListener("click", openProfileSettings);
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
    loadUserPreferences(user.uid);
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

<<<<<<< Updated upstream
/**
 * Load and display user preferences from Firebase
 */
async function loadUserPreferences(userId) {
  try {
    const preferencesRef = doc(db, 'users', userId, 'preferences', 'current');
    const preferencesDoc = await getDoc(preferencesRef);
    
    if (preferencesDoc.exists()) {
      const preferences = preferencesDoc.data();
      updateDashboardWithPreferences(preferences);
    } else {
      // No preferences found, show default content
      updateDashboardWithDefaultContent();
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
    updateDashboardWithDefaultContent();
  }
}

/**
 * Update dashboard hero section with user preferences
 */
function updateDashboardWithPreferences(preferences) {
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const userInterests = document.querySelector('.user-interests');
  
  // Update learning style display
  if (heroSubtitle && preferences.learningStyle && preferences.learningStyle.length > 0) {
    const learningStyles = preferences.learningStyle.map(style => {
      switch(style) {
        case 'visual': return 'Visual Learner';
        case 'auditory': return 'Auditory Learner';
        case 'kinesthetic': return 'Kinesthetic Learner';
        case 'reading-writing': return 'Reading/Writing Learner';
        default: return style;
      }
    });
    heroSubtitle.textContent = learningStyles.join(' • ');
  }
  
  // Update interests display
  if (userInterests && preferences.interests && preferences.interests.length > 0) {
    userInterests.innerHTML = '';
    
    // Create interest tags
    preferences.interests.forEach(interest => {
      const tag = document.createElement('span');
      tag.className = 'interest-tag';
      tag.textContent = formatInterestName(interest);
      userInterests.appendChild(tag);
    });
    
    // Add learning goals if available
    if (preferences.goals && preferences.goals.primary) {
      const goalTag = document.createElement('span');
      goalTag.className = 'goal-tag';
      goalTag.innerHTML = `<i class="fas fa-target"></i> ${formatGoalName(preferences.goals.primary)}`;
      userInterests.appendChild(goalTag);
    }
  }
}

/**
 * Update dashboard with default content when no preferences are available
 */
function updateDashboardWithDefaultContent() {
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const userInterests = document.querySelector('.user-interests');
  
  if (heroSubtitle) {
    heroSubtitle.textContent = 'Welcome to AetherLearn!';
  }
  
  if (userInterests) {
    userInterests.innerHTML = `
      <span class="setup-prompt">
        <i class="fas fa-cog"></i>
        <a href="../html/preferences-overlay.html">Complete your learning preferences setup</a>
      </span>
    `;
  }
}

/**
 * Format interest names for display
 */
function formatInterestName(interest) {
  const interestMap = {
    'web-development': 'Web Development',
    'mobile-development': 'Mobile Development',
    'data-science': 'Data Science',
    'ai-ml': 'AI & Machine Learning',
    'cybersecurity': 'Cybersecurity',
    'cloud-computing': 'Cloud Computing',
    'devops': 'DevOps',
    'game-development': 'Game Development',
    'mathematics': 'Mathematics',
    'physics': 'Physics',
    'chemistry': 'Chemistry',
    'biology': 'Biology',
    'business': 'Business',
    'design': 'Design'
  };
  
  return interestMap[interest] || interest.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format goal names for display
 */
function formatGoalName(goal) {
  const goalMap = {
    'career-change': 'Career Change',
    'skill-enhancement': 'Skill Enhancement',
    'academic': 'Academic',
    'hobby': 'Personal Interest'
  };
  
  return goalMap[goal] || goal.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
=======
// Open profile settings function
function openProfileSettings() {
  console.log("Profile settings clicked");
  // You can implement a settings modal or redirect to a settings page
  // For now, let's show an alert
  alert("Profile settings feature coming soon!");
  
  // Alternatively, you could redirect to a settings page:
  // window.location.href = "../html/profile-settings.html";
  
  // Or open a modal (if you have one):
  // const settingsModal = document.getElementById("profileSettingsModal");
  // if (settingsModal) {
  //   settingsModal.style.display = "flex";
  // }
>>>>>>> Stashed changes
}
