// Utility functions for the AetherLearn platform

// Notification System
function showNotification(message, type = "info") {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => {
    notification.remove();
  });

  // Create new notification
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Add appropriate icon
  let icon = "";
  switch (type) {
    case "success":
      icon = "check-circle";
      break;
    case "error":
      icon = "exclamation-circle";
      break;
    case "warning":
      icon = "exclamation-triangle";
      break;
    default:
      icon = "info-circle";
  }

  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;

  // Append to body
  document.body.appendChild(notification);

  // Auto-remove after animation
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Debug Logging System (for development)
const debugMode = localStorage.getItem("debugMode") === "true";
let debugPanel;

function initDebugPanel() {
  if (!debugPanel) {
    debugPanel = document.createElement("div");
    debugPanel.className = "debug-panel";
    if (debugMode) {
      debugPanel.classList.add("active");
    }
    document.body.appendChild(debugPanel);

    // Add keyboard shortcut (Ctrl+D) to toggle debug panel
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        toggleDebugPanel();
      }
    });
  }
}

function toggleDebugPanel() {
  if (!debugPanel) {
    initDebugPanel();
  }

  debugPanel.classList.toggle("active");
  localStorage.setItem("debugMode", debugPanel.classList.contains("active"));
}

function debugLog(message, level = "info") {
  if (!debugPanel) {
    initDebugPanel();
  }

  const logEntry = document.createElement("div");
  logEntry.className = `log-entry ${level}`;
  logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;

  debugPanel.appendChild(logEntry);
  debugPanel.scrollTop = debugPanel.scrollHeight;

  // Also log to console
  switch (level) {
    case "error":
      console.error(message);
      break;
    case "warning":
      console.warn(message);
      break;
    default:
      console.log(message);
  }
}

// Navigation Helper
function navigateTo(page) {
  // Check if we're on the index page or in a subdirectory
  const isIndexPage =
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname.endsWith("/") ||
    window.location.pathname.endsWith("/Solution-Challenge/");

  // Construct the appropriate path
  const path = isIndexPage ? `AetherLearn/html/${page}` : page;
  window.location.href = path;
}

// Export utilities
export { showNotification, debugLog, toggleDebugPanel, navigateTo };
