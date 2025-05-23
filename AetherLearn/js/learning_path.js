/**
 * Learning Path API Integration
 * Handles communication with the backend for creating and managing learning paths
 * Updated for the Vertex AI Search implementation
 */

// API URL Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Learning Path API Functions
class LearningPathAPI {
    /**
     * Initiate a search for creating a learning path using Vertex AI Search
     * @param {string} query - The search query
     * @param {Object} preferences - User preferences for the learning path
     * @returns {Promise<Object>} - Response with search ID
     */
    static async initiateSearch(query, preferences = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}/learning-path/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    query,
                    preferences
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to initiate search:', error);
            throw error;
        }
    }
    
    /**
     * Get the status of a search
     * @param {string} searchId - The search ID
     * @returns {Promise<Object>} - Search status object
     */
    static async getSearchStatus(searchId) {
        try {
            const response = await fetch(`${API_BASE_URL}/learning-path/status/${searchId}`, {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get search status:', error);
            throw error;
        }
    }
    
    /**
     * Get a learning path by ID
     * @param {string} learningPathId - The learning path ID
     * @returns {Promise<Object>} - Learning path object
     */
    static async getLearningPath(learningPathId) {
        try {
            const response = await fetch(`${API_BASE_URL}/learning-path/${learningPathId}`, {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get learning path:', error);
            throw error;
        }
    }
    
    /**
     * Customize an existing learning path
     * @param {string} learningPathId - The learning path ID
     * @param {Object} preferences - New preferences for customization
     * @returns {Promise<Object>} - Response with search ID for the customization
     */
    static async customizeLearningPath(learningPathId, preferences) {
        try {
            const response = await fetch(`${API_BASE_URL}/learning-path/customize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    learning_path_id: learningPathId,
                    preferences
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to customize learning path:', error);
            throw error;
        }
    }
    
    /**
     * Get all learning paths for the current user
     * @returns {Promise<Array>} - Array of learning path objects
     */
    static async getUserLearningPaths() {
        try {
            const response = await fetch(`${API_BASE_URL}/learning-path/user/paths`, {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get user learning paths:', error);
            throw error;
        }
    }
    
    /**
     * Get the JWT token from localStorage
     * @returns {string} - JWT token
     */
    static getToken() {
        return localStorage.getItem('token') || '';
    }
}

// Search Process UI Functions
class LearningPathUI {
    /**
     * Start the search process
     * @param {string} query - The search query
     */
    static async startSearchProcess(query) {
        try {
            // Show the search process container
            document.getElementById('searchProcessContainer').style.display = 'block';
            
            // Show the first stage
            document.getElementById('searchProcessingStage').style.display = 'block';
            document.getElementById('resourceDiscoveryStage').style.display = 'none';
            document.getElementById('learningPathResultsStage').style.display = 'none';
            
            // Initialize search process UI
            this.initializeSearchProcessUI(query);
            
            // Initiate the search
            const preferences = this.collectUserPreferences();
            const response = await LearningPathAPI.initiateSearch(query, preferences);
            
            // Start polling for status
            this.pollSearchStatus(response.search_id);
        } catch (error) {
            console.error('Error starting search process:', error);
            this.showErrorMessage('Failed to start search process. Please try again.');
        }
    }
    
    /**
     * Initialize search process UI with query and reset visuals
     * @param {string} query - The search query
     */
    static initializeSearchProcessUI(query) {
        // Set query text in all relevant places
        const queryTextElements = document.querySelectorAll('#searchQueryText, #resultQueryText');
        queryTextElements.forEach(element => {
            if (element) element.textContent = query;
        });
        
        // Reset progress bars
        const progressBars = document.querySelectorAll('.progress-fill');
        progressBars.forEach(bar => {
            if (bar) bar.style.width = '0%';
        });
        
        // Reset progress text
        const progressTexts = document.querySelectorAll('#analysisProgress, #discoveryProgress');
        progressTexts.forEach(text => {
            if (text) text.textContent = '0';
        });
        
        // Reset process steps
        const processSteps = document.querySelectorAll('.process-step');
        processSteps.forEach((step, index) => {
            const statusIcon = step.querySelector('.step-status i');
            if (index === 0) {
                step.classList.add('active');
                if (statusIcon) statusIcon.className = 'fas fa-spinner fa-spin';
            } else {
                step.classList.remove('active', 'completed');
                if (statusIcon) statusIcon.className = 'fas fa-circle';
            }
        });
        
        // Reset discovery visualization
        const resourceDots = document.getElementById('resourceDots');
        if (resourceDots) resourceDots.innerHTML = '';
        
        // Reset discovery stats
        const statElements = document.querySelectorAll('#resourcesFound, #sourcesScanned, #avgQualityScore');
        statElements.forEach(element => {
            if (element) element.textContent = '0';
        });
        
        // Reset discovery feed
        const discoveryFeed = document.getElementById('discoveryFeed');
        if (discoveryFeed) {
            discoveryFeed.innerHTML = '<div class="discovery-message">Preparing Vertex AI search engines...</div>';
        }
    }
    
    /**
     * Poll for search status
     * @param {string} searchId - The search ID
     */
    static async pollSearchStatus(searchId) {
        try {
            const statusCheckInterval = setInterval(async () => {
                try {
                    const status = await LearningPathAPI.getSearchStatus(searchId);
                    
                    // Update the UI based on status
                    this.updateSearchProcessUI(status);
                    
                    // If completed or failed, stop polling
                    if (status.status === 'COMPLETED' || status.status === 'FAILED') {
                        clearInterval(statusCheckInterval);
                        
                        if (status.status === 'COMPLETED' && status.learning_path_id) {
                            // Show the learning path results
                            this.showLearningPathResults(status.learning_path_id);
                        } else if (status.status === 'FAILED') {
                            this.showErrorMessage(status.message || 'Search process failed. Please try again.');
                        }
                    }
                } catch (error) {
                    console.error('Error checking search status:', error);
                    clearInterval(statusCheckInterval);
                    this.showErrorMessage('Error checking search status. Please try again.');
                }
            }, 3000); // Check every 3 seconds
        } catch (error) {
            console.error('Error setting up status polling:', error);
            this.showErrorMessage('Error monitoring search progress. Please try again.');
        }
    }
      /**
     * Update the search process UI based on status from Vertex AI Search
     * @param {Object} status - The search status object
     */
    static updateSearchProcessUI(status) {
        // Update progress bar
        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.getElementById('analysisProgress');
        
        if (progressBar && progressText) {
            progressBar.style.width = `${status.progress}%`;
            progressText.textContent = `${status.progress}%`;
        }
        
        // Update status message if provided
        if (status.message) {
            const statusElement = document.getElementById('statusMessage');
            if (statusElement) {
                statusElement.textContent = status.message;
            }
        }
        
        // Update process steps based on status
        switch (status.status) {
            case 'INITIATED':
                this.updateProcessStep('step1', 'active');
                document.getElementById('searchProcessingStage').style.display = 'block';
                document.getElementById('resourceDiscoveryStage').style.display = 'none';
                break;
                
            case 'DISCOVERING':
                this.updateProcessStep('step1', 'completed');
                this.updateProcessStep('step2', 'active');
                
                // Show the resource discovery stage
                document.getElementById('searchProcessingStage').style.display = 'none';
                document.getElementById('resourceDiscoveryStage').style.display = 'block';
                
                // Update discovery stage progress
                const discoveryProgressBar = document.querySelector('.discovery-progress-fill');
                if (discoveryProgressBar) {
                    discoveryProgressBar.style.width = `${status.progress * 2}%`; // Scale for this stage
                }
                
                // Show dynamic message about discovery process
                const discoveryStatusMsg = document.getElementById('discoveryStatusMessage');
                if (discoveryStatusMsg) {
                    discoveryStatusMsg.textContent = status.message || 'Discovering educational resources with Vertex AI Search...';
                }
                break;
                
            case 'PROCESSING':
                this.updateProcessStep('step1', 'completed');
                this.updateProcessStep('step2', 'completed');
                this.updateProcessStep('step3', 'active');
                break;
            case 'PROCESSING':
                this.updateProcessStep('step1', 'completed');
                this.updateProcessStep('step2', 'completed');
                this.updateProcessStep('step3', 'completed');
                this.updateProcessStep('step4', 'active');
                break;
            case 'COMPLETED':
                this.updateProcessStep('step1', 'completed');
                this.updateProcessStep('step2', 'completed');
                this.updateProcessStep('step3', 'completed');
                this.updateProcessStep('step4', 'completed');
                break;
        }
        
        // Update message
        const messageElement = document.getElementById('statusMessage');
        if (messageElement && status.message) {
            messageElement.textContent = status.message;
        }
    }
    
    /**
     * Update a process step's status
     * @param {string} stepId - The step ID
     * @param {string} status - The step status (active, completed, etc.)
     */
    static updateProcessStep(stepId, status) {
        const step = document.getElementById(stepId);
        if (step) {
            // Remove all status classes
            step.classList.remove('active', 'completed');
            
            // Add the new status class
            step.classList.add(status);
            
            // Update the step icon
            const icon = step.querySelector('.step-status i');
            if (icon) {
                icon.className = ''; // Clear existing classes
                
                if (status === 'active') {
                    icon.className = 'fas fa-spinner fa-spin';
                } else if (status === 'completed') {
                    icon.className = 'fas fa-check-circle';
                } else {
                    icon.className = 'fas fa-circle';
                }
            }
        }
    }
    
    /**
     * Show learning path results
     * @param {string} learningPathId - The learning path ID
     */    static async showLearningPathResults(learningPathId) {
        try {
            // Get the learning path data 
            const learningPath = await LearningPathAPI.getLearningPath(learningPathId);
            
            // Hide the processing stages
            document.getElementById('searchProcessingStage').style.display = 'none';
            document.getElementById('resourceDiscoveryStage').style.display = 'none';
            
            // Show the results stage
            const resultsStage = document.getElementById('learningPathResultsStage');
            resultsStage.style.display = 'block';
            
            // Show a success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.innerHTML = `<i class="fas fa-check-circle"></i> Your learning path has been created with Vertex AI!`;
            
            // If there's an existing success message, remove it
            const existingMsg = resultsStage.querySelector('.success-message');
            if (existingMsg) {
                existingMsg.remove();
            }
            
            // Insert the success message at the top of the results stage
            resultsStage.insertBefore(successMsg, resultsStage.firstChild);
            
            // Render the learning path
            this.renderLearningPath(learningPath);
        } catch (error) {
            console.error('Error showing learning path results:', error);
            this.showErrorMessage('Failed to load learning path results. Please try again.');
        }
    }
      /**
     * Render a learning path generated by Vertex AI Search and Generation
     * @param {Object} learningPath - The learning path object
     */
    static renderLearningPath(learningPath) {
        // Update the result query
        document.getElementById('resultQueryText').textContent = learningPath.query;
        
        // Update result stats
        document.getElementById('totalResourcesCount').textContent = this.countResources(learningPath);
        document.getElementById('estimatedTime').textContent = learningPath.estimated_hours;
        document.getElementById('difficultyLevel').textContent = learningPath.difficulty;
        
        // Add AI generation info
        const resultHeader = document.querySelector('.learning-path-header');
        if (resultHeader) {
            const aiInfoBadge = document.createElement('div');
            aiInfoBadge.className = 'ai-generation-badge';
            aiInfoBadge.innerHTML = `<i class="fas fa-robot"></i> Generated by Vertex AI`;
            resultHeader.appendChild(aiInfoBadge);
        }
        
        // Render the modules
        const modulesContainer = document.querySelector('.modules-container');
        if (modulesContainer) {
            let modulesHTML = '';
            
            learningPath.modules.forEach(module => {
                let resourcesHTML = '';
                
                module.resources.forEach(resource => {                    // Prepare learning styles badges if available
                    let learningStylesHTML = '';
                    if (resource.learning_styles && resource.learning_styles.length > 0) {
                        learningStylesHTML = `
                            <div class="learning-styles">
                                ${resource.learning_styles.map(style => 
                                    `<span class="learning-style-badge ${style}">
                                        <i class="${this.getLearningStyleIcon(style)}"></i> ${this.capitalizeFirstLetter(style)}
                                    </span>`
                                ).join('')}
                            </div>
                        `;
                    }
                    
                    // Calculate quality score stars
                    const qualityScore = resource.quality_score || 0.5;
                    const starCount = Math.round(qualityScore * 5);
                    const starsHTML = this.generateStarRating(starCount);
                    
                    resourcesHTML += `
                        <div class="path-resource">
                            <div class="resource-icon">
                                <i class="${this.getResourceIcon(resource.resource_type)}"></i>
                            </div>
                            <div class="resource-content">
                                <h4>${resource.title}</h4>
                                <p>${resource.description}</p>
                                <div class="resource-meta">
                                    <span><i class="fas fa-clock"></i> ${resource.estimated_time_minutes} min</span>
                                    <span><i class="fas fa-signal"></i> ${resource.difficulty}</span>
                                    <span><i class="fas fa-globe"></i> ${resource.source}</span>
                                    <span class="quality-score">${starsHTML}</span>
                                </div>
                                ${learningStylesHTML}
                                <a href="${resource.url}" target="_blank" class="resource-link">
                                    <i class="fas fa-external-link-alt"></i> Open Resource
                                </a>
                            </div>
                        </div>
                    `;
                });
                
                modulesHTML += `
                    <div class="path-module">
                        <div class="module-header">
                            <h3>${module.title}</h3>
                            <span class="module-order">Module ${module.order}</span>
                        </div>
                        <p>${module.description}</p>
                        <div class="module-resources">
                            ${resourcesHTML}
                        </div>
                    </div>
                `;
            });
            
            modulesContainer.innerHTML = `<h3>Learning Modules</h3>${modulesHTML}`;
        }
        
        // Render the path visualization
        this.renderPathVisualization(learningPath);
        
        // Setup customization form with current preferences
        this.setupCustomizationForm(learningPath);
    }
    
    /**
     * Count total resources in a learning path
     * @param {Object} learningPath - The learning path object
     * @returns {number} - Total resources count
     */
    static countResources(learningPath) {
        let count = 0;
        learningPath.modules.forEach(module => {
            count += module.resources.length;
        });
        return count;
    }
      /**
     * Get icon class for resource type from Vertex AI Search
     * @param {string} resourceType - The resource type
     * @returns {string} - Font Awesome icon class
     */
    static getResourceIcon(resourceType) {
        if (!resourceType) return 'fas fa-file';
        
        switch (resourceType.toLowerCase()) {
            case 'video':
                return 'fas fa-video';
            case 'article':
                return 'fas fa-newspaper';
            case 'course':
                return 'fas fa-graduation-cap';
            case 'interactive':
                return 'fas fa-laptop-code';
            case 'documentation':
                return 'fas fa-book';
            case 'repository':
            case 'github':
                return 'fab fa-github';
            case 'academic':
                return 'fas fa-university';
            case 'tutorial':
                return 'fas fa-chalkboard-teacher';
            case 'podcast':
                return 'fas fa-podcast';
            case 'presentation':
                return 'fas fa-presentation';
            case 'ebook':
                return 'fas fa-book-reader';
            default:
                return 'fas fa-file';
        }
    }
    
    /**
     * Get icon for learning style
     * @param {string} style - Learning style name
     * @returns {string} - Font Awesome icon class
     */
    static getLearningStyleIcon(style) {
        switch (style.toLowerCase()) {
            case 'visual':
                return 'fas fa-eye';
            case 'auditory':
                return 'fas fa-headphones';
            case 'reading':
                return 'fas fa-book-open';
            case 'kinesthetic':
                return 'fas fa-hand-paper';
            case 'practical':
                return 'fas fa-tools';
            case 'analytical':
                return 'fas fa-chart-line';
            case 'structured':
                return 'fas fa-list-ol';
            default:
                return 'fas fa-graduation-cap';
        }
    }
    
    /**
     * Generate star rating HTML based on score
     * @param {number} starCount - Number of stars (0-5)
     * @returns {string} - HTML for star rating
     */
    static generateStarRating(starCount) {
        let stars = '';
        // Full stars
        for (let i = 0; i < Math.min(starCount, 5); i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Empty stars
        for (let i = starCount; i < 5; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }
    
    /**
     * Capitalize first letter of a string
     * @param {string} str - Input string
     * @returns {string} - String with first letter capitalized
     */
    static capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Render the path visualization
     * @param {Object} learningPath - The learning path object
     */
    static renderPathVisualization(learningPath) {
        const visualization = document.querySelector('.path-visualization');
        if (!visualization) return;
        
        let nodesHTML = '';
        
        // Start node
        nodesHTML += `
            <div class="path-node start">
                <div class="node-icon">
                    <i class="fas fa-play"></i>
                </div>
                <div class="node-label">Start</div>
            </div>
            <div class="path-connection"></div>
        `;
        
        // Module nodes
        learningPath.modules.forEach((module, index) => {
            nodesHTML += `
                <div class="path-node module">
                    <div class="node-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="node-label">Module ${module.order}</div>
                </div>
            `;
            
            // Add connection if not the last module
            if (index < learningPath.modules.length - 1) {
                nodesHTML += `<div class="path-connection"></div>`;
            }
        });
        
        // End node
        nodesHTML += `
            <div class="path-connection"></div>
            <div class="path-node end">
                <div class="node-icon">
                    <i class="fas fa-flag-checkered"></i>
                </div>
                <div class="node-label">Complete</div>
            </div>
        `;
        
        visualization.innerHTML = nodesHTML;
    }
    
    /**
     * Setup customization form with current preferences
     * @param {Object} learningPath - The learning path object
     */
    static setupCustomizationForm(learningPath) {
        const preferences = learningPath.preferences || {};
        
        // Set difficulty level
        const difficultySelect = document.getElementById('difficultyLevel');
        if (difficultySelect && preferences.difficulty) {
            difficultySelect.value = preferences.difficulty;
        }
        
        // Set learning format checkboxes
        if (preferences.formats) {
            const formats = preferences.formats;
            const videoCheckbox = document.querySelector('input[value="video"]');
            const interactiveCheckbox = document.querySelector('input[value="interactive"]');
            
            if (videoCheckbox) videoCheckbox.checked = formats.includes('video');
            if (interactiveCheckbox) interactiveCheckbox.checked = formats.includes('interactive');
        }
        
        // Set focus area
        const focusArea = document.getElementById('focusArea');
        if (focusArea && preferences.focus_area) {
            focusArea.value = preferences.focus_area;
        }
        
        // Set time commitment
        const timeCommitment = document.getElementById('timeCommitment');
        if (timeCommitment && preferences.time_commitment) {
            timeCommitment.value = preferences.time_commitment;
        }
        
        // Setup update button
        const updateBtn = document.getElementById('updateCourseBtn');
        if (updateBtn) {
            updateBtn.onclick = () => this.handleCustomize(learningPath._id);
        }
    }
    
    /**
     * Handle customization request
     * @param {string} learningPathId - The learning path ID
     */
    static async handleCustomize(learningPathId) {
        try {
            // Collect preferences
            const preferences = this.collectUserPreferences();
            
            // Send customization request
            const response = await LearningPathAPI.customizeLearningPath(learningPathId, preferences);
            
            // Start polling for status
            this.pollSearchStatus(response.search_id);
            
            // Show processing UI again
            document.getElementById('searchProcessingStage').style.display = 'block';
            document.getElementById('resourceDiscoveryStage').style.display = 'none';
            document.getElementById('learningPathResultsStage').style.display = 'none';
            
        } catch (error) {
            console.error('Error customizing learning path:', error);
            this.showErrorMessage('Failed to customize learning path. Please try again.');
        }
    }
      /**
     * Collect user preferences from the UI for Vertex AI Search and generation
     * @returns {Object} - User preferences
     */
    static collectUserPreferences() {
        const preferences = {};
        
        // Get difficulty level
        const difficultySelect = document.getElementById('difficultyLevel');
        if (difficultySelect) {
            preferences.difficulty = difficultySelect.value;
        }
        
        // Get learning format preferences - expanded for more content types
        const formatCheckboxes = {
            video: document.querySelector('input[value="video"]'),
            article: document.querySelector('input[value="article"]'), 
            interactive: document.querySelector('input[value="interactive"]'),
            course: document.querySelector('input[value="course"]'),
            academic: document.querySelector('input[value="academic"]'),
            documentation: document.querySelector('input[value="documentation"]')
        };
        
        preferences.formats = [];
        for (const [format, checkbox] of Object.entries(formatCheckboxes)) {
            if (checkbox && checkbox.checked) {
                preferences.formats.push(format);
            }
        }
        
        // Get focus area
        const focusArea = document.getElementById('focusArea');
        if (focusArea && focusArea.value) {
            preferences.focus_area = focusArea.value;
        }
        
        // Get time commitment
        const timeCommitment = document.getElementById('timeCommitment');
        if (timeCommitment) {
            preferences.time_commitment = timeCommitment.value;
        }
        
        // Get learning style preferences
        const learningStyles = [];
        const visualCheckbox = document.querySelector('input[value="visual"]');
        const auditoryCheckbox = document.querySelector('input[value="auditory"]');
        const readingCheckbox = document.querySelector('input[value="reading"]');
        const kinestheticCheckbox = document.querySelector('input[value="kinesthetic"]');
        
        if (visualCheckbox && visualCheckbox.checked) learningStyles.push('visual');
        if (auditoryCheckbox && auditoryCheckbox.checked) learningStyles.push('auditory');
        if (readingCheckbox && readingCheckbox.checked) learningStyles.push('reading');
        if (kinestheticCheckbox && kinestheticCheckbox.checked) learningStyles.push('kinesthetic');
        
        if (learningStyles.length > 0) {
            preferences.learning_styles = learningStyles;
        }
        
        return preferences;
    }
    
    /**
     * Show error message
     * @param {string} message - The error message
     */
    static showErrorMessage(message) {
        // Implementation would depend on your UI
        alert(message);
    }
}

// Export for use in other modules
window.LearningPathAPI = LearningPathAPI;
window.LearningPathUI = LearningPathUI;
