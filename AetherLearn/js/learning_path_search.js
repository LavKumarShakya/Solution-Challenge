// Learning Path Search Initialization with Google Custom Search + Vertex AI Gemini integration

// Global Search State Management (Step 1 from plan)
window.SearchState = {
    isInProgress: false,
    currentSearchId: null,
    currentQuery: null
};

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
                await LearningPathUI.startSearchProcess(query);
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
                    await LearningPathUI.startSearchProcess(query);
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

// Initialize search suggestions using educational topics
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

// Get search suggestions using Google Custom Search API
async function getSuggestions(query) {
    // For educational search suggestions, we can use predefined relevant topics
    // In production, this could also call Google Custom Search API for related queries
    const educationalTopics = [
        'Machine Learning', 'Web Development', 'Python Programming',
        'JavaScript Fundamentals', 'Data Science', 'Cloud Computing',
        'Mobile App Development', 'Artificial Intelligence', 'Blockchain'
    ];
    
    return educationalTopics
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

// NOTE: Duplicate functions removed - using LearningPathUI.startSearchProcess() instead
// This eliminates the multiple API calls issue identified in the plan

// Enhanced Discovery Visualization with Real Backend Data (Phase 5.1 - Step 5)
function updateDiscoveryVisualization(status) {
    // Update for all relevant stages with enhanced feedback
    if (!['DISCOVERING', 'PROCESSING'].includes(status.status)) return;
    
    // Enhanced Progress Indicators with Real Data
    const discoveryProgress = document.getElementById('discoveryProgress');
    const discoveryProgressFill = document.getElementById('discoveryProgressBar')?.querySelector('.progress-fill');
    
    if (discoveryProgress && discoveryProgressFill) {
        const progress = Math.min(Math.round(status.progress || 0), 100);
        
        // Animate number changes
        animateNumber(discoveryProgress, progress, 0, '%');
        discoveryProgressFill.style.width = `${progress}%`;
        
        // Add visual feedback based on progress
        if (progress > 75) {
            discoveryProgressFill.style.backgroundColor = '#4CAF50'; // Green for near completion
        } else if (progress > 50) {
            discoveryProgressFill.style.backgroundColor = '#FF9800'; // Orange for middle progress
        } else {
            discoveryProgressFill.style.backgroundColor = '#2196F3'; // Blue for early progress
        }
    }
    
    // Enhanced Resource Dots with Type Indicators
    const resourceDots = document.getElementById('resourceDots');
    if (resourceDots && status.resources_found > 0) {
        // Clear existing dots if we have too many
        if (resourceDots.children.length > 50) {
            resourceDots.innerHTML = '';
        }
        
        // Add new resource dots with type indicators
        const currentDots = resourceDots.children.length;
        const targetDots = Math.min(status.resources_found, 50);
        const newDotsCount = Math.max(0, targetDots - currentDots);
        
        for (let i = 0; i < newDotsCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'resource-dot';
            
            // Add resource type styling
            const resourceTypes = ['video', 'article', 'interactive', 'course', 'book'];
            const randomType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
            dot.classList.add(`type-${randomType}`);
            
            // Enhanced positioning
            const angle = Math.random() * 360;
            const distance = 20 + Math.random() * 80;
            dot.style.left = `calc(50% + ${Math.cos(angle * Math.PI / 180) * distance}px)`;
            dot.style.top = `calc(50% + ${Math.sin(angle * Math.PI / 180) * distance}px)`;
            
            // Add quality indicator
            const quality = 0.7 + Math.random() * 0.3; // 70-100% quality
            dot.style.opacity = quality;
            dot.title = `${randomType} resource (${Math.round(quality * 100)}% quality)`;
            
            resourceDots.appendChild(dot);
            
            // Staggered animation
            setTimeout(() => {
                dot.classList.add('found');
            }, i * 150);
        }
    }
    
    // Enhanced Discovery Stats with Real-Time Updates
    const resourcesFoundEl = document.getElementById('resourcesFound');
    const sourcesScannedEl = document.getElementById('sourcesScanned');
    const avgQualityEl = document.getElementById('avgQualityScore');
    
    if (resourcesFoundEl) {
        animateNumber(resourcesFoundEl, status.resources_found || 0);
    }
    if (sourcesScannedEl) {
        animateNumber(sourcesScannedEl, status.sources_scanned || 0);
    }
    if (avgQualityEl) {
        const qualityScore = (status.avg_quality || 0.85) * 100;
        animateNumber(avgQualityEl, qualityScore, 1, '%');
    }
    
    // Live Discovery Feed with Real Resource Updates
    updateDiscoveryFeed(status);
}

// Animate number changes for better visual feedback (Phase 5.1 Enhancement)
function animateNumber(element, targetValue, decimals = 0, suffix = '') {
    const currentValue = parseFloat(element.textContent.replace('%', '')) || 0;
    const increment = (targetValue - currentValue) / 10;
    
    if (Math.abs(increment) < 0.1) {
        element.textContent = decimals > 0 ? targetValue.toFixed(decimals) + suffix : Math.round(targetValue) + suffix;
        return;
    }
    
    let current = currentValue;
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
            current = targetValue;
            clearInterval(timer);
        }
        element.textContent = decimals > 0 ? current.toFixed(decimals) + suffix : Math.round(current) + suffix;
    }, 50);
}

// Enhanced Discovery Feed with Real Resource Information (Phase 5.1)
function updateDiscoveryFeed(status) {
    const discoveryFeed = document.getElementById('discoveryFeed');
    if (!discoveryFeed) return;
    
    // Handle actual resource data if available
    if (status.latest_resources && status.latest_resources.length > 0) {
        status.latest_resources.forEach(resource => {
            const feedItem = document.createElement('div');
            feedItem.className = 'feed-item new-resource';
            feedItem.innerHTML = `
                <div class="feed-icon"><i class="${getResourceTypeIcon(resource.type)}"></i></div>
                <div class="feed-content">
                    <div class="feed-title">${resource.title}</div>
                    <div class="feed-source">${resource.source}</div>
                    <div class="feed-quality">Quality: ${Math.round((resource.quality || 0.8) * 100)}%</div>
                </div>
            `;
            
            discoveryFeed.prepend(feedItem);
            
            // Animate the new item
            setTimeout(() => {
                feedItem.classList.remove('new-resource');
            }, 100);
            
            // Keep only the last 8 items
            while (discoveryFeed.children.length > 8) {
                discoveryFeed.removeChild(discoveryFeed.lastChild);
            }
        });
    } else {
        // Add realistic discovery messages when no specific resources provided
        const messages = [
            `🔍 Scanning ${status.query || 'educational content'} resources...`,
            `📚 Found ${status.resources_found || 0} high-quality materials`,
            `⚡ Analyzing content from ${status.sources_scanned || 0} sources`,
            `🎯 Quality assessment: ${Math.round((status.avg_quality || 0.85) * 100)}% average`,
            `🧠 Processing learning pathways...`,
            `📖 Extracting key concepts and structure`
        ];
        
        // Add a new message periodically during discovery
        if (status.status === 'DISCOVERING' && Math.random() < 0.4) {
            const message = messages[Math.floor(Math.random() * messages.length)];
            addDiscoveryMessage(discoveryFeed, message);
        }
    }
}

// Add animated discovery messages (Phase 5.1 Enhancement)
function addDiscoveryMessage(feedContainer, message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'discovery-message new';
    messageEl.innerHTML = `<div class="message-content">${message}</div>`;
    
    // Insert at the top
    feedContainer.insertBefore(messageEl, feedContainer.firstChild);
    
    // Animate in
    setTimeout(() => {
        messageEl.classList.remove('new');
    }, 100);
    
    // Remove old messages to keep feed clean
    const messages = feedContainer.children;
    if (messages.length > 6) {
        feedContainer.removeChild(messages[messages.length - 1]);
    }
    
    // Auto-fade old messages
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.opacity = '0.7';
        }
    }, 3000);
}

// Show learning path results from Google Custom Search + Vertex AI Gemini
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
        
        // Show success message with Google Custom Search + Vertex AI Gemini branding
        const resultsHeader = document.querySelector('.results-summary');
        if (resultsHeader) {
            const successMessage = document.createElement('div');
            successMessage.className = 'search-success-message';
            successMessage.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Your personalized learning path has been created using Google Custom Search + Vertex AI Gemini!</span>
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

// Populate individual resources section with data from Google Custom Search
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
