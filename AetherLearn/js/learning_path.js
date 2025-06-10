/**
 * Learning Path API Integration
 * Handles communication with the backend for creating and managing learning paths
 * Updated for Google Custom Search API + Vertex AI Gemini implementation
 */

// API URL Configuration (only declare if not already defined)
window.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';

// Learning Path API Functions
window.LearningPathAPI = class LearningPathAPI {
    /**
     * Initiate a search for creating a learning path using Google Custom Search + Vertex AI Gemini
     * @param {string} query - The search query
     * @param {Object} preferences - User preferences for the learning path
     * @returns {Promise<Object>} - Response with search ID
     */
    static async initiateSearch(query, preferences = {}) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Only add Authorization header if we have a token
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${window.API_BASE_URL}/learning-path/search`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    query,
                    preferences
                })
            });
            
            if (!response.ok) {
                let errorMessage = `Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    console.error('API Error Response:', errorData);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join(', ');
                    }
                } catch (e) {
                    console.error('Failed to parse error response:', e);
                }
                throw new Error(errorMessage);
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
            const headers = {};
            
            // Only add Authorization header if we have a token
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${window.API_BASE_URL}/learning-path/status/${searchId}`, {
                headers: headers
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
            const response = await fetch(`${window.API_BASE_URL}/learning-path/${learningPathId}`, {
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
            const response = await fetch(`${window.API_BASE_URL}/learning-path/customize`, {
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
            const response = await fetch(`${window.API_BASE_URL}/learning-path/user/paths`, {
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
window.LearningPathUI = class LearningPathUI {
    /**
     * Start the search process
     * @param {string} query - The search query
     */
    static async startSearchProcess(query) {
        // Prevent multiple simultaneous searches using global SearchState
        if (window.SearchState.isInProgress) {
            console.log('Search already in progress, ignoring duplicate request');
            return;
        }
        
        window.SearchState.isInProgress = true;
        window.SearchState.currentQuery = query;
        
        try {
            // Show the search process container
            document.getElementById('searchProcessContainer').style.display = 'block';
            
            // Reset results stage populated flag for new search
            const resultsStage = document.getElementById('learningPathResultsStage');
            resultsStage.style.display = 'none';
            resultsStage.dataset.populated = 'false';
            
            // GOOGLE CUSTOM SEARCH + VERTEX AI GEMINI INTEGRATION
            console.log('🚀 Starting Google Custom Search + Vertex AI Gemini integration');
            
            const preferences = this.collectUserPreferences();
            
            // Initialize search UI
            this.initializeSearchProcessUI(query);
            
            // Start the unified search workflow
            await this.startUnifiedSearchWorkflow(query, preferences);
            
        } catch (error) {
            console.error('Error starting search process:', error);
            this.showErrorMessage('Failed to start search process. Please try again.');
            // Reset flag on error
            window.SearchState.isInProgress = false;
            window.SearchState.currentSearchId = null;
        }
    }
/**
     * Start unified search workflow using Google Custom Search + Vertex AI Gemini
     * @param {string} query - The search query  
     * @param {Object} preferences - User preferences
     */
    static async startUnifiedSearchWorkflow(query, preferences) {
        try {
            // Enhanced preferences for better results
            const enhancedPreferences = {
                difficulty: preferences.difficulty || 'intermediate',
                content_types: preferences.content_types || ['video', 'article', 'interactive', 'course'],
                time_available: preferences.time_available || '10-20 hours',
                learning_style: preferences.learning_style || ['visual'],
                ...preferences
            };

            // Stage 1: Show query processing
            this.showStage1ProcessingUI(query);

            // Start the backend search workflow
            const response = await LearningPathAPI.initiateSearch(query, enhancedPreferences);
            
            if (response && response.search_id) {
                // Start polling for real-time progress
                this.startRealTimeProgressPolling(response.search_id);
            } else {
                throw new Error('Failed to initiate search - no search ID received');
            }

        } catch (error) {
            console.error('❌ Unified search workflow failed:', error);
            this.showErrorMessage('Failed to start search process. Please try again.');
            // Reset search flags on error
            window.SearchState.isInProgress = false;
            window.SearchState.currentSearchId = null;
        }
    }

    /**
     * Show Stage 1 processing UI with enhanced feedback
     * @param {string} query - The search query
     */
    static showStage1ProcessingUI(query) {
        // Show Stage 1: Search Processing
        const searchProcessingStage = document.getElementById('searchProcessingStage');
        if (searchProcessingStage) {
            searchProcessingStage.style.display = 'flex';
        }

        // Hide other stages initially
        this.hideStages(['resourceDiscoveryStage', 'learningPathResultsStage']);

        // Update query display
        const searchQueryText = document.getElementById('searchQueryText');
        if (searchQueryText) {
            searchQueryText.textContent = query;
        }

        // Animate process steps
        this.animateProcessSteps();
    }

    /**
     * Animate the 3-step process in Stage 1
     */
    static animateProcessSteps() {
        const processSteps = document.querySelectorAll('.process-step');
        
        // Reset all steps
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

        // Animate steps with realistic timing
        setTimeout(() => {
            if (processSteps[0]) {
                this.updateProcessStepStatus(processSteps[0], 'completed', 'Query enhanced for Google Custom Search');
                if (processSteps[1]) {
                    this.updateProcessStepStatus(processSteps[1], 'active', 'Preparing search parameters...');
                }
            }
        }, 2000);

        setTimeout(() => {
            if (processSteps[1]) {
                this.updateProcessStepStatus(processSteps[1], 'completed', 'Search parameters optimized');
                if (processSteps[2]) {
                    this.updateProcessStepStatus(processSteps[2], 'active', 'Initializing Google Custom Search...');
                }
            }
        }, 4000);

        setTimeout(() => {
            if (processSteps[2]) {
                this.updateProcessStepStatus(processSteps[2], 'completed', 'Ready for resource discovery');
            }
            // Transition to Stage 2 after step completion
            setTimeout(() => this.transitionToStage2(), 1000);
        }, 6000);
    }

    /**
     * Update individual process step status
     * @param {Element} stepElement - The step element
     * @param {string} status - New status (active, completed)
     * @param {string} message - Status message
     */
    static updateProcessStepStatus(stepElement, status, message) {
        const stepText = stepElement.querySelector('.step-text p');
        const stepStatus = stepElement.querySelector('.step-status i');

        if (stepText) stepText.textContent = message;

        if (stepStatus) {
            stepStatus.className = status === 'completed' ? 
                'fas fa-check-circle' : 'fas fa-spinner fa-spin';
        }

        stepElement.classList.toggle('active', status === 'active');
        stepElement.classList.toggle('completed', status === 'completed');
    }

    /**
     * Transition to Stage 2: Resource Discovery
     */
    static transitionToStage2() {
        console.log('🔄 Transitioning to Stage 2: Resource Discovery');
        
        // Hide Stage 1, Show Stage 2
        this.hideStages(['searchProcessingStage']);
        
        const resourceDiscoveryStage = document.getElementById('resourceDiscoveryStage');
        if (resourceDiscoveryStage) {
            resourceDiscoveryStage.style.display = 'flex';
        }

        // Initialize discovery feed
        const discoveryFeed = document.getElementById('discoveryFeed');
        if (discoveryFeed) {
            discoveryFeed.innerHTML = `
                <div class="discovery-feed-item">
                    <div class="feed-icon"><i class="fas fa-search"></i></div>
                    <div class="feed-content">
                        <h4>🔍 Google Custom Search Initiated</h4>
                        <p>Scanning educational repositories with enhanced query...</p>
                        <span class="feed-timestamp">Just now</span>
                    </div>
                </div>
            `;
        }

        // Reset discovery statistics
        this.updateDiscoveryStats(0, 0, 0);
    }

    /**
     * Start real-time progress polling
     * @param {string} searchId - The search ID
     */
    static startRealTimeProgressPolling(searchId) {
        if (window.SearchState.currentSearchId === searchId) {
            console.log('Already polling this search, ignoring duplicate request');
            return;
        }
        
        window.SearchState.currentSearchId = searchId;
        
        const pollInterval = setInterval(async () => {
            try {
                const status = await LearningPathAPI.getSearchStatus(searchId);
                
                // Update UI based on status
                this.handleProgressUpdate(status);
                
                // Check if completed or failed
                if (status.status === 'COMPLETED' || status.status === 'FAILED') {
                    clearInterval(pollInterval);
                    
                    if (status.status === 'COMPLETED' && status.learning_path_id) {
                        await this.showLearningPathResults(status.learning_path_id);
                    } else if (status.status === 'FAILED') {
                        this.showErrorMessage(status.message || 'Search process failed. Please try again.');
                    }
                    
                    // Reset search flags
                    window.SearchState.isInProgress = false;
                    window.SearchState.currentSearchId = null;
                }
            } catch (error) {
                console.warn(`⚠️ Polling error: ${error.message}`);
            }
        }, 3000); // Poll every 3 seconds
    }

    /**
     * Handle real-time progress updates from backend
     * @param {Object} status - Status object from backend
     */
    static handleProgressUpdate(status) {
        console.log('📊 Progress update:', status);
        
        // Update discovery statistics
        this.updateDiscoveryStats(
            status.resources_found || 0,
            status.sources_scanned || 0,
            Math.round((status.avg_quality || 0.85) * 100)
        );

        // Update progress bar
        this.updateDiscoveryProgress(status.progress || 0);

        // Handle status-specific updates
        switch (status.status) {
            case 'SEARCHING':
                this.updateDiscoveryMessage('🔍 Searching with Google Custom Search API...', status.status);
                break;
            case 'CATEGORIZING':
                this.updateDiscoveryMessage('🤖 Vertex AI Gemini is categorizing resources...', status.status);
                break;
            case 'GENERATING':
                this.updateDiscoveryMessage('📚 Creating personalized learning path...', status.status);
                break;
            default:
                this.updateDiscoveryMessage(status.message || 'Processing...', status.status);
        }

        // Add real resources to discovery feed if available
        if (status.latest_resources && status.latest_resources.length > 0) {
            this.addRealResourcesToFeed(status.latest_resources);
        }
    }

    /**
     * Update discovery statistics
     * @param {number} resourcesFound - Number of resources found
     * @param {number} sourcesScanned - Number of sources scanned
     * @param {number} avgQuality - Average quality score
     */
    static updateDiscoveryStats(resourcesFound, sourcesScanned, avgQuality) {
        const resourcesFoundEl = document.getElementById('resourcesFound');
        const sourcesScannedEl = document.getElementById('sourcesScanned');
        const avgQualityScoreEl = document.getElementById('avgQualityScore');

        if (resourcesFoundEl) resourcesFoundEl.textContent = resourcesFound;
        if (sourcesScannedEl) sourcesScannedEl.textContent = sourcesScanned;
        if (avgQualityScoreEl) avgQualityScoreEl.textContent = avgQuality;
    }

    /**
     * Update discovery progress bar
     * @param {number} progress - Progress percentage (0-100)
     */
    static updateDiscoveryProgress(progress) {
        const progressBar = document.getElementById('discoveryProgressBar');
        const progressText = document.getElementById('discoveryProgress');

        if (progressBar) {
            const progressFill = progressBar.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
        }

        if (progressText) {
            progressText.textContent = progress;
        }
    }

    /**
     * Update discovery message
     * @param {string} message - Status message
     * @param {string} status - Current status
     */
    static updateDiscoveryMessage(message, status) {
        console.log(`📊 Discovery: ${message}`);
        
        // Add message to discovery feed if needed
        const discoveryFeed = document.getElementById('discoveryFeed');
        if (discoveryFeed && message) {
            const feedItem = document.createElement('div');
            feedItem.className = 'discovery-feed-item';
            feedItem.innerHTML = `
                <div class="feed-icon"><i class="fas fa-info-circle"></i></div>
                <div class="feed-content">
                    <h4>Status Update</h4>
                    <p>${message}</p>
                    <span class="feed-timestamp">Just now</span>
                </div>
            `;
            
            discoveryFeed.insertBefore(feedItem, discoveryFeed.firstChild);
            
            // Keep only last 5 items
            const items = discoveryFeed.querySelectorAll('.discovery-feed-item');
            if (items.length > 5) {
                discoveryFeed.removeChild(items[items.length - 1]);
            }
        }
    }

    /**
     * Add real resources to discovery feed
     * @param {Array} resources - Array of resource objects
     */
    static addRealResourcesToFeed(resources) {
        const discoveryFeed = document.getElementById('discoveryFeed');
        if (!discoveryFeed) return;

        resources.forEach(resource => {
            const feedItem = document.createElement('div');
            feedItem.className = 'discovery-feed-item';
            feedItem.innerHTML = `
                <div class="feed-icon">
                    <i class="${this.getResourceIcon(resource.resource_type || resource.type)}"></i>
                </div>
                <div class="feed-content">
                    <h4>📚 Found: ${resource.title || 'Educational Resource'}</h4>
                    <p>Source: ${resource.displayLink || resource.source || 'Google Search'}</p>
                    <span class="feed-timestamp">Just now</span>
                </div>
            `;

            // Add to top of feed
            discoveryFeed.insertBefore(feedItem, discoveryFeed.firstChild);

            // Keep only last 5 items
            const items = discoveryFeed.querySelectorAll('.discovery-feed-item');
            if (items.length > 5) {
                discoveryFeed.removeChild(items[items.length - 1]);
            }
        });
    }

    /**
     * Hide specified stages
     * @param {Array} stageIds - Array of stage IDs to hide
     */
    static hideStages(stageIds) {
        stageIds.forEach(id => {
            const stage = document.getElementById(id);
            if (stage) stage.style.display = 'none';
        });
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
            discoveryFeed.innerHTML = '<div class="discovery-message">Preparing Google Custom Search engines...</div>';
        }
    }
    
    /**
     * Poll for search status
     * @param {string} searchId - The search ID
     */
    static async pollSearchStatus(searchId) {
        // Prevent duplicate polling (Step 3 from plan)
        if (window.SearchState.currentSearchId === searchId) {
            console.log('Already polling this search, ignoring duplicate request');
            return;
        }
        
        window.SearchState.currentSearchId = searchId;
        
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
                        
                        // Reset search flags
                        window.SearchState.isInProgress = false;
                        window.SearchState.currentSearchId = null;
                    }
                } catch (error) {
                    console.error('Error checking search status:', error);
                    clearInterval(statusCheckInterval);
                    this.showErrorMessage('Error checking search status. Please try again.');
                    // Reset search flags on error
                    window.SearchState.isInProgress = false;
                    window.SearchState.currentSearchId = null;
                }
            }, 3000); // Check every 3 seconds
        } catch (error) {
            console.error('Error setting up status polling:', error);
            this.showErrorMessage('Error monitoring search progress. Please try again.');
            // Reset search flags on error
            window.SearchState.isInProgress = false;
            window.SearchState.currentSearchId = null;
        }
    }
      /**
     * Update the search process UI based on status from Google Custom Search + Vertex AI Gemini
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
                    discoveryStatusMsg.textContent = status.message || 'Discovering educational resources with Google Custom Search...';
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
            // Single Result Display Logic (Step 3 from plan)
            const resultsStage = document.getElementById('learningPathResultsStage');
            if (resultsStage.dataset.populated === 'true') {
                console.log('Learning path results already displayed, preventing duplicate');
                return;
            }
            
            // Get the learning path data
            const learningPath = await LearningPathAPI.getLearningPath(learningPathId);
            
            // Hide the processing stages
            document.getElementById('searchProcessingStage').style.display = 'none';
            document.getElementById('resourceDiscoveryStage').style.display = 'none';
            
            // Show the results stage
            resultsStage.style.display = 'block';
            resultsStage.dataset.populated = 'true';
            
            // Clear any existing content to prevent duplicates
            resultsStage.innerHTML = '';
            
            // Show a success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.innerHTML = `<i class="fas fa-check-circle"></i> Your personalized learning path has been created using Google Custom Search + Vertex AI Gemini!`;
            
            // Insert the success message at the top of the results stage
            resultsStage.appendChild(successMsg);
            
            // Create container for learning path content
            const pathContainer = document.createElement('div');
            pathContainer.className = 'learning-path-container';
            resultsStage.appendChild(pathContainer);
            
            // Render the learning path
            this.renderLearningPath(learningPath, pathContainer);
            
            // Populate Individual Resources Section (Step 4 from plan)
            this.populateIndividualResources(learningPath);
        } catch (error) {
            console.error('Error showing learning path results:', error);
            this.showErrorMessage('Failed to load learning path results. Please try again.');
        }
    }
      /**
       * Render a learning path generated by Google Custom Search + Vertex AI Gemini
       * @param {Object} learningPath - The learning path object
       * @param {Element} container - The container element to render into (optional)
       */
      static renderLearningPath(learningPath, container = null) {
          // Create learning path header
          const headerHTML = `
              <div class="learning-path-header">
                  <h2>Your Personalized Learning Path</h2>
                  <div class="ai-generation-badge">
                      <i class="fas fa-robot"></i> Generated by Vertex AI
                  </div>
                  <div class="learning-path-stats">
                      <span><strong>Query:</strong> ${learningPath.query}</span><br>
                      <span><strong>${this.countResources(learningPath)} resources</strong></span><br>
                      <span><strong>Estimated time:</strong> ${learningPath.estimated_hours} hours</span><br>
                      <span><strong>Difficulty:</strong> ${learningPath.difficulty}</span>
                  </div>
              </div>
          `;
          
          // Use provided container or find existing one
          const targetContainer = container || document.querySelector('.learning-path-container');
          if (targetContainer) {
              targetContainer.innerHTML = headerHTML;
              
              // Create modules container
              const modulesContainer = document.createElement('div');
              modulesContainer.className = 'modules-container';
              targetContainer.appendChild(modulesContainer);
              
              // Render the modules
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
     * Get icon class for resource type from Google Custom Search results
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
     * Collect user preferences from the enhanced UI for Google Custom Search + Vertex AI Gemini
     * @returns {Object} - User preferences
     */
    static collectUserPreferences() {
        const preferences = {};
        
        // Get basic parameters
        const difficultySelect = document.getElementById('difficultySelect');
        const timeCommitmentSelect = document.getElementById('timeCommitmentSelect');
        
        preferences.difficulty = difficultySelect ? difficultySelect.value : 'intermediate';
        preferences.time_commitment = timeCommitmentSelect ? timeCommitmentSelect.value : '10-20 hours';
        
        // Get content format preferences from the enhanced modal
        const formatCheckboxes = document.querySelectorAll('.content-format-grid input[type="checkbox"]');
        preferences.content_formats = [];
        formatCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                preferences.content_formats.push(checkbox.value);
            }
        });
        
        // Fallback to default formats if none selected
        if (preferences.content_formats.length === 0) {
            preferences.content_formats = ['video', 'article', 'interactive', 'course'];
        }
        
        // Get learning style preferences from the enhanced modal
        const styleCheckboxes = document.querySelectorAll('.learning-style-grid input[type="checkbox"]');
        preferences.learning_styles = [];
        styleCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                preferences.learning_styles.push(checkbox.value);
            }
        });
        
        // Get quick preferences from toggle switches
        const visualLearner = document.getElementById('visualLearner');
        const practicalFocus = document.getElementById('practicalFocus');
        const includeExercises = document.getElementById('includeExercises');
        
        preferences.visual_learner = visualLearner ? visualLearner.checked : false;
        preferences.practical_focus = practicalFocus ? practicalFocus.checked : false;
        preferences.include_exercises = includeExercises ? includeExercises.checked : false;
        
        // If visual learner is checked and no learning styles selected, add visual
        if (preferences.visual_learner && preferences.learning_styles.length === 0) {
            preferences.learning_styles.push('visual');
        }
        
        // If practical focus is checked, add kinesthetic learning style
        if (preferences.practical_focus && !preferences.learning_styles.includes('kinesthetic')) {
            preferences.learning_styles.push('kinesthetic');
        }
        
        // Ensure at least one learning style is selected
        if (preferences.learning_styles.length === 0) {
            preferences.learning_styles = ['visual'];
        }
        
        // Additional preference processing
        if (preferences.include_exercises) {
            // Prioritize interactive content if exercises are requested
            if (!preferences.content_formats.includes('interactive')) {
                preferences.content_formats.push('interactive');
            }
        }
        
        // Set focus area based on practical preference
        if (preferences.practical_focus) {
            preferences.focus_area = 'practical';
        }
        
        // Get additional preferences from localStorage if they exist
        try {
            const savedPrefs = localStorage.getItem('aetherlearn_preferences');
            if (savedPrefs) {
                const parsed = JSON.parse(savedPrefs);
                // Merge saved preferences, but current UI takes precedence
                Object.keys(parsed).forEach(key => {
                    if (preferences[key] === undefined) {
                        preferences[key] = parsed[key];
                    }
                });
            }
        } catch (error) {
            console.warn('Could not load saved preferences:', error);
        }
        
        // Ensure backend-compatible format
        return {
            skill_level: preferences.difficulty || 'intermediate',
            time_available: preferences.time_commitment || '10-20 hours',
            content_types: preferences.content_formats || ['video', 'article', 'interactive', 'course'],
            learning_style: preferences.learning_styles || ['visual'],
            include_exercises: preferences.include_exercises || false,
            practical_focus: preferences.practical_focus || false,
            visual_learner: preferences.visual_learner || false
        };
    }
    
    /**
     * Show error message
     * @param {string} message - The error message
     */
    static showErrorMessage(message) {
        // Implementation would depend on your UI
        alert(message);
    }

    /**
     * Populate Individual Resources Section with Backend Data (Step 4 from plan)
     * @param {Object} learningPath - The learning path object from backend
     */
    static populateIndividualResources(learningPath) {
        const resourcesGrid = document.getElementById('individualResourcesGrid');
        if (!resourcesGrid) {
            console.warn('Individual resources grid not found in DOM');
            return;
        }

        // Clear static content (remove placeholder content)
        resourcesGrid.innerHTML = '';
        
        let resourceIndex = 0;
        
        // Iterate through all modules and their resources
        learningPath.modules.forEach(module => {
            module.resources.forEach(resource => {
                const resourceCard = this.createResourceCard(resource, resourceIndex);
                resourcesGrid.appendChild(resourceCard);
                resourceIndex++;
            });
        });
        
        console.log(`Populated ${resourceIndex} individual resources from backend data`);
    }

    /**
     * Create a resource card from backend data (Enhanced for Phase 5.1)
     * @param {Object} resource - Resource object from backend
     * @param {number} index - Resource index for unique IDs
     * @returns {HTMLElement} - Created resource card element
     */
    static createResourceCard(resource, index) {
        const card = document.createElement('div');
        card.className = 'resource-card enhanced';
        card.dataset.resourceType = resource.resource_type || 'article';
        
        // Get resource type icon
        const typeIcon = this.getResourceTypeIcon(resource.resource_type);
        
        // Calculate estimated reading time display
        const timeDisplay = resource.estimated_time_minutes
            ? `${resource.estimated_time_minutes} min`
            : 'N/A';
            
        // Get domain from URL for source display
        const sourceDomain = resource.url ? this.extractDomain(resource.url) : resource.source || 'Unknown';
        
        // Enhanced metadata from backend
        const metadata = resource.metadata || {};
        const rating = metadata.rating || resource.rating || 0;
        const tags = metadata.tags || [];
        const author = metadata.author || 'Unknown Author';
        
        // Generate star rating display
        const starRating = this.generateStarRating(rating);
        
        // Generate tags display
        const tagsHTML = tags.length > 0 ?
            `<div class="resource-tags">
                ${tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>` : '';
        
        // Additional metadata based on resource type
        let additionalInfo = '';
        if (metadata.views) {
            additionalInfo += `<div class="metadata-item"><i class="fas fa-eye"></i><span>${this.formatNumber(metadata.views)} views</span></div>`;
        }
        if (metadata.students) {
            additionalInfo += `<div class="metadata-item"><i class="fas fa-users"></i><span>${this.formatNumber(metadata.students)} students</span></div>`;
        }
        if (metadata.claps) {
            additionalInfo += `<div class="metadata-item"><i class="fas fa-hands-clapping"></i><span>${metadata.claps} claps</span></div>`;
        }
        if (metadata.completion_rate) {
            additionalInfo += `<div class="metadata-item"><i class="fas fa-chart-line"></i><span>${Math.round(metadata.completion_rate * 100)}% completion</span></div>`;
        }
        
        card.innerHTML = `
            <div class="resource-header">
                <div class="resource-type-badge ${resource.resource_type || 'article'}">
                    <i class="${typeIcon}"></i>
                    ${this.capitalizeFirstLetter(resource.resource_type || 'Article')}
                </div>
                <div class="resource-actions">
                    <button class="resource-bookmark-btn" data-resource-id="${resource.id || index}" title="Bookmark this resource">
                        <i class="far fa-bookmark"></i>
                    </button>
                    ${metadata.certificate_available ? '<div class="certificate-badge" title="Certificate Available"><i class="fas fa-certificate"></i></div>' : ''}
                </div>
            </div>
            
            <div class="resource-content">
                <h4 class="resource-title">${resource.title}</h4>
                <p class="resource-author"><i class="fas fa-user"></i> ${author}</p>
                <p class="resource-description">${resource.description || 'No description available'}</p>
                
                ${tagsHTML}
                
                <div class="resource-metadata">
                    <div class="metadata-row">
                        <div class="metadata-item">
                            <i class="fas fa-clock"></i>
                            <span>${timeDisplay}</span>
                        </div>
                        <div class="metadata-item">
                            <i class="fas fa-signal"></i>
                            <span>${resource.difficulty || 'Beginner'}</span>
                        </div>
                        <div class="metadata-item">
                            <i class="fas fa-globe"></i>
                            <span>${sourceDomain}</span>
                        </div>
                    </div>
                    
                    ${rating > 0 ? `
                    <div class="metadata-row">
                        <div class="metadata-item rating">
                            ${starRating}
                            <span>${rating.toFixed(1)}</span>
                        </div>
                        ${resource.quality_score ? `
                        <div class="metadata-item quality-score">
                            <i class="fas fa-star"></i>
                            <span>${(resource.quality_score * 100).toFixed(0)}% quality</span>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                    
                    ${additionalInfo ? `<div class="metadata-row additional-info">${additionalInfo}</div>` : ''}
                </div>
            </div>
            
            <div class="resource-footer">
                <a href="${resource.url}" target="_blank" class="resource-link-btn primary">
                    <i class="fas fa-external-link-alt"></i>
                    Open Resource
                </a>
                <button class="resource-action-btn secondary" onclick="LearningPathUI.addToCustomPath('${resource.id || index}')" title="Add to custom learning path">
                    <i class="fas fa-plus"></i>
                    Add to Path
                </button>
            </div>
        `;
        
        return card;
    }

    /**
     * Format large numbers for display
     * @param {number} num - Number to format
     * @returns {string} - Formatted number
     */
    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Add resource to custom learning path (Phase 5.1 - Step 6)
     * @param {string} resourceId - Resource ID to add
     */
    static addToCustomPath(resourceId) {
        // Initialize custom path if it doesn't exist
        if (!window.customLearningPath) {
            window.customLearningPath = [];
        }
        
        // Check if resource is already in custom path
        if (window.customLearningPath.includes(resourceId)) {
            this.showErrorMessage('Resource already in your custom path!');
            return;
        }
        
        // Add to custom path
        window.customLearningPath.push(resourceId);
        
        // Visual feedback
        this.showMessage(`Resource added to custom path! (${window.customLearningPath.length} resources)`, 'success');
        
        // Update UI to show custom path count
        this.updateCustomPathCounter();
    }

    /**
     * Update custom path counter in UI
     */
    static updateCustomPathCounter() {
        const counter = document.getElementById('customPathCounter');
        if (counter && window.customLearningPath) {
            counter.textContent = window.customLearningPath.length;
            counter.style.display = window.customLearningPath.length > 0 ? 'inline-block' : 'none';
        }
    }

    /**
     * Get resource type icon class
     * @param {string} type - Resource type
     * @returns {string} - Icon class
     */
    static getResourceTypeIcon(type) {
        const icons = {
            'video': 'fas fa-play-circle',
            'article': 'fas fa-file-alt',
            'interactive': 'fas fa-laptop-code',
            'course': 'fas fa-graduation-cap',
            'book': 'fas fa-book',
            'pdf': 'fas fa-file-pdf',
            'tutorial': 'fas fa-chalkboard-teacher'
        };
        return icons[type] || 'fas fa-file-alt';
    }

    /**
     * Extract domain from URL
     * @param {string} url - Full URL
     * @returns {string} - Domain name
     */
    static extractDomain(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch (e) {
            return 'Unknown';
        }
    }
}

// Export for use in other modules
window.LearningPathAPI = LearningPathAPI;
window.LearningPathUI = LearningPathUI;
