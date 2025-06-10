// Import Firebase authentication modules
// Handle different import paths based on location
const isRootPage =
  window.location.pathname.includes("index.html") ||
  window.location.pathname.endsWith("/") ||
  window.location.pathname.endsWith("/Solution-Challenge/");

// Import from the appropriate path
const importPath = isRootPage
  ? "./AetherLearn/js/firebase-init.js"
  : "./firebase-init.js";

// Dynamic import with a fallback
let auth;
async function loadFirebase() {
  try {
    const firebaseModule = await import(importPath);
    auth = firebaseModule.auth;
    console.log("Firebase auth loaded:", !!auth);
    setupAuthStateListener();
  } catch (error) {
    console.error("Error loading Firebase:", error);
    // Try alternate path if first path fails
    try {
      if (isRootPage) {
        const firebaseModule = await import("./firebase-init.js");
        auth = firebaseModule.auth;
      } else {
        const firebaseModule = await import("../js/firebase-init.js");
        auth = firebaseModule.auth;
      }
      console.log("Firebase auth loaded (fallback):", !!auth);
      setupAuthStateListener();
    } catch (fallbackError) {
      console.error("Firebase fallback import also failed:", fallbackError);
    }
  }
}

// Import needed Firebase modules without initialization
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

// Function to handle authentication state changes
function setupAuthStateListener() {
  if (!auth) {
    console.error("Auth not initialized");
    return;
  }
  const signInBtn = document.getElementById("sign-in-btn");
  const profileLink = document.getElementById("profile-link");
  const navUserPhoto = document.getElementById("nav-user-photo");

  if (signInBtn && profileLink) {
    // Check user authentication status
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        signInBtn.style.display = "none";
        profileLink.style.display = "flex";

        // Update profile photo in navbar
        if (navUserPhoto) {
          // Get correct path for the default avatar based on the current page
          const defaultAvatarPath = isRootPage
            ? "AetherLearn/images/default-avatar.svg"
            : "../images/default-avatar.svg";

          navUserPhoto.src = user.photoURL || defaultAvatarPath;
          navUserPhoto.alt = user.displayName || "Profile";
        }
      } else {
        // User is signed out
        signInBtn.style.display = "flex";
        profileLink.style.display = "none";
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const navbarContainer = document.getElementById('navbar-container') || document.getElementById('navbar-placeholder');
  
  // Check if navbar container exists before proceeding
  if (!navbarContainer) {
    console.warn('Navbar container not found - skipping navbar loading');
    return;
  }

  try {
    // Check if we're on the index page or in a subdirectory
    const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    const navbarPath = isIndexPage
      ? "AetherLearn/html/navbar.html"
      : "../html/navbar.html";
    const response = await fetch(navbarPath);
    if (!response.ok) {
      throw new Error("Failed to load navbar");
    }
    const html = await response.text();
    navbarContainer.innerHTML = html;

    // Adjust links and set active state
    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      // Skip the home link
      if (href !== "/") {
        if (isIndexPage) {
          // On index page, add AetherLearn/html/ prefix
          const newHref = href.startsWith("AetherLearn/html/")
            ? href
            : "AetherLearn/html/" + href;
          link.setAttribute("href", newHref);
          if (currentPage === "index.html" && href === "index.html") {
            link.classList.add("active");
          }
        } else {
          // In subdirectories, remove AetherLearn/html/ prefix if present
          const newHref = href.replace("AetherLearn/html/", "");
          link.setAttribute("href", newHref);
          if (currentPage === newHref) {
            link.classList.add("active");
          }
        }
      } else {
        // Handle home link
        if (currentPage === "index.html" || currentPage === "/") {
          link.classList.add("active");
        }
      }
    });

    // Initialize search functionality
    initializeSearch();

    // Load Firebase and setup authentication after navbar is loaded
    await loadFirebase();

    // Handle authentication UI after Firebase is loaded
    const signInBtn = document.getElementById("sign-in-btn");

    if (signInBtn && auth) {
      // If auth is loaded, setup listeners
      setupAuthStateListener();
    }
  } catch (error) {
    console.error("Error loading navbar:", error);
    navbarContainer.innerHTML =
      "<p>Error loading navigation. Please refresh the page.</p>";
  }
});

function initializeSearch() {
  const searchBtn = document.querySelector('.nav-search-btn');
  const searchOverlay = document.querySelector('.search-overlay');
  const closeSearchBtn = document.querySelector('.close-search');
  const searchInput = document.querySelector('.search-overlay-input');

  if (!searchBtn || !searchOverlay || !closeSearchBtn || !searchInput) {
    // Search elements not found - silently skip search initialization
    return;
  }

  // Open search overlay
  searchBtn.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    searchInput.focus();
    document.body.style.overflow = 'hidden';
  });

  // Close search overlay
  closeSearchBtn.addEventListener('click', closeSearch);

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      closeSearch();
    }
  });

  // Close if clicked outside search content
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
      closeSearch();
    }
  });

  // Handle search input
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        performSearch(query);
      }
    }, 300);
  });
}

function closeSearch() {
  const searchOverlay = document.querySelector('.search-overlay');
  const searchInput = document.querySelector('.search-overlay-input');
  
  searchOverlay.classList.remove('active');
  document.body.style.overflow = '';
  searchInput.value = '';
}

async function performSearch(query) {
  // TODO: Implement actual search functionality
  console.log('Searching for:', query);
  // This is where you would make an API call to your backend search service
  // and display the results in the search overlay
}
