// Shared Utility Functions for AetherLearn Platform
// This file contains toast notification functions used across multiple pages

// Function to show "Coming Soon!" toast notification
function showComingSoonToast(event) {
    if (event) {
        event.preventDefault();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-message info show';
    
    toast.innerHTML = `
        <i class="fas fa-clock"></i>
        <span>Coming Soon!</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
    
    // Allow clicking to dismiss
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    });
}

// Function to show "Currently unavailable" toast notification
function showCurrentlyUnavailableToast(event) {
    if (event) {
        event.preventDefault();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-message warning show';
    
    toast.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>Currently unavailable</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
    
    // Allow clicking to dismiss
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    });
}

// Make functions available globally for use across pages
window.showComingSoonToast = showComingSoonToast;
window.showCurrentlyUnavailableToast = showCurrentlyUnavailableToast;

// Log successful load
console.log('AetherLearn Utils.js loaded successfully');
