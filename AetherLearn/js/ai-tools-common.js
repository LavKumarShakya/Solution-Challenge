/**
 * AI Tools Common Utilities
 * Shared functionality for all AI tools
 */

class AIToolsAPI {
    constructor() {
        // Check if we're in development (Live Server) or production
        const isDevelopment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        this.baseURL = isDevelopment ? 'http://localhost:8000/api/tools' : '/api/tools';
        this.authToken = this.getAuthToken();
    }

    getAuthToken() {
        // Get token from localStorage or cookie
        return localStorage.getItem('authToken') || '';
    }

    getCurrentUserId() {
        // Get current user ID from localStorage or decode from token
        return localStorage.getItem('userId') || 'test_user';
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            }
        };

        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Flashcard API methods
    async generateFlashcards(content, options = {}) {
        const requestData = {
            content: content,
            options: {
                num_cards: options.numCards || 10,
                difficulty: options.difficulty || 'intermediate',
                save: options.save !== false
            },
            user_id: this.getCurrentUserId()
        };

        return await this.makeRequest('/flashcards', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
    }

    async getSavedFlashcards(limit = 10, skip = 0, difficulty = null) {
        const params = new URLSearchParams({
            limit: limit.toString(),
            skip: skip.toString()
        });
        
        if (difficulty) {
            params.append('difficulty', difficulty);
        }

        return await this.makeRequest(`/flashcards/saved?${params}`);
    }

    async getFlashcardSet(sessionId) {
        return await this.makeRequest(`/flashcards/${sessionId}`);
    }

    async updateStudyProgress(sessionId, studyData) {
        return await this.makeRequest(`/flashcards/${sessionId}/study`, {
            method: 'PUT',
            body: JSON.stringify(studyData)
        });
    }

    async deleteFlashcardSet(sessionId) {
        return await this.makeRequest(`/flashcards/${sessionId}`, {
            method: 'DELETE'
        });
    }
}

class MessageManager {
    constructor() {
        this.container = document.getElementById('message-container');
        if (!this.container) {
            this.createContainer();
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'message-container';
        this.container.className = 'message-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 5000) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.innerHTML = `
            <span>${message}</span>
            <button class="message-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.container.appendChild(messageElement);

        // Auto-remove after duration
        setTimeout(() => {
            if (messageElement.parentElement) {
                messageElement.remove();
            }
        }, duration);

        return messageElement;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }
}

class LoadingManager {
    constructor() {
        this.loadingSteps = [
            'Processing content...',
            'Analyzing key concepts...',
            'Generating questions...',
            'Creating flashcards...',
            'Finalizing results...'
        ];
        this.currentStep = 0;
    }

    show(sectionId = 'loading-section') {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            this.startProgressAnimation();
        }
    }

    hide(sectionId = 'loading-section') {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
            this.stopProgressAnimation();
        }
    }

    startProgressAnimation() {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (!progressFill || !progressText) return;

        this.currentStep = 0;
        this.progressInterval = setInterval(() => {
            if (this.currentStep < this.loadingSteps.length) {
                const progress = ((this.currentStep + 1) / this.loadingSteps.length) * 100;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = this.loadingSteps[this.currentStep];
                this.currentStep++;
            } else {
                // Loop back to beginning for longer operations
                this.currentStep = 0;
            }
        }, 1000);
    }

    stopProgressAnimation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
}

class ValidationUtils {
    static validateContent(content, minLength = 10, maxLength = 10000) {
        if (!content || typeof content !== 'string') {
            throw new Error('Content is required');
        }

        const trimmedContent = content.trim();
        
        if (trimmedContent.length < minLength) {
            throw new Error(`Content must be at least ${minLength} characters long`);
        }

        if (trimmedContent.length > maxLength) {
            throw new Error(`Content must be less than ${maxLength} characters long`);
        }

        return trimmedContent;
    }

    static validateOptions(options) {
        const validated = { ...options };

        // Validate number of cards
        if (validated.numCards) {
            const numCards = parseInt(validated.numCards);
            if (isNaN(numCards) || numCards < 3 || numCards > 20) {
                throw new Error('Number of cards must be between 3 and 20');
            }
            validated.numCards = numCards;
        }

        // Validate difficulty
        if (validated.difficulty && !['beginner', 'intermediate', 'advanced'].includes(validated.difficulty)) {
            throw new Error('Difficulty must be beginner, intermediate, or advanced');
        }

        return validated;
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Basic XSS prevention
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
}

class AnimationUtils {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = Math.min(progress, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        let start = null;
        const initialOpacity = parseFloat(getComputedStyle(element).opacity) || 1;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = initialOpacity * (1 - Math.min(progress, 1));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }
        
        requestAnimationFrame(animate);
    }

    static slideUp(element, duration = 300) {
        element.style.transform = 'translateY(20px)';
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            const easeProgress = 1 - Math.pow(1 - Math.min(progress, 1), 3);
            
            element.style.transform = `translateY(${20 * (1 - easeProgress)}px)`;
            element.style.opacity = easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }
}

class LocalStorageManager {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    static load(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }

    // Specific methods for AI tools
    static saveDraftContent(toolType, content) {
        return this.save(`${toolType}_draft`, {
            content,
            timestamp: Date.now()
        });
    }

    static loadDraftContent(toolType, maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        const draft = this.load(`${toolType}_draft`);
        if (draft && (Date.now() - draft.timestamp) < maxAge) {
            return draft.content;
        }
        return null;
    }

    static clearDraftContent(toolType) {
        return this.remove(`${toolType}_draft`);
    }
}

// Global instances
window.aiToolsAPI = new AIToolsAPI();
window.messageManager = new MessageManager();
window.loadingManager = new LoadingManager();

// Export utilities for use in other modules
window.AIToolsUtils = {
    ValidationUtils,
    AnimationUtils,
    LocalStorageManager
};

// Character counter functionality
document.addEventListener('DOMContentLoaded', function() {
    // Set up character counters for textareas
    const textareas = document.querySelectorAll('textarea[maxlength]');
    textareas.forEach(textarea => {
        const counterElement = textarea.closest('.input-group')?.querySelector('.character-count');
        if (counterElement) {
            const maxLength = parseInt(textarea.getAttribute('maxlength'));
            
            function updateCounter() {
                const currentLength = textarea.value.length;
                counterElement.textContent = `${currentLength} / ${maxLength} characters`;
                
                // Add warning class if approaching limit
                if (currentLength > maxLength * 0.9) {
                    counterElement.style.color = 'var(--accent-warning, #F59E0B)';
                } else {
                    counterElement.style.color = 'var(--text-muted)';
                }
            }
            
            textarea.addEventListener('input', updateCounter);
            updateCounter(); // Initial update
        }
    });
});