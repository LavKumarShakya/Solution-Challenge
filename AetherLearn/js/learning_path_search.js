// Learning Path Search Initialization with Vertex AI Search integration
function initializeLearningPathSearch() {
    const aiSearchInput = document.querySelector('.hero-search-input');
    const aiSearchButton = document.getElementById('createLearningPathBtn');
    const preferencesButton = document.getElementById('openPreferencesModal');
    const preferencesModal = document.getElementById('preferencesModal');
    const closeModalButton = document.getElementById('closePreferencesModal');
    const searchProcessContainer = document.getElementById('searchProcessContainer');
    const closeButtons = document.querySelectorAll('.close-process-btn');
    
    if (aiSearchInput && aiSearchButton) {
        // Initialize search suggestions
        initializeSearchSuggestions(aiSearchInput);
        
        aiSearchButton.addEventListener('click', async () => {
            const query = aiSearchInput.value.trim();
            if (query) {
                await startSearchProcess(query);
            } else {
                // Show error message if no query
                showMessage('Please enter a topic you want to learn about!');
                aiSearchInput.focus();
            }
        });
        
        // Also trigger search on Enter key
        aiSearchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = aiSearchInput.value.trim();
                if (query) {
                    await startSearchProcess(query);
                } else {
                    showMessage('Please enter a topic you want to learn about!');
                }
            }
        });
    }
    
    // Initialize preferences modal functionality
    initializePreferencesModal();
    
    // Add close button functionality
    if (closeButtons) {
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (searchProcessContainer) {
                    searchProcessContainer.style.display = 'none';
                }
            });
        });
    }
    
    // Initialize action buttons in results stage
    initializeResultActionButtons();
}

// Initialize the enhanced preferences modal
function initializePreferencesModal() {
    const preferencesButton = document.getElementById('openPreferencesModal');
    const preferencesModal = document.getElementById('preferencesModal');
    const closeModalButton = document.getElementById('closePreferencesModal');
    const savePreferencesButton = document.getElementById('savePreferences');
    const resetPreferencesButton = document.getElementById('resetPreferences');
    
    // Open modal
    if (preferencesButton && preferencesModal) {
        preferencesButton.addEventListener('click', () => {
            preferencesModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });
    }
    
    // Close modal
    const closeModal = () => {
        if (preferencesModal) {
            preferencesModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };
    
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    if (preferencesModal) {
        preferencesModal.addEventListener('click', (e) => {
            if (e.target === preferencesModal) {
                closeModal();
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && preferencesModal.style.display === 'block') {
            closeModal();
        }
    });
    
    // Save preferences
    if (savePreferencesButton) {
        savePreferencesButton.addEventListener('click', () => {
            saveUserPreferences();
            closeModal();
            showMessage('Preferences saved! They will be applied to your next learning path.');
        });
    }
    
    // Reset preferences
    if (resetPreferencesButton) {
        resetPreferencesButton.addEventListener('click', () => {
            resetToDefaultPreferences();
            showMessage('Preferences reset to defaults!');
        });
    }
    
    // Load saved preferences on init
    loadSavedPreferences();
}

// Save user preferences to localStorage
function saveUserPreferences() {
    const preferences = LearningPathUI.collectUserPreferences();
    localStorage.setItem('aetherlearn_preferences', JSON.stringify(preferences));
}

// Load saved preferences from localStorage
function loadSavedPreferences() {
    try {
        const saved = localStorage.getItem('aetherlearn_preferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            applyPreferencesToUI(preferences);
        }
    } catch (error) {
        console.warn('Could not load saved preferences:', error);
    }
}

// Apply preferences to UI elements
function applyPreferencesToUI(preferences) {
    // Apply difficulty level
    if (preferences.difficulty) {
        const difficultySelect = document.getElementById('difficultySelect');
        if (difficultySelect) {
            difficultySelect.value = preferences.difficulty;
        }
    }
    
    // Apply time commitment
    if (preferences.time_commitment) {
        const timeSelect = document.getElementById('timeCommitmentSelect');
        if (timeSelect) {
            timeSelect.value = preferences.time_commitment;
        }
    }
    
    // Apply content formats
    if (preferences.content_formats) {
        const formatCheckboxes = document.querySelectorAll('.content-format-grid input[type="checkbox"]');
        formatCheckboxes.forEach(checkbox => {
            checkbox.checked = preferences.content_formats.includes(checkbox.value);
        });
    }
    
    // Apply learning styles
    if (preferences.learning_styles) {
        const styleCheckboxes = document.querySelectorAll('.learning-style-grid input[type="checkbox"]');
        styleCheckboxes.forEach(checkbox => {
            checkbox.checked = preferences.learning_styles.includes(checkbox.value);
        });
    }
    
    // Apply quick preferences
    if (preferences.visual_learner !== undefined) {
        const visualCheckbox = document.getElementById('visualLearner');
        if (visualCheckbox) visualCheckbox.checked = preferences.visual_learner;
    }
    
    if (preferences.practical_focus !== undefined) {
        const practicalCheckbox = document.getElementById('practicalFocus');
        if (practicalCheckbox) practicalCheckbox.checked = preferences.practical_focus;
    }
    
    if (preferences.include_exercises !== undefined) {
        const exercisesCheckbox = document.getElementById('includeExercises');
        if (exercisesCheckbox) exercisesCheckbox.checked = preferences.include_exercises;
    }
}

// Reset preferences to defaults
function resetToDefaultPreferences() {
    const defaultPreferences = {
        difficulty: 'intermediate',
        time_commitment: '10-20 hours',
        content_formats: ['video', 'article', 'interactive', 'course'],
        learning_styles: ['visual'],
        visual_learner: true,
        practical_focus: false,
        include_exercises: true
    };
    
    applyPreferencesToUI(defaultPreferences);
    localStorage.removeItem('aetherlearn_preferences');
}

// Initialize search suggestions using Vertex AI
function initializeSearchSuggestions(inputElement) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (inputElement && suggestionsContainer) {
        let debounceTimer;
        
        inputElement.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            // Clear suggestions if input is empty
            if (!query) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                suggestionsContainer.classList.remove('active');
                const heroContent = document.querySelector('.hero-content');
                if (heroContent) heroContent.classList.remove('suggestions-active');
                return;
            }
            
            // Debounce the API call to avoid excessive requests
            debounceTimer = setTimeout(async () => {
                try {
                    // Get suggestions from API (using mock data until API is ready)
                    const suggestions = await getSuggestions(query);
                    
                    // Display suggestions
                    renderSuggestions(suggestionsContainer, suggestions, inputElement);
                } catch (error) {
                    console.error('Error getting suggestions:', error);
                }
            }, 300);
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!inputElement.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
                suggestionsContainer.classList.remove('active');
                const heroContent = document.querySelector('.hero-content');
                if (heroContent) heroContent.classList.remove('suggestions-active');
            }
        });
    }
}

// Get search suggestions (will connect to Vertex API in production)
async function getSuggestions(query) {
    // TODO: Replace with actual API call to Vertex AI Search
    // Mock suggestions for now
    const topics = [
        'Machine Learning', 'Web Development', 'Python Programming',
        'JavaScript Fundamentals', 'Data Science', 'Cloud Computing',
        'Mobile App Development', 'Artificial Intelligence', 'Blockchain'
    ];
    
    return topics
        .filter(topic => topic.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
}

// Render search suggestions
function renderSuggestions(container, suggestions, inputElement) {
    container.innerHTML = '';
    const heroContent = document.querySelector('.hero-content');
    
    if (suggestions.length === 0) {
        container.style.display = 'none';
        container.classList.remove('active');
        if (heroContent) heroContent.classList.remove('suggestions-active');
        return;
    }
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion;
        
        item.addEventListener('click', () => {
            inputElement.value = suggestion;
            container.style.display = 'none';
            container.classList.remove('active');
            if (heroContent) heroContent.classList.remove('suggestions-active');
            
            // Auto-trigger search when suggestion is clicked
            const searchButton = document.querySelector('.hero-search-button');
            if (searchButton) {
                searchButton.click();
            }
        });
        
        container.appendChild(item);
    });
    
    container.style.display = 'block';
    container.classList.add('active');
    if (heroContent) heroContent.classList.add('suggestions-active');
}

// Global flag to prevent multiple simultaneous searches
let isSearchInProgress = false;

// Main search function triggered when the user searches
async function startSearchProcess(query) {
    // Prevent multiple simultaneous searches
    if (isSearchInProgress) {
        console.log('Search already in progress, ignoring duplicate request');
        return;
    }
    
    isSearchInProgress = true;
    
    try {
        // Show the search process container
        const searchProcessContainer = document.getElementById('searchProcessContainer');
        const searchProcessingStage = document.getElementById('searchProcessingStage');
        const resourceDiscoveryStage = document.getElementById('resourceDiscoveryStage');
        const learningPathResultsStage = document.getElementById('learningPathResultsStage');
        
        if (searchProcessContainer) {
            // Reset stages
            searchProcessingStage.style.display = 'block';
            resourceDiscoveryStage.style.display = 'none';
            learningPathResultsStage.style.display = 'none';
            
            // Show the container
            searchProcessContainer.style.display = 'flex';
            
            // Initialize the UI with query
            initializeSearchProcessUI(query);
            
            // Get user preferences
            const preferences = LearningPathUI.collectUserPreferences();
            
            // Initiate the search process with preferences
            const response = await LearningPathAPI.initiateSearch(query, preferences);
            
            if (response && response.search_id) {
                // Start polling for status
                pollSearchStatus(response.search_id);
            } else {
                throw new Error('Failed to initiate search process');
            }
        }
    } catch (error) {
        console.error('Error starting search process:', error);
        // Show error message to user
        showErrorMessage('Failed to start learning path generation. Please try again.');
        // Reset the flag on error
        isSearchInProgress = false;
    }
}

// Initialize the search process UI
function initializeSearchProcessUI(query) {
    // Set query text
    document.getElementById('searchQueryText').textContent = query;
    
    // Reset progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
    }
    
    const progressText = document.getElementById('analysisProgress');
    if (progressText) {
        progressText.textContent = '0';
    }
    
    // Reset process steps
    const steps = document.querySelectorAll('.process-step');
    steps.forEach((step, index) => {
        const statusIcon = step.querySelector('.step-status i');
        if (index === 0) {
            step.classList.add('active');
            if (statusIcon) {
                statusIcon.className = 'fas fa-spinner fa-spin';
            }
        } else {
            step.classList.remove('active', 'completed');
            if (statusIcon) {
                statusIcon.className = 'fas fa-circle';
            }
        }
    });
    
    // Reset resource discovery stage
    document.getElementById('resourcesFound').textContent = '0';
    document.getElementById('sourcesScanned').textContent = '0';
    document.getElementById('avgQualityScore').textContent = '0';
    
    const discoveryFeed = document.getElementById('discoveryFeed');
    if (discoveryFeed) {
        discoveryFeed.innerHTML = '<div class="discovery-message">Initializing Vertex AI search engines...</div>';
    }
    
    // Reset results stage
    document.getElementById('resultQueryText').textContent = query;
}

// Poll for search status from Vertex AI
async function pollSearchStatus(searchId) {
    const statusCheckInterval = setInterval(async () => {
        try {
            const status = await LearningPathAPI.getSearchStatus(searchId);
            
            // Update UI based on status
            LearningPathUI.updateSearchProcessUI(status);
            
            // Simulate discovery progress
            updateDiscoveryVisualization(status);
            
            // Check if the process is complete or failed
            if (status.status === 'COMPLETED') {
                clearInterval(statusCheckInterval);
                await showLearningPathResults(status.learning_path_id);
                // Reset search flag
                isSearchInProgress = false;
            } else if (status.status === 'FAILED') {
                clearInterval(statusCheckInterval);
                showErrorMessage(status.message || 'Failed to generate learning path');
                // Reset search flag
                isSearchInProgress = false;
            }
        } catch (error) {
            console.error('Error checking search status:', error);
            clearInterval(statusCheckInterval);
            showErrorMessage('Failed to get search status. Please try again.');
            // Reset search flag on error
            isSearchInProgress = false;
        }
    }, 2000); // Poll every 2 seconds
}

// Update the discovery visualization based on status
function updateDiscoveryVisualization(status) {
    // Only update if we're in the discovery stage
    if (status.status !== 'DISCOVERING') return;
    
    // Update progress indicators
    const discoveryProgress = document.getElementById('discoveryProgress');
    const discoveryProgressFill = document.getElementById('discoveryProgressBar')?.querySelector('.progress-fill');
    
    if (discoveryProgress && discoveryProgressFill) {
        const progress = Math.min(Math.round(status.progress || 0), 100);
        discoveryProgress.textContent = progress;
        discoveryProgressFill.style.width = `${progress}%`;
    }
    
    // Update resource dots
    const resourceDots = document.getElementById('resourceDots');
    if (resourceDots && status.resources_found > 0) {
        // Clear existing dots first if there are too many
        if (resourceDots.children.length > 50) {
            resourceDots.innerHTML = '';
        }
        
        // Add new resource dots
        const newDotsCount = Math.min(Math.floor(status.resources_found / 5) - resourceDots.children.length, 5);
        
        for (let i = 0; i < newDotsCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'resource-dot';
            
            // Randomize position
            const angle = Math.random() * 360;
            const distance = 20 + Math.random() * 60;
            dot.style.left = `calc(50% + ${Math.cos(angle * Math.PI / 180) * distance}px)`;
            dot.style.top = `calc(50% + ${Math.sin(angle * Math.PI / 180) * distance}px)`;
            
            resourceDots.appendChild(dot);
            
            // Animate the dot appearing
            setTimeout(() => {
                dot.classList.add('found');
            }, i * 100);
        }
    }
    
    // Update discovery stats
    document.getElementById('resourcesFound').textContent = status.resources_found || 0;
    document.getElementById('sourcesScanned').textContent = status.sources_scanned || 0;
    document.getElementById('avgQualityScore').textContent = (status.avg_quality || 0).toFixed(1);
    
    // Update discovery feed
    const discoveryFeed = document.getElementById('discoveryFeed');
    if (discoveryFeed && status.latest_resources) {
        // Add the latest resources to the feed
        status.latest_resources.forEach(resource => {
            const feedItem = document.createElement('div');
            feedItem.className = 'feed-item';
            feedItem.innerHTML = `
                <div class="feed-icon"><i class="${LearningPathUI.getResourceIcon(resource.type)}"></i></div>
                <div class="feed-content">
                    <div class="feed-title">${resource.title}</div>
                    <div class="feed-source">${resource.source}</div>
                </div>
            `;
            
            discoveryFeed.prepend(feedItem);
            
            // Keep only the last 10 items
            while (discoveryFeed.children.length > 10) {
                discoveryFeed.removeChild(discoveryFeed.lastChild);
            }
        });
    }
}

// Show learning path results from Vertex AI
async function showLearningPathResults(learningPathId) {
    try {
        // Hide the processing stages
        document.getElementById('searchProcessingStage').style.display = 'none';
        document.getElementById('resourceDiscoveryStage').style.display = 'none';
        
        // Show the results stage
        document.getElementById('learningPathResultsStage').style.display = 'block';
        
        // Get the learning path data
        const learningPath = await LearningPathAPI.getLearningPath(learningPathId);
        
        // Render the learning path
        LearningPathUI.renderLearningPath(learningPath);
        
        // Show success message with Vertex AI branding
        const resultsHeader = document.querySelector('.results-summary');
        if (resultsHeader) {
            const successMessage = document.createElement('div');
            successMessage.className = 'vertex-success-message';
            successMessage.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Your personalized learning path has been created by Vertex AI!</span>
            `;
            resultsHeader.prepend(successMessage);
            
            // Animate the success message
            setTimeout(() => {
                successMessage.classList.add('show');
            }, 100);
        }
        
    } catch (error) {
        console.error('Error showing learning path results:', error);
        showErrorMessage('Failed to load learning path results');
    }
}

// Initialize result action buttons
function initializeResultActionButtons() {
    // Save path button
    const saveButton = document.querySelector('.action-button.primary');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            // Check if user is logged in
            const token = localStorage.getItem('token');
            if (!token) {
                // Prompt to login or register
                showLoginPrompt('save this learning path');
                return;
            }
            
            // Otherwise save the path (functionality to be implemented)
            showMessage('Learning path saved successfully!');
        });
    }
    
    // Share button
    const shareButton = document.querySelector('.action-button.secondary:nth-child(2)');
    if (shareButton) {
        shareButton.addEventListener('click', () => {
            // Implement share functionality
            // For now, just copy the URL
            navigator.clipboard.writeText(window.location.href)
                .then(() => showMessage('Link copied to clipboard!'))
                .catch(() => showMessage('Failed to copy link'));
        });
    }
    
    // Customize button
    const customizeButton = document.querySelector('.action-button.secondary:nth-child(3)');
    if (customizeButton) {
        customizeButton.addEventListener('click', () => {
            // Show customization modal
            const modal = document.getElementById('customizationModal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                showMessage('Customization coming soon!');
            }
        });
    }
    
    // Export button
    const exportButton = document.querySelector('.action-button.secondary:nth-child(4)');
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            showMessage('Exporting to PDF... This feature is coming soon!');
        });
    }
}

// Show login prompt
function showLoginPrompt(action) {
    const promptContainer = document.createElement('div');
    promptContainer.className = 'login-prompt-container';
    promptContainer.innerHTML = `
        <div class="login-prompt">
            <h3>Sign in to ${action}</h3>
            <p>You need to be signed in to save and access your learning paths across devices.</p>
            <div class="prompt-buttons">
                <a href="AetherLearn/html/login.html" class="prompt-button primary">Sign In</a>
                <a href="AetherLearn/html/signup.html" class="prompt-button secondary">Create Account</a>
                <button class="prompt-button tertiary close-prompt">Later</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(promptContainer);
    
    // Add close functionality
    promptContainer.querySelector('.close-prompt').addEventListener('click', () => {
        promptContainer.remove();
    });
    
    // Add click outside to close
    promptContainer.addEventListener('click', (e) => {
        if (e.target === promptContainer) {
            promptContainer.remove();
        }
    });
}

// Enhanced message toast with icons and types
function showMessage(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    
    // Add appropriate icon based on type
    let icon = 'fas fa-check-circle';
    switch (type) {
        case 'error':
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            break;
        case 'info':
            icon = 'fas fa-info-circle';
            break;
        default:
            icon = 'fas fa-check-circle';
    }
    
    toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
    
    document.body.appendChild(toast);
    
    // Show animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after duration based on message length
    const duration = Math.max(3000, message.length * 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, duration);
    
    // Allow clicking to dismiss
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    });
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    
    document.body.appendChild(errorDiv);
    
    // Add animation
    setTimeout(() => {
        errorDiv.classList.add('show');
    }, 10);
    
    // Remove after a few seconds
    setTimeout(() => {
        errorDiv.classList.remove('show');
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 300);
    }, 5000);
    
    // Allow clicking to dismiss
    errorDiv.addEventListener('click', () => {
        errorDiv.classList.remove('show');
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 300);
    });
}

// Populate individual resources section with data from Vertex AI
function populateIndividualResources(resources) {
    const resourcesGrid = document.getElementById('individualResourcesGrid');
    if (!resourcesGrid || !resources || resources.length === 0) {
        return;
    }

    // Clear existing sample resources
    resourcesGrid.innerHTML = '';

    // Add each resource to the grid
    resources.forEach((resource, index) => {
        const resourceCard = createResourceCardFromData(resource, index);
        resourcesGrid.appendChild(resourceCard);
    });

    // Show the individual resources container
    const resourcesContainer = document.querySelector('.individual-resources-container');
    if (resourcesContainer) {
        resourcesContainer.style.display = 'block';
    }

    // Initialize individual resources manager if it exists
    if (window.individualResourcesManager) {
        window.individualResourcesManager.updateResourceCount();
    }
}

// Create a resource card from API data
function createResourceCardFromData(resource, index) {
    const card = document.createElement('div');
    card.className = 'individual-resource-card';
    card.setAttribute('data-type', resource.type || 'article');
    card.setAttribute('data-resource-id', resource.id || `resource_${Date.now()}_${index}`);
    card.setAttribute('data-url', resource.url || '#');

    // Determine resource type and icon
    const resourceType = determineResourceType(resource);
    const resourceIcon = getResourceTypeIcon(resourceType);
    
    // Format duration
    const duration = formatDuration(resource.duration || resource.estimated_time);
    
    // Format difficulty
    const difficulty = resource.difficulty || resource.level || 'Beginner';
    
    // Format rating
    const rating = resource.rating || resource.quality_score || (Math.random() * 1.5 + 3.5).toFixed(1);
    
    // Format source
    const source = resource.source || resource.provider || extractDomainFromUrl(resource.url);

    card.innerHTML = `
        <div class="resource-card-header">
            <div class="resource-type-badge ${resourceType}">
                <i class="${resourceIcon}"></i>
                <span>${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}</span>
            </div>
            <div class="resource-actions">
                <button class="resource-action-btn bookmark" title="Bookmark">
                    <i class="far fa-bookmark"></i>
                </button>
                <button class="resource-action-btn share" title="Share">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
        
        <div class="resource-content">
            <h4 class="resource-title">${resource.title || 'Untitled Resource'}</h4>
            <p class="resource-description">${resource.description || resource.snippet || 'No description available.'}</p>
            
            <div class="resource-metadata">
                <div class="metadata-row">
                    <span class="metadata-item">
                        <i class="fas fa-clock"></i>
                        <span>${duration}</span>
                    </span>
                    <span class="metadata-item">
                        <i class="fas fa-signal"></i>
                        <span>${difficulty}</span>
                    </span>
                    <span class="metadata-item quality-rating">
                        <i class="fas fa-star"></i>
                        <span>${rating}</span>
                    </span>
                </div>
                <div class="metadata-row">
                    <span class="metadata-item source">
                        <i class="fas fa-external-link-alt"></i>
                        <span>${source}</span>
                    </span>
                    <span class="metadata-item language">
                        <i class="fas fa-globe"></i>
                        <span>${resource.language || 'English'}</span>
                    </span>
                </div>
            </div>
            
            <div class="learning-styles">
                ${generateLearningStyleBadges(resourceType)}
            </div>
        </div>
        
        <div class="resource-card-footer">
            <button class="resource-action-btn primary">
                <i class="fas fa-external-link-alt"></i>
                Access Resource
            </button>
            <button class="resource-action-btn secondary add-to-course" title="Add to Custom Course">
                <i class="fas fa-plus"></i>
                Add to Course
            </button>
        </div>
    `;

    return card;
}

// Helper function to determine resource type from API data
function determineResourceType(resource) {
    if (resource.type) {
        return resource.type.toLowerCase();
    }
    
    const url = resource.url || '';
    const title = (resource.title || '').toLowerCase();
    
    // Check for video indicators
    if (url.includes('youtube.com') || url.includes('vimeo.com') ||
        title.includes('video') || title.includes('tutorial')) {
        return 'video';
    }
    
    // Check for interactive/course indicators
    if (url.includes('codecademy.com') || url.includes('coursera.org') ||
        url.includes('edx.org') || title.includes('course') ||
        title.includes('interactive')) {
        return 'interactive';
    }
    
    // Check for course indicators
    if (title.includes('course') || title.includes('program') ||
        title.includes('certification')) {
        return 'course';
    }
    
    // Default to article
    return 'article';
}

// Helper function to get resource type icon
function getResourceTypeIcon(type) {
    const icons = {
        video: 'fas fa-play-circle',
        article: 'fas fa-file-alt',
        interactive: 'fas fa-laptop-code',
        course: 'fas fa-graduation-cap'
    };
    return icons[type] || 'fas fa-file';
}

// Helper function to format duration
function formatDuration(duration) {
    if (!duration) return 'Variable';
    
    // If already formatted, return as is
    if (typeof duration === 'string' && duration.includes('min')) {
        return duration;
    }
    
    // Convert minutes to readable format
    if (typeof duration === 'number') {
        if (duration < 60) {
            return `${duration} minutes`;
        } else {
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
        }
    }
    
    return duration.toString();
}

// Helper function to extract domain from URL
function extractDomainFromUrl(url) {
    if (!url) return 'Unknown';
    
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '').split('.')[0];
    } catch {
        return 'Unknown';
    }
}

// Helper function to generate learning style badges
function generateLearningStyleBadges(type) {
    const styles = {
        video: ['visual', 'auditory'],
        article: ['reading', 'visual'],
        interactive: ['kinesthetic', 'visual'],
        course: ['visual', 'reading']
    };

    const typeStyles = styles[type] || ['visual'];
    const badgeIcons = {
        visual: 'fas fa-eye',
        auditory: 'fas fa-headphones',
        reading: 'fas fa-book-open',
        kinesthetic: 'fas fa-hands'
    };

    return typeStyles.map(style =>
        `<span class="learning-style-badge ${style}">
            <i class="${badgeIcons[style]}"></i> ${style.charAt(0).toUpperCase() + style.slice(1)}
        </span>`
    ).join('');
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeLearningPathSearch);
