/**

Resource Integration Script
Bridges the learning path search results with individual resources display
Part of Phase 5 enhancements for AetherLearn */
// Mock data for testing individual resources until backend integration is complete
const mockIndividualResources = [
{
id: "ml_basics_video_1",
title: "Machine Learning Explained - A Complete Guide",
description: "Comprehensive introduction to machine learning concepts, algorithms, and practical applications with real-world examples.",
type: "video",
url: "https://youtube.com/watch?v=example1",
duration: "45 minutes",
difficulty: "Beginner",
rating: "4.8",
source: "Khan Academy",
language: "English"
},
{
id: "ml_algorithms_article_1",
title: "Understanding Machine Learning Algorithms: A Deep Dive",
description: "Detailed exploration of various ML algorithms including supervised, unsupervised, and reinforcement learning approaches.",
type: "article",
url: "https://medium.com/example-article",
duration: "25 minutes",
difficulty: "Intermediate",
rating: "4.6",
source: "Medium",
language: "English"
},
{
id: "python_ml_interactive_1",
title: "Build Your First ML Model - Interactive Tutorial",
description: "Hands-on coding experience building a machine learning model with Python and scikit-learn from scratch.",
type: "interactive",
url: "https://codecademy.com/example-course",
duration: "90 minutes",
difficulty: "Intermediate",
rating: "4.9",
source: "Codecademy",
language: "English"
},
{
id: "data_science_course_1",
title: "Complete Data Science and Machine Learning Bootcamp",
description: "Full course covering data analysis, visualization, machine learning, and deployment techniques.",
type: "course",
url: "https://coursera.org/example-course",
duration: "12 weeks",
difficulty: "Advanced",
rating: "4.7",
source: "Coursera",
language: "English"
},
{
id: "neural_networks_video_1",
title: "Neural Networks and Deep Learning Fundamentals",
description: "Introduction to neural networks, backpropagation, and deep learning architectures with visual explanations.",
type: "video",
url: "https://youtube.com/watch?v=example2",
duration: "60 minutes",
difficulty: "Intermediate",
rating: "4.5",
source: "3Blue1Brown",
language: "English"
},
{
id: "ai_ethics_article_1",
title: "AI Ethics and Bias in Machine Learning Systems",
description: "Critical examination of ethical considerations, bias detection, and responsible AI development practices.",
type: "article",
url: "https://example.com/ai-ethics",
duration: "15 minutes",
difficulty: "Beginner",
rating: "4.4",
source: "MIT Technology Review",
language: "English"
}
];

// REMOVED CONFLICTING OVERRIDE - Let the learning path system handle everything naturally
// This override was preventing modules from being populated correctly
console.log('✅ Resource Integration: Not overriding showLearningPathResults to prevent conflicts');

// Alternative: Enhance the existing system instead of overriding
document.addEventListener('DOMContentLoaded', () => {
    // Listen for when the learning path results stage becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.id === 'learningPathResultsStage' && target.style.display === 'flex') {
                    console.log('🔧 Learning path results stage is now visible, enhancing with individual resources...');
                    setTimeout(() => {
                        // Only populate individual resources if they haven't been populated yet
                        const resourcesGrid = document.getElementById('individualResourcesGrid');
                        if (resourcesGrid && resourcesGrid.children.length <= 3) {
                            populateIndividualResources(mockIndividualResources);
                        }
                    }, 1000);
                }
            }
        });
    });
    
    const resultsStage = document.getElementById('learningPathResultsStage');
    if (resultsStage) {
        observer.observe(resultsStage, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
});

// Check if we have real resource data from the API
function checkForRealResourceData() {
// This would check if the API response contains individual resources
// For now, return false to use mock data
return false;
}

// Enhanced integration for future backend API
function integrateWithBackendResources(searchResponse) {
if (searchResponse && searchResponse.individual_resources) {
populateIndividualResources(searchResponse.individual_resources);
} else if (searchResponse && searchResponse.resources) {
// Alternative data structure
populateIndividualResources(searchResponse.resources);
} else {
// Fallback to mock data
console.log('No individual resources found in API response, using mock data');
populateIndividualResources(mockIndividualResources);
}
}

// Function to simulate API call for additional resources (for Load More functionality)
async function fetchAdditionalResources(query, offset = 0, limit = 6) {
return new Promise((resolve) => {
setTimeout(() => {
// Generate more mock resources
const additionalResources = generateAdditionalMockResources(limit, offset);
resolve(additionalResources);
}, 1000); // Simulate API delay
});
}

// Generate additional mock resources for testing
function generateAdditionalMockResources(count, offset) {
const types = ['video', 'article', 'interactive', 'course'];
const titles = [
'Advanced Machine Learning Techniques',
'Deep Learning with TensorFlow',
'Python for Data Science Mastery',
'Computer Vision Fundamentals',
'Natural Language Processing Guide',
'Reinforcement Learning Basics',
'Data Visualization with Python',
'Statistical Analysis for ML',
'Feature Engineering Techniques',
'Model Deployment Strategies'
];

const sources = ['edX', 'Udemy', 'Coursera', 'Khan Academy', 'MIT OpenCourseWare', 'Stanford Online'];
const difficulties = ['Beginner', 'Intermediate', 'Advanced'];

return Array.from({ length: count }, (_, index) => ({
    id: `resource_additional_${offset + index}`,
    title: titles[(offset + index) % titles.length],
    description: `Comprehensive learning resource covering advanced concepts and practical applications in the field.`,
    type: types[Math.floor(Math.random() * types.length)],
    url: `https://example.com/resource-${offset + index}`,
    duration: `${Math.floor(Math.random() * 120) + 15} minutes`,
    difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
    rating: (Math.random() * 1.5 + 3.5).toFixed(1),
    source: sources[Math.floor(Math.random() * sources.length)],
    language: 'English'
}));


}

// Override the individual resources manager's loadAdditionalResources method
document.addEventListener('DOMContentLoaded', () => {
// Wait for individual resources manager to be initialized
setTimeout(() => {
if (window.individualResourcesManager) {
const originalLoadAdditionalResources = window.individualResourcesManager.loadAdditionalResources;

        window.individualResourcesManager.loadAdditionalResources = async function() {
            const loadMoreBtn = document.getElementById('loadMoreResources');
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            loadMoreBtn.disabled = true;

            try {
                // Get current resource count to determine offset
                const currentResources = document.querySelectorAll('.individual-resource-card').length;
                
                // Fetch additional resources
                const additionalResources = await fetchAdditionalResources('', currentResources, 6);
                
                // Add them to the grid
                additionalResources.forEach(resource => {
                    const resourceCard = createResourceCardFromData(resource, currentResources);
                    document.getElementById('individualResourcesGrid').appendChild(resourceCard);
                });
                
                // Update resource count
                this.updateResourceCount();
                
            } catch (error) {
                console.error('Error loading additional resources:', error);
                this.showToast('Failed to load additional resources', 'error');
            } finally {
                loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Resources';
                loadMoreBtn.disabled = false;
            }
        };
    }
}, 1000);


});

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
module.exports = {
integrateWithBackendResources,
fetchAdditionalResources,
generateAdditionalMockResources,
mockIndividualResources
};
}

console.log('✅ Resource Integration module loaded successfully');