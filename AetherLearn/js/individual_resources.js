/**

Individual Resources Management System
Handles filtering, selection, and interaction with individual learning resources
Part of Phase 5 enhancements for AetherLearn */
class IndividualResourcesManager {
constructor() {
this.resources = [];
this.filteredResources = [];
this.selectedResources = new Set();
this.currentFilter = 'all';
this.currentSort = 'relevance';
this.resourcesContainer = null;
this.selectedResourcesSummary = null;

    this.init();
}

init() {
    this.bindEventListeners();
    this.setupFilterTabs();
    this.setupSortDropdown();
    this.setupResourceActions();
}

bindEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
        this.resourcesContainer = document.getElementById('individualResourcesGrid');
        this.selectedResourcesSummary = document.getElementById('selectedResourcesSummary');
        
        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Sort dropdown
        const sortSelect = document.getElementById('resourceSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this.handleSortChange(e));
        }

        // Load more button
        const loadMoreBtn = document.getElementById('loadMoreResources');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreResources());
        }

        // Custom course creation
        const createCourseBtn = document.getElementById('createCustomCourse');
        if (createCourseBtn) {
            createCourseBtn.addEventListener('click', () => this.createCustomCourse());
        }

        // Clear selection
        const clearSelectionBtn = document.getElementById('clearSelection');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        }
    });
}

setupFilterTabs() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Get filter value
            const filter = tab.getAttribute('data-filter');
            this.currentFilter = filter;
            
            // Apply filter
            this.filterResources();
        });
    });
}

setupSortDropdown() {
    const sortSelect = document.getElementById('resourceSort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortResources();
        });
    }
}

setupResourceActions() {
    // Delegate event handling for dynamically created resource cards
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.resource-action-btn');
        if (!target) return;

        const resourceCard = target.closest('.individual-resource-card');
        if (!resourceCard) return;

        const resourceId = this.getResourceId(resourceCard);

        if (target.classList.contains('bookmark')) {
            this.toggleBookmark(resourceId, target);
        } else if (target.classList.contains('share')) {
            this.shareResource(resourceId);
        } else if (target.classList.contains('add-to-course')) {
            this.toggleResourceSelection(resourceId, target, resourceCard);
        } else if (target.classList.contains('primary')) {
            this.accessResource(resourceId);
        }
    });
}

filterResources() {
    const resourceCards = document.querySelectorAll('.individual-resource-card');
    
    resourceCards.forEach(card => {
        const resourceType = card.getAttribute('data-type');
        
        if (this.currentFilter === 'all' || resourceType === this.currentFilter) {
            card.style.display = 'block';
            card.classList.remove('filtered-out');
            card.classList.add('filtered-in');
        } else {
            card.style.display = 'none';
            card.classList.add('filtered-out');
            card.classList.remove('filtered-in');
        }
    });

    // Update resource count
    this.updateResourceCount();
}

sortResources() {
    const resourcesGrid = document.getElementById('individualResourcesGrid');
    const resourceCards = Array.from(resourcesGrid.querySelectorAll('.individual-resource-card'));
    
    resourceCards.sort((a, b) => {
        switch (this.currentSort) {
            case 'rating':
                return this.getResourceRating(b) - this.getResourceRating(a);
            case 'duration':
                return this.getResourceDuration(a) - this.getResourceDuration(b);
            case 'difficulty':
                return this.getResourceDifficulty(a).localeCompare(this.getResourceDifficulty(b));
            case 'relevance':
            default:
                return 0; // Keep original order for relevance
        }
    });

    // Reorder elements in DOM
    resourceCards.forEach(card => {
        resourcesGrid.appendChild(card);
    });
}

toggleResourceSelection(resourceId, button, resourceCard) {
    if (this.selectedResources.has(resourceId)) {
        this.selectedResources.delete(resourceId);
        button.classList.remove('selected');
        button.innerHTML = '<i class="fas fa-plus"></i> Add to Course';
        this.removeFromSelectedList(resourceId);
    } else {
        this.selectedResources.add(resourceId);
        button.classList.add('selected');
        button.innerHTML = '<i class="fas fa-check"></i> Added';
        this.addToSelectedList(resourceId, resourceCard);
    }

    this.updateSelectedResourcesSummary();
}

addToSelectedList(resourceId, resourceCard) {
    const selectedList = document.getElementById('selectedResourcesList');
    if (!selectedList) return;

    const resourceTitle = resourceCard.querySelector('.resource-title').textContent;
    const resourceType = resourceCard.getAttribute('data-type');
    const resourceDuration = resourceCard.querySelector('.metadata-item:first-child span:last-child').textContent;

    const selectedItem = document.createElement('div');
    selectedItem.className = 'selected-resource-item';
    selectedItem.setAttribute('data-resource-id', resourceId);

    selectedItem.innerHTML = `
        <div class="selected-resource-info">
            <div class="selected-resource-type ${resourceType}">
                <i class="${this.getResourceTypeIcon(resourceType)}"></i>
            </div>
            <div class="selected-resource-details">
                <h5>${resourceTitle}</h5>
                <p>${resourceType} • ${resourceDuration}</p>
            </div>
        </div>
        <button class="selected-resource-remove" onclick="individualResourcesManager.removeSelectedResource('${resourceId}')">
            <i class="fas fa-times"></i>
        </button>
    `;

    selectedList.appendChild(selectedItem);
}

removeFromSelectedList(resourceId) {
    const selectedItem = document.querySelector(`[data-resource-id="${resourceId}"]`);
    if (selectedItem) {
        selectedItem.remove();
    }
}

removeSelectedResource(resourceId) {
    this.selectedResources.delete(resourceId);
    this.removeFromSelectedList(resourceId);
    
    // Update the corresponding resource card button
    const resourceCard = document.querySelector(`[data-resource-id="${resourceId}"]`);
    if (resourceCard) {
        const button = resourceCard.querySelector('.add-to-course');
        if (button) {
            button.classList.remove('selected');
            button.innerHTML = '<i class="fas fa-plus"></i> Add to Course';
        }
    }

    this.updateSelectedResourcesSummary();
}

updateSelectedResourcesSummary() {
    const summary = document.getElementById('selectedResourcesSummary');
    const countElement = document.getElementById('selectedCount');
    
    if (this.selectedResources.size > 0) {
        summary.style.display = 'block';
        countElement.textContent = this.selectedResources.size;
    } else {
        summary.style.display = 'none';
    }
}

clearSelection() {
    this.selectedResources.clear();
    
    // Reset all add-to-course buttons
    document.querySelectorAll('.add-to-course.selected').forEach(button => {
        button.classList.remove('selected');
        button.innerHTML = '<i class="fas fa-plus"></i> Add to Course';
    });

    // Clear selected list
    const selectedList = document.getElementById('selectedResourcesList');
    if (selectedList) {
        selectedList.innerHTML = '';
    }

    this.updateSelectedResourcesSummary();
}

toggleBookmark(resourceId, button) {
    const isBookmarked = button.classList.contains('active');
    
    if (isBookmarked) {
        button.classList.remove('active');
        button.innerHTML = '<i class="far fa-bookmark"></i>';
        this.removeBookmark(resourceId);
    } else {
        button.classList.add('active');
        button.innerHTML = '<i class="fas fa-bookmark"></i>';
        this.addBookmark(resourceId);
    }
}

shareResource(resourceId) {
    // Implementation for sharing resource
    if (navigator.share) {
        navigator.share({
            title: 'Learning Resource',
            text: 'Check out this learning resource from AetherLearn',
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            this.showToast('Resource link copied to clipboard!', 'success');
        });
    }
}

accessResource(resourceId) {
    // Implementation for accessing the actual resource
    // This would typically open the resource in a new tab
    const resourceCard = document.querySelector(`[data-resource-id="${resourceId}"]`);
    if (resourceCard) {
        const resourceUrl = resourceCard.getAttribute('data-url') || '#';
        if (resourceUrl !== '#') {
            window.open(resourceUrl, '_blank');
        } else {
            this.showToast('Resource URL not available', 'warning');
        }
    }
}

createCustomCourse() {
    if (this.selectedResources.size === 0) {
        this.showToast('Please select at least one resource to create a custom course', 'warning');
        return;
    }

    // Implementation for creating custom course from selected resources
    const selectedResourcesData = Array.from(this.selectedResources).map(resourceId => {
        const resourceCard = document.querySelector(`[data-resource-id="${resourceId}"]`);
        return this.extractResourceData(resourceCard);
    });

    // Send data to backend to create custom course
    this.saveCustomCourse(selectedResourcesData);
}

loadMoreResources() {
    // Implementation for loading additional resources
    const loadMoreBtn = document.getElementById('loadMoreResources');
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    loadMoreBtn.disabled = true;

    // Simulate API call to load more resources
    setTimeout(() => {
        this.loadAdditionalResources();
        loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Resources';
        loadMoreBtn.disabled = false;
    }, 1500);
}

loadAdditionalResources() {
    // Mock implementation - in real app, this would fetch from API
    const mockResources = this.generateMockResources(6);
    this.appendResourcesToGrid(mockResources);
}

generateMockResources(count) {
    const types = ['video', 'article', 'interactive', 'course'];
    const titles = [
        'Advanced Machine Learning Concepts',
        'Deep Learning with TensorFlow',
        'Python for Data Science',
        'Neural Networks Explained',
        'AI Ethics and Bias',
        'Computer Vision Fundamentals'
    ];
    
    return Array.from({ length: count }, (_, index) => ({
        id: `resource_${Date.now()}_${index}`,
        type: types[Math.floor(Math.random() * types.length)],
        title: titles[index % titles.length],
        description: 'Comprehensive learning resource covering key concepts and practical applications.',
        duration: `${Math.floor(Math.random() * 120) + 30} minutes`,
        difficulty: ['Beginner', 'Intermediate', 'Advanced'][Math.floor(Math.random() * 3)],
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        source: ['Coursera', 'Khan Academy', 'edX', 'Udemy'][Math.floor(Math.random() * 4)]
    }));
}

appendResourcesToGrid(resources) {
    const grid = document.getElementById('individualResourcesGrid');
    
    resources.forEach(resource => {
        const resourceCard = this.createResourceCard(resource);
        grid.appendChild(resourceCard);
    });
}

createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'individual-resource-card';
    card.setAttribute('data-type', resource.type);
    card.setAttribute('data-resource-id', resource.id);

    card.innerHTML = `
        <div class="resource-card-header">
            <div class="resource-type-badge ${resource.type}">
                <i class="${this.getResourceTypeIcon(resource.type)}"></i>
                <span>${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
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
            <h4 class="resource-title">${resource.title}</h4>
            <p class="resource-description">${resource.description}</p>
            
            <div class="resource-metadata">
                <div class="metadata-row">
                    <span class="metadata-item">
                        <i class="fas fa-clock"></i>
                        <span>${resource.duration}</span>
                    </span>
                    <span class="metadata-item">
                        <i class="fas fa-signal"></i>
                        <span>${resource.difficulty}</span>
                    </span>
                    <span class="metadata-item quality-rating">
                        <i class="fas fa-star"></i>
                        <span>${resource.rating}</span>
                    </span>
                </div>
                <div class="metadata-row">
                    <span class="metadata-item source">
                        <i class="fas fa-external-link-alt"></i>
                        <span>${resource.source}</span>
                    </span>
                    <span class="metadata-item language">
                        <i class="fas fa-globe"></i>
                        <span>English</span>
                    </span>
                </div>
            </div>
            
            <div class="learning-styles">
                ${this.generateLearningStyleBadges(resource.type)}
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

// Helper methods
getResourceId(resourceCard) {
    return resourceCard.getAttribute('data-resource-id') || 
           resourceCard.querySelector('.resource-title').textContent.replace(/\s+/g, '_').toLowerCase();
}

getResourceTypeIcon(type) {
    const icons = {
        video: 'fas fa-play-circle',
        article: 'fas fa-file-alt',
        interactive: 'fas fa-laptop-code',
        course: 'fas fa-graduation-cap'
    };
    return icons[type] || 'fas fa-file';
}

getResourceRating(resourceCard) {
    const ratingElement = resourceCard.querySelector('.quality-rating span');
    return ratingElement ? parseFloat(ratingElement.textContent) : 0;
}

getResourceDuration(resourceCard) {
    const durationElement = resourceCard.querySelector('.metadata-item:first-child span:last-child');
    if (!durationElement) return 0;
    
    const duration = durationElement.textContent;
    const minutes = parseInt(duration.match(/\d+/));
    return duration.includes('hour') ? minutes * 60 : minutes;
}

getResourceDifficulty(resourceCard) {
    const difficultyElement = resourceCard.querySelector('.metadata-item:nth-child(2) span:last-child');
    return difficultyElement ? difficultyElement.textContent : 'Unknown';
}

generateLearningStyleBadges(type) {
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

extractResourceData(resourceCard) {
    if (!resourceCard) return null;

    return {
        id: this.getResourceId(resourceCard),
        title: resourceCard.querySelector('.resource-title').textContent,
        description: resourceCard.querySelector('.resource-description').textContent,
        type: resourceCard.getAttribute('data-type'),
        duration: resourceCard.querySelector('.metadata-item:first-child span:last-child').textContent,
        difficulty: resourceCard.querySelector('.metadata-item:nth-child(2) span:last-child').textContent,
        rating: resourceCard.querySelector('.quality-rating span').textContent,
        source: resourceCard.querySelector('.metadata-item.source span').textContent
    };
}

updateResourceCount() {
    const visibleResources = document.querySelectorAll('.individual-resource-card:not(.filtered-out)').length;
    const totalResources = document.querySelectorAll('.individual-resource-card').length;
    
    // Update any resource count displays if they exist
    const countElement = document.querySelector('.resources-count');
    if (countElement) {
        countElement.textContent = `Showing ${visibleResources} of ${totalResources} resources`;
    }
}

addBookmark(resourceId) {
    // Implementation for adding bookmark
    console.log('Bookmarking resource:', resourceId);
    this.showToast('Resource bookmarked!', 'success');
}

removeBookmark(resourceId) {
    // Implementation for removing bookmark
    console.log('Removing bookmark for resource:', resourceId);
    this.showToast('Bookmark removed', 'info');
}

async saveCustomCourse(resourcesData) {
    try {
        // Implementation for saving custom course
        const courseData = {
            title: `Custom Course - ${new Date().toLocaleDateString()}`,
            description: `Custom course created from ${resourcesData.length} selected resources`,
            resources: resourcesData,
            created_at: new Date().toISOString()
        };

        // Simulate API call
        await this.simulateApiCall('/api/courses/custom', courseData);
        
        this.showToast('Custom course created successfully!', 'success');
        this.clearSelection();
        
    } catch (error) {
        console.error('Error creating custom course:', error);
        this.showToast('Failed to create custom course', 'error');
    }
}

async simulateApiCall(endpoint, data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success/failure
    if (Math.random() > 0.1) {
        return { success: true, data };
    } else {
        throw new Error('Network error');
    }
}

showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-message ${type} show`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

txt



}

// Initialize the individual resources manager
const individualResourcesManager = new IndividualResourcesManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
module.exports = IndividualResourcesManager;
}