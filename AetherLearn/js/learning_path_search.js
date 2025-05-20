// Learning Path Search Initialization
function initializeLearningPathSearch() {
    const aiSearchInput = document.querySelector('.hero-search-input');
    const aiSearchButton = document.querySelector('.hero-search-button');
    const searchProcessContainer = document.getElementById('searchProcessContainer');
    
    if (aiSearchInput && aiSearchButton) {
        aiSearchButton.addEventListener('click', async () => {
            const query = aiSearchInput.value.trim();
            if (query) {
                await startSearchProcess(query);
            }
        });
        
        // Also trigger search on Enter key
        aiSearchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = aiSearchInput.value.trim();
                if (query) {
                    await startSearchProcess(query);
                }
            }
        });
    }
}

// Main search function triggered when the user searches
async function startSearchProcess(query) {
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
            LearningPathUI.initializeSearchProcessUI(query);
            
            // Initiate the search process
            const response = await LearningPathAPI.initiateSearch(query);
            
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
    }
}

async function pollSearchStatus(searchId) {
    const statusCheckInterval = setInterval(async () => {
        try {
            const status = await LearningPathAPI.getSearchStatus(searchId);
            
            // Update UI based on status
            LearningPathUI.updateSearchProcessUI(status);
            
            // Check if the process is complete or failed
            if (status.status === 'COMPLETED') {
                clearInterval(statusCheckInterval);
                await showLearningPathResults(status.learning_path_id);
            } else if (status.status === 'FAILED') {
                clearInterval(statusCheckInterval);
                showErrorMessage(status.message || 'Failed to generate learning path');
            }
        } catch (error) {
            console.error('Error checking search status:', error);
            clearInterval(statusCheckInterval);
            showErrorMessage('Failed to get search status. Please try again.');
        }
    }, 2000); // Poll every 2 seconds
}

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
        
    } catch (error) {
        console.error('Error showing learning path results:', error);
        showErrorMessage('Failed to load learning path results');
    }
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Append to the search container or body
    const container = document.getElementById('searchProcessContainer') || document.body;
    container.appendChild(errorDiv);
    
    // Remove after a few seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}
