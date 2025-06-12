// Import Firebase modules
import { auth } from "./firebase-init.js";
import { 
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

// DOM Elements
const preferencesForm = document.getElementById('preferences-form');
const submitBtn = document.querySelector('.submit-button');
const skipBtn = document.getElementById('skip-btn');
const loadingOverlay = document.getElementById('loading-overlay');

// State management
let currentUser = null;
let preferences = {
    goals: [],
    learningStyle: [],
    interests: [],
    timeCommitment: '',
    experienceLevel: {}
};

// Initialize the overlay
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            // Update welcome message with user's display name
            updateWelcomeMessage(user);
            checkExistingPreferences(user.uid);
        } else {
            // Redirect to login if not authenticated
            window.location.href = '../html/login.html';
        }
    });

    // Set up event listeners
    setupEventListeners();
});

// Update welcome message with user's name
function updateWelcomeMessage(user) {
    const welcomeElement = document.querySelector('.welcome-text h2');
    if (welcomeElement && user.displayName) {
        welcomeElement.textContent = `Welcome, ${user.displayName}!`;
    }
}

// Check if user already has preferences
async function checkExistingPreferences(userId) {
    try {
        const preferencesRef = doc(db, 'users', userId, 'preferences', 'current');
        const preferencesDoc = await getDoc(preferencesRef);
        
        if (preferencesDoc.exists() && preferencesDoc.data().completed) {
            // User already has completed preferences, load them for editing
            const existingPrefs = preferencesDoc.data();
            loadExistingPreferences(existingPrefs);
            
            // Update header text to indicate editing
            const headerTitle = document.querySelector('.preferences-header h1');
            if (headerTitle) {
                headerTitle.textContent = "Update Your Learning Preferences";
            }
            
            const headerDesc = document.querySelector('.preferences-header p');
            if (headerDesc) {
                headerDesc.textContent = "Update your preferences to get better personalized recommendations!";
            }
        }
    } catch (error) {
        console.error('Error checking existing preferences:', error);
        // Continue with preferences setup on error
    }
}

// Load existing preferences into the form
function loadExistingPreferences(prefs) {
    // Load primary goal
    if (prefs.primaryGoal) {
        const goalInput = document.querySelector(`input[name="primary-goal"][value="${prefs.primaryGoal}"]`);
        if (goalInput) goalInput.checked = true;
    }
    
    // Load learning styles
    if (prefs.learningStyle && Array.isArray(prefs.learningStyle)) {
        prefs.learningStyle.forEach(style => {
            const styleInput = document.querySelector(`input[name="learning-style"][value="${style}"]`);
            if (styleInput) styleInput.checked = true;
        });
    }
    
    // Load interests
    if (prefs.interests && Array.isArray(prefs.interests)) {
        prefs.interests.forEach(interest => {
            const interestInput = document.querySelector(`input[name="interests"][value="${interest}"]`);
            if (interestInput) interestInput.checked = true;
        });
    }
    
    // Load time commitment
    if (prefs.timeCommitment) {
        const timeInput = document.querySelector(`input[name="time-commitment"][value="${prefs.timeCommitment}"]`);
        if (timeInput) timeInput.checked = true;
    }
    
    // Load experience level
    if (prefs.experienceLevel) {
        const expInput = document.querySelector(`input[name="experience-level"][value="${prefs.experienceLevel}"]`);
        if (expInput) expInput.checked = true;
    }
    
    // Update the preferences object
    preferences = {
        primaryGoal: prefs.primaryGoal || '',
        learningStyle: prefs.learningStyle || [],
        interests: prefs.interests || [],
        timeCommitment: prefs.timeCommitment || '',
        experienceLevel: prefs.experienceLevel || ''
    };
}

// Set up event listeners
function setupEventListeners() {
    // Form submission
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handleFormSubmit);
    }

    // Skip button
    if (skipBtn) {
        skipBtn.addEventListener('click', skipSetup);
    }

    // Primary goal selection
    const goalInputs = document.querySelectorAll('input[name="primary-goal"]');
    goalInputs.forEach(input => {
        input.addEventListener('change', updatePrimaryGoal);
    });

    // Learning style selection
    const learningStyleInputs = document.querySelectorAll('input[name="learning-style"]');
    learningStyleInputs.forEach(input => {
        input.addEventListener('change', updateLearningStyle);
    });

    // Interest selection
    const interestInputs = document.querySelectorAll('input[name="interests"]');
    interestInputs.forEach(input => {
        input.addEventListener('change', updateInterests);
    });

    // Time commitment selection
    const timeInputs = document.querySelectorAll('input[name="time-commitment"]');
    timeInputs.forEach(input => {
        input.addEventListener('change', updateTimeCommitment);
    });

    // Experience level selection
    const experienceInputs = document.querySelectorAll('input[name="experience-level"]');
    experienceInputs.forEach(input => {
        input.addEventListener('change', updateExperienceLevel);
    });
}

// Update preferences based on form changes
function updatePrimaryGoal() {
    const checkedGoal = document.querySelector('input[name="primary-goal"]:checked');
    preferences.primaryGoal = checkedGoal ? checkedGoal.value : '';
}

function updateLearningStyle() {
    const checkedStyles = document.querySelectorAll('input[name="learning-style"]:checked');
    preferences.learningStyle = Array.from(checkedStyles).map(input => input.value);
}

function updateInterests() {
    const checkedInterests = document.querySelectorAll('input[name="interests"]:checked');
    preferences.interests = Array.from(checkedInterests).map(input => input.value);
}

function updateTimeCommitment() {
    const checkedTime = document.querySelector('input[name="time-commitment"]:checked');
    preferences.timeCommitment = checkedTime ? checkedTime.value : '';
}

function updateExperienceLevel() {
    const checkedExperience = document.querySelector('input[name="experience-level"]:checked');
    preferences.experienceLevel = checkedExperience ? checkedExperience.value : '';
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Update all preferences from current form state
    updatePrimaryGoal();
    updateLearningStyle();
    updateInterests();
    updateTimeCommitment();
    updateExperienceLevel();

    // Validate required fields
    if (!validatePreferences()) {
        return;
    }

    await savePreferences();
}

// Validate preferences
function validatePreferences() {
    let isValid = true;
    let missingFields = [];

    if (!preferences.primaryGoal) {
        missingFields.push('Primary Learning Goal');
        isValid = false;
    }

    if (preferences.learningStyle.length === 0) {
        missingFields.push('Learning Style');
        isValid = false;
    }

    if (preferences.interests.length === 0) {
        missingFields.push('Interests (Select at least 1)');
        isValid = false;
    }

    if (!preferences.timeCommitment) {
        missingFields.push('Time Commitment');
        isValid = false;
    }

    if (!preferences.experienceLevel) {
        missingFields.push('Experience Level');
        isValid = false;
    }

    if (!isValid) {
        showError(`Please complete the following sections: ${missingFields.join(', ')}`);
    }

    return isValid;
}

// Save preferences to Firebase
async function savePreferences() {
    if (!currentUser) {
        showError('User not authenticated');
        return;
    }

    showLoading(true);

    try {
        const preferencesData = {
            ...preferences,
            completed: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const preferencesRef = doc(db, 'users', currentUser.uid, 'preferences', 'current');
        await setDoc(preferencesRef, preferencesData);

        // Show success message
        showSuccess('Preferences saved successfully!');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = '../html/dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Error saving preferences:', error);
        showError('Failed to save preferences. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Skip setup and go to dashboard
async function skipSetup() {
    if (!currentUser) {
        window.location.href = '../html/login.html';
        return;
    }

    showLoading(true);

    try {
        // Save minimal preferences indicating setup was skipped
        const skippedPreferencesData = {
            primaryGoal: '',
            learningStyle: [],
            interests: [],
            timeCommitment: '',
            experienceLevel: '',
            completed: false,
            skipped: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const preferencesRef = doc(db, 'users', currentUser.uid, 'preferences', 'current');
        await setDoc(preferencesRef, skippedPreferencesData);

        // Redirect to dashboard
        window.location.href = '../html/dashboard.html';

    } catch (error) {
        console.error('Error saving skipped preferences:', error);
        // Redirect anyway
        window.location.href = '../html/dashboard.html';
    } finally {
        showLoading(false);
    }
}

// UI Helper functions
function showLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    if (submitBtn) {
        submitBtn.disabled = show;
        submitBtn.textContent = show ? 'Saving...' : 'Complete Setup';
    }
}

function showError(message) {
    // Create or update error message element
    let errorElement = document.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.style.cssText = `
            background: rgba(255, 82, 82, 0.1);
            border: 1px solid rgba(255, 82, 82, 0.3);
            color: #ff5252;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            text-align: center;
            font-size: 0.9rem;
        `;
        
        const form = document.querySelector('.preferences-container');
        if (form) {
            form.insertBefore(errorElement, form.firstChild);
        }
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Scroll to top to show error
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    // Create or update success message element
    let successElement = document.querySelector('.success-message');
    if (!successElement) {
        successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.style.cssText = `
            background: rgba(76, 175, 80, 0.1);
            border: 1px solid rgba(76, 175, 80, 0.3);
            color: #4caf50;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            text-align: center;
            font-size: 0.9rem;
        `;
        
        const form = document.querySelector('.preferences-container');
        if (form) {
            form.insertBefore(successElement, form.firstChild);
        }
    }    
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Scroll to top to show success
    successElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
